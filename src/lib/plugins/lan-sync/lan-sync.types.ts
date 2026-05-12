/**
 * Type definitions for the LAN sync plugin's event payloads and persistent
 * records. These shapes are the canonical contract between the Rust backend
 * (`src-tauri/src/sync/`) and the Svelte frontend; the Stage 4 Rust events.rs
 * module asserts its serialized output against these definitions.
 */

/** A peer discovered on the LAN via mDNS announce. */
export interface DiscoveredPeer {
	/** First 16 hex chars of SHA-256(peer's Ed25519 public key). Stable identifier. */
	fingerprintHex: string;
	/** 6 BIP-39 words derived from the same hash, hyphen-joined. For human verification. */
	fingerprintDisplay: string;
	/** Last known LAN address. */
	addr: string;
	/** Listening TCP port advertised in the mDNS TXT record. */
	port: number;
}

/** A peer the user has confirmed via the TOFU pairing flow. Persisted in peers.json. */
export interface TrustedPeer {
	/** First 16 hex chars of SHA-256(peer's Ed25519 public key). Stable identifier. */
	fingerprintHex: string;
	/** 6 BIP-39 words derived from the same hash, hyphen-joined. For human verification. */
	fingerprintDisplay: string;
	/** Base64-encoded raw 32-byte Ed25519 public key, pinned at pairing time. */
	publicKeyB64: string;
	/** Optional user-chosen label for the device. */
	displayName: string | null;
	/** Unix epoch milliseconds when pairing was confirmed. */
	trustedAtMs: number;
}

/** Inbound pairing request awaiting the local user's accept/reject decision. */
export interface PairingIncoming {
	/** First 16 hex chars of SHA-256(remote peer's Ed25519 public key). */
	fingerprintHex: string;
	/** 6 BIP-39 words derived from the same hash, hyphen-joined. */
	fingerprintDisplay: string;
	/** LAN address the request arrived from. */
	addr: string;
	/** TCP port the requester is listening on. */
	port: number;
	/** Backend-issued correlation id; pass back when accepting/rejecting. */
	requestId: string;
}

/** Single overall progress event for the in-flight push. */
export interface PushProgress {
	/** Fingerprint (hex) of the peer being pushed to. */
	peerFingerprint: string;
	/** Number of files fully transferred so far. */
	filesDone: number;
	/** Total file count for the push. */
	filesTotal: number;
	/** Number of bytes fully transferred so far. */
	bytesDone: number;
	/** Total byte count for the push. */
	bytesTotal: number;
}

/** Terminal event when a push completes (success or error). */
export interface PushComplete {
	/** Fingerprint (hex) of the peer the push targeted. */
	peerFingerprint: string;
	/** Number of files that were transferred before completion. */
	filesTransferred: number;
	/** Present iff the push failed. */
	error?: string;
}

/** Local device identity descriptor. */
export interface MyFingerprint {
	/** First 16 hex chars of SHA-256(local Ed25519 public key). */
	fingerprintHex: string;
	/** 6 BIP-39 words derived from the same hash, hyphen-joined. */
	fingerprintDisplay: string;
}

/** One local network interface as reported by the OS. */
export interface LanSyncDebugInterface {
	/** OS-level interface name (e.g. `en0`, `utun4`). */
	name: string;
	/** IPv4 dotted-quad address. Loopback entries are filtered out. */
	addr: string;
}

/** One entry from the backend's `last_seen_addrs` map. */
export interface LanSyncDebugLastSeen {
	/** Peer's Ed25519 fingerprint hex (same value the UI shows). */
	fingerprintHex: string;
	/** Last-known LAN address that the mDNS browser reported. */
	addr: string;
	/** Last-known TCP port advertised in the peer's mDNS TXT record. */
	port: number;
}

/**
 * Diagnostic snapshot returned by `lan_sync_debug_dump`. Used to
 * triage discovery failures — surfaces the local fingerprint, every
 * non-loopback IPv4 interface, whether the announcer + browser are
 * currently running, and the last-seen address map populated by the
 * mDNS browser callback.
 */
export interface LanSyncDebugDump {
	/** Local device fingerprint hex (Ed25519-derived, 16 lowercase chars). */
	fingerprintHex: string;
	/** Local device fingerprint display (six BIP-39 words joined by `-`). */
	fingerprintDisplay: string;
	/** Every non-loopback IPv4 address the local OS reports. */
	localIpv4Addresses: LanSyncDebugInterface[];
	/** `true` while the announcer is registered. */
	announcerRunning: boolean;
	/** `true` while the browser is consuming events from the daemon. */
	browserRunning: boolean;
	/** Flattened snapshot of `state.last_seen_addrs`. */
	lastSeenAddrs: LanSyncDebugLastSeen[];
}
