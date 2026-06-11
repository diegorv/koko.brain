import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { tagsStore } from '$lib/features/tags/tags.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { TAGS_VIRTUAL_PATH } from '$lib/core/editor/editor.logic';
import {
	buildTagIndex,
	updateTagSort,
	resetTags,
	scheduleTagIndexRebuild,
	flushScheduledTagIndexRebuild,
	openTagsTab,
	closeTagsTab,
	toggleTagsTab,
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

describe('openTagsTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('creates the Tags virtual tab and makes it active', () => {
		openTagsTab();

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.activeTab).toMatchObject({
			path: TAGS_VIRTUAL_PATH,
			name: 'Tags',
			fileType: 'tags',
		});
	});

	it('focuses the existing Tags tab instead of duplicating it', () => {
		openTagsTab();
		// Open another file — Tags tab loses focus.
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });
		expect(editorStore.activeTabPath).toBe('/vault/a.md');

		openTagsTab();

		expect(editorStore.tabs).toHaveLength(2);
		expect(editorStore.activeTabPath).toBe(TAGS_VIRTUAL_PATH);
	});
});

describe('closeTagsTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('removes the Tags tab when it exists', () => {
		openTagsTab();
		expect(editorStore.tabs).toHaveLength(1);

		closeTagsTab();

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeTab).toBeNull();
	});

	it('is a no-op when no Tags tab is open', () => {
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });

		closeTagsTab();

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.activeTabPath).toBe('/vault/a.md');
	});
});

describe('toggleTagsTab', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('opens the Tags tab when closed', () => {
		toggleTagsTab();

		expect(editorStore.tabs).toHaveLength(1);
		expect(editorStore.activeTabPath).toBe(TAGS_VIRTUAL_PATH);
	});

	it('closes the Tags tab when it is the active tab', () => {
		toggleTagsTab();
		expect(editorStore.activeTabPath).toBe(TAGS_VIRTUAL_PATH);

		toggleTagsTab();

		expect(editorStore.tabs).toHaveLength(0);
		expect(editorStore.activeTab).toBeNull();
	});

	it('focuses the Tags tab when open but not active', () => {
		toggleTagsTab();
		editorStore.addTab({ path: '/vault/a.md', name: 'a.md', content: '', savedContent: '' });
		expect(editorStore.activeTabPath).toBe('/vault/a.md');

		toggleTagsTab();

		// Tab focused, not closed and not duplicated.
		expect(editorStore.tabs).toHaveLength(2);
		expect(editorStore.activeTabPath).toBe(TAGS_VIRTUAL_PATH);
	});
});

describe('resetTags — Tags tab cleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
	});

	it('closes the Tags tab on reset', () => {
		openTagsTab();
		expect(editorStore.tabs).toHaveLength(1);

		resetTags();

		expect(editorStore.tabs).toHaveLength(0);
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
