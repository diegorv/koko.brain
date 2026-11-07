import { exists, readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';

import { addAfterSaveObserver } from '#lib/core/editor/editor.hooks.js';
import { onFileChange } from '#lib/core/filesystem/fs.watcher.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { getIconSync } from '#lib/features/file-icons/file-icons.icon-data.js';
import { parseIconValuePermissive } from '#lib/features/file-icons/file-icons.logic.js';
import { preloadPacks } from '#lib/features/file-icons/file-icons.service.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import type { KBAPI } from '#lib/plugins/queryjs/kb-api.js';
import { debug, error } from '#lib/utils/debug.js';
import { serializeWithRerun } from '#lib/utils/inflight.js';
import { vaultRelativeKey } from '#lib/utils/path.js';

import type { ModActionV1, ModContextV1, ModNotifyKindV1, ModRunV1, ModThemeV1, ModUiV1, ModV1 } from './contract/mod-api.v1';
import { createModKb, MOD_APP, type ModApp } from './mod-app.service';
import { modCommandsStore } from './mod-commands.store.svelte';
import { modDialogsStore, type ModDialogSpec } from './mod-dialogs.store.svelte';
import { modPickerStore } from './mod-picker.store.svelte';
import { readModTheme, watchModTheme } from './mod-theme.svelte';
import { createModData, createModVault, createModWorkspace } from './mod-vault.service';
import { watchModValue } from './mod-watch.svelte';
import { modsEnabledStore } from './mods-enabled.store.svelte';
import { modsRunsStore } from './mods-runs.store.svelte';
import { errorText, evaluateModSource, mapModChanges, MODS_DIR, parseModManifest, type ModManifest } from './mods.logic';
import { modsStore } from './mods.store.svelte';

/**
 * The `ctx` a mod receives: the frozen v1 contract plus raw access to the
 * app's internals. `app` and `kb` are not part of the contract: they change
 * whenever the internals do, with no compatibility promise.
 */
export interface ModContext extends ModContextV1 {
	/** Experimental entry points with no compatibility promise; not part of contract v1. */
	readonly labs: {
		/** Places a registered action until disposed or unloaded. Unknown ids throw. */
		place(actionId: string, options: {
			/** Opts into the command palette */
			palette?: true;
			/** Flat note-row or folder menu placement */
			menu?: {
				/** Surfaces that show the action */
				on: ('note' | 'folder')[];
				/** Note rows only; defaults to markdown */
				files?: 'markdown' | 'all';
			};
		}): () => void;
	};
	/**
	 * Unstable. The app's own live objects, listed in `MOD_APP`
	 * (`mod-app.service.ts`). Reading it throws once the mod is unloaded or
	 * the vault changed; objects already taken stay usable. A mod that subscribes
	 * to anything through it (a CodeMirror listener, a store watch, a DOM
	 * listener) must undo that in `ctx.register(...)`, or it keeps running after
	 * the mod is switched off or reloaded.
	 */
	readonly app: ModApp;
	/**
	 * Unstable. Resolves to a new QueryJS `KBAPI` over a fresh index snapshot
	 * (pages, tags, links, tasks, frontmatter). Reading or calling it throws once
	 * the mod is unloaded or the vault changed.
	 */
	readonly kb: () => Promise<KBAPI>;
}

/** Per-mod state the host and the mod's `ctx` share */
export interface ModRuntime {
	/** Aborted at unload; its signal is `ctx.signal` */
	controller: AbortController;
	/** Cleanups from ctx registrations and subscriptions, run in reverse at unload */
	disposers: (() => void)[];
	/** One promise per live action run, settled when the run ends; a reload waits for them (PRD P10) */
	runs: Set<Promise<void>>;
	/** Set at unload; every `ctx` function throws afterwards */
	unloaded: boolean;
}

interface LiveMod extends ModRuntime {
	folder: string;
	manifest: ModManifest;
	module: ModV1;
}

/** Entry point known by the host; command includes palette and programmatic calls. */
type ActionOrigin = 'rail' | 'note-menu' | 'folder-menu' | 'command';

const NOTIFY_KINDS: readonly ModNotifyKindV1[] = ['info', 'success', 'warning', 'error'];

/** Bumped by every stop; a load that sees a different value drops its result */
let generation = 0;
/**
 * Bumped per folder by every per-mod switch and every reload request, so a
 * load still in flight from before drops its result instead of loading the
 * mod twice or with older code
 */
const folderEpochs = new Map<string, number>();
/** One serialized reload per folder for the running host; emptied at stop */
const reloadRunners = new Map<string, () => Promise<void>>();
/** Per folder, wakes a reload that waits for live runs, so it sees a newer request */
const reloadWakers = new Map<string, () => void>();
/** Detaches the host's watcher listener; null while stopped */
let unsubscribeFileChange: (() => void) | null = null;
/** Mods whose `onload` was called and that are not unloaded yet, in load order */
let liveMods: LiveMod[] = [];
/** Last load error toasted per vault and folder, so an unchanged error is not toasted again on reload */
const toastedErrors = new Map<string, string>();

function messageOf(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/**
 * Builds the `ctx` a mod's `onload` receives. Every function, and reading
 * `app` or `kb`, throws `Mod "<id>" is unloaded` once `runtime.unloaded` is
 * set or the open vault is no longer `vaultPath`.
 */
export function createModContext(manifest: ModManifest, vaultPath: string, runtime: ModRuntime): ModContext {
	const tag = `MOD:${manifest.id}`;
	const assertLive = () => {
		if (runtime.unloaded || vaultStore.path !== vaultPath) throw new Error(`Mod "${manifest.id}" is unloaded`);
	};
	// Mods are untyped JavaScript, so what they pass is checked here.
	const invalid = (message: string) => new Error(`Mod "${manifest.id}": ${message}`);
	const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
	/** Wraps a cleanup so it runs once, whether the mod calls it or the unload does */
	const disposable = (dispose: () => void) => {
		let done = false;
		const once = () => {
			if (done) return;
			done = true;
			const index = runtime.disposers.indexOf(once);
			if (index !== -1) runtime.disposers.splice(index, 1);
			dispose();
		};
		runtime.disposers.push(once);
		return once;
	};

	const actions = new Map<string, ModActionV1>();
	const placements = new Map<string, Set<() => void>>();
	const buttonIds = new Set<string>();
	const revealRuns = new Map<string, () => void>();
	const actionKey = (id: string) => `mod:${manifest.id}:action:${id}`;
	const labs: ModContext['labs'] = {
		place: (actionId, options) => {
			assertLive();
			const action = actions.get(actionId);
			if (!action) throw invalid(`unknown action id "${actionId}"`);
			const menu = options?.menu;
			if (options?.palette !== true && menu === undefined) throw invalid('labs.place needs palette: true or menu');
			if (options.palette !== undefined && options.palette !== true) throw invalid('labs.place needs palette: true');
			if (menu !== undefined) {
				if (!menu || !Array.isArray(menu.on) || !menu.on.every((on) => on === 'note' || on === 'folder')) {
					throw invalid('labs.place needs menu.on to list note or folder');
				}
				if (menu.files !== undefined && menu.files !== 'markdown' && menu.files !== 'all') {
					throw invalid('labs.place needs menu.files to be markdown or all');
				}
			}
			const cleanups: (() => void)[] = [];
			if (options.palette) cleanups.push(modCommandsStore.place(actionKey(actionId)));
			if (menu) cleanups.push(railRegistryStore.registerMenuItem({
				id: actionKey(actionId),
				label: `${manifest.name}: ${action.title}`,
				on: [...menu.on],
				files: menu.files ?? 'markdown',
				run: (target) => {
					assertLive();
					if (actions.get(actionId) !== action) throw invalid(`unknown action id "${actionId}"`);
					openPicker(actionKey(actionId), action.title, [actionId], target.on === 'note' ? 'note-menu' : 'folder-menu', true, { ...target });
				},
			}));
			const owned = placements.get(actionId)!;
			const off = disposable(() => {
				for (const cleanup of cleanups) cleanup();
				owned.delete(off);
			});
			owned.add(off);
			return off;
		},
	};
	const kb = () => createModKb(vaultPath, assertLive);

	/** Checks a dialog's options: a `title`, and a string wherever an optional text field is set */
	const dialogOptions = <T extends { title: string }>(fn: string, options: T, texts: (keyof T & string)[]): T => {
		if (!isText(options?.title)) throw invalid(`ui.${fn} needs a non-empty string title`);
		for (const field of ['message', ...texts] as (keyof T & string)[]) {
			if (options[field] !== undefined && typeof options[field] !== 'string') throw invalid(`ui.${fn} needs a string ${field}`);
		}
		return options;
	};
	const openDialog = <S extends ModDialogSpec>(spec: S) => modDialogsStore.open(manifest.id, manifest.name, spec);

	const ui: ModUiV1 = {
		alert: async (options) => {
			assertLive();
			const { title, message, kind } = dialogOptions('alert', options, []);
			// Mods are untyped JavaScript: an unknown kind falls back to info, as in notify.
			const alertKind = kind && NOTIFY_KINDS.includes(kind) ? kind : 'info';
			await openDialog({ kind: 'alert', title, message, alertKind }).result;
		},
		confirm: async (options) => {
			assertLive();
			const { title, message, confirmLabel, cancelLabel, destructive } = dialogOptions('confirm', options, ['confirmLabel', 'cancelLabel']);
			return openDialog({
				kind: 'confirm',
				title,
				message,
				confirmLabel: confirmLabel || 'OK',
				cancelLabel: cancelLabel || 'Cancel',
				destructive: destructive === true,
			}).result;
		},
		prompt: async (options) => {
			assertLive();
			const { title, message, label, placeholder, value, multiline } = dialogOptions('prompt', options, ['label', 'placeholder', 'value']);
			return openDialog({ kind: 'prompt', title, message, label, placeholder, value: value ?? '', multiline: multiline === true }).result;
		},
		pick: async (options) => {
			assertLive();
			const { title, placeholder, items } = dialogOptions('pick', options, ['placeholder']);
			if (!Array.isArray(items)) throw invalid('ui.pick needs an items array');
			const originals = new Map<string, (typeof items)[number]>();
			// Snapshot only display fields: mod getters must not run while typing or rendering.
			const rows = items.map((item) => {
				const { id, title, description } = item ?? {};
				if (!isText(id) || !isText(title)) throw invalid('ui.pick needs items with non-empty string ids and titles');
				if (description !== undefined && typeof description !== 'string') throw invalid('ui.pick needs a string item description');
				if (originals.has(id)) throw invalid(`ui.pick duplicate item id "${id}"`);
				originals.set(id, item);
				return { id, title, description };
			});
			const id = await openDialog({ kind: 'pick', title, placeholder, items: rows }).result;
			return id === null ? null : originals.get(id) ?? null;
		},
		loading: async (label, task, options) => {
			assertLive();
			if (!isText(label)) throw invalid('ui.loading needs a non-empty string label');
			if (typeof task !== 'function') throw invalid('ui.loading needs a task function');
			const controller = new AbortController();
			const abort = () => controller.abort();
			// The unload aborts at once; Cancel settles the dialog as cancelled.
			runtime.controller.signal.addEventListener('abort', abort);
			const dialog = openDialog({ kind: 'loading', label, cancellable: options?.cancellable === true });
			void dialog.result.then((cancelled) => {
				if (cancelled) abort();
			});
			try {
				return await task(controller.signal);
			} finally {
				runtime.controller.signal.removeEventListener('abort', abort);
				modDialogsStore.answer<'loading'>(dialog.id, false);
			}
		},
	};

	const theme: ModThemeV1 = {
		get current() {
			assertLive();
			return readModTheme();
		},
		onChange: (callback) => {
			assertLive();
			if (typeof callback !== 'function') throw invalid('theme.onChange needs a callback function');
			return disposable(
				watchModTheme(() => {
					try {
						callback(readModTheme());
					} catch (err) {
						debug(tag, 'theme.onChange callback failed:', errorText(err));
					}
				}),
			);
		},
	};

	/**
	 * Runs an action under its origin's key. Lazy runs reveal only on their first
	 * output. Its signal aborts on Stop and at unload; an abort ends the
	 * run cancelled at once, even when the mod's code goes on. A failure is the
	 * mod's, so it goes to the run, a toast and `debug()`, never Sentry (PRD P9).
	 */
	const runAction = async (action: ModActionV1, input: string, buttonKey: string, origin: ActionOrigin, lazy: boolean, target?: ModRunV1['target']) => {
		const controller = new AbortController();
		const id = modsRunsStore.start({ modId: manifest.id, buttonKey, title: action.title, stop: () => controller.abort() });
		const startedAt = performance.now();
		const identity = { modId: manifest.id, actionId: action.id, runId: id, origin };
		debug('MOD-HOST', JSON.stringify({ event: 'action-start', ...identity, outcome: 'running', elapsedMs: 0 }));
		let terminal = false;
		const recordEnd = (outcome: 'done' | 'failed' | 'cancelled') => {
			// Stop ends the host run, not necessarily the JavaScript executing it.
			if (terminal) return;
			terminal = true;
			debug('MOD-HOST', JSON.stringify({
				event: 'action-end', ...identity, outcome, elapsedMs: Math.round(performance.now() - startedAt),
			}));
		};
		let revealed = false;
		const reveal = () => {
			revealed = true;
			modPickerStore.showRun(manifest.id, buttonKey);
		};
		const revealOutput = () => {
			const current = modsRunsStore.runFor(buttonKey);
			if (!revealed && current?.id === id && current.status === 'running') reveal();
		};
		revealRuns.set(buttonKey, reveal);
		let settle!: () => void;
		const ended = new Promise<void>((resolve) => {
			settle = resolve;
		});
		const abortOnUnload = () => controller.abort();
		const end = () => {
			runtime.controller.signal.removeEventListener('abort', abortOnUnload);
			runtime.runs.delete(ended);
			if (revealRuns.get(buttonKey) === reveal) revealRuns.delete(buttonKey);
			settle();
		};
		controller.signal.addEventListener('abort', () => {
			modsRunsStore.cancel(id);
			recordEnd('cancelled');
			end();
		});
		runtime.controller.signal.addEventListener('abort', abortOnUnload);
		runtime.runs.add(ended);
		if (!lazy) reveal();

		const run: ModRunV1 = {
			...(target ? { target } : {}),
			signal: controller.signal,
			log: (text) => {
				modsRunsStore.log(id, String(text));
				revealOutput();
			},
			progress: (done, total, label) => {
				if (!Number.isFinite(done) || !Number.isFinite(total)) throw invalid('run.progress needs numbers done and total');
				if (label !== undefined && typeof label !== 'string') throw invalid('run.progress needs a string label');
				modsRunsStore.progress(id, label === undefined ? { done, total } : { done, total, label });
				revealOutput();
			},
		};
		try {
			await action.run(input, run);
			modsRunsStore.finish(id);
			recordEnd('done');
		} catch (err) {
			// After an abort, a rejection is how the mod stops, not a failure.
			if (!controller.signal.aborted) {
				debug(tag, `${action.title} failed:`, errorText(err));
				modsRunsStore.fail(id, { message: messageOf(err), stack: err instanceof Error ? err.stack : undefined });
				recordEnd('failed');
				toast.error(`${manifest.name}: ${action.title} failed: ${messageOf(err)}`);
			}
		} finally {
			end();
		}
	};

	/**
	 * Opens the picker on the button's actions, resolved now so actions added
	 * after the button are listed. While a run of the button is live, shows that
	 * run instead: one live run per button. A button that resolves to a single
	 * action skips the list: it runs the action, or opens straight on its text
	 * field when the action asks for input.
	 */
	const openPicker = (buttonKey: string, title: string, ids: string[] | undefined, origin: ActionOrigin, lazy = false, target?: ModRunV1['target']) => {
		if (modsRunsStore.isBusy(buttonKey)) {
			revealRuns.get(buttonKey)?.();
			return;
		}
		const listed = ids ? ids.flatMap((id) => actions.get(id) ?? []) : [...actions.values()];
		const rows = listed.map((a) => ({
			id: a.id,
			title: a.title,
			description: a.description,
			input: a.input,
			run: (input: string) => runAction(a, input, buttonKey, origin, lazy && !a.input, target),
		}));
		if (rows.length === 1 && !rows[0].input) {
			void rows[0].run('');
			return;
		}
		modPickerStore.open(manifest.id, title, rows);
		if (rows.length === 1) modPickerStore.askInput(rows[0]);
	};

	return {
		apiVersion: 1,
		mod: { id: manifest.id, name: manifest.name, version: manifest.version, dir: `${MODS_DIR}/${manifest.id}` },
		signal: runtime.controller.signal,
		register: (dispose) => {
			assertLive();
			runtime.disposers.push(dispose);
		},
		notify: (message, options) => {
			assertLive();
			// Mods are untyped JavaScript: an unknown kind falls back to info.
			const kind = options?.kind && NOTIFY_KINDS.includes(options.kind) ? options.kind : 'info';
			toast[kind](`${manifest.name}: ${message}`);
		},
		log: (...args) => {
			assertLive();
			debug(tag, ...args);
		},
		addAction: (action) => {
			assertLive();
			if (!isText(action?.id)) throw invalid('addAction needs a non-empty string id');
			if (!isText(action.title)) throw invalid('addAction needs a non-empty string title');
			if (typeof action.run !== 'function') throw invalid('addAction needs a run function');
			if (action.description !== undefined && typeof action.description !== 'string') {
				throw invalid('addAction needs a string description');
			}
			const input: unknown = action.input;
			if (input !== undefined) {
				const placeholder = typeof input === 'object' && input !== null ? (input as { placeholder?: unknown }).placeholder : undefined;
				const valid = typeof input === 'object' && input !== null && (placeholder === undefined || typeof placeholder === 'string');
				if (!valid) throw invalid('addAction needs input to be an object with an optional string placeholder');
			}
			if (actions.has(action.id)) throw invalid(`duplicate action id "${action.id}"`);
			// A copy, so a later change to the mod's object does not change the listed action.
			const entry: ModActionV1 = {
				id: action.id,
				title: action.title,
				description: action.description,
				input: action.input && { placeholder: action.input.placeholder },
				run: action.run,
			};
			actions.set(entry.id, entry);
			placements.set(entry.id, new Set());
			const unregister = modCommandsStore.register({
				id: actionKey(entry.id),
				label: `${manifest.name}: ${entry.title}`,
				run: () => {
					assertLive();
					if (actions.get(entry.id) !== entry) throw invalid(`unknown action id "${entry.id}"`);
					openPicker(actionKey(entry.id), entry.title, [entry.id], 'command', true);
				},
			});
			return disposable(() => {
				if (actions.get(entry.id) === entry) actions.delete(entry.id);
				for (const off of placements.get(entry.id) ?? []) off();
				placements.delete(entry.id);
				unregister();
			});
		},
		addRailButton: (button) => {
			assertLive();
			if (!isText(button?.id)) throw invalid('addRailButton needs a non-empty string id');
			if (!isText(button.title)) throw invalid('addRailButton needs a non-empty string title');
			if (typeof button.icon !== 'string') throw invalid('addRailButton needs a string icon');
			const ids = button.actions;
			if (ids !== undefined && !(Array.isArray(ids) && ids.every((id) => typeof id === 'string'))) {
				throw invalid('addRailButton needs actions to be a list of action ids');
			}
			if (buttonIds.has(button.id)) throw invalid(`duplicate rail button id "${button.id}"`);
			buttonIds.add(button.id);

			// A pack's icons exist only once it is loaded, and packs load only when a note uses them.
			// Skipped when the icon is already cached: every preload bumps packVersion, which makes every icon resolve again.
			const icon = parseIconValuePermissive(button.icon);
			if (icon && !getIconSync(icon.iconPack, icon.iconName)) {
				preloadPacks([icon.iconPack]).catch((err: unknown) => debug(tag, `cannot load icon pack ${icon.iconPack}:`, err));
			}
			const { id, title } = button;
			const listed = ids ? [...ids] : undefined;
			const key = `mod:${manifest.id}:${id}`;
			const unregister = railRegistryStore.registerAction({
				key,
				label: title,
				icon: button.icon,
				color: manifest.color,
				busy: () => modsRunsStore.isBusy(key),
				run: () => openPicker(key, title, listed, 'rail'),
			});
			return disposable(() => {
				buttonIds.delete(id);
				unregister();
			});
		},
		watch: (read, onChange) => {
			assertLive();
			if (typeof read !== 'function') throw invalid('watch needs a read function');
			if (typeof onChange !== 'function') throw invalid('watch needs a callback function');
			return disposable(watchModValue(tag, read, onChange));
		},
		onNoteSaved: (callback) => {
			assertLive();
			if (typeof callback !== 'function') throw invalid('onNoteSaved needs a callback function');
			const pending = new Set<ReturnType<typeof setTimeout>>();
			const report = (err: unknown) => debug(tag, 'onNoteSaved callback failed:', errorText(err));
			const unsubscribe = addAfterSaveObserver((path) => {
				const relative = vaultRelativeKey(vaultPath, path);
				if (relative === null || runtime.unloaded || vaultStore.path !== vaultPath) return;
				// Leave the synchronous save fan-out before running any mod code.
				const timer = setTimeout(() => {
					pending.delete(timer);
					if (runtime.unloaded || vaultStore.path !== vaultPath) return;
					try {
						void Promise.resolve(callback(relative)).catch(report);
					} catch (err) {
						report(err);
					}
				}, 0);
				pending.add(timer);
			});
			return disposable(() => {
				unsubscribe();
				for (const timer of pending) clearTimeout(timer);
				pending.clear();
			});
		},
		vault: createModVault({ modId: manifest.id, vaultPath, assertLive }),
		workspace: createModWorkspace({ modId: manifest.id, vaultPath, assertLive }),
		ui,
		theme,
		labs,
		...createModData({ modId: manifest.id, vaultPath, assertLive }),
		get app() {
			assertLive();
			return MOD_APP;
		},
		get kb() {
			assertLive();
			return kb;
		},
	};
}

/** Reports an error thrown by mod code during unload; mod errors stay out of Sentry (PRD P9) */
function reportUnloadError(live: LiveMod, phase: string, err: unknown): void {
	debug(`MOD:${live.manifest.id}`, `${phase} failed:`, errorText(err));
	toast.error(`${MODS_DIR}/${live.manifest.id}: ${phase} failed: ${messageOf(err)}`);
}

/**
 * Unloads one mod: aborts its signal (and so its runs), closes its picker if open, calls
 * `onunload` (skipped when `onload` failed), then runs every registered
 * cleanup in reverse (its actions and rail buttons included), even if
 * `onunload` threw. A second call does nothing.
 */
function unloadMod(live: LiveMod, callOnunload: boolean): void {
	if (live.unloaded) return;
	live.unloaded = true;
	debug('MOD-HOST', JSON.stringify({ event: 'unload', modId: live.manifest.id }));
	live.controller.abort();
	modPickerStore.closeForMod(live.manifest.id);
	modDialogsStore.closeForMod(live.manifest.id);
	if (callOnunload && live.module.onunload) {
		try {
			const result = live.module.onunload();
			if (result instanceof Promise) result.catch((err: unknown) => reportUnloadError(live, 'onunload', err));
		} catch (err) {
			reportUnloadError(live, 'onunload', err);
		}
	}
	for (const dispose of live.disposers.splice(0).reverse()) {
		try {
			dispose();
		} catch (err) {
			reportUnloadError(live, 'cleanup', err);
		}
	}
}

/** Lists a mod as failed, logs it, and toasts it unless the same message was toasted last time */
function recordLoadError(vaultPath: string, folder: string, message: string, err: unknown, manifest?: ModManifest): void {
	debug(`MOD:${manifest?.id ?? folder}`, message, err ?? '');
	modsStore.upsertEntry({
		id: manifest?.id ?? folder,
		folder,
		name: manifest?.name ?? folder,
		version: manifest?.version ?? '',
		state: 'error',
		error: { message, stack: err instanceof Error ? err.stack : undefined },
	});
	const key = `${vaultPath}\n${folder}`;
	if (toastedErrors.get(key) === message) return;
	toastedErrors.set(key, message);
	toast.error(message);
}

/**
 * Reads, evaluates and loads one mod folder; records the result unless the
 * start was superseded. With `waitForOnload` false it resolves once `onload`
 * is called, so a reload runner is never held by an `onload` that does not settle.
 */
async function loadMod(vaultPath: string, folder: string, startGeneration: number, waitForOnload = true): Promise<void> {
	const startedAt = performance.now();
	debug('MOD-HOST', JSON.stringify({ event: 'load-attempt', modId: folder }));
	const result = (outcome: 'loaded' | 'failed' | 'superseded') => debug('MOD-HOST', JSON.stringify({
		event: 'load-result', modId: folder, outcome, elapsedMs: Math.round(performance.now() - startedAt),
	}));
	const dir = `${MODS_DIR}/${folder}`;
	const startEpoch = folderEpochs.get(folder) ?? 0;
	const current = () => generation === startGeneration && (folderEpochs.get(folder) ?? 0) === startEpoch;
	const fail = (message: string, err?: unknown, manifest?: ModManifest) => {
		result(current() ? 'failed' : 'superseded');
		if (current()) recordLoadError(vaultPath, folder, message, err, manifest);
	};

	let manifestText: string;
	try {
		manifestText = await readTextFile(`${vaultPath}/${dir}/manifest.json`);
	} catch (err) {
		return fail(`${dir}: cannot read manifest.json: ${messageOf(err)}`, err);
	}
	const parsed = parseModManifest(manifestText, folder);
	if (!parsed.ok) return fail(parsed.error);
	const { manifest } = parsed;

	let source: string;
	try {
		source = await readTextFile(`${vaultPath}/${dir}/main.js`);
	} catch (err) {
		return fail(`${dir}: cannot read main.js: ${messageOf(err)}`, err, manifest);
	}
	if (!current()) return result('superseded');

	let module: ModV1;
	try {
		module = evaluateModSource(source, manifest.id);
	} catch (err) {
		return fail(`${dir}: ${messageOf(err)}`, err, manifest);
	}

	const live: LiveMod = {
		folder,
		manifest,
		module,
		controller: new AbortController(),
		disposers: [],
		runs: new Set(),
		unloaded: false,
	};
	liveMods.push(live);
	const loading = (async () => {
		try {
			await module.onload(createModContext(manifest, vaultPath, live));
		} catch (err) {
			liveMods = liveMods.filter((m) => m !== live);
			unloadMod(live, false);
			return fail(`${dir}: onload failed: ${messageOf(err)}`, err, manifest);
		}
		// A stop, switch or reload while onload ran has already unloaded it.
		if (live.unloaded || !current()) {
			unloadMod(live, true);
			return result('superseded');
		}

		toastedErrors.delete(`${vaultPath}\n${folder}`);
		modsStore.upsertEntry({ id: manifest.id, folder, name: manifest.name, version: manifest.version, state: 'loaded' });
		result('loaded');
	})();
	if (waitForOnload) await loading;
}

/**
 * Lists a switched-off mod under its manifest name without reading or running
 * its `main.js`. A manifest that cannot be read or parsed only costs the row
 * its name: the row shows the folder, and the reason goes only to `debug()`.
 */
async function listDisabledMod(vaultPath: string, folder: string, startGeneration: number): Promise<void> {
	const startEpoch = folderEpochs.get(folder) ?? 0;
	let manifest: ModManifest | undefined;
	try {
		const parsed = parseModManifest(await readTextFile(`${vaultPath}/${MODS_DIR}/${folder}/manifest.json`), folder);
		if (parsed.ok) manifest = parsed.manifest;
		else debug(`MOD:${folder}`, 'disabled mod listed by folder name:', parsed.error);
	} catch (err) {
		debug(`MOD:${folder}`, 'disabled mod listed by folder name: cannot read manifest.json:', err);
	}
	if (generation !== startGeneration || (folderEpochs.get(folder) ?? 0) !== startEpoch) return;
	modsStore.upsertEntry({
		id: manifest?.id ?? folder,
		folder,
		name: manifest?.name ?? folder,
		version: manifest?.version ?? '',
		state: 'disabled',
	});
}

/**
 * Waits until every run of the folder's live mod has ended, or until
 * `current` turns false: a newer request wakes the wait, and a switch or a
 * stop aborts the runs. Meanwhile the run view says "Reload pending".
 */
async function waitForRuns(folder: string, current: () => boolean): Promise<void> {
	const runsOf = () => liveMods.filter((m) => m.folder === folder).flatMap((m) => [...m.runs]);
	// A loaded mod's id is its folder name, which the run store keys mods by.
	if (runsOf().length > 0 && current()) debug('MOD-HOST', JSON.stringify({ event: 'reload-wait', modId: folder }));
	try {
		for (let runs = runsOf(); runs.length > 0 && current(); runs = runsOf()) {
			modsRunsStore.setReloadPending(folder, true);
			const woken = new Promise<void>((resolve) => reloadWakers.set(folder, resolve));
			await Promise.race([Promise.all(runs), woken]);
		}
	} finally {
		modsRunsStore.setReloadPending(folder, false);
	}
}

/**
 * Reloads one folder: unloads the running mod, then loads it from disk again,
 * or lists it as disabled when it is switched off. With no `manifest.json`
 * left (the folder deleted, or only its manifest), it only unloads and drops
 * the row; a restart would list a folder that stays without a manifest as an
 * error. When the check for the manifest fails, the running mod is left as
 * it is. While the mod has live runs, the unload waits for them to end (PRD
 * P10); a deleted mod is unloaded, and its runs aborted, at once. Runs
 * through the folder's serialized runner, so two reloads of one mod never
 * overlap; the runner does not wait for the new code's `onload`.
 */
async function reloadFolder(vaultPath: string, folder: string, startGeneration: number): Promise<void> {
	const startEpoch = folderEpochs.get(folder) ?? 0;
	const current = () => generation === startGeneration && (folderEpochs.get(folder) ?? 0) === startEpoch;
	if (!current()) return;
	const present = await exists(`${vaultPath}/${MODS_DIR}/${folder}/manifest.json`);
	if (!current()) return;
	if (present) {
		await waitForRuns(folder, current);
		if (!current()) return;
	}

	const running = liveMods.filter((m) => m.folder === folder);
	liveMods = liveMods.filter((m) => m.folder !== folder);
	for (const live of running) unloadMod(live, true);
	if (!present) {
		modsStore.removeEntry(folder);
		toastedErrors.delete(`${vaultPath}\n${folder}`);
		return;
	}
	if (modsEnabledStore.disabledMods.includes(folder)) await listDisabledMod(vaultPath, folder, startGeneration);
	else await loadMod(vaultPath, folder, startGeneration, false);
}

/**
 * Asks for a reload of one folder. Bumps the folder's epoch first, so a load
 * of it still in flight (a start's, a switch's or an older reload's) drops
 * its result, and the runner then loads the newest files once.
 */
function requestReload(vaultPath: string, folder: string, startGeneration: number): void {
	folderEpochs.set(folder, (folderEpochs.get(folder) ?? 0) + 1);
	reloadWakers.get(folder)?.();
	reloadWakers.delete(folder);
	let run = reloadRunners.get(folder);
	if (!run) {
		run = serializeWithRerun(() => reloadFolder(vaultPath, folder, startGeneration));
		reloadRunners.set(folder, run);
	}
	run().catch((err: unknown) => error('MODS', `reloading ${MODS_DIR}/${folder} failed:`, err));
}

/** Lists the mods folder again and reloads every folder on disk or known to the host */
async function rediscoverMods(vaultPath: string, startGeneration: number): Promise<void> {
	const modsPath = `${vaultPath}/${MODS_DIR}`;
	const onDisk = (await exists(modsPath))
		? (await readDir(modsPath)).filter((e) => e.isDirectory).map((e) => e.name)
		: [];
	if (generation !== startGeneration) return;
	const known = [...modsStore.entries.map((e) => e.folder), ...liveMods.map((m) => m.folder)];
	for (const folder of new Set([...onDisk, ...known])) requestReload(vaultPath, folder, startGeneration);
}

/** The host's watcher listener: maps the batch to the mods it touches and reloads them */
function onModFilesChanged(vaultPath: string, paths: string[], startGeneration: number): void {
	if (generation !== startGeneration) return;
	const { rediscover, folders } = mapModChanges(paths, vaultPath);
	if (rediscover) {
		rediscoverMods(vaultPath, startGeneration).catch((err: unknown) => error('MODS', 'listing the mods folder again failed:', err));
	}
	for (const folder of folders) requestReload(vaultPath, folder, startGeneration);
}

/**
 * Loads every mod in `<vaultPath>/_system/mods/` when mods are on for that
 * vault, after stopping any mods already loaded. Each mod loads on its own, so
 * one broken mod never blocks another; its error goes to the status list, a
 * toast and `debug()`. A mod switched off in Labs is listed, not loaded. A
 * missing mods folder means zero mods.
 *
 * Until the next stop, the host also listens to the file watcher: a changed
 * `main.js` or `manifest.json`, or a mod folder added or deleted, reloads that
 * mod; a change to the mods folder itself or `_system` reloads them all.
 * Self-saves count, so editing `main.js` in the app reloads it.
 *
 * Throws when the mods folder cannot be read (a host failure, for the caller
 * to report with `error()`).
 */
export async function startModsHost(vaultPath: string): Promise<void> {
	stopModsHost();
	if (vaultStore.path !== vaultPath || !modsEnabledStore.enabled) return;
	const startGeneration = generation;
	// Before any await, so a change during the first load is not missed.
	unsubscribeFileChange = onFileChange((paths) => onModFilesChanged(vaultPath, paths, startGeneration));

	const modsPath = `${vaultPath}/${MODS_DIR}`;
	if (!(await exists(modsPath))) return;
	const entries = await readDir(modsPath);
	if (generation !== startGeneration) return;

	// A folder with a runner was already asked to reload by this start's listener, which loads it.
	const folders = entries
		.filter((e) => e.isDirectory && !reloadRunners.has(e.name))
		.map((e) => e.name)
		.sort();
	const disabled = modsEnabledStore.disabledMods;
	await Promise.allSettled(
		folders.map((folder) =>
			disabled.includes(folder)
				? listDisabledMod(vaultPath, folder, startGeneration)
				: loadMod(vaultPath, folder, startGeneration),
		),
	);
}

/**
 * Loads one mod after it was switched on in Labs. Does nothing while mods are
 * off for the vault, when `vaultPath` is no longer the open vault, or when the
 * mod is already loaded. Call it after saving the switch.
 */
export async function enableMod(vaultPath: string, folder: string): Promise<void> {
	if (vaultStore.path !== vaultPath || !modsEnabledStore.enabled) return;
	if (liveMods.some((m) => m.folder === folder)) return;
	folderEpochs.set(folder, (folderEpochs.get(folder) ?? 0) + 1);
	await loadMod(vaultPath, folder, generation);
}

/**
 * Unloads one mod after it was switched off in Labs, including one whose
 * `onload` is still running, and lists it as disabled. A load of that mod
 * still in flight drops its result. The other mods are untouched.
 */
export function disableMod(folder: string): void {
	folderEpochs.set(folder, (folderEpochs.get(folder) ?? 0) + 1);
	const live = liveMods.find((m) => m.folder === folder);
	if (live) {
		liveMods = liveMods.filter((m) => m !== live);
		unloadMod(live, true);
	}
	const previous = modsStore.entries.find((e) => e.folder === folder);
	modsStore.upsertEntry({
		id: previous?.id ?? folder,
		folder,
		name: previous?.name ?? folder,
		version: previous?.version ?? '',
		state: 'disabled',
	});
}

/**
 * Unloads every mod, including one whose `onload` is still running, which
 * aborts every run; closes the picker and its run view, empties the status
 * list, detaches the watcher listener, and makes any load or
 * reload still in flight drop its result. Synchronous; with nothing loaded it
 * changes nothing visible.
 */
export function stopModsHost(): void {
	generation++;
	// The watcher keeps its listeners across its own stop, so the host detaches its own.
	unsubscribeFileChange?.();
	unsubscribeFileChange = null;
	reloadRunners.clear();
	reloadWakers.clear();
	const mods = liveMods;
	liveMods = [];
	for (const live of mods.reverse()) unloadMod(live, true);
	// An unload keeps a run view open on how the run ended; a stop closes it too.
	modPickerStore.close();
	modsStore.reset();
}
