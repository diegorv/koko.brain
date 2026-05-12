/**
 * TypeScript mirror of the Rust types in `src-tauri/src/sync/*`.
 *
 * Field names match the Tauri IPC serialisation (camelCase). Each
 * struct documents what the Rust side guarantees so the Svelte
 * layer can rely on those invariants without re-validating.
 */

/** Two share configuration shapes. */
export type ShareMode = 'subfolder' | 'root-with-excludes';

/** Direction the share flows. Currently informational; transport
 *  layer enforcement lands when the live wiring (Task 15 follow-up)
 *  goes in. */
export type ShareDirection = 'bi' | 'push' | 'pull';

/** One share entry persisted in `<vault>/.kokobrain/lan-sync/shares.json` */
export interface Share {
	id: string;
	mode: ShareMode;
	localPath: string;
	excludes: string[];
	allowedPeerFingerprints: string[];
	direction: ShareDirection;
	readOnly: boolean;
	createdAtMs: number;
}

/** Trusted peer in `<vault>/.kokobrain/lan-sync/peers.json` */
export interface TrustedPeer {
	fingerprintHex: string;
	displayName: string;
	publicKeyB64: string;
	trustedAtMs: number;
}

/** Peer found via mDNS, after RFC1918 + TXT validation. Emitted on
 *  the `lan-sync:peer-discovered` event. */
export interface DiscoveredPeer {
	fingerprintHex: string;
	addr: string;
	port: number;
	vaultLabelHash: string;
	protocolVersionRange: [number, number];
}

/** Materialised block in `auth_blocks`. */
export interface BlockedEntry {
	identifier: string;
	blockedAtMs: number;
	blockedUntilMs: number;
	triggerReason: FailureReason;
	failureCountInWindow: number;
}

/** One row from the audit log. */
export interface AuthEvent {
	id: number;
	timestampMs: number;
	identifier: string;
	peerFingerprint: string | null;
	remoteAddr: string;
	outcome: 'success' | 'failure';
	handshakePhase: HandshakePhase;
	failureReason: FailureReason | null;
	detail: string | null;
}

export type Outcome = 'success' | 'failure';

export type HandshakePhase =
	| 'tcp_accept'
	| 'opening'
	| 'identity_proof'
	| 'session'
	| 'pairing_pake'
	| 'pairing_exchange';

export type FailureReason =
	| 'unknown_fingerprint'
	| 'bad_signature'
	| 'bad_aead'
	| 'nonce_replay'
	| 'pake_abort'
	| 'path_traversal'
	| 'protocol_version_mismatch'
	| 'already_blocked';

/** Filter passed to `lan_sync_list_auth_events`. */
export interface AuthEventQuery {
	sinceMs?: number;
	untilMs?: number;
	identifier?: string;
	outcome?: Outcome;
	limit?: number;
}

/** Payload from `lan_sync_get_my_fingerprint`. */
export interface MyFingerprintResponse {
	fingerprintHex: string;
	fingerprintDisplay: string;
}

/** Payload from `lan_sync_start_pair_server` (live wiring TODO). */
export interface PairServerStart {
	sessionId: string;
	passphrase: string[];
}

/** Connection status reported by `lan-sync:connection-state` event. */
export type ConnectionState =
	| 'idle'
	| 'connecting'
	| 'connected'
	| 'transferring'
	| 'disconnected'
	| 'error';

/** UI-side projection of an active pairing flow. */
export interface PendingPairing {
	sessionId: string;
	role: 'host' | 'guest';
	passphrase?: string[];
	remoteFingerprint?: string;
}

/** A conflict file emitted when sync resolved LWW against the local
 *  copy. Drives the `lan-sync:conflict-saved` toast notification. */
export interface ConflictRecord {
	shareId: string;
	originalPath: string;
	conflictPath: string;
	peerFingerprint: string;
	timestampMs: number;
}
