import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { SEARCH_RAIL_ITEM } from '#lib/features/rail-shell/lens.logic.js';
import { searchStore } from './search.store.svelte';

/**
 * Shows Search with `query` (the current query stays when it is left out).
 * The rail shell picks the Search rail item, shows the panels Cmd+1 may have
 * hidden and focuses the input; the classic shell opens SearchPanel. Shared by
 * the "/" key, Cmd+Shift+F, the palette command, a tag click and a
 * `kokobrain://search` link.
 */
export function openSearch(query?: string): void {
	if (query !== undefined) searchStore.setQuery(query);
	if (settingsStore.layout.shell === 'rail') {
		settingsStore.updateLayout({ railItem: SEARCH_RAIL_ITEM, railPanelsVisible: true });
		searchStore.requestFocus();
		return;
	}
	searchStore.setOpen(true);
}

/**
 * Cmd+Shift+F and the "Search in Vault" command: the classic shell toggles
 * SearchPanel; the rail shell has no closed state to toggle to, so it opens
 * (and focuses) rail Search.
 */
export function toggleSearch(): void {
	if (settingsStore.layout.shell === 'rail') {
		openSearch();
		return;
	}
	searchStore.toggle();
}
