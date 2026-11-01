import { registerContentInvalidationListener } from '#lib/core/filesystem/note-change.service.js';
import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import { invalidateQueryjsCache } from '#lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.js';
import { registerWriteBarrier } from '#lib/core/vault/write-barrier.service.js';
import { backlinksStore } from '#lib/features/backlinks/backlinks.store.svelte.js';
import { drainEventCalendarWrites } from '#lib/features/event-calendar/event-calendar.service.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import { clearViewParseCacheUnder } from '#lib/features/type-definitions/view-parse-cache.js';
import { clearLinkedContentCache } from '#lib/plugins/kanban/kanban.service.js';

/** Whether `registerAppPorts` already ran. */
let registered = false;

/**
 * Wires the features and plugins that core reaches through ports for the
 * whole app lifetime. Idempotent: a second call registers nothing.
 *
 * Call it synchronously when the app shell loads, never from a vault-scoped
 * effect: `initializeVault` unregisters its vault-lifetime registrations at
 * entry, before it saves dirty tabs and drains calendar writes, so these
 * ports must outlive every vault and stay out of that list.
 */
export function registerAppPorts(): void {
	if (registered) return;
	registered = true;
	registerContentInvalidationListener('backlinks-unlinked-dirty', () => backlinksStore.markUnlinkedDirty());
	registerContentInvalidationListener('queryjs-cache', invalidateQueryjsCache);
	registerContentInvalidationListener('kanban-linked-content', clearLinkedContentCache);
	registerWriteBarrier('event-calendar', drainEventCalendarWrites);
	// A folder change arrives once, for the folder: both evictions are prefix-aware.
	registerPathChangeConsumer({
		// A view later living at the old path is re-read from disk, not served stale.
		name: 'view-parse-cache',
		pathChanged: (from) => clearViewParseCacheUnder(from),
	});
	registerPathChangeConsumer({
		// The entry is dropped, not re-keyed: it pointed at a path that no longer exists.
		name: 'quick-switcher-recents',
		pathChanged: (from) => quickSwitcherStore.removeRecentPath(from),
	});
}
