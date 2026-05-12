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
