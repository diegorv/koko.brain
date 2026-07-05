import type { SyncListenerStatus, SyncSummary } from './sync.types';

let status = $state<SyncListenerStatus>({ listening: false, port: null, localIp: null });
let remoteShares = $state<string[] | null>(null);
let lastSummary = $state<SyncSummary | null>(null);
let lastSyncAt = $state<string | null>(null);
let syncing = $state(false);
let busy = $state(false);

/** Reactive state for the P2P sync feature (listener status + last session). */
export const syncStore = {
	/** Current listener status as last reported by sync_status. */
	get status() {
		return status;
	},
	/** Peer's exposed folders from the last listing; null before any listing. */
	get remoteShares() {
		return remoteShares;
	},
	/** Summary of the last sync session; null before any sync. */
	get lastSummary() {
		return lastSummary;
	},
	/** ISO timestamp of the last completed sync; null before any sync. */
	get lastSyncAt() {
		return lastSyncAt;
	},
	/** True while a sync session is running. */
	get syncing() {
		return syncing;
	},
	/** True while listing shares or restarting the listener. */
	get busy() {
		return busy;
	},
	/** True when the last sync finished without per-file or folder errors. */
	get lastSyncClean() {
		return lastSummary !== null && lastSummary.errors.length === 0;
	},
	/** Replace the listener status. */
	setStatus(v: SyncListenerStatus) {
		status = v;
	},
	/** Replace the remote shares list. */
	setRemoteShares(v: string[] | null) {
		remoteShares = v;
	},
	/** Replace the last sync summary. */
	setLastSummary(v: SyncSummary | null) {
		lastSummary = v;
	},
	/** Replace the last sync timestamp. */
	setLastSyncAt(v: string | null) {
		lastSyncAt = v;
	},
	/** Set the syncing flag. */
	setSyncing(v: boolean) {
		syncing = v;
	},
	/** Set the busy flag. */
	setBusy(v: boolean) {
		busy = v;
	},
	/** Reset to initial state (vault teardown). */
	reset() {
		status = { listening: false, port: null, localIp: null };
		remoteShares = null;
		lastSummary = null;
		lastSyncAt = null;
		syncing = false;
		busy = false;
	},
};
