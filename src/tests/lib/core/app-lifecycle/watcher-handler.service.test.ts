import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	rebuildIndex: vi.fn(() => Promise.resolve()),
	updateIndexForFile: vi.fn(),
	updateBacklinksForFile: vi.fn(),
	removeFileFromIndex: vi.fn(),
}));

vi.mock('$lib/features/outgoing-links/outgoing-links.service', () => ({
	updateOutgoingLinksForFile: vi.fn(),
}));

vi.mock('$lib/features/tags/tags.service', () => ({
	buildTagIndex: vi.fn(),
	updateTagIndexForFile: vi.fn(),
}));

vi.mock('$lib/features/collection/collection.service', () => ({
	buildPropertyIndex: vi.fn(),
	updateNoteInIndex: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.service', () => ({
	buildFrontmatterIconIndex: vi.fn(),
	updateFrontmatterIconForFile: vi.fn(),
}));

vi.mock('$lib/plugins/calendar/calendar.service', () => ({
	scanFilesForCalendar: vi.fn(),
	updateCalendarForFile: vi.fn(),
}));

vi.mock('$lib/features/tasks/tasks.service', () => ({
	buildTaskIndex: vi.fn(),
	updateTaskIndexForFile: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	areAllRecentSaves: vi.fn(() => false),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	logProcessMemory: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { error as debugError } from '$lib/utils/debug';
import { rebuildIndex, updateIndexForFile, updateBacklinksForFile } from '$lib/features/backlinks/backlinks.service';
import { updateOutgoingLinksForFile } from '$lib/features/outgoing-links/outgoing-links.service';
import { buildTagIndex, updateTagIndexForFile } from '$lib/features/tags/tags.service';
import { buildPropertyIndex, updateNoteInIndex } from '$lib/features/collection/collection.service';
import { buildFrontmatterIconIndex, updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { scanFilesForCalendar, updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { buildTaskIndex, updateTaskIndexForFile } from '$lib/features/tasks/tasks.service';
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
		expect(buildTagIndex).toHaveBeenCalled();
		expect(buildTaskIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});

	it('refreshes backlinks and outgoing links for the active tab', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });

		await rebuildAllIndexes();

		expect(updateBacklinksForFile).toHaveBeenCalledWith('/vault/note.md');
		expect(updateOutgoingLinksForFile).toHaveBeenCalledWith('/vault/note.md');
	});

	it('skips active tab refresh when no file is open', async () => {
		editorStore.reset();

		await rebuildAllIndexes();

		expect(updateBacklinksForFile).not.toHaveBeenCalled();
		expect(updateOutgoingLinksForFile).not.toHaveBeenCalled();
	});

	it('calls rebuildIndex before derived indexes', async () => {
		const callOrder: string[] = [];
		vi.mocked(rebuildIndex).mockImplementation(async () => { callOrder.push('rebuildIndex'); });
		vi.mocked(buildTagIndex).mockImplementation(() => { callOrder.push('buildTagIndex'); });
		vi.mocked(buildTaskIndex).mockImplementation(() => { callOrder.push('buildTaskIndex'); });

		await rebuildAllIndexes();

		expect(callOrder[0]).toBe('rebuildIndex');
		expect(callOrder.indexOf('buildTagIndex')).toBeGreaterThan(0);
		expect(callOrder.indexOf('buildTaskIndex')).toBeGreaterThan(0);
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
		expect(buildTagIndex).not.toHaveBeenCalled();
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
		expect(buildTagIndex).not.toHaveBeenCalled();
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
		expect(buildTagIndex).toHaveBeenCalled();
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
		expect(buildTagIndex).toHaveBeenCalled();
		expect(buildTaskIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});

	it('continues remaining index builds when a sync builder throws', async () => {
		vi.mocked(buildTagIndex).mockImplementation(() => { throw new Error('tag fail'); });

		await rebuildAllIndexes();

		expect(debugError).toHaveBeenCalledWith('WATCHER', 'buildTagIndex failed:', expect.any(Error));
		expect(buildTaskIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
	});

	it('continues to active tab refresh when an index builder fails', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		vi.mocked(buildPropertyIndex).mockImplementation(() => { throw new Error('prop fail'); });

		await rebuildAllIndexes();

		expect(updateBacklinksForFile).toHaveBeenCalledWith('/vault/note.md');
		expect(updateOutgoingLinksForFile).toHaveBeenCalledWith('/vault/note.md');
	});

	it('logs error when active tab backlinks refresh fails', async () => {
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });
		vi.mocked(updateBacklinksForFile).mockImplementation(() => { throw new Error('backlink fail'); });

		await rebuildAllIndexes();

		expect(debugError).toHaveBeenCalledWith('WATCHER', 'updateBacklinksForFile failed:', expect.any(Error));
		expect(updateOutgoingLinksForFile).toHaveBeenCalledWith('/vault/note.md');
	});
});

describe('rebuildAllIndexes — incremental path', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		clearLocalStorage();
		vaultStore._reset();
		vaultStore.open('/vault');
	});

	it('uses incremental update for a small number of markdown files', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ path: '/vault/note.md', content: 'updated content' },
		]);

		await rebuildAllIndexes(['/vault/note.md']);

		// Should NOT call full rebuild
		expect(rebuildIndex).not.toHaveBeenCalled();
		expect(buildTagIndex).not.toHaveBeenCalled();

		// Should pass absolute paths to read_files_batch
		expect(invoke).toHaveBeenCalledWith('read_files_batch', {
			vaultPath: '/vault',
			paths: ['/vault/note.md'],
		});
		// Index updaters receive absolute paths (matching buildIndex behavior)
		expect(updateIndexForFile).toHaveBeenCalledWith('/vault/note.md', 'updated content');
		expect(updateTagIndexForFile).toHaveBeenCalledWith('/vault/note.md', 'updated content');
		expect(updateTaskIndexForFile).toHaveBeenCalledWith('/vault/note.md', 'updated content');
		expect(updateNoteInIndex).toHaveBeenCalledWith('/vault/note.md', 'updated content');
		expect(updateFrontmatterIconForFile).toHaveBeenCalledWith('/vault/note.md', 'updated content');
		expect(updateCalendarForFile).toHaveBeenCalledWith('/vault/note.md', 'updated content');
	});

	it('falls back to full rebuild when incremental fails', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('read failed'));

		await rebuildAllIndexes(['/vault/note.md']);

		// Incremental failed, should fall back to full rebuild
		expect(rebuildIndex).toHaveBeenCalled();
		expect(buildTagIndex).toHaveBeenCalled();
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

		const { removeFileFromIndex } = await import('$lib/features/backlinks/backlinks.service');

		await rebuildAllIndexes(['/vault/deleted.md']);

		expect(removeFileFromIndex).toHaveBeenCalledWith('/vault/deleted.md');
		expect(updateIndexForFile).not.toHaveBeenCalled();
	});
});
