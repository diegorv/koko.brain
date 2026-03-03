import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { toast } from 'svelte-sonner';
import { syncStore } from './sync.store.svelte';
import { isHandshakeError } from './sync.logic';
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

// ── Local config (allowed paths) ─────────────────────────────────────

/** Full sync-local.json config shape from Rust */
interface SyncLocalConfig {
	allowed_paths: string[];
	port: number;
	interval_secs: number;
}

/** Cached copy of the last loaded config to avoid overwriting fields */
let lastLocalConfig: SyncLocalConfig = { allowed_paths: [], port: 39782, interval_secs: 300 };

/** Loads sync-local.json config and updates the store */
export async function loadSyncLocalConfig(vaultPath: string): Promise<void> {
	try {
		const config = await invoke<SyncLocalConfig>('get_sync_local_config', { vaultPath });
		lastLocalConfig = config;
		syncStore.setAllowedPaths(config.allowed_paths);
	} catch (err) {
		error('SYNC', 'Failed to load sync local config:', err);
		throw err;
	}
}

/** Saves allowed paths to sync-local.json and updates the store */
export async function saveSyncLocalConfig(vaultPath: string, allowedPaths: string[]): Promise<void> {
	try {
		const config = { ...lastLocalConfig, allowed_paths: allowedPaths };
		await invoke('save_sync_local_config', { vaultPath, config });
		lastLocalConfig = config;
		syncStore.setAllowedPaths(allowedPaths);
	} catch (err) {
		error('SYNC', 'Failed to save sync local config:', err);
		throw err;
	}
}

/** Updates the sync port in sync-local.json and restarts engine if running */
export async function updateSyncPort(vaultPath: string, port: number): Promise<void> {
	try {
		const config = { ...lastLocalConfig, port };
		await invoke('save_sync_local_config', { vaultPath, config });
		lastLocalConfig = config;

		// Restart engine so it picks up the new port
		if (syncStore.isRunning) {
			debug('SYNC', 'Restarting engine for port change:', port);
			await teardownSync();
			await initSync(vaultPath);
		}
	} catch (err) {
		error('SYNC', 'Failed to update sync port:', err);
		throw err;
	}
}

/** Updates the sync interval in sync-local.json and restarts engine if running */
export async function updateSyncInterval(vaultPath: string, intervalMinutes: number): Promise<void> {
	try {
		const config = { ...lastLocalConfig, interval_secs: intervalMinutes * 60 };
		await invoke('save_sync_local_config', { vaultPath, config });
		lastLocalConfig = config;

		// Restart engine so it picks up the new interval
		if (syncStore.isRunning) {
			debug('SYNC', 'Restarting engine for interval change:', intervalMinutes, 'min');
			await teardownSync();
			await initSync(vaultPath);
		}
	} catch (err) {
		error('SYNC', 'Failed to update sync interval:', err);
		throw err;
	}
}

// ── Event listeners ──────────────────────────────────────────────────

/** Registers Tauri event listeners for sync engine events.
 *
 * Uses `allSettled` so that partial failures don't leak already-registered
 * listeners — each successful registration is stored immediately.
 */
async function registerSyncListeners(): Promise<void> {
	const results = await Promise.allSettled([
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
			if (isHandshakeError(event.payload.message)) {
				toast.error('Sync failed: passphrase may not match the other device. Ensure all devices use the same passphrase.');
			}
		}),
		listen<{ original_path: string; conflicted_path: string }>('sync:conflict', (event) => {
			debug('SYNC', 'Conflict:', event.payload.original_path, '→', event.payload.conflicted_path);
		}),
		listen<{ peer_id: string; path: string }>('sync:file-deleted', (event) => {
			debug('SYNC', 'File deleted by peer:', event.payload.path);
		}),
		listen<{ conflicted_path: string }>('sync:settings-conflict', (event) => {
			debug('SYNC', 'Settings conflict:', event.payload.conflicted_path);
			toast.warning('Sync detected a settings conflict. Check your settings.');
		}),
	]);

	// Collect successful registrations; clean up and throw if any failed
	const fns: UnlistenFn[] = [];
	const failures: string[] = [];
	for (const result of results) {
		if (result.status === 'fulfilled') {
			fns.push(result.value);
		} else {
			failures.push(String(result.reason));
		}
	}

	unlistenFns = fns;

	if (failures.length > 0) {
		// Clean up the listeners that did succeed
		removeSyncListeners();
		throw new Error(`Failed to register ${failures.length} sync listener(s): ${failures.join('; ')}`);
	}
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
		syncStore.reset();
	} catch (err) {
		error('SYNC', 'Failed to stop sync engine:', err);
		// Don't reset store — backend may still be running.
		// Only clear listeners (already done above) to avoid duplicates on retry.
	}
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
