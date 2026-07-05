import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { saveSettings } from '$lib/core/settings/settings.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { debug, error } from '$lib/utils/debug';
import { syncStore } from './sync.store.svelte';
import type { SyncListenerStatus, SyncSummary } from './sync.types';

/** Device name sent to the peer; falls back when the user left it empty. */
function deviceName(): string {
	return settingsStore.sync.deviceName || 'kokobrain';
}

/** Generate a fresh pairing key and store it in settings (caller persists). */
export async function generatePairingKey(): Promise<string> {
	try {
		const key = await invoke<string>('sync_generate_pairing_key');
		settingsStore.updateSync({ pairingKey: key });
		return key;
	} catch (err) {
		error('SYNC', 'generatePairingKey failed:', err);
		toast.error(`Failed to generate pairing key: ${err}`);
		throw err;
	}
}

/**
 * (Re)start the listener from current settings. When listenPort was 0 the
 * backend picks a port; persist it so the address stays stable.
 */
export async function startListener(vaultPath: string): Promise<void> {
	const s = settingsStore.sync;
	try {
		const port = await invoke<number>('sync_start_listener', {
			vaultPath,
			port: s.listenPort,
			pairingKey: s.pairingKey,
			deviceName: deviceName(),
			exposedFolders: s.exposedFolders,
		});
		if (s.listenPort !== port) {
			settingsStore.updateSync({ listenPort: port });
			await saveSettings(vaultPath);
		}
		await refreshStatus();
	} catch (err) {
		error('SYNC', 'startListener failed:', err);
		toast.error(`Failed to start sync listener: ${err}`);
		throw err;
	}
}

/** Stop the listener. */
export async function stopListener(): Promise<void> {
	try {
		await invoke('sync_stop_listener');
		await refreshStatus();
	} catch (err) {
		error('SYNC', 'stopListener failed:', err);
		toast.error(`Failed to stop sync listener: ${err}`);
		throw err;
	}
}

/** Refresh listener status from the backend. No toast — used opportunistically. */
export async function refreshStatus(): Promise<void> {
	try {
		syncStore.setStatus(await invoke<SyncListenerStatus>('sync_status'));
	} catch (err) {
		error('SYNC', 'refreshStatus failed:', err);
		throw err;
	}
}

/** Fetch the peer's exposed folders into the store. */
export async function listRemoteShares(): Promise<void> {
	const s = settingsStore.sync;
	syncStore.setBusy(true);
	try {
		const folders = await invoke<string[]>('sync_list_remote_shares', {
			address: s.peerAddress,
			pairingKey: s.pairingKey,
			deviceName: deviceName(),
		});
		syncStore.setRemoteShares(folders);
	} catch (err) {
		error('SYNC', 'listRemoteShares failed:', err);
		toast.error(`Failed to list peer shares: ${err}`);
		throw err;
	} finally {
		syncStore.setBusy(false);
	}
}

/** Run one pull session against the configured peer. */
export async function syncNow(vaultPath: string): Promise<void> {
	const s = settingsStore.sync;
	syncStore.setSyncing(true);
	try {
		const summary = await invoke<SyncSummary>('sync_now', {
			vaultPath,
			address: s.peerAddress,
			pairingKey: s.pairingKey,
			deviceName: deviceName(),
			subscriptions: s.subscriptions,
		});
		syncStore.setLastSummary(summary);
		syncStore.setLastSyncAt(new Date().toISOString());
		debug('SYNC', `sync done: ${JSON.stringify(summary)}`);
		if (summary.errors.length > 0 || summary.skippedFolders.length > 0) {
			toast.warning(
				`Sync finished with ${summary.errors.length + summary.skippedFolders.length} issue(s)`
			);
		} else {
			toast.success(
				`Sync complete: ${summary.downloaded} downloaded, ${summary.conflicts} conflict(s)`
			);
		}
	} catch (err) {
		error('SYNC', 'syncNow failed:', err);
		toast.error(`Sync failed: ${err}`);
		throw err;
	} finally {
		syncStore.setSyncing(false);
	}
}
