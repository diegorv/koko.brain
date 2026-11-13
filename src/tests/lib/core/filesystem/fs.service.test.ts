import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

vi.mock('#lib/core/filesystem/link-updater.service.js', () => ({
	updateLinksAfterRename: vi.fn(),
	updateTabAfterRenameOrMove: vi.fn(),
}));

vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	closeTabsForDeletedPath: vi.fn(() => []),
	saveFileByPath: vi.fn(async () => true),
	// registerAppPorts wires the queryjs tab-close port through it.
	registerTabCloseListener: vi.fn(() => () => {}),
}));

vi.mock('#lib/utils/debug.js', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('#lib/core/trash/trash.service.js', () => ({
	moveToTrash: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, mkdir, remove, rename, exists, copyFile, readDir } from '@tauri-apps/plugin-fs';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { findNodeByPath, TargetExistsError } from '#lib/core/filesystem/fs.logic.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from '#lib/core/filesystem/link-updater.service.js';
import { closeTabsForDeletedPath } from '#lib/core/editor/editor.service.js';
import { markIndexed, isAlreadyIndexed, clearAllIndexed } from '#lib/utils/index-dedupe.js';
import { moveToTrash } from '#lib/core/trash/trash.service.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import { error, timeAsync, timeSync } from '#lib/utils/debug.js';
import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import {
	loadDirectoryTree,
	refreshTree,
	addToTree,
	loadFolderOrder,
	createFile,
	createFolder,
	deleteItem,
	renameItem,
	moveItem,
	resetFileSystem,
	duplicateItem,
	revealInSystemExplorer,
} from '#lib/core/filesystem/fs.service.js';
import { refreshViewDefinition, getCachedViewDefinition, clearAllViewParseCache } from '#lib/features/type-definitions/view-parse-cache.js';
import { makeFileNode, makeDirNode } from '../../../fixtures/tauri-api.fixture';
import { registerAppPorts } from '#lib/app/boot.js';

// The app shell registers the view-cache and quick-switcher path-change consumers.
registerAppPorts();

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

/** Seeds the collection property index with a bare record for every given path. */
function seedCollectionRecord(...paths: string[]): void {
	const index = new Map<string, PropertyIndexRecord>();
	for (const path of paths) {
		index.set(path, {
			path, name: path.split('/').pop() ?? '', basename: 'note', folder: '/vault',
			ext: 'md', mtime: 0, ctime: 0, size: 0, properties: new Map(),
		});
	}
	collectionStore.setPropertyIndex(index);
}

/** Position of the first `invoke(cmd, ...)` call, or -1 when it was never issued. */
function firstCallIndex(cmd: string): number {
	return vi.mocked(invoke).mock.calls.findIndex(([c]) => c === cmd);
}

/**
 * Asserts the search re-key was issued with these vault-relative keys and
 * before the sweep's first FTS removal, which would otherwise drop the rows
 * at the old keys first.
 */
function expectSearchRekeyBeforeSweep(from: string, to: string): void {
	expect(invoke).toHaveBeenCalledWith('rename_in_search_index', { from, to });
	const rekey = firstCallIndex('rename_in_search_index');
	const removal = firstCallIndex('remove_from_search_index');
	expect(removal).toBeGreaterThan(-1);
	expect(rekey).toBeLessThan(removal);
}

/** Seeds `fsStore.fileTree` with `/vault/dir` holding `a.md` and `b.md`. */
function seedDirWithTwoChildren(): void {
	fsStore.setFileTree([
		makeDirNode('dir', [
			makeFileNode({ name: 'a.md', path: '/vault/dir/a.md' }),
			makeFileNode({ name: 'b.md', path: '/vault/dir/b.md' }),
		], { path: '/vault/dir' }),
	]);
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

	it('times the IPC, the post-IPC JS and the store write apart', async () => {
		const mockTree = [makeFileNode({ name: 'note.md', path: '/vault/note.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(mockTree);

		await loadDirectoryTree('/vault');

		expect(fsStore.fileTree).toEqual(mockTree);
		expect(vi.mocked(timeAsync).mock.calls.map((c) => c[1])).toEqual(['loadDirectoryTree', 'loadDirectoryTree: ipc']);
		expect(vi.mocked(timeSync).mock.calls.map((c) => c[1])).toEqual(['loadDirectoryTree: order', 'loadDirectoryTree: set']);
	});

	it('keeps the newer tree when an older overlapping load resolves last', async () => {
		const olderTree = [makeFileNode({ name: 'old.md', path: '/vault/old.md' })];
		const newerTree = [makeFileNode({ name: 'new.md', path: '/vault/new.md' })];
		let resolveOlder!: (tree: unknown) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => { resolveOlder = r; }))
			.mockResolvedValueOnce(newerTree);

		const older = loadDirectoryTree('/vault');
		await loadDirectoryTree('/vault');
		expect(fsStore.fileTree).toEqual(newerTree);

		resolveOlder(olderTree);
		await older;

		expect(fsStore.fileTree).toEqual(newerTree);
		expect(fsStore.isLoading).toBe(false);
	});

	it('keeps a node added to the tree while a load is in flight', async () => {
		const staleTree = [makeFileNode({ name: 'old.md', path: '/vault/old.md' })];
		const diskTree = [
			makeFileNode({ name: 'new.md', path: '/vault/new.md' }),
			makeFileNode({ name: 'old.md', path: '/vault/old.md' }),
		];
		let resolveStale!: (tree: unknown) => void;
		vi.mocked(invoke)
			.mockImplementationOnce(() => new Promise((r) => { resolveStale = r; }))
			.mockResolvedValueOnce(diskTree);

		const initial = loadDirectoryTree('/vault');
		addToTree('/vault/new.md');
		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/new.md']);

		resolveStale(staleTree);
		await initial;

		await vi.waitFor(() => expect(fsStore.isLoading).toBe(false));
		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/new.md', '/vault/old.md']);
		expect(vi.mocked(invoke).mock.calls.filter((c) => c[0] === 'scan_vault')).toHaveLength(2);
	});

	it('adds to the tree with no scan when no load is in flight', () => {
		addToTree('/vault/new.md');

		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/new.md']);
		expect(invoke).not.toHaveBeenCalled();
	});

	it('invokes scan_vault with the name sort argument', async () => {
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
});

describe('createFile', () => {
	let unregister: () => void;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAllIndexed();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
		collectionStore.reset();
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister();
		collectionStore.reset();
	});

	it('feeds the new file to the registered note-change consumers', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);

		await createFile('/vault', 'new.md', '---\nstatus: draft\n---\n');

		expect(collectionStore.propertyIndex.get('/vault/new.md')?.properties.get('status')).toBe('draft');
		// The 'fs' policy row leaves the Rust index to `create_note` and
		// deliberately does NOT mark the dedupe signature.
		expect(invoke).not.toHaveBeenCalledWith('update_note_in_index', expect.anything());
		expect(isAlreadyIndexed('/vault/new.md', '---\nstatus: draft\n---\n')).toBe(false);
	});

	it('upserts a created note into FTS5 and semantic with its vault-relative key', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);

		await createFile('/vault/Events', 'Planning.md', 'Agenda items');

		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'Events/Planning.md',
			content: 'Agenda items',
			vaultPath: '/vault',
		});
		expect(invoke).toHaveBeenCalledWith('update_semantic_file', {
			filePath: 'Events/Planning.md',
			content: 'Agenda items',
			vaultPath: '/vault',
		});
	});

	it('skips the FTS5 and semantic upsert for a path outside the vault', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);

		const result = await createFile('/elsewhere', 'note.md', 'body');

		expect(result).toBe('/elsewhere/note.md');
		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
	});

	it('skips the FTS5 and semantic upsert for a non-Markdown file', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);

		await createFile('/vault', 'board.canvas', '{"nodes":[],"edges":[]}');

		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
	});

	it('skips the FTS5 and semantic upsert when no vault is open', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		vaultStore.close();

		await createFile('/vault', 'note.md', 'body');

		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
	});

	it('creates file with requested name when no conflicts', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		// Default invoke mock returns []; create_note returns undefined.

		const result = await createFile('/vault', 'new.md');

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/new.md', content: '' });
		expect(result).toBe('/vault/new.md');
	});

	it('generates unique name when file already exists', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'new.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);

		const result = await createFile('/vault', 'new.md');

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/new 1.md', content: '' });
		expect(result).toBe('/vault/new 1.md');
	});

	it('numbers a name that collides with an existing file only by case', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'New.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);

		const result = await createFile('/vault', 'new.md');

		expect(invoke).toHaveBeenCalledWith('create_note', { path: '/vault/new 1.md', content: '' });
		expect(result).toBe('/vault/new 1.md');
	});

	it('inserts the new file in sorted position without a vault scan', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		fsStore.setFileTree([
			makeDirNode('Daily', [
				makeFileNode({ name: 'Note 2.md', path: '/vault/Daily/Note 2.md' }),
				makeFileNode({ name: 'Note 10.md', path: '/vault/Daily/Note 10.md' }),
			]),
		]);

		await createFile('/vault/Daily', 'Note 3.md');

		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
		expect(fsStore.fileTree[0].children!.map((n) => n.name)).toEqual(['Note 2.md', 'Note 3.md', 'Note 10.md']);
		expect(fsStore.fileTree[0].children![1]).toMatchObject({ path: '/vault/Daily/Note 3.md', isDirectory: false });
		expect(fsStore.fileTree[0].children![1].modifiedAt).toEqual(expect.any(Number));
	});

	it('propagates a write error to the caller', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_note') throw new Error('write error');
			return [];
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(createFile('/vault', 'new.md')).rejects.toThrow('write error');

		consoleSpy.mockRestore();
	});

	it('passes initial content through to create_note so the index captures it', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);

		const result = await createFile('/vault', 'new.canvas', '{"nodes":[],"edges":[]}');

		expect(invoke).toHaveBeenCalledWith('create_note', {
			path: '/vault/new.canvas',
			content: '{"nodes":[],"edges":[]}',
		});
		expect(result).toBe('/vault/new.canvas');
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

	it('creates the folder and returns its path', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);

		const result = await createFolder('/vault', 'new-folder');

		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault/new-folder' });
		expect(result).toBe('/vault/new-folder');
	});

	it('generates unique name when folder already exists', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'new-folder', isDirectory: true, isFile: false, isSymlink: false },
		] as any);

		const result = await createFolder('/vault', 'new-folder');

		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault/new-folder 1' });
		expect(result).toBe('/vault/new-folder 1');
	});

	it('numbers a folder whose name differs from a sibling only by case', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'projects', isDirectory: true, isFile: false, isSymlink: false },
		] as any);

		const result = await createFolder('/vault', 'Projects');

		expect(invoke).toHaveBeenCalledWith('create_folder', { path: '/vault/Projects 1' });
		expect(result).toBe('/vault/Projects 1');
	});

	it('inserts the empty folder before the files without a vault scan', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		fsStore.setFileTree([makeFileNode({ name: 'a.md', path: '/vault/a.md' })]);

		await createFolder('/vault', 'zeta');

		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/zeta', '/vault/a.md']);
		expect(fsStore.fileTree[0]).toMatchObject({ isDirectory: true, children: [] });
	});

	it('propagates a mkdir error to the caller', async () => {
		vi.mocked(readDir).mockResolvedValue([] as any);
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'create_folder') throw new Error('mkdir error');
			return [];
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(createFolder('/vault', 'new-folder')).rejects.toThrow('mkdir error');

		consoleSpy.mockRestore();
	});
});

describe('deleteItem', () => {
	let unregister: () => void;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAllIndexed();
		collectionStore.reset();
		unregister = registerCollectionNoteChangeConsumer();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
		clearAllViewParseCache();
		vi.mocked(moveToTrash).mockResolvedValue(true);
	});

	afterEach(() => {
		unregister();
		collectionStore.reset();
	});

	it('moves item to trash', async () => {
		await deleteItem('/vault/note.md');

		expect(moveToTrash).toHaveBeenCalledWith('/vault', '/vault/note.md', false);
	});

	it('drops the deleted file from the explorer tree with no vault scan', async () => {
		fsStore.setFileTree([
			{ name: 'keep.md', path: '/vault/keep.md', isDirectory: false },
			{ name: 'note.md', path: '/vault/note.md', isDirectory: false },
		]);

		await deleteItem('/vault/note.md');

		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/keep.md']);
		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
	});

	it('passes isDirectory flag to moveToTrash', async () => {
		await deleteItem('/vault/folder', true);

		expect(moveToTrash).toHaveBeenCalledWith('/vault', '/vault/folder', true);
	});

	it('closes tabs and removes from index on delete', async () => {
		markIndexed('/vault/note.md', 'body');

		await deleteItem('/vault/note.md');

		expect(closeTabsForDeletedPath).toHaveBeenCalledWith('/vault/note.md');
		expect(isAlreadyIndexed('/vault/note.md', 'body')).toBe(false);
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/note.md' });
	});

	it('drops the FTS row and the semantic chunks for the deleted note', async () => {
		await deleteItem('/vault/note.md');

		// `forgetNote` supplies `vaultStore.path`, so both search tables are
		// purged by the delete itself. The watcher event is not a substitute:
		// it is skipped when the burst is all self-saves, when the burst is
		// directory-only, and above the incremental threshold.
		expect(invoke).toHaveBeenCalledWith('remove_from_search_index', { filePath: 'note.md' });
		expect(invoke).toHaveBeenCalledWith('remove_semantic_file', { filePath: 'note.md' });
	});

	it('drops the FTS row and the semantic chunks for EVERY child of a deleted folder', async () => {
		seedDirWithTwoChildren();

		await deleteItem('/vault/dir', true);

		// A folder delete reaches the watcher as one directory rename into the
		// trash, which the handler's directory-only filter discards - the child
		// walk here is the only thing that purges the children's rows.
		for (const child of ['dir/a.md', 'dir/b.md']) {
			expect(invoke).toHaveBeenCalledWith('remove_from_search_index', { filePath: child });
			expect(invoke).toHaveBeenCalledWith('remove_semantic_file', { filePath: child });
		}
	});

	it('SKIPS both search removals when no vault is open (no derivable key)', async () => {
		vaultStore.close();
		vi.mocked(remove).mockResolvedValue(undefined);

		await deleteItem('/vault/note.md');

		const commands = vi.mocked(invoke).mock.calls.map(([cmd]) => cmd);
		expect(commands).not.toContain('remove_from_search_index');
		expect(commands).not.toContain('remove_semantic_file');
	});

	it('falls back to permanent delete when no vault is open', async () => {
		vaultStore.close();
		vi.mocked(remove).mockResolvedValue(undefined);

		await deleteItem('/vault/note.md');

		expect(moveToTrash).not.toHaveBeenCalled();
		expect(remove).toHaveBeenCalledWith('/vault/note.md', { recursive: true });
	});

	it('propagates a trash error to the caller', async () => {
		vi.mocked(moveToTrash).mockRejectedValue(new Error('trash error'));

		await expect(deleteItem('/vault/note.md')).rejects.toThrow('trash error');
	});

	it('drops the deleted .view file from the view parse cache', async () => {
		const VIEW_PATH = '/vault/Task.view';
		const VIEW_YAML = 'source: notes\nviews:\n  - name: all\n';
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const path = String(p);
			if (path.endsWith('.kokobrain/folder-order.json')) return '{}';
			if (path === VIEW_PATH) return VIEW_YAML;
			throw new Error(`Unmocked readTextFile: ${path}`);
		});
		const viewReads = () =>
			vi.mocked(readTextFile).mock.calls.filter(([p]) => String(p) === VIEW_PATH).length;

		await refreshViewDefinition(VIEW_PATH);
		expect(viewReads()).toBe(1);

		await deleteItem(VIEW_PATH);

		// Cache must be empty for the deleted path, so the next lookup
		// re-reads from disk instead of serving the stale definition.
		await getCachedViewDefinition(VIEW_PATH);
		expect(viewReads()).toBe(2);
	});

	it('evicts the deleted note from the collection property index', async () => {
		seedCollectionRecord('/vault/note.md');

		await deleteItem('/vault/note.md');

		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(false);
	});

	it('evicts every child of a deleted FOLDER from the collection property index', async () => {
		seedCollectionRecord('/vault/dir/a.md', '/vault/dir/b.md');
		seedDirWithTwoChildren();

		await deleteItem('/vault/dir', true);

		// `forgetNote(dirPath)` alone drops a single exact key; the children
		// have to be walked out of the tree BEFORE the disk op, because the
		// tree loses the folder right after it.
		expect(collectionStore.propertyIndex.has('/vault/dir/a.md')).toBe(false);
		expect(collectionStore.propertyIndex.has('/vault/dir/b.md')).toBe(false);
	});
});

describe('renameItem', () => {
	let unregister: () => void;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAllIndexed();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
		collectionStore.reset();
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister();
		collectionStore.reset();
	});

	it('evicts the OLD path from the collection property index', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		seedCollectionRecord('/vault/old.md');

		await renameItem('/vault/old.md', 'new.md');

		// The destination is re-indexed by the watcher; the source must not linger.
		expect(collectionStore.propertyIndex.has('/vault/old.md')).toBe(false);
	});

	it('renames item if target does not exist', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(rename).toHaveBeenCalledWith('/vault/old.md', '/vault/new.md');
		expect(result).toBe('/vault/new.md');
	});

	it('re-sorts the renamed file in the tree with no vault scan, keeping its times', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		fsStore.setFileTree([
			makeDirNode('dir', []),
			makeFileNode({ name: 'b.md', path: '/vault/b.md' }),
			makeFileNode({ name: 'old.md', path: '/vault/old.md', modifiedAt: 7, createdAt: 3 }),
		]);

		await renameItem('/vault/old.md', 'a.md');

		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/dir', '/vault/a.md', '/vault/b.md']);
		expect(fsStore.fileTree[1]).toMatchObject({ name: 'a.md', modifiedAt: 7, createdAt: 3 });
	});

	it('moves the node in the tree after the link rewrite and before rename_note', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		fsStore.setFileTree([makeFileNode({ name: 'old.md', path: '/vault/old.md' })]);
		const seen: Record<string, string[]> = {};
		const paths = () => fsStore.fileTree.map((n) => n.path);
		vi.mocked(updateLinksAfterRename).mockImplementationOnce(async () => {
			seen.links = paths();
		});
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'rename_note') seen.renameNote = paths();
			return [];
		});

		await renameItem('/vault/old.md', 'new.md');

		expect(seen.links).toEqual(['/vault/old.md']);
		expect(seen.renameNote).toEqual(['/vault/new.md']);
	});

	it('keeps a tree patch that landed during the link rewrite', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		fsStore.setFileTree([makeFileNode({ name: 'old.md', path: '/vault/old.md' })]);
		vi.mocked(updateLinksAfterRename).mockImplementationOnce(async () => {
			// A watcher patch lands while the rename awaits the link rewrite.
			fsStore.setFileTree([...fsStore.fileTree, makeFileNode({ name: 'z.md', path: '/vault/z.md' })]);
		});

		await renameItem('/vault/old.md', 'new.md');

		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/new.md', '/vault/z.md']);
	});

	it('falls back to a vault scan when the renamed item is not in the tree', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		const scanned = [makeFileNode({ name: 'new.md', path: '/vault/new.md' })];
		vi.mocked(invoke).mockImplementation(async (cmd) => (cmd === 'scan_vault' ? scanned : []));

		await renameItem('/vault/old.md', 'new.md');

		expect(invoke).toHaveBeenCalledWith('scan_vault', { path: '/vault', sortBy: 'name' });
		expect(fsStore.fileTree).toEqual(scanned);
	});

	it('returns same path if name is unchanged', async () => {
		const result = await renameItem('/vault/note.md', 'note.md');

		expect(rename).not.toHaveBeenCalled();
		expect(result).toBe('/vault/note.md');
	});

	it('throws a named error if target already exists', async () => {
		vi.mocked(exists).mockResolvedValueOnce(true);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(renameItem('/vault/old.md', 'existing.md')).rejects.toThrow(
			'"existing.md" already exists in this folder',
		);

		expect(rename).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('updates tab path before link updater to prevent auto-save writing to old path', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		const callOrder: string[] = [];
		vi.mocked(updateLinksAfterRename).mockImplementation(async () => { callOrder.push('links'); });
		vi.mocked(updateTabAfterRenameOrMove).mockImplementation(() => { callOrder.push('tab'); });

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		expect(updateLinksAfterRename).toHaveBeenCalledWith('/vault/old.md', '/vault/new.md');
		expect(updateTabAfterRenameOrMove).toHaveBeenCalledWith('/vault/old.md', '/vault/new.md');
		expect(callOrder).toEqual(['tab', 'links']);
	});

	it('does not call link updater when rename target already exists', async () => {
		vi.mocked(exists).mockResolvedValueOnce(true);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(renameItem('/vault/old.md', 'existing.md')).rejects.toThrow();

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

	it('propagates a rename() error to the caller', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockRejectedValueOnce(new Error('rename error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(renameItem('/vault/old.md', 'new.md')).rejects.toThrow('rename error');

		consoleSpy.mockRestore();
	});

	it('renames the file on disk and returns the new path', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		expect(rename).toHaveBeenCalledWith('/vault/old.md', '/vault/new.md');
	});

	it('removes old path from tag index on successful rename', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/old.md' });
	});

	it('clears the dedupe signature for the abandoned path on rename (LB6)', async () => {
		markIndexed('/vault/old.md', 'identical bytes');
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		// A file later re-created at the abandoned path with identical bytes must
		// not be short-circuited by the dedupe guard in index-updater.service.
		expect(isAlreadyIndexed('/vault/old.md', 'identical bytes')).toBe(false);
	});

	it('evicts every child of a renamed FOLDER from the collection property index', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		seedCollectionRecord('/vault/dir/a.md', '/vault/dir/b.md');
		seedDirWithTwoChildren();

		const result = await renameItem('/vault/dir', 'dir2');

		expect(result).toBe('/vault/dir2');
		expect(collectionStore.propertyIndex.has('/vault/dir/a.md')).toBe(false);
		expect(collectionStore.propertyIndex.has('/vault/dir/b.md')).toBe(false);
	});

	it('clears the dedupe signature for every child of a renamed FOLDER', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		markIndexed('/vault/dir/a.md', 'identical bytes');
		markIndexed('/vault/dir/b.md', 'identical bytes');
		seedDirWithTwoChildren();

		const result = await renameItem('/vault/dir', 'dir2');

		expect(result).toBe('/vault/dir2');
		expect(isAlreadyIndexed('/vault/dir/a.md', 'identical bytes')).toBe(false);
		expect(isAlreadyIndexed('/vault/dir/b.md', 'identical bytes')).toBe(false);
	});

	it('re-keys the search rows of a renamed FOLDER before the removal sweep', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		seedDirWithTwoChildren();

		await renameItem('/vault/dir', 'renamed');

		// One call for the folder: Rust moves `dir` and every row under `dir/`.
		// The sweep's removals at the old keys then find nothing to drop.
		expectSearchRekeyBeforeSweep('dir', 'renamed');
	});

	it('re-keys the search rows of a renamed NOTE before the removal sweep', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		await renameItem('/vault/old.md', 'new.md');

		expectSearchRekeyBeforeSweep('old.md', 'new.md');
	});

	it('SKIPS the search re-key when no vault is open (no derivable key)', async () => {
		vaultStore.close();
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		await renameItem('/vault/old.md', 'new.md');

		expect(firstCallIndex('rename_in_search_index')).toBe(-1);
	});

	it('SKIPS the search re-key for a path outside the vault', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		await renameItem('/elsewhere/old.md', 'new.md');

		expect(firstCallIndex('rename_in_search_index')).toBe(-1);
	});

	it('logs a failed search re-key and still finishes the rename', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('db locked');
		vi.mocked(invoke).mockImplementation(async (cmd) => {
			if (cmd === 'rename_in_search_index') throw failure;
			return [];
		});

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		expect(error).toHaveBeenCalledWith('FS', 'rename_in_search_index failed:', failure);
		// The sweep after it still runs.
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/old.md' });
		expect(invoke).toHaveBeenCalledWith('remove_from_search_index', { filePath: 'old.md' });
	});

	it('drops every child .view of a renamed FOLDER from the view parse cache', async () => {
		const VIEW_PATH = '/vault/dir/Task.view';
		const VIEW_YAML = 'source: notes\nviews:\n  - name: all\n';
		clearAllViewParseCache();
		vi.mocked(readTextFile).mockImplementation(async (p) => {
			const path = String(p);
			if (path.endsWith('.kokobrain/folder-order.json')) return '{}';
			if (path === VIEW_PATH) return VIEW_YAML;
			throw new Error(`Unmocked readTextFile: ${path}`);
		});
		const viewReads = () =>
			vi.mocked(readTextFile).mock.calls.filter(([p]) => String(p) === VIEW_PATH).length;
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		fsStore.setFileTree([
			makeDirNode('dir', [
				makeFileNode({ name: 'Task.view', path: VIEW_PATH }),
			], { path: '/vault/dir' }),
		]);

		await refreshViewDefinition(VIEW_PATH);
		expect(viewReads()).toBe(1);

		await renameItem('/vault/dir', 'dir2');

		await getCachedViewDefinition(VIEW_PATH);
		expect(viewReads()).toBe(2);
	});

	it('drops the stale quick-switcher recent path on rename', async () => {
		quickSwitcherStore.reset();
		quickSwitcherStore.addRecentPath('/vault/old.md');
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await renameItem('/vault/old.md', 'new.md');

		expect(result).toBe('/vault/new.md');
		// The recent entry pointed at a path that no longer exists; opening it
		// from the quick switcher would fail. Dropped, not re-keyed.
		expect(quickSwitcherStore.recentPaths).not.toContain('/vault/old.md');
	});
});

describe('moveItem', () => {
	let unregister: () => void;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAllIndexed();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
		collectionStore.reset();
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister();
		collectionStore.reset();
	});

	it('evicts the OLD path from the collection property index', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		seedCollectionRecord('/vault/note.md');

		await moveItem('/vault/note.md', '/vault/folder');

		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(false);
	});

	it('moves file to target directory', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(rename).toHaveBeenCalledWith('/vault/note.md', '/vault/folder/note.md');
		expect(result).toBe('/vault/folder/note.md');
	});

	it('moves a folder with its subtree in the tree, with no vault scan', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		seedDirWithTwoChildren();
		fsStore.setFileTree([...fsStore.fileTree, makeDirNode('other', [makeFileNode({ name: 'x.md', path: '/vault/other/x.md' })])]);

		await moveItem('/vault/dir', '/vault/other');

		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/other']);
		const other = fsStore.fileTree[0].children!;
		expect(other.map((n) => n.path)).toEqual(['/vault/other/dir', '/vault/other/x.md']);
		expect(other[0].children!.map((n) => n.path)).toEqual(['/vault/other/dir/a.md', '/vault/other/dir/b.md']);
	});

	it('returns null if source and target are the same', async () => {
		const result = await moveItem('/vault/folder/note.md', '/vault/folder');

		expect(rename).not.toHaveBeenCalled();
		expect(result).toBeNull();
	});

	it('throws a named error if target already exists', async () => {
		vi.mocked(exists).mockResolvedValueOnce(true);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(moveItem('/vault/note.md', '/vault/folder')).rejects.toThrow(
			'"note.md" already exists in this folder',
		);

		expect(rename).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('throws a TargetExistsError on a taken name, so a caller can tell a clash from a disk failure', async () => {
		vi.mocked(exists).mockResolvedValueOnce(true);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(moveItem('/vault/note.md', '/vault/folder')).rejects.toBeInstanceOf(TargetExistsError);
		// A clash is a user-facing outcome each caller handles, not an app error for Sentry.
		expect(error).not.toHaveBeenCalled();

		consoleSpy.mockRestore();
	});

	it('moves under a new name in one step: tab and links follow to the new path', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/inbox/Untitled Task.md', '/vault/work/tasks', 'Untitled Task 2.md');

		expect(result).toBe('/vault/work/tasks/Untitled Task 2.md');
		expect(exists).toHaveBeenCalledWith('/vault/work/tasks/Untitled Task 2.md');
		expect(rename).toHaveBeenCalledTimes(1);
		expect(rename).toHaveBeenCalledWith('/vault/inbox/Untitled Task.md', '/vault/work/tasks/Untitled Task 2.md');
		expect(updateTabAfterRenameOrMove).toHaveBeenCalledWith('/vault/inbox/Untitled Task.md', '/vault/work/tasks/Untitled Task 2.md');
		expect(updateLinksAfterRename).toHaveBeenCalledWith('/vault/inbox/Untitled Task.md', '/vault/work/tasks/Untitled Task 2.md');
	});

	it('refuses a new name the target folder already holds', async () => {
		vi.mocked(exists).mockResolvedValueOnce(true);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(moveItem('/vault/inbox/Untitled Task.md', '/vault/work/tasks', 'Untitled Task 2.md')).rejects.toThrow(
			'"Untitled Task 2.md" already exists in this folder',
		);

		expect(rename).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it('calls the tab updater on move, and the link updater with an unchanged note name', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/subfolder');

		expect(result).toBe('/vault/subfolder/note.md');
		expect(updateTabAfterRenameOrMove).toHaveBeenCalledWith('/vault/note.md', '/vault/subfolder/note.md');
		// `applyPathChange` routes rename and move through the same step. A move
		// without a new name keeps the note name, so the real `updateLinksAfterRename`
		// early-returns on its own same-name guard (pinned by
		// link-updater.service.test.ts) and rewrites nothing.
		expect(updateLinksAfterRename).toHaveBeenCalledWith('/vault/note.md', '/vault/subfolder/note.md');
	});

	it('propagates a rename() error to the caller', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockRejectedValueOnce(new Error('rename error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(moveItem('/vault/note.md', '/vault/folder')).rejects.toThrow('rename error');
		expect(error).toHaveBeenCalledWith('FS', 'Failed to move item:', expect.objectContaining({ message: 'rename error' }));

		consoleSpy.mockRestore();
	});

	it('moves the file on disk and returns the new path', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(result).toBe('/vault/folder/note.md');
		expect(rename).toHaveBeenCalledWith('/vault/note.md', '/vault/folder/note.md');
	});

	it('removes old path from tag index on successful move', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(result).toBe('/vault/folder/note.md');
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/note.md' });
	});

	it('drops the OLD path from the FTS and semantic tables on move', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		await moveItem('/vault/note.md', '/vault/folder');

		expect(invoke).toHaveBeenCalledWith('remove_from_search_index', { filePath: 'note.md' });
		expect(invoke).toHaveBeenCalledWith('remove_semantic_file', { filePath: 'note.md' });
	});

	it('re-keys the search rows of a moved FOLDER before the removal sweep', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		seedDirWithTwoChildren();

		await moveItem('/vault/dir', '/vault/other');

		expectSearchRekeyBeforeSweep('dir', 'other/dir');
	});

	it('re-keys the search rows of a moved NOTE before the removal sweep', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		await moveItem('/vault/note.md', '/vault/folder');

		expectSearchRekeyBeforeSweep('note.md', 'folder/note.md');
	});

	it('clears the dedupe signature for the abandoned path on move (LB6)', async () => {
		markIndexed('/vault/note.md', 'identical bytes');
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);

		const result = await moveItem('/vault/note.md', '/vault/folder');

		expect(result).toBe('/vault/folder/note.md');
		// A file later re-created at the abandoned path with identical bytes must
		// not be short-circuited by the dedupe guard in index-updater.service.
		expect(isAlreadyIndexed('/vault/note.md', 'identical bytes')).toBe(false);
	});

	it('evicts every child of a moved FOLDER from the collection property index', async () => {
		vi.mocked(exists).mockResolvedValueOnce(false);
		vi.mocked(rename).mockResolvedValue(undefined);
		seedCollectionRecord('/vault/dir/a.md', '/vault/dir/b.md');
		seedDirWithTwoChildren();

		const result = await moveItem('/vault/dir', '/vault/other');

		expect(result).toBe('/vault/other/dir');
		expect(collectionStore.propertyIndex.has('/vault/dir/a.md')).toBe(false);
		expect(collectionStore.propertyIndex.has('/vault/dir/b.md')).toBe(false);
	});
});

describe('path-change consumers', () => {
	/** Every `(from, to)` the recording consumer received, in order. */
	let changes: [string, string | null][];
	let unregister: () => void;

	beforeEach(() => {
		vi.clearAllMocks();
		clearAllIndexed();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
		vi.mocked(moveToTrash).mockResolvedValue(true);
		changes = [];
		unregister = registerPathChangeConsumer({ name: 'recorder', pathChanged: (from, to) => changes.push([from, to]) });
	});

	afterEach(() => {
		unregister();
	});

	it('reports a rename with its old and new path', async () => {
		vi.mocked(rename).mockResolvedValue(undefined);

		await renameItem('/vault/old.md', 'new.md');

		expect(changes).toEqual([['/vault/old.md', '/vault/new.md']]);
	});

	it('reports a folder move once, for the folder', async () => {
		seedDirWithTwoChildren();
		vi.mocked(rename).mockResolvedValue(undefined);

		await moveItem('/vault/dir', '/vault/archive');

		expect(changes).toEqual([['/vault/dir', '/vault/archive/dir']]);
	});

	it('reports a delete with a null destination', async () => {
		await deleteItem('/vault/note.md');

		expect(changes).toEqual([['/vault/note.md', null]]);
	});

	it('reports the change before the link rewrite awaits', async () => {
		vi.mocked(rename).mockResolvedValue(undefined);
		let seenByLinkUpdater: [string, string | null][] = [];
		vi.mocked(updateLinksAfterRename).mockImplementationOnce(async () => {
			seenByLinkUpdater = [...changes];
		});

		await renameItem('/vault/old.md', 'new.md');

		expect(seenByLinkUpdater).toEqual([['/vault/old.md', '/vault/new.md']]);
	});

	it('reports nothing when the disk operation fails', async () => {
		vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));

		await expect(renameItem('/vault/old.md', 'new.md')).rejects.toThrow('permission denied');

		expect(changes).toEqual([]);
	});

	it('reports nothing once unregistered', async () => {
		vi.mocked(rename).mockResolvedValue(undefined);
		unregister();

		await renameItem('/vault/old.md', 'new.md');

		expect(changes).toEqual([]);
	});

	it('isolates a throwing consumer: the change completes and later consumers still run', async () => {
		vi.mocked(rename).mockResolvedValue(undefined);
		unregister();
		const unregisterThrower = registerPathChangeConsumer({ name: 'thrower', pathChanged: () => { throw new Error('boom'); } });
		unregister = registerPathChangeConsumer({ name: 'recorder', pathChanged: (from, to) => changes.push([from, to]) });

		try {
			expect(await renameItem('/vault/old.md', 'new.md')).toBe('/vault/new.md');
		} finally {
			unregisterThrower();
		}

		expect(changes).toEqual([['/vault/old.md', '/vault/new.md']]);
		expect(error).toHaveBeenCalledWith('FS', 'thrower path change failed:', expect.any(Error));
	});

	describe('settled', () => {
		/** Every `(from, to)` the settled step received, with the IPC commands issued before it. */
		let settled: { from: string; to: string; commandsBefore: string[] }[];
		let unregisterSettled: () => void;

		beforeEach(() => {
			settled = [];
			unregisterSettled = registerPathChangeConsumer({
				name: 'settler',
				pathChanged: () => {},
				settled: (from, to) => {
					settled.push({ from, to, commandsBefore: vi.mocked(invoke).mock.calls.map(([c]) => c) });
				},
			});
		});

		afterEach(() => {
			unregisterSettled();
		});

		it('receives a rename once, after the Rust and search re-keys', async () => {
			vi.mocked(rename).mockResolvedValue(undefined);

			await renameItem('/vault/old.md', 'new.md');

			expect(settled.map(({ from, to }) => [from, to])).toEqual([['/vault/old.md', '/vault/new.md']]);
			expect(settled[0].commandsBefore).toEqual(expect.arrayContaining(['rename_note', 'rename_in_search_index']));
		});

		it('receives a folder move once, for the folder, after the tree is re-keyed', async () => {
			seedDirWithTwoChildren();
			vi.mocked(rename).mockResolvedValue(undefined);
			let treeHadMovedChild = false;
			unregisterSettled();
			unregisterSettled = registerPathChangeConsumer({
				name: 'settler',
				pathChanged: () => {},
				settled: (from, to) => {
					settled.push({ from, to, commandsBefore: vi.mocked(invoke).mock.calls.map(([c]) => c) });
					treeHadMovedChild = findNodeByPath(fsStore.fileTree, '/vault/archive/dir/a.md') !== null;
				},
			});

			await moveItem('/vault/dir', '/vault/archive');

			expect(settled.map(({ from, to }) => [from, to])).toEqual([['/vault/dir', '/vault/archive/dir']]);
			expect(settled[0].commandsBefore).toEqual(expect.arrayContaining(['rename_note', 'rename_in_search_index']));
			expect(treeHadMovedChild).toBe(true);
		});

		it('is not called for a delete', async () => {
			await deleteItem('/vault/note.md');

			expect(changes).toEqual([['/vault/note.md', null]]);
			expect(settled).toEqual([]);
		});

		it('is not called when the disk operation fails', async () => {
			vi.mocked(rename).mockRejectedValueOnce(new Error('permission denied'));

			await expect(renameItem('/vault/old.md', 'new.md')).rejects.toThrow('permission denied');

			expect(settled).toEqual([]);
		});

		it('is not called when the link rewrite rejects', async () => {
			vi.mocked(rename).mockResolvedValue(undefined);
			vi.mocked(updateLinksAfterRename).mockRejectedValueOnce(new Error('backlinks failed'));

			await expect(renameItem('/vault/old.md', 'new.md')).rejects.toThrow('backlinks failed');

			expect(changes).toEqual([['/vault/old.md', '/vault/new.md']]);
			expect(settled).toEqual([]);
		});

		it('isolates a throwing settled step: it is logged and a later consumer still settles', async () => {
			vi.mocked(rename).mockResolvedValue(undefined);
			unregisterSettled();
			const unregisterThrower = registerPathChangeConsumer({
				name: 'thrower',
				pathChanged: () => {},
				settled: () => { throw new Error('boom'); },
			});
			unregisterSettled = registerPathChangeConsumer({
				name: 'settler',
				pathChanged: () => {},
				settled: (from, to) => { settled.push({ from, to, commandsBefore: [] }); },
			});

			try {
				expect(await renameItem('/vault/old.md', 'new.md')).toBe('/vault/new.md');
			} finally {
				unregisterThrower();
			}

			expect(settled.map(({ from, to }) => [from, to])).toEqual([['/vault/old.md', '/vault/new.md']]);
			expect(error).toHaveBeenCalledWith('FS', 'thrower settled failed:', expect.any(Error));
		});
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

		resetFileSystem();

		expect(fsStore.fileTree).toEqual([]);
		expect(fsStore.isLoading).toBe(false);
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

	it('inserts a duplicated file next to the original without a vault scan', async () => {
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'note.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);
		vi.mocked(copyFile).mockResolvedValue(undefined);
		fsStore.setFileTree([
			makeFileNode({ name: 'note.md', path: '/vault/note.md' }),
			makeFileNode({ name: 'zz.md', path: '/vault/zz.md' }),
		]);

		await duplicateItem('/vault/note.md', false);

		expect(invoke).not.toHaveBeenCalledWith('scan_vault', expect.anything());
		expect(fsStore.fileTree.map((n) => n.name)).toEqual(['note copy.md', 'note.md', 'zz.md']);
	});

	it('inserts a duplicated folder with its scanned subtree, scanning only the copy', async () => {
		vi.mocked(readDir)
			.mockResolvedValueOnce([
				{ name: 'docs', isDirectory: true, isFile: false, isSymlink: false },
			] as any)
			.mockResolvedValueOnce([
				{ name: 'file.md', isDirectory: false, isFile: true, isSymlink: false },
			] as any);
		vi.mocked(copyFile).mockResolvedValue(undefined);
		const copied = [makeFileNode({ name: 'file.md', path: '/vault/docs copy/file.md' })];
		vi.mocked(invoke).mockImplementation(async (cmd, args) => {
			if (cmd === 'scan_vault' && (args as { path: string }).path === '/vault/docs copy') return copied;
			return [];
		});
		fsStore.setFileTree([makeDirNode('docs', [makeFileNode({ name: 'file.md', path: '/vault/docs/file.md' })])]);

		await duplicateItem('/vault/docs', true);

		expect(invoke).not.toHaveBeenCalledWith('scan_vault', { path: '/vault', sortBy: 'name' });
		expect(fsStore.fileTree.map((n) => n.path)).toEqual(['/vault/docs', '/vault/docs copy']);
		expect(fsStore.fileTree[1].children).toEqual(copied);
	});

	it('propagates a read error to the caller', async () => {
		vi.mocked(readDir).mockRejectedValue(new Error('read error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(duplicateItem('/vault/note.md', false)).rejects.toThrow('read error');

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

// The prompt index refresh is asked by the user's own entry points (the
// note-list row menu, Cmd+N, + New here), never by the fs services: auto-organize
// and vault mods call these directly, and their bursts must stay throttled.
describe('prompt index refresh', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		setupDefaultMocks();
		vi.mocked(rename).mockResolvedValue(undefined);
		vi.mocked(copyFile).mockResolvedValue(undefined);
		vi.mocked(moveToTrash).mockResolvedValue(true);
		vi.mocked(readDir).mockResolvedValue([
			{ name: 'note.md', isDirectory: false, isFile: true, isSymlink: false },
		] as any);
	});

	it.each([
		['renameItem', () => renameItem('/vault/note.md', 'new.md'), '/vault/new.md'],
		['moveItem', () => moveItem('/vault/note.md', '/vault/folder'), '/vault/folder/note.md'],
		['deleteItem', () => deleteItem('/vault/note.md'), undefined],
		['duplicateItem', () => duplicateItem('/vault/note.md', false), '/vault/note copy.md'],
		['createFile', () => createFile('/vault', 'fresh.md', ''), '/vault/fresh.md'],
	])('%s called directly asks for none', async (_label, op, expected) => {
		await expect(op()).resolves.toBe(expected);

		expect(vaultStore.takePromptIndexRefresh()).toBe(false);
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

	it('loadDirectoryTree populates tree', async () => {
		const tree = [makeFileNode({ name: 'note.md', path: '/vault/note.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(tree);

		await loadDirectoryTree('/vault');

		expect(fsStore.fileTree).toHaveLength(1);
	});

	it('resetFileSystem clears pre-existing state', async () => {
		// Build up state
		const tree = [makeFileNode({ name: 'note.md', path: '/vault/note.md' })];
		vi.mocked(invoke).mockResolvedValueOnce(tree);
		await loadDirectoryTree('/vault');

		expect(fsStore.fileTree).toHaveLength(1);

		// Reset everything
		resetFileSystem();

		expect(fsStore.fileTree).toEqual([]);
	});
});
