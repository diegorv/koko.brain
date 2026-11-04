import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { followTypesPickPathChange } from './lens.logic';

/**
 * Registers the Types navigator as a path-change consumer, so a saved pick of
 * a view is cleared once that view (or its folder) is moved to the Trash
 * anywhere in the app. Returns an unregister function; `initializeVault`
 * registers it and `teardownVault` unregisters it.
 */
export function registerTypesNavigatorPathChangeConsumer(): () => void {
	return registerPathChangeConsumer({
		name: 'types-navigator',
		pathChanged(from, to) {
			const fix = followTypesPickPathChange(settingsStore.layout.railTypesLens, from, to);
			if (fix) settingsStore.updateLayout(fix);
		},
	});
}
