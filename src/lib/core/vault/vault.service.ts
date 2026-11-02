import { open } from '@tauri-apps/plugin-dialog';
import { exists } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { saveAllDirtyTabs } from '#lib/core/editor/editor.service.js';
import { error } from '#lib/utils/debug.js';
import { confirmDiscardFailedSaves } from './exit.service';
import { vaultStore } from './vault.store.svelte';
import { drainPendingWrites } from './write-barrier.service';

/**
 * Opens `path` as the vault once every dirty tab is saved and every write
 * behind a registered write barrier has settled. Both must finish while
 * `vaultStore.path` is still the old vault: the file-history and search
 * after-save observers key the save by `vaultStore.path` (and
 * `initializeVault` unregisters them before its own save), and a calendar
 * write to a closed note skips its index update once the vault has changed.
 * When a save fails, asks before going on: opening the new vault tears down
 * the editor and drops the unsaved tabs.
 * @param path - absolute path of the vault to open
 * @returns true when the vault was opened, false when the user cancelled at the discard prompt
 */
export async function switchVault(path: string): Promise<boolean> {
	if (!(await confirmDiscardFailedSaves(await saveAllDirtyTabs(), 'Switch'))) return false;
	await drainPendingWrites();
	vaultStore.open(path);
	return true;
}

/** Opens a native directory picker and, if the user selects a folder, opens it as a vault */
export async function openVaultDialog(): Promise<boolean> {
	const selected = await open({ directory: true, multiple: false });
	if (selected) return switchVault(selected);
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
	return switchVault(path);
}
