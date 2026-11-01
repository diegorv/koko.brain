import { describe, it, expect, beforeEach } from 'vitest';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { openSearch } from '#lib/features/search/open-search.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { SEARCH_RAIL_ITEM } from '#lib/features/rail-shell/lens.logic.js';

describe('openSearch', () => {
	beforeEach(() => {
		searchStore.reset();
		settingsStore.reset();
		settingsStore.updateLayout({ railItem: 'inbox', railPanelsVisible: false });
	});

	it('picks the Search rail item, shows the panels, sets the query and asks for focus', () => {
		openSearch('tag:work');
		expect(settingsStore.layout.railItem).toBe(SEARCH_RAIL_ITEM);
		expect(settingsStore.layout.railPanelsVisible).toBe(true);
		expect(searchStore.query).toBe('tag:work');
		expect(searchStore.focusRequest).toBe(1);
	});

	it('keeps the current query when none is given', () => {
		searchStore.setQuery('roadmap');
		openSearch();
		expect(searchStore.query).toBe('roadmap');
		expect(settingsStore.layout.railItem).toBe(SEARCH_RAIL_ITEM);
	});

	it('replaces the query with an empty one when given an empty string', () => {
		searchStore.setQuery('roadmap');
		openSearch('');
		expect(searchStore.query).toBe('');
	});

	it('keeps Search shown on a second call and asks for focus again', () => {
		openSearch();
		openSearch();
		expect(settingsStore.layout.railItem).toBe(SEARCH_RAIL_ITEM);
		expect(searchStore.focusRequest).toBe(2);
	});
});
