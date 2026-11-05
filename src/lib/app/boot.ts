import { registerContentInvalidationListener } from '#lib/core/filesystem/note-change.service.js';
import { registerPathChangeConsumer } from '#lib/core/filesystem/path-change.service.js';
import { configureProfiling } from '#lib/core/markdown-editor/extensions/live-preview/core/profiling.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { registerWriteBarrier } from '#lib/core/vault/write-barrier.service.js';
import { backlinksStore } from '#lib/features/backlinks/backlinks.store.svelte.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { registerViewRowSetPort } from '#lib/features/collection/view-row-set.port.js';
import { drainEventCalendarWrites } from '#lib/features/event-calendar/event-calendar.service.js';
import { registerTypeIconLookup } from '#lib/features/file-icons/icon-resolver.js';
import { quickSwitcherStore } from '#lib/features/quick-switcher/quick-switcher.store.svelte.js';
import { viewEntriesLoaded, viewRowSet } from '#lib/features/rail-shell/lens.logic.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { effectiveViewSortLabel } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { clearViewParseCacheUnder } from '#lib/features/type-definitions/view-parse-cache.js';
import { clearLinkedContentCache } from '#lib/plugins/kanban/kanban.service.js';
import { registerQueryjsBlockPorts } from '#lib/plugins/queryjs/queryjs-ports.js';
import { appendLog } from '#lib/utils/log.service.js';
import { registerDeepLinkActions } from './deep-link-actions';

/** Unregister handles of the live registrations; empty while none are live. */
let registrations: (() => void)[] = [];

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
	if (registrations.length > 0) return;
	registrations = [
		// The toggle is read per call, so flipping it never reconfigures an editor.
		configureProfiling({ isEnabled: () => settingsStore.livePreviewProfiling, log: appendLog }),
		registerContentInvalidationListener('backlinks-unlinked-dirty', () => backlinksStore.markUnlinkedDirty()),
		registerQueryjsBlockPorts(),
		registerContentInvalidationListener('kanban-linked-content', clearLinkedContentCache),
		registerWriteBarrier('event-calendar', drainEventCalendarWrites),
		// A folder change arrives once, for the folder: both evictions are prefix-aware.
		registerPathChangeConsumer({
			// A view later living at the old path is re-read from disk, not served stale.
			name: 'view-parse-cache',
			pathChanged: (from) => clearViewParseCacheUnder(from),
		}),
		registerPathChangeConsumer({
			// The entry is dropped, not re-keyed: it pointed at a path that no longer exists.
			name: 'quick-switcher-recents',
			pathChanged: (from) => quickSwitcherStore.removeRecentPath(from),
		}),
		registerDeepLinkActions(),
		registerTypeIconLookup({
			typeOf: (path) => typeDefinitionsStore.getEntryByPath(path)?.isA,
			definitionPathOf: (typeName) => typeDefinitionsStore.getTypeDefinitionPath(typeName),
		}),
		// The collection editor lists a `.view` by the rail's rule, read from the stores per call.
		registerViewRowSetPort({
			rows: (viewPath, records, view, definition) =>
				viewRowSet(
					records,
					view,
					viewPath,
					{
						entries: typeDefinitionsStore.entries,
						vaultPath: vaultStore.path,
						systemFolder: settingsStore.templates.systemFolder,
					},
					definition,
				),
			entriesLoaded: () => viewEntriesLoaded(typeDefinitionsStore, collectionStore.propertyIndex, vaultStore.path),
			sortLabel: (viewPath) => effectiveViewSortLabel(typeDefinitionsStore.getEntryByPath(viewPath)),
		}),
	];
}

/**
 * Removes every registration `registerAppPorts` made, so a later call
 * registers them again exactly once.
 */
export function unregisterAppPorts(): void {
	for (const unregister of registrations) unregister();
	registrations = [];
}

// HMR re-runs this module with fresh module state while the core registries
// keep their entries, so the re-run's registerAppPorts would add every port a
// second time. Dispose the old module's registrations first.
import.meta.hot?.dispose(unregisterAppPorts);
