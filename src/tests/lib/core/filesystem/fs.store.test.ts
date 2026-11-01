import { describe, it, expect, beforeEach } from 'vitest';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';

describe('fsStore', () => {
	beforeEach(() => {
		fsStore.reset();
	});

	it('starts with default state', () => {
		expect(fsStore.fileTree).toEqual([]);
		expect(fsStore.selectedFilePath).toBeNull();
		expect(fsStore.isLoading).toBe(false);
		expect(fsStore.renamingPath).toBeNull();
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

		it('setRenamingPath updates renaming path', () => {
			fsStore.setRenamingPath('/vault/note.md');
			expect(fsStore.renamingPath).toBe('/vault/note.md');
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

	describe('reset', () => {
		it('restores all state to defaults', () => {
			fsStore.setFileTree([{ name: 'a' }] as any);
			fsStore.setSelectedFilePath('/a');
			fsStore.startLoading();
			fsStore.setRenamingPath('/a');
			fsStore.setFolderOrder({ '.': ['A', 'B'] });

			fsStore.reset();

			expect(fsStore.fileTree).toEqual([]);
			expect(fsStore.selectedFilePath).toBeNull();
			expect(fsStore.isLoading).toBe(false);
				expect(fsStore.renamingPath).toBeNull();
				expect(fsStore.folderOrder).toEqual({});
		});
	});
});
