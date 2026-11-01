import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { NEIGHBOURHOOD_RAIL_ITEM, TODAY_RAIL_ITEM } from './lens.logic';
import { neighbourhoodStore } from './neighbourhood.store.svelte';

/**
 * Fills the note list with the neighbourhood of the note at `path`, showing
 * the panels Cmd+1 may have hidden.
 */
export function openNeighbourhood(path: string): void {
	neighbourhoodStore.setNotePath(path);
	settingsStore.updateLayout({ railItem: NEIGHBOURHOOD_RAIL_ITEM, railPanelsVisible: true });
}

/**
 * Registers the Neighbourhood lens as a path-change consumer, so the open
 * neighbourhood follows its note (or a folder above it) when renamed or moved.
 * A deleted note clears it and, while the lens is showing, falls back to
 * Today. Returns an unregister function; `initializeVault` registers it and
 * `teardownVault` unregisters it.
 */
export function registerNeighbourhoodPathChangeConsumer(): () => void {
	return registerPathChangeConsumer({
		name: 'neighbourhood',
		pathChanged(from, to) {
			const path = neighbourhoodStore.notePath;
			if (!path || (path !== from && !path.startsWith(from + '/'))) return;
			if (to !== null) {
				neighbourhoodStore.setNotePath(to + path.slice(from.length));
				return;
			}
			neighbourhoodStore.reset();
			if (settingsStore.layout.railItem === NEIGHBOURHOOD_RAIL_ITEM) settingsStore.updateLayout({ railItem: TODAY_RAIL_ITEM });
		},
	});
}
