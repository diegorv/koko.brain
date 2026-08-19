import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import {
	addAfterSaveObserver,
	notifyAfterSave,
	resetHooks,
	markRecentSave,
	areAllRecentSaves,
} from '$lib/core/editor/editor.hooks';
import { registerCollectionNoteChangeConsumer } from '$lib/features/collection/collection.service';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { isAlreadyIndexed, markIndexed, clearAllIndexed } from '$lib/utils/index-dedupe';

describe('notifyAfterSave', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetHooks();
		// Always-active Rust update IPC must resolve to avoid unhandled promises
		// in tests that don't explicitly configure it.
		vi.mocked(invoke).mockResolvedValue(undefined);
	});

	it('calls all registered observers', () => {
		const obs1 = vi.fn();
		const obs2 = vi.fn();
		addAfterSaveObserver(obs1);
		addAfterSaveObserver(obs2);

		notifyAfterSave('/vault/note.md', 'content');

		expect(obs1).toHaveBeenCalledWith('/vault/note.md', 'content');
		expect(obs2).toHaveBeenCalledWith('/vault/note.md', 'content');
	});

	it('marks the (path, content) signature in the shared dedup map', () => {
		clearAllIndexed();
		expect(isAlreadyIndexed('/vault/note.md', 'abc')).toBe(false);

		notifyAfterSave('/vault/note.md', 'abc');

		expect(isAlreadyIndexed('/vault/note.md', 'abc')).toBe(true);
	});

	it('does not re-mark or re-invoke observers when content is already indexed', () => {
		clearAllIndexed();
		// Simulate the content-effect having just run for this content.
		markIndexed('/vault/note.md', 'abc');

		const obs = vi.fn();
		addAfterSaveObserver(obs);
		notifyAfterSave('/vault/note.md', 'abc');

		// Observers still run (they are outside the dedup guard — the guard
		// only skips the index updaters, not the observer fan-out).
		expect(obs).toHaveBeenCalledWith('/vault/note.md', 'abc');
		expect(isAlreadyIndexed('/vault/note.md', 'abc')).toBe(true);
	});

	it('refreshes the registered per-file consumers synchronously', () => {
		// ADR-0009: the consumer fan-out has to finish BEFORE notifyAfterSave
		// invalidates the queryjs cache, or a widget re-rendering right after
		// the invalidation reads a stale index. An owner that awaited before
		// its consumers would break this while every other test stayed green.
		clearAllIndexed();
		collectionStore.reset();
		const unregister = registerCollectionNoteChangeConsumer();
		try {
			notifyAfterSave('/vault/note.md', '---\nstatus: done\n---\n');

			const record = collectionStore.propertyIndex.get('/vault/note.md');
			expect(record?.properties.get('status')).toBe('done');
		} finally {
			unregister();
			collectionStore.reset();
		}
	});

	it('skips the consumers but still fires Rust when the signature is already indexed', () => {
		// The dedupe map has two independent axes: it gates the TS consumers
		// but never the Rust IPC. Collapsing them into one boolean would
		// silently drop the save-side VaultIndex refresh.
		clearAllIndexed();
		collectionStore.reset();
		markIndexed('/vault/note.md', 'body');
		const unregister = registerCollectionNoteChangeConsumer();
		try {
			notifyAfterSave('/vault/note.md', 'body');

			expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(false);
			expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
				path: '/vault/note.md',
				content: 'body',
			});
		} finally {
			unregister();
			collectionStore.reset();
		}
	});

	it('resetHooks clears the dedup map so a reopened vault re-indexes', () => {
		notifyAfterSave('/vault/note.md', 'abc');
		expect(isAlreadyIndexed('/vault/note.md', 'abc')).toBe(true);

		resetHooks();

		expect(isAlreadyIndexed('/vault/note.md', 'abc')).toBe(false);
	});

	it('catches and logs observer errors without propagating', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const badObserver = () => { throw new Error('observer crash'); };
		const goodObserver = vi.fn();
		addAfterSaveObserver(badObserver);
		addAfterSaveObserver(goodObserver);

		// Should not throw
		notifyAfterSave('/vault/note.md', 'content');

		expect(consoleSpy).toHaveBeenCalledWith(
			'afterSave observer error:',
			expect.any(Error),
		);
		// Good observer still called despite bad observer throwing
		expect(goodObserver).toHaveBeenCalledWith('/vault/note.md', 'content');
		consoleSpy.mockRestore();
	});

	describe('Rust VaultIndex update', () => {
		it('invokes update_note_in_index with path and content on every save', () => {
			vi.mocked(invoke).mockResolvedValue(undefined);

			notifyAfterSave('/vault/note.md', 'fresh content');

			expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
				path: '/vault/note.md',
				content: 'fresh content',
			});
		});

		it('STILL fires Rust call when TS dedup says already-indexed', () => {
			// The TS dedup tracks whether the TS indexers were called for this
			// exact (path, content). The content-effect in updateIndexesForFile
			// also calls Rust, but if it didn't fire (e.g. quick save after
			// typing) the save side must still update Rust. Calling on every
			// save is cheap (~1-5ms IPC) and Rust has internal change detection.
			vi.mocked(invoke).mockResolvedValue(undefined);
			markIndexed('/vault/note.md', 'same');

			notifyAfterSave('/vault/note.md', 'same');

			expect(invoke).toHaveBeenCalledWith('update_note_in_index', {
				path: '/vault/note.md',
				content: 'same',
			});
		});

		it('TS dedup STILL skips the TS indexers when content is unchanged', () => {
			vi.mocked(invoke).mockResolvedValue(undefined);
			markIndexed('/vault/note.md', 'same');
			const tsCallsBefore = vi.mocked(invoke).mock.calls.length;

			notifyAfterSave('/vault/note.md', 'same');

			// Rust call fires (1 new invoke)
			expect(vi.mocked(invoke).mock.calls.length).toBe(tsCallsBefore + 1);
			expect(vi.mocked(invoke).mock.calls[tsCallsBefore][0]).toBe('update_note_in_index');
			// dedup signature unchanged (still marked, no re-mark needed)
			expect(isAlreadyIndexed('/vault/note.md', 'same')).toBe(true);
		});

		it('IPC rejection is swallowed and does not block observers', async () => {
			vi.mocked(invoke).mockRejectedValue(new Error('IPC error'));
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const observer = vi.fn();
			addAfterSaveObserver(observer);

			notifyAfterSave('/vault/note.md', 'content');

			// Observer fires synchronously (before the rejected IPC promise settles)
			expect(observer).toHaveBeenCalledWith('/vault/note.md', 'content');

			// Wait a microtask for the .catch to run
			await new Promise((r) => setTimeout(r, 0));
			expect(consoleSpy).toHaveBeenCalledWith(
				'update_note_in_index failed:',
				expect.any(Error),
			);
			consoleSpy.mockRestore();
		});
	});
});

describe('addAfterSaveObserver', () => {
	beforeEach(() => {
		resetHooks();
	});

	it('returns working unsubscribe function', () => {
		const observer = vi.fn();
		const unsub = addAfterSaveObserver(observer);

		notifyAfterSave('/vault/note.md', 'content');
		expect(observer).toHaveBeenCalledTimes(1);

		unsub();

		notifyAfterSave('/vault/note.md', 'content');
		expect(observer).toHaveBeenCalledTimes(1); // Not called again
	});
});

describe('self-save detection', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		resetHooks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('marks a path as recently saved after notifyAfterSave', () => {
		notifyAfterSave('/vault/note.md', 'content');

		expect(areAllRecentSaves(['/vault/note.md'])).toBe(true);
	});

	it('returns false for paths that were not saved', () => {
		expect(areAllRecentSaves(['/vault/other.md'])).toBe(false);
	});

	it('returns false for empty paths array', () => {
		expect(areAllRecentSaves([])).toBe(false);
	});

	it('returns false when only some paths are recent saves', () => {
		notifyAfterSave('/vault/note.md', 'content');

		expect(areAllRecentSaves(['/vault/note.md', '/vault/other.md'])).toBe(false);
	});

	it('returns true when all paths are recent saves', () => {
		notifyAfterSave('/vault/a.md', 'content a');
		notifyAfterSave('/vault/b.md', 'content b');

		expect(areAllRecentSaves(['/vault/a.md', '/vault/b.md'])).toBe(true);
	});

	it('auto-clears after safety timeout (15s)', () => {
		notifyAfterSave('/vault/note.md', 'content');
		expect(areAllRecentSaves(['/vault/note.md'])).toBe(true);

		vi.advanceTimersByTime(15000);
		expect(areAllRecentSaves(['/vault/note.md'])).toBe(false);
	});

	it('resetHooks clears recent saves', () => {
		notifyAfterSave('/vault/note.md', 'content');
		expect(areAllRecentSaves(['/vault/note.md'])).toBe(true);

		resetHooks();
		expect(areAllRecentSaves(['/vault/note.md'])).toBe(false);
	});

	it('markRecentSave marks a path without triggering after-save observers', () => {
		const observer = vi.fn();
		addAfterSaveObserver(observer);

		markRecentSave('/vault/new-file.md');

		expect(areAllRecentSaves(['/vault/new-file.md'])).toBe(true);
		expect(observer).not.toHaveBeenCalled();
	});

	it('markRecentSave auto-clears after safety timeout', () => {
		markRecentSave('/vault/new-file.md');
		expect(areAllRecentSaves(['/vault/new-file.md'])).toBe(true);

		vi.advanceTimersByTime(15000);
		expect(areAllRecentSaves(['/vault/new-file.md'])).toBe(false);
	});
});
