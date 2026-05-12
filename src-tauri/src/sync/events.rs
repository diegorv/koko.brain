//! Typed payloads + names for every `lan-sync:*` Tauri event emitted
//! by the Rust side. Centralising both halves here means a payload
//! field is changed in one place and the corresponding TS interface
//! in `src/lib/plugins/lan-sync/lan-sync.types.ts` is the single
//! coupling point on the frontend.
//!
//! Each `emit_*` helper is a thin wrapper around `tauri::AppHandle`
//! `emit` that hides the event-name string from call sites — call
//! sites care about *what* they're publishing, not *where the string
//! lives*. Failures emit a swallowed `eprintln!`; the event channel
//! is best-effort and we do not want to abort a sync session because
//! a UI listener went away.

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use crate::sync::auth_log::BlockedEntry;

// ============================================================================
// Event names (mirror `lan-sync.service.ts:27-33`).
// ============================================================================

pub const EVT_PEER_DISCOVERED: &str = "lan-sync:peer-discovered";
pub const EVT_PEER_TRUSTED: &str = "lan-sync:peer-trusted";
pub const EVT_PAIRING_PASSPHRASE_REQUIRED: &str = "lan-sync:pairing-passphrase-required";
pub const EVT_SHARE_PROGRESS: &str = "lan-sync:share-progress";
pub const EVT_CONFLICT_SAVED: &str = "lan-sync:conflict-saved";
pub const EVT_CONNECTION_STATE: &str = "lan-sync:connection-state";
pub const EVT_PEER_BLOCKED: &str = "lan-sync:peer-blocked";

// ============================================================================
// Payload structs (camelCase JSON; matches the TS interfaces).
// ============================================================================

/// Payload of `lan-sync:peer-discovered`. Mirrors `DiscoveredPeer` in
/// `lan-sync.types.ts:39`. The `fingerprint_display` field carries the
/// 6-word BIP-39 rendering so the UI never has to convert.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerDiscoveredPayload {
	pub fingerprint_hex: String,
	pub fingerprint_display: String,
	pub addr: String,
	pub port: u16,
	pub vault_label_hash: String,
	pub protocol_version_range: (u8, u8),
}

/// Payload of `lan-sync:peer-trusted`. Mirrors the `TrustedPeerDto`
/// already exposed by `lan_sync_list_trusted_peers`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerTrustedPayload {
	pub fingerprint_hex: String,
	pub fingerprint_display: String,
	pub display_name: String,
	pub public_key_b64: String,
	pub trusted_at_ms: i64,
}

/// Payload of `lan-sync:pairing-passphrase-required`. Fired by the
/// host-side pairing task once SPAKE2 completes and the remote peer's
/// identity is captured, so the dialog can move to the confirm step
/// with both the passphrase (already known) and the *remote*
/// fingerprint visible for the user to compare.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairingPassphraseRequiredPayload {
	pub session_id: String,
	pub passphrase: Vec<String>,
	/// 6-word words form of the remote peer's fingerprint. Frontend
	/// reads this into `pendingPairing.remoteFingerprint` (closes D2).
	pub remote_fingerprint_display: String,
	/// Hex form for hover-disclosure / debugging. Same value the
	/// trust store will key on if the user confirms.
	pub remote_fingerprint_hex: String,
}

/// Payload of `lan-sync:share-progress`. One emission per outbound
/// `PushUpdate` start AND completion; the frontend tracks active
/// transfer count by counting `bytesDone === 0` (start) and
/// `bytesDone >= bytesTotal` (done).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShareProgressPayload {
	pub share_id: String,
	/// Peer fingerprint hex (the canonical trust-store key).
	pub peer: String,
	pub path: String,
	pub bytes_done: u64,
	pub bytes_total: u64,
}

/// Payload of `lan-sync:conflict-saved`. Emitted by the session task
/// after a successful inbound apply returns
/// `ApplyOutcome::AppliedWithConflict { conflict_path }`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictSavedPayload {
	pub share_id: String,
	pub original_path: String,
	pub conflict_path: String,
	pub peer_fingerprint: String,
	pub timestamp_ms: i64,
}

/// Payload of `lan-sync:connection-state`. Emitted at every transition
/// of a session's lifecycle. `state` mirrors the TS `ConnectionState`
/// union (`idle`, `connecting`, `connected`, `transferring`,
/// `disconnected`, `error`).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionStatePayload {
	pub state: ConnectionState,
	/// Peer fingerprint hex once known; `None` for `idle` /
	/// `connecting` transitions where the remote identity is not
	/// established yet.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub peer: Option<String>,
	/// Human-readable error tail when `state == 'error'`.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub error: Option<String>,
}

/// Connection-state enum matching the TS union exactly. Serialised as
/// the lowercase variant name (`{"state":"connected"}`).
#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionState {
	Idle,
	Connecting,
	Connected,
	Transferring,
	Disconnected,
	Error,
}

/// Payload of `lan-sync:peer-blocked`. Emitted by any code path that
/// calls `auth_log::record_event` and receives a `Some(BlockedEntry)`.
/// Re-uses the existing `BlockedEntry` struct directly because its
/// serde shape is already camelCase and matches the TS interface.
pub type PeerBlockedPayload = BlockedEntry;

// ============================================================================
// Emit helpers. Each is a one-line wrapper so call sites read like
// `events::emit_peer_discovered(&app, payload)` rather than
// pulling the event name string into every call.
// ============================================================================

pub fn emit_peer_discovered(app: &AppHandle, payload: PeerDiscoveredPayload) {
	emit(app, EVT_PEER_DISCOVERED, &payload);
}

pub fn emit_peer_trusted(app: &AppHandle, payload: PeerTrustedPayload) {
	emit(app, EVT_PEER_TRUSTED, &payload);
}

pub fn emit_pairing_passphrase_required(app: &AppHandle, payload: PairingPassphraseRequiredPayload) {
	emit(app, EVT_PAIRING_PASSPHRASE_REQUIRED, &payload);
}

pub fn emit_share_progress(app: &AppHandle, payload: ShareProgressPayload) {
	emit(app, EVT_SHARE_PROGRESS, &payload);
}

pub fn emit_conflict_saved(app: &AppHandle, payload: ConflictSavedPayload) {
	emit(app, EVT_CONFLICT_SAVED, &payload);
}

pub fn emit_connection_state(app: &AppHandle, payload: ConnectionStatePayload) {
	emit(app, EVT_CONNECTION_STATE, &payload);
}

pub fn emit_peer_blocked(app: &AppHandle, payload: PeerBlockedPayload) {
	emit(app, EVT_PEER_BLOCKED, &payload);
}

fn emit<T: Serialize + Clone>(app: &AppHandle, event: &str, payload: &T) {
	if let Err(e) = app.emit(event, payload.clone()) {
		eprintln!("[lan-sync] emit {event} failed: {e}");
	}
}
