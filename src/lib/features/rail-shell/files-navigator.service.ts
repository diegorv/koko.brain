import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { followFolderPathChange } from './lens.logic';

/**
 * Registers the Files navigator as a path-change consumer, so its saved pick
 * and expanded folders follow a folder renamed, moved or deleted anywhere in
 * the app. Returns an unregister function; `initializeVault` registers it and
 * `teardownVault` unregisters it.
 */
export function registerFilesNavigatorPathChangeConsumer(): () => void {
	return registerPathChangeConsumer({
		name: 'files-navigator',
		pathChanged(from, to) {
			const { railFolder, railExpandedFolders } = settingsStore.layout;
			const fix = followFolderPathChange(railFolder, railExpandedFolders, from, to);
			if (fix) settingsStore.updateLayout(fix);
		},
	});
}
