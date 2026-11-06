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
	manifest: ModManifest;
	module: ModV1;
}

const NOTIFY_KINDS: readonly ModNotifyKindV1[] = ['info', 'success', 'warning', 'error'];

/** Bumped by every stop; a load that sees a different value drops its result */
let generation = 0;
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
	const current = () => generation === startGeneration;
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

	const live: LiveMod = { manifest, module, controller: new AbortController(), disposers: [], unloaded: false };
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
 * Loads every mod in `<vaultPath>/_system/mods/` when mods are on for that
 * vault, after stopping any mods already loaded. Each mod loads on its own, so
 * one broken mod never blocks another; its error goes to the status list, a
 * toast and `debug()`. A missing mods folder means zero mods.
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
	await Promise.allSettled(folders.map((folder) => loadMod(vaultPath, folder, startGeneration)));
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
