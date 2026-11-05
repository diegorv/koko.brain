import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { followRailPinPathChange, followTypesPickPathChange } from './lens.logic';

/**
 * Registers the Types navigator as a path-change consumer, so a saved pick of a
 * view and the rail showing it as a pinned item follow a rename or move of the
 * view (or its folder) anywhere in the app. Once it goes to the Trash, the pick
 * is cleared and the rail goes back to the default item. Returns an unregister function; `initializeVault`
 * registers it and `teardownVault` unregisters it.
 */
export function registerTypesNavigatorPathChangeConsumer(): () => void {
	return registerPathChangeConsumer({
		name: 'types-navigator',
		pathChanged(from, to) {
			const layout = settingsStore.layout;
			const fix = { ...followTypesPickPathChange(layout.railTypesLens, from, to), ...followRailPinPathChange(layout.railItem, from, to) };
			if (Object.keys(fix).length > 0) settingsStore.updateLayout(fix);
		},
	});
}
