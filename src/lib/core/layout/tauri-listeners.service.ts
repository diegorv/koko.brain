import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { settingsDialogStore } from '$lib/core/settings/settings-dialog.store.svelte';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { refreshDailyNoteIfDateChanged } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { refreshArchivedPaths } from '$lib/features/properties/lifecycle-filter.service';
import { refreshTypeDefinitions } from '$lib/features/type-definitions/type-definitions.service';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { applyFolderOrder, attachFileCounts } from '$lib/core/filesystem/fs.logic';
import { buildContentOrderMap } from '$lib/features/folder-notes/folder-notes.logic';
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
		settingsDialogStore.open();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		console.error('Failed to listen for menu:settings:', err);
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
		getCurrentWindow().destroy();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		console.error('Failed to listen for close-requested:', err);
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
 * Until per-feature consumers migrate (Phase 3.4 onwards), the bump is a
 * harmless reactive signal — nothing reads `vaultIndexVersion` yet.
 *
 * Returns a cleanup function to unsubscribe.
 */
export function registerVaultIndexUpdatedListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	listen<UpdateResultV2>('vault-index-updated', (event) => {
		vaultStore.bumpVaultIndexVersion(event.payload.version);
		invoke<NoteEntryV2[]>('get_all_vault_entries_v2').then((entries) => {
			if (cancelled) return;
			refreshArchivedPaths(entries);
			refreshTypeDefinitions(entries);
			typeDefinitionsStore.setEntries(entries);
			const newOrder = buildContentOrderMap(entries);
			const oldOrder = fsStore.contentOrder;
			const orderChanged = newOrder.size !== oldOrder.size
				|| [...newOrder].some(([k, v]) => oldOrder.get(k) !== v);
			fsStore.setContentOrder(newOrder);
			if (orderChanged && fsStore.fileTree.length > 0 && vaultStore.path) {
				const sorted = applyFolderOrder(fsStore.fileTree, fsStore.folderOrder, vaultStore.path, vaultStore.path, newOrder);
				attachFileCounts(sorted);
				fsStore.setFileTree(sorted);
			}
		}).catch((err) => { console.error('get_all_vault_entries_v2 failed:', err); });
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		console.error('Failed to listen for vault-index-updated:', err);
	});
	return () => {
		cancelled = true;
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
				console.error('Failed to refresh daily note on focus:', err);
			});
		}
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		console.error('Failed to listen for focus changes:', err);
	});
	return () => {
		cancelled = true;
		unlisten?.();
	};
}
