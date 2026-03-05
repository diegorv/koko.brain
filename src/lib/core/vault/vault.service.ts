import { open } from '@tauri-apps/plugin-dialog';
import { exists } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { vaultStore } from './vault.store.svelte';
import { error } from '$lib/utils/debug';

/** Opens a native directory picker and, if the user selects a folder, opens it as a vault */
export async function openVaultDialog(): Promise<boolean> {
	const selected = await open({ directory: true, multiple: false });
	if (selected) {
		vaultStore.open(selected);
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
	vaultStore.open(path);
	return true;
}

/** Closes the current vault and returns to the vault picker screen */
export function closeVault() {
	vaultStore.close();
}
