//! Typed payloads + helpers for every `lan-sync:*` Tauri event the
//! Rust side emits.
//!
//! Each struct mirrors a TS interface in
//! `src/lib/plugins/lan-sync/lan-sync.types.ts` — the JSON shape is
//! pinned by `tests/sync_events_test.rs` so a divergence between the
//! two layers fails CI rather than silently shipping a mismatched
//! payload.
//!
//! The `emit_*` helpers are thin wrappers around `AppHandle::emit`
//! so call sites read `events::emit_peer_discovered(&app, &payload)`
//! instead of pulling the event-name string into every site. Each
//! helper is generic over `tauri::Runtime` so integration tests can
//! plug `tauri::Wry` (or the mock runtime) without touching this
//! file.

use serde::{Deserialize, Serialize};
use tauri::Emitter;

// ============================================================================
// Event-name constants. Keep these in lock-step with
// `lan-sync.service.ts` listener registration.
// ============================================================================

/// Tauri event name for a newly discovered LAN peer.
///
/// Payload type: [`PeerDiscoveredPayload`].
pub const EVT_PEER_DISCOVERED: &str = "lan-sync:peer-discovered";

/// Tauri event name fired when a peer transitions to "trusted"
/// (after the user confirms a pairing handshake).
///
/// Payload type: [`PeerTrustedPayload`].
pub const EVT_PEER_TRUSTED: &str = "lan-sync:peer-trusted";

/// Tauri event name fired on the receiving device when a remote
/// peer initiates pairing and the local user must accept or reject.
///
/// Payload type: [`PairingIncomingPayload`].
pub const EVT_PAIRING_INCOMING: &str = "lan-sync:pairing-incoming";

/// Tauri event name fired periodically while a folder push is in
/// flight so the UI can render a progress bar.
///
/// Payload type: [`PushProgressPayload`].
pub const EVT_PUSH_PROGRESS: &str = "lan-sync:push-progress";

/// Tauri event name fired exactly once per push when the transfer
/// terminates (success or failure).
///
/// Payload type: [`PushCompletePayload`].
pub const EVT_PUSH_COMPLETE: &str = "lan-sync:push-complete";

// ============================================================================
// Payload structs. Every struct uses `#[serde(rename_all = "camelCase")]`
// so the JSON keys exactly match the TS interfaces in
// `lan-sync.types.ts`.
// ============================================================================

/// Payload for [`EVT_PEER_DISCOVERED`].
///
/// Mirrors the `DiscoveredPeer` TS interface.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PeerDiscoveredPayload {
	/// First 16 hex chars of `SHA-256(peer public key)`. Stable
	/// identifier used as the primary key everywhere.
	pub fingerprint_hex: String,
	/// Six BIP-39 English words joined by `-`. For human comparison.
	pub fingerprint_display: String,
	/// Peer's LAN address as observed by the mDNS browser.
	pub addr: String,
	/// TCP port the peer is listening on (from the SRV record).
	pub port: u16,
}

/// Payload for [`EVT_PEER_TRUSTED`].
///
/// Mirrors the `TrustedPeer` TS interface. Emitted after a
/// successful pairing handshake so panels that read `peers.json` can
/// refresh without polling.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PeerTrustedPayload {
	/// First 16 hex chars of `SHA-256(peer public key)`.
	pub fingerprint_hex: String,
	/// Six BIP-39 English words joined by `-`.
	pub fingerprint_display: String,
	/// Base64-encoded raw 32-byte Ed25519 public key (pinned at
	/// pairing time).
	pub public_key_b64: String,
	/// Optional user-set device name. `None` until the user labels
	/// the peer.
	pub display_name: Option<String>,
	/// Unix epoch milliseconds when pairing was confirmed.
	pub trusted_at_ms: u64,
}

/// Payload for [`EVT_PAIRING_INCOMING`].
///
/// Mirrors the `PairingIncoming` TS interface. Fired on the
/// receiving device when a remote peer initiates pairing; the UI
/// surfaces the choice and posts back with `request_id`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PairingIncomingPayload {
	/// First 16 hex chars of `SHA-256(remote peer public key)`.
	pub fingerprint_hex: String,
	/// Six BIP-39 English words joined by `-`.
	pub fingerprint_display: String,
	/// LAN address the inbound TCP connection arrived from.
	pub addr: String,
	/// TCP port the requester listens on for the reverse channel.
	pub port: u16,
	/// Backend-issued correlation id; the frontend passes it back
	/// when accepting / rejecting the pairing.
	pub request_id: String,
}

/// Payload for [`EVT_PUSH_PROGRESS`].
///
/// Mirrors the `PushProgress` TS interface. Emitted periodically by
/// the push driver so the UI can render a progress bar without
/// polling.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PushProgressPayload {
	/// Fingerprint hex of the peer this push targets.
	pub peer_fingerprint: String,
	/// Number of files fully transferred so far.
	pub files_done: u64,
	/// Total file count for this push.
	pub files_total: u64,
	/// Bytes fully transferred so far across all files.
	pub bytes_done: u64,
	/// Total byte count for this push.
	pub bytes_total: u64,
}

/// Payload for [`EVT_PUSH_COMPLETE`].
///
/// Mirrors the `PushComplete` TS interface. Emitted exactly once per
/// push when the transfer ends, success or failure.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PushCompletePayload {
	/// Fingerprint hex of the peer the push targeted.
	pub peer_fingerprint: String,
	/// Number of files that were transferred before completion.
	pub files_transferred: u64,
	/// Present iff the push failed. The string is human-readable
	/// (not localised); the UI may surface it in a toast.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub error: Option<String>,
}

/// Return type for the `lan_sync_get_my_fingerprint` command.
///
/// Mirrors the `MyFingerprint` TS interface. Not an event payload;
/// lives in this module so every payload shape is defined in one
/// place.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct MyFingerprintPayload {
	/// First 16 hex chars of `SHA-256(local public key)`.
	pub fingerprint_hex: String,
	/// Six BIP-39 English words joined by `-`.
	pub fingerprint_display: String,
}

// ============================================================================
// Emit helpers. Each is a one-line wrapper so call sites do not
// have to import the event-name constants.
// ============================================================================

/// Emits a [`PeerDiscoveredPayload`] under [`EVT_PEER_DISCOVERED`].
///
/// Generic over `tauri::Runtime` so tests can use `Wry` (or a mock).
pub fn emit_peer_discovered<R: tauri::Runtime>(
	app: &tauri::AppHandle<R>,
	payload: &PeerDiscoveredPayload,
) -> tauri::Result<()> {
	app.emit(EVT_PEER_DISCOVERED, payload)
}

/// Emits a [`PeerTrustedPayload`] under [`EVT_PEER_TRUSTED`].
///
/// Generic over `tauri::Runtime` so tests can use `Wry` (or a mock).
pub fn emit_peer_trusted<R: tauri::Runtime>(
	app: &tauri::AppHandle<R>,
	payload: &PeerTrustedPayload,
) -> tauri::Result<()> {
	app.emit(EVT_PEER_TRUSTED, payload)
}

/// Emits a [`PairingIncomingPayload`] under [`EVT_PAIRING_INCOMING`].
///
/// Generic over `tauri::Runtime` so tests can use `Wry` (or a mock).
pub fn emit_pairing_incoming<R: tauri::Runtime>(
	app: &tauri::AppHandle<R>,
	payload: &PairingIncomingPayload,
) -> tauri::Result<()> {
	app.emit(EVT_PAIRING_INCOMING, payload)
}

/// Emits a [`PushProgressPayload`] under [`EVT_PUSH_PROGRESS`].
///
/// Generic over `tauri::Runtime` so tests can use `Wry` (or a mock).
pub fn emit_push_progress<R: tauri::Runtime>(
	app: &tauri::AppHandle<R>,
	payload: &PushProgressPayload,
) -> tauri::Result<()> {
	app.emit(EVT_PUSH_PROGRESS, payload)
}

/// Emits a [`PushCompletePayload`] under [`EVT_PUSH_COMPLETE`].
///
/// Generic over `tauri::Runtime` so tests can use `Wry` (or a mock).
pub fn emit_push_complete<R: tauri::Runtime>(
	app: &tauri::AppHandle<R>,
	payload: &PushCompletePayload,
) -> tauri::Result<()> {
	app.emit(EVT_PUSH_COMPLETE, payload)
}

// ============================================================================
// Diagnostic dump (returned by `lan_sync_debug_dump`, never an event).
// Used by the frontend to render a triage view when discovery misbehaves.
// ============================================================================

/// One local network interface as observed by
/// `local_ip_address::list_afinet_netifas`. Loopback entries are
/// filtered out by the command before this is built.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LanSyncDebugInterface {
	/// OS-level interface name (e.g. `en0`, `utun4`).
	pub name: String,
	/// IPv4 address as a dotted-quad string. Only IPv4 is reported;
	/// the underlying crate also returns v6 records and we filter
	/// those out so the dump matches what the announcer would
	/// publish under `enable_addr_auto`.
	pub addr: String,
}

/// One entry from `SyncState.last_seen_addrs`, flattened so it can
/// round-trip through serde without exposing the internal HashMap
/// shape to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LanSyncDebugLastSeen {
	/// Peer's Ed25519 fingerprint hex (the same value the UI shows).
	pub fingerprint_hex: String,
	/// Last-known LAN address that the mDNS browser reported.
	pub addr: String,
	/// Last-known TCP port advertised in the peer's mDNS TXT record.
	pub port: u16,
}

/// Snapshot of the LAN sync runtime state used for triage when
/// discovery does not show peers.
///
/// Returned by the `lan_sync_debug_dump` Tauri command. Not an event;
/// kept in this module so the wire shapes for everything LAN sync
/// publishes live in one file.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LanSyncDebugDump {
	/// Local device fingerprint hex (Ed25519-derived, 16 lowercase
	/// chars).
	pub fingerprint_hex: String,
	/// Local device fingerprint display (six BIP-39 words joined by
	/// `-`).
	pub fingerprint_display: String,
	/// Every non-loopback IPv4 address the local OS reports across
	/// all network interfaces. Used to compare against what the mDNS
	/// announcer published — if the right interface is missing here,
	/// `enable_addr_auto` had nothing to advertise.
	pub local_ipv4_addresses: Vec<LanSyncDebugInterface>,
	/// `true` while the announcer is registered (set between
	/// `lan_sync_set_discoverable(true)` and `false`).
	pub announcer_running: bool,
	/// `true` while the browser is consuming events from the daemon.
	pub browser_running: bool,
	/// Snapshot of `state.last_seen_addrs` flattened for serde.
	pub last_seen_addrs: Vec<LanSyncDebugLastSeen>,
}
