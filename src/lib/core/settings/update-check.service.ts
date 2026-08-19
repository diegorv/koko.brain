import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { settingsStore } from './settings.store.svelte';
import { error } from '$lib/utils/debug';

/**
 * Metadata for an available update, returned by the channel-aware Rust
 * command (`check_for_update_on_channel`). Mirrors the
 * `UpdateMetadata` struct in `src-tauri/src/commands/update_channel.rs`.
 */
export interface UpdateMetadata {
	rid: number;
	currentVersion: string;
	version: string;
	body: string | null;
}

/**
 * Trigger a non-interactive update check on app launch if the user has
 * `updates.autoCheck` enabled. Updates `lastCheckedAt` on success
 * regardless of whether an update was found — the field tracks "when
 * did we last ask GitHub", not "when did we last find something".
 *
 * On finding an update: shows a one-time toast prompting the user to
 * open Settings → Update. Does NOT download or install — that requires
 * an explicit user click on the dialog.
 *
 * Errors are logged but do not surface to the user (a transient network
 * failure during cold start should not nag the user with a toast).
 */
export async function maybeAutoCheckForUpdates(): Promise<void> {
	const { autoCheck, channel } = settingsStore.updates;
	if (!autoCheck) return;

	try {
		const update = await invoke<UpdateMetadata | null>('check_for_update_on_channel', { channel });
		// Mutating the store IS persisting: the settings persistence owner
		// writes the timestamp, so the "Last checked" row survives a relaunch.
		settingsStore.updateUpdates({ lastCheckedAt: Date.now() });
		if (update) {
			toast.info(`Update available: ${update.version}`, {
				description: 'Open Settings → Update to install.',
				duration: 8000,
			});
		}
	} catch (err) {
		error('AUTO-UPDATE', 'Background update check failed:', err);
	}
}
