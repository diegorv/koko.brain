import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	updateIndexForFile: vi.fn(),
	updateBacklinksForFile: vi.fn(),
}));

vi.mock('$lib/features/backlinks/note-index.store.svelte', () => ({
	noteIndexStore: {
		get noteContents() { return new Map(); },
	},
}));

vi.mock('$lib/features/backlinks/backlinks.logic', () => ({
	buildResolutionCache: vi.fn(() => new Map()),
}));

vi.mock('$lib/features/outgoing-links/outgoing-links.service', () => ({
	updateOutgoingLinksForFile: vi.fn(),
}));

vi.mock('$lib/features/tags/tags.service', () => ({
	updateTagIndexForFile: vi.fn(),
}));

vi.mock('$lib/features/collection/collection.service', () => ({
	updateNoteInIndex: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.service', () => ({
	updateFrontmatterIconForFile: vi.fn(),
}));

vi.mock('$lib/plugins/calendar/calendar.service', () => ({
	updateCalendarForFile: vi.fn(),
}));

vi.mock('$lib/features/tasks/tasks.service', () => ({
	updateTaskIndexForFile: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	error: vi.fn(),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

import { updateIndexForFile, updateBacklinksForFile } from '$lib/features/backlinks/backlinks.service';
import { updateOutgoingLinksForFile } from '$lib/features/outgoing-links/outgoing-links.service';
import { updateTagIndexForFile } from '$lib/features/tags/tags.service';
import { updateNoteInIndex } from '$lib/features/collection/collection.service';
import { updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { updateTaskIndexForFile } from '$lib/features/tasks/tasks.service';
import { error as debugError } from '$lib/utils/debug';
import { updateIndexesForFile } from '$lib/core/app-lifecycle/index-updater.service';
import { clearAllIndexed, isAlreadyIndexed, markIndexed } from '$lib/utils/index-dedupe';

describe('updateIndexesForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Dedup state is module-level and would otherwise leak between tests
		// (second call to updateIndexesForFile with the same path/content would
		// short-circuit before invoking any mocked updater).
		clearAllIndexed();
	});

	it('calls all per-file index update functions with the correct arguments', async () => {
		await updateIndexesForFile('/vault/note.md', '# Hello world');

		expect(updateIndexForFile).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
		expect(updateBacklinksForFile).toHaveBeenCalledWith('/vault/note.md', expect.any(Array), expect.any(Map));
		expect(updateOutgoingLinksForFile).toHaveBeenCalledWith('/vault/note.md', expect.any(Array), expect.any(Map));
		expect(updateTagIndexForFile).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
		expect(updateNoteInIndex).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
		expect(updateFrontmatterIconForFile).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
		expect(updateTaskIndexForFile).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
		expect(updateCalendarForFile).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
	});

	it('calls all updaters with empty path and content', async () => {
		await updateIndexesForFile('', '');

		expect(updateIndexForFile).toHaveBeenCalledWith('', '');
		expect(updateBacklinksForFile).toHaveBeenCalledWith('', expect.any(Array), expect.any(Map));
		expect(updateOutgoingLinksForFile).toHaveBeenCalledWith('', expect.any(Array), expect.any(Map));
		expect(updateTagIndexForFile).toHaveBeenCalledWith('', '');
		expect(updateNoteInIndex).toHaveBeenCalledWith('', '');
		expect(updateFrontmatterIconForFile).toHaveBeenCalledWith('', '');
		expect(updateCalendarForFile).toHaveBeenCalledWith('', '');
		expect(updateTaskIndexForFile).toHaveBeenCalledWith('', '');
	});

	it('shares the same allFilePaths and cache between backlinks and outgoing-links', async () => {
		await updateIndexesForFile('/vault/note.md', 'content');

		const backlinksArgs = vi.mocked(updateBacklinksForFile).mock.calls[0];
		const outgoingArgs = vi.mocked(updateOutgoingLinksForFile).mock.calls[0];
		// Both receive the same array reference
		expect(backlinksArgs[1]).toBe(outgoingArgs[1]);
		// Both receive the same cache reference
		expect(backlinksArgs[2]).toBe(outgoingArgs[2]);
	});

	it('calls updateIndexForFile before dependent index updates', async () => {
		const callOrder: string[] = [];
		vi.mocked(updateIndexForFile).mockImplementation(() => { callOrder.push('updateIndexForFile'); });
		vi.mocked(updateBacklinksForFile).mockImplementation(() => { callOrder.push('updateBacklinksForFile'); });
		vi.mocked(updateOutgoingLinksForFile).mockImplementation(() => { callOrder.push('updateOutgoingLinksForFile'); });
		vi.mocked(updateTagIndexForFile).mockImplementation(() => { callOrder.push('updateTagIndexForFile'); });

		await updateIndexesForFile('/vault/note.md', 'content');

		expect(callOrder[0]).toBe('updateIndexForFile');
	});

	it('continues calling remaining updaters when one throws', async () => {
		vi.mocked(updateTagIndexForFile).mockImplementation(() => {
			throw new Error('tag parse error');
		});

		await updateIndexesForFile('/vault/note.md', 'content');

		// Updaters before the failure should have been called
		expect(updateIndexForFile).toHaveBeenCalled();
		expect(updateBacklinksForFile).toHaveBeenCalled();
		expect(updateOutgoingLinksForFile).toHaveBeenCalled();
		// Updaters after the failure should also be called
		expect(updateTaskIndexForFile).toHaveBeenCalled();
		expect(updateNoteInIndex).toHaveBeenCalled();
		expect(updateFrontmatterIconForFile).toHaveBeenCalled();
		expect(updateCalendarForFile).toHaveBeenCalled();
	});

	it('logs error when an updater throws', async () => {
		const testError = new Error('calendar crash');
		vi.mocked(updateCalendarForFile).mockImplementation(() => {
			throw testError;
		});

		await updateIndexesForFile('/vault/note.md', 'content');

		expect(debugError).toHaveBeenCalledWith('INDEX', 'updateCalendarForFile failed:', testError);
	});

	it('skips phases 2 and 3 when a newer call supersedes', async () => {
		// Start first call but don't await — it will be superseded
		const first = updateIndexesForFile('/vault/old.md', 'old content');
		// Start second call immediately — increments version, invalidating first
		const second = updateIndexesForFile('/vault/new.md', 'new content');

		await Promise.all([first, second]);

		// Phase 1 of both calls runs (updateIndexForFile is synchronous before yield)
		expect(updateIndexForFile).toHaveBeenCalledTimes(2);
		// Phases 2/3 only run for the second (latest) call
		expect(updateBacklinksForFile).toHaveBeenCalledTimes(1);
		expect(updateBacklinksForFile).toHaveBeenCalledWith('/vault/new.md', expect.any(Array), expect.any(Map));
		expect(updateTagIndexForFile).toHaveBeenCalledTimes(1);
		expect(updateTagIndexForFile).toHaveBeenCalledWith('/vault/new.md', 'new content');
	});

	it('skips all phases when the (path, content) signature was already indexed', async () => {
		// Simulate notifyAfterSave having already marked this content.
		markIndexed('/vault/note.md', 'same content');

		await updateIndexesForFile('/vault/note.md', 'same content');

		expect(updateIndexForFile).not.toHaveBeenCalled();
		expect(updateBacklinksForFile).not.toHaveBeenCalled();
		expect(updateTagIndexForFile).not.toHaveBeenCalled();
		expect(updateNoteInIndex).not.toHaveBeenCalled();
		expect(updateCalendarForFile).not.toHaveBeenCalled();
	});

	it('marks the (path, content) signature after running, so an immediate re-run short-circuits', async () => {
		await updateIndexesForFile('/vault/note.md', 'hello');
		expect(isAlreadyIndexed('/vault/note.md', 'hello')).toBe(true);

		// Second call with same content: all mocks stay at 1 invocation from the first call.
		await updateIndexesForFile('/vault/note.md', 'hello');
		expect(updateIndexForFile).toHaveBeenCalledTimes(1);
		expect(updateBacklinksForFile).toHaveBeenCalledTimes(1);
		expect(updateCalendarForFile).toHaveBeenCalledTimes(1);
	});

	it('re-runs when the content actually changes after an indexed signature', async () => {
		await updateIndexesForFile('/vault/note.md', 'v1');
		expect(updateIndexForFile).toHaveBeenCalledTimes(1);

		await updateIndexesForFile('/vault/note.md', 'v2');
		expect(updateIndexForFile).toHaveBeenCalledTimes(2);
		expect(updateIndexForFile).toHaveBeenLastCalledWith('/vault/note.md', 'v2');
		expect(isAlreadyIndexed('/vault/note.md', 'v1')).toBe(false);
		expect(isAlreadyIndexed('/vault/note.md', 'v2')).toBe(true);
	});
});
