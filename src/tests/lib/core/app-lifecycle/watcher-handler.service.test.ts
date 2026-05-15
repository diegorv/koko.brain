import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('$lib/api', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	rebuildIndex: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/features/collection/collection.service', () => ({
	buildPropertyIndex: vi.fn(),
	updateNoteInIndex: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.service', () => ({
	buildFrontmatterIconIndex: vi.fn().mockResolvedValue(undefined),
	updateFrontmatterIconForFile: vi.fn(),
}));

vi.mock('$lib/utils/index-dedupe', () => ({
	clearIndexedEntry: vi.fn(),
}));

vi.mock('$lib/plugins/calendar/calendar.service', () => ({
	scanFilesForCalendar: vi.fn(),
	updateCalendarForFile: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	areAllRecentSaves: vi.fn(() => false),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	logProcessMemory: vi.fn(),
}));

import { invoke } from '$lib/api';
import { error as debugError } from '$lib/utils/debug';
import { rebuildIndex } from '$lib/features/backlinks/backlinks.service';
import { buildPropertyIndex, updateNoteInIndex } from '$lib/features/collection/collection.service';
import { buildFrontmatterIconIndex, updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { scanFilesForCalendar, updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { clearIndexedEntry } from '$lib/utils/index-dedupe';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { areAllRecentSaves } from '$lib/core/editor/editor.hooks';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { rebuildAllIndexes } from '$lib/core/app-lifecycle/watcher-handler.service';

describe('rebuildAllIndexes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('rebuilds all vault-wide indexes from disk', async () => {
		await rebuildAllIndexes();

		expect(rebuildIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});

	it('calls rebuildIndex before derived indexes', async () => {
		const callOrder: string[] = [];
		vi.mocked(rebuildIndex).mockImplementation(async () => { callOrder.push('rebuildIndex'); });
		vi.mocked(buildPropertyIndex).mockImplementation(async () => { callOrder.push('buildPropertyIndex'); });

		await rebuildAllIndexes();

		expect(callOrder[0]).toBe('rebuildIndex');
		expect(callOrder.indexOf('buildPropertyIndex')).toBeGreaterThan(0);
	});
});

describe('rebuildAllIndexes — self-save detection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('skips rebuild when all changed file paths are recent self-saves', async () => {
		vi.mocked(areAllRecentSaves).mockReturnValue(true);

		await rebuildAllIndexes(['/vault/note.md']);

		expect(areAllRecentSaves).toHaveBeenCalledWith(['/vault/note.md']);
		expect(rebuildIndex).not.toHaveBeenCalled();
		expect(buildPropertyIndex).not.toHaveBeenCalled();
	});

	it('does not clear recent saves — lets TTL handle cleanup', async () => {
		vi.mocked(areAllRecentSaves).mockReturnValue(true);

		await rebuildAllIndexes(['/vault/note.md']);

		// areAllRecentSaves is checked but markers are NOT cleared,
		// so subsequent watcher batches can still detect the self-save
		expect(areAllRecentSaves).toHaveBeenCalled();
	});

	it('skips rebuild when all paths are directories (no file paths)', async () => {
		await rebuildAllIndexes(['/vault/_notes', '/vault/_notes/2026', '/vault/_notes/2026/02-Feb']);

		expect(areAllRecentSaves).not.toHaveBeenCalled();
		expect(rebuildIndex).not.toHaveBeenCalled();
		expect(buildPropertyIndex).not.toHaveBeenCalled();
	});

	it('skips rebuild when mixed directory + self-save file paths', async () => {
		vi.mocked(areAllRecentSaves).mockReturnValue(true);

		await rebuildAllIndexes(['/vault/_notes/2026', '/vault/note.md', '/vault/_notes']);

		// Only file paths are checked against recentSaves
		expect(areAllRecentSaves).toHaveBeenCalledWith(['/vault/note.md']);
		expect(rebuildIndex).not.toHaveBeenCalled();
	});

	it('performs full rebuild when some paths are not recent saves', async () => {
		vi.mocked(areAllRecentSaves).mockReturnValue(false);

		await rebuildAllIndexes(['/vault/note.md', '/vault/external.md']);

		expect(rebuildIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
	});

	it('performs full rebuild when no paths are provided', async () => {
		await rebuildAllIndexes();

		expect(areAllRecentSaves).not.toHaveBeenCalled();
		expect(rebuildIndex).toHaveBeenCalled();
	});

	it('performs full rebuild when paths array is empty', async () => {
		await rebuildAllIndexes([]);

		expect(areAllRecentSaves).not.toHaveBeenCalled();
		expect(rebuildIndex).toHaveBeenCalled();
	});
});

describe('rebuildAllIndexes — error isolation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('continues remaining index builds when rebuildIndex rejects', async () => {
		vi.mocked(rebuildIndex).mockRejectedValueOnce(new Error('scan failed'));

		await rebuildAllIndexes();

		expect(debugError).toHaveBeenCalledWith('WATCHER', 'rebuildIndex failed:', expect.any(Error));
		expect(buildPropertyIndex).toHaveBeenCalled();
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});

	it('error in one builder does not abort the rest of the rebuild', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		vi.mocked(buildPropertyIndex).mockImplementation(() => { throw new Error('prop fail'); });

		await rebuildAllIndexes();

		// Index builders after the failure still run.
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});
});

describe('rebuildAllIndexes — incremental path', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
		// Default mock for invoke calls not explicitly configured by individual
		// tests (e.g. update_note_in_index, scan_vault_v2). The
		// mockResolvedValueOnce values below take precedence in call order.
		vi.mocked(invoke).mockResolvedValue(undefined);
	});

	it('uses incremental update for a small number of markdown files', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/note.md', content: 'updated content' },
		]);

		await rebuildAllIndexes(['/vault/note.md']);

		// Should NOT call full rebuild
		expect(rebuildIndex).not.toHaveBeenCalled();
		expect(buildPropertyIndex).not.toHaveBeenCalled();

		// Should pass absolute paths to read_files_batch
		expect(invoke).toHaveBeenCalledWith('read_files_batch', {
			vaultPath: '/vault',
			paths: ['/vault/note.md'],
		});
		// TS-side updaters receive absolute paths (matching VaultIndex behavior)
		expect(updateNoteInIndex).toHaveBeenCalledWith('/vault/note.md', 'updated content');
		expect(updateFrontmatterIconForFile).toHaveBeenCalledWith('/vault/note.md', 'updated content');
		expect(updateCalendarForFile).toHaveBeenCalledWith('/vault/note.md', 'updated content');
	});

	it('updates FTS5 and semantic indexes for externally changed markdown files', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/notes/external.md', content: '# external edit' },
		]);

		await rebuildAllIndexes(['/vault/notes/external.md']);

		// FTS + semantic take vault-relative paths, matching the convention
		// in `build_fts_index` / `build_semantic_index`.
		expect(invoke).toHaveBeenCalledWith('update_search_index_file', {
			filePath: 'notes/external.md',
			content: '# external edit',
		});
		expect(invoke).toHaveBeenCalledWith('update_semantic_file', {
			filePath: 'notes/external.md',
			content: '# external edit',
			vaultPath: '/vault',
		});
	});

	it('removes deleted markdown files from FTS5 in the incremental path', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/notes/gone.md', content: null },
		]);

		await rebuildAllIndexes(['/vault/notes/gone.md']);

		expect(invoke).toHaveBeenCalledWith('remove_from_search_index', {
			filePath: 'notes/gone.md',
		});
	});

	it('falls back to full rebuild when incremental fails', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('read failed'));

		await rebuildAllIndexes(['/vault/note.md']);

		// Incremental failed, should fall back to full rebuild
		expect(rebuildIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
	});

	it('uses full rebuild for many changed files', async () => {
		const paths = Array.from({ length: 15 }, (_, i) => `/vault/note-${i}.md`);

		await rebuildAllIndexes(paths);

		expect(rebuildIndex).toHaveBeenCalled();
		expect(invoke).not.toHaveBeenCalledWith('read_files_batch', expect.anything());
	});

	it('uses full rebuild for non-markdown files', async () => {
		await rebuildAllIndexes(['/vault/image.png']);

		expect(rebuildIndex).toHaveBeenCalled();
	});

	it('handles deleted files in incremental path', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/deleted.md', content: null },
		]);

		await rebuildAllIndexes(['/vault/deleted.md']);

		// Drop the dedup signature so a re-creation re-indexes.
		expect(clearIndexedEntry).toHaveBeenCalledWith('/vault/deleted.md');
		// TS-side update_note_in_index path is NOT taken for deletions.
		expect(updateNoteInIndex).not.toHaveBeenCalled();
		// Deletion fans out to remove_note_from_index in Rust.
		expect(invoke).toHaveBeenCalledWith('remove_note_from_index', { path: '/vault/deleted.md' });
	});
});
