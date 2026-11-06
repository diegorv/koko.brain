// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, onTestFinished, vi } from 'vitest';

const fsFiles = vi.hoisted(() => new Map<string, string>());

vi.mock('@tauri-apps/plugin-fs', () => {
	const isUnder = (path: string, dir: string) => path.startsWith(`${dir}/`);
	return {
		exists: vi.fn(async (path: string) => [...fsFiles.keys()].some((k) => k === path || isUnder(k, path))),
		readDir: vi.fn(async (dir: string) => {
			const names = new Set<string>();
			for (const key of fsFiles.keys()) {
				if (!isUnder(key, dir)) continue;
				const rest = key.slice(dir.length + 1);
				const slash = rest.indexOf('/');
				if (slash > 0) names.add(rest.slice(0, slash));
			}
			return [...names].map((name) => ({ name, isDirectory: true, isFile: false, isSymlink: false }));
		}),
		readTextFile: vi.fn(async (path: string) => {
			const text = fsFiles.get(path);
			if (text === undefined) throw new Error(`No such file: ${path}`);
			return text;
		}),
	};
});

// The vault entries snapshot `ctx.kb()` reads; only the IPC boundary is mocked.
const ipcEntries = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string) => (cmd === 'get_all_vault_entries_v2' ? ipcEntries.value : null)),
}));

vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

// Only the watcher's listener registry is replaced, so a test can deliver a
// batch the way the Rust watcher would.
const fileListeners = vi.hoisted(() => new Set<(paths: string[]) => void>());
vi.mock('#lib/core/filesystem/fs.watcher.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/core/filesystem/fs.watcher.js')>()),
	onFileChange: vi.fn((listener: (paths: string[]) => void) => {
		fileListeners.add(listener);
		return () => fileListeners.delete(listener);
	}),
}));

// error() reports to Sentry; mod errors must stay out of it (PRD P9).
vi.mock('#lib/utils/debug.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/debug.js')>()),
	debug: vi.fn(),
	error: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { exists, readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';

import { openFileInEditor } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openNoteAt } from '#lib/core/editor/open-note-at.service.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';
import { modPickerStore } from '#lib/plugins/mods/mod-picker.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, enableMod, startModsHost, stopModsHost, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vaults/main';

/** Shared with the mods' code, which runs through `new Function` and sees only globals */
interface TestGlobals {
	__modEvents: string[];
	__modCtx: Record<string, ModContext>;
	__modGate: Promise<void>;
}
const globals = globalThis as unknown as TestGlobals;

function writeMod(folder: string, main: string, manifest: Record<string, unknown> = {}): void {
	const base = `${VAULT}/_system/mods/${folder}`;
	fsFiles.set(`${base}/manifest.json`, JSON.stringify({ id: folder, name: `Mod ${folder}`, version: '1.0.0', ...manifest }));
	fsFiles.set(`${base}/main.js`, main);
}

/** A mod that records its lifecycle in `__modEvents` and keeps its ctx in `__modCtx` */
function recordingMod(folder: string): string {
	return `export default {
	onload(ctx) {
		globalThis.__modCtx['${folder}'] = ctx;
		globalThis.__modEvents.push('${folder}:load');
		ctx.register(() => globalThis.__modEvents.push('${folder}:dispose-1'));
		ctx.register(() => globalThis.__modEvents.push('${folder}:dispose-2'));
	},
	onunload() {
		globalThis.__modEvents.push('${folder}:unload');
	},
};`;
}

describe('mods host', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fsFiles.clear();
		localStorage.clear();
		vaultStore._reset();
		modsEnabledStore._reset();
		modsStore.reset();
		railRegistryStore.reset();
		modPickerStore.reset();
		globals.__modEvents = [];
		globals.__modCtx = {};
		vaultStore.open(VAULT);
		modsEnabledStore.setEnabled(true);
	});

	afterEach(() => {
		stopModsHost();
	});

	it('reads nothing while mods are off for the vault', async () => {
		modsEnabledStore.setEnabled(false);
		writeMod('alpha', recordingMod('alpha'));

		await startModsHost(VAULT);

		expect(exists).not.toHaveBeenCalled();
		expect(readDir).not.toHaveBeenCalled();
		expect(readTextFile).not.toHaveBeenCalled();
		expect(modsStore.entries).toEqual([]);
		expect(globals.__modEvents).toEqual([]);
	});

	it('loads every mod and lists each one as loaded', async () => {
		writeMod('beta', recordingMod('beta'));
		writeMod('alpha', recordingMod('alpha'));

		await startModsHost(VAULT);

		expect(modsStore.entries).toEqual([
			{ id: 'alpha', folder: 'alpha', name: 'Mod alpha', version: '1.0.0', state: 'loaded' },
			{ id: 'beta', folder: 'beta', name: 'Mod beta', version: '1.0.0', state: 'loaded' },
		]);
		expect(globals.__modEvents).toEqual(expect.arrayContaining(['alpha:load', 'beta:load']));
	});

	it('gives each mod a v1 ctx with its identity and a vault-relative dir', async () => {
		writeMod('alpha', recordingMod('alpha'));

		await startModsHost(VAULT);

		const ctx = globals.__modCtx.alpha;
		expect(ctx.apiVersion).toBe(1);
		expect(ctx.mod).toEqual({ id: 'alpha', name: 'Mod alpha', version: '1.0.0', dir: '_system/mods/alpha' });
		expect(ctx.signal.aborted).toBe(false);
	});

	it('notify shows a toast prefixed with the mod name, info by default', async () => {
		writeMod('alpha', recordingMod('alpha'));
		await startModsHost(VAULT);
		const ctx = globals.__modCtx.alpha;

		ctx.notify('Hello');
		ctx.notify('Done', { kind: 'success' });
		ctx.notify('Careful', { kind: 'warning' });

		expect(toast.info).toHaveBeenCalledWith('Mod alpha: Hello');
		expect(toast.success).toHaveBeenCalledWith('Mod alpha: Done');
		expect(toast.warning).toHaveBeenCalledWith('Mod alpha: Careful');
	});

	it('marks a mod whose onload throws as an error, runs its cleanups, and still loads the others', async () => {
		writeMod(
			'broken',
			`export default {
	onload(ctx) {
		ctx.register(() => globalThis.__modEvents.push('broken:dispose'));
		throw new Error('onload exploded');
	},
	onunload() { globalThis.__modEvents.push('broken:unload'); },
};`,
		);
		writeMod('alpha', recordingMod('alpha'));

		await startModsHost(VAULT);

		const broken = modsStore.entries.find((e) => e.folder === 'broken');
		expect(broken?.state).toBe('error');
		expect(broken?.error?.message).toBe('_system/mods/broken: onload failed: onload exploded');
		expect(broken?.error?.stack).toContain('onload exploded');
		expect(globals.__modEvents).toContain('broken:dispose');
		expect(globals.__modEvents).not.toContain('broken:unload');
		expect(modsStore.entries.find((e) => e.folder === 'alpha')?.state).toBe('loaded');
		expect(toast.error).toHaveBeenCalledWith('_system/mods/broken: onload failed: onload exploded');
	});

	it('lists a folder with an invalid manifest or bad main.js as an error that names it', async () => {
		writeMod('wrong-id', recordingMod('wrong-id'), { id: 'other' });
		writeMod('no-export', 'const x = 1;');
		fsFiles.set(`${VAULT}/_system/mods/no-main/manifest.json`, JSON.stringify({ id: 'no-main', name: 'N', version: '1' }));

		await startModsHost(VAULT);

		const messages = Object.fromEntries(modsStore.entries.map((e) => [e.folder, e.error?.message]));
		expect(messages['wrong-id']).toBe('_system/mods/wrong-id: manifest.json id "other" does not match the folder name');
		expect(messages['no-export']).toBe(
			'_system/mods/no-export: main.js: found no "export default"; a mod default-exports an object with onload',
		);
		expect(messages['no-main']).toMatch(/^_system\/mods\/no-main: cannot read main\.js/);
		expect(modsStore.entries.every((e) => e.state === 'error')).toBe(true);
	});

	it('lists nothing and reports nothing when the vault has no mods folder', async () => {
		await startModsHost(VAULT);

		expect(modsStore.entries).toEqual([]);
		expect(readDir).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('propagates a failure to read the mods folder', async () => {
		writeMod('alpha', recordingMod('alpha'));
		vi.mocked(readDir).mockRejectedValueOnce(new Error('permission denied'));

		await expect(startModsHost(VAULT)).rejects.toThrow('permission denied');
		expect(modsStore.entries).toEqual([]);
	});

	it('stop calls onunload, then the cleanups in reverse, and aborts the signal', async () => {
		writeMod('alpha', recordingMod('alpha'));
		await startModsHost(VAULT);
		const ctx = globals.__modCtx.alpha;

		stopModsHost();

		expect(globals.__modEvents).toEqual(['alpha:load', 'alpha:unload', 'alpha:dispose-2', 'alpha:dispose-1']);
		expect(ctx.signal.aborted).toBe(true);
		expect(() => ctx.notify('late')).toThrow('Mod "alpha" is unloaded');
		expect(() => ctx.register(() => {})).toThrow('Mod "alpha" is unloaded');
		expect(() => ctx.log('late')).toThrow('Mod "alpha" is unloaded');
		expect(modsStore.entries).toEqual([]);
	});

	it('runs the cleanups even when onunload throws', async () => {
		writeMod(
			'alpha',
			`export default {
	onload(ctx) { ctx.register(() => globalThis.__modEvents.push('alpha:dispose')); },
	onunload() { throw new Error('unload exploded'); },
};`,
		);
		await startModsHost(VAULT);

		stopModsHost();

		expect(globals.__modEvents).toEqual(['alpha:dispose']);
	});

	it('a ctx call after the open vault changed throws', async () => {
		writeMod('alpha', recordingMod('alpha'));
		await startModsHost(VAULT);
		const ctx = globals.__modCtx.alpha;

		vaultStore.open('/vaults/other');

		expect(() => ctx.notify('stale')).toThrow('Mod "alpha" is unloaded');
	});

	it('stop during a start unloads the mod still loading and leaves the list empty', async () => {
		let release!: () => void;
		globals.__modGate = new Promise<void>((resolve) => {
			release = resolve;
		});
		writeMod(
			'slow',
			`export default {
	async onload(ctx) {
		globalThis.__modCtx.slow = ctx;
		globalThis.__modEvents.push('slow:load-start');
		await globalThis.__modGate;
		globalThis.__modEvents.push('slow:load-end');
	},
	onunload() { globalThis.__modEvents.push('slow:unload'); },
};`,
		);

		const starting = startModsHost(VAULT);
		await vi.waitFor(() => expect(globals.__modEvents).toContain('slow:load-start'));
		stopModsHost();
		release();
		await starting;

		expect(modsStore.entries).toEqual([]);
		expect(globals.__modEvents).toContain('slow:unload');
		expect(globals.__modCtx.slow.signal.aborted).toBe(true);
	});

	it('stop while the files are still being read loads nothing', async () => {
		writeMod('alpha', recordingMod('alpha'));
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const original = vi.mocked(readTextFile).getMockImplementation()!;
		vi.mocked(readTextFile).mockImplementation(async (path, options) => {
			await gate;
			return original(path, options);
		});

		const starting = startModsHost(VAULT);
		await vi.waitFor(() => expect(readTextFile).toHaveBeenCalled());
		stopModsHost();
		release();
		await starting;

		expect(modsStore.entries).toEqual([]);
		expect(globals.__modEvents).toEqual([]);
	});

	it('a second start replaces the first instead of loading the mods twice', async () => {
		writeMod('alpha', recordingMod('alpha'));

		await startModsHost(VAULT);
		await startModsHost(VAULT);

		expect(globals.__modEvents).toEqual([
			'alpha:load',
			'alpha:unload',
			'alpha:dispose-2',
			'alpha:dispose-1',
			'alpha:load',
		]);
		expect(modsStore.entries).toHaveLength(1);
	});

	it('toasts a load error once while its message stays the same, and again when it changes', async () => {
		writeMod('dedupe', 'export default {};');

		await startModsHost(VAULT);
		await startModsHost(VAULT);

		expect(toast.error).toHaveBeenCalledTimes(1);

		writeMod('dedupe', 'export default { onload( };');
		await startModsHost(VAULT);

		expect(toast.error).toHaveBeenCalledTimes(2);
		expect(modsStore.entries[0].state).toBe('error');
	});

	describe('per-mod switch', () => {
		it('lists a disabled mod with its manifest name and never runs or reads its main.js', async () => {
			writeMod('alpha', recordingMod('alpha'));
			writeMod('beta', recordingMod('beta'));
			modsEnabledStore.setModEnabled('beta', false);

			await startModsHost(VAULT);

			expect(modsStore.entries).toEqual([
				{ id: 'alpha', folder: 'alpha', name: 'Mod alpha', version: '1.0.0', state: 'loaded' },
				{ id: 'beta', folder: 'beta', name: 'Mod beta', version: '1.0.0', state: 'disabled' },
			]);
			expect(globals.__modEvents).toEqual(['alpha:load']);
			expect(readTextFile).not.toHaveBeenCalledWith(`${VAULT}/_system/mods/beta/main.js`);
		});

		it('lists a disabled mod with an unreadable manifest under its folder name, without an error', async () => {
			fsFiles.set(`${VAULT}/_system/mods/broken/manifest.json`, '{not json');
			modsEnabledStore.setModEnabled('broken', false);

			await startModsHost(VAULT);

			expect(modsStore.entries).toEqual([
				{ id: 'broken', folder: 'broken', name: 'broken', version: '', state: 'disabled' },
			]);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('disableMod unloads only that mod and lists it as disabled', async () => {
			writeMod('alpha', recordingMod('alpha'));
			writeMod('beta', recordingMod('beta'));
			await startModsHost(VAULT);
			const beta = globals.__modCtx.beta;
			globals.__modEvents = [];

			modsEnabledStore.setModEnabled('beta', false);
			disableMod('beta');

			expect(globals.__modEvents).toEqual(['beta:unload', 'beta:dispose-2', 'beta:dispose-1']);
			expect(beta.signal.aborted).toBe(true);
			expect(() => beta.notify('late')).toThrow('Mod "beta" is unloaded');
			expect(globals.__modCtx.alpha.signal.aborted).toBe(false);
			expect(modsStore.entries.map((e) => [e.folder, e.state])).toEqual([
				['alpha', 'loaded'],
				['beta', 'disabled'],
			]);
		});

		it('disableMod turns a mod in error into a disabled row without its error', async () => {
			writeMod('broken', 'export default {};');
			await startModsHost(VAULT);

			modsEnabledStore.setModEnabled('broken', false);
			disableMod('broken');

			expect(modsStore.entries).toEqual([
				{ id: 'broken', folder: 'broken', name: 'Mod broken', version: '1.0.0', state: 'disabled' },
			]);
		});

		it('enableMod loads only that mod', async () => {
			writeMod('alpha', recordingMod('alpha'));
			writeMod('beta', recordingMod('beta'));
			modsEnabledStore.setModEnabled('beta', false);
			await startModsHost(VAULT);
			globals.__modEvents = [];

			modsEnabledStore.setModEnabled('beta', true);
			await enableMod(VAULT, 'beta');

			expect(globals.__modEvents).toEqual(['beta:load']);
			expect(modsStore.entries.map((e) => [e.folder, e.state])).toEqual([
				['alpha', 'loaded'],
				['beta', 'loaded'],
			]);
		});

		it('enableMod does not load a mod that is already loaded', async () => {
			writeMod('alpha', recordingMod('alpha'));
			await startModsHost(VAULT);

			await enableMod(VAULT, 'alpha');

			expect(globals.__modEvents).toEqual(['alpha:load']);
		});

		it('enableMod does nothing while mods are off for the vault or another vault is open', async () => {
			writeMod('alpha', recordingMod('alpha'));
			modsEnabledStore.setEnabled(false);
			await enableMod(VAULT, 'alpha');

			modsEnabledStore.setEnabled(true);
			await enableMod('/vaults/other', 'alpha');

			expect(globals.__modEvents).toEqual([]);
			expect(modsStore.entries).toEqual([]);
		});

		it('a disable while the mod is still loading unloads it and keeps it disabled', async () => {
			let release!: () => void;
			globals.__modGate = new Promise<void>((resolve) => {
				release = resolve;
			});
			writeMod(
				'slow',
				`export default {
	async onload(ctx) {
		globalThis.__modEvents.push('slow:load-start');
		await globalThis.__modGate;
	},
	onunload() { globalThis.__modEvents.push('slow:unload'); },
};`,
			);

			const starting = startModsHost(VAULT);
			await vi.waitFor(() => expect(globals.__modEvents).toContain('slow:load-start'));
			modsEnabledStore.setModEnabled('slow', false);
			disableMod('slow');
			release();
			await starting;

			expect(globals.__modEvents).toContain('slow:unload');
			expect(modsStore.entries.map((e) => [e.folder, e.state])).toEqual([['slow', 'disabled']]);
		});

		it('off then on while the files are still being read loads the mod once', async () => {
			writeMod('alpha', recordingMod('alpha'));
			let release!: () => void;
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			const original = vi.mocked(readTextFile).getMockImplementation()!;
			vi.mocked(readTextFile).mockImplementation(async (path, options) => {
				await gate;
				return original(path, options);
			});

			const starting = startModsHost(VAULT);
			await vi.waitFor(() => expect(readTextFile).toHaveBeenCalled());
			modsEnabledStore.setModEnabled('alpha', false);
			disableMod('alpha');
			modsEnabledStore.setModEnabled('alpha', true);
			const enabling = enableMod(VAULT, 'alpha');
			release();
			await Promise.all([starting, enabling]);

			expect(globals.__modEvents).toEqual(['alpha:load']);
			expect(modsStore.entries.map((e) => [e.folder, e.state])).toEqual([['alpha', 'loaded']]);
		});
	});

	describe('reload on file change', () => {
		const MODS = `${VAULT}/_system/mods`;

		/** A mod with one rail button titled `title`, which records its load and unload */
		function buttonMod(folder: string, title: string): string {
			return `export default {
	onload(ctx) {
		globalThis.__modEvents.push('${folder}:load:${title}');
		ctx.addRailButton({ id: 'main', title: '${title}', icon: 'lucide:sparkles' });
	},
	onunload() { globalThis.__modEvents.push('${folder}:unload'); },
};`;
		}

		/** Delivers one watcher batch to every registered listener */
		function emit(paths: string[]): void {
			for (const listener of fileListeners) listener(paths);
		}

		function removeMod(folder: string): void {
			for (const key of [...fsFiles.keys()]) if (key.startsWith(`${MODS}/${folder}/`)) fsFiles.delete(key);
		}

		const buttons = () => railRegistryStore.actions.map((a) => [a.key, a.label]);
		const states = () => modsStore.entries.map((e) => [e.folder, e.state]);

		beforeEach(() => {
			fileListeners.clear();
		});

		it('a changed main.js swaps the old button for the new one', async () => {
			writeMod('hello', buttonMod('hello', 'Hello v1'));
			await startModsHost(VAULT);
			expect(buttons()).toEqual([['mod:hello:main', 'Hello v1']]);

			writeMod('hello', buttonMod('hello', 'Hello v2'));
			emit([`${MODS}/hello/main.js`]);

			await vi.waitFor(() => expect(buttons()).toEqual([['mod:hello:main', 'Hello v2']]));
			expect(globals.__modEvents).toEqual(['hello:load:Hello v1', 'hello:unload', 'hello:load:Hello v2']);
			expect(states()).toEqual([['hello', 'loaded']]);
		});

		it('a changed manifest.json reloads the mod under its new name', async () => {
			writeMod('hello', buttonMod('hello', 'Hello'));
			await startModsHost(VAULT);

			writeMod('hello', buttonMod('hello', 'Hello'), { name: 'Renamed', version: '2.0.0' });
			emit([`${MODS}/hello/manifest.json`]);

			await vi.waitFor(() => expect(modsStore.entries[0]).toMatchObject({ name: 'Renamed', version: '2.0.0', state: 'loaded' }));
		});

		it('a broken new main.js leaves the mod in error with no button, and another mod keeps its button', async () => {
			writeMod('hello', buttonMod('hello', 'Hello'));
			writeMod('other', buttonMod('other', 'Other'));
			await startModsHost(VAULT);

			fsFiles.set(`${MODS}/hello/main.js`, 'const mod = {};\n');
			emit([`${MODS}/hello/main.js`]);

			const message = '_system/mods/hello: main.js: found no "export default"; a mod default-exports an object with onload';
			await vi.waitFor(() => expect(states()).toEqual([['hello', 'error'], ['other', 'loaded']]));
			expect(modsStore.entries[0].error?.message).toBe(message);
			expect(toast.error).toHaveBeenCalledWith(message);
			expect(buttons()).toEqual([['mod:other:main', 'Other']]);
			expect(globals.__modEvents).toContain('hello:unload');
			expect(globals.__modEvents).not.toContain('other:unload');
			expect(error).not.toHaveBeenCalled();
		});

		it('a deleted mod folder unloads the mod and drops its row', async () => {
			writeMod('hello', buttonMod('hello', 'Hello'));
			writeMod('other', buttonMod('other', 'Other'));
			await startModsHost(VAULT);

			removeMod('hello');
			emit([`${MODS}/hello`]);

			await vi.waitFor(() => expect(states()).toEqual([['other', 'loaded']]));
			expect(buttons()).toEqual([['mod:other:main', 'Other']]);
			expect(globals.__modEvents).toContain('hello:unload');
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('a new mod folder loads, even when the vault had no mods folder at start', async () => {
			await startModsHost(VAULT);
			expect(modsStore.entries).toEqual([]);

			writeMod('fresh', buttonMod('fresh', 'Fresh'));
			emit([`${MODS}/fresh/main.js`, `${MODS}/fresh/manifest.json`]);

			await vi.waitFor(() => expect(states()).toEqual([['fresh', 'loaded']]));
			expect(buttons()).toEqual([['mod:fresh:main', 'Fresh']]);
			expect(globals.__modEvents).toEqual(['fresh:load:Fresh']);
		});

		it('two quick batches for one mod load it once, with the newest code', async () => {
			writeMod('hello', buttonMod('hello', 'Hello v1'));
			await startModsHost(VAULT);
			let release!: () => void;
			const gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			const original = vi.mocked(readTextFile).getMockImplementation()!;
			vi.mocked(readTextFile).mockClear();
			vi.mocked(readTextFile).mockImplementation(async (path, options) => {
				await gate;
				return original(path, options);
			});
			// A failure before release() must not leave every later read hanging.
			onTestFinished(() => {
				release();
				vi.mocked(readTextFile).mockImplementation(original);
			});

			writeMod('hello', buttonMod('hello', 'Hello v2'));
			emit([`${MODS}/hello/main.js`]);
			await vi.waitFor(() => expect(readTextFile).toHaveBeenCalledWith(`${MODS}/hello/manifest.json`));
			writeMod('hello', buttonMod('hello', 'Hello v3'));
			emit([`${MODS}/hello/main.js`]);
			release();

			await vi.waitFor(() => expect(buttons()).toEqual([['mod:hello:main', 'Hello v3']]));
			expect(globals.__modEvents).toEqual(['hello:load:Hello v1', 'hello:unload', 'hello:load:Hello v3']);
		});

		it('a change while the first onload still runs unloads that instance and loads the new code', async () => {
			let release!: () => void;
			globals.__modGate = new Promise<void>((resolve) => {
				release = resolve;
			});
			writeMod(
				'slow',
				`export default {
	async onload(ctx) {
		globalThis.__modEvents.push('slow:load-start');
		await globalThis.__modGate;
	},
	onunload() { globalThis.__modEvents.push('slow:unload'); },
};`,
			);
			const starting = startModsHost(VAULT);
			await vi.waitFor(() => expect(globals.__modEvents).toContain('slow:load-start'));

			writeMod('slow', buttonMod('slow', 'Slow v2'));
			emit([`${MODS}/slow/main.js`]);
			release();
			await starting;

			await vi.waitFor(() => expect(buttons()).toEqual([['mod:slow:main', 'Slow v2']]));
			expect(globals.__modEvents).toEqual(['slow:load-start', 'slow:unload', 'slow:load:Slow v2']);
			expect(states()).toEqual([['slow', 'loaded']]);
		});

		it('a batch that arrives before the start lists the mods folder loads the mod once', async () => {
			writeMod('hello', buttonMod('hello', 'Hello'));

			const starting = startModsHost(VAULT);
			emit([`${MODS}/hello/main.js`]);
			await starting;

			await vi.waitFor(() => expect(states()).toEqual([['hello', 'loaded']]));
			await new Promise((resolve) => setTimeout(resolve, 0));
			expect(globals.__modEvents).toEqual(['hello:load:Hello']);
			expect(buttons()).toEqual([['mod:hello:main', 'Hello']]);
		});

		it('a reloaded mod whose onload never settles does not block the next save', async () => {
			writeMod('hello', buttonMod('hello', 'Hello v1'));
			await startModsHost(VAULT);
			globals.__modGate = new Promise<void>(() => {});

			writeMod(
				'hello',
				`export default {
	async onload(ctx) {
		globalThis.__modEvents.push('hello:hang');
		await globalThis.__modGate;
	},
	onunload() { globalThis.__modEvents.push('hello:unload'); },
};`,
			);
			emit([`${MODS}/hello/main.js`]);
			await vi.waitFor(() => expect(globals.__modEvents).toContain('hello:hang'));

			writeMod('hello', buttonMod('hello', 'Hello v3'));
			emit([`${MODS}/hello/main.js`]);

			await vi.waitFor(() => expect(buttons()).toEqual([['mod:hello:main', 'Hello v3']]));
			expect(states()).toEqual([['hello', 'loaded']]);
		});

		it('a failed check for manifest.json keeps the running mod and its row', async () => {
			writeMod('hello', buttonMod('hello', 'Hello'));
			await startModsHost(VAULT);
			vi.mocked(exists).mockRejectedValueOnce(new Error('disk gone'));

			emit([`${MODS}/hello/main.js`]);

			await vi.waitFor(() => expect(error).toHaveBeenCalled());
			expect(globals.__modEvents).toEqual(['hello:load:Hello']);
			expect(buttons()).toEqual([['mod:hello:main', 'Hello']]);
			expect(states()).toEqual([['hello', 'loaded']]);
		});

		it('a changed main.js of a disabled mod runs nothing and leaves it disabled under its new name', async () => {
			modsEnabledStore.setModEnabled('hello', false);
			writeMod('hello', buttonMod('hello', 'Hello'));
			await startModsHost(VAULT);

			writeMod('hello', buttonMod('hello', 'Hello v2'), { name: 'Renamed' });
			emit([`${MODS}/hello/main.js`, `${MODS}/hello/manifest.json`]);

			await vi.waitFor(() => expect(modsStore.entries[0]).toMatchObject({ name: 'Renamed', state: 'disabled' }));
			expect(readTextFile).not.toHaveBeenCalledWith(`${MODS}/hello/main.js`);
			expect(globals.__modEvents).toEqual([]);
			expect(buttons()).toEqual([]);
		});

		it('a new folder switched off in Labs is listed as disabled, not loaded', async () => {
			modsEnabledStore.setModEnabled('fresh', false);
			await startModsHost(VAULT);

			writeMod('fresh', buttonMod('fresh', 'Fresh'));
			emit([`${MODS}/fresh`]);

			await vi.waitFor(() => expect(states()).toEqual([['fresh', 'disabled']]));
			expect(globals.__modEvents).toEqual([]);
		});

		it('a change to _system lists the mods folder again: a gone folder unloads, a new one loads', async () => {
			writeMod('hello', buttonMod('hello', 'Hello'));
			await startModsHost(VAULT);

			removeMod('hello');
			writeMod('fresh', buttonMod('fresh', 'Fresh'));
			emit([`${VAULT}/_system`]);

			await vi.waitFor(() => expect(states()).toEqual([['fresh', 'loaded']]));
			expect(buttons()).toEqual([['mod:fresh:main', 'Fresh']]);
			expect(globals.__modEvents).toContain('hello:unload');
		});

		it('a deleted mods folder unloads every mod', async () => {
			writeMod('hello', buttonMod('hello', 'Hello'));
			writeMod('other', buttonMod('other', 'Other'));
			await startModsHost(VAULT);

			removeMod('hello');
			removeMod('other');
			emit([MODS]);

			await vi.waitFor(() => expect(modsStore.entries).toEqual([]));
			expect(buttons()).toEqual([]);
		});

		it('ignores a README or a backup file', async () => {
			writeMod('hello', buttonMod('hello', 'Hello'));
			await startModsHost(VAULT);
			vi.mocked(readTextFile).mockClear();

			emit([`${MODS}/hello/README.md`, `${MODS}/hello/main.js~`]);
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(readTextFile).not.toHaveBeenCalled();
			expect(globals.__modEvents).toEqual(['hello:load:Hello']);
		});

		it('stop unsubscribes the listener, and mods off never subscribes', async () => {
			await startModsHost(VAULT);
			expect(fileListeners.size).toBe(1);

			stopModsHost();
			expect(fileListeners.size).toBe(0);

			modsEnabledStore.setEnabled(false);
			await startModsHost(VAULT);
			expect(fileListeners.size).toBe(0);
		});

		it('a second start keeps one listener', async () => {
			await startModsHost(VAULT);
			await startModsHost(VAULT);

			expect(fileListeners.size).toBe(1);
		});
	});

	describe('actions and rail buttons', () => {
		/** The hello mod of the Issue, plus an action that throws and one that rejects */
		function helloMod(button = "{ id: 'main', title: 'Hello mod', icon: 'lucide:sparkles' }"): string {
			return `export default {
	onload(ctx) {
		globalThis.__modCtx.hello = ctx;
		ctx.addAction({ id: 'hello', title: 'Say hello', description: 'Shows a toast', run: async () => { globalThis.__modEvents.push('hello:run'); } });
		ctx.addAction({ id: 'boom', title: 'Explode', run: () => { throw new Error('kaboom'); } });
		ctx.addAction({ id: 'reject', title: 'Reject', run: async () => { throw new Error('rejected'); } });
		ctx.addRailButton(${button});
	},
};`;
		}

		const clickButton = (key = 'mod:hello:main') => railRegistryStore.actions.find((a) => a.key === key)!.run();
		const pickerRow = (id: string) => modPickerStore.actions.find((a) => a.id === id)!;

		it('registers the rail button under mod:<mod>:<button> and removes it at unload', async () => {
			writeMod('hello', helloMod(), { name: 'Hello mod' });

			await startModsHost(VAULT);

			expect(railRegistryStore.actions.map((a) => [a.key, a.label, a.icon])).toEqual([['mod:hello:main', 'Hello mod', 'lucide:sparkles']]);
			expect(railRegistryStore.navigators).toEqual([]);

			stopModsHost();

			expect(railRegistryStore.actions).toEqual([]);
		});

		it('a click opens the picker with every action of the mod by default, titles and descriptions included', async () => {
			writeMod('hello', helloMod(), { name: 'Hello mod' });
			await startModsHost(VAULT);

			clickButton();

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.modId).toBe('hello');
			expect(modPickerStore.title).toBe('Hello mod');
			expect(modPickerStore.actions.map((a) => [a.id, a.title, a.description])).toEqual([
				['hello', 'Say hello', 'Shows a toast'],
				['boom', 'Explode', undefined],
				['reject', 'Reject', undefined],
			]);
		});

		it("a button's actions list only those, in its order, skipping an unknown id", async () => {
			writeMod('hello', helloMod("{ id: 'main', title: 'Hello mod', icon: 'sparkles', actions: ['boom', 'missing', 'hello'] }"));
			await startModsHost(VAULT);

			clickButton();

			expect(modPickerStore.actions.map((a) => a.id)).toEqual(['boom', 'hello']);
		});

		it('running a picked action awaits its run', async () => {
			writeMod('hello', helloMod());
			await startModsHost(VAULT);
			clickButton();

			await pickerRow('hello').run('');

			expect(globals.__modEvents).toEqual(['hello:run']);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it("an action's input is on its picker row, and run gets the text; without input, run gets ''", async () => {
			writeMod(
				'ideas',
				`export default {
	onload(ctx) {
		ctx.addAction({ id: 'idea', title: 'New idea note', input: { placeholder: 'Describe the idea' }, run: (text) => { globalThis.__modEvents.push('idea:' + text); } });
		ctx.addAction({ id: 'plain', title: 'Plain', run: (text) => { globalThis.__modEvents.push('plain:' + JSON.stringify(text)); } });
		ctx.addRailButton({ id: 'main', title: 'Ideas', icon: 'sparkles' });
	},
};`,
			);
			await startModsHost(VAULT);
			clickButton('mod:ideas:main');

			expect(modPickerStore.actions.map((a) => [a.id, a.input])).toEqual([
				['idea', { placeholder: 'Describe the idea' }],
				['plain', undefined],
			]);
			await pickerRow('idea').run('A flying car');
			await pickerRow('plain').run('');

			expect(globals.__modEvents).toEqual(['idea:A flying car', 'plain:""']);
		});

		it('rejects a malformed action input', async () => {
			writeMod('hello', helloMod());
			await startModsHost(VAULT);
			const loose = globals.__modCtx.hello as unknown as { addAction: (a: unknown) => void };

			expect(() => loose.addAction({ id: 'a', title: 'A', run() {}, input: 'text' })).toThrow(
				'Mod "hello": addAction needs input to be an object with an optional string placeholder',
			);
			expect(() => loose.addAction({ id: 'a', title: 'A', run() {}, input: { placeholder: 3 } })).toThrow(
				'Mod "hello": addAction needs input to be an object with an optional string placeholder',
			);
			expect(() => loose.addAction({ id: 'a', title: 'A', run() {}, input: {} })).not.toThrow();
		});

		it('an action that throws or rejects shows an error toast and a debug line, never error()', async () => {
			writeMod('hello', helloMod(), { name: 'Hello mod' });
			await startModsHost(VAULT);
			clickButton();

			await expect(pickerRow('boom').run('')).resolves.toBeUndefined();
			await expect(pickerRow('reject').run('')).resolves.toBeUndefined();

			expect(toast.error).toHaveBeenCalledWith('Hello mod: Explode failed: kaboom');
			expect(toast.error).toHaveBeenCalledWith('Hello mod: Reject failed: rejected');
			expect(debug).toHaveBeenCalledWith('MOD:hello', 'Explode failed:', expect.any(Error));
			expect(error).not.toHaveBeenCalled();
		});

		it("unloading the mod closes its open picker, and another mod's unload does not", async () => {
			writeMod('hello', helloMod());
			writeMod('alpha', recordingMod('alpha'));
			await startModsHost(VAULT);
			clickButton();

			disableMod('alpha');
			expect(modPickerStore.isOpen).toBe(true);

			disableMod('hello');
			expect(modPickerStore.isOpen).toBe(false);
			expect(railRegistryStore.actions).toEqual([]);
		});

		it('stopping the host closes an open picker', async () => {
			writeMod('hello', helloMod());
			await startModsHost(VAULT);
			clickButton();

			stopModsHost();

			expect(modPickerStore.isOpen).toBe(false);
		});

		it('a duplicate action id records a load error and leaves no button behind', async () => {
			writeMod(
				'dup',
				`export default {
	onload(ctx) {
		ctx.addRailButton({ id: 'main', title: 'Dup', icon: 'sparkles' });
		ctx.addAction({ id: 'x', title: 'X', run() {} });
		ctx.addAction({ id: 'x', title: 'X again', run() {} });
	},
};`,
			);

			await startModsHost(VAULT);

			const message = '_system/mods/dup: onload failed: Mod "dup": duplicate action id "x"';
			expect(modsStore.entries).toEqual([expect.objectContaining({ folder: 'dup', state: 'error', error: expect.objectContaining({ message }) })]);
			expect(toast.error).toHaveBeenCalledWith(message);
			expect(railRegistryStore.actions).toEqual([]);
		});

		it('a duplicate rail button id records a load error', async () => {
			writeMod(
				'dup',
				`export default {
	onload(ctx) {
		ctx.addRailButton({ id: 'main', title: 'Dup', icon: 'sparkles' });
		ctx.addRailButton({ id: 'main', title: 'Dup again', icon: 'sparkles' });
	},
};`,
			);

			await startModsHost(VAULT);

			expect(modsStore.entries[0].error?.message).toBe('_system/mods/dup: onload failed: Mod "dup": duplicate rail button id "main"');
			expect(railRegistryStore.actions).toEqual([]);
		});

		it('the disposers addAction and addRailButton return remove them before unload, once', async () => {
			writeMod('hello', helloMod());
			await startModsHost(VAULT);
			const ctx = globals.__modCtx.hello;

			const offButton = ctx.addRailButton({ id: 'extra', title: 'Extra', icon: 'sparkles' });
			expect(railRegistryStore.actions.map((a) => a.key)).toEqual(['mod:hello:main', 'mod:hello:extra']);
			offButton();
			offButton();
			expect(railRegistryStore.actions.map((a) => a.key)).toEqual(['mod:hello:main']);

			const offAction = ctx.addAction({ id: 'later', title: 'Later', run: () => {} });
			clickButton();
			expect(modPickerStore.actions.map((a) => a.id)).toContain('later');
			offAction();
			clickButton();
			expect(modPickerStore.actions.map((a) => a.id)).not.toContain('later');
			// A disposed id may be added again.
			expect(() => ctx.addAction({ id: 'later', title: 'Later', run: () => {} })).not.toThrow();
		});

		it('rejects a malformed action or button and every call after unload', async () => {
			writeMod('hello', helloMod());
			await startModsHost(VAULT);
			const ctx = globals.__modCtx.hello;
			const loose = ctx as unknown as { addAction: (a: unknown) => void; addRailButton: (b: unknown) => void };

			expect(() => loose.addAction({ id: '', title: 'T', run() {} })).toThrow('Mod "hello": addAction needs a non-empty string id');
			expect(() => loose.addAction({ id: 'a', title: 'T' })).toThrow('Mod "hello": addAction needs a run function');
			expect(() => loose.addAction(undefined)).toThrow('Mod "hello": addAction needs a non-empty string id');
			expect(() => loose.addRailButton({ id: 'b', title: 'B', icon: 5 })).toThrow('Mod "hello": addRailButton needs a string icon');
			expect(() => loose.addRailButton({ id: 'b', title: 'B', icon: 'x', actions: 'hello' })).toThrow(
				'Mod "hello": addRailButton needs actions to be a list of action ids',
			);

			stopModsHost();
			expect(() => ctx.addAction({ id: 'z', title: 'Z', run: () => {} })).toThrow('Mod "hello" is unloaded');
			expect(() => ctx.addRailButton({ id: 'z', title: 'Z', icon: 'x' })).toThrow('Mod "hello" is unloaded');
		});
	});

	describe('raw access: ctx.app and ctx.kb', () => {
		const NOTE = `${VAULT}/Projects/Rocket.md`;
		const OTHER = `${VAULT}/Inbox.md`;

		/** A property-index record: KBAPI builds its pages from these */
		function record(path: string) {
			const name = path.split('/').pop()!;
			return {
				path,
				name,
				basename: name.replace(/\.md$/, ''),
				folder: path.slice(0, path.lastIndexOf('/')),
				ext: 'md',
				mtime: 0,
				ctime: 0,
				size: 0,
				properties: new Map(),
			};
		}

		beforeEach(async () => {
			editorStore.reset();
			collectionStore.reset();
			invalidateVaultEntries();
			ipcEntries.value = [entryV2(NOTE, { tags: ['#project'] }), entryV2(OTHER)];
			collectionStore.setPropertyIndex(new Map([NOTE, OTHER].map((p) => [p, record(p)])));
			writeMod('alpha', recordingMod('alpha'));
			await startModsHost(VAULT);
		});

		afterEach(() => {
			editorStore.reset();
			collectionStore.reset();
		});

		it('ctx.app holds the live app objects themselves', () => {
			const { app } = globals.__modCtx.alpha;
			editorStore.addTab({ path: NOTE, name: 'Rocket.md', content: '# Rocket', savedContent: '# Rocket' });

			expect(app.editorStore).toBe(editorStore);
			expect(app.editorStore.activeTab).toMatchObject({ path: NOTE, content: '# Rocket' });
			expect(app.openFileInEditor).toBe(openFileInEditor);
			expect(app.openNoteAt).toBe(openNoteAt);
			expect(app.vaultStore).toBe(vaultStore);
		});

		it('ctx.kb() resolves to a KBAPI over the vault entries snapshot, tags included', async () => {
			editorStore.addTab({ path: NOTE, name: 'Rocket.md', content: '', savedContent: '' });

			const kb = await globals.__modCtx.alpha.kb();

			const projects = kb.pages().where((p) => p.file.tags.includes('#project'));
			expect(projects.map((p) => p.file.path).array()).toEqual([NOTE]);
			expect(kb.pages().length).toBe(2);
			expect(kb.current()?.file.path).toBe(NOTE);
			expect(kb.container.isConnected).toBe(false);
		});

		it('ctx.kb() with no open tab has no current page', async () => {
			const kb = await globals.__modCtx.alpha.kb();

			expect(kb.current()).toBeNull();
		});

		it('ctx.kb() propagates a failed snapshot read', async () => {
			vi.mocked(invoke).mockRejectedValueOnce(new Error('index unavailable'));

			await expect(globals.__modCtx.alpha.kb()).rejects.toThrow('index unavailable');
		});

		it('reading ctx.app or calling ctx.kb throws after stop', async () => {
			const ctx = globals.__modCtx.alpha;
			const kb = ctx.kb;

			stopModsHost();

			expect(() => ctx.app).toThrow('Mod "alpha" is unloaded');
			expect(() => ctx.kb).toThrow('Mod "alpha" is unloaded');
			await expect(kb()).rejects.toThrow('Mod "alpha" is unloaded');
		});

		it('reading ctx.app or calling ctx.kb throws after the open vault changed', () => {
			const ctx = globals.__modCtx.alpha;

			vaultStore.open('/vaults/other');

			expect(() => ctx.app).toThrow('Mod "alpha" is unloaded');
			expect(() => ctx.kb()).toThrow('Mod "alpha" is unloaded');
		});
	});
});
