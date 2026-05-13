import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { settingsStore } from './settings.store.svelte';
import { saveSettings } from './settings.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
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
 * How long the auto-check stays quiet after a previous check.
 *
 * 24 hours matches the cadence most desktop apps use for background
 * update checks (Sparkle, Squirrel, etc). Opening + closing the app
 * five times in a day should produce ONE network call, not five.
 */
const AUTO_CHECK_THROTTLE_MS = 24 * 60 * 60 * 1000;

/**
 * Decide whether the auto-check should run right now.
 *
 * Exported separately from `maybeAutoCheckForUpdates` so the throttle
 * logic can be unit-tested without spinning up the Tauri IPC or the
 * toast layer.
 */
export function shouldAutoCheckNow(
	autoCheck: boolean,
	lastCheckedAt: number | null,
	now: number,
): boolean {
	if (!autoCheck) return false;
	if (lastCheckedAt === null) return true;
	return now - lastCheckedAt >= AUTO_CHECK_THROTTLE_MS;
}

/**
 * Trigger a non-interactive update check on app launch if the user has
 * `updates.autoCheck` enabled and the last check is older than the
 * throttle window. Updates `lastCheckedAt` on success regardless of
 * whether an update was found — the field tracks "when did we last
 * ask GitHub", not "when did we last find something".
 *
 * On finding an update: shows a one-time toast prompting the user to
 * open Settings → Update. Does NOT download or install — that requires
 * an explicit user click on the dialog.
 *
 * Errors are logged but do not surface to the user (a transient network
 * failure during cold start should not nag the user with a toast).
 */
export async function maybeAutoCheckForUpdates(): Promise<void> {
	const { autoCheck, lastCheckedAt, channel } = settingsStore.updates;
	if (!shouldAutoCheckNow(autoCheck, lastCheckedAt, Date.now())) return;

	try {
		const update = await invoke<UpdateMetadata | null>('check_for_update_on_channel', { channel });
		settingsStore.updateUpdates({ lastCheckedAt: Date.now() });
		// Persist the timestamp so a relaunch within the throttle window
		// does not duplicate the check.
		if (vaultStore.path) {
			await saveSettings(vaultStore.path).catch((err) => {
				error('AUTO-UPDATE', 'Failed to persist lastCheckedAt:', err);
			});
		}
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
