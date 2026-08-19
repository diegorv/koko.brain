import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn(),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
	perfBaseline: vi.fn(),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
}));

import { invoke } from '@tauri-apps/api/core';
import { error as debugError } from '$lib/utils/debug';
import { updateIndexesForFile } from '$lib/core/app-lifecycle/index-updater.service';
import { registerCollectionNoteChangeConsumer } from '$lib/features/collection/collection.service';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { registerCalendarNoteChangeConsumer, resetCalendar } from '$lib/plugins/calendar/calendar.service';
import { calendarStore } from '$lib/plugins/calendar/calendar.store.svelte';
import { registerNoteChangeConsumer } from '$lib/core/filesystem/note-change.service';
import { clearAllIndexed, isAlreadyIndexed, markIndexed } from '$lib/utils/index-dedupe';

describe('updateIndexesForFile', () => {
	let unregister: (() => void)[] = [];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(invoke).mockResolvedValue(undefined);
		// Dedup state is module-level and would otherwise leak between tests
		// (a second call with the same path/content short-circuits).
		clearAllIndexed();
		collectionStore.reset();
		resetCalendar();
		unregister = [
			registerCollectionNoteChangeConsumer(),
			registerCalendarNoteChangeConsumer(),
		];
	});

	afterEach(() => {
		for (const u of unregister) u();
		unregister = [];
		collectionStore.reset();
		resetCalendar();
	});

	it('fires the Rust IPC and then the registered consumers', async () => {
		await updateIndexesForFile('/vault/note.md', '---\ncreated: 2026-01-02\nstatus: done\n---\n');

		expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
			path: '/vault/note.md',
			content: '---\ncreated: 2026-01-02\nstatus: done\n---\n',
		});
		expect(collectionStore.propertyIndex.get('/vault/note.md')?.properties.get('status')).toBe('done');
		expect(calendarStore.dayPaths.get('2026-01-02')).toEqual(['/vault/note.md']);
	});

	it('handles empty path and content', async () => {
		await updateIndexesForFile('', '');

		expect(invoke).toHaveBeenCalledWith('update_note_in_index', { path: '', content: '' });
		expect(collectionStore.propertyIndex.has('')).toBe(true);
	});

	it('never sends a vault-relative FTS key from the edit source', async () => {
		// FTS5 / semantic stay on the save-side search observer and the
		// watcher; the content-effect must not write to them.
		await updateIndexesForFile('/vault/note.md', 'body');

		expect(invoke).not.toHaveBeenCalledWith('update_search_index_file', expect.anything());
		expect(invoke).not.toHaveBeenCalledWith('update_semantic_file', expect.anything());
	});

	it('continues calling remaining consumers when one throws', async () => {
		unregister.push(registerNoteChangeConsumer({
			name: 'exploding',
			upsert: () => { throw new Error('consumer parse error'); },
			remove: () => {},
		}));

		await updateIndexesForFile('/vault/note.md', '---\ncreated: 2026-03-04\n---\n');

		expect(debugError).toHaveBeenCalledWith('NOTE-CHANGE', 'exploding upsert failed:', expect.any(Error));
		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(true);
		expect(calendarStore.dayPaths.get('2026-03-04')).toEqual(['/vault/note.md']);
	});

	it('logs error when update_note_in_index IPC rejects', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('ipc fail'));

		await updateIndexesForFile('/vault/note.md', 'content');
		// Wait for the catch
		await new Promise((r) => setTimeout(r, 0));

		expect(debugError).toHaveBeenCalledWith('NOTE-CHANGE', 'update_note_in_index failed:', expect.any(Error));
	});

	it('skips the consumer fan-out when a newer call supersedes', async () => {
		// Start first call but don't await — it will be superseded
		const first = updateIndexesForFile('/vault/old.md', 'old content');
		// Start second call immediately — increments version, invalidating first
		const second = updateIndexesForFile('/vault/new.md', 'new content');

		await Promise.all([first, second]);

		// The Rust IPC (fire-and-forget, before the yield) runs for both.
		expect(invoke).toHaveBeenCalledTimes(2);
		// Consumers only ran for the second (latest) call.
		expect(collectionStore.propertyIndex.has('/vault/old.md')).toBe(false);
		expect(collectionStore.propertyIndex.has('/vault/new.md')).toBe(true);
	});

	it('skips all phases when the (path, content) signature was already indexed', async () => {
		// Simulate notifyAfterSave having already marked this content.
		markIndexed('/vault/note.md', 'same content');

		await updateIndexesForFile('/vault/note.md', 'same content');

		expect(invoke).not.toHaveBeenCalled();
		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(false);
	});

	it('marks the (path, content) signature after running, so an immediate re-run short-circuits', async () => {
		await updateIndexesForFile('/vault/note.md', 'hello');
		expect(isAlreadyIndexed('/vault/note.md', 'hello')).toBe(true);

		await updateIndexesForFile('/vault/note.md', 'hello');
		expect(invoke).toHaveBeenCalledTimes(1);
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
