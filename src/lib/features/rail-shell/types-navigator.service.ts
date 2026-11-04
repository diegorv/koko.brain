import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { followRailPinPathChange, followTypesPickPathChange } from './lens.logic';

/**
 * Registers the Types navigator as a path-change consumer, so once a view (or
 * its folder) is moved to the Trash anywhere in the app, a saved pick of it is
 * cleared and, when the rail shows it as a pinned item, the rail goes back to
 * the default item. Returns an unregister function; `initializeVault`
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
