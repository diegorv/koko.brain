import type {
	AuthEvent,
	BlockedEntry,
	ConflictRecord,
	ConnectionState,
	DiscoveredPeer,
	MyFingerprintResponse,
	PendingPairing,
	Share,
	TrustedPeer,
} from './lan-sync.types';

/**
 * Reactive store for the LAN sync feature.
 *
 * Convention (see CLAUDE.md): all reactive state is declared with
 * `let x = $state(...)` at the top, exposed via getters in the
 * `lanSyncStore` object, and mutated only through the named setter
 * methods below. No `$derived` (doesn't work in vitest).
 */

let myFingerprint = $state<MyFingerprintResponse | null>(null);
let trustedPeers = $state<TrustedPeer[]>([]);
let discoveredPeers = $state<DiscoveredPeer[]>([]);
let shares = $state<Share[]>([]);
let blockedEntries = $state<BlockedEntry[]>([]);
let recentAuthEvents = $state<AuthEvent[]>([]);
let pendingPairing = $state<PendingPairing | null>(null);
let connectionState = $state<ConnectionState>('idle');
let connectedPeerCount = $state<number>(0);
let activeTransfers = $state<number>(0);
let recentConflicts = $state<ConflictRecord[]>([]);
let lastError = $state<string | null>(null);

const MAX_RECENT_CONFLICTS = 20;

export const lanSyncStore = {
	get myFingerprint() {
		return myFingerprint;
	},
	get trustedPeers() {
		return trustedPeers;
	},
	get discoveredPeers() {
		return discoveredPeers;
	},
	get shares() {
		return shares;
	},
	get blockedEntries() {
		return blockedEntries;
	},
	get recentAuthEvents() {
		return recentAuthEvents;
	},
	get pendingPairing() {
		return pendingPairing;
	},
	get connectionState() {
		return connectionState;
	},
	get connectedPeerCount() {
		return connectedPeerCount;
	},
	get activeTransfers() {
		return activeTransfers;
	},
	get recentConflicts() {
		return recentConflicts;
	},
	get lastError() {
		return lastError;
	},

	setMyFingerprint(value: MyFingerprintResponse | null) {
		myFingerprint = value;
	},
	setTrustedPeers(peers: TrustedPeer[]) {
		trustedPeers = peers;
	},
	upsertTrustedPeer(peer: TrustedPeer) {
		const idx = trustedPeers.findIndex((p) => p.fingerprintHex === peer.fingerprintHex);
		if (idx >= 0) {
			const next = [...trustedPeers];
			next[idx] = peer;
			trustedPeers = next;
		} else {
			trustedPeers = [...trustedPeers, peer];
		}
	},
	removeTrustedPeer(fingerprintHex: string) {
		trustedPeers = trustedPeers.filter((p) => p.fingerprintHex !== fingerprintHex);
	},

	setDiscoveredPeers(peers: DiscoveredPeer[]) {
		discoveredPeers = peers;
	},
	addDiscoveredPeer(peer: DiscoveredPeer) {
		if (discoveredPeers.some((p) => p.fingerprintHex === peer.fingerprintHex)) return;
		discoveredPeers = [...discoveredPeers, peer];
	},
	clearDiscoveredPeers() {
		discoveredPeers = [];
	},

	setShares(value: Share[]) {
		shares = value;
	},
	upsertShare(share: Share) {
		const idx = shares.findIndex((s) => s.id === share.id);
		if (idx >= 0) {
			const next = [...shares];
			next[idx] = share;
			shares = next;
		} else {
			shares = [...shares, share];
		}
	},
	removeShare(shareId: string) {
		shares = shares.filter((s) => s.id !== shareId);
	},

	setBlockedEntries(entries: BlockedEntry[]) {
		blockedEntries = entries;
	},
	removeBlocked(identifier: string) {
		blockedEntries = blockedEntries.filter((b) => b.identifier !== identifier);
	},

	setRecentAuthEvents(events: AuthEvent[]) {
		recentAuthEvents = events;
	},

	setPendingPairing(value: PendingPairing | null) {
		pendingPairing = value;
	},

	setConnectionState(value: ConnectionState) {
		connectionState = value;
	},
	setConnectedPeerCount(count: number) {
		connectedPeerCount = Math.max(0, count);
	},
	setActiveTransfers(count: number) {
		activeTransfers = Math.max(0, count);
	},

	pushConflict(record: ConflictRecord) {
		const next = [record, ...recentConflicts];
		if (next.length > MAX_RECENT_CONFLICTS) {
			next.length = MAX_RECENT_CONFLICTS;
		}
		recentConflicts = next;
	},
	clearConflicts() {
		recentConflicts = [];
	},

	setLastError(value: string | null) {
		lastError = value;
	},

	reset() {
		myFingerprint = null;
		trustedPeers = [];
		discoveredPeers = [];
		shares = [];
		blockedEntries = [];
		recentAuthEvents = [];
		pendingPairing = null;
		connectionState = 'idle';
		connectedPeerCount = 0;
		activeTransfers = 0;
		recentConflicts = [];
		lastError = null;
	},
};
