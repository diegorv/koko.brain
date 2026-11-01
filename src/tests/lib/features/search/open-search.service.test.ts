import { describe, it, expect, beforeEach } from 'vitest';
import { searchStore } from '#lib/features/search/search.store.svelte.js';
import { openSearch, toggleSearch } from '#lib/features/search/open-search.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { SEARCH_RAIL_ITEM } from '#lib/features/rail-shell/lens.logic.js';

describe('openSearch', () => {
	beforeEach(() => {
		searchStore.reset();
		settingsStore.reset();
	});

	describe('in the rail shell', () => {
		beforeEach(() => {
			settingsStore.updateLayout({ shell: 'rail', railItem: 'inbox', railPanelsVisible: false });
		});

		it('picks the Search rail item, shows the panels, sets the query and asks for focus', () => {
			openSearch('tag:work');
			expect(settingsStore.layout.railItem).toBe(SEARCH_RAIL_ITEM);
			expect(settingsStore.layout.railPanelsVisible).toBe(true);
			expect(searchStore.query).toBe('tag:work');
			expect(searchStore.focusRequest).toBe(1);
		});

		it('leaves the classic search panel closed', () => {
			openSearch('alpha');
			expect(searchStore.isOpen).toBe(false);
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
	});

	describe('in the classic shell', () => {
		it('opens the search panel with the query and leaves the rail item alone', () => {
			const railItem = settingsStore.layout.railItem;
			openSearch('tag:work');
			expect(searchStore.isOpen).toBe(true);
			expect(searchStore.query).toBe('tag:work');
			expect(settingsStore.layout.railItem).toBe(railItem);
		});

		it('keeps the current query when none is given', () => {
			searchStore.setQuery('roadmap');
			openSearch();
			expect(searchStore.isOpen).toBe(true);
			expect(searchStore.query).toBe('roadmap');
		});
	});
});

describe('toggleSearch', () => {
	beforeEach(() => {
		searchStore.reset();
		settingsStore.reset();
	});

	it('opens rail Search in the rail shell, and a second call keeps it open', () => {
		settingsStore.updateLayout({ shell: 'rail', railItem: 'today' });
		toggleSearch();
		expect(settingsStore.layout.railItem).toBe(SEARCH_RAIL_ITEM);
		toggleSearch();
		expect(settingsStore.layout.railItem).toBe(SEARCH_RAIL_ITEM);
		expect(searchStore.focusRequest).toBe(2);
		expect(searchStore.isOpen).toBe(false);
	});

	it('toggles the search panel in the classic shell', () => {
		toggleSearch();
		expect(searchStore.isOpen).toBe(true);
		toggleSearch();
		expect(searchStore.isOpen).toBe(false);
	});
});
