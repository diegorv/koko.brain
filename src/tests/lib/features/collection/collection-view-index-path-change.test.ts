// The view index remembered per view file follows renames, moves and
// deletes made through the real fs.service and path-change owner; only the
// Tauri boundary is mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
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
vi.mock('@tauri-apps/plugin-opener', () => ({ revealItemInDir: vi.fn() }));
vi.mock('#lib/core/trash/trash.service.js', () => ({ moveToTrash: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ closeTabsForDeletedPath: vi.fn(() => []) }));
vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

import { invoke } from '@tauri-apps/api/core';
import { exists, rename } from '@tauri-apps/plugin-fs';
import { moveToTrash } from '#lib/core/trash/trash.service.js';
import { deleteItem, renameItem } from '#lib/core/filesystem/fs.service.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { registerCollectionPathChangeConsumer } from '#lib/features/collection/collection.service.js';

const WORK = '/vault/Work';
const BOARD = `${WORK}/board.view`;

let unregister: (() => void) | null = null;

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	collectionStore.reset();
	fsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault');
	fsStore.setFileTree([
		{ name: 'Work', path: WORK, isDirectory: true, children: [{ name: 'board.view', path: BOARD, isDirectory: false }] },
	]);
	// The tree rescan after the move reads an empty vault.
	vi.mocked(invoke).mockResolvedValue([]);
	vi.mocked(exists).mockResolvedValue(false);
	vi.mocked(rename).mockResolvedValue(undefined);
	vi.mocked(moveToTrash).mockResolvedValue(true);
	unregister = registerCollectionPathChangeConsumer();
});

afterEach(() => {
	unregister?.();
	unregister = null;
	vi.restoreAllMocks();
});

describe('registerCollectionPathChangeConsumer', () => {
	it('carries the remembered view index to a renamed view file', async () => {
		collectionStore.setViewIndex(BOARD, 2);

		await renameItem(BOARD, 'tasks.view');

		expect(collectionStore.getViewIndex(`${WORK}/tasks.view`)).toBe(2);
		expect(collectionStore.getViewIndex(BOARD)).toBeUndefined();
	});

	it('carries the index of a view inside a renamed folder', async () => {
		collectionStore.setViewIndex(BOARD, 1);

		await renameItem(WORK, 'Job');

		expect(collectionStore.getViewIndex('/vault/Job/board.view')).toBe(1);
		expect(collectionStore.viewIndexPaths()).toEqual(['/vault/Job/board.view']);
	});

	it('drops the index of a deleted view file', async () => {
		collectionStore.setViewIndex(BOARD, 2);

		await deleteItem(BOARD, false);

		expect(collectionStore.viewIndexPaths()).toEqual([]);
	});

	it('leaves other files alone, including a sibling sharing the name prefix', async () => {
		collectionStore.setViewIndex(BOARD, 2);
		collectionStore.setViewIndex('/vault/Workshop/x.view', 1);

		await renameItem('/vault/Personal', 'Home');
		await renameItem(WORK, 'Job');

		expect(collectionStore.getViewIndex('/vault/Workshop/x.view')).toBe(1);
	});

	it('leaves the index alone when the rename fails', async () => {
		collectionStore.setViewIndex(BOARD, 2);
		vi.mocked(rename).mockRejectedValue(new Error('Permission denied'));

		await expect(renameItem(BOARD, 'tasks.view')).rejects.toThrow('Permission denied');

		expect(collectionStore.getViewIndex(BOARD)).toBe(2);
	});

	it('stops following once unregistered', async () => {
		collectionStore.setViewIndex(BOARD, 2);
		unregister?.();
		unregister = null;

		await renameItem(BOARD, 'tasks.view');

		expect(collectionStore.getViewIndex(BOARD)).toBe(2);
	});
});
