import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { toast } from 'svelte-sonner';
import { syncStore } from './sync.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { debug, error } from '$lib/utils/debug';

/** Active event listener cleanup functions */
let unlistenFns: UnlistenFn[] = [];

// ── Passphrase management ────────────────────────────────────────────

/** Generates a new 15-character CSPRNG passphrase via Rust */
export async function generatePassphrase(): Promise<string> {
	try {
		return await invoke<string>('generate_sync_passphrase');
	} catch (err) {
		error('SYNC', 'Failed to generate passphrase:', err);
		throw err;
	}
}

/** Saves a passphrase to the system Keychain for the given vault */
export async function savePassphrase(vaultPath: string, passphrase: string): Promise<void> {
	try {
		await invoke('save_sync_passphrase', { vaultPath, passphrase });
	} catch (err) {
		error('SYNC', 'Failed to save passphrase:', err);
		throw err;
	}
}

/** Checks whether a passphrase exists in the Keychain for the given vault */
export async function hasPassphrase(vaultPath: string): Promise<boolean> {
	try {
		return await invoke<boolean>('has_sync_passphrase', { vaultPath });
	} catch (err) {
		error('SYNC', 'Failed to check passphrase:', err);
		throw err;
	}
}

/** Deletes the passphrase from the Keychain for the given vault */
export async function deletePassphrase(vaultPath: string): Promise<void> {
	try {
		await invoke('delete_sync_passphrase', { vaultPath });
	} catch (err) {
		error('SYNC', 'Failed to delete passphrase:', err);
		throw err;
	}
}

// ── Local config (excluded paths) ────────────────────────────────────

/** Loads sync-local.json config and updates the store */
export async function loadSyncLocalConfig(vaultPath: string): Promise<void> {
	try {
		const config = await invoke<{ excluded_paths: string[] }>('get_sync_local_config', { vaultPath });
		syncStore.setExcludedPaths(config.excluded_paths);
	} catch (err) {
		error('SYNC', 'Failed to load sync local config:', err);
		throw err;
	}
}

/** Saves excluded paths to sync-local.json and updates the store */
export async function saveSyncLocalConfig(vaultPath: string, excludedPaths: string[]): Promise<void> {
	try {
		await invoke('save_sync_local_config', { vaultPath, config: { excluded_paths: excludedPaths } });
		syncStore.setExcludedPaths(excludedPaths);
	} catch (err) {
		error('SYNC', 'Failed to save sync local config:', err);
		throw err;
	}
}

// ── Event listeners ──────────────────────────────────────────────────

/** Registers Tauri event listeners for sync engine events */
async function registerSyncListeners(): Promise<void> {
	const fns = await Promise.all([
		listen<{ peer_id: string; name: string; ip: string; port: number }>('sync:peer-discovered', (event) => {
			debug('SYNC', 'Peer discovered:', event.payload.name);
			syncStore.addPeer({
				id: event.payload.peer_id,
				name: event.payload.name,
				ip: event.payload.ip,
				port: event.payload.port,
			});
		}),
		listen<{ peer_id: string }>('sync:peer-lost', (event) => {
			debug('SYNC', 'Peer lost:', event.payload.peer_id);
			syncStore.removePeer(event.payload.peer_id);
		}),
		listen<{ peer_id: string }>('sync:started', (event) => {
			debug('SYNC', 'Sync started with peer:', event.payload.peer_id);
			syncStore.setStatus({ state: 'syncing', peerId: event.payload.peer_id });
		}),
		listen<{ peer_id: string; files_total: number; files_done: number }>('sync:progress', (event) => {
			syncStore.setStatus({
				state: 'syncing',
				peerId: event.payload.peer_id,
				filesTotal: event.payload.files_total,
				filesDone: event.payload.files_done,
			});
		}),
		listen<{ peer_id: string; files_changed: number; conflicts: number }>('sync:completed', (event) => {
			debug('SYNC', 'Sync completed:', event.payload.files_changed, 'files,', event.payload.conflicts, 'conflicts');
			syncStore.setStatus({
				state: 'idle',
				lastSyncAt: new Date().toISOString(),
			});
		}),
		listen<{ peer_id: string; message: string }>('sync:error', (event) => {
			error('SYNC', 'Sync error:', event.payload.message);
			syncStore.setStatus({
				state: 'error',
				peerId: event.payload.peer_id,
				error: event.payload.message,
			});
		}),
		listen<{ original_path: string; conflicted_path: string }>('sync:conflict', (event) => {
			debug('SYNC', 'Conflict:', event.payload.original_path, '→', event.payload.conflicted_path);
		}),
	]);
	unlistenFns = fns;
}

/** Removes all registered sync event listeners */
function removeSyncListeners(): void {
	for (const fn of unlistenFns) {
		fn();
	}
	unlistenFns = [];
}

// ── Engine lifecycle ─────────────────────────────────────────────────

/**
 * Initializes the sync engine if enabled and passphrase is configured.
 * Starts the sync server, registers Tauri event listeners, and loads local config.
 */
export async function initSync(vaultPath: string): Promise<void> {
	const syncSettings = settingsStore.sync;
	if (!syncSettings.enabled) {
		debug('SYNC', 'Sync disabled in settings — skipping init');
		return;
	}

	try {
		const hasPass = await hasPassphrase(vaultPath);
		if (!hasPass) {
			debug('SYNC', 'No passphrase configured — skipping sync start');
			return;
		}

		await loadSyncLocalConfig(vaultPath);
		await registerSyncListeners();
		await invoke('start_sync', { vaultPath, port: syncSettings.port });
		syncStore.setRunning(true);
		debug('SYNC', 'Sync engine started on port', syncSettings.port);
	} catch (err) {
		error('SYNC', 'Failed to initialize sync:', err);
		removeSyncListeners();
		syncStore.setRunning(false);
	}
}

/** Stops the sync engine and cleans up all listeners and state */
export async function teardownSync(): Promise<void> {
	debug('SYNC', 'Tearing down sync...');
	removeSyncListeners();
	try {
		await invoke('stop_sync');
	} catch (err) {
		error('SYNC', 'Failed to stop sync engine:', err);
	}
	syncStore.reset();
}

// ── User actions ─────────────────────────────────────────────────────

/** Manually triggers a sync cycle */
export async function triggerSync(): Promise<void> {
	try {
		await invoke('trigger_sync');
	} catch (err) {
		error('SYNC', 'Failed to trigger sync:', err);
		throw err;
	}
}

/** Changes the vault passphrase (stops engine, updates Keychain, restarts) */
export async function changePassphrase(vaultPath: string, newPassphrase: string): Promise<void> {
	try {
		await invoke('change_sync_passphrase', { vaultPath, newPassphrase });
		toast.success('Passphrase changed successfully');
	} catch (err) {
		error('SYNC', 'Failed to change passphrase:', err);
		toast.error('Failed to change passphrase');
		throw err;
	}
}

/** Resets all sync data (identity, state, Keychain entries) */
export async function resetSync(vaultPath: string): Promise<void> {
	try {
		await invoke('reset_sync', { vaultPath });
		syncStore.reset();
		toast.success('Sync data has been reset');
	} catch (err) {
		error('SYNC', 'Failed to reset sync:', err);
		toast.error('Failed to reset sync data');
		throw err;
	}
}
