import { describe, it, expect, beforeEach } from 'vitest';
import { graphViewStore } from '$lib/plugins/graph-view/graph-view.store.svelte';

describe('graphViewStore', () => {
	beforeEach(() => {
		graphViewStore.reset();
	});

	it('starts with default state', () => {
		expect(graphViewStore.mode).toBe('global');
		expect(graphViewStore.filters).toEqual({ tag: null, folder: null, searchQuery: '', showOrphans: true });
		expect(graphViewStore.display).toEqual({ showArrows: false });
		expect(graphViewStore.highlightedNodeId).toBeNull();
	});

	it('setMode updates mode', () => {
		graphViewStore.setMode('local');
		expect(graphViewStore.mode).toBe('local');
	});

	it('setFilters partially merges filters', () => {
		graphViewStore.setFilters({ tag: 'work' });
		expect(graphViewStore.filters.tag).toBe('work');
		expect(graphViewStore.filters.folder).toBeNull();
		expect(graphViewStore.filters.searchQuery).toBe('');
		expect(graphViewStore.filters.showOrphans).toBe(true);
	});

	it('setFilters toggles showOrphans', () => {
		graphViewStore.setFilters({ showOrphans: false });
		expect(graphViewStore.filters.showOrphans).toBe(false);
		expect(graphViewStore.filters.tag).toBeNull();
	});

	it('setDisplay toggles showArrows', () => {
		graphViewStore.setDisplay({ showArrows: true });
		expect(graphViewStore.display.showArrows).toBe(true);
	});

	it('setHighlightedNode updates highlighted node', () => {
		graphViewStore.setHighlightedNode('node-1');
		expect(graphViewStore.highlightedNodeId).toBe('node-1');
	});

	it('reset restores defaults', () => {
		graphViewStore.setMode('local');
		graphViewStore.setFilters({ tag: 'work', searchQuery: 'test' });
		graphViewStore.setDisplay({ showArrows: true });
		graphViewStore.setHighlightedNode('n1');

		graphViewStore.reset();

		expect(graphViewStore.mode).toBe('global');
		expect(graphViewStore.filters).toEqual({ tag: null, folder: null, searchQuery: '', showOrphans: true });
		expect(graphViewStore.display).toEqual({ showArrows: false });
		expect(graphViewStore.highlightedNodeId).toBeNull();
	});
});
