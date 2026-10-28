import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { settingsPanelStore } from '$lib/core/settings/settings-panel.store.svelte';
import { flushSettingsPersistence } from '$lib/core/settings/settings-persistence.svelte';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { refreshDailyNoteIfDateChanged } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { getVaultEntries } from '$lib/core/vault/vault-entries.service';
import { refreshArchivedPaths } from '$lib/features/properties/lifecycle-filter.service';
import { refreshTypeDefinitions } from '$lib/features/type-definitions/type-definitions.service';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { loadDirectoryTree } from '$lib/core/filesystem/fs.service';
import { buildContentOrderMap } from '$lib/features/folder-notes/folder-notes.logic';
import { buildPropertyIndex } from '$lib/features/collection/collection.service';
import { error } from '$lib/utils/debug';
import type { UpdateResultV2 } from '$lib/types/vault-v2.types';

/**
 * Registers a listener for the native macOS menu "Settings" event.
 * Opens the settings dialog when the user clicks Settings in the app menu.
 * Returns a cleanup function to unsubscribe.
 */
export function registerMenuSettingsListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	listen('menu:settings', () => {
		settingsPanelStore.toggle();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for menu:settings:', err);
	});
	return () => {
		cancelled = true;
		unlisten?.();
	};
}

/**
 * Registers a handler that saves all dirty tabs before the window closes,
 * preventing data loss on quit.
 * If any saves fail, prompts the user to confirm before closing.
 * Returns a cleanup function to unsubscribe.
 */
export function registerCloseHandler(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	getCurrentWindow().onCloseRequested(async (event) => {
		event.preventDefault();
		const failedPaths = await saveAllDirtyTabs();
		if (failedPaths.length > 0) {
			const fileNames = failedPaths.map((p) => p.split('/').pop()).join(', ');
			const discard = await ask(
				`Failed to save: ${fileNames}. Close anyway and lose unsaved changes?`,
				{ title: 'Unsaved Changes', kind: 'warning' },
			);
			if (!discard) return;
		}
		// The settings effect debounces its write by 500 ms; without this the
		// last change before quitting dies with the window. After the discard
		// prompt so a cancelled close does not flush.
		await flushSettingsPersistence();
		getCurrentWindow().destroy();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for close-requested:', err);
	});
	return () => {
		cancelled = true;
		unlisten?.();
	};
}

/** Delay between a `vault-index-updated` event and its refresh when no refresh ran recently. */
const REFRESH_DELAY_MS = 2000;

/** Minimum spacing between two `vault-index-updated` refreshes during a burst. */
const REFRESH_MIN_INTERVAL_MS = 10_000;

/**
 * Registers a listener for the Rust `vault-index-updated` event.
 * Bumps `vaultStore.vaultIndexVersion` from the payload's monotonic counter
 * so consumer panels (Backlinks, Outgoing, etc.) can invalidate cached views
 * via `$effect` on the version getter instead of polling.
 *
 * Phase 3.2 of the perf refactor (`tasks/todo/performance-architecture-refactor.md`).
 *
 * The handler is throttled because the event fires in bursts: the watcher
 * incremental loop emits ONE event PER FILE (`watcher-handler.service.ts`),
 * plus one per content-changed save and per 1 s typing pause. Each firing
 * used to refetch the ENTIRE vault snapshot (`get_all_vault_entries_v2` —
 * clone + sort + multi-MB JSON IPC) and re-run 4-5 O(N) rebuilds, so a
 * 10-file burst meant 10 full-snapshot fetches on the main thread (audit
 * 2026-06-10, HIGH finding 3). Throttling the bump itself also collapses the
 * burst for every `vaultIndexVersion` consumer (TasksView, GraphView, panels).
 * A trailing debounce could not coalesce files that land 5-10 s apart (an
 * embedder burst, 2026-10-27 log: ~198 refreshes in one session), so the
 * throttle works on time since the last refresh instead: an event arms a
 * timer only when none is pending, firing `REFRESH_DELAY_MS` after the event
 * but never sooner than `REFRESH_MIN_INTERVAL_MS` after the previous refresh.
 * Events that arrive while a timer is pending only update `latestVersion`, so
 * the trailing refresh after the last event always carries the latest version.
 * Panels may lag up to 10 s behind external changes during a burst (the
 * snapshot is a cache, CLAUDE.md Indexing 12).
 * `fetchSeq` is a latest-wins guard: a slow older fetch resolving after
 * a newer one must not overwrite the stores with a stale snapshot.
 * The snapshot read goes through the shared version-keyed memo
 * (`vault-entries.service.ts`), so this fan-out, wikilink completion and the
 * queryjs widget share ONE IPC per index version, and the memo's vault
 * open/close invalidation covers these store writes too.
 *
 * The refresh is also the PRODUCER for `collectionStore` (plan C11 option 2):
 * `buildPropertyIndex` otherwise only runs on vault open and on the watcher's
 * FULL rebuild, so an external edit or an incremental (<= 10 file) watcher
 * batch refreshed the Rust index without ever reprojecting the TS snapshot
 * that embedded collection blocks query. It keeps its own try/catch and needs no
 * `fetchSeq` guard: it publishes a whole snapshot, self-heals on the next
 * event, and the 10 s refresh spacing makes an out-of-order landing rare.
 *
 * Returns a cleanup function to unsubscribe (cancels any pending refresh).
 */
export function registerVaultIndexUpdatedListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	let latestVersion = 0;
	let fetchSeq = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastRefreshAt = Number.NEGATIVE_INFINITY;

	const refresh = () => {
		vaultStore.bumpVaultIndexVersion(latestVersion);
		buildPropertyIndex();
		const seq = ++fetchSeq;
		getVaultEntries().then((entries) => {
			if (cancelled || seq !== fetchSeq) return;
			refreshArchivedPaths(entries);
			refreshTypeDefinitions(entries);
			typeDefinitionsStore.setEntries(entries);
			const newOrder = buildContentOrderMap(entries);
			const oldOrder = fsStore.contentOrder;
			const orderChanged = newOrder.size !== oldOrder.size
				|| [...newOrder].some(([k, v]) => oldOrder.get(k) !== v);
			fsStore.setContentOrder(newOrder);
			if (orderChanged && vaultStore.path) {
				loadDirectoryTree(vaultStore.path);
			}
		}).catch((err) => { error('LISTENERS', 'get_all_vault_entries_v2 failed:', err); });
	};
	const scheduleRefresh = () => {
		if (timer !== undefined) return;
		const wait = Math.max(REFRESH_DELAY_MS, lastRefreshAt + REFRESH_MIN_INTERVAL_MS - Date.now());
		timer = setTimeout(() => {
			timer = undefined;
			lastRefreshAt = Date.now();
			refresh();
		}, wait);
	};

	listen<UpdateResultV2>('vault-index-updated', (event) => {
		latestVersion = event.payload.version;
		scheduleRefresh();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for vault-index-updated:', err);
	});
	return () => {
		cancelled = true;
		clearTimeout(timer);
		timer = undefined;
		unlisten?.();
	};
}


/**
 * Registers a listener for window focus changes.
 * When the window regains focus, checks if the date has changed
 * and refreshes the auto-pinned daily note if needed.
 * Returns a cleanup function to unsubscribe.
 */
export function registerFocusListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	getCurrentWindow().onFocusChanged(({ payload: focused }) => {
		if (focused) {
			refreshDailyNoteIfDateChanged().catch((err) => {
				error('LISTENERS', 'Failed to refresh daily note on focus:', err);
			});
		}
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for focus changes:', err);
	});
	return () => {
		cancelled = true;
		unlisten?.();
	};
}
