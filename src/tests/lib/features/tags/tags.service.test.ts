import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { tagsStore } from '$lib/features/tags/tags.store.svelte';
import { buildTagIndex, updateTagSort, resetTags } from '$lib/features/tags/tags.service';
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
