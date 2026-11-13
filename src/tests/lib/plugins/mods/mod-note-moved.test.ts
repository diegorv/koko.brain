// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const disk = vi.hoisted(() => ({ files: new Map<string, string>(), folders: new Set<string>() }));
vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (path: string) => disk.files.has(path) || disk.folders.has(path)),
	stat: vi.fn(async (path: string) => {
		if (!disk.files.has(path) && !disk.folders.has(path)) throw new Error('Not found');
		return { isDirectory: disk.folders.has(path) };
	}),
	mkdir: vi.fn(async (path: string) => { disk.folders.add(path); }),
	readDir: vi.fn(async () => [{ name: 'mover', isDirectory: true }]),
	rename: vi.fn(async (from: string, to: string) => {
		if (!disk.files.has(from) && !disk.folders.has(from)) throw new Error('Not found');
		for (const [path, content] of [...disk.files]) {
			if (path !== from && !path.startsWith(`${from}/`)) continue;
			disk.files.delete(path);
			disk.files.set(to + path.slice(from.length), content);
		}
		for (const path of [...disk.folders]) {
			if (path !== from && !path.startsWith(`${from}/`)) continue;
			disk.folders.delete(path);
			disk.folders.add(to + path.slice(from.length));
		}
	}),
	readTextFile: vi.fn(async (path: string) => disk.files.get(path)),
	writeTextFile: vi.fn(async (path: string, content: string) => { disk.files.set(path, content); }),
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

import { invoke } from '@tauri-apps/api/core';
import { rename } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';

import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { findNodeByPath } from '#lib/core/filesystem/fs.logic.js';
import { renameItem } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { ModNoteMovedV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import { modsEnabledStore } from '#lib/plugins/mods/mods-enabled.store.svelte.js';
import { disableMod, startModsHost, stopModsHost, type ModContext } from '#lib/plugins/mods/mods-host.service.js';
import { modsStore } from '#lib/plugins/mods/mods.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';

const globals = globalThis as unknown as { __moveCtx: ModContext };
const ROOT = '/vault';
const NOTE = '/vault/Ideas/Note.md';
const OTHER = '/vault/Other.md';

describe('ctx.onNoteMoved', () => {
	let ctx: ModContext;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Every rename finds Other.md as a backlink, so the link rewrite runs.
		vi.mocked(invoke).mockImplementation(async (command) => command === 'get_backlinks_v2' ? [{ path: OTHER }] : null);
		vi.useFakeTimers();
		localStorage.clear();
		disk.files.clear();
		disk.folders.clear();
		for (const folder of [ROOT, '/vault/Ideas', '/vault/Archive', '/vault/_system/mods', '/vault/_system/mods/mover']) {
			disk.folders.add(folder);
		}
		disk.files.set('/vault/_system/mods/mover/manifest.json', JSON.stringify({ id: 'mover', name: 'Mover', version: '1.0.0' }));
		disk.files.set('/vault/_system/mods/mover/main.js', 'export default { onload(ctx) { globalThis.__moveCtx = ctx; } };');
		disk.files.set(NOTE, 'note');
		disk.files.set(OTHER, 'see [[Note]]');
		resetHooks();
		editorStore.reset();
		fsStore.reset();
		trashStore.setItems([]);
		vaultStore._reset();
		modsEnabledStore._reset();
		vaultStore.open(ROOT);
		fsStore.setFileTree([
			{ name: 'Ideas', path: '/vault/Ideas', isDirectory: true, children: [
				{ name: 'Note.md', path: NOTE, isDirectory: false },
			] },
			{ name: 'Archive', path: '/vault/Archive', isDirectory: true, children: [] },
			{ name: 'Other.md', path: OTHER, isDirectory: false },
		]);
		modsEnabledStore.setEnabled(true);
		await startModsHost(ROOT);
		ctx = globals.__moveCtx;
	});

	afterEach(() => {
		stopModsHost();
		resetHooks();
		vi.useRealTimers();
	});

	/** Subscribes a recorder and returns the events it received. */
	const record = () => {
		const events: ModNoteMovedV1[] = [];
		ctx.onNoteMoved((event) => events.push(event));
		return events;
	};

	it('reports a rename once the links are rewritten and the tree is updated', async () => {
		const seen: { event: ModNoteMovedV1; inTree: boolean; otherOnDisk: string | undefined }[] = [];
		ctx.onNoteMoved((event) => {
			seen.push({
				event,
				inTree: findNodeByPath(fsStore.fileTree, '/vault/Ideas/Renamed.md') !== null,
				otherOnDisk: disk.files.get(OTHER),
			});
		});

		// The backlink lookup answers in a later timer, as real IPC does, so a
		// callback scheduled at `pathChanged` would run before the rewrite.
		vi.mocked(invoke).mockImplementation(async (command) => {
			if (command !== 'get_backlinks_v2') return null;
			await new Promise((resolve) => setTimeout(resolve, 0));
			return [{ path: OTHER }];
		});

		const renamed = renameItem(NOTE, 'Renamed.md');
		await vi.runAllTimersAsync();
		await renamed;

		expect(seen).toEqual([{
			event: { from: 'Ideas/Note.md', to: 'Ideas/Renamed.md' },
			inTree: true,
			otherOnDisk: 'see [[Renamed]]',
		}]);
	});

	it('reports moves to another folder and to the vault root with relative paths', async () => {
		const events = record();

		await ctx.vault.move('Ideas/Note.md', 'Archive');
		await vi.advanceTimersByTimeAsync(0);
		await ctx.vault.move('Archive/Note.md', '');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([
			{ from: 'Ideas/Note.md', to: 'Archive/Note.md' },
			{ from: 'Archive/Note.md', to: 'Note.md' },
		]);
	});

	it('reports a folder move once, for the folder', async () => {
		const events = record();

		await ctx.vault.move('Ideas', 'Archive');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([{ from: 'Ideas', to: 'Archive/Ideas' }]);
	});

	it('reports the mod\'s own vault.rename to its own callback, with exactly from and to', async () => {
		const events = record();

		await expect(ctx.vault.rename('Ideas/Note.md', 'Renamed.md')).resolves.toBe('Ideas/Renamed.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([{ from: 'Ideas/Note.md', to: 'Ideas/Renamed.md' }]);
		expect(Object.keys(events[0]).sort()).toEqual(['from', 'to']);
	});

	it('reports nothing for a delete, a no-op move, a same-name rename or a failed disk rename', async () => {
		const events = record();

		await ctx.vault.move('Ideas/Note.md', 'Ideas');
		await ctx.vault.rename('Ideas/Note.md', 'Note.md');
		vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));
		await expect(ctx.vault.rename('Ideas/Note.md', 'Renamed.md')).rejects.toThrow('permission denied');
		await ctx.vault.delete('Ideas/Note.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(disk.files.has(NOTE)).toBe(false);
		expect(events).toEqual([]);
	});

	it('reports nothing when get_backlinks_v2 rejects during the link rewrite', async () => {
		const events = record();
		vi.mocked(invoke).mockImplementation(async (command) => {
			if (command === 'get_backlinks_v2') throw new Error('index unavailable');
			return null;
		});

		await expect(ctx.vault.rename('Ideas/Note.md', 'Renamed.md')).rejects.toThrow('index unavailable');
		await vi.advanceTimersByTimeAsync(0);

		expect(disk.files.has('/vault/Ideas/Renamed.md')).toBe(true);
		expect(events).toEqual([]);
	});

	it('disposal cancels a pending callback and stops later ones', async () => {
		const events: ModNoteMovedV1[] = [];
		const dispose = ctx.onNoteMoved((event) => events.push(event));

		await ctx.vault.rename('Ideas/Note.md', 'One.md');
		dispose();
		dispose();
		await ctx.vault.rename('Ideas/One.md', 'Two.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([]);
	});

	it('unloading cancels a pending callback, stops later ones and makes onNoteMoved throw', async () => {
		const events = record();

		await renameItem(NOTE, 'One.md');
		disableMod('mover');
		await renameItem('/vault/Ideas/One.md', 'Two.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([]);
		expect(() => ctx.onNoteMoved(() => {})).toThrow('unloaded');
	});

	it('drops a pending callback after a vault switch', async () => {
		const events = record();

		await renameItem(NOTE, 'Renamed.md');
		vaultStore.open('/other');
		await vi.advanceTimersByTimeAsync(0);

		expect(events).toEqual([]);
	});

	it('records sync throws and async rejections in the debug log and the Labs row, sharing one toast per load', async () => {
		ctx.onNoteSaved(() => { throw new Error('bad save handler'); });
		await ctx.vault.write('Ideas/Note.md', 'changed');
		await vi.advanceTimersByTimeAsync(0);
		expect(toast.error).toHaveBeenCalledTimes(1);

		const seen: ModNoteMovedV1[] = [];
		ctx.onNoteMoved(() => { throw new Error('bad move handler'); });
		ctx.onNoteMoved(async () => { throw new Error('bad async move handler'); });
		ctx.onNoteMoved((event) => seen.push(event));
		await ctx.vault.rename('Ideas/Note.md', 'Renamed.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(seen).toEqual([{ from: 'Ideas/Note.md', to: 'Ideas/Renamed.md' }]);
		expect(debug).toHaveBeenCalledWith('MOD:mover', 'onNoteMoved callback failed:', expect.stringContaining('bad move handler'));
		expect(debug).toHaveBeenCalledWith('MOD:mover', 'onNoteMoved callback failed:', expect.stringContaining('bad async move handler'));
		expect(error).not.toHaveBeenCalled();
		// The rejection settles a microtask after the sync throw, so it is the last record.
		expect(modsStore.callbackErrorFor('mover')).toMatchObject({ callback: 'onNoteMoved', message: 'bad async move handler' });
		expect(toast.error).toHaveBeenCalledTimes(1);
	});

	it('records a sync throw alone under onNoteMoved', async () => {
		ctx.onNoteMoved(() => { throw new Error('bad move handler'); });

		await ctx.vault.rename('Ideas/Note.md', 'Renamed.md');
		await vi.advanceTimersByTimeAsync(0);

		expect(modsStore.callbackErrorFor('mover')).toMatchObject({ callback: 'onNoteMoved', message: 'bad move handler' });
		expect(toast.error).toHaveBeenCalledTimes(1);
		expect(vi.mocked(toast.error).mock.calls[0][0]).toMatch(/^Mover: onNoteMoved callback failed: /);
	});

	it('rejects a non-function callback', () => {
		expect(() => ctx.onNoteMoved(null as never)).toThrow('Mod "mover": onNoteMoved needs a callback function');
	});
});
