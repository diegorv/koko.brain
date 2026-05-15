import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$lib/api', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '$lib/api';
import { tagsStore } from '$lib/features/tags/tags.store.svelte';
import {
	buildTagIndex,
	updateTagSort,
	resetTags,
	scheduleTagIndexRebuild,
	flushScheduledTagIndexRebuild,
} from '$lib/features/tags/tags.service';
import type { TagAggregateV2 } from '$lib/types/vault-v2.types';

describe('buildTagIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetTags();
	});

	it('builds tag tree from get_all_tags_v2 IPC', async () => {
		const aggregates: TagAggregateV2[] = [
			{ name: 'javascript', count: 2, filePaths: ['/vault/a.md', '/vault/b.md'] },
			{ name: 'svelte', count: 1, filePaths: ['/vault/a.md'] },
		];
		vi.mocked(invoke).mockResolvedValueOnce(aggregates);

		await buildTagIndex();

		expect(invoke).toHaveBeenCalledWith('get_all_tags_v2');
		expect(tagsStore.tagTree.length).toBe(2);
		const tagNames = tagsStore.tagTree.map((t) => t.segment);
		expect(tagNames).toContain('javascript');
		expect(tagNames).toContain('svelte');
	});

	it('counts total unique tags', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ name: 'alpha', count: 2, filePaths: ['/vault/a.md', '/vault/b.md'] },
			{ name: 'beta', count: 1, filePaths: ['/vault/a.md'] },
			{ name: 'gamma', count: 1, filePaths: ['/vault/b.md'] },
		]);

		await buildTagIndex();

		expect(tagsStore.totalTagCount).toBe(3);
	});

	it('clears loading state on completion', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);

		await buildTagIndex();

		expect(tagsStore.isLoading).toBe(false);
	});

	it('handles empty IPC response', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([]);

		await buildTagIndex();

		expect(tagsStore.tagTree).toEqual([]);
		expect(tagsStore.totalTagCount).toBe(0);
	});

	it('clears loading state even on IPC error', async () => {
		vi.mocked(invoke).mockRejectedValueOnce(new Error('boom'));

		await buildTagIndex();

		expect(tagsStore.isLoading).toBe(false);
		// Tree is left in its prior state on error — empty here.
		expect(tagsStore.tagTree).toEqual([]);
	});
});

describe('updateTagSort', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetTags();
	});

	it('changes sort mode and re-sorts the in-memory tree without IPC', async () => {
		// Seed the tree via buildTagIndex first.
		vi.mocked(invoke).mockResolvedValueOnce([
			{ name: 'alpha', count: 2, filePaths: ['/vault/a.md', '/vault/b.md'] },
			{ name: 'beta', count: 1, filePaths: ['/vault/b.md'] },
		]);
		await buildTagIndex();
		vi.mocked(invoke).mockClear();

		updateTagSort('count');

		expect(tagsStore.sortMode).toBe('count');
		expect(tagsStore.tagTree[0].segment).toBe('alpha');
		// No additional IPC for sort.
		expect(invoke).not.toHaveBeenCalled();
	});
});

describe('resetTags', () => {
	it('clears all tag state', async () => {
		vi.mocked(invoke).mockResolvedValueOnce([
			{ name: 'tag', count: 1, filePaths: ['/vault/a.md'] },
		]);
		await buildTagIndex();
		expect(tagsStore.tagTree.length).toBeGreaterThan(0);

		resetTags();

		expect(tagsStore.tagTree).toEqual([]);
		expect(tagsStore.totalTagCount).toBe(0);
		expect(tagsStore.sortMode).toBe('count');
	});
});

describe('scheduleTagIndexRebuild', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetTags();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('coalesces a burst of triggers within the 300 ms debounce window into a single rebuild', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ name: 'tag', count: 1, filePaths: ['/vault/a.md'] },
		] satisfies TagAggregateV2[]);

		scheduleTagIndexRebuild();
		scheduleTagIndexRebuild();
		scheduleTagIndexRebuild();
		scheduleTagIndexRebuild();
		scheduleTagIndexRebuild();

		// Inside the debounce window — no IPC fired yet.
		expect(invoke).not.toHaveBeenCalled();

		vi.advanceTimersByTime(299);
		expect(invoke).not.toHaveBeenCalled();

		vi.advanceTimersByTime(1);
		// Switch back to real timers so awaited Promises can resolve.
		vi.useRealTimers();
		await flushScheduledTagIndexRebuild();

		expect(invoke).toHaveBeenCalledTimes(1);
	});

	it('runs again exactly once when a new trigger arrives while a rebuild is in flight', async () => {
		// First rebuild — gate it so we can land a second trigger mid-flight.
		let resolveFirst: ((value: TagAggregateV2[]) => void) | undefined;
		vi.mocked(invoke).mockImplementationOnce(
			() => new Promise<TagAggregateV2[]>((resolve) => { resolveFirst = resolve; }),
		);
		vi.mocked(invoke).mockResolvedValueOnce([] satisfies TagAggregateV2[]);

		scheduleTagIndexRebuild();
		vi.advanceTimersByTime(300);

		// The debounced trigger fired runScheduledRebuild — it called invoke
		// synchronously. Switch to real timers so the awaiting microtask can
		// observe the inflight Promise.
		vi.useRealTimers();
		await new Promise((r) => setTimeout(r, 0));
		expect(invoke).toHaveBeenCalledTimes(1);

		// Mid-flight trigger — must not start a second IPC yet.
		scheduleTagIndexRebuild();
		// Re-arm debounce so the pending trigger lands. flushScheduledTagIndexRebuild
		// also drains it, but we want to assert the in-flight gating first.
		await new Promise((r) => setTimeout(r, 310));
		// First rebuild is still pending — second invoke must not have started yet.
		expect(invoke).toHaveBeenCalledTimes(1);

		// Resolve the first rebuild — the pending flag should now trigger a
		// second rebuild automatically.
		resolveFirst?.([]);
		await flushScheduledTagIndexRebuild();

		expect(invoke).toHaveBeenCalledTimes(2);
	});

	it('cancels any pending debounced rebuild on resetTags', async () => {
		vi.mocked(invoke).mockResolvedValue([] satisfies TagAggregateV2[]);

		scheduleTagIndexRebuild();
		resetTags();
		vi.advanceTimersByTime(500);

		vi.useRealTimers();
		await new Promise((r) => setTimeout(r, 0));

		expect(invoke).not.toHaveBeenCalled();
	});
});
