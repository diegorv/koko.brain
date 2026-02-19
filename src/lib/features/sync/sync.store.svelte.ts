/** A discovered peer on the local network */
export interface SyncPeer {
	/** Unique peer identifier */
	id: string;
	/** Human-readable device name */
	name: string;
	/** IP address of the peer */
	ip: string;
	/** TCP port the peer is listening on */
	port: number;
}

/** Sync engine state */
export type SyncState = 'idle' | 'syncing' | 'error';

/** Runtime status information for the sync engine */
export interface SyncStatusInfo {
	/** Current engine state */
	state: SyncState;
	/** Peer currently being synced with (if syncing) */
	peerId?: string;
	/** Total number of files to transfer */
	filesTotal?: number;
	/** Number of files already transferred */
	filesDone?: number;
	/** Error message (if state is 'error') */
	error?: string;
	/** Timestamp of the last successful sync */
	lastSyncAt?: string;
}

let peers = $state<SyncPeer[]>([]);
let status = $state<SyncStatusInfo>({ state: 'idle' });
let running = $state(false);
let excludedPaths = $state<string[]>([]);

/** Reactive store for sync runtime state (peers, status, excluded paths) */
export const syncStore = {
	/** List of discovered peers on the local network */
	get peers() { return peers; },
	/** Current sync engine status */
	get status() { return status; },
	/** Whether the sync engine is currently running */
	get isRunning() { return running; },
	/** Paths excluded from sync (persisted in sync-local.json) */
	get excludedPaths() { return excludedPaths; },

	/** Replaces the entire peer list */
	setPeers(value: SyncPeer[]) {
		peers = value;
	},

	/** Adds a peer to the list (no-op if already present) */
	addPeer(peer: SyncPeer) {
		if (!peers.some((p) => p.id === peer.id)) {
			peers = [...peers, peer];
		}
	},

	/** Removes a peer by ID */
	removePeer(peerId: string) {
		peers = peers.filter((p) => p.id !== peerId);
	},

	/** Updates the sync status */
	setStatus(value: SyncStatusInfo) {
		status = value;
	},

	/** Sets whether the sync engine is running */
	setRunning(value: boolean) {
		running = value;
	},

	/** Replaces the excluded paths list */
	setExcludedPaths(value: string[]) {
		excludedPaths = value;
	},

	/** Resets all runtime state to defaults */
	reset() {
		peers = [];
		status = { state: 'idle' };
		running = false;
		excludedPaths = [];
	},
};
