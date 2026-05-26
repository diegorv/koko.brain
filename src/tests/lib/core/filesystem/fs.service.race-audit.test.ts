/**
 * AUDIT TESTS: Demonstrate P0 data-loss race conditions in file mutation operations.
 *
 * These tests verify the ORDERING of tab-close/tab-update relative to disk operations.
 * The bug: deleteItem/renameItem/moveItem perform disk operations BEFORE closing/updating
 * tabs, creating a window where the auto-save debounce (2s) can fire with a stale path,
 * recreating deleted files or creating duplicates.
 *
 * Each test asserts the CORRECT behavior (tab closed/updated BEFORE disk op).
 * They FAIL against the current code, proving the race condition exists.
 */
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

vi.mock('$lib/features/file-icons/file-icons.service', () => ({}));

vi.mock('$lib/core/editor/editor.service', () => ({
	closeTabsForDeletedPath: vi.fn(),
}));

vi.mock('$lib/utils/index-dedupe', () => ({
	clearIndexedEntry: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('$lib/core/trash/trash.service', () => ({
	moveToTrash: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { rename, exists } from '@tauri-apps/plugin-fs';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from '$lib/core/filesystem/link-updater.service';
import { closeTabsForDeletedPath } from '$lib/core/editor/editor.service';
import { moveToTrash } from '$lib/core/trash/trash.service';
import {
	deleteItem,
	renameItem,
	moveItem,
} from '$lib/core/filesystem/fs.service';

describe('AUDIT: file mutation ordering (P0 race conditions)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		fsStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		vi.mocked(exists).mockResolvedValue(false);
		vi.mocked(invoke).mockResolvedValue([]);
	});

	describe('deleteItem: tab must close BEFORE disk move', () => {
		it('closes tabs before moving file to trash to prevent auto-save resurrection', async () => {
			const callOrder: string[] = [];

			vi.mocked(moveToTrash).mockImplementation(async () => {
				callOrder.push('moveToTrash');
				return true;
			});

			vi.mocked(closeTabsForDeletedPath).mockImplementation(() => {
				callOrder.push('closeTabsForDeletedPath');
			});

			await deleteItem('/vault/note.md');

			// CORRECT behavior: tab is closed BEFORE the file is moved to trash.
			// This prevents the auto-save debounce from writing to the old path
			// during the async gap between moveToTrash and closeTabsForDeletedPath.
			expect(callOrder.indexOf('closeTabsForDeletedPath'))
				.toBeLessThan(callOrder.indexOf('moveToTrash'));
		});
	});

	describe('renameItem: tab path must update BEFORE link updates', () => {
		it('updates tab path immediately after rename, before updateLinksAfterRename', async () => {
			const callOrder: string[] = [];

			vi.mocked(rename).mockImplementation(async () => {
				callOrder.push('rename');
			});

			vi.mocked(updateLinksAfterRename).mockImplementation(async () => {
				callOrder.push('updateLinksAfterRename');
			});

			vi.mocked(updateTabAfterRenameOrMove).mockImplementation(() => {
				callOrder.push('updateTabAfterRenameOrMove');
			});

			await renameItem('/vault/old.md', 'new.md');

			// CORRECT behavior: tab path is updated immediately after rename(),
			// BEFORE updateLinksAfterRename. This prevents the auto-save from
			// writing to the old path during the link update (which can take
			// 10-500ms for vaults with many backlinkers).
			const renameIdx = callOrder.indexOf('rename');
			const tabUpdateIdx = callOrder.indexOf('updateTabAfterRenameOrMove');
			const linkUpdateIdx = callOrder.indexOf('updateLinksAfterRename');

			expect(renameIdx).toBeLessThan(tabUpdateIdx);
			expect(tabUpdateIdx).toBeLessThan(linkUpdateIdx);
		});
	});

	describe('moveItem: tab path must update BEFORE refreshTree', () => {
		it('updates tab path immediately after rename, before refreshTree', async () => {
			const callOrder: string[] = [];

			vi.mocked(rename).mockImplementation(async () => {
				callOrder.push('rename');
			});

			// refreshTree calls invoke('scan_vault', ...) internally
			vi.mocked(invoke).mockImplementation(async (cmd) => {
				if (cmd === 'scan_vault') {
					callOrder.push('refreshTree:scan_vault');
				}
				return [];
			});

			vi.mocked(updateTabAfterRenameOrMove).mockImplementation(() => {
				callOrder.push('updateTabAfterRenameOrMove');
			});

			await moveItem('/vault/note.md', '/vault/subfolder');

			// CORRECT behavior: tab path is updated immediately after rename(),
			// BEFORE refreshTree (which is an async IPC round-trip of 10-50ms).
			// The current code calls refreshTree BEFORE updateTabAfterRenameOrMove,
			// creating a wider race window for auto-save.
			const renameIdx = callOrder.indexOf('rename');
			const tabUpdateIdx = callOrder.indexOf('updateTabAfterRenameOrMove');
			const refreshIdx = callOrder.indexOf('refreshTree:scan_vault');

			expect(renameIdx).toBeLessThan(tabUpdateIdx);
			expect(tabUpdateIdx).toBeLessThan(refreshIdx);
		});
	});
});
