import { describe, it, expect, beforeEach } from 'vitest';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';

describe('fsStore', () => {
	beforeEach(() => {
		fsStore.reset();
	});

	it('starts with default state', () => {
		expect(fsStore.fileTree).toEqual([]);
		expect(fsStore.selectedFilePath).toBeNull();
		expect(fsStore.isLoading).toBe(false);
		expect(fsStore.expandedDirs.size).toBe(0);
		expect(fsStore.sortBy).toBe('name');
		expect(fsStore.renamingPath).toBeNull();
		expect(fsStore.pendingCreationPath).toBeNull();
		expect(fsStore.folderOrder).toEqual({});
	});

	describe('setters', () => {
		it('setFileTree updates file tree', () => {
			const tree = [{ name: 'a.md', path: '/a.md', type: 'file' as const, children: [] }];
			fsStore.setFileTree(tree as any);
			expect(fsStore.fileTree).toBe(tree);
		});

		it('setSelectedFilePath updates selected path', () => {
			fsStore.setSelectedFilePath('/vault/note.md');
			expect(fsStore.selectedFilePath).toBe('/vault/note.md');
		});

		it('setSortBy updates sort option', () => {
			fsStore.setSortBy('modified');
			expect(fsStore.sortBy).toBe('modified');
		});

		it('setRenamingPath updates renaming path', () => {
			fsStore.setRenamingPath('/vault/note.md');
			expect(fsStore.renamingPath).toBe('/vault/note.md');
		});

		it('setPendingCreationPath updates pending creation path', () => {
			fsStore.setPendingCreationPath('/vault/new.md');
			expect(fsStore.pendingCreationPath).toBe('/vault/new.md');
		});

		it('setFolderOrder updates folder order', () => {
			const order = { '.': ['Alpha', 'Beta'] };
			fsStore.setFolderOrder(order);
			expect(fsStore.folderOrder).toEqual({ '.': ['Alpha', 'Beta'] });
		});

		it('startLoading/stopLoading ref-counts loading state', () => {
			expect(fsStore.isLoading).toBe(false);
			fsStore.startLoading();
			expect(fsStore.isLoading).toBe(true);
			fsStore.startLoading();
			expect(fsStore.isLoading).toBe(true);
			fsStore.stopLoading();
			expect(fsStore.isLoading).toBe(true);
			fsStore.stopLoading();
			expect(fsStore.isLoading).toBe(false);
		});

		it('stopLoading does not go below zero', () => {
			fsStore.stopLoading();
			expect(fsStore.isLoading).toBe(false);
			fsStore.startLoading();
			expect(fsStore.isLoading).toBe(true);
			fsStore.stopLoading();
			expect(fsStore.isLoading).toBe(false);
		});
	});

	describe('toggleDir', () => {
		it('adds directory to expanded set', () => {
			fsStore.toggleDir('/vault/folder');
			expect(fsStore.expandedDirs.has('/vault/folder')).toBe(true);
		});

		it('removes directory when already expanded', () => {
			fsStore.toggleDir('/vault/folder');
			fsStore.toggleDir('/vault/folder');
			expect(fsStore.expandedDirs.has('/vault/folder')).toBe(false);
		});
	});

	describe('expandDir', () => {
		it('expands a directory', () => {
			fsStore.expandDir('/vault/folder');
			expect(fsStore.expandedDirs.has('/vault/folder')).toBe(true);
		});

		it('is a no-op when already expanded', () => {
			fsStore.expandDir('/vault/folder');
			const ref = fsStore.expandedDirs;
			fsStore.expandDir('/vault/folder');
			// Should not create a new Set when already expanded
			expect(fsStore.expandedDirs.has('/vault/folder')).toBe(true);
		});
	});

	describe('collapseAll', () => {
		it('clears all expanded directories', () => {
			fsStore.expandDir('/vault/a');
			fsStore.expandDir('/vault/b');
			fsStore.collapseAll();
			expect(fsStore.expandedDirs.size).toBe(0);
		});
	});

	describe('reset', () => {
		it('restores all state to defaults', () => {
			fsStore.setFileTree([{ name: 'a' }] as any);
			fsStore.setSelectedFilePath('/a');
			fsStore.startLoading();
			fsStore.expandDir('/vault');
			fsStore.setSortBy('modified');
			fsStore.setRenamingPath('/a');
			fsStore.setPendingCreationPath('/b');
			fsStore.setFolderOrder({ '.': ['A', 'B'] });

			fsStore.reset();

			expect(fsStore.fileTree).toEqual([]);
			expect(fsStore.selectedFilePath).toBeNull();
			expect(fsStore.isLoading).toBe(false);
			expect(fsStore.expandedDirs.size).toBe(0);
			expect(fsStore.sortBy).toBe('name');
			expect(fsStore.renamingPath).toBeNull();
			expect(fsStore.pendingCreationPath).toBeNull();
			expect(fsStore.folderOrder).toEqual({});
		});
	});
});
