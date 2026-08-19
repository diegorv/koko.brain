import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { settingsPanelStore } from '$lib/core/settings/settings-panel.store.svelte';
import { flushSettingsPersistence } from '$lib/core/settings/settings-persistence.svelte';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { refreshDailyNoteIfDateChanged } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { refreshArchivedPaths } from '$lib/features/properties/lifecycle-filter.service';
import { refreshTypeDefinitions } from '$lib/features/type-definitions/type-definitions.service';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { loadDirectoryTree } from '$lib/core/filesystem/fs.service';
import { buildContentOrderMap } from '$lib/features/folder-notes/folder-notes.logic';
import { buildPropertyIndex } from '$lib/features/collection/collection.service';
import { debounce } from '$lib/utils/debounce';
import { error } from '$lib/utils/debug';
import type { NoteEntryV2, UpdateResultV2 } from '$lib/types/vault-v2.types';

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

/**
 * Registers a listener for the Rust `vault-index-updated` event.
 * Bumps `vaultStore.vaultIndexVersion` from the payload's monotonic counter
 * so consumer panels (Backlinks, Outgoing, etc.) can invalidate cached views
 * via `$effect` on the version getter instead of polling.
 *
 * Phase 3.2 of the perf refactor (`tasks/todo/performance-architecture-refactor.md`).
 *
 * The handler is debounced (300 ms trailing) because the event fires in
 * bursts: the watcher incremental loop emits ONE event PER FILE
 * (`watcher-handler.service.ts`), plus one per content-changed save and
 * per 1 s typing pause. Each firing used to refetch the ENTIRE vault
 * snapshot (`get_all_vault_entries_v2` — clone + sort + multi-MB JSON
 * IPC) and re-run 4-5 O(N) rebuilds, so a 10-file burst meant 10
 * full-snapshot fetches on the main thread (audit 2026-06-10, HIGH
 * finding 3). Debouncing the bump itself also collapses the burst for
 * every `vaultIndexVersion` consumer (TasksView, GraphView, panels) —
 * same rationale and window as `tags.service.ts::scheduleTagIndexRebuild`.
 * `fetchSeq` is a latest-wins guard: a slow older fetch resolving after
 * a newer one must not overwrite the stores with a stale snapshot.
 *
 * The refresh is also the PRODUCER for `collectionStore` (plan C11 option 2):
 * `buildPropertyIndex` otherwise only runs on vault open and on the watcher's
 * FULL rebuild, so an external edit or an incremental (<= 10 file) watcher
 * batch refreshed the Rust index without ever reprojecting the TS snapshot
 * that embedded collection blocks query. It keeps its own try/catch and needs no
 * `fetchSeq` guard: it publishes a whole snapshot, self-heals on the next
 * event, and the 300 ms debounce makes an out-of-order landing rare.
 *
 * Returns a cleanup function to unsubscribe (cancels any pending refresh).
 */
export function registerVaultIndexUpdatedListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	let latestVersion = 0;
	let fetchSeq = 0;

	const refresh = () => {
		vaultStore.bumpVaultIndexVersion(latestVersion);
		buildPropertyIndex();
		const seq = ++fetchSeq;
		invoke<NoteEntryV2[]>('get_all_vault_entries_v2').then((entries) => {
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
	const debouncedRefresh = debounce(refresh, 300);

	listen<UpdateResultV2>('vault-index-updated', (event) => {
		latestVersion = event.payload.version;
		debouncedRefresh();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for vault-index-updated:', err);
	});
	return () => {
		cancelled = true;
		debouncedRefresh.cancel();
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
