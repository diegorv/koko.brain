import { documentDir } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { vaultStore } from './vault.store.svelte';
import { mobileVaultPath } from './vault.logic';
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

/**
 * Opens the single on-device vault used by the mobile build
 * (`<documents>/kokobrain-vaults/Notes`), creating the folder on first
 * launch. iOS has no folder picker for arbitrary locations, so the vault
 * lives in the app container's Documents directory, which the Files app
 * exposes for editing and syncing. Failures are reported with a toast and
 * leave the vault closed.
 */
export async function openMobileVault(): Promise<boolean> {
	try {
		const documents = await documentDir();
		const path = mobileVaultPath(documents);
		if (!(await exists(path))) {
			await mkdir(path, { recursive: true });
		}
		vaultStore.open(path);
		return true;
	} catch (err) {
		error('VAULT', 'Failed to open the on-device vault:', err);
		toast.error('Could not open the on-device vault.');
		return false;
	}
}
