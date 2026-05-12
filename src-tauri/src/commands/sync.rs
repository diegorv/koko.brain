//! Tauri commands surface for LAN sync.
//!
//! Each command is a thin shim over the pure functions in
//! `crate::sync::*`. State that lives across calls (the connection
//! handle map, the active mDNS daemon, the pending pairing sessions)
//! is held in [`LanSyncState`] which is `.manage()`d on the Tauri
//! builder.
//!
//! Several commands here are intentionally **stubs**
//! (`#[tauri::command]`s returning `Err("not implemented yet")`) for
//! the live-network operations whose async wiring is too entangled
//! with mDNS / TCP / SPAKE2-over-the-wire to land in a single
//! sandbox-friendly commit. Each stub names the function that will
//! eventually drive it; the frontend can call them and gracefully
//! display "feature not available yet" until the wiring lands.

use crate::sync::auth_log::{
	self, AuthEvent, BlockedEntry, EventFilter, FailureReason, HandshakePhase, Outcome,
};
use crate::sync::identity::{
	format_fingerprint_words, parse_fingerprint, KeychainStorage, PeerIdentity,
};
use crate::sync::pairing::{self, TrustedPeer};
use crate::sync::shares::{self, Share, ShareDirection, ShareMode};
use crate::sync::state_db::open_state_db;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Mutex;
use uuid::Uuid;

/// State owned by the Tauri builder via `.manage(LanSyncState::default())`.
/// Holds long-lived handles + the local Ed25519 identity (lazy-loaded
/// on first command call). Coarse-grained `Mutex` is fine: every
/// command runs on the Tauri worker pool and acquires the lock for
/// microseconds.
#[derive(Default)]
pub struct LanSyncState {
	inner: Mutex<LanSyncInner>,
}

#[derive(Default)]
struct LanSyncInner {
	identity: Option<PeerIdentity>,
	/// `AppHandle` captured on first command call so background tasks
	/// (mDNS browse loop, session task, watcher consumer) can emit
	/// `lan-sync:*` events without each call site re-injecting it.
	/// Cloned freely from this slot; `AppHandle` is cheap to clone.
	app_handle: Option<tauri::AppHandle>,
	/// mDNS daemon + announcer fullname + browser task. Lazy-init on
	/// first `set_discoverable(true)` or `start_browse(...)` call;
	/// shut down on process exit. The same daemon is shared between
	/// announce and browse to avoid binding two UDP sockets.
	mdns: Option<MdnsHandles>,
}

/// Bundle of mDNS resources held by `LanSyncState`. Constructed
/// lazily on the first command that needs network discovery.
pub struct MdnsHandles {
	daemon: mdns_sd::ServiceDaemon,
	/// `ServiceInfo::get_fullname()` of our announce registration -
	/// `None` until `set_discoverable(true)` succeeds. Stored so we
	/// can call `daemon.unregister(...)` on `set_discoverable(false)`.
	announce_fullname: Option<String>,
	/// Browser background task abort handle. `None` while no
	/// browse is in flight; populated by `start_browse`.
	browser: Option<tokio::task::JoinHandle<()>>,
	/// Cached compact fingerprint of the local identity, used so the
	/// browser loop can drop loopback announcements that originate
	/// from this very daemon.
	our_fingerprint_hex: String,
	/// TCP port the local sync server is bound on. Defaults to 0 if
	/// the announce was started before the server (re-registers
	/// happen when `lan_sync_start` lands in Stage 5).
	announced_port: u16,
}

/// Identity account slot. Single per install (the slot would change
/// if we ever supported running the same install with multiple
/// distinct LAN identities; today we don't).
const IDENTITY_ACCOUNT: &str = "lan-sync-identity";

impl LanSyncState {
	fn with_identity<R>(
		&self,
		f: impl FnOnce(&PeerIdentity) -> Result<R, String>,
	) -> Result<R, String> {
		let mut guard = self
			.inner
			.lock()
			.map_err(|e| format!("LAN sync state poisoned: {e}"))?;
		if guard.identity.is_none() {
			let identity = crate::sync::identity::load_or_create_identity(
				&KeychainStorage,
				IDENTITY_ACCOUNT,
			)
			.map_err(|e| format!("load identity: {e}"))?;
			guard.identity = Some(identity);
		}
		let id = guard.identity.as_ref().expect("identity loaded above");
		f(id)
	}

	/// Captures the Tauri `AppHandle` so background tasks spawned by
	/// later stages can emit events. Idempotent: a second call with the
	/// same handle is a no-op, a second call with a *different* handle
	/// (shouldn't happen in practice; we singleton via `.manage(...)`)
	/// overwrites the slot.
	pub fn set_app_handle(&self, app: tauri::AppHandle) {
		if let Ok(mut guard) = self.inner.lock() {
			guard.app_handle = Some(app);
		}
	}

	/// Returns a cloned `AppHandle` for background-task event emission.
	/// `None` until `set_app_handle` runs at least once. Cloning the
	/// inner handle is cheap.
	pub fn app_handle(&self) -> Option<tauri::AppHandle> {
		self.inner.lock().ok().and_then(|g| g.app_handle.clone())
	}

	/// Initialises the shared mDNS daemon on first use. Subsequent
	/// calls are no-ops. `our_fingerprint_hex` is stored on the
	/// handles so the browser loop can filter self-loopback.
	pub fn ensure_mdns(&self, our_fingerprint_hex: String) -> Result<(), String> {
		let mut guard = self
			.inner
			.lock()
			.map_err(|e| format!("LAN sync state poisoned: {e}"))?;
		if guard.mdns.is_some() {
			return Ok(());
		}
		let daemon = mdns_sd::ServiceDaemon::new()
			.map_err(|e| format!("mdns daemon: {e}"))?;
		guard.mdns = Some(MdnsHandles {
			daemon,
			announce_fullname: None,
			browser: None,
			our_fingerprint_hex,
			announced_port: 0,
		});
		Ok(())
	}

	/// Borrows the mDNS handles for a closure. Returns an error when
	/// the daemon has not been initialised yet (`ensure_mdns` must
	/// run first).
	pub fn with_mdns_mut<R>(
		&self,
		f: impl FnOnce(&mut MdnsHandles) -> Result<R, String>,
	) -> Result<R, String> {
		let mut guard = self
			.inner
			.lock()
			.map_err(|e| format!("LAN sync state poisoned: {e}"))?;
		let handles = guard
			.mdns
			.as_mut()
			.ok_or_else(|| "mdns daemon not initialised".to_string())?;
		f(handles)
	}
}

// ============================================================================
// Identity / fingerprint
// ============================================================================

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MyFingerprintResponse {
	pub fingerprint_hex: String,
	pub fingerprint_display: String,
}

#[tauri::command]
pub fn lan_sync_get_my_fingerprint(
	app: tauri::AppHandle,
	state: tauri::State<'_, LanSyncState>,
) -> Result<MyFingerprintResponse, String> {
	// The frontend calls this command first on every vault open, so it
	// is the natural place to capture the `AppHandle` for future
	// background-task event emission.
	state.set_app_handle(app);
	state.with_identity(|id| {
		let fp = id.fingerprint();
		Ok(MyFingerprintResponse {
			fingerprint_hex: hex_of(&fp),
			fingerprint_display: id.fingerprint_string(),
		})
	})
}

fn hex_of(bytes: &[u8]) -> String {
	bytes.iter().map(|b| format!("{b:02X}")).collect()
}

/// Renders a fingerprint hex string (`XXXX-XXXX-XXXX-XXXX` or compact)
/// as the 6-word BIP-39 display form. Falls back to echoing the hex
/// input when it cannot be parsed - that should never happen for
/// values written by `add_trusted_peer`, but the fallback keeps the
/// IPC contract total so a corrupt trust-store entry surfaced by
/// `read_peers` (S3) does not also blank the display column.
fn fingerprint_display_from_hex(hex: &str) -> String {
	match parse_fingerprint(hex) {
		Some(bytes) => format_fingerprint_words(&bytes),
		None => hex.to_string(),
	}
}

// ============================================================================
// Trust store
// ============================================================================

/// DTO carried over IPC for every trusted peer record. Adds
/// `fingerprintDisplay` (6-word form) alongside the canonical
/// `fingerprintHex` so the frontend can render the human-readable
/// version uniformly. The hex form is still the trust-store key and
/// the value the UI sends back to APIs that mutate the trust store.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustedPeerDto {
	pub fingerprint_hex: String,
	pub fingerprint_display: String,
	pub display_name: String,
	pub public_key_b64: String,
	pub trusted_at_ms: i64,
}

impl From<TrustedPeer> for TrustedPeerDto {
	fn from(peer: TrustedPeer) -> Self {
		let display = fingerprint_display_from_hex(&peer.fingerprint_hex);
		Self {
			fingerprint_hex: peer.fingerprint_hex,
			fingerprint_display: display,
			display_name: peer.display_name,
			public_key_b64: peer.public_key_b64,
			trusted_at_ms: peer.trusted_at_ms,
		}
	}
}

#[tauri::command]
pub fn lan_sync_list_trusted_peers(vault_path: String) -> Result<Vec<TrustedPeerDto>, String> {
	let file =
		pairing::read_peers(Path::new(&vault_path)).map_err(|e| format!("read peers: {e}"))?;
	Ok(file.peers.into_iter().map(TrustedPeerDto::from).collect())
}

#[tauri::command]
pub fn lan_sync_remove_trusted_peer(
	vault_path: String,
	fingerprint_hex: String,
) -> Result<(), String> {
	pairing::remove_trusted_peer(Path::new(&vault_path), &fingerprint_hex)
		.map_err(|e| format!("remove peer: {e}"))
}

// ============================================================================
// Shares
// ============================================================================

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddShareRequest {
	pub mode: ShareMode,
	pub local_path: String,
	#[serde(default)]
	pub excludes: Vec<String>,
	pub allowed_peer_fingerprints: Vec<String>,
	pub direction: ShareDirection,
	#[serde(default)]
	pub read_only: bool,
}

#[tauri::command]
pub fn lan_sync_list_shares(vault_path: String) -> Result<Vec<Share>, String> {
	let file =
		shares::read_shares(Path::new(&vault_path)).map_err(|e| format!("read shares: {e}"))?;
	Ok(file.shares)
}

#[tauri::command]
pub fn lan_sync_add_share(
	vault_path: String,
	request: AddShareRequest,
) -> Result<Share, String> {
	let now_ms = chrono::Utc::now().timestamp_millis();
	let share = Share {
		id: format!("share-{}", Uuid::new_v4()),
		mode: request.mode,
		local_path: request.local_path,
		excludes: request.excludes,
		allowed_peer_fingerprints: request.allowed_peer_fingerprints,
		direction: request.direction,
		read_only: request.read_only,
		created_at_ms: now_ms,
	};
	let vault_root = Path::new(&vault_path);
	shares::validate_share_config(vault_root, &share)
		.map_err(|e| format!("validate share: {e}"))?;
	let mut file = shares::read_shares(vault_root).map_err(|e| format!("read shares: {e}"))?;
	file.shares.push(share.clone());
	shares::write_shares(vault_root, &file).map_err(|e| format!("write shares: {e}"))?;
	Ok(share)
}

#[tauri::command]
pub fn lan_sync_remove_share(vault_path: String, share_id: String) -> Result<(), String> {
	let vault_root = Path::new(&vault_path);
	let mut file = shares::read_shares(vault_root).map_err(|e| format!("read shares: {e}"))?;
	let before = file.shares.len();
	file.shares.retain(|s| s.id != share_id);
	if file.shares.len() == before {
		return Err(format!("share not found: {share_id}"));
	}
	shares::write_shares(vault_root, &file).map_err(|e| format!("write shares: {e}"))
}

#[tauri::command]
pub fn lan_sync_update_share_peers(
	vault_path: String,
	share_id: String,
	allowed_peer_fingerprints: Vec<String>,
) -> Result<Share, String> {
	let vault_root = Path::new(&vault_path);
	let mut file = shares::read_shares(vault_root).map_err(|e| format!("read shares: {e}"))?;
	let share = file
		.shares
		.iter_mut()
		.find(|s| s.id == share_id)
		.ok_or_else(|| format!("share not found: {share_id}"))?;
	share.allowed_peer_fingerprints = allowed_peer_fingerprints;
	let updated = share.clone();
	shares::write_shares(vault_root, &file).map_err(|e| format!("write shares: {e}"))?;
	Ok(updated)
}

// ============================================================================
// Auth log + blocking
// ============================================================================

#[tauri::command]
pub fn lan_sync_list_blocked(vault_path: String) -> Result<Vec<BlockedEntry>, String> {
	let conn = open_state_db(Path::new(&vault_path)).map_err(|e| format!("open state db: {e}"))?;
	let now = chrono::Utc::now().timestamp_millis();
	auth_log::list_blocked(&conn, now).map_err(|e| format!("list blocked: {e}"))
}

#[tauri::command]
pub fn lan_sync_unblock(vault_path: String, identifier: String) -> Result<bool, String> {
	let conn = open_state_db(Path::new(&vault_path)).map_err(|e| format!("open state db: {e}"))?;
	auth_log::unblock(&conn, &identifier).map_err(|e| format!("unblock: {e}"))
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AuthEventQuery {
	pub since_ms: Option<i64>,
	pub until_ms: Option<i64>,
	pub identifier: Option<String>,
	pub outcome: Option<String>,
	pub limit: Option<u32>,
}

#[tauri::command]
pub fn lan_sync_list_auth_events(
	vault_path: String,
	query: AuthEventQuery,
) -> Result<Vec<AuthEvent>, String> {
	let conn = open_state_db(Path::new(&vault_path)).map_err(|e| format!("open state db: {e}"))?;
	let outcome = match query.outcome.as_deref() {
		Some("success") => Some(Outcome::Success),
		Some("failure") => Some(Outcome::Failure),
		_ => None,
	};
	let filter = EventFilter {
		since_ms: query.since_ms,
		until_ms: query.until_ms,
		identifier: query.identifier.as_deref(),
		outcome,
		limit: query.limit,
	};
	auth_log::list_events(&conn, filter).map_err(|e| format!("list events: {e}"))
}

#[tauri::command]
pub fn lan_sync_cleanup_auth_log(
	vault_path: String,
	older_than_ms: i64,
) -> Result<u64, String> {
	let conn = open_state_db(Path::new(&vault_path)).map_err(|e| format!("open state db: {e}"))?;
	auth_log::cleanup_old_events(&conn, older_than_ms).map_err(|e| format!("cleanup: {e}"))
}

// ============================================================================
// Live-network stubs: discovery + pairing + sync server.
//
// These each carry a TODO note pointing at the function that will
// eventually drive them. The frontend can wire to these names today
// and degrade gracefully until the wiring lands.
// ============================================================================

/// Toggles mDNS announcement for the local vault. When `enabled`
/// is true, the daemon registers a service record under
/// [`crate::sync::discovery::SERVICE_TYPE`] carrying the
/// fingerprint / vault-label / protocol-version TXT entries. When
/// false, the registration is removed; the daemon itself stays
/// alive (other code paths - notably `start_browse` - keep using
/// the same daemon).
#[tauri::command]
pub fn lan_sync_set_discoverable(
	vault_path: String,
	enabled: bool,
	state: tauri::State<'_, LanSyncState>,
) -> Result<(), String> {
	let our_fp = state.with_identity(|id| Ok(id.fingerprint_string()))?;
	let our_fp_hex_for_announce = our_fp.clone();
	state.ensure_mdns(our_fp.clone())?;
	if enabled {
		let vault_path_buf = std::path::PathBuf::from(&vault_path);
		state.with_mdns_mut(|h| {
			if h.announce_fullname.is_some() {
				return Ok(()); // already announcing
			}
			let label = crate::sync::discovery::compute_vault_label_hash(&vault_path_buf);
			let instance = crate::sync::discovery::fingerprint_hex_compact(&our_fp_hex_for_announce);
			register_announce(h, &instance, label, h.announced_port)
				.map_err(|e| format!("mdns register: {e}"))?;
			Ok(())
		})
	} else {
		state.with_mdns_mut(|h| {
			if let Some(fullname) = h.announce_fullname.take() {
				let _ = h.daemon.unregister(&fullname);
			}
			Ok(())
		})
	}
}

/// Starts a browse loop on the shared daemon. Each `ServiceResolved`
/// event coming from another `_kokobrain-sync._tcp.local.` peer is
/// turned into a [`PeerDiscoveredPayload`] and emitted via
/// `lan-sync:peer-discovered`. Loopback announcements from this
/// very daemon are filtered out via fingerprint comparison.
#[tauri::command]
pub fn lan_sync_start_browse(
	_vault_path: String,
	state: tauri::State<'_, LanSyncState>,
) -> Result<(), String> {
	let our_fp = state.with_identity(|id| Ok(id.fingerprint_string()))?;
	state.ensure_mdns(our_fp.clone())?;
	let app_handle = state
		.app_handle()
		.ok_or_else(|| "AppHandle not captured yet; call lan_sync_get_my_fingerprint first".to_string())?;
	state.with_mdns_mut(|h| {
		if h.browser.is_some() {
			return Ok(()); // already browsing
		}
		let rx = h
			.daemon
			.browse(crate::sync::discovery::SERVICE_TYPE)
			.map_err(|e| format!("mdns browse: {e}"))?;
		let our_fp = h.our_fingerprint_hex.clone();
		h.browser = Some(tokio::spawn(browser_loop(rx, app_handle.clone(), our_fp)));
		Ok(())
	})
}

/// Stops the in-flight browse task (if any). The daemon stays alive
/// in case the announce side is also running.
#[tauri::command]
pub fn lan_sync_stop_browse(
	_vault_path: String,
	state: tauri::State<'_, LanSyncState>,
) -> Result<(), String> {
	state.with_mdns_mut(|h| {
		if let Some(task) = h.browser.take() {
			task.abort();
		}
		Ok(())
	})
}

/// Helper that registers the local announce on the daemon. Builds
/// the `ServiceInfo` from the cached announce parameters and writes
/// the resulting `get_fullname()` into the handles slot so a later
/// `set_discoverable(false)` can `unregister` it.
fn register_announce(
	h: &mut MdnsHandles,
	instance: &str,
	vault_label: String,
	port: u16,
) -> Result<(), mdns_sd::Error> {
	use crate::sync::discovery::{build_announce_txt, AnnounceConfig, SERVICE_TYPE};
	let host = format!("{instance}.local.");
	let cfg = AnnounceConfig {
		instance_name: instance.to_string(),
		hostname: host.clone(),
		port,
		fingerprint_hex: h.our_fingerprint_hex.clone(),
		vault_label_hash: vault_label,
	};
	let txt = build_announce_txt(&cfg);
	let info = mdns_sd::ServiceInfo::new(
		SERVICE_TYPE,
		instance,
		&host,
		"",
		port,
		&txt[..],
	)?
	.enable_addr_auto();
	h.announce_fullname = Some(info.get_fullname().to_string());
	h.daemon.register(info)
}

/// Background task that turns `mdns_sd::ServiceEvent::ServiceResolved`
/// events into `lan-sync:peer-discovered` emissions on the frontend.
/// All other event variants are dropped (we do not surface
/// `SearchStarted` / `ServiceRemoved` to the UI; those are noise the
/// store does not consume).
async fn browser_loop(
	rx: mdns_sd::Receiver<mdns_sd::ServiceEvent>,
	app: tauri::AppHandle,
	our_fingerprint_hex: String,
) {
	use crate::sync::events::{emit_peer_discovered, PeerDiscoveredPayload};
	while let Ok(evt) = rx.recv_async().await {
		if let mdns_sd::ServiceEvent::ServiceResolved(info) = evt {
			match crate::sync::discovery::service_info_to_discovered_peer(&info, &our_fingerprint_hex) {
				Ok(Some(peer)) => {
					emit_peer_discovered(
						&app,
						PeerDiscoveredPayload {
							fingerprint_display: fingerprint_display_from_hex(&peer.fingerprint_hex),
							fingerprint_hex: peer.fingerprint_hex,
							addr: peer.addr.to_string(),
							port: peer.port,
							vault_label_hash: peer.vault_label_hash,
							protocol_version_range: peer.protocol_version_range,
						},
					);
				}
				Ok(None) => {
					// Self-discovery; silently drop.
				}
				Err(e) => {
					eprintln!("[lan-sync] discarded malformed peer announce: {e}");
				}
			}
		}
	}
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PairServerStart {
	pub session_id: String,
	pub passphrase: Vec<String>,
}

#[tauri::command]
pub fn lan_sync_start_pair_server(
	_vault_path: String,
) -> Result<PairServerStart, String> {
	// TODO(lan-sync live): generate passphrase via
	// `wordlist::generate_passphrase`, start TCP accept loop, drive
	// `pairing::start_pairing_host` over the socket.
	Err("Pairing server is not wired yet (Task 15 follow-up)".to_string())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairClientRequest {
	pub addr: String,
	pub port: u16,
	pub passphrase: String,
}

#[tauri::command]
pub fn lan_sync_start_pair_client(
	_vault_path: String,
	_request: PairClientRequest,
) -> Result<String, String> {
	// TODO(lan-sync live): connect TCP, drive `pairing::start_pairing_guest`.
	Err("Pairing client is not wired yet (Task 15 follow-up)".to_string())
}

#[tauri::command]
pub fn lan_sync_confirm_pair(
	_session_id: String,
	_accept: bool,
) -> Result<Option<TrustedPeerDto>, String> {
	// TODO(lan-sync live): finalise pairing transcript, signed
	// public key exchange, persist via `pairing::add_trusted_peer`.
	Err("Pairing confirmation is not wired yet (Task 15 follow-up)".to_string())
}

#[tauri::command]
pub fn lan_sync_start(_vault_path: String) -> Result<u16, String> {
	// TODO(lan-sync live): bind TCP listener on 0.0.0.0:0, return
	// the actual port, spawn the accept loop driven by
	// `sync::transport::perform_handshake_*`.
	Err("LAN sync server is not wired yet (Task 15 follow-up)".to_string())
}

#[tauri::command]
pub fn lan_sync_stop() -> Result<(), String> {
	Err("LAN sync server is not wired yet (Task 15 follow-up)".to_string())
}

#[tauri::command]
pub fn lan_sync_request_full_resync(
	_share_id: String,
	_peer_fingerprint: String,
) -> Result<(), String> {
	// TODO(lan-sync live): bump `since_version` to 0 for the named
	// peer; the anti-entropy loop will re-fetch the full manifest.
	Err("Full resync is not wired yet (Task 15 follow-up)".to_string())
}

// Helpers shared with the live wiring layer when it lands. Marked
// `pub(crate)` so future commits can extend without exporting.
pub(crate) const _PHASES: &[HandshakePhase] = &[
	HandshakePhase::TcpAccept,
	HandshakePhase::Opening,
	HandshakePhase::IdentityProof,
	HandshakePhase::Session,
	HandshakePhase::PairingPake,
	HandshakePhase::PairingExchange,
];

pub(crate) const _FAILURE_REASONS: &[FailureReason] = &[
	FailureReason::UnknownFingerprint,
	FailureReason::BadSignature,
	FailureReason::BadAead,
	FailureReason::NonceReplay,
	FailureReason::PakeAbort,
	FailureReason::PathTraversal,
	FailureReason::ProtocolVersionMismatch,
	FailureReason::AlreadyBlocked,
];
