import { invoke } from '$lib/api';
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
 * Decide whether the auto-check should run right now.
 *
 * Currently this is a thin wrapper over the `autoCheck` flag — no
 * launch throttle. The previous implementation used a 24h throttle
 * keyed on `lastCheckedAt`, but for a Nightly user whose channel
 * publishes multiple builds per day that broke the feature's promise
 * (the toggle is literally labelled "Auto-check on launch"). A single
 * HTTP request to a GitHub release-asset CDN per app open is
 * negligible traffic, and `maybeAutoCheckForUpdates` is gated by the
 * vault-init effect so it fires at most once per vault open anyway.
 *
 * Kept as a named function so the rest of the service can pass the
 * boolean intent through one chokepoint and the unit tests can cover
 * the trivial cases without spinning up the Tauri IPC layer.
 *
 * `lastCheckedAt` is still tracked for the "Last checked" UI row but
 * no longer participates in the should-run decision.
 */
export function shouldAutoCheckNow(autoCheck: boolean): boolean {
	return autoCheck;
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
	const { autoCheck, channel } = settingsStore.updates;
	if (!shouldAutoCheckNow(autoCheck)) return;

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
