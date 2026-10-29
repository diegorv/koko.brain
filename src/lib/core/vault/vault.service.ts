import { open } from '@tauri-apps/plugin-dialog';
import { exists } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { drainEventCalendarWrites } from '#lib/features/event-calendar/event-calendar.service.js';
import { error } from '#lib/utils/debug.js';
import { vaultStore } from './vault.store.svelte';

/**
 * Opens `path` as the vault once every in-flight calendar write has settled.
 * A write to a closed note checks that the vault is unchanged after its file
 * write and skips the index update otherwise, so changing the path first
 * would leave its bytes on disk with no index update in the vault it wrote to.
 * @param path - absolute path of the vault to open
 */
export async function switchVault(path: string): Promise<void> {
	await drainEventCalendarWrites();
	vaultStore.open(path);
}

/** Opens a native directory picker and, if the user selects a folder, opens it as a vault */
export async function openVaultDialog(): Promise<boolean> {
	const selected = await open({ directory: true, multiple: false });
	if (selected) {
		await switchVault(selected);
		return true;
	}
	return false;
}

/**
 * Opens a vault by its path (used when clicking a recent vault entry).
 * Validates the directory still exists — removes stale entries and shows a toast if not.
 */
export async function openRecentVault(path: string): Promise<boolean> {
	try {
		const pathExists = await exists(path);
		if (!pathExists) {
			error('VAULT', `Cannot open vault — path does not exist: ${path}`);
			vaultStore.removeRecent(path);
			toast.error('Vault folder no longer exists. Removed from recent vaults.');
			return false;
		}
	} catch (err) {
		error('VAULT', 'Failed to check vault path:', err);
	}
	await switchVault(path);
	return true;
}
