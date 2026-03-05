import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import {
	loadTrash,
	moveToTrash,
	restoreItem,
	deletePermanently,
	emptyTrash,
} from '$lib/core/trash/trash.service';
import { refreshTree } from '$lib/core/filesystem/fs.service';

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
