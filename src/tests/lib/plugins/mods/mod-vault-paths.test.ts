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
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (command: string) => command === 'get_backlinks_v2' ? [] : null),
}));
vi.mock('svelte-sonner', () => ({
	toast: { info: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('#lib/utils/debug.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/utils/debug.js')>()),
	debug: vi.fn(),
	error: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { rename, stat } from '@tauri-apps/plugin-fs';
import { resetHooks } from '#lib/core/editor/editor.hooks.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { findNodeByPath } from '#lib/core/filesystem/fs.logic.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { trashStore } from '#lib/core/trash/trash.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import type { ModContextV1 } from '#lib/plugins/mods/contract/mod-api.v1.js';
import { createModContext, type ModRuntime } from '#lib/plugins/mods/mods-host.service.js';
import { isAlreadyIndexed, markIndexed } from '#lib/utils/index-dedupe.js';

const ROOT = '/vault';
const NOTE = '/vault/Ideas/Note.md';

describe('ctx.vault path changes through the real filesystem services', () => {
	let runtime: ModRuntime;
	let ctx: ModContextV1;

	beforeEach(() => {
		vi.clearAllMocks();
		disk.files.clear();
		disk.folders.clear();
		disk.files.set(NOTE, 'note');
		for (const folder of [ROOT, '/vault/Ideas', '/vault/Archive']) disk.folders.add(folder);
		resetHooks();
		editorStore.reset();
		fsStore.reset();
		trashStore.setItems([]);
		vaultStore._reset();
		vaultStore.open(ROOT);
		fsStore.setFileTree([
			{ name: 'Ideas', path: '/vault/Ideas', isDirectory: true, children: [
				{ name: 'Note.md', path: NOTE, isDirectory: false },
			] },
			{ name: 'Archive', path: '/vault/Archive', isDirectory: true, children: [] },
		]);
		editorStore.addTab({ path: NOTE, name: 'Note.md', content: 'note', savedContent: 'note' });
		runtime = { controller: new AbortController(), disposers: [], runs: new Set(), unloaded: false };
		ctx = createModContext({ id: 'paths', name: 'Paths', version: '1.0.0' }, ROOT, runtime);
	});

	afterEach(() => resetHooks());

	it('renames a note using relative inputs and output, updating its tab and file tree', async () => {
		await expect(ctx.vault.rename('Ideas/Note.md', 'Renamed.md')).resolves.toBe('Ideas/Renamed.md');
		expect(disk.files.get('/vault/Ideas/Renamed.md')).toBe('note');
		expect(disk.files.has(NOTE)).toBe(false);
		expect(editorStore.activeTabPath).toBe('/vault/Ideas/Renamed.md');
		expect(findNodeByPath(fsStore.fileTree, '/vault/Ideas/Renamed.md')?.name).toBe('Renamed.md');
		expect(invoke).toHaveBeenCalledWith('rename_in_search_index', { from: 'Ideas/Note.md', to: 'Ideas/Renamed.md' });
	});

	it('moves a folder and its children through the existing path-change owner', async () => {
		markIndexed(NOTE, 'note');
		await expect(ctx.vault.move('Ideas', 'Archive')).resolves.toBe('Archive/Ideas');
		expect(disk.files.get('/vault/Archive/Ideas/Note.md')).toBe('note');
		expect(editorStore.activeTabPath).toBe('/vault/Archive/Ideas/Note.md');
		expect(findNodeByPath(fsStore.fileTree, '/vault/Archive/Ideas/Note.md')).not.toBeNull();
		expect(isAlreadyIndexed(NOTE, 'note')).toBe(false);
		expect(invoke).toHaveBeenCalledWith('rename_note', { from: '/vault/Ideas', to: '/vault/Archive/Ideas' });
	});

	it('moves a note to the root and returns its path for an already-in-folder no-op', async () => {
		await expect(ctx.vault.move('Ideas/Note.md', '')).resolves.toBe('Note.md');
		await expect(ctx.vault.move('Note.md', '')).resolves.toBe('Note.md');
		expect(disk.files.get('/vault/Note.md')).toBe('note');
		expect(editorStore.activeTabPath).toBe('/vault/Note.md');
		expect(rename).toHaveBeenCalledTimes(1);
	});

	it('returns an unchanged rename path without writing', async () => {
		await expect(ctx.vault.rename('Ideas/Note.md', 'Note.md')).resolves.toBe('Ideas/Note.md');
		expect(disk.files.get(NOTE)).toBe('note');
		expect(rename).not.toHaveBeenCalled();
	});

	it('detects a folder for trash and removes every child from the tree, tabs and index dedupe', async () => {
		markIndexed(NOTE, 'note');
		await ctx.vault.delete('Ideas');
		expect(disk.folders.has('/vault/Ideas')).toBe(false);
		expect(disk.files.has(NOTE)).toBe(false);
		expect(findNodeByPath(fsStore.fileTree, '/vault/Ideas')).toBeNull();
		expect(editorStore.tabs).toEqual([]);
		expect(editorStore.activeTabPath).toBeNull();
		expect(isAlreadyIndexed(NOTE, 'note')).toBe(false);
		expect(trashStore.items).toHaveLength(1);
		expect(trashStore.items[0].isDirectory).toBe(true);
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: NOTE });
		expect(invoke).toHaveBeenCalledWith('remove_from_search_index', { filePath: 'Ideas/Note.md' });
		expect(invoke).toHaveBeenCalledWith('remove_semantic_file', { filePath: 'Ideas/Note.md' });
	});

	it('deletes a file and records it as a file in trash', async () => {
		await ctx.vault.delete('Ideas/Note.md');
		expect(disk.files.has(NOTE)).toBe(false);
		expect(editorStore.activeTab).toBeNull();
		expect(trashStore.items[0].isDirectory).toBe(false);
	});

	it.each(['', '/absolute.md', '../escape', 'a/../b', 'a//b', 'a/', null])('rejects invalid source paths %s before disk access', async (path) => {
		await expect(ctx.vault.rename(path as string, 'new.md')).rejects.toThrow('Invalid vault path');
		await expect(ctx.vault.move(path as string, 'Archive')).rejects.toThrow('Invalid vault path');
		await expect(ctx.vault.delete(path as string)).rejects.toThrow('Invalid vault path');
		expect(disk.files.get(NOTE)).toBe('note');
		expect(rename).not.toHaveBeenCalled();
		expect(stat).not.toHaveBeenCalled();
	});

	it.each(['', '..', '.', '/outside.md', 'other/name.md', null])('rejects invalid rename names %s', async (name) => {
		await expect(ctx.vault.rename('Ideas/Note.md', name as string)).rejects.toThrow();
		expect(disk.files.get(NOTE)).toBe('note');
		expect(rename).not.toHaveBeenCalled();
	});

	it.each(['/outside', '..', 'a//b', null])('rejects invalid destination folders %s', async (folder) => {
		await expect(ctx.vault.move('Ideas/Note.md', folder as string)).rejects.toThrow('Invalid vault path');
		expect(disk.files.get(NOTE)).toBe('note');
		expect(rename).not.toHaveBeenCalled();
	});

	it('rejects target collisions and preserves both files', async () => {
		disk.files.set('/vault/Archive/Note.md', 'existing');
		await expect(ctx.vault.move('Ideas/Note.md', 'Archive')).rejects.toThrow('already exists');
		disk.files.set('/vault/Ideas/Taken.md', 'taken');
		await expect(ctx.vault.rename('Ideas/Note.md', 'Taken.md')).rejects.toThrow('already exists');
		expect(disk.files.get(NOTE)).toBe('note');
		expect(disk.files.get('/vault/Archive/Note.md')).toBe('existing');
		expect(disk.files.get('/vault/Ideas/Taken.md')).toBe('taken');
		expect(editorStore.activeTabPath).toBe(NOTE);
	});

	it('propagates filesystem errors without removing the item', async () => {
		vi.mocked(stat).mockRejectedValueOnce(new Error('stat denied'));
		await expect(ctx.vault.delete('Ideas')).rejects.toThrow('stat denied');
		vi.mocked(rename).mockRejectedValueOnce(new Error('rename denied'));
		await expect(ctx.vault.rename('Ideas/Note.md', 'Renamed.md')).rejects.toThrow('rename denied');
		expect(disk.files.get(NOTE)).toBe('note');
		expect(editorStore.activeTabPath).toBe(NOTE);
	});

	it('rejects calls after unload without touching the disk', async () => {
		runtime.unloaded = true;
		await expect(ctx.vault.rename('Ideas/Note.md', 'new.md')).rejects.toThrow('unloaded');
		await expect(ctx.vault.move('Ideas/Note.md', '')).rejects.toThrow('unloaded');
		await expect(ctx.vault.delete('Ideas')).rejects.toThrow('unloaded');
		expect(disk.files.get(NOTE)).toBe('note');
		expect(rename).not.toHaveBeenCalled();
		expect(stat).not.toHaveBeenCalled();
	});

	it('does not start deleting when the mod unloads during folder detection', async () => {
		const realStat = vi.mocked(stat).getMockImplementation()!;
		vi.mocked(stat).mockImplementationOnce(async (...args) => {
			runtime.unloaded = true;
			return realStat(...args);
		});
		await expect(ctx.vault.delete('Ideas')).rejects.toThrow('unloaded');
		expect(disk.files.get(NOTE)).toBe('note');
		expect(editorStore.activeTabPath).toBe(NOTE);
		expect(rename).not.toHaveBeenCalled();
	});
});
