import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ask } from '@tauri-apps/plugin-dialog';
import { settingsDialogStore } from '$lib/core/settings/settings-dialog.store.svelte';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { refreshDailyNoteIfDateChanged } from '$lib/plugins/periodic-notes/periodic-notes.service';

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
