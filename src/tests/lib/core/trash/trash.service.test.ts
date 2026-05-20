import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/core/filesystem/fs-rust.service', () => ({
	pathExists: vi.fn(),
	readText: vi.fn(),
	writeText: vi.fn(),
	renamePath: vi.fn(),
	deletePath: vi.fn(),
	createFolder: vi.fn(),
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

import { pathExists, readText, writeText, renamePath, deletePath, createFolder } from '$lib/core/filesystem/fs-rust.service';
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

const mockExists = vi.mocked(pathExists);
const mockReadText = vi.mocked(readText);
const mockWriteText = vi.mocked(writeText);
const mockRenamePath = vi.mocked(renamePath);
const mockDeletePath = vi.mocked(deletePath);
const mockCreateFolder = vi.mocked(createFolder);

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
		mockReadText.mockResolvedValue(JSON.stringify(items));

		await loadTrash(VAULT);

		expect(mockReadText).toHaveBeenCalledWith(VAULT, '/Users/me/vault/.kokobrain/trash/trash-manifest.json');
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
		mockReadText.mockRejectedValue(new Error('read failed'));

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
		mockReadText.mockResolvedValue(json);

		await loadTrash(VAULT);

		expect(trashStore.items).toHaveLength(2);
	});
});

describe('moveToTrash', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		mockExists.mockResolvedValue(false);
		mockCreateFolder.mockResolvedValue(undefined);
		mockRenamePath.mockResolvedValue(undefined);
		mockWriteText.mockResolvedValue(undefined);
	});

	it('moves a file to .kokobrain/trash/items/<id>/', async () => {
		const result = await moveToTrash(VAULT, '/Users/me/vault/notes/meeting.md', false);

		expect(result).toBe(true);
		expect(mockRenamePath).toHaveBeenCalledTimes(1);
		const [vault, src, dest] = mockRenamePath.mock.calls[0];
		expect(vault).toBe(VAULT);
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
		expect(mockRenamePath).toHaveBeenCalledTimes(1);
		const [, src, dest] = mockRenamePath.mock.calls[0];
		expect(src).toBe('/Users/me/vault/projects/archive');
		expect(dest).toMatch(/^\/Users\/me\/vault\/\.kokobrain\/trash\/items\/[0-9a-f-]+\/archive$/);
		expect(trashStore.items[0].isDirectory).toBe(true);
	});

	it('creates trash directories if they do not exist via createFolder', async () => {
		await moveToTrash(VAULT, '/Users/me/vault/file.md', false);

		// createFolder wraps `create_folder`; invoked for: trash dir, items dir, UUID container
		expect(mockCreateFolder).toHaveBeenCalledWith('/Users/me/vault/.kokobrain/trash');
		expect(mockCreateFolder).toHaveBeenCalledWith('/Users/me/vault/.kokobrain/trash/items');
		const containerCall = mockCreateFolder.mock.calls.find(
			(c) => /\/items\/[0-9a-f-]+$/.test(c[0]),
		);
		expect(containerCall).toBeDefined();
	});

	it('saves manifest after moving to trash', async () => {
		await moveToTrash(VAULT, '/Users/me/vault/a.md', false);

		expect(mockWriteText).toHaveBeenCalled();
		const [vault, path, content] = mockWriteText.mock.calls[0];
		expect(vault).toBe(VAULT);
		expect(path).toBe('/Users/me/vault/.kokobrain/trash/trash-manifest.json');
		const saved = JSON.parse(content as string);
		expect(saved).toHaveLength(1);
		expect(saved[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});

	it('throws on error', async () => {
		mockRenamePath.mockRejectedValue(new Error('rename failed'));

		await expect(
			moveToTrash(VAULT, '/Users/me/vault/fail.md', false),
		).rejects.toThrow('rename failed');
	});

	it('cleans up orphaned container when rename fails', async () => {
		mockRenamePath.mockRejectedValue(new Error('rename failed'));

		await expect(
			moveToTrash(VAULT, '/Users/me/vault/fail.md', false),
		).rejects.toThrow('rename failed');

		// The container directory should be cleaned up via deletePath
		expect(mockDeletePath).toHaveBeenCalledTimes(1);
		const [vault, removedPath, recursive] = mockDeletePath.mock.calls[0];
		expect(vault).toBe(VAULT);
		expect(removedPath).toMatch(/^\/Users\/me\/vault\/\.kokobrain\/trash\/items\/[0-9a-f-]+$/);
		expect(recursive).toBe(true);
	});
});

describe('restoreItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		mockExists.mockResolvedValue(false);
		mockRenamePath.mockResolvedValue(undefined);
		mockDeletePath.mockResolvedValue(undefined);
		mockCreateFolder.mockResolvedValue(undefined);
		mockWriteText.mockResolvedValue(undefined);
	});

	it('restores a file to its original path', async () => {
		const item = makeStoredItem('1000', 'notes/meeting.md');
		trashStore.setItems([item]);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/notes/meeting.md');
		expect(mockRenamePath).toHaveBeenCalledWith(
			VAULT,
			'/Users/me/vault/.kokobrain/trash/items/1000/meeting.md',
			'/Users/me/vault/notes/meeting.md',
		);
		expect(trashStore.items).toHaveLength(0);
	});

	it('creates parent directories via createFolder when they do not exist', async () => {
		const item = makeStoredItem('1000', 'deep/nested/file.md');
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		expect(mockCreateFolder).toHaveBeenCalledWith('/Users/me/vault/deep/nested');
	});

	it('appends suffix when original path is occupied', async () => {
		const item = makeStoredItem('1000', 'notes/meeting.md');
		trashStore.setItems([item]);
		mockExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValue(false);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/notes/meeting (restored).md');
	});

	it('increments suffix when restored path is also occupied', async () => {
		const item = makeStoredItem('1000', 'notes/meeting.md');
		trashStore.setItems([item]);
		mockExists
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false)
			.mockResolvedValue(false);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/notes/meeting (restored 2).md');
	});

	it('increments suffix for directories when restored path is occupied', async () => {
		const item = makeStoredItem('1000', 'projects/archive', true);
		trashStore.setItems([item]);
		mockExists
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false)
			.mockResolvedValue(false);

		const result = await restoreItem(VAULT, item);

		expect(result).toBe('/Users/me/vault/projects/archive (restored 3)');
	});

	it('cleans up the empty timestamped container', async () => {
		const item = makeStoredItem('1000', 'a.md');
		trashStore.setItems([item]);

		await restoreItem(VAULT, item);

		expect(mockDeletePath).toHaveBeenCalledWith(VAULT, '/Users/me/vault/.kokobrain/trash/items/1000', true);
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
		mockRenamePath.mockRejectedValue(new Error('fail'));

		await expect(
			restoreItem(VAULT, item),
		).rejects.toThrow('fail');
	});
});

describe('deletePermanently', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		mockDeletePath.mockResolvedValue(undefined);
		mockWriteText.mockResolvedValue(undefined);
		mockExists.mockResolvedValue(true);
	});

	it('removes the item directory from disk', async () => {
		const item = makeStoredItem('1000', 'notes/old.md');
		trashStore.setItems([item]);

		const result = await deletePermanently(VAULT, item);

		expect(result).toBe(true);
		expect(mockDeletePath).toHaveBeenCalledWith(VAULT, '/Users/me/vault/.kokobrain/trash/items/1000', true);
		expect(trashStore.items).toHaveLength(0);
	});

	it('saves the manifest after deletion', async () => {
		const item = makeStoredItem('1000', 'a.md');
		const other = makeStoredItem('2000', 'b.md');
		trashStore.setItems([item, other]);

		await deletePermanently(VAULT, item);

		expect(mockWriteText).toHaveBeenCalled();
		const saved = JSON.parse(mockWriteText.mock.calls[0][2] as string);
		expect(saved).toHaveLength(1);
		expect(saved[0].id).toBe('2000');
	});

	it('throws on error', async () => {
		const item = makeStoredItem('1000', 'a.md');
		trashStore.setItems([item]);
		mockDeletePath.mockRejectedValue(new Error('fail'));

		await expect(
			deletePermanently(VAULT, item),
		).rejects.toThrow('fail');
	});
});

describe('emptyTrash', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		trashStore.clear();
		mockDeletePath.mockResolvedValue(undefined);
		mockWriteText.mockResolvedValue(undefined);
		mockExists.mockResolvedValue(true);
	});

	it('removes the entire items directory', async () => {
		trashStore.setItems([makeStoredItem('1000', 'a.md'), makeStoredItem('2000', 'b.md')]);

		const result = await emptyTrash(VAULT);

		expect(result).toBe(true);
		expect(mockDeletePath).toHaveBeenCalledWith(VAULT, '/Users/me/vault/.kokobrain/trash/items', true);
		expect(trashStore.items).toEqual([]);
		expect(trashStore.loading).toBe(false);
	});

	it('saves an empty manifest', async () => {
		trashStore.setItems([makeStoredItem('1000', 'a.md')]);

		await emptyTrash(VAULT);

		const saved = JSON.parse(mockWriteText.mock.calls[0][2] as string);
		expect(saved).toEqual([]);
	});

	it('skips delete if items directory does not exist', async () => {
		mockExists.mockResolvedValue(false);

		await emptyTrash(VAULT);

		expect(mockDeletePath).not.toHaveBeenCalled();
	});

	it('throws on error', async () => {
		mockDeletePath.mockRejectedValue(new Error('fail'));

		await expect(
			emptyTrash(VAULT),
		).rejects.toThrow('fail');
	});
});
