import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { SEARCH_RAIL_ITEM } from '#lib/features/rail-shell/lens.logic.js';
import { searchStore } from './search.store.svelte';

/**
 * Shows Search with `query` (the current query stays when it is left out):
 * picks the Search rail item, shows the panels Cmd+1 may have hidden and
 * focuses the input. Shared by the "/" key, Cmd+Shift+F, the palette command,
 * a tag click and a `kokobrain://search` link.
 */
export function openSearch(query?: string): void {
	if (query !== undefined) searchStore.setQuery(query);
	settingsStore.updateLayout({ railItem: SEARCH_RAIL_ITEM, railPanelsVisible: true });
	searchStore.requestFocus();
}
