import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/api', () => ({
	invoke: vi.fn(),
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

vi.mock('$lib/utils/debug', () => ({
	error: vi.fn(),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
}));

import { invoke } from '$lib/api';
import { updateNoteInIndex } from '$lib/features/collection/collection.service';
import { updateFrontmatterIconForFile } from '$lib/features/file-icons/file-icons.service';
import { updateCalendarForFile } from '$lib/plugins/calendar/calendar.service';
import { error as debugError } from '$lib/utils/debug';
import { updateIndexesForFile } from '$lib/core/app-lifecycle/index-updater.service';
import { clearAllIndexed, isAlreadyIndexed, markIndexed } from '$lib/utils/index-dedupe';

describe('updateIndexesForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(invoke).mockResolvedValue(undefined);
		// Dedup state is module-level and would otherwise leak between tests
		// (second call to updateIndexesForFile with the same path/content would
		// short-circuit before invoking any mocked updater).
		clearAllIndexed();
	});

	it('fires Phase 1 (Rust IPC) and Phase 2 (TS-side updaters) with the correct arguments', async () => {
		await updateIndexesForFile('/vault/note.md', '# Hello world');

		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: '/vault/note.md', content: '# Hello world' });
		expect(updateNoteInIndex).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
		expect(updateFrontmatterIconForFile).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
		expect(updateCalendarForFile).toHaveBeenCalledWith('/vault/note.md', '# Hello world');
	});

	it('handles empty path and content', async () => {
		await updateIndexesForFile('', '');

		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: '', content: '' });
		expect(updateNoteInIndex).toHaveBeenCalledWith('', '');
		expect(updateFrontmatterIconForFile).toHaveBeenCalledWith('', '');
		expect(updateCalendarForFile).toHaveBeenCalledWith('', '');
	});

	it('continues calling remaining Phase 2 updaters when one throws', async () => {
		vi.mocked(updateNoteInIndex).mockImplementation(() => {
			throw new Error('collection parse error');
		});

		await updateIndexesForFile('/vault/note.md', 'content');

		expect(invoke).toHaveBeenCalledWith('update_note_in_index', expect.any(Object));
		expect(updateFrontmatterIconForFile).toHaveBeenCalled();
		expect(updateCalendarForFile).toHaveBeenCalled();
	});

	it('logs error when a Phase 2 updater throws', async () => {
		const testError = new Error('calendar crash');
		vi.mocked(updateCalendarForFile).mockImplementation(() => {
			throw testError;
		});

		await updateIndexesForFile('/vault/note.md', 'content');

		expect(debugError).toHaveBeenCalledWith('INDEX', 'updateCalendarForFile failed:', testError);
	});

	it('logs error when update_note_in_index IPC rejects', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('ipc fail'));

		await updateIndexesForFile('/vault/note.md', 'content');
		// Wait for the catch
		await new Promise((r) => setTimeout(r, 0));

		expect(debugError).toHaveBeenCalledWith('INDEX', 'update_note_in_index failed:', expect.any(Error));
	});

	it('skips Phase 2 when a newer call supersedes', async () => {
		// Start first call but don't await — it will be superseded
		const first = updateIndexesForFile('/vault/old.md', 'old content');
		// Start second call immediately — increments version, invalidating first
		const second = updateIndexesForFile('/vault/new.md', 'new content');

		await Promise.all([first, second]);

		// Phase 1 (Rust IPC, fire-and-forget) of both calls runs
		expect(invoke).toHaveBeenCalledTimes(2);
		// Phase 2 only runs for the second (latest) call
		expect(updateNoteInIndex).toHaveBeenCalledTimes(1);
		expect(updateNoteInIndex).toHaveBeenCalledWith('/vault/new.md', 'new content');
	});

	it('skips all phases when the (path, content) signature was already indexed', async () => {
		// Simulate notifyAfterSave having already marked this content.
		markIndexed('/vault/note.md', 'same content');

		await updateIndexesForFile('/vault/note.md', 'same content');

		expect(invoke).not.toHaveBeenCalled();
		expect(updateNoteInIndex).not.toHaveBeenCalled();
		expect(updateCalendarForFile).not.toHaveBeenCalled();
	});

	it('marks the (path, content) signature after running, so an immediate re-run short-circuits', async () => {
		await updateIndexesForFile('/vault/note.md', 'hello');
		expect(isAlreadyIndexed('/vault/note.md', 'hello')).toBe(true);

		await updateIndexesForFile('/vault/note.md', 'hello');
		// Phase 1 + Phase 2 only fired once
		expect(invoke).toHaveBeenCalledTimes(1);
		expect(updateCalendarForFile).toHaveBeenCalledTimes(1);
	});

	it('re-runs when the content actually changes after an indexed signature', async () => {
		await updateIndexesForFile('/vault/note.md', 'v1');
		expect(invoke).toHaveBeenCalledTimes(1);

		await updateIndexesForFile('/vault/note.md', 'v2');
		expect(invoke).toHaveBeenCalledTimes(2);
		expect(invoke).toHaveBeenLastCalledWith('update_note_in_index', { path: '/vault/note.md', content: 'v2' });
		expect(isAlreadyIndexed('/vault/note.md', 'v1')).toBe(false);
		expect(isAlreadyIndexed('/vault/note.md', 'v2')).toBe(true);
	});
});
