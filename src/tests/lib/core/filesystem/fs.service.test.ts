import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	rename: vi.fn(),
	exists: vi.fn(),
	copyFile: vi.fn(),
	readDir: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-opener', () => ({
	revealItemInDir: vi.fn(),
}));

vi.mock('$lib/core/filesystem/link-updater.service', () => ({
	updateLinksAfterRename: vi.fn(),
	updateTabAfterRenameOrMove: vi.fn(),
}));

vi.mock('$lib/features/bookmarks/bookmarks.service', () => ({
	updateBookmarkPathsAfterMove: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.service', () => ({
	updateFileIconPathsAfterMove: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	closeTabsForDeletedPath: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	removeFileFromIndex: vi.fn(),
}));

vi.mock('$lib/features/tags/tags.service', () => ({
	removeFileFromTagIndex: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('$lib/core/trash/trash.service', () => ({
	moveToTrash: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, mkdir, remove, rename, exists, copyFile, readDir } from '@tauri-apps/plugin-fs';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from '$lib/core/filesystem/link-updater.service';
import { updateBookmarkPathsAfterMove } from '$lib/features/bookmarks/bookmarks.service';
import { updateFileIconPathsAfterMove } from '$lib/features/file-icons/file-icons.service';
import { closeTabsForDeletedPath } from '$lib/core/editor/editor.service';
import { removeFileFromIndex } from '$lib/features/backlinks/backlinks.service';
import { removeFileFromTagIndex } from '$lib/features/tags/tags.service';
import { moveToTrash } from '$lib/core/trash/trash.service';
import { error } from '$lib/utils/debug';
import {
	loadDirectoryTree,
	refreshTree,
	loadFolderOrder,
	createFile,
	createFolder,
	deleteItem,
	renameItem,
	moveItem,
	changeSortOption,
	resetFileSystem,
	duplicateItem,
	revealInSystemExplorer,
} from '$lib/core/filesystem/fs.service';
import { makeFileNode, makeDirNode } from '../../../fixtures/tauri-api.fixture';

/**
 * Default mock for exists() — returns true for .kokobrain/folder-order.json,
 * false for everything else. Tests can override with mockResolvedValueOnce.
 */
function setupDefaultMocks() {
	vi.mocked(exists).mockImplementation(async (p) => {
		const path = String(p);
		if (path.endsWith('.kokobrain/folder-order.json')) return true;
		return false;
	});
	vi.mocked(readTextFile).mockImplementation(async (p) => {
		const path = String(p);
		if (path.endsWith('.kokobrain/folder-order.json')) return '{}';
		throw new Error(`Unmocked readTextFile: ${path}`);
	});
	vi.mocked(invoke).mockResolvedValue([]);
	vi.mocked(writeTextFile).mockResolvedValue(undefined);
	vi.mocked(mkdir).mockResolvedValue(undefined);
}

describe('loadFolderOrder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		setupDefaultMocks();
	});

	it('creates template file when folder-order.json does not exist', async () => {
		vi.mocked(exists).mockImplementation(async (p) => {
			const path = String(p);
			if (path.endsWith('.kokobrain/folder-order.json')) return false;
			return false;
		});

		const result = await loadFolderOrder('/vault');

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/.kokobrain/folder-order.json',
			expect.stringContaining('_comment'),
		);
		expect(result).toEqual({});
		expect(fsStore.folderOrder).toEqual({});
	});

	it('creates .kokobrain directory with recursive flag when folder-order.json does not exist', async () => {
		vi.mocked(exists).mockImplementation(async (p) => {
			const path = String(p);
			if (path.endsWith('.kokobrain/folder-order.json')) return false;
			return false;
		});

		await loadFolderOrder('/vault');

		expect(mkdir).toHaveBeenCalledWith('/vault/.kokobrain', { recursive: true });
	});

	it('parses valid folder order and filters underscore-prefixed keys', async () => {
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			if (String(p).endsWith('.kokobrain/folder-order.json')) {
				return JSON.stringify({
					_comment: 'this is a comment',
					_example: { '.': ['A'] },
					'.': ['Projects', 'Archive'],
					'Projects': ['active', 'backlog'],
				});
			}
			throw new Error(`Unmocked readTextFile: ${p}`);
		});

		const result = await loadFolderOrder('/vault');

		expect(result).toEqual({
			'.': ['Projects', 'Archive'],
			'Projects': ['active', 'backlog'],
		});
		expect(fsStore.folderOrder).toEqual(result);
	});

	it('returns empty object for invalid JSON', async () => {
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			if (String(p).endsWith('.kokobrain/folder-order.json')) return 'not valid json';
			throw new Error(`Unmocked readTextFile: ${p}`);
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await loadFolderOrder('/vault');

		expect(result).toEqual({});
		expect(fsStore.folderOrder).toEqual({});
		consoleSpy.mockRestore();
	});

	it('returns empty object when JSON is an array', async () => {
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			if (String(p).endsWith('.kokobrain/folder-order.json')) return '["a", "b"]';
			throw new Error(`Unmocked readTextFile: ${p}`);
		});

		const result = await loadFolderOrder('/vault');

		expect(result).toEqual({});
		expect(fsStore.folderOrder).toEqual({});
	});

	it('returns empty object when JSON is null', async () => {
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			if (String(p).endsWith('.kokobrain/folder-order.json')) return 'null';
			throw new Error(`Unmocked readTextFile: ${p}`);
		});

		const result = await loadFolderOrder('/vault');

		expect(result).toEqual({});
		expect(fsStore.folderOrder).toEqual({});
	});

	it('skips entries with non-string-array values', async () => {
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			if (String(p).endsWith('.kokobrain/folder-order.json')) {
				return JSON.stringify({
					'.': ['Valid'],
					'bad-number': [1, 2, 3],
					'bad-string': 'not an array',
					'bad-mixed': ['a', 1],
				});
			}
			throw new Error(`Unmocked readTextFile: ${p}`);
		});

		const result = await loadFolderOrder('/vault');

		expect(result).toEqual({ '.': ['Valid'] });
	});
});

describe('loadDirectoryTree', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('populates file tree from scan_vault result', async () => {
		const mockTree = [
			makeFileNode({ name: 'note.md', path: '/vault/note.md' }),
			makeFileNode({ name: 'readme.md', path: '/vault/readme.md' }),
		];
		vi.mocked(invoke).mockResolvedValueOnce(mockTree);

		await loadDirectoryTree('/vault');

		expect(fsStore.fileTree).toEqual(mockTree);
		expect(fsStore.isLoading).toBe(false);
	});

	it('passes current sortBy to scan_vault', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);

		await loadDirectoryTree('/vault');

		expect(invoke).toHaveBeenCalledWith('scan_vault', { path: '/vault', sortBy: 'name' });
	});

	it('sets loading to false even on error', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('scan error'));

		await loadDirectoryTree('/vault').catch(() => {});

		expect(fsStore.isLoading).toBe(false);
	});

	it('loads and applies folder order from .kokobrain/folder-order.json', async () => {
		const tree = [
			makeDirNode('Zebra', [], { path: '/vault/Zebra' }),
			makeDirNode('Alpha', [], { path: '/vault/Alpha' }),
			makeFileNode({ name: 'note.md', path: '/vault/note.md' }),
		];
		vi.mocked(invoke).mockResolvedValueOnce(tree);
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			if (String(p).endsWith('.kokobrain/folder-order.json')) {
				return JSON.stringify({ '.': ['Alpha', 'Zebra'] });
			}
			throw new Error(`Unmocked readTextFile: ${p}`);
		});

		await loadDirectoryTree('/vault');

		expect(fsStore.folderOrder).toEqual({ '.': ['Alpha', 'Zebra'] });
		// Folders should be reordered: Alpha first, then Zebra, then files
		expect(fsStore.fileTree[0].name).toBe('Alpha');
		expect(fsStore.fileTree[1].name).toBe('Zebra');
		expect(fsStore.fileTree[2].name).toBe('note.md');
	});
});

describe('refreshTree', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		resetFileSystem();
		vaultStore._reset();
		setupDefaultMocks();
	});

	it('delegates to loadDirectoryTree with the current vault path', async () => {
		vaultStore.open('/vault');
		const tree = [makeFileNode({ name: 'note.md', path: '/vault/note.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(tree);

		await refreshTree();

		expect(invoke).toHaveBeenCalledWith('scan_vault', { path: '/vault', sortBy: 'name' });
		expect(fsStore.fileTree).toEqual(tree);
	});

	it('does nothing when no vault is open', async () => {
		// vaultStore not opened — path is null
		vaultStore.close();
		await refreshTree();

		expect(invoke).not.toHaveBeenCalled();
		expect(fsStore.fileTree).toEqual([]);
	});

	it('passes expectedSortVersion through to loadDirectoryTree', async () => {
		vaultStore.open('/vault');
		// First bump sortVersion by calling changeSortOption (sortVersion → 1)
		vi.mocked(invoke).mockResolvedValueOnce([]);
		await changeSortOption('modified');

		// Now call refreshTree with a stale version (0) — result should be discarded
		const staleTree = [makeFileNode({ name: 'stale.md', path: '/vault/stale.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(staleTree);

		await refreshTree(0);

		// Tree should NOT have the stale result (version mismatch)
		expect(fsStore.fileTree).not.toEqual(staleTree);
	});
});

describe('loadDirectoryTree — stale version discard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		resetFileSystem();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('discards result when expectedSortVersion does not match current sortVersion', async () => {
		// Populate initial tree
		const initialTree = [makeFileNode({ name: 'initial.md', path: '/vault/initial.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(initialTree);
		await loadDirectoryTree('/vault');
		expect(fsStore.fileTree).toEqual(initialTree);

		// Bump sortVersion to 1 via changeSortOption
		vi.mocked(invoke).mockResolvedValueOnce(initialTree);
		await changeSortOption('modified');

		// Call loadDirectoryTree with stale version (0) — should discard
		const staleTree = [makeFileNode({ name: 'stale.md', path: '/vault/stale.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(staleTree);
		await loadDirectoryTree('/vault', 0);

		// Tree should still have the result from changeSortOption, not the stale one
		expect(fsStore.fileTree).toEqual(initialTree);
	});

	it('applies result when expectedSortVersion matches current sortVersion', async () => {
		// Bump sortVersion to 1
		vi.mocked(invoke).mockResolvedValueOnce([]);
		await changeSortOption('modified');

		// Call with matching version — should apply
		const newTree = [makeFileNode({ name: 'fresh.md', path: '/vault/fresh.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(newTree);
		await loadDirectoryTree('/vault', 1);

		expect(fsStore.fileTree).toEqual(newTree);
	});

	it('applies result when expectedSortVersion is undefined (no version check)', async () => {
		// Bump sortVersion
		vi.mocked(invoke).mockResolvedValueOnce([]);
		await changeSortOption('modified');

		// Call without expectedSortVersion — should always apply
		const newTree = [makeFileNode({ name: 'fresh.md', path: '/vault/fresh.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(newTree);
		await loadDirectoryTree('/vault');

		expect(fsStore.fileTree).toEqual(newTree);
	});
});

describe('createFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('creates file with requested name when no conflicts', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const result = await createFile('/vault', 'new.md');

		expect(writeTextFile).toHaveBeenCalledWith('/vault/new.md', '');
		expect(result).toBe('/vault/new.md');
	});

	it('generates unique name when file already exists', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'new.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		const result = await createFile('/vault', 'new.md');

		expect(writeTextFile).toHaveBeenCalledWith('/vault/new 1.md', '');
		expect(result).toBe('/vault/new 1.md');
	});

	it('returns null on write error', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		vi.mocked(writeTextFile).mockRejectedValueOnce(new Error('write error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await createFile('/vault', 'new.md');

		expect(result).toBeNull();
		consoleSpy.mockRestore();
	});
});

describe('createFolder', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('creates folder and expands it in the tree', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);

		const result = await createFolder('/vault', 'new-folder');

		expect(mkdir).toHaveBeenCalledWith('/vault/new-folder');
		expect(fsStore.expandedDirs.has('/vault/new-folder')).toBe(true);
		expect(result).toBe('/vault/new-folder');
	});

	it('generates unique name when folder already exists', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'new-folder', isDirectory: true, isFile: false, isSymlink: false },
		] as any);

		const result = await createFolder('/vault', 'new-folder');

		expect(mkdir).toHaveBeenCalledWith('/vault/new-folder 1');
		expect(fsStore.expandedDirs.has('/vault/new-folder 1')).toBe(true);
		expect(result).toBe('/vault/new-folder 1');
	});

	it('returns null on mkdir error', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		vi.mocked(mkdir).mockRejectedValueOnce(new Error('mkdir error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await createFolder('/vault', 'new-folder');

		expect(result).toBeNull();
		consoleSpy.mockRestore();
	});
});

describe('deleteItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
		vi.mocked(moveToTrash).mockResolvedValue(true);
	});

	it('moves item to trash and returns true', async () => {
		const result = await deleteItem('/vault/note.md');

		expect(moveToTrash).toHaveBeenCalledWith('/vault', '/vault/note.md', false);
		expect(result).toBe(true);
	});

	it('passes isDirectory flag to moveToTrash', async () => {
		await deleteItem('/vault/folder', true);

		expect(moveToTrash).toHaveBeenCalledWith('/vault', '/vault/folder', true);
	});

	it('closes tabs and removes from backlinks index on delete', async () => {
		const result = await deleteItem('/vault/note.md');

		expect(result).toBe(true);
		expect(closeTabsForDeletedPath).toHaveBeenCalledWith('/vault/note.md');
		expect(removeFileFromIndex).toHaveBeenCalledWith('/vault/note.md');
		expect(removeFileFromTagIndex).toHaveBeenCalledWith('/vault/note.md');
	});

	it('falls back to permanent delete when no vault is open', async () => {
		vaultStore.close();
		vi.mocked(remove).mockResolvedValue(undefined);

		const result = await deleteItem('/vault/note.md');

		expect(moveToTrash).not.toHaveBeenCalled();
		expect(remove).toHaveBeenCalledWith('/vault/note.md', { recursive: true });
		expect(result).toBe(true);
	});

	it('returns false on error', async () => {
		vi.mocked(moveToTrash).mockRejectedValue(new Error('trash error'));

		const result = await deleteItem('/vault/note.md');

		expect(result).toBe(false);
	});
});

describe('renameItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('renames item if target does not exist', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(rename).toHaveBeenCalledWith('/vault/old.md', '/vault/new.md');
		expect(result).toBe('/vault/new.md');
	});

	it('returns same path if name is unchanged', async () => {
		const result = await renameItem('/vault/note.md', 'note.md');

		expect(rename).not.toHaveBeenCalled();
		expect(result).toBe('/vault/note.md');
	});

	it('returns null if target already exists', async () => {
		vi.mocked(exists).mockResolvedValueOnce(true);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await renameItem('/vault/old.md', 'existing.md');

		expect(rename).not.toHaveBeenCalled();
		expect(result).toBeNull();
		consoleSpy.mockRestore();
	});

	it('calls link updater before tab updater so excludePath matches noteContents key', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		const callOrder: string[] = [];
		vi.mocked(updateLinksAfterRename).mockImplementation(async () => { callOrder.push('links'); });
		vi.mocked(updateTabAfterRenameOrMove).mockImplementation(() => { callOrder.push('tab'); });

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		expect(updateLinksAfterRename).toHaveBeenCalledWith('/vault/old.md', '/vault/new.md');
		expect(updateTabAfterRenameOrMove).toHaveBeenCalledWith('/vault/old.md', '/vault/new.md');
		expect(callOrder).toEqual(['links', 'tab']);
	});

	it('does not call link updater when rename target already exists', async () => {
		vi.mocked(exists).mockResolvedValueOnce(true);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await renameItem('/vault/old.md', 'existing.md');

		expect(result).toBeNull();
		expect(updateTabAfterRenameOrMove).not.toHaveBeenCalled();
		expect(updateLinksAfterRename).not.toHaveBeenCalled();
	});

	it('does not update links for non-markdown files', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/image.png', 'renamed.png');

		expect(result).toBe('/vault/renamed.png');
		expect(updateTabAfterRenameOrMove).toHaveBeenCalledWith('/vault/image.png', '/vault/renamed.png');
		expect(updateLinksAfterRename).not.toHaveBeenCalled();
	});

	it('returns null when rename() throws', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockRejectedValueOnce(new Error('rename error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBeNull();
		consoleSpy.mockRestore();
	});

	it('updates bookmark and file-icon paths on successful rename', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		expect(rename).toHaveBeenCalledWith('/vault/old.md', '/vault/new.md');
		expect(updateBookmarkPathsAfterMove).toHaveBeenCalledWith('/vault', '/vault/old.md', '/vault/new.md');
		expect(updateFileIconPathsAfterMove).toHaveBeenCalledWith('/vault', '/vault/old.md', '/vault/new.md');
	});

	it('removes old path from tag index on successful rename', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		expect(removeFileFromTagIndex).toHaveBeenCalledWith('/vault/old.md');
	});
});

describe('moveItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('moves file to target directory and expands it', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(rename).toHaveBeenCalledWith('/vault/note.md', '/vault/folder/note.md');
		expect(fsStore.expandedDirs.has('/vault/folder')).toBe(true);
		expect(result).toBe('/vault/folder/note.md');
	});

	it('returns null if source and target are the same', async () => {
		const result = await moveItem('/vault/folder/note.md', '/vault/folder');

		expect(rename).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});

	it('returns null if target already exists', async () => {
		vi.mocked(exists).mockResolvedValueOnce(true);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(rename).not.toHaveBeenCalled();
		expect(result).toBeNull();
		consoleSpy.mockRestore();
	});

	it('calls tab updater but not link updater on move', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/subfolder');

		expect(result).toBe('/vault/subfolder/note.md');
		expect(fsStore.expandedDirs.has('/vault/subfolder')).toBe(true);
		expect(updateTabAfterRenameOrMove).toHaveBeenCalledWith('/vault/note.md', '/vault/subfolder/note.md');
		expect(updateLinksAfterRename).not.toHaveBeenCalled();
	});

	it('returns null when rename() throws', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockRejectedValueOnce(new Error('rename error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(result).toBeNull();
		consoleSpy.mockRestore();
	});

	it('updates bookmark and file-icon paths on successful move', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(result).toBe('/vault/folder/note.md');
		expect(rename).toHaveBeenCalledWith('/vault/note.md', '/vault/folder/note.md');
		expect(updateBookmarkPathsAfterMove).toHaveBeenCalledWith('/vault', '/vault/note.md', '/vault/folder/note.md');
		expect(updateFileIconPathsAfterMove).toHaveBeenCalledWith('/vault', '/vault/note.md', '/vault/folder/note.md');
	});

	it('removes old path from tag index on successful move', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(result).toBe('/vault/folder/note.md');
		expect(removeFileFromTagIndex).toHaveBeenCalledWith('/vault/note.md');
	});
});

describe('changeSortOption', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('updates sort option in store', async () => {
		await changeSortOption('modified');

		expect(fsStore.sortBy).toBe('modified');
	});
});

describe('resetFileSystem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
	});

	it('resets all file system state', () => {
		// Pre-populate store with data
		fsStore.setFileTree([makeFileNode()]);
		fsStore.setSelectedFilePath('/vault/note.md');
		fsStore.setSortBy('modified');
		fsStore.expandDir('/vault/folder');

		resetFileSystem();

		expect(fsStore.fileTree).toEqual([]);
		expect(fsStore.selectedFilePath).toBeNull();
		expect(fsStore.isLoading).toBe(false);
		expect(fsStore.sortBy).toBe('name');
		expect(fsStore.expandedDirs.size).toBe(0);
	});
});

describe('duplicateItem', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('duplicates a file with copy name', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'note.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);
		vi.mocked(copyFile).mockResolvedValue(undefined);

		const result = await duplicateItem('/vault/note.md', false);

		expect(copyFile).toHaveBeenCalledWith('/vault/note.md', '/vault/note copy.md');
		expect(result).toBe('/vault/note copy.md');
	});

	it('generates incremented name when copy already exists', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'note.md', isDirectory: false, isFile: true, isSymlink: false },
			{ name: 'note copy.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);
		vi.mocked(copyFile).mockResolvedValue(undefined);

		const result = await duplicateItem('/vault/note.md', false);

		expect(copyFile).toHaveBeenCalledWith('/vault/note.md', '/vault/note copy 2.md');
		expect(result).toBe('/vault/note copy 2.md');
	});

	it('duplicates a directory recursively', async () => {
		vi.mocked(readDir)
			.mockResolvedValueOnce([
				{ name: 'docs', isDirectory: true, isFile: false, isSymlink: false },
			] as any)
			.mockResolvedValueOnce([
				{ name: 'file.md', isDirectory: false, isFile: true, isSymlink: false },
			] as any);
		vi.mocked(copyFile).mockResolvedValue(undefined);

		const result = await duplicateItem('/vault/docs', true);

		expect(mkdir).toHaveBeenCalledWith('/vault/docs copy');
		expect(copyFile).toHaveBeenCalledWith('/vault/docs/file.md', '/vault/docs copy/file.md');
		expect(result).toBe('/vault/docs copy');
	});

	it('returns null on error', async () => {
		vi.mocked(readDir).mockRejectedValue(new Error('read error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await duplicateItem('/vault/note.md', false);

		expect(result).toBeNull();
		consoleSpy.mockRestore();
	});
});

describe('revealInSystemExplorer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
	});

	it('calls revealItemInDir with the path', async () => {
		vi.mocked(revealItemInDir).mockResolvedValue(undefined);

		await revealInSystemExplorer('/vault/note.md');

		expect(revealItemInDir).toHaveBeenCalledWith('/vault/note.md');
	});

	it('handles errors gracefully', async () => {
		vi.mocked(revealItemInDir).mockRejectedValue(new Error('not supported'));

		// Should not throw — errors are caught and logged
		await expect(revealInSystemExplorer('/vault/note.md')).resolves.toBeUndefined();
		expect(error).toHaveBeenCalled();
	});
});

describe('state transitions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
	});

	it('loadDirectoryTree populates tree and preserves selected file', async () => {
		fsStore.setSelectedFilePath('/vault/note.md');
		const tree = [makeFileNode({ name: 'note.md', path: '/vault/note.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(tree);

		await loadDirectoryTree('/vault');

		expect(fsStore.fileTree).toHaveLength(1);
		expect(fsStore.selectedFilePath).toBe('/vault/note.md');
	});

	it('changeSortOption updates sortBy and triggers tree reload', async () => {
		expect(fsStore.sortBy).toBe('name');

		const tree = [makeFileNode({ name: 'a.md', path: '/vault/a.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(tree);

		await changeSortOption('modified');

		expect(fsStore.sortBy).toBe('modified');
		expect(invoke).toHaveBeenCalledWith('scan_vault', { path: '/vault', sortBy: 'modified' });
	});

	it('resetFileSystem resets sortVersion so stale sort results are not discarded', async () => {
		// Increment sortVersion via changeSortOption
		const tree = [makeFileNode({ name: 'a.md', path: '/vault/a.md' })];
		vi.mocked(invoke).mockResolvedValue(tree);
		await changeSortOption('modified');
		vi.clearAllMocks();

		// Reset — sortVersion should go back to 0
		resetFileSystem();

		// After reset, a new changeSortOption should work normally
		// (if sortVersion wasn't reset, the internal counter would be stale)
		vi.mocked(invoke).mockResolvedValue(tree);
		await changeSortOption('name');

		expect(fsStore.sortBy).toBe('name');
		expect(fsStore.fileTree).toHaveLength(1);
	});

	it('resetFileSystem clears pre-existing state', async () => {
		// Build up state
		const tree = [makeFileNode({ name: 'note.md', path: '/vault/note.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(tree);
		await loadDirectoryTree('/vault');
		fsStore.expandDir('/vault/folder');

		expect(fsStore.fileTree).toHaveLength(1);
		expect(fsStore.expandedDirs.size).toBeGreaterThan(0);

		// Reset everything
		resetFileSystem();

		expect(fsStore.fileTree).toEqual([]);
		expect(fsStore.expandedDirs.size).toBe(0);
		expect(fsStore.sortBy).toBe('name');
	});
});
