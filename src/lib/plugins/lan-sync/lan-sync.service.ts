import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { appendLog } from '$lib/utils/log.service';
import { lanSyncStore } from './lan-sync.store.svelte';
import type {
	DiscoveredPeer,
	LanSyncDebugDump,
	MyFingerprint,
	PairingIncoming,
	PushComplete,
	PushProgress,
	TrustedPeer,
} from './lan-sync.types';

/**
 * Abstraction over the Tauri IPC + event bridge so tests can inject a fake
 * implementation without spinning up a Tauri runtime.
 *
 * `invoke` mirrors `@tauri-apps/api/core#invoke`. `listen` mirrors
 * `@tauri-apps/api/event#listen` BUT simplified: the handler receives the
 * already-unwrapped payload (no `Event<P>` envelope) so service code and
 * test fakes stay symmetric. The returned promise resolves to the unlisten
 * function.
 */
export interface LanSyncTransport {
	/** Invoke a Tauri command and resolve with its typed return value. */
	invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
	/** Subscribe to a Tauri event. Resolves to an unlisten function. */
	listen<P>(event: string, handler: (payload: P) => void): Promise<() => void>;
}

/**
 * Default transport backed by the real Tauri APIs. Wraps `listen` so the
 * handler receives just the payload (matching `LanSyncTransport.listen`).
 */
export function createTauriTransport(): LanSyncTransport {
	return {
		invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
			return invoke<T>(cmd, args);
		},
		listen<P>(event: string, handler: (payload: P) => void): Promise<() => void> {
			return listen<P>(event, (e) => handler(e.payload));
		},
	};
}

/**
 * Service surface for the LAN sync plugin. Single instance per app session;
 * bind a transport once at app init and reuse for the lifetime of the vault.
 *
 * Command methods are thin try/catch wrappers around `transport.invoke`. They
 * log via `appendLog('LAN-SYNC', ...)` on failure and re-throw — never
 * silently swallow. Store mutations happen on success only.
 *
 * Event-driven mutations (`peer-discovered`, `peer-trusted`, `pairing-incoming`,
 * `push-progress`, `push-complete`) are wired by `init` and fan into
 * `lanSyncStore` directly. See the Stage 4 backend `events.rs` for emitter
 * symmetry.
 */
export interface LanSyncService {
	/**
	 * Wire all 5 event listeners and fetch identity for `vaultPath`.
	 * Idempotent — calling twice tears down old listeners + rewires fresh
	 * ones, so a vault switch is safe.
	 */
	init(vaultPath: string): Promise<void>;
	/** Tear down all listeners and reset the store. Safe to call before `init`. */
	shutdown(): Promise<void>;
	/** Fetch the local device fingerprint and update `lanSyncStore.myFingerprint`. */
	getMyFingerprint(vaultPath: string): Promise<MyFingerprint>;
	/** Toggle the local mDNS announce. Does NOT mutate the store. */
	setDiscoverable(vaultPath: string, enabled: boolean): Promise<void>;
	/** Start LAN browse for peers. Discovery events update the store. */
	startBrowse(vaultPath: string): Promise<void>;
	/** Stop LAN browse. Does NOT mutate the store. */
	stopBrowse(): Promise<void>;
	/** Fetch the persisted trusted-peers list and update `lanSyncStore.trustedPeers`. */
	listTrustedPeers(vaultPath: string): Promise<TrustedPeer[]>;
	/** Remove a trusted peer. Backend returns updated list which replaces the store. */
	removeTrustedPeer(vaultPath: string, fingerprintHex: string): Promise<TrustedPeer[]>;
	/**
	 * Initiator-side pair. Opens a TCP connection to the peer, runs the Noise
	 * XX handshake pinned to `peerFingerprintHex`, and on remote-accept
	 * writes the peer into the trust store. Does NOT mutate `pendingPair`
	 * (that is the responder-side concern). Returns the persisted
	 * `TrustedPeer`. Rejects when the remote refuses or any handshake step
	 * fails.
	 */
	pairWithPeer(
		vaultPath: string,
		peerAddr: string,
		peerPort: number,
		peerFingerprintHex: string,
	): Promise<TrustedPeer>;
	/**
	 * Responder-side pair. Signals the backend's pending-pair dispatcher
	 * task with the local user's accept/reject decision identified by
	 * `requestId`. On accept the backend writes the peer to `peers.json`
	 * and emits `peer-trusted`. Clears `lanSyncStore.pendingPair` in a
	 * `finally` regardless of outcome so the modal closes. Returns the
	 * trusted peer on accept, `null` on reject.
	 */
	respondToPair(
		vaultPath: string,
		requestId: string,
		accept: boolean,
	): Promise<TrustedPeer | null>;
	/**
	 * Push a folder to a trusted peer. Does NOT mutate the store directly —
	 * progress and completion arrive via the `push-progress` and
	 * `push-complete` events.
	 */
	pushFolder(
		vaultPath: string,
		peerFingerprintHex: string,
		sourceRelPath: string,
		targetRelPath: string,
	): Promise<void>;
	/**
	 * Fetch a diagnostic snapshot of the LAN sync runtime state for
	 * triage when discovery is not behaving as expected. Does NOT
	 * mutate the store. Includes the local fingerprint, every non-
	 * loopback IPv4 interface, announcer + browser running flags, and
	 * the backend's last-seen address map.
	 */
	debugDump(vaultPath: string): Promise<LanSyncDebugDump>;
}

/**
 * Factory: build a service bound to the given transport. When omitted, the
 * service uses the real Tauri APIs.
 */
export function createLanSyncService(transport?: LanSyncTransport): LanSyncService {
	const tx = transport ?? createTauriTransport();

	/** Active unlisten callbacks captured during `init`. Empty when shut down. */
	let unlisteners: Array<() => void> = [];

	async function shutdown(): Promise<void> {
		for (const off of unlisteners) {
			try {
				off();
			} catch (err) {
				appendLog('LAN-SYNC', `shutdown: unlisten threw: ${String(err)}`);
			}
		}
		unlisteners = [];
		lanSyncStore.reset();
	}

	async function getMyFingerprint(vaultPath: string): Promise<MyFingerprint> {
		try {
			const result = await tx.invoke<MyFingerprint>('lan_sync_get_my_fingerprint', { vaultPath });
			lanSyncStore.setMyFingerprint(result);
			return result;
		} catch (err) {
			appendLog('LAN-SYNC', `getMyFingerprint failed: ${String(err)}`);
			throw err;
		}
	}

	async function setDiscoverable(vaultPath: string, enabled: boolean): Promise<void> {
		try {
			await tx.invoke<void>('lan_sync_set_discoverable', { vaultPath, enabled });
		} catch (err) {
			appendLog('LAN-SYNC', `setDiscoverable failed: ${String(err)}`);
			throw err;
		}
	}

	async function startBrowse(vaultPath: string): Promise<void> {
		try {
			await tx.invoke<void>('lan_sync_start_browse', { vaultPath });
		} catch (err) {
			appendLog('LAN-SYNC', `startBrowse failed: ${String(err)}`);
			throw err;
		}
	}

	async function stopBrowse(): Promise<void> {
		try {
			await tx.invoke<void>('lan_sync_stop_browse');
		} catch (err) {
			appendLog('LAN-SYNC', `stopBrowse failed: ${String(err)}`);
			throw err;
		}
	}

	async function listTrustedPeers(vaultPath: string): Promise<TrustedPeer[]> {
		try {
			const result = await tx.invoke<TrustedPeer[]>('lan_sync_list_trusted_peers', { vaultPath });
			lanSyncStore.setTrustedPeers(result);
			return result;
		} catch (err) {
			appendLog('LAN-SYNC', `listTrustedPeers failed: ${String(err)}`);
			throw err;
		}
	}

	async function removeTrustedPeer(vaultPath: string, fingerprintHex: string): Promise<TrustedPeer[]> {
		try {
			const result = await tx.invoke<TrustedPeer[]>('lan_sync_remove_trusted_peer', {
				vaultPath,
				fingerprintHex,
			});
			lanSyncStore.setTrustedPeers(result);
			return result;
		} catch (err) {
			appendLog('LAN-SYNC', `removeTrustedPeer failed: ${String(err)}`);
			throw err;
		}
	}

	async function pairWithPeer(
		vaultPath: string,
		peerAddr: string,
		peerPort: number,
		peerFingerprintHex: string,
	): Promise<TrustedPeer> {
		try {
			return await tx.invoke<TrustedPeer>('lan_sync_pair_with_peer', {
				vaultPath,
				peerAddr,
				peerPort,
				peerFingerprintHex,
			});
		} catch (err) {
			appendLog('LAN-SYNC', `pairWithPeer failed: ${String(err)}`);
			throw err;
		}
	}

	async function respondToPair(
		vaultPath: string,
		requestId: string,
		accept: boolean,
	): Promise<TrustedPeer | null> {
		try {
			return await tx.invoke<TrustedPeer | null>('lan_sync_respond_to_pair', {
				vaultPath,
				requestId,
				accept,
			});
		} catch (err) {
			appendLog('LAN-SYNC', `respondToPair failed: ${String(err)}`);
			throw err;
		} finally {
			lanSyncStore.setPendingPair(null);
		}
	}

	async function pushFolder(
		vaultPath: string,
		peerFingerprintHex: string,
		sourceRelPath: string,
		targetRelPath: string,
	): Promise<void> {
		try {
			await tx.invoke<void>('lan_sync_push_folder', {
				vaultPath,
				peerFingerprintHex,
				sourceRelPath,
				targetRelPath,
			});
		} catch (err) {
			appendLog('LAN-SYNC', `pushFolder failed: ${String(err)}`);
			throw err;
		}
	}

	async function debugDump(vaultPath: string): Promise<LanSyncDebugDump> {
		try {
			return await tx.invoke<LanSyncDebugDump>('lan_sync_debug_dump', { vaultPath });
		} catch (err) {
			appendLog('LAN-SYNC', `debugDump failed: ${String(err)}`);
			throw err;
		}
	}

	async function init(vaultPath: string): Promise<void> {
		await shutdown();
		const offs: Array<() => void> = [];
		offs.push(
			await tx.listen<DiscoveredPeer>('lan-sync:peer-discovered', (payload) => {
				lanSyncStore.upsertDiscoveredPeer(payload);
			}),
		);
		offs.push(
			await tx.listen<TrustedPeer>('lan-sync:peer-trusted', (payload) => {
				lanSyncStore.upsertTrustedPeer(payload);
			}),
		);
		offs.push(
			await tx.listen<PairingIncoming>('lan-sync:pairing-incoming', (payload) => {
				lanSyncStore.setPendingPair(payload);
			}),
		);
		offs.push(
			await tx.listen<PushProgress>('lan-sync:push-progress', (payload) => {
				lanSyncStore.setPushProgress(payload);
			}),
		);
		offs.push(
			await tx.listen<PushComplete>('lan-sync:push-complete', (payload) => {
				lanSyncStore.setLastPushComplete(payload);
				lanSyncStore.setPushProgress(null);
			}),
		);
		unlisteners = offs;
		await getMyFingerprint(vaultPath);
		await listTrustedPeers(vaultPath);
	}

	return {
		init,
		shutdown,
		getMyFingerprint,
		setDiscoverable,
		startBrowse,
		stopBrowse,
		listTrustedPeers,
		removeTrustedPeer,
		pairWithPeer,
		respondToPair,
		pushFolder,
		debugDump,
	};
}
