// @vitest-environment jsdom
// ctx.onNoteCreated over the real note creator, editor, hooks and mods host:
// only the Tauri boundary (an in-memory disk), the toast and the debug log are mocked.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const files = vi.hoisted(() => new Map<string, string>());
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (path: string) => [...files.keys()].some((key) => key === path || key.startsWith(`${path}/`))),
	readDir: vi.fn(async () => [{ name: 'maker', isDirectory: true }]),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(async (path: string, content: string) => { files.set(path, content); }),
}));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('#lib/utils/debug.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/debug.js')>()),
	debug: vi.fn(),
	error: vi.fn(),
}));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';

import { notifyNoteCreated, resetHooks } from '#lib/core/editor/editor.hooks.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { ModNoteCreatedV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, startModsHost, stopModsHost, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';

const globals = globalThis as unknown as { __makerCtx: ModContext };
const ROOT = '/vault';
const NEW = '/vault/Ideas/New.md';

describe('ctx.onNoteCreated', () => {
	let ctx: ModContext;

	beforeEach(async () => {
		vi.clearAllMocks();
		vi.mocked(invoke).mockImplementation(async (command, args) => {
			if (command === 'create_note') {
				const { path, content } = args as { path: string; content: string };
				files.set(path, content);
			}
			return null;
		});
		vi.mocked(readTextFile).mockImplementation(async (path) => {
			if (!files.has(String(path))) throw new Error('Not found');
			return files.get(String(path))!;
		});
		vi.useFakeTimers();
		localStorage.clear();
		files.clear();
		files.set('/vault/_system/mods/maker/manifest.json', JSON.stringify({ id: 'maker', name: 'Maker', version: '1.0.0' }));
		files.set('/vault/_system/mods/maker/main.js', 'export default { onload(ctx) { globalThis.__makerCtx = ctx; } };');
		resetHooks();
		editorStore.reset();
		fsStore.reset();
		vaultStore._reset();
		modsEnabledStore._reset();
		vaultStore.open(ROOT);
		modsEnabledStore.setEnabled(true);
		await startModsHost(ROOT);
		ctx = globals.__makerCtx;
	});

	afterEach(() => {
		stopModsHost();
		resetHooks();
		vi.useRealTimers();
	});

	/** Subscribes a recorder and returns the events it received. */
	const record = () => {
		const events: ModNoteCreatedV1[] = [];
		ctx.onNoteCreated((event) => events.push(event));
		return events;
	};

	it('reports a note the creator made, in a later timer, with exactly a vault-relative path', async () => {
		const events = record();

		await openOrCreateNote({ filePath: NEW, title: 'New' });
		expect(events).toEqual([]);
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([{ path: 'Ideas/New.md' }]);
		expect(Object.keys(events[0])).toEqual(['path']);
	});

	it('runs after the tab opened, so a write from the callback reaches the open tab', async () => {
		const seen: { tabOpen: boolean }[] = [];
		ctx.onNoteCreated(({ path }) => {
			seen.push({ tabOpen: editorStore.tabs.some((tab) => tab.path === NEW) });
			void ctx.vault.write(path, 'stamped');
		});

		// The tab's read answers in a later timer, as real IPC does, so a
		// callback scheduled before the open would run before the tab exists.
		vi.mocked(readTextFile).mockImplementation(async (path) => {
			await new Promise((resolve) => setTimeout(resolve, 0));
			if (!files.has(String(path))) throw new Error('Not found');
			return files.get(String(path))!;
		});

		const created = openOrCreateNote({ filePath: NEW, title: 'New', inlineTemplate: 'from template' });
		await vi.runAllTimersAsync();
		await created;

		expect(seen).toEqual([{ tabOpen: true }]);
		expect(files.get(NEW)).toBe('stamped');
		const tab = editorStore.tabs.find((t) => t.path === NEW)!;
		expect(tab.content).toBe('stamped');
		expect(tab.savedContent).toBe('stamped');
	});

	it('does not report an existing note the creator only opened', async () => {
		files.set(NEW, 'already here');
		const events = record();

		await openOrCreateNote({ filePath: NEW, title: 'New' });
		await vi.advanceTimersByTimeAsync(0);

		expect(editorStore.tabs.map((t) => t.path)).toEqual([NEW]);
		expect(events).toEqual([]);
	});

	it('does not report a mod\'s own ctx.vault.create', async () => {
		const events = record();

		await ctx.vault.create('Ideas/Made.md', 'body');
		await vi.advanceTimersByTimeAsync(0);

		expect(files.get('/vault/Ideas/Made.md')).toBe('body');
		expect(events).toEqual([]);
	});

	it('ignores a path outside the vault', async () => {
		const events = record();

		notifyNoteCreated('/elsewhere/Note.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([]);
	});

	it('disposal cancels a pending callback and stops later ones', async () => {
		const events: ModNoteCreatedV1[] = [];
		const dispose = ctx.onNoteCreated((event) => events.push(event));

		notifyNoteCreated(NEW);
		dispose();
		dispose();
		notifyNoteCreated('/vault/Other.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([]);
	});

	it('unloading cancels a pending callback, stops later ones and makes onNoteCreated throw', async () => {
		const events = record();

		notifyNoteCreated(NEW);
		disableMod('maker');
		notifyNoteCreated('/vault/Other.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([]);
		expect(() => ctx.onNoteCreated(() => {})).toThrow('unloaded');
	});

	it('drops a pending callback after a vault switch', async () => {
		const events = record();

		notifyNoteCreated(NEW);
		vaultStore.open('/other');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([]);
	});

	it('records sync throws and async rejections in the debug log and the Labs row, toasting once', async () => {
		const seen: ModNoteCreatedV1[] = [];
		ctx.onNoteCreated(() => { throw new Error('bad create handler'); });
		ctx.onNoteCreated(async () => { throw new Error('bad async create handler'); });
		ctx.onNoteCreated((event) => seen.push(event));

		notifyNoteCreated(NEW);
		await vi.advanceTimersByTimeAsync(0);

		expect(seen).toEqual([{ path: 'Ideas/New.md' }]);
		expect(debug).toHaveBeenCalledWith('MOD:maker', 'onNoteCreated callback failed:', expect.stringContaining('bad create handler'));
		expect(debug).toHaveBeenCalledWith('MOD:maker', 'onNoteCreated callback failed:', expect.stringContaining('bad async create handler'));
		expect(error).not.toHaveBeenCalled();
		// The rejection settles a microtask after the sync throw, so it is the last record.
		expect(modsStore.callbackErrorFor('maker')).toMatchObject({ callback: 'onNoteCreated', message: 'bad async create handler' });
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/^Maker: onNoteCreated callback failed: /);
	});

	it('rejects a non-function callback', () => {
		expect(() => ctx.onNoteCreated(null as never)).toThrow('Mod "maker": onNoteCreated needs a callback function');
	});
});
