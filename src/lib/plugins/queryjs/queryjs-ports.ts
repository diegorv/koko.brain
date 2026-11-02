import { registerTabCloseListener } from '#lib/core/editor/editor.service.js';
import { registerContentInvalidationListener } from '#lib/core/filesystem/note-change.service.js';
import { invalidateQueryjsCache } from './queryjs-block-widget';
import { queryjsSessionStore } from './queryjs-session.store.svelte';

/**
 * Wires the queryjs blocks' app-lifetime ports: a content change clears the
 * cached results (`invalidateQueryjsCache`), and a closed tab drops its file's
 * autoRun marker, so reopening the file (or restoring a deleted one) restarts
 * the 'first-open' policy. Cached results survive the close so a recently
 * viewed note reopens instantly. Returns the unregister function.
 */
export function registerQueryjsBlockPorts(): () => void {
	const unregister = [
		registerContentInvalidationListener('queryjs-cache', invalidateQueryjsCache),
		registerTabCloseListener('queryjs-autorun', (path) => queryjsSessionStore.invalidatePath(path)),
	];
	return () => {
		for (const fn of unregister) fn();
	};
}
