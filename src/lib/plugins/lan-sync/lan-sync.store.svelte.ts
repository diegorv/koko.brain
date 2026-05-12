import type {
	DiscoveredPeer,
	MyFingerprint,
	PairingIncoming,
	PushComplete,
	PushProgress,
	TrustedPeer,
} from './lan-sync.types';

// --- Reactive state (Svelte 5 runes) ---

/** Peers currently visible on the LAN via mDNS announces. */
let discoveredPeers = $state<DiscoveredPeer[]>([]);
/** Peers the local user has confirmed via the TOFU pairing flow; mirror of peers.json. */
let trustedPeers = $state<TrustedPeer[]>([]);
/** Local device identity descriptor; null until init has fetched it from the backend. */
let myFingerprint = $state<MyFingerprint | null>(null);
/** At most one in-flight inbound pairing request awaiting the user's decision. */
let pendingPair = $state<PairingIncoming | null>(null);
/** Progress for an in-flight push; null when no push is running. */
let pushProgress = $state<PushProgress | null>(null);
/** Most recent terminal push result, retained so the UI can display success/error after completion. */
let lastPushComplete = $state<PushComplete | null>(null);

// --- Public store ---

/**
 * Central reactive store for the LAN sync plugin. Mirrors backend-emitted
 * events into Svelte state and exposes getters for reactive reads + mutators
 * for the plugin's event listeners and UI panels.
 *
 * Computed getters are plain getters (not `$derived`) so they update
 * synchronously inside vitest tests, matching the project's store convention.
 */
export const lanSyncStore = {
	/** Peers currently visible on the LAN. */
	get discoveredPeers() { return discoveredPeers; },
	/** Peers the user has confirmed via TOFU pairing. */
	get trustedPeers() { return trustedPeers; },
	/** Local device identity descriptor, or null until init. */
	get myFingerprint() { return myFingerprint; },
	/** Inbound pairing request awaiting user decision, or null when none. */
	get pendingPair() { return pendingPair; },
	/** Progress for the in-flight push, or null when idle. */
	get pushProgress() { return pushProgress; },
	/** Most recent terminal push result (success or error), or null when none yet. */
	get lastPushComplete() { return lastPushComplete; },

	// --- Computed getters ---

	/** Set of fingerprintHex values from trustedPeers. O(n) per access. */
	get trustedFingerprints(): Set<string> {
		return new Set(trustedPeers.map((p) => p.fingerprintHex));
	},
	/** discoveredPeers filtered to those NOT in trustedFingerprints. */
	get discoveredUntrusted(): DiscoveredPeer[] {
		const trusted = new Set(trustedPeers.map((p) => p.fingerprintHex));
		return discoveredPeers.filter((p) => !trusted.has(p.fingerprintHex));
	},
	/** True iff pushProgress is non-null AND filesDone < filesTotal. */
	get isPushInProgress(): boolean {
		if (pushProgress === null) return false;
		return pushProgress.filesDone < pushProgress.filesTotal;
	},
	/** Integer 0-100 percent based on bytesDone/bytesTotal. Returns 0 when pushProgress is null or bytesTotal is 0. */
	get pushPercent(): number {
		if (pushProgress === null) return 0;
		if (pushProgress.bytesTotal === 0) return 0;
		return Math.round((pushProgress.bytesDone / pushProgress.bytesTotal) * 100);
	},

	// --- Mutators ---

	/**
	 * Inserts a discovered peer, replacing any existing entry with the same
	 * fingerprintHex (so address/port can update without growing the list).
	 */
	upsertDiscoveredPeer(peer: DiscoveredPeer) {
		const idx = discoveredPeers.findIndex((p) => p.fingerprintHex === peer.fingerprintHex);
		if (idx >= 0) {
			discoveredPeers[idx] = peer;
		} else {
			discoveredPeers.push(peer);
		}
	},

	/** Removes a discovered peer by fingerprintHex. No-op when not present. */
	removeDiscoveredPeer(fingerprintHex: string) {
		const idx = discoveredPeers.findIndex((p) => p.fingerprintHex === fingerprintHex);
		if (idx >= 0) {
			discoveredPeers.splice(idx, 1);
		}
	},

	/** Empties the discoveredPeers list (e.g. when discovery is stopped). */
	clearDiscoveredPeers() {
		discoveredPeers = [];
	},

	/** Replaces the trustedPeers list wholesale (used on initial peers.json load). */
	setTrustedPeers(peers: TrustedPeer[]) {
		trustedPeers = peers;
	},

	/**
	 * Inserts or replaces a trusted peer by fingerprintHex. Used when pairing
	 * confirmation succeeds or when a peer record is renamed.
	 */
	upsertTrustedPeer(peer: TrustedPeer) {
		const idx = trustedPeers.findIndex((p) => p.fingerprintHex === peer.fingerprintHex);
		if (idx >= 0) {
			trustedPeers[idx] = peer;
		} else {
			trustedPeers.push(peer);
		}
	},

	/** Removes a trusted peer by fingerprintHex. No-op when not present. */
	removeTrustedPeer(fingerprintHex: string) {
		const idx = trustedPeers.findIndex((p) => p.fingerprintHex === fingerprintHex);
		if (idx >= 0) {
			trustedPeers.splice(idx, 1);
		}
	},

	/** Sets (or clears, with null) the local device fingerprint. */
	setMyFingerprint(fp: MyFingerprint | null) {
		myFingerprint = fp;
	},

	/** Sets (or clears, with null) the pending inbound pairing request. */
	setPendingPair(pair: PairingIncoming | null) {
		pendingPair = pair;
	},

	/** Sets (or clears, with null) the in-flight push progress. */
	setPushProgress(progress: PushProgress | null) {
		pushProgress = progress;
	},

	/** Sets (or clears, with null) the last terminal push result. */
	setLastPushComplete(complete: PushComplete | null) {
		lastPushComplete = complete;
	},

	/** Resets every piece of LAN sync state to its initial value (used on vault teardown). */
	reset() {
		discoveredPeers = [];
		trustedPeers = [];
		myFingerprint = null;
		pendingPair = null;
		pushProgress = null;
		lastPushComplete = null;
	},
};
