import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { appendLog } from '$lib/utils/log.service';
import { lanSyncStore } from './lan-sync.store.svelte';
import type {
	AuthEvent,
	AuthEventQuery,
	BlockedEntry,
	ConflictRecord,
	ConnectionState,
	DiscoveredPeer,
	MyFingerprintResponse,
	PairServerStart,
	Share,
	ShareDirection,
	ShareMode,
	TrustedPeer,
} from './lan-sync.types';

const LOG = 'LAN-SYNC';

/**
 * Tauri event names emitted by the Rust side. These are mirrored in
 * `crate::sync::*` (the live-network commits will start emitting them
 * from the TCP / mDNS loops).
 */
export const EVENT_PEER_DISCOVERED = 'lan-sync:peer-discovered';
export const EVENT_PEER_TRUSTED = 'lan-sync:peer-trusted';
export const EVENT_PAIRING_PASSPHRASE_REQUIRED = 'lan-sync:pairing-passphrase-required';
export const EVENT_SHARE_PROGRESS = 'lan-sync:share-progress';
export const EVENT_CONFLICT_SAVED = 'lan-sync:conflict-saved';
export const EVENT_CONNECTION_STATE = 'lan-sync:connection-state';
export const EVENT_PEER_BLOCKED = 'lan-sync:peer-blocked';

let activeUnlisteners: UnlistenFn[] = [];

// ============================================================================
// Initialisation lifecycle
// ============================================================================

/**
 * Loads identity + shares + trusted peers + blocked entries into the
 * store and subscribes to backend events. Idempotent — safe to call
 * on every vault open.
 */
export async function initLanSync(vaultPath: string): Promise<void> {
	if (!vaultPath) return;
	appendLog(LOG, `init for vault ${vaultPath}`);
	await teardownLanSync();

	try {
		const fp = await invoke<MyFingerprintResponse>('lan_sync_get_my_fingerprint');
		lanSyncStore.setMyFingerprint(fp);
	} catch (e) {
		appendLog(LOG, `get my fingerprint failed: ${String(e)}`);
		lanSyncStore.setLastError(`identity load failed: ${String(e)}`);
	}

	try {
		const peers = await invoke<TrustedPeer[]>('lan_sync_list_trusted_peers', { vaultPath });
		lanSyncStore.setTrustedPeers(peers);
	} catch (e) {
		appendLog(LOG, `list trusted peers failed: ${String(e)}`);
	}

	try {
		const shares = await invoke<Share[]>('lan_sync_list_shares', { vaultPath });
		lanSyncStore.setShares(shares);
	} catch (e) {
		appendLog(LOG, `list shares failed: ${String(e)}`);
	}

	try {
		const blocked = await invoke<BlockedEntry[]>('lan_sync_list_blocked', { vaultPath });
		lanSyncStore.setBlockedEntries(blocked);
	} catch (e) {
		appendLog(LOG, `list blocked failed: ${String(e)}`);
	}

	// Subscribe to backend events.
	activeUnlisteners.push(
		await listen<DiscoveredPeer>(EVENT_PEER_DISCOVERED, (ev) => {
			lanSyncStore.addDiscoveredPeer(ev.payload);
		}),
		await listen<TrustedPeer>(EVENT_PEER_TRUSTED, (ev) => {
			lanSyncStore.upsertTrustedPeer(ev.payload);
		}),
		await listen<{ sessionId: string; passphrase: string[] }>(
			EVENT_PAIRING_PASSPHRASE_REQUIRED,
			(ev) => {
				lanSyncStore.setPendingPairing({
					sessionId: ev.payload.sessionId,
					role: 'host',
					passphrase: ev.payload.passphrase,
				});
			},
		),
		await listen<{ shareId: string; peer: string; path: string; bytesDone: number; bytesTotal: number }>(
			EVENT_SHARE_PROGRESS,
			(ev) => {
				const total = ev.payload.bytesTotal;
				const done = ev.payload.bytesDone;
				if (done >= total) {
					lanSyncStore.setActiveTransfers(Math.max(0, lanSyncStore.activeTransfers - 1));
				} else if (done === 0) {
					lanSyncStore.setActiveTransfers(lanSyncStore.activeTransfers + 1);
				}
			},
		),
		await listen<ConflictRecord>(EVENT_CONFLICT_SAVED, (ev) => {
			lanSyncStore.pushConflict(ev.payload);
		}),
		await listen<{ state: ConnectionState; peer?: string; error?: string }>(
			EVENT_CONNECTION_STATE,
			(ev) => {
				lanSyncStore.setConnectionState(ev.payload.state);
				if (ev.payload.error) lanSyncStore.setLastError(ev.payload.error);
			},
		),
		await listen<BlockedEntry>(EVENT_PEER_BLOCKED, (ev) => {
			const next = [
				ev.payload,
				...lanSyncStore.blockedEntries.filter((b) => b.identifier !== ev.payload.identifier),
			];
			lanSyncStore.setBlockedEntries(next);
		}),
	);
}

/** Removes every event listener and clears reactive state. */
export async function teardownLanSync(): Promise<void> {
	for (const un of activeUnlisteners) {
		try {
			un();
		} catch (e) {
			appendLog(LOG, `unlisten failed: ${String(e)}`);
		}
	}
	activeUnlisteners = [];
	lanSyncStore.reset();
}

// ============================================================================
// Shares
// ============================================================================

export async function addShare(
	vaultPath: string,
	request: {
		mode: ShareMode;
		localPath: string;
		excludes?: string[];
		allowedPeerFingerprints: string[];
		direction: ShareDirection;
		readOnly?: boolean;
	},
): Promise<Share> {
	try {
		const share = await invoke<Share>('lan_sync_add_share', {
			vaultPath,
			request: {
				mode: request.mode,
				localPath: request.localPath,
				excludes: request.excludes ?? [],
				allowedPeerFingerprints: request.allowedPeerFingerprints,
				direction: request.direction,
				readOnly: request.readOnly ?? false,
			},
		});
		lanSyncStore.upsertShare(share);
		return share;
	} catch (e) {
		appendLog(LOG, `add share failed: ${String(e)}`);
		throw e;
	}
}

export async function removeShare(vaultPath: string, shareId: string): Promise<void> {
	try {
		await invoke('lan_sync_remove_share', { vaultPath, shareId });
		lanSyncStore.removeShare(shareId);
	} catch (e) {
		appendLog(LOG, `remove share failed: ${String(e)}`);
		throw e;
	}
}

export async function updateSharePeers(
	vaultPath: string,
	shareId: string,
	allowedPeerFingerprints: string[],
): Promise<Share> {
	try {
		const updated = await invoke<Share>('lan_sync_update_share_peers', {
			vaultPath,
			shareId,
			allowedPeerFingerprints,
		});
		lanSyncStore.upsertShare(updated);
		return updated;
	} catch (e) {
		appendLog(LOG, `update share peers failed: ${String(e)}`);
		throw e;
	}
}

// ============================================================================
// Trusted peers
// ============================================================================

export async function removeTrustedPeer(
	vaultPath: string,
	fingerprintHex: string,
): Promise<void> {
	try {
		await invoke('lan_sync_remove_trusted_peer', { vaultPath, fingerprintHex });
		lanSyncStore.removeTrustedPeer(fingerprintHex);
	} catch (e) {
		appendLog(LOG, `remove trusted peer failed: ${String(e)}`);
		throw e;
	}
}

// ============================================================================
// Auth log + blocked
// ============================================================================

export async function listAuthEvents(
	vaultPath: string,
	query: AuthEventQuery = {},
): Promise<AuthEvent[]> {
	try {
		const events = await invoke<AuthEvent[]>('lan_sync_list_auth_events', { vaultPath, query });
		lanSyncStore.setRecentAuthEvents(events);
		return events;
	} catch (e) {
		appendLog(LOG, `list auth events failed: ${String(e)}`);
		throw e;
	}
}

export async function unblock(vaultPath: string, identifier: string): Promise<void> {
	try {
		await invoke<boolean>('lan_sync_unblock', { vaultPath, identifier });
		lanSyncStore.removeBlocked(identifier);
	} catch (e) {
		appendLog(LOG, `unblock failed: ${String(e)}`);
		throw e;
	}
}

export async function cleanupAuthLog(vaultPath: string, olderThanMs: number): Promise<number> {
	try {
		return await invoke<number>('lan_sync_cleanup_auth_log', { vaultPath, olderThanMs });
	} catch (e) {
		appendLog(LOG, `cleanup auth log failed: ${String(e)}`);
		throw e;
	}
}

// ============================================================================
// Live-network operations (currently stubs on the backend)
// ============================================================================

export async function setDiscoverable(vaultPath: string, enabled: boolean): Promise<void> {
	try {
		await invoke('lan_sync_set_discoverable', { vaultPath, enabled });
	} catch (e) {
		appendLog(LOG, `set discoverable failed: ${String(e)}`);
		throw e;
	}
}

export async function startBrowse(): Promise<void> {
	try {
		lanSyncStore.clearDiscoveredPeers();
		await invoke('lan_sync_start_browse');
	} catch (e) {
		appendLog(LOG, `start browse failed: ${String(e)}`);
		throw e;
	}
}

export async function stopBrowse(): Promise<void> {
	try {
		await invoke('lan_sync_stop_browse');
	} catch (e) {
		appendLog(LOG, `stop browse failed: ${String(e)}`);
	}
}

export async function startPairServer(vaultPath: string): Promise<PairServerStart> {
	try {
		const result = await invoke<PairServerStart>('lan_sync_start_pair_server', { vaultPath });
		lanSyncStore.setPendingPairing({
			sessionId: result.sessionId,
			role: 'host',
			passphrase: result.passphrase,
		});
		return result;
	} catch (e) {
		appendLog(LOG, `start pair server failed: ${String(e)}`);
		throw e;
	}
}

export async function startPairClient(
	vaultPath: string,
	addr: string,
	port: number,
	passphrase: string,
): Promise<string> {
	try {
		const sessionId = await invoke<string>('lan_sync_start_pair_client', {
			vaultPath,
			request: { addr, port, passphrase },
		});
		lanSyncStore.setPendingPairing({ sessionId, role: 'guest' });
		return sessionId;
	} catch (e) {
		appendLog(LOG, `start pair client failed: ${String(e)}`);
		throw e;
	}
}

export async function confirmPair(
	sessionId: string,
	accept: boolean,
): Promise<TrustedPeer | null> {
	try {
		const trusted = await invoke<TrustedPeer | null>('lan_sync_confirm_pair', {
			sessionId,
			accept,
		});
		lanSyncStore.setPendingPairing(null);
		if (trusted) lanSyncStore.upsertTrustedPeer(trusted);
		return trusted;
	} catch (e) {
		appendLog(LOG, `confirm pair failed: ${String(e)}`);
		throw e;
	}
}

export async function startServer(vaultPath: string): Promise<number> {
	try {
		return await invoke<number>('lan_sync_start', { vaultPath });
	} catch (e) {
		appendLog(LOG, `start server failed: ${String(e)}`);
		throw e;
	}
}

export async function stopServer(): Promise<void> {
	try {
		await invoke('lan_sync_stop');
		lanSyncStore.setConnectionState('idle');
	} catch (e) {
		appendLog(LOG, `stop server failed: ${String(e)}`);
	}
}

export async function requestFullResync(
	shareId: string,
	peerFingerprint: string,
): Promise<void> {
	try {
		await invoke('lan_sync_request_full_resync', { shareId, peerFingerprint });
	} catch (e) {
		appendLog(LOG, `request full resync failed: ${String(e)}`);
		throw e;
	}
}
