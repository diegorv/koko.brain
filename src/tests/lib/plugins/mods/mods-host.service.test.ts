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
import { updateNoteFrontmatter } from '#lib/core/frontmatter/frontmatter-write.service.js';
import { invalidateVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import { createTypedNote } from '#lib/features/type-definitions/type-definitions.service.js';
import { createOneOnOneNote, openOneOnOnePicker } from '#lib/plugins/one-on-one/one-on-one.service.js';
import { dailyNotePath, openOrCreateDailyNote } from '#lib/plugins/periodic-notes/periodic-notes.service.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';
import { modCommandsStore } from '#lib/plugins/mods/mod-commands.store.svelte.js';
import { modDialogsStore } from '#lib/plugins/mods/mod-dialogs.store.svelte.js';
import { modPickerStore } from '#lib/plugins/mods/mod-picker.store.svelte.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import type { ModRunV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import { disableMod, enableMod, startModsHost, stopModsHost, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsRunsStore } from '#lib/plugins/mods/mods-runs.store.svelte.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vaults/main';

/** Shared with the mods' code, which runs through `new Function` and sees only globals */
interface TestGlobals {
	__modEvents: string[];
	__modCtx: Record<string, ModContext>;
	__modGate: Promise<void>;
	__modRun: ModRunV1;
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
		modsRunsStore.reset();
		modDialogsStore.reset();
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
		expect(debug).toHaveBeenCalledWith('MOD:alpha', 'onunload failed:', expect.stringContaining('unload exploded'));
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

	describe('action commands and labs placement', () => {
		it('lists every action and disposes the palette mark separately from the action', async () => {
			writeMod('hello', recordingMod('hello'));
			await startModsHost(VAULT);
			const ctx = globals.__modCtx.hello;
			const remove = ctx.addAction({ id: 'greet', title: 'Greet', run: () => {} });
			expect(ctx.app.modCommandsStore).toBe(modCommandsStore);
			expect(modCommandsStore.list).toMatchObject([{ id: 'mod:hello:action:greet', label: 'Mod hello: Greet', palette: false }]);
			expect(() => ctx.labs.place('missing', { palette: true })).toThrow('unknown action id');
			const unplace = ctx.labs.place('greet', { palette: true });
			expect(modCommandsStore.list[0].palette).toBe(true);
			unplace();
			unplace();
			expect(modCommandsStore.list[0].palette).toBe(false);
			remove();
			expect(modCommandsStore.list).toEqual([]);
			expect(() => ctx.labs.place('greet', { palette: true })).toThrow('unknown action id');
		});

		it('cleans commands on unload and failed onload, and leaves only one after reload', async () => {
			const source = `export default { onload(ctx) {
				globalThis.__modCtx.hello = ctx;
				ctx.addAction({ id: 'greet', title: 'Greet', run() {} });
				ctx.labs.place('greet', { palette: true });
			} };`;
			writeMod('hello', source);
			await startModsHost(VAULT);
			const stale = modCommandsStore.list[0];
			for (const listener of fileListeners) listener([`${VAULT}/_system/mods/hello/main.js`]);
			await vi.waitFor(() => expect(modCommandsStore.list[0]?.run).not.toBe(stale.run));
			expect(modCommandsStore.list).toHaveLength(1);
			expect(modCommandsStore.list[0].palette).toBe(true);
			expect(() => stale.run()).toThrow('unloaded');
			stopModsHost();
			expect(modCommandsStore.list).toEqual([]);
			expect(() => globals.__modCtx.hello.labs.place('greet', { palette: true })).toThrow('unloaded');
			writeMod('hello', source.replace("ctx.labs.place('greet', { palette: true });", "ctx.labs.place('greet', { palette: true }); throw new Error('bad load');"));
			await startModsHost(VAULT);
			expect(modsStore.entries[0].state).toBe('error');
			expect(modCommandsStore.list).toEqual([]);
		});
	});

	describe('menu placement', () => {
		it('validates untyped placement options before registering either surface', async () => {
			writeMod('hello', recordingMod('hello'));
			await startModsHost(VAULT);
			const ctx = globals.__modCtx.hello;
			ctx.addAction({ id: 'greet', title: 'Greet', run() {} });
			const loose = ctx.labs as unknown as { place: (id: string, options: unknown) => void };
			for (const options of [null, {}, { palette: false }, { menu: null }, { menu: {} }, { menu: { on: ['editor'] } }, { palette: true, menu: { on: ['note'], files: 'pdf' } }]) {
				expect(() => loose.place('greet', options)).toThrow('labs.place needs');
			}
			expect(railRegistryStore.menuItems).toEqual([]);
			expect(modCommandsStore.list[0].palette).toBe(false);
			ctx.labs.place('greet', { menu: { on: [] } });
			expect(railRegistryStore.menuItems[0].on).toEqual([]);
		});

		it('captures a menu target through input and leaves rail and command runs target-free', async () => {
			writeMod('hello', recordingMod('hello'));
			await startModsHost(VAULT);
			const ctx = globals.__modCtx.hello;
			const received: { input: string; run: ModRunV1 }[] = [];
			ctx.addAction({ id: 'greet', title: 'Greet', input: {}, run: (input, run) => { received.push({ input, run }); } });
			const on: ('note' | 'folder')[] = ['note'];
			ctx.labs.place('greet', { menu: { on } });
			on.push('folder');
			expect(railRegistryStore.menuItems[0].on).toEqual(['note']);
			const target = { on: 'note' as const, path: 'Work/alpha.md' };
			railRegistryStore.menuItems[0].run(target);
			target.path = 'other.md';
			expect(modPickerStore.inputAction?.id).toBe('greet');
			await modPickerStore.actions[0].run('hello');
			expect(received[0].input).toBe('hello');
			expect(received[0].run.target).toEqual({ on: 'note', path: 'Work/alpha.md' });
			modCommandsStore.list[0].run();
			await modPickerStore.actions[0].run('palette');
			ctx.addRailButton({ id: 'greet', title: 'Greet', icon: '' });
			railRegistryStore.actions[0].run();
			await modPickerStore.actions[0].run('rail');
			expect(received[1].run).not.toHaveProperty('target');
			expect(received[2].run).not.toHaveProperty('target');
		});

		it('shares the command busy key and reveals only on output or another invocation', async () => {
			writeMod('hello', recordingMod('hello'));
			await startModsHost(VAULT);
			const ctx = globals.__modCtx.hello;
			let release!: () => void;
			const gate = new Promise<void>((resolve) => { release = resolve; });
			onTestFinished(release);
			const received: ModRunV1[] = [];
			ctx.addAction({ id: 'greet', title: 'Greet', run: (_input, run) => { received.push(run); return gate; } });
			ctx.labs.place('greet', { menu: { on: ['folder'] } });
			railRegistryStore.menuItems[0].run({ on: 'folder', path: '' });
			expect(received[0].target).toEqual({ on: 'folder', path: '' });
			expect(modPickerStore.isOpen).toBe(false);
			expect(modsRunsStore.isBusy('mod:hello:action:greet')).toBe(true);
			modCommandsStore.list[0].run();
			expect(received).toHaveLength(1);
			expect(modPickerStore.isOpen).toBe(true);
			release();
			await vi.waitFor(() => expect(modsRunsStore.isBusy('mod:hello:action:greet')).toBe(false));
		});

		it('keeps one menu item after reload and none after unload or failed onload', async () => {
			const source = `export default { onload(ctx) {
				ctx.addAction({ id: 'greet', title: 'Greet', run() {} });
				ctx.labs.place('greet', { menu: { on: ['note', 'folder'] } });
			} };`;
			writeMod('hello', source);
			await startModsHost(VAULT);
			const stale = railRegistryStore.menuItems[0];
			for (const listener of fileListeners) listener([`${VAULT}/_system/mods/hello/main.js`]);
			await vi.waitFor(() => expect(railRegistryStore.menuItems[0]?.run).not.toBe(stale.run));
			expect(railRegistryStore.menuItems).toHaveLength(1);
			expect(() => stale.run({ on: 'note', path: 'old.md' })).toThrow('unloaded');
			stopModsHost();
			expect(railRegistryStore.menuItems).toEqual([]);
			writeMod('hello', source.replace("} };", "throw new Error('bad load'); } };"));
			await startModsHost(VAULT);
			expect(modsStore.entries[0].state).toBe('error');
			expect(railRegistryStore.menuItems).toEqual([]);
		});

		it('places an action on both surfaces, passes its target and disposes both placements', async () => {
			writeMod('hello', recordingMod('hello'));
			await startModsHost(VAULT);
			const ctx = globals.__modCtx.hello;
			const received: ModRunV1[] = [];
			const remove = ctx.addAction({ id: 'greet', title: 'Greet', run: (_input, run) => { received.push(run); } });
			expect(() => ctx.labs.place('missing', { menu: { on: ['note'] } })).toThrow('unknown action id');
			const off = ctx.labs.place('greet', { palette: true, menu: { on: ['note', 'folder'] } });
			expect(railRegistryStore.menuItems).toMatchObject([{ id: 'mod:hello:action:greet', label: 'Mod hello: Greet', on: ['note', 'folder'], files: 'markdown' }]);
			expect(modCommandsStore.list[0].palette).toBe(true);
			railRegistryStore.menuItems[0].run({ on: 'note', path: 'Work/alpha.md' });
			await vi.waitFor(() => expect(modsRunsStore.runFor('mod:hello:action:greet')?.status).toBe('done'));
			expect(received[0].target).toEqual({ on: 'note', path: 'Work/alpha.md' });
			expect(modPickerStore.isOpen).toBe(false);
			off();
			off();
			expect(railRegistryStore.menuItems).toEqual([]);
			expect(modCommandsStore.list[0].palette).toBe(false);
			ctx.labs.place('greet', { menu: { on: ['folder'], files: 'all' } });
			remove();
			expect(railRegistryStore.menuItems).toEqual([]);
			expect(modCommandsStore.list).toEqual([]);
		});
	});

	describe('lazy non-rail run view', () => {
		async function prepare(input = false) {
			let release!: () => void;
			globals.__modGate = new Promise<void>((resolve) => { release = resolve; });
			onTestFinished(release);
			writeMod('hello', `export default { onload(ctx) {
				ctx.addAction({ id: 'greet', title: 'Greet', ${input ? "input: { placeholder: 'Your name' }," : ''}
					async run(input, run) {
						globalThis.__modEvents.push('run:' + input);
						globalThis.__modRun = run;
						await globalThis.__modGate;
					}
				});
			} };`);
			await startModsHost(VAULT);
			return { command: modCommandsStore.list[0], release };
		}

		it.each(['log', 'progress'] as const)('reveals at first %s only, leaving Close closed on later output', async (output) => {
			const { command, release } = await prepare();
			command.run();
			expect(modPickerStore.runKey).toBeNull();
			expect(modPickerStore.isOpen).toBe(false);
			expect(modsRunsStore.isBusy(command.id)).toBe(true);
			if (output === 'log') globals.__modRun.log('first');
			else globals.__modRun.progress(1, 2, 'first');
			expect(modPickerStore.runKey).toBe(command.id);
			modPickerStore.close();
			globals.__modRun.log('second');
			globals.__modRun.progress(2, 2);
			expect(modPickerStore.isOpen).toBe(false);
			expect(modsRunsStore.runFor(command.id)?.lines).toContain('second');
			release();
			await vi.waitFor(() => expect(modsRunsStore.runFor(command.id)?.status).toBe('done'));
		});

		it('reveals a quiet busy run on second invoke without starting another run', async () => {
			const { command } = await prepare();
			command.run();
			command.run();
			expect(modPickerStore.runKey).toBe(command.id);
			expect(globals.__modEvents).toEqual(['run:']);
			modPickerStore.close();
			globals.__modRun.log('later');
			expect(modPickerStore.isOpen).toBe(false);
		});

		it('does not reopen for output after a quiet run has been stopped', async () => {
			const { command } = await prepare();
			command.run();
			modsRunsStore.runFor(command.id)!.stop();
			globals.__modRun.log('late');
			globals.__modRun.progress(1, 1);
			expect(modPickerStore.isOpen).toBe(false);
			expect(modsRunsStore.runFor(command.id)?.status).toBe('cancelled');
		});

		it('first output replaces another open input picker', async () => {
			const { command } = await prepare();
			command.run();
			const other = { id: 'other', title: 'Other', input: {}, run: async () => {} };
			modPickerStore.open('other', 'Other mod', [other]);
			modPickerStore.askInput(other);
			globals.__modRun.log('delayed');
			expect(modPickerStore.modId).toBe('hello');
			expect(modPickerStore.runKey).toBe(command.id);
			expect(modPickerStore.inputAction).toBeNull();
		});

		it('quiet runs hold reload pending until they end, and a second invoke reveals them', async () => {
			const { command, release } = await prepare();
			command.run();
			for (const listener of fileListeners) listener([`${VAULT}/_system/mods/hello/main.js`]);
			await vi.waitFor(() => expect(modsRunsStore.isReloadPending('hello')).toBe(true));
			expect(modPickerStore.isOpen).toBe(false);
			command.run();
			expect(modPickerStore.runKey).toBe(command.id);
			expect(modsRunsStore.isReloadPending('hello')).toBe(true);
			release();
			await vi.waitFor(() => expect(modCommandsStore.list[0]?.run).not.toBe(command.run));
			expect(modCommandsStore.list).toHaveLength(1);
			expect(modsRunsStore.isReloadPending('hello')).toBe(false);
		});

		it('asks for input and shows the run immediately on submission', async () => {
			const { command, release } = await prepare(true);
			command.run();
			expect(modPickerStore.inputAction?.id).toBe('greet');
			expect(modPickerStore.runKey).toBeNull();
			const running = modPickerStore.inputAction!.run('Ada');
			expect(modPickerStore.runKey).toBe(command.id);
			expect(globals.__modEvents).toEqual(['run:Ada']);
			release();
			await running;
		});
	});

	describe('one live run per action', () => {
		const key = (id: string) => `mod:one:action:${id}`;
		const rail = (id: string) => railRegistryStore.actions.find((a) => a.key === `mod:one:${id}`)!;
		const command = (id: string) => modCommandsStore.list.find((c) => c.id === key(id))!;
		const menu = () => railRegistryStore.menuItems.find((m) => m.id === key('tag'))!;
		const pickerRow = (id: string) => modPickerStore.actions.find((a) => a.id === id)!;
		/** Runs of `id` the mod's code started, as `<id>:<input>` */
		const bodies = (id: string) => globals.__modEvents.filter((e) => e.startsWith(`${id}:`));
		const noToast = () => {
			for (const kind of ['info', 'success', 'warning', 'error'] as const) expect(toast[kind]).not.toHaveBeenCalled();
		};
		let release: () => void;

		beforeEach(async () => {
			globals.__modGate = new Promise<void>((resolve) => { release = resolve; });
			onTestFinished(() => release());
			writeMod('one', `export default { onload(ctx) {
				globalThis.__modCtx.one = ctx;
				const hold = (id) => async (input, run) => {
					globalThis.__modEvents.push(id + ':' + input);
					globalThis.__modRun = run;
					await globalThis.__modGate;
				};
				ctx.addAction({ id: 'tag', title: 'Bulk tag', run: hold('tag') });
				ctx.addAction({ id: 'review', title: 'Weekly review', run: hold('review') });
				ctx.addAction({ id: 'ask', title: 'Ask', input: { placeholder: 'Text' }, run: hold('ask') });
				ctx.addAction({ id: 'boom', title: 'Boom', run: () => { globalThis.__modEvents.push('boom:'); throw new Error('kaboom'); } });
				ctx.labs.place('tag', { palette: true, menu: { on: ['note', 'folder'] } });
				ctx.addRailButton({ id: 'tag', title: 'Tag', icon: '', actions: ['tag'] });
				ctx.addRailButton({ id: 'tag-too', title: 'Tag too', icon: '', actions: ['tag'] });
				ctx.addRailButton({ id: 'pair', title: 'Pair', icon: '', actions: ['tag', 'review'] });
				ctx.addRailButton({ id: 'all', title: 'All', icon: '' });
				ctx.addRailButton({ id: 'ask', title: 'Ask', icon: '', actions: ['ask'] });
			} };`);
			await startModsHost(VAULT);
		});

		const others = {
			palette: () => command('tag').run(),
			'note-menu': () => menu().run({ on: 'note', path: 'Work/a.md' }),
			'folder-menu': () => menu().run({ on: 'folder', path: 'Work' }),
		};

		it.each(Object.keys(others) as (keyof typeof others)[])('rail first, then %s reveals the rail run and starts nothing', (origin) => {
			rail('tag').run();
			expect(modPickerStore.runKey).toBe(key('tag'));
			modPickerStore.close();

			others[origin]();

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.runKey).toBe(key('tag'));
			expect(bodies('tag')).toEqual(['tag:']);
			expect(modsRunsStore.runs.map((r) => [r.runKey, r.status])).toEqual([[key('tag'), 'running']]);
			noToast();
		});

		it.each(Object.keys(others) as (keyof typeof others)[])('a quiet %s run started again from the rail opens its view', (origin) => {
			others[origin]();
			expect(modPickerStore.isOpen).toBe(false);
			expect(modsRunsStore.isBusy(key('tag'))).toBe(true);

			rail('tag').run();

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.runKey).toBe(key('tag'));
			expect(bodies('tag')).toEqual(['tag:']);
			expect(modsRunsStore.runs).toHaveLength(1);
			noToast();
		});

		it('two rail buttons listing one action share its run, and both show busy', () => {
			rail('tag').run();
			const first = modsRunsStore.runFor(key('tag'))!.id;
			modPickerStore.close();

			rail('tag-too').run();

			expect(modPickerStore.runKey).toBe(key('tag'));
			expect(modsRunsStore.runFor(key('tag'))!.id).toBe(first);
			expect(bodies('tag')).toEqual(['tag:']);
			expect(rail('tag').busy?.()).toBe(true);
			expect(rail('tag-too').busy?.()).toBe(true);
			noToast();
		});

		it('a rail button id shaped like an action key does not hold that action', () => {
			globals.__modCtx.one.addRailButton({ id: 'action:review', title: 'Odd', icon: '', actions: ['tag'] });
			rail('action:review').run();

			command('review').run();

			expect(bodies('review')).toEqual(['review:']);
			expect(modsRunsStore.isBusy(key('review'))).toBe(true);
		});

		it('a menu run on another target still reveals the live run', () => {
			menu().run({ on: 'note', path: 'Work/a.md' });

			menu().run({ on: 'folder', path: 'Other' });

			expect(globals.__modRun.target).toEqual({ on: 'note', path: 'Work/a.md' });
			expect(bodies('tag')).toEqual(['tag:']);
			expect(modPickerStore.runKey).toBe(key('tag'));
		});

		it('a live action with input opens its run view instead of the text prompt', async () => {
			rail('ask').run();
			expect(modPickerStore.inputAction?.id).toBe('ask');
			void modPickerStore.inputAction!.run('first');
			modPickerStore.close();

			rail('ask').run();

			expect(modPickerStore.inputAction).toBeNull();
			expect(modPickerStore.runKey).toBe(key('ask'));
			modPickerStore.close();
			command('ask').run();
			expect(modPickerStore.inputAction).toBeNull();
			expect(modPickerStore.runKey).toBe(key('ask'));
			expect(bodies('ask')).toEqual(['ask:first']);
		});

		it('submitting input after the action started elsewhere reveals that run', async () => {
			command('ask').run();
			const prompt = modPickerStore.inputAction!;
			expect(prompt.id).toBe('ask');
			rail('ask').run();
			void modPickerStore.inputAction!.run('rail');
			modPickerStore.close();

			await prompt.run('palette');

			expect(bodies('ask')).toEqual(['ask:rail']);
			expect(modPickerStore.runKey).toBe(key('ask'));
			expect(modsRunsStore.runs).toHaveLength(1);
			noToast();
		});

		it('different actions of a mod run side by side, from one button or from two', () => {
			rail('pair').run();
			void pickerRow('tag').run('');
			modPickerStore.close();
			rail('pair').run();
			void pickerRow('review').run('');

			expect(bodies('tag')).toEqual(['tag:']);
			expect(bodies('review')).toEqual(['review:']);
			expect(modsRunsStore.runs.map((r) => [r.runKey, r.status])).toEqual([[key('tag'), 'running'], [key('review'), 'running']]);
			expect(rail('ask').busy?.()).toBe(false);

			rail('ask').run();
			void modPickerStore.inputAction!.run('x');
			expect(modsRunsStore.runs).toHaveLength(3);
		});

		it('a busy button with several actions opens its picker: a live row reveals, an idle row starts', () => {
			command('tag').run();
			expect(rail('pair').busy?.()).toBe(true);
			expect(rail('all').busy?.()).toBe(true);
			expect(rail('ask').busy?.()).toBe(false);

			rail('pair').run();

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.runKey).toBeNull();
			expect(modPickerStore.actions.map((a) => [a.id, a.busy?.()])).toEqual([['tag', true], ['review', false]]);
			void pickerRow('tag').run('');
			expect(modPickerStore.runKey).toBe(key('tag'));
			expect(bodies('tag')).toEqual(['tag:']);

			rail('pair').run();
			void pickerRow('review').run('');
			expect(modPickerStore.runKey).toBe(key('review'));
			expect(bodies('review')).toEqual(['review:']);
		});

		it.each(['done', 'cancelled'] as const)('once a run ends %s, the action starts again at once', async (ending) => {
			rail('tag').run();
			const first = modsRunsStore.runFor(key('tag'))!.id;
			if (ending === 'cancelled') modsRunsStore.runFor(key('tag'))!.stop();
			else {
				release();
				await vi.waitFor(() => expect(modsRunsStore.isBusy(key('tag'))).toBe(false));
			}
			expect(rail('tag').busy?.()).toBe(false);

			command('tag').run();

			expect(bodies('tag')).toEqual(['tag:', 'tag:']);
			expect(modsRunsStore.runFor(key('tag'))).toMatchObject({ status: 'running' });
			expect(modsRunsStore.runFor(key('tag'))!.id).not.toBe(first);
		});

		it('once a run fails, the action starts again at once', async () => {
			command('boom').run();
			await vi.waitFor(() => expect(modsRunsStore.runFor(key('boom'))?.status).toBe('failed'));

			command('boom').run();

			await vi.waitFor(() => expect(bodies('boom')).toEqual(['boom:', 'boom:']));
			expect(toast.error).toHaveBeenCalledTimes(2);
		});
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

		it('a changed manifest.json gives the button its new color, and a broken color leaves the mod in error with no button', async () => {
			const color = () => railRegistryStore.actions[0]?.color;
			writeMod('hello', buttonMod('hello', 'Hello'), { color: { light: '#111111', dark: '#222222' } });
			await startModsHost(VAULT);
			expect(color()).toEqual({ light: '#111111', dark: '#222222' });

			writeMod('hello', buttonMod('hello', 'Hello'), { color: { light: '#333333', dark: '#444444' } });
			emit([`${MODS}/hello/manifest.json`]);
			await vi.waitFor(() => expect(color()).toEqual({ light: '#333333', dark: '#444444' }));

			writeMod('hello', buttonMod('hello', 'Hello'), { color: { light: 'red', dark: '#444444' } });
			emit([`${MODS}/hello/manifest.json`]);
			await vi.waitFor(() => expect(states()).toEqual([['hello', 'error']]));
			expect(modsStore.entries[0].error?.message).toBe('_system/mods/hello: manifest.json color.light must be a hex color like #d946ef');
			expect(railRegistryStore.actions).toEqual([]);
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

		/** Starts the host with the hello mod, adds a second button, and returns the color of each. */
		async function buttonColors(): Promise<unknown[][]> {
			await startModsHost(VAULT);
			globals.__modCtx.hello.addRailButton({ id: 'extra', title: 'Extra', icon: 'sparkles' });
			return railRegistryStore.actions.map((a) => [a.key, a.color]);
		}

		it('every rail button of a mod carries the color of its manifest', async () => {
			const color = { light: '#7c3aed', dark: '#c4b5fd' };
			writeMod('hello', helloMod(), { color });

			expect(await buttonColors()).toEqual([['mod:hello:main', color], ['mod:hello:extra', color]]);
		});

		it('a mod with no color in its manifest has buttons with no color', async () => {
			writeMod('hello', helloMod());

			expect(await buttonColors()).toEqual([['mod:hello:main', undefined], ['mod:hello:extra', undefined]]);
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

		it('a button with a single action runs it at once, without the action list', async () => {
			// 'missing' is skipped, so the button resolves to one action.
			writeMod('hello', helloMod("{ id: 'main', title: 'Hello mod', icon: 'sparkles', actions: ['missing', 'hello'] }"));
			await startModsHost(VAULT);

			clickButton();

			// Straight to the run view: the list is never shown.
			expect(modPickerStore.runKey).toBe('mod:hello:action:hello');
			expect(modPickerStore.actions).toEqual([]);
			await vi.waitFor(() => expect(globals.__modEvents).toEqual(['hello:run']));
			await vi.waitFor(() => expect(modsRunsStore.runFor('mod:hello:action:hello')?.status).toBe('done'));
		});

		it('a click on a busy single-action button reopens its run view instead of starting a second run', async () => {
			let release!: () => void;
			globals.__modGate = new Promise<void>((resolve) => {
				release = resolve;
			});
			writeMod(
				'gated',
				`export default {
	onload(ctx) {
		ctx.addAction({ id: 'wait', title: 'Wait', run: async () => { globalThis.__modEvents.push('wait:run'); await globalThis.__modGate; } });
		ctx.addRailButton({ id: 'main', title: 'Gated', icon: 'sparkles' });
	},
};`,
			);
			await startModsHost(VAULT);

			clickButton('mod:gated:main');
			const first = modsRunsStore.runFor('mod:gated:action:wait')!.id;
			modPickerStore.close();
			clickButton('mod:gated:main');

			expect(modPickerStore.runKey).toBe('mod:gated:action:wait');
			expect(modsRunsStore.runFor('mod:gated:action:wait')!.id).toBe(first);
			expect(globals.__modEvents).toEqual(['wait:run']);
			release();
		});

		it('a button with a single action that asks for input opens straight on its text field', async () => {
			writeMod(
				'ideas',
				`export default {
	onload(ctx) {
		ctx.addAction({ id: 'idea', title: 'New idea note', input: { placeholder: 'Describe the idea' }, run: (text) => { globalThis.__modEvents.push('idea:' + text); } });
		ctx.addAction({ id: 'plain', title: 'Plain', run: () => { globalThis.__modEvents.push('plain'); } });
		ctx.addRailButton({ id: 'main', title: 'Ideas', icon: 'sparkles', actions: ['idea'] });
	},
};`,
			);
			await startModsHost(VAULT);

			clickButton('mod:ideas:main');

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.inputAction?.id).toBe('idea');
			expect(modPickerStore.inputAction?.input).toEqual({ placeholder: 'Describe the idea' });
			expect(globals.__modEvents).toEqual([]);

			await modPickerStore.inputAction!.run('A flying car');
			expect(globals.__modEvents).toEqual(['idea:A flying car']);
		});

		it('a button with no action still opens the (empty) picker', async () => {
			writeMod('hello', helloMod("{ id: 'main', title: 'Hello mod', icon: 'sparkles', actions: ['missing'] }"));
			await startModsHost(VAULT);

			clickButton();

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.actions).toEqual([]);
			expect(modPickerStore.runKey).toBeNull();
			expect(globals.__modEvents).toEqual([]);
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
			// A string, not the Error: the log file JSON-stringifies other arguments, and an Error becomes `{}`.
			expect(debug).toHaveBeenCalledWith('MOD:hello', 'Explode failed:', expect.stringContaining('kaboom'));
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
			expect(app.createTypedNote).toBe(createTypedNote);
			expect(app.createOneOnOneNote).toBe(createOneOnOneNote);
			expect(app.openOneOnOnePicker).toBe(openOneOnOnePicker);
			expect(app.dailyNotePath).toBe(dailyNotePath);
			expect(app.openOrCreateDailyNote).toBe(openOrCreateDailyNote);
			expect(app.updateNoteFrontmatter).toBe(updateNoteFrontmatter);
			expect(app.typeDefinitionsStore).toBe(typeDefinitionsStore);
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

	describe('long runs', () => {
		const MODS = `${VAULT}/_system/mods`;
		const BUTTON = 'mod:runner:main';
		const KEY = 'mod:runner:action:slow';

		/**
		 * A mod whose Slow job logs, sets progress, waits on `__modGate`, and
		 * throws when its run was aborted meanwhile. `version` marks its load.
		 */
		function runnerMod(version: string, afterGate = ''): string {
			return `export default {
	onload(ctx) {
		globalThis.__modCtx.runner = ctx;
		globalThis.__modEvents.push('runner:load:${version}');
		ctx.addAction({ id: 'slow', title: 'Slow job', run: async (input, run) => {
			globalThis.__modRun = run;
			run.log('started');
			run.progress(1, 2, 'Halfway');
			await globalThis.__modGate;
			${afterGate}
			if (run.signal.aborted) throw new Error('stopped');
			run.log('finished');
		} });
		// A second action keeps the button on its picker list (a single-action button runs it at once).
		ctx.addAction({ id: 'noop', title: 'Noop', run: () => {} });
		ctx.addRailButton({ id: 'main', title: 'Runner', icon: 'sparkles' });
	},
	onunload() { globalThis.__modEvents.push('runner:unload'); },
};`;
		}

		let release: () => void;
		const button = () => railRegistryStore.actions.find((a) => a.key === BUTTON)!;
		const run = () => modsRunsStore.runFor(KEY);
		const loads = () => globals.__modEvents.filter((e) => e.startsWith('runner:'));

		/** Clicks the button, picks Slow job, and returns the promise of its run */
		function startSlowJob(): Promise<void> {
			button().run();
			return modPickerStore.actions.find((a) => a.id === 'slow')!.run('');
		}

		function emit(paths: string[]): void {
			for (const listener of fileListeners) listener(paths);
		}

		beforeEach(async () => {
			fileListeners.clear();
			globals.__modGate = new Promise<void>((resolve) => {
				release = resolve;
			});
			writeMod('runner', runnerMod('v1'), { name: 'Runner' });
			await startModsHost(VAULT);
		});

		afterEach(() => {
			release();
		});

		it('picking an action shows its run view, its log and progress, and marks the button busy until it ends', async () => {
			const running = startSlowJob();

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.runKey).toBe(KEY);
			expect(run()).toMatchObject({ modId: 'runner', title: 'Slow job', status: 'running', lines: ['started'] });
			expect(run()?.progress).toEqual({ done: 1, total: 2, label: 'Halfway' });
			expect(button().busy?.()).toBe(true);

			release();
			await running;

			expect(run()).toMatchObject({ status: 'done', lines: ['started', 'finished'] });
			expect(button().busy?.()).toBe(false);
			expect(globals.__modRun.signal.aborted).toBe(false);
		});

		it('a click on the busy button opens its picker, and picking the live action reopens its run view', () => {
			void startSlowJob();
			const first = run()!.id;
			modPickerStore.close();

			button().run();

			expect(modPickerStore.isOpen).toBe(true);
			expect(modPickerStore.runKey).toBeNull();
			expect(modPickerStore.actions.map((a) => a.id)).toEqual(['slow', 'noop']);
			void modPickerStore.actions.find((a) => a.id === 'slow')!.run('');
			expect(modPickerStore.runKey).toBe(KEY);
			expect(run()!.id).toBe(first);
		});

		it('after the run ends, a click opens the picker again', async () => {
			const running = startSlowJob();
			release();
			await running;
			modPickerStore.close();

			button().run();

			expect(modPickerStore.runKey).toBeNull();
			expect(modPickerStore.actions.map((a) => a.id)).toEqual(['slow', 'noop']);
		});

		it('Stop aborts run.signal and ends the run cancelled; the rejection that follows is not a failure', async () => {
			const running = startSlowJob();

			run()!.stop();

			expect(globals.__modRun.signal.aborted).toBe(true);
			expect(run()?.status).toBe('cancelled');
			expect(button().busy?.()).toBe(false);
			release();
			await running;
			expect(run()?.status).toBe('cancelled');
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('a failed run ends failed with its message and stack, and shows the error toast', async () => {
			writeMod(
				'runner',
				`export default {
	onload(ctx) {
		ctx.addAction({ id: 'slow', title: 'Slow job', run: async () => { throw new Error('kaboom'); } });
		ctx.addAction({ id: 'noop', title: 'Noop', run: () => {} });
		ctx.addRailButton({ id: 'main', title: 'Runner', icon: 'sparkles' });
	},
};`,
				{ name: 'Runner' },
			);
			await startModsHost(VAULT);

			await startSlowJob();

			expect(run()).toMatchObject({ status: 'failed', error: { message: 'kaboom' } });
			expect(run()?.error?.stack).toContain('kaboom');
			expect(toast.error).toHaveBeenCalledWith('Runner: Slow job failed: kaboom');
		});

		it('rejects a malformed progress call', async () => {
			void startSlowJob();
			const loose = globals.__modRun as unknown as { progress: (...args: unknown[]) => void };

			expect(() => loose.progress('1', 2)).toThrow('Mod "runner": run.progress needs numbers done and total');
			expect(() => loose.progress(1, 2, 3)).toThrow('Mod "runner": run.progress needs a string label');
		});

		it('a reload during a live run does not abort it; the mod reloads once with the newest code after the run ends', async () => {
			const running = startSlowJob();

			writeMod('runner', runnerMod('v2'), { name: 'Runner' });
			emit([`${MODS}/runner/main.js`]);
			await vi.waitFor(() => expect(modsRunsStore.isReloadPending('runner')).toBe(true));
			writeMod('runner', runnerMod('v3'), { name: 'Runner' });
			emit([`${MODS}/runner/main.js`]);
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(globals.__modRun.signal.aborted).toBe(false);
			expect(loads()).toEqual(['runner:load:v1']);
			expect(run()?.status).toBe('running');

			release();
			await running;

			await vi.waitFor(() => expect(loads()).toEqual(['runner:load:v1', 'runner:unload', 'runner:load:v3']));
			expect(run()?.status).toBe('done');
			expect(modsRunsStore.isReloadPending('runner')).toBe(false);
			// The run view stays open on the ended run across the reload.
			expect(modPickerStore.runKey).toBe(KEY);
		});

		it('a reload that waits goes on after Stop', async () => {
			void startSlowJob();
			writeMod('runner', runnerMod('v2'), { name: 'Runner' });
			emit([`${MODS}/runner/main.js`]);
			await vi.waitFor(() => expect(modsRunsStore.isReloadPending('runner')).toBe(true));

			run()!.stop();

			await vi.waitFor(() => expect(loads()).toEqual(['runner:load:v1', 'runner:unload', 'runner:load:v2']));
			expect(modsRunsStore.isReloadPending('runner')).toBe(false);
		});

		it('deleting the mod during a run aborts it at once', async () => {
			void startSlowJob();

			for (const key of [...fsFiles.keys()]) if (key.startsWith(`${MODS}/runner/`)) fsFiles.delete(key);
			emit([`${MODS}/runner`]);

			await vi.waitFor(() => expect(globals.__modRun.signal.aborted).toBe(true));
			expect(run()?.status).toBe('cancelled');
			expect(modsStore.entries).toEqual([]);
		});

		it('turning mods off (stopModsHost, as the Labs toggle does) aborts the run and closes its view', () => {
			void startSlowJob();

			stopModsHost();

			expect(globals.__modRun.signal.aborted).toBe(true);
			expect(run()?.status).toBe('cancelled');
			expect(modPickerStore.isOpen).toBe(false);
		});

		it('switching the mod off aborts its run and keeps the view on Cancelled', () => {
			void startSlowJob();

			modsEnabledStore.setModEnabled('runner', false);
			disableMod('runner');

			expect(globals.__modRun.signal.aborted).toBe(true);
			expect(run()?.status).toBe('cancelled');
			expect(modPickerStore.runKey).toBe(KEY);
		});

		it('after the vault closes, ctx.vault.create from a running action throws and writes nothing', async () => {
			writeMod(
				'runner',
				runnerMod(
					'v1',
					`try { await ctx.vault.create('Late.md', 'late'); globalThis.__modEvents.push('create:ok'); }
			catch (err) { globalThis.__modEvents.push('create:' + err.message); }`,
				),
				{ name: 'Runner' },
			);
			await startModsHost(VAULT);
			const running = startSlowJob();

			stopModsHost();
			vaultStore.close();
			release();
			await running;

			expect(globals.__modEvents).toContain('create:Mod "runner" is unloaded');
			expect(invoke).not.toHaveBeenCalledWith('create_note', expect.anything());
			expect(fsFiles.has(`${VAULT}/Late.md`)).toBe(false);
		});
	});

	describe('run.ui', () => {
		const MODS = `${VAULT}/_system/mods`;
		const KEY = 'mod:asker:action:ask';

		/**
		 * A mod whose Ask action opens a `run.ui` prompt and a `ctx.ui` confirm,
		 * records how each settles in `__modEvents`, and rethrows the prompt's
		 * rejection. `version` marks its load.
		 */
		function askerMod(version: string): string {
			return `export default {
	onload(ctx) {
		globalThis.__modCtx.asker = ctx;
		globalThis.__modEvents.push('asker:load:${version}');
		ctx.addAction({ id: 'ask', title: 'Ask', run: async (input, run) => {
			globalThis.__modRun = run;
			ctx.ui.confirm({ title: 'Mod scoped' }).then((value) => globalThis.__modEvents.push('ctx-ui:' + value));
			try {
				const name = await run.ui.prompt({ title: 'Name' });
				globalThis.__modEvents.push('answered:' + name);
			} catch (err) {
				globalThis.__modEvents.push('run-ui:' + err.name);
				throw err;
			}
		} });
		ctx.addRailButton({ id: 'main', title: 'Asker', icon: 'sparkles', actions: ['ask'] });
	},
};`;
		}

		const run = () => modsRunsStore.runFor(KEY);
		const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

		function startAsk(): void {
			railRegistryStore.actions.find((a) => a.key === 'mod:asker:main')!.run();
		}

		beforeEach(async () => {
			fileListeners.clear();
			writeMod('asker', askerMod('v1'), { name: 'Asker' });
			await startModsHost(VAULT);
		});

		it("stamps the run's dialogs with its id and leaves ctx.ui dialogs without one", () => {
			startAsk();

			expect(modDialogsStore.dialogs).toHaveLength(2);
			expect(modDialogsStore.dialogs[0]).not.toHaveProperty('runId');
			expect(modDialogsStore.dialogs[1]).toMatchObject({ kind: 'prompt', title: 'Name', runId: run()!.id });
		});

		it('Stop rejects the open prompt with an AbortError and ends the run Cancelled, never Failed, with no error toast', async () => {
			startAsk();

			run()!.stop();
			await tick();

			expect(globals.__modEvents).toContain('run-ui:AbortError');
			expect(globals.__modEvents.some((e) => e.startsWith('answered:'))).toBe(false);
			expect(run()).toMatchObject({ status: 'cancelled' });
			expect(run()?.error).toBeNull();
			expect(toast.error).not.toHaveBeenCalled();
			// The mod's ctx.ui dialog is not the run's: Stop leaves it open.
			expect(modDialogsStore.dialogs).toMatchObject([{ kind: 'confirm', title: 'Mod scoped' }]);
			expect(globals.__modEvents.some((e) => e.startsWith('ctx-ui:'))).toBe(false);
		});

		it('an action whose own code rejects with an AbortError after Stop ends Cancelled with no toast', async () => {
			writeMod('asker', `export default {
	onload(ctx) {
		ctx.addAction({ id: 'ask', title: 'Ask', run: async (input, run) => {
			await new Promise((resolve) => run.signal.addEventListener('abort', resolve));
			throw new DOMException('stopped', 'AbortError');
		} });
		ctx.addRailButton({ id: 'main', title: 'Asker', icon: 'sparkles', actions: ['ask'] });
	},
};`, { name: 'Asker' });
			await startModsHost(VAULT);
			startAsk();

			run()!.stop();
			await tick();

			expect(run()).toMatchObject({ status: 'cancelled' });
			expect(toast.error).not.toHaveBeenCalled();
		});

		it("unload rejects the run's dialogs with an AbortError and resolves its ctx.ui dialogs as cancelled", async () => {
			startAsk();

			disableMod('asker');
			await tick();

			expect(globals.__modEvents).toContain('run-ui:AbortError');
			expect(globals.__modEvents).toContain('ctx-ui:false');
			expect(run()?.status).toBe('cancelled');
			expect(modDialogsStore.dialogs).toEqual([]);
			expect(toast.error).not.toHaveBeenCalled();
		});

		it('turning mods off rejects the run dialogs too', async () => {
			startAsk();

			stopModsHost();
			await tick();

			expect(globals.__modEvents).toContain('run-ui:AbortError');
			expect(globals.__modEvents).toContain('ctx-ui:false');
			expect(modDialogsStore.dialogs).toEqual([]);
		});

		it('a reload waiting on a run goes on after Stop closes its dialog', async () => {
			startAsk();
			writeMod('asker', askerMod('v2'), { name: 'Asker' });
			for (const listener of fileListeners) listener([`${MODS}/asker/main.js`]);
			await vi.waitFor(() => expect(modsRunsStore.isReloadPending('asker')).toBe(true));

			run()!.stop();

			await vi.waitFor(() => expect(globals.__modEvents.filter((e) => e.startsWith('asker:load:'))).toEqual(['asker:load:v1', 'asker:load:v2']));
			expect(globals.__modEvents).toContain('run-ui:AbortError');
			expect(modsRunsStore.isReloadPending('asker')).toBe(false);
			expect(modDialogsStore.dialogs).toEqual([]);
		});
	});

	describe('ctx.ui', () => {
		beforeEach(async () => {
			writeMod('alpha', recordingMod('alpha'), { name: 'Alpha' });
			writeMod('beta', recordingMod('beta'), { name: 'Beta' });
			await startModsHost(VAULT);
		});

		it('pick rejects duplicate ids without disturbing the existing dialog queue', async () => {
			void globals.__modCtx.beta.ui.alert({ title: 'Keep me' });
			await expect(globals.__modCtx.alpha.ui.pick({ title: 'Choose', items: [
				{ id: 'same', title: 'First' }, { id: 'same', title: 'Second' },
			] })).rejects.toThrow('Mod "alpha": ui.pick duplicate item id "same"');
			expect(modDialogsStore.dialogs).toHaveLength(1);
			expect(modDialogsStore.current).toMatchObject({ modId: 'beta', title: 'Keep me' });
		});

		it.each([
			[undefined, 'a non-empty string title'],
			[{ title: '', items: [] }, 'a non-empty string title'],
			[{ title: 'Pick', placeholder: 42, items: [] }, 'a string placeholder'],
			[{ title: 'Pick', items: null }, 'an items array'],
			[{ title: 'Pick', items: [null] }, 'items with non-empty string ids and titles'],
			[{ title: 'Pick', items: [{ id: '', title: 'Title' }] }, 'items with non-empty string ids and titles'],
			[{ title: 'Pick', items: [{ id: 'id', title: 42 }] }, 'items with non-empty string ids and titles'],
			[{ title: 'Pick', items: [{ id: 'id', title: 'Title', description: null }] }, 'a string item description'],
		])('pick rejects malformed options %j', async (options, message) => {
			await expect(globals.__modCtx.alpha.ui.pick(options as never)).rejects.toThrow(`Mod "alpha": ui.pick needs ${message}`);
			expect(modDialogsStore.current).toBeNull();
			expect(modDialogsStore.dialogs).toEqual([]);
		});

		it('pick queues display data and returns the original object with its extra fields', async () => {
			const item = { id: 'project', title: 'Project', description: 'A folder', path: 'projects/' };
			const answer = globals.__modCtx.alpha.ui.pick({ title: 'Choose a folder', placeholder: 'Find a folder', items: [item] });

			expect(modDialogsStore.current).toMatchObject({
				kind: 'pick', modId: 'alpha', modName: 'Alpha', title: 'Choose a folder', placeholder: 'Find a folder',
				items: [{ id: 'project', title: 'Project', description: 'A folder' }],
			});
			modDialogsStore.answer(modDialogsStore.current!.id, 'project');
			const picked = await answer;
			expect(picked).toBe(item);
			expect(picked?.path).toBe('projects/');
			expect(modDialogsStore.current).toBeNull();
		});

		it('confirm shows a dialog with the mod name and defaults, and resolves with the answer', async () => {
			const answer = globals.__modCtx.alpha.ui.confirm({ title: 'Archive 12 notes?', destructive: true });

			expect(modDialogsStore.current).toMatchObject({
				kind: 'confirm',
				modId: 'alpha',
				modName: 'Alpha',
				title: 'Archive 12 notes?',
				confirmLabel: 'OK',
				cancelLabel: 'Cancel',
				destructive: true,
			});
			modDialogsStore.answer(modDialogsStore.current!.id, true);
			expect(await answer).toBe(true);
		});

		it('alert, prompt and loading fill their defaults', async () => {
			const { alpha } = globals.__modCtx;
			void alpha.ui.alert({ title: 'Done' });
			void alpha.ui.prompt({ title: 'New project', placeholder: 'Project name' });
			void alpha.ui.loading('Archiving...', () => new Promise(() => {}));

			expect(modDialogsStore.dialogs).toMatchObject([
				{ kind: 'alert', title: 'Done', alertKind: 'info' },
				{ kind: 'prompt', title: 'New project', placeholder: 'Project name', value: '', multiline: false },
				{ kind: 'loading', label: 'Archiving...', cancellable: false },
			]);
		});

		it('an unknown alert kind falls back to info', () => {
			void globals.__modCtx.alpha.ui.alert({ title: 'Done', kind: 'shiny' as never });
			expect(modDialogsStore.current).toMatchObject({ alertKind: 'info' });
		});

		it('loading runs the task at once, resolves with it and closes its dialog', async () => {
			let release!: (value: string) => void;
			const result = globals.__modCtx.alpha.ui.loading('Working', () => new Promise<string>((resolve) => (release = resolve)));

			expect(release).toBeTypeOf('function');
			expect(modDialogsStore.current).toMatchObject({ kind: 'loading', label: 'Working' });
			release('done');

			expect(await result).toBe('done');
			expect(modDialogsStore.current).toBeNull();
		});

		it('loading rejects with the task and closes its dialog', async () => {
			const result = globals.__modCtx.alpha.ui.loading('Working', async () => {
				throw new Error('disk full');
			});

			await expect(result).rejects.toThrow('disk full');
			expect(modDialogsStore.current).toBeNull();
		});

		it('cancelling a loading dialog aborts the signal the task received', async () => {
			let signal!: AbortSignal;
			const result = globals.__modCtx.alpha.ui.loading(
				'Working',
				(s) =>
					new Promise((_resolve, reject) => {
						signal = s;
						s.addEventListener('abort', () => reject(new Error('aborted')));
					}),
				{ cancellable: true },
			);

			modDialogsStore.dismiss(modDialogsStore.current!.id);

			await expect(result).rejects.toThrow('aborted');
			expect(signal.aborted).toBe(true);
		});

		it('a mod unloaded with a confirm open resolves it false and leaves no dialog of its own', async () => {
			const answer = globals.__modCtx.alpha.ui.confirm({ title: 'Sure?' });
			const prompt = globals.__modCtx.alpha.ui.prompt({ title: 'Name' });
			const other = globals.__modCtx.beta.ui.alert({ title: 'Beta says hi' });

			disableMod('alpha');

			expect(await answer).toBe(false);
			expect(await prompt).toBeNull();
			expect(modDialogsStore.dialogs.map((d) => d.modId)).toEqual(['beta']);
			modDialogsStore.answer(modDialogsStore.current!.id, undefined);
			await other;
		});

		it('unload cancels open and queued picks with null and preserves another mod\'s dialog', async () => {
			const { alpha, beta } = globals.__modCtx;
			const first = alpha.ui.pick({ title: 'First', items: [{ id: 'a', title: 'Alpha' }] });
			const queued = alpha.ui.pick({ title: 'Queued', items: [] });
			const other = beta.ui.alert({ title: 'Keep me' });

			disableMod('alpha');

			expect(await first).toBeNull();
			expect(await queued).toBeNull();
			expect(modDialogsStore.current).toMatchObject({ modId: 'beta', title: 'Keep me' });
			expect(modDialogsStore.dialogs).toHaveLength(1);
			modDialogsStore.dismiss(modDialogsStore.current!.id);
			await other;
		});

		it('an unload aborts the signal of a loading task and settles every dialog when the host stops', async () => {
			let signal!: AbortSignal;
			const loading = globals.__modCtx.alpha.ui.loading('Working', async (s) => {
				signal = s;
				await new Promise((resolve) => s.addEventListener('abort', resolve));
				return 'stopped';
			});
			const alert = globals.__modCtx.beta.ui.alert({ title: 'Queued' });

			stopModsHost();

			expect(signal.aborted).toBe(true);
			expect(await loading).toBe('stopped');
			expect(await alert).toBeUndefined();
			expect(modDialogsStore.dialogs).toEqual([]);
		});

		it('every ctx.ui call rejects after stop', async () => {
			const { ui } = globals.__modCtx.alpha;
			stopModsHost();

			await expect(ui.alert({ title: 'x' })).rejects.toThrow('Mod "alpha" is unloaded');
			await expect(ui.confirm({ title: 'x' })).rejects.toThrow('Mod "alpha" is unloaded');
			await expect(ui.prompt({ title: 'x' })).rejects.toThrow('Mod "alpha" is unloaded');
			await expect(ui.pick({ title: 'x', items: [] })).rejects.toThrow('Mod "alpha" is unloaded');
			await expect(ui.loading('x', () => {})).rejects.toThrow('Mod "alpha" is unloaded');
			expect(modDialogsStore.dialogs).toEqual([]);
		});

		it('ctx.theme throws after stop', () => {
			const { theme } = globals.__modCtx.alpha;
			stopModsHost();

			expect(() => theme.current).toThrow('Mod "alpha" is unloaded');
			expect(() => theme.onChange(() => {})).toThrow('Mod "alpha" is unloaded');
		});

		it('bad arguments reject with the mod id and open no dialog', async () => {
			const { ui } = globals.__modCtx.alpha;

			await expect(ui.alert(undefined as never)).rejects.toThrow('Mod "alpha": ui.alert needs a non-empty string title');
			await expect(ui.confirm({ title: '' })).rejects.toThrow('Mod "alpha": ui.confirm needs a non-empty string title');
			await expect(ui.prompt({} as never)).rejects.toThrow('Mod "alpha": ui.prompt needs a non-empty string title');
			await expect(ui.confirm({ title: 'x', confirmLabel: 3 as never })).rejects.toThrow(
				'Mod "alpha": ui.confirm needs a string confirmLabel',
			);
			await expect(ui.prompt({ title: 'x', value: null as never })).rejects.toThrow('Mod "alpha": ui.prompt needs a string value');
			await expect(ui.loading('', () => {})).rejects.toThrow('Mod "alpha": ui.loading needs a non-empty string label');
			await expect(ui.loading('Working', 'task' as never)).rejects.toThrow('Mod "alpha": ui.loading needs a task function');
			expect(modDialogsStore.dialogs).toEqual([]);
		});
	});
});
