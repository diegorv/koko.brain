import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// toggleFavoriteForPath writes a note by path: the Tauri boundaries, the
// editor's save and the toast are mocked; the frontmatter writer is real.
vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	syncExternalContentToEditor: vi.fn(),
	saveFileByPath: vi.fn(),
}));

vi.mock('#lib/utils/log.service.js', () => ({
	appendLog: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn() },
}));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { saveFileByPath, syncExternalContentToEditor } from '#lib/core/editor/editor.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { toggleFavoriteForPath } from '#lib/features/properties/lifecycle.service.js';
import { registerCollectionNoteChangeConsumer } from '#lib/features/collection/collection.service.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { clearAllIndexed } from '#lib/utils/index-dedupe.js';

describe('toggleFavoriteForPath', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(saveFileByPath).mockResolvedValue(true);
		// The write runs `notifyAfterSave` -> `applyNoteChange`, which calls `invoke`.
		vi.mocked(invoke).mockResolvedValue(undefined as never);
	});

	afterEach(() => {
		vaultStore._reset();
		editorStore.reset();
		clearLocalStorage();
	});

	it('adds _favorite: true to frontmatter', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/note.md',
			expect.stringContaining('_favorite: true'),
		);
		expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
			path: '/vault/note.md',
			content: expect.stringContaining('_favorite: true'),
		});
	});

	it('asks for the index refresh to skip its throttle, so the sidebar follows the click', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(vaultStore.takePromptIndexRefresh()).toBe(true);
	});

	it('sets _favorite: false when unfavoriting', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n_favorite: true\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', false);

		expect(writeTextFile).toHaveBeenCalledWith(
			'/vault/note.md',
			expect.stringContaining('_favorite: false'),
		);
	});

	it('patches an open dirty tab from its own content, keeping the body edit, and saves it', async () => {
		editorStore.addTab({
			path: '/vault/note.md',
			name: 'note',
			content: '---\ntype: Project\n---\n\n# Unsaved edit\n',
			savedContent: '---\ntype: Project\n---\n\n# My Note\n',
		});

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(readTextFile).not.toHaveBeenCalled();
		expect(writeTextFile).not.toHaveBeenCalled();
		const [path, content, markClean] = vi.mocked(syncExternalContentToEditor).mock.calls[0];
		expect(path).toBe('/vault/note.md');
		expect(content).toContain('_favorite: true');
		expect(content).toContain('# Unsaved edit');
		expect(markClean).toBe(false);
		expect(saveFileByPath).toHaveBeenCalledWith('/vault/note.md');
	});

	it('refuses lossy frontmatter: no write, error toast', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\n# keep me\ntype: Project\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(writeTextFile).not.toHaveBeenCalled();
		expect(toast.error).toHaveBeenCalledWith(
			"note.md: The note's frontmatter has comments; it cannot be rewritten without losing them",
		);
	});

	it('propagates a read error', async () => {
		vi.mocked(readTextFile).mockRejectedValue(new Error('EACCES'));

		await expect(toggleFavoriteForPath('/vault/note.md', true)).rejects.toThrow('EACCES');
		expect(toast.error).not.toHaveBeenCalled();
	});
});

describe('toggleFavoriteForPath note-change indexing', () => {
	let unregister: (() => void) | null = null;

	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		editorStore.reset();
		clearAllIndexed();
		collectionStore.reset();
		vi.mocked(invoke).mockResolvedValue(undefined as never);
		// `updateNoteFrontmatter` checks the closed note still exists before writing.
		vi.mocked(exists).mockResolvedValue(true);
		unregister = registerCollectionNoteChangeConsumer();
	});

	afterEach(() => {
		unregister?.();
		unregister = null;
		collectionStore.reset();
		vaultStore._reset();
		clearLocalStorage();
	});

	it('indexes the written bytes into the real property index', async () => {
		vi.mocked(readTextFile).mockResolvedValue('---\ntype: Project\n---\n\n# My Note\n');

		await toggleFavoriteForPath('/vault/note.md', true);

		expect(collectionStore.propertyIndex.get('/vault/note.md')?.properties.get('_favorite')).toBe(true);
	});
});
