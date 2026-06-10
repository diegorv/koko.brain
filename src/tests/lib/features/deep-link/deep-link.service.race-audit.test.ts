/**
 * AUDIT TESTS: Demonstrate deep-link data-loss bugs.
 *
 * Bug 3.5: Deep-link reads from DISK, not from dirty editor tab.
 *   After write, editor still has stale content -> next auto-save overwrites deep-link changes.
 *
 * Bug 3.7: Deep-link calls markRecentSave (suppressing watcher) but never calls
 *   notifyAfterSave or any index update. All indexes stay stale until manual save.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('@tauri-apps/plugin-deep-link', () => ({
	onOpenUrl: vi.fn(() => Promise.resolve(vi.fn())),
	getCurrent: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/plugin-clipboard-manager', () => ({
	readText: vi.fn(() => Promise.resolve('')),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(() => Promise.resolve()),
	syncExternalContentToEditor: vi.fn(),
}));

vi.mock('$lib/core/note-creator/note-creator.service', () => ({
	openOrCreateNote: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	openOrCreateDailyNote: vi.fn(() => Promise.resolve()),
}));

// periodic-notes.logic is pure logic (CLAUDE.md: never mock .logic). These
// race-audit tests only exercise `type: 'new'` writes, which never call
// buildPeriodicNotePath, so no mock is needed.

vi.mock('$lib/core/filesystem/fs.service', () => ({
	refreshTree: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	markRecentSave: vi.fn(),
	notifyAfterSave: vi.fn(),
}));

import { exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { syncExternalContentToEditor } from '$lib/core/editor/editor.service';
import { markRecentSave, notifyAfterSave } from '$lib/core/editor/editor.hooks';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { deepLinkStore } from '$lib/features/deep-link/deep-link.store.svelte';
import { executePendingAction } from '$lib/features/deep-link/deep-link.service';

describe('AUDIT: deep-link data integrity (P0 bugs)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		editorStore.reset();
		vaultStore._reset();
		vaultStore.open('/vault');
		deepLinkStore.reset();
	});

	describe('Bug 3.7: deep-link writes must call notifyAfterSave for index updates', () => {
		it('calls notifyAfterSave after appending content to existing file', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue('existing content');
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			deepLinkStore.setPendingAction({
				type: 'new',
				vault: 'test',
				content: 'appended text',
				append: true,
				name: 'note.md',
			});

			await executePendingAction();

			expect(markRecentSave).toHaveBeenCalledWith('/vault/note.md');
			expect(notifyAfterSave).toHaveBeenCalledWith(
				'/vault/note.md',
				expect.any(String),
			);
		});

		it('calls notifyAfterSave after prepending content to existing file', async () => {
			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue('existing content');
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			deepLinkStore.setPendingAction({
				type: 'new',
				vault: 'test',
				content: 'prepended text',
				prepend: true,
				name: 'note.md',
			});

			await executePendingAction();

			expect(notifyAfterSave).toHaveBeenCalledWith(
				'/vault/note.md',
				expect.any(String),
			);
		});
	});

	describe('Bug 3.5: deep-link must sync content to editor after write', () => {
		it('syncs new content to editor when target file is already open in a tab', async () => {
			// Set up: file is open in a tab (simulates user having it open)
			editorStore.addTab({
				path: '/vault/note.md',
				name: 'note.md',
				content: 'dirty editor content',
				savedContent: 'saved content on disk',
			});

			vi.mocked(exists).mockResolvedValue(true);
			vi.mocked(readTextFile).mockResolvedValue('saved content on disk');
			vi.mocked(writeTextFile).mockResolvedValue(undefined);

			deepLinkStore.setPendingAction({
				type: 'new',
				vault: 'test',
				content: 'appended text',
				append: true,
				name: 'note.md',
			});

			await executePendingAction();

			expect(syncExternalContentToEditor).toHaveBeenCalledWith(
				'/vault/note.md',
				expect.stringContaining('appended text'),
			);
		});
	});
});
