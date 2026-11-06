import { exists, readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';

import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { debug } from '#lib/utils/debug.js';

import type { ModContextV1, ModNotifyKindV1, ModV1 } from './contract/mod-api.v1';
import { modsEnabledStore } from './mods-enabled.store.svelte';
import { evaluateModSource, MODS_DIR, parseModManifest, type ModManifest } from './mods.logic';
import { modsStore } from './mods.store.svelte';

/** Per-mod state the host and the mod's `ctx` share */
export interface ModRuntime {
	/** Aborted at unload; its signal is `ctx.signal` */
	controller: AbortController;
	/** Cleanups collected through `ctx.register`, run in reverse at unload */
	disposers: (() => void)[];
	/** Set at unload; every `ctx` function throws afterwards */
	unloaded: boolean;
}

interface LiveMod extends ModRuntime {
	folder: string;
	manifest: ModManifest;
	module: ModV1;
}

const NOTIFY_KINDS: readonly ModNotifyKindV1[] = ['info', 'success', 'warning', 'error'];

/** Bumped by every stop; a load that sees a different value drops its result */
let generation = 0;
/**
 * Bumped per folder by every per-mod switch, so a load still in flight from
 * before an off/on drops its result instead of loading the mod twice
 */
const folderEpochs = new Map<string, number>();
/** Mods whose `onload` was called and that are not unloaded yet, in load order */
let liveMods: LiveMod[] = [];
/** Last load error toasted per vault and folder, so an unchanged error is not toasted again on reload */
const toastedErrors = new Map<string, string>();

function messageOf(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

/**
 * Builds the v1 `ctx` a mod's `onload` receives. Every function throws
 * `Mod "<id>" is unloaded` once `runtime.unloaded` is set or the open vault is
 * no longer `vaultPath`.
 */
export function createModContext(manifest: ModManifest, vaultPath: string, runtime: ModRuntime): ModContextV1 {
	const tag = `MOD:${manifest.id}`;
	const assertLive = () => {
		if (runtime.unloaded || vaultStore.path !== vaultPath) throw new Error(`Mod "${manifest.id}" is unloaded`);
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
	};
}

/** Reports an error thrown by mod code during unload; mod errors stay out of Sentry (PRD P9) */
function reportUnloadError(live: LiveMod, phase: string, err: unknown): void {
	debug(`MOD:${live.manifest.id}`, `${phase} failed:`, err);
	toast.error(`${MODS_DIR}/${live.manifest.id}: ${phase} failed: ${messageOf(err)}`);
}

/**
 * Unloads one mod: aborts its signal, calls `onunload` (skipped when `onload`
 * failed), then runs every registered cleanup in reverse, even if `onunload`
 * threw. A second call does nothing.
 */
function unloadMod(live: LiveMod, callOnunload: boolean): void {
	if (live.unloaded) return;
	live.unloaded = true;
	live.controller.abort();
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

/** Reads, evaluates and loads one mod folder; records the result unless the start was superseded */
async function loadMod(vaultPath: string, folder: string, startGeneration: number): Promise<void> {
	const dir = `${MODS_DIR}/${folder}`;
	const startEpoch = folderEpochs.get(folder) ?? 0;
	const current = () => generation === startGeneration && (folderEpochs.get(folder) ?? 0) === startEpoch;
	const fail = (message: string, err?: unknown, manifest?: ModManifest) => {
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
	if (!current()) return;

	let module: ModV1;
	try {
		module = evaluateModSource(source, manifest.id);
	} catch (err) {
		return fail(`${dir}: ${messageOf(err)}`, err, manifest);
	}

	const live: LiveMod = { folder, manifest, module, controller: new AbortController(), disposers: [], unloaded: false };
	liveMods.push(live);
	try {
		await module.onload(createModContext(manifest, vaultPath, live));
	} catch (err) {
		liveMods = liveMods.filter((m) => m !== live);
		unloadMod(live, false);
		return fail(`${dir}: onload failed: ${messageOf(err)}`, err, manifest);
	}
	// A stop while onload ran has already unloaded it.
	if (live.unloaded || !current()) {
		unloadMod(live, true);
		return;
	}

	toastedErrors.delete(`${vaultPath}\n${folder}`);
	modsStore.upsertEntry({ id: manifest.id, folder, name: manifest.name, version: manifest.version, state: 'loaded' });
}

/**
 * Lists a switched-off mod under its manifest name without reading or running
 * its `main.js`. A manifest that cannot be read or parsed only costs the row
 * its name: the row shows the folder, and the reason goes only to `debug()`.
 */
async function listDisabledMod(vaultPath: string, folder: string, startGeneration: number): Promise<void> {
	let manifest: ModManifest | undefined;
	try {
		const parsed = parseModManifest(await readTextFile(`${vaultPath}/${MODS_DIR}/${folder}/manifest.json`), folder);
		if (parsed.ok) manifest = parsed.manifest;
		else debug(`MOD:${folder}`, 'disabled mod listed by folder name:', parsed.error);
	} catch (err) {
		debug(`MOD:${folder}`, 'disabled mod listed by folder name: cannot read manifest.json:', err);
	}
	if (generation !== startGeneration) return;
	modsStore.upsertEntry({
		id: manifest?.id ?? folder,
		folder,
		name: manifest?.name ?? folder,
		version: manifest?.version ?? '',
		state: 'disabled',
	});
}

/**
 * Loads every mod in `<vaultPath>/_system/mods/` when mods are on for that
 * vault, after stopping any mods already loaded. Each mod loads on its own, so
 * one broken mod never blocks another; its error goes to the status list, a
 * toast and `debug()`. A mod switched off in Labs is listed, not loaded. A
 * missing mods folder means zero mods.
 *
 * Throws when the mods folder cannot be read (a host failure, for the caller
 * to report with `error()`).
 */
export async function startModsHost(vaultPath: string): Promise<void> {
	stopModsHost();
	if (vaultStore.path !== vaultPath || !modsEnabledStore.enabled) return;
	const startGeneration = generation;

	const modsPath = `${vaultPath}/${MODS_DIR}`;
	if (!(await exists(modsPath))) return;
	const entries = await readDir(modsPath);
	if (generation !== startGeneration) return;

	const folders = entries.filter((e) => e.isDirectory).map((e) => e.name).sort();
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
 * Unloads every mod, including one whose `onload` is still running, empties
 * the status list, and makes any load still in flight drop its result.
 * Synchronous; with nothing loaded it changes nothing visible.
 */
export function stopModsHost(): void {
	generation++;
	const mods = liveMods;
	liveMods = [];
	for (const live of mods.reverse()) unloadMod(live, true);
	modsStore.reset();
}
