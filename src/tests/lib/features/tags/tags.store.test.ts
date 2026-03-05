import { describe, it, expect, beforeEach } from 'vitest';
import { tagsStore } from '$lib/features/tags/tags.store.svelte';

describe('tagsStore', () => {
	beforeEach(() => {
		tagsStore.reset();
	});

	it('starts with default state', () => {
		expect(tagsStore.tagTree).toEqual([]);
		expect(tagsStore.sortMode).toBe('count');
		expect(tagsStore.hideRareTags).toBe(true);
		expect(tagsStore.isLoading).toBe(false);
		expect(tagsStore.totalTagCount).toBe(0);
	});

	it('setTagTree updates tag tree', () => {
		const tree = [{ name: 'work', count: 5 }] as any;
		tagsStore.setTagTree(tree);
		expect(tagsStore.tagTree).toBe(tree);
	});

	it('setSortMode updates sort mode', () => {
		tagsStore.setSortMode('count');
		expect(tagsStore.sortMode).toBe('count');
	});

	it('setLoading updates loading state', () => {
		tagsStore.setLoading(true);
		expect(tagsStore.isLoading).toBe(true);
	});

	it('setTotalTagCount updates total count', () => {
		tagsStore.setTotalTagCount(42);
		expect(tagsStore.totalTagCount).toBe(42);
	});

	it('setHideRareTags updates filter state', () => {
		tagsStore.setHideRareTags(false);
		expect(tagsStore.hideRareTags).toBe(false);
	});

	it('reset restores defaults', () => {
		tagsStore.setTagTree([{ name: 'a' }] as any);
		tagsStore.setSortMode('count');
		tagsStore.setHideRareTags(false);
		tagsStore.setLoading(true);
		tagsStore.setTotalTagCount(10);

		tagsStore.reset();

		expect(tagsStore.tagTree).toEqual([]);
		expect(tagsStore.sortMode).toBe('count');
		expect(tagsStore.hideRareTags).toBe(true);
		expect(tagsStore.isLoading).toBe(false);
		expect(tagsStore.totalTagCount).toBe(0);
	});
});
