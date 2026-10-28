import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve(undefined)),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	refreshTree: vi.fn(),
}));

import { readTextFile, writeTextFile, mkdir, remove, rename, exists } from '@tauri-apps/plugin-fs';
import { trashStore } from '$lib/core/trash/trash.store.svelte';
import type { TrashItem } from '$lib/core/trash/trash.types';
import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import {
	loadTrash,
	moveToTrash,
	restoreItem,
	deletePermanently,
	emptyTrash,
} from '$lib/core/trash/trash.service';
import { refreshTree } from '$lib/core/filesystem/fs.service';
import { invoke } from '@tauri-apps/api/core';
import { registerNoteChangeConsumer } from '$lib/core/filesystem/note-change.service';
import { areAllRecentSaves } from '$lib/core/editor/editor.hooks';
import { clearAllIndexed } from '$lib/utils/index-dedupe';
import { debug, error } from '$lib/utils/debug';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';

const VAULT = '/Users/me/vault';

const mockExists = vi.mocked(exists);
const mockReadTextFile = vi.mocked(readTextFile);
const mockWriteTextFile = vi.mocked(writeTextFile);
const mockMkdir = vi.mocked(mkdir);
const mockRemove = vi.mocked(remove);
const mockRename = vi.mocked(rename);

function makeStoredItem(id: string, originalPath: string, isDir = false): TrashItem {
	const fileName = originalPath.includes('/')
		? originalPath.substring(originalPath.lastIndexOf('/') + 1)
		: originalPath;
	return {
		id,
		originalPath,
		fileName,
		isDirectory: isDir,
		trashedAt: Number(id),
	};
}

describe('loadTrash', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
	});

	it('loads items from manifest file', async () => {
		const items = [makeStoredItem('1000', 'notes/a.md'), makeStoredItem('2000', 'notes/b.md')];
		mockExists.mockResolvedValue(true);
		mockReadTextFile.mockResolvedValue(JSON.stringify(items));

		await loadTrash(VAULT);

		expect(mockReadTextFile).toHaveBeenCalledWith('/Users/me/vault/.kokobrain/trash/trash-manifest.json');
		expect(trashStore.items).toEqual(items);
		expect(trashStore.loading).toBe(false);
	});

	it('sets empty items when manifest does not exist', async () => {
		mockExists.mockResolvedValue(false);

		await loadTrash(VAULT);

		expect(trashStore.items).toEqual([]);
		expect(trashStore.loading).toBe(false);
	});

	it('sets empty items on read error', async () => {
		mockExists.mockResolvedValue(true);
		mockReadTextFile.mockRejectedValue(new Error('read failed'));

		await loadTrash(VAULT);

		expect(trashStore.items).toEqual([]);
		expect(trashStore.loading).toBe(false);
	});

	it('filters out invalid entries from manifest', async () => {
		const json = JSON.stringify([
			makeStoredItem('1000', 'a.md'),
			{ broken: true },
			makeStoredItem('2000', 'b.md'),
		]);
		mockExists.mockResolvedValue(true);
		mockReadTextFile.mockResolvedValue(json);

		await loadTrash(VAULT);

		expect(trashStore.items).toHaveLength(2);
	});
});

describe('moveToTrash', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		mockExists.mockResolvedValue(false);
		mockMkdir.mockResolvedValue(undefined);
		mockRename.mockResolvedValue(undefined);
		mockWriteTextFile.mockResolvedValue(undefined);
	});

	it('moves a file to .kokobrain/trash/items/<id>/', async () => {
		const result = await moveToTrash(VAULT, '/Users/me/vault/notes/meeting.md', false);

		expect(result).toBe(true);
		// Verify rename was called with the correct source and a UUID-based destination
		expect(mockRename).toHaveBeenCalledTimes(1);
		const [src, dest] = mockRename.mock.calls[0];
		expect(src).toBe('/Users/me/vault/notes/meeting.md');
		expect(dest).toMatch(/^\/Users\/me\/vault\/\.kokobrain\/trash\/items\/[0-9a-f-]+\/meeting\.md$/);
		expect(trashStore.items).toHaveLength(1);
		expect(trashStore.items[0].originalPath).toBe('notes/meeting.md');
		expect(trashStore.items[0].fileName).toBe('meeting.md');
		expect(trashStore.items[0].isDirectory).toBe(false);
	});

	it('moves a directory to trash', async () => {
		const result = await moveToTrash(VAULT, '/Users/me/vault/projects/archive', true);

		expect(result).toBe(true);
		expect(mockRename).toHaveBeenCalledTimes(1);
		const [src, dest] = mockRename.mock.calls[0];
		expect(src).toBe('/Users/me/vault/projects/archive');
		expect(dest).toMatch(/^\/Users\/me\/vault\/\.kokobrain\/trash\/items\/[0-9a-f-]+\/archive$/);
		expect(trashStore.items[0].isDirectory).toBe(true);
	});

	it('creates trash directories if they do not exist', async () => {
		await moveToTrash(VAULT, '/Users/me/vault/file.md', false);

		// Should create: trash dir, items dir, and the UUID-based container
		expect(mockMkdir).toHaveBeenCalledWith('/Users/me/vault/.kokobrain/trash', { recursive: true });
		expect(mockMkdir).toHaveBeenCalledWith('/Users/me/vault/.kokobrain/trash/items', { recursive: true });
		// Third mkdir call is for the UUID container
		const containerPath = mockMkdir.mock.calls[2][0] as string;
		expect(containerPath).toMatch(/^\/Users\/me\/vault\/\.kokobrain\/trash\/items\/[0-9a-f-]+$/);
	});

	it('saves manifest after moving to trash', async () => {
		await moveToTrash(VAULT, '/Users/me/vault/a.md', false);

		expect(mockWriteTextFile).toHaveBeenCalled();
		const [path, content] = mockWriteTextFile.mock.calls[0];
		expect(path).toBe('/Users/me/vault/.kokobrain/trash/trash-manifest.json');
		const saved = JSON.parse(content as string);
		expect(saved).toHaveLength(1);
		expect(saved[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('throws on error', async () => {
		mockRename.mockRejectedValue(new Error('rename failed'));

		await expect(
			moveToTrash(VAULT, '/Users/me/vault/fail.md', false),
		).rejects.toThrow('rename failed');
	});

	it('cleans up orphaned container when rename fails', async () => {
		mockMkdir.mockResolvedValue(undefined);
		mockRename.mockRejectedValue(new Error('rename failed'));

		await expect(
			moveToTrash(VAULT, '/Users/me/vault/fail.md', false),
		).rejects.toThrow('rename failed');

		// The container directory should be cleaned up after the rename failure
		expect(mockRemove).toHaveBeenCalledTimes(1);
		const removedPath = mockRemove.mock.calls[0][0] as string;
		expect(removedPath).toMatch(/^\/Users\/me\/vault\/\.kokobrain\/trash\/items\/[0-9a-f-]+$/);
	});

	it('does NOT delete the container (which now holds the file) when manifest save fails after rename', async () => {
		// Rename succeeds -> the user's only copy is now inside the trash container.
		// The manifest write then fails. The container must NOT be recursively removed,
		// otherwise the file is permanently lost from both its original location and trash.
		mockRename.mockResolvedValue(undefined);
		mockWriteTextFile.mockRejectedValue(new Error('disk full'));

		const result = await moveToTrash(VAULT, '/Users/me/vault/notes/important.md', false);

		// The move into trash succeeded on disk, so the operation must report success
		// and must never remove the container that now holds the file.
		expect(result).toBe(true);
		expect(mockRename).toHaveBeenCalledTimes(1);
		expect(mockRemove).not.toHaveBeenCalled();
		// Store stays consistent (phantom-handling, mirroring restoreItem): the item is
		// tracked even though the manifest write failed, and will be re-persisted next save.
		expect(trashStore.items).toHaveLength(1);
		expect(trashStore.items[0].fileName).toBe('important.md');
	});
});

describe('restoreItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		mockExists.mockResolvedValue(false);
		mockRename.mockResolvedValue(undefined);
		mockRemove.mockResolvedValue(undefined);
		mockMkdir.mockResolvedValue(undefined);
		mockWriteTextFile.mockResolvedValue(undefined);
	});

	it('restores a file to its original path', async () => {
		const item = makeStoredItem('1000', 'notes/meeting.md');
		trashStore.setItems([item]);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/notes/meeting.md');
		expect(mockRename).toHaveBeenCalledWith(
			'/Users/me/vault/.kokobrain/trash/items/1000/meeting.md',
			'/Users/me/vault/notes/meeting.md',
		);
		expect(trashStore.items).toHaveLength(0);
	});

	it('creates parent directories if they do not exist', async () => {
		const item = makeStoredItem('1000', 'deep/nested/file.md');
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		expect(mockMkdir).toHaveBeenCalledWith('/Users/me/vault/deep/nested', { recursive: true });
	});

	it('appends suffix when original path is occupied', async () => {
		const item = makeStoredItem('1000', 'notes/meeting.md');
		trashStore.setItems([item]);
		// exists(originalPath)=true, exists(restored)=false, rest false
		mockExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValue(false);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/notes/meeting (restored).md');
	});

	it('increments suffix when restored path is also occupied', async () => {
		const item = makeStoredItem('1000', 'notes/meeting.md');
		trashStore.setItems([item]);
		// exists(originalPath)=true, exists("(restored)")=true, exists("(restored 2)")=false
		mockExists
			.mockResolvedValueOnce(true)   // original occupied
			.mockResolvedValueOnce(true)   // (restored) occupied
			.mockResolvedValueOnce(false)  // (restored 2) free
			.mockResolvedValue(false);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/notes/meeting (restored 2).md');
	});

	it('increments suffix for directories when restored path is occupied', async () => {
		const item = makeStoredItem('1000', 'projects/archive', true);
		trashStore.setItems([item]);
		mockExists
			.mockResolvedValueOnce(true)   // original occupied
			.mockResolvedValueOnce(true)   // (restored) occupied
			.mockResolvedValueOnce(true)   // (restored 2) occupied
			.mockResolvedValueOnce(false)  // (restored 3) free
			.mockResolvedValue(false);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/projects/archive (restored 3)');
	});

	it('cleans up the empty timestamped container', async () => {
		const item = makeStoredItem('1000', 'a.md');
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		expect(mockRemove).toHaveBeenCalledWith('/Users/me/vault/.kokobrain/trash/items/1000', { recursive: true });
	});

	it('refreshes the file tree after restore', async () => {
		const item = makeStoredItem('1000', 'a.md');
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		expect(refreshTree).toHaveBeenCalled();
		expect(trashStore.items).toHaveLength(0);
	});

	it('throws on error', async () => {
		const item = makeStoredItem('1000', 'a.md');
		trashStore.setItems([item]);
		mockRename.mockRejectedValue(new Error('fail'));

		await expect(
			restoreItem(VAULT, item),
		).rejects.toThrow('fail');
	});
});

describe('restoreItem - indexing', () => {
	const CONTENT = '---\nstatus: done\n---\n# Meeting\n';
	let upserts: [string, string][] = [];
	let unregister: () => void = () => {};

	/** Names of the commands the invoke mock was called with. */
	function invokedCommands(): string[] {
		return vi.mocked(invoke).mock.calls.map((c) => c[0] as string);
	}

	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		clearAllIndexed();
		backlinksStore.reset();
		queryjsSessionStore.clearResults();
		queryjsSessionStore.setResult('cached-script', {} as HTMLElement);
		vi.mocked(invoke).mockResolvedValue(undefined);
		mockExists.mockResolvedValue(false);
		mockRename.mockResolvedValue(undefined);
		mockRemove.mockResolvedValue(undefined);
		mockMkdir.mockResolvedValue(undefined);
		mockWriteTextFile.mockResolvedValue(undefined);
		mockReadTextFile.mockResolvedValue(CONTENT);
		vi.mocked(refreshTree).mockReset();
		fsStore.setFileTree([]);
		upserts = [];
		unregister = registerNoteChangeConsumer({
			name: 'test-consumer',
			upsert: (path, content) => { upserts.push([path, content]); },
			remove: () => {},
		});
	});

	afterEach(() => {
		unregister();
	});

	it('indexes a restored .md note through applyNoteChange', async () => {
		const item = makeStoredItem('1000', 'notes/meeting.md');
		trashStore.setItems([item]);

		const result = await restoreItem(VAULT, item);

		const path = '/Users/me/vault/notes/meeting.md';
		expect(result).toBe(path);
		expect(mockReadTextFile).toHaveBeenCalledWith(path);
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path, content: CONTENT });
		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'notes/meeting.md', content: CONTENT, vaultPath: VAULT,
		});
		expect(upserts).toEqual([[path, CONTENT]]);
		expect(areAllRecentSaves([path])).toBe(true);
		// The watcher skips this restore, so its post-update steps run here.
		expect(backlinksStore.unlinkedDirty).toBe(true);
		expect(queryjsSessionStore.hasResult('cached-script')).toBe(false);
	});

	it('indexes a suffixed restore under the suffixed path', async () => {
		const item = makeStoredItem('1000', 'notes/meeting.md');
		trashStore.setItems([item]);
		mockExists.mockResolvedValueOnce(true).mockResolvedValue(false);

		const result = await restoreItem(VAULT, item);

		const path = '/Users/me/vault/notes/meeting (restored).md';
		expect(result).toBe(path);
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path, content: CONTENT });
		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'notes/meeting (restored).md', content: CONTENT, vaultPath: VAULT,
		});
		expect(upserts).toEqual([[path, CONTENT]]);
	});

	/** A directory node holding `children`. */
	function dir(path: string, children: FileTreeNode[]): FileTreeNode {
		return { name: path.substring(path.lastIndexOf('/') + 1), path, isDirectory: true, children };
	}

	/** A file node. */
	function file(path: string): FileTreeNode {
		return { name: path.substring(path.lastIndexOf('/') + 1), path, isDirectory: false };
	}

	/** Makes the mocked `refreshTree` publish `tree` as the post-restore file tree. */
	function treeAfterRefresh(tree: FileTreeNode[]): void {
		vi.mocked(refreshTree).mockImplementation(async () => { fsStore.setFileTree(tree); });
	}

	it('indexes every Markdown note of a restored nested folder', async () => {
		const item = makeStoredItem('1000', 'projects/archive', true);
		trashStore.setItems([item]);
		const root = '/Users/me/vault/projects/archive';
		const top = `${root}/plan.md`;
		const deep = `${root}/2026/q1/review.markdown`;
		treeAfterRefresh([
			dir('/Users/me/vault/projects', [
				dir(root, [
					file(top),
					file(`${root}/diagram.png`),
					dir(`${root}/2026`, [dir(`${root}/2026/q1`, [file(deep)]), dir(`${root}/2026/empty`, [])]),
				]),
				file('/Users/me/vault/projects/other.md'),
			]),
		]);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe(root);
		expect(mockReadTextFile.mock.calls.map((c) => c[0])).toEqual([top, deep]);
		for (const [path, rel] of [[top, 'projects/archive/plan.md'], [deep, 'projects/archive/2026/q1/review.markdown']]) {
			expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path, content: CONTENT });
			expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
				filePath: rel, content: CONTENT, vaultPath: VAULT,
			});
			expect(invoke).toHaveBeenCalledWith('update_semantic_file', {
				filePath: rel, content: CONTENT, vaultPath: VAULT,
			});
		}
		expect(invokedCommands().filter((c) => c === 'update_note_in_index')).toHaveLength(2);
		expect(upserts).toEqual([[top, CONTENT], [deep, CONTENT]]);
		expect(areAllRecentSaves([top, deep])).toBe(true);
		expect(backlinksStore.unlinkedDirty).toBe(true);
		expect(queryjsSessionStore.hasResult('cached-script')).toBe(false);
		expect(trashStore.items).toHaveLength(0);
	});

	it('indexes a suffixed folder restore under the suffixed path', async () => {
		const item = makeStoredItem('1000', 'projects/archive', true);
		trashStore.setItems([item]);
		mockExists.mockResolvedValueOnce(true).mockResolvedValue(false);
		const root = '/Users/me/vault/projects/archive (restored)';
		const note = `${root}/plan.md`;
		treeAfterRefresh([
			dir('/Users/me/vault/projects', [
				dir('/Users/me/vault/projects/archive', [file('/Users/me/vault/projects/archive/plan.md')]),
				dir(root, [file(note)]),
			]),
		]);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe(root);
		expect(mockReadTextFile.mock.calls.map((c) => c[0])).toEqual([note]);
		expect(upserts).toEqual([[note, CONTENT]]);
	});

	it('skips an unreadable note of a restored folder and indexes the rest', async () => {
		const item = makeStoredItem('1000', 'projects/archive', true);
		trashStore.setItems([item]);
		const root = '/Users/me/vault/projects/archive';
		const bad = `${root}/bad.md`;
		const good = `${root}/good.md`;
		treeAfterRefresh([dir(root, [file(bad), file(good)])]);
		mockReadTextFile.mockImplementation(async (p) => {
			if (p === bad) throw new Error('read failed');
			return CONTENT;
		});

		await restoreItem(VAULT, item);

		expect(upserts).toEqual([[good, CONTENT]]);
		expect(areAllRecentSaves([good])).toBe(true);
		// No self-save mark, so the watcher still indexes the unreadable note.
		expect(areAllRecentSaves([bad])).toBe(false);
	});

	it('indexes nothing for an empty restored folder', async () => {
		const item = makeStoredItem('1000', 'projects/archive', true);
		trashStore.setItems([item]);
		treeAfterRefresh([dir('/Users/me/vault/projects', [dir('/Users/me/vault/projects/archive', [])])]);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/projects/archive');
		expect(mockReadTextFile).not.toHaveBeenCalled();
		expect(invokedCommands()).toEqual([]);
		expect(upserts).toEqual([]);
		expect(backlinksStore.unlinkedDirty).toBe(false);
		expect(queryjsSessionStore.hasResult('cached-script')).toBe(true);
		expect(trashStore.items).toHaveLength(0);
	});

	it('logs and indexes nothing when the restored folder is missing from the refreshed tree', async () => {
		const item = makeStoredItem('1000', 'projects/archive', true);
		trashStore.setItems([item]);
		treeAfterRefresh([dir('/Users/me/vault/projects', [])]);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/projects/archive');
		expect(mockReadTextFile).not.toHaveBeenCalled();
		expect(invokedCommands()).toEqual([]);
		expect(debug).toHaveBeenCalledWith(
			'Trash',
			'Restored folder not found in the refreshed tree, notes not indexed: /Users/me/vault/projects/archive',
		);
	});

	it('does not log a tree miss for an empty restored folder', async () => {
		const item = makeStoredItem('1000', 'projects/archive', true);
		trashStore.setItems([item]);
		treeAfterRefresh([dir('/Users/me/vault/projects', [dir('/Users/me/vault/projects/archive', [])])]);

		await restoreItem(VAULT, item);

		expect(vi.mocked(debug).mock.calls.some((c) => String(c[1]).startsWith('Restored folder not found'))).toBe(false);
	});

	it('indexes nothing for a non-Markdown file', async () => {
		const item = makeStoredItem('1000', 'assets/photo.png');
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		expect(mockReadTextFile).not.toHaveBeenCalled();
		expect(invokedCommands()).toEqual([]);
		expect(upserts).toEqual([]);
	});

	it('still returns the path and removes the trash item when the read fails', async () => {
		const item = makeStoredItem('1000', 'notes/unreadable.md');
		trashStore.setItems([item]);
		mockReadTextFile.mockRejectedValue(new Error('read failed'));

		const result = await restoreItem(VAULT, item);

		const path = '/Users/me/vault/notes/unreadable.md';
		expect(result).toBe(path);
		expect(trashStore.items).toHaveLength(0);
		expect(invokedCommands()).toEqual([]);
		expect(upserts).toEqual([]);
		// No self-save mark, so the watcher still indexes the file.
		expect(areAllRecentSaves([path])).toBe(false);
		expect(error).toHaveBeenCalledWith('Trash', expect.stringContaining('read restored note'), expect.any(Error));
		// The watcher owns the post-update steps on this path.
		expect(backlinksStore.unlinkedDirty).toBe(false);
		expect(queryjsSessionStore.hasResult('cached-script')).toBe(true);
		expect(refreshTree).toHaveBeenCalled();
	});
});

describe('deletePermanently', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		mockRemove.mockResolvedValue(undefined);
		mockWriteTextFile.mockResolvedValue(undefined);
		mockExists.mockResolvedValue(true);
	});

	it('removes the item directory from disk', async () => {
		const item = makeStoredItem('1000', 'notes/old.md');
		trashStore.setItems([item]);

		const result = await deletePermanently(VAULT, item);

		expect(result).toBe(true);
		expect(mockRemove).toHaveBeenCalledWith('/Users/me/vault/.kokobrain/trash/items/1000', { recursive: true });
		expect(trashStore.items).toHaveLength(0);
	});

	it('saves the manifest after deletion', async () => {
		const item = makeStoredItem('1000', 'a.md');
		const other = makeStoredItem('2000', 'b.md');
		trashStore.setItems([item, other]);

		await deletePermanently(VAULT, item);

		expect(mockWriteTextFile).toHaveBeenCalled();
		const saved = JSON.parse(mockWriteTextFile.mock.calls[0][1] as string);
		expect(saved).toHaveLength(1);
		expect(saved[0].id).toBe('2000');
	});

	it('throws on error', async () => {
		const item = makeStoredItem('1000', 'a.md');
		trashStore.setItems([item]);
		mockRemove.mockRejectedValue(new Error('fail'));

		await expect(
			deletePermanently(VAULT, item),
		).rejects.toThrow('fail');
	});
});

describe('emptyTrash', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		mockRemove.mockResolvedValue(undefined);
		mockWriteTextFile.mockResolvedValue(undefined);
		mockExists.mockResolvedValue(true);
	});

	it('removes the entire items directory', async () => {
		trashStore.setItems([makeStoredItem('1000', 'a.md'), makeStoredItem('2000', 'b.md')]);

		const result = await emptyTrash(VAULT);

		expect(result).toBe(true);
		expect(mockRemove).toHaveBeenCalledWith('/Users/me/vault/.kokobrain/trash/items', { recursive: true });
		expect(trashStore.items).toEqual([]);
		expect(trashStore.loading).toBe(false);
	});

	it('saves an empty manifest', async () => {
		trashStore.setItems([makeStoredItem('1000', 'a.md')]);

		await emptyTrash(VAULT);

		const saved = JSON.parse(mockWriteTextFile.mock.calls[0][1] as string);
		expect(saved).toEqual([]);
	});

	it('skips remove if items directory does not exist', async () => {
		mockExists.mockResolvedValue(false);

		await emptyTrash(VAULT);

		expect(mockRemove).not.toHaveBeenCalled();
	});

	it('throws on error', async () => {
		mockRemove.mockRejectedValue(new Error('fail'));

		await expect(
			emptyTrash(VAULT),
		).rejects.toThrow('fail');
	});
});
