//! Tauri command handlers for the LAN sync plugin.
//!
//! Each command is a thin shim over the pure functions in
//! `crate::sync::*`. State that lives across calls (the mDNS
//! announcer, the mDNS browser, the cached identity, the TCP accept
//! loop, the pending-pair sessions, and last-seen peer addresses) is
//! held in `crate::sync::SyncState` (managed as `Arc<SyncState>` so
//! spawned tasks can share it) and reached through the `State`
//! extractor.
//!
//! Errors are normalised to `String` because Tauri serialises command
//! results to JSON and `String` is the simplest end-to-end surface.

use std::path::PathBuf;
use std::sync::Arc;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use tauri::{AppHandle, Runtime, State};

use crate::sync::dispatch::{self, PeerHandshake, INTENT_PAIR, INTENT_PUSH};
use crate::sync::discovery::{Announcer, Browser};
use crate::sync::events::{
	self, LanSyncDebugDump, LanSyncDebugInterface, LanSyncDebugLastSeen, MyFingerprintPayload,
	PeerTrustedPayload, PushCompletePayload, PushProgressPayload,
};
use crate::sync::identity::{DeviceIdentity, IdentityProof};
use crate::sync::push::{plan_push, send_folder};
use crate::sync::transport::{self, open_to, StaticKeys};
use crate::sync::trust::{self, TrustedPeer};
use crate::sync::SyncState;

/// Default TCP port the announcer publishes. Fixed for MVP so peers
/// can reconnect deterministically; later stages will negotiate a
/// dynamic port via the SRV record.
const ANNOUNCE_PORT: u16 = 7878;

/// Returns the on-disk path of the per-vault identity key.
///
/// Path layout: `<vault_root>/.kokobrain/identity.key`. The parent
/// directory is created on demand by
/// `DeviceIdentity::load_or_create`.
fn identity_path(vault_path: &str) -> PathBuf {
	PathBuf::from(vault_path)
		.join(".kokobrain")
		.join("identity.key")
}

/// Loads (or creates) the device identity for `vault_path` and
/// caches it in `state.identity`, overwriting any previous slot.
/// Returns the public fingerprint surfaces as a [`MyFingerprintPayload`].
fn ensure_identity_cached(
	state: &SyncState,
	vault_path: &str,
) -> Result<MyFingerprintPayload, String> {
	let identity = DeviceIdentity::load_or_create(&identity_path(vault_path))
		.map_err(|e| format!("load identity: {e}"))?;
	let payload = MyFingerprintPayload {
		fingerprint_hex: identity.fingerprint_hex(),
		fingerprint_display: identity.fingerprint_display(),
	};
	let mut guard = state
		.identity
		.lock()
		.map_err(|e| format!("identity lock poisoned: {e}"))?;
	*guard = Some(identity);
	Ok(payload)
}

/// Returns the cached fingerprint hex, loading + caching the
/// identity from disk when the slot is empty.
fn fingerprint_hex_for(state: &SyncState, vault_path: &str) -> Result<String, String> {
	{
		let guard = state
			.identity
			.lock()
			.map_err(|e| format!("identity lock poisoned: {e}"))?;
		if let Some(id) = guard.as_ref() {
			return Ok(id.fingerprint_hex());
		}
	}
	let payload = ensure_identity_cached(state, vault_path)?;
	Ok(payload.fingerprint_hex)
}

/// Returns the X25519 static keypair for `vault_path`.
///
/// The Ed25519 [`DeviceIdentity`] type intentionally does NOT expose
/// its secret seed (so the signing key cannot leak via Debug or
/// accidental moves), but the Noise XX layer needs those same seed
/// bytes to derive the matching X25519 static key
/// ([`transport::static_keys_from_ed25519_secret`]). We re-read the
/// 32-byte seed from disk here. `ensure_identity_cached` is called
/// first so the underlying file is guaranteed to exist before this
/// function attempts to read it.
fn static_keys_for(state: &SyncState, vault_path: &str) -> Result<StaticKeys, String> {
	ensure_identity_cached(state, vault_path)?;
	let path = identity_path(vault_path);
	let bytes = std::fs::read(&path).map_err(|e| format!("read identity: {e}"))?;
	if bytes.len() != 32 {
		return Err(format!(
			"identity key has wrong length: expected 32 bytes, got {}",
			bytes.len()
		));
	}
	let mut secret = [0_u8; 32];
	secret.copy_from_slice(&bytes);
	Ok(transport::static_keys_from_ed25519_secret(&secret))
}

/// Returns the locally-cached identity proof for `vault_path`.
///
/// The proof binds the on-disk Ed25519 identity to the X25519 static
/// the Noise handshake authenticates and is exchanged immediately
/// after the three Noise XX messages complete. We ensure the identity
/// is loaded so the binding-signature file is created on first call.
fn identity_proof_for(state: &SyncState, vault_path: &str) -> Result<IdentityProof, String> {
	ensure_identity_cached(state, vault_path)?;
	let guard = state
		.identity
		.lock()
		.map_err(|e| format!("identity lock poisoned: {e}"))?;
	let id = guard
		.as_ref()
		.ok_or_else(|| "identity cache empty after ensure".to_string())?;
	Ok(id.identity_proof())
}

/// Loads (or creates) the device identity for `vault_path` and
/// returns its fingerprint surfaces.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root.
///
/// Side effects: caches the loaded identity in `state.identity`,
/// overwriting any previous value. Creates
/// `<vault_path>/.kokobrain/identity.key` on first call.
///
/// Errors when the parent directory cannot be created, the key file
/// has wrong length, or the disk write fails. Each is surfaced as a
/// human-readable `String`.
#[tauri::command]
pub async fn lan_sync_get_my_fingerprint<R: Runtime>(
	_app: AppHandle<R>,
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
) -> Result<MyFingerprintPayload, String> {
	ensure_identity_cached(state.inner(), &vault_path)
}

/// Toggles whether the local vault is discoverable over mDNS AND
/// whether the local TCP accept loop is bound to [`ANNOUNCE_PORT`].
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root. Used to load
///   the per-vault identity when the cache is empty.
/// - `enabled` — `true` starts the announcer + accept loop, `false`
///   stops both.
///
/// Side effects: writes to `state.announcer` and
/// `state.tcp_accept_handle`. Idempotent — calling twice with the same
/// `enabled` value is a no-op when the corresponding slots are already
/// in their target state.
///
/// Errors when starting the announcer fails (no local IP, mDNS daemon
/// error), binding the TCP listener fails (port in use), or stopping
/// fails (daemon already gone).
#[tauri::command]
pub async fn lan_sync_set_discoverable<R: Runtime>(
	app: AppHandle<R>,
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
	enabled: bool,
) -> Result<(), String> {
	if enabled {
		// If the announcer is already running but for a DIFFERENT
		// vault (vault-switch case), tear it down so we restart with
		// the new vault's identity. Without this the previous vault's
		// fingerprint would keep broadcasting over mDNS even though
		// the user has moved on to a new vault.
		let needs_restart = {
			let av = state
				.announcer_vault
				.lock()
				.map_err(|e| format!("announcer_vault lock poisoned: {e}"))?;
			let an = state
				.announcer
				.lock()
				.map_err(|e| format!("announcer lock poisoned: {e}"))?;
			an.is_some() && av.as_deref() != Some(vault_path.as_str())
		};
		if needs_restart {
			stop_announce_and_accept(state.inner())?;
		}

		// Idempotent fast path: announcer already running for THIS vault.
		{
			let an = state
				.announcer
				.lock()
				.map_err(|e| format!("announcer lock poisoned: {e}"))?;
			if an.is_some() {
				return Ok(());
			}
		}

		// Bind the TCP listener FIRST so a port-in-use failure does
		// not leave the announcer registered without an accept loop
		// (audit #7 — peers would see the mDNS record but every
		// connect would be refused at the OS level).
		let listener = tokio::net::TcpListener::bind(("0.0.0.0", ANNOUNCE_PORT))
			.await
			.map_err(|e| format!("bind tcp: {e}"))?;

		// Start the announcer next. On failure, returning Err drops
		// `listener` here (its `Drop` closes the bound socket) so the
		// port is released before the caller sees the error.
		let fp_hex = fingerprint_hex_for(state.inner(), &vault_path)?;
		let announcer = match Announcer::start(&fp_hex, ANNOUNCE_PORT) {
			Ok(a) => a,
			Err(e) => return Err(format!("announce: {e}")),
		};

		// Spawn the accept loop now that both pieces are ready.
		let state_clone: Arc<SyncState> = state.inner().clone();
		let app_clone = app.clone();
		let vault_clone = vault_path.clone();
		let handle = tokio::spawn(async move {
			loop {
				let accept_result = listener.accept().await;
				let (stream, sock_addr) = match accept_result {
					Ok(pair) => pair,
					Err(e) => {
						eprintln!("[lan-sync] tcp accept failed: {e}");
						continue;
					}
				};
				let state_for_conn = state_clone.clone();
				let app_for_conn = app_clone.clone();
				let vault_for_conn = PathBuf::from(&vault_clone);
				tokio::spawn(async move {
					if let Err(e) =
						drive_inbound(app_for_conn, state_for_conn, vault_for_conn, stream, sock_addr)
							.await
					{
						eprintln!("[lan-sync] inbound dispatch failed: {e}");
					}
				});
			}
		});

		// Commit announcer + accept handle + vault tag atomically.
		{
			let mut an = state
				.announcer
				.lock()
				.map_err(|e| format!("announcer lock poisoned: {e}"))?;
			let mut ah = state
				.tcp_accept_handle
				.lock()
				.map_err(|e| format!("accept handle lock poisoned: {e}"))?;
			let mut av = state
				.announcer_vault
				.lock()
				.map_err(|e| format!("announcer_vault lock poisoned: {e}"))?;
			if let Some(prev) = ah.take() {
				prev.abort();
			}
			*an = Some(announcer);
			*ah = Some(handle);
			*av = Some(vault_path);
		}
		Ok(())
	} else {
		stop_announce_and_accept(state.inner())
	}
}

/// Tears down the running announcer + TCP accept loop and clears the
/// `announcer_vault` tag. Used by [`lan_sync_set_discoverable`] when
/// the user disables discoverable AND when a vault switch forces a
/// restart. Attempts both `stop()` and `abort()` regardless of which
/// one errors first so neither side leaks on a partial failure
/// (audit #6).
fn stop_announce_and_accept(state: &SyncState) -> Result<(), String> {
	let announcer = {
		let mut guard = state
			.announcer
			.lock()
			.map_err(|e| format!("announcer lock poisoned: {e}"))?;
		guard.take()
	};
	let accept = {
		let mut guard = state
			.tcp_accept_handle
			.lock()
			.map_err(|e| format!("accept handle lock poisoned: {e}"))?;
		guard.take()
	};
	{
		let mut guard = state
			.announcer_vault
			.lock()
			.map_err(|e| format!("announcer_vault lock poisoned: {e}"))?;
		*guard = None;
	}

	let mut errs: Vec<String> = Vec::new();
	if let Some(a) = announcer {
		if let Err(e) = a.stop() {
			errs.push(format!("unannounce: {e}"));
		}
	}
	if let Some(h) = accept {
		// `JoinHandle::abort` cannot fail; it just signals the task.
		h.abort();
	}

	if errs.is_empty() {
		Ok(())
	} else {
		Err(errs.join("; "))
	}
}

/// Runs the inbound-handshake + dispatch for one accepted TCP socket.
/// Wraps `transport::accept` (always-allow predicate) followed by
/// `dispatch::handle_inbound_connection`. Used by the accept loop in
/// [`lan_sync_set_discoverable`].
async fn drive_inbound<R: Runtime>(
	app: AppHandle<R>,
	state: Arc<SyncState>,
	vault_path: PathBuf,
	stream: tokio::net::TcpStream,
	sock_addr: std::net::SocketAddr,
) -> Result<(), String> {
	// Load the responder's static keys + identity proof.
	let vault_str = vault_path
		.to_str()
		.ok_or_else(|| "vault_path must be UTF-8".to_string())?;
	let keys = static_keys_for(&state, vault_str)?;
	let my_proof = identity_proof_for(&state, vault_str)?;

	let session = transport::accept(stream, &keys, &my_proof, |_remote_fp| true)
		.await
		.map_err(|e| format!("accept handshake: {e}"))?;

	dispatch::handle_inbound_connection(
		app,
		state,
		vault_path,
		session,
		sock_addr.ip().to_string(),
		sock_addr.port(),
	)
	.await
	.map_err(|e| format!("dispatch: {e}"))
}

/// Starts the mDNS browser for the LAN sync service type.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root, used to load
///   the local identity for self-loopback filtering.
///
/// Side effects: writes to `state.browser`. No-op when a browser is
/// already running (the existing slot wins). Each fresh discovery
/// emits an `lan-sync:peer-discovered` event via
/// [`events::emit_peer_discovered`] AND inserts the peer's
/// `(addr, port)` into `state.last_seen_addrs` so the push command
/// can locate the socket later.
///
/// Errors when starting the daemon fails or the consumer thread
/// cannot be spawned.
#[tauri::command]
pub async fn lan_sync_start_browse<R: Runtime>(
	app: AppHandle<R>,
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
) -> Result<(), String> {
	// Vault-switch handling: if a browser is running but its filter
	// fingerprint was computed against a different vault, tear it
	// down before starting a fresh one (audit #10). Without this the
	// self-loopback filter compares against the previous vault's
	// fingerprint, so the new vault sees its OWN announcements in
	// the discovered list.
	let needs_restart = {
		let bv = state
			.browser_vault
			.lock()
			.map_err(|e| format!("browser_vault lock poisoned: {e}"))?;
		let br = state
			.browser
			.lock()
			.map_err(|e| format!("browser lock poisoned: {e}"))?;
		br.is_some() && bv.as_deref() != Some(vault_path.as_str())
	};
	if needs_restart {
		stop_browse_inner(state.inner())?;
	}

	{
		let guard = state
			.browser
			.lock()
			.map_err(|e| format!("browser lock poisoned: {e}"))?;
		if guard.is_some() {
			return Ok(());
		}
	}
	let fp_hex = fingerprint_hex_for(state.inner(), &vault_path)?;
	let app_for_cb = app.clone();
	let state_for_cb: Arc<SyncState> = state.inner().clone();
	let browser = Browser::start(fp_hex, move |payload| {
		// Cache the address so a later push can locate the peer.
		if let Ok(mut map) = state_for_cb.last_seen_addrs.lock() {
			map.insert(
				payload.fingerprint_hex.clone(),
				(payload.addr.clone(), payload.port),
			);
		}
		if let Err(e) = events::emit_peer_discovered(&app_for_cb, &payload) {
			eprintln!("[lan-sync] emit peer-discovered failed: {e}");
		}
	})
	.map_err(|e| format!("browse: {e}"))?;
	{
		let mut guard = state
			.browser
			.lock()
			.map_err(|e| format!("browser lock poisoned: {e}"))?;
		if guard.is_some() {
			if let Err(e) = browser.stop() {
				eprintln!("[lan-sync] dropped duplicate browser stop: {e}");
			}
			return Ok(());
		}
		*guard = Some(browser);
	}
	{
		let mut bv = state
			.browser_vault
			.lock()
			.map_err(|e| format!("browser_vault lock poisoned: {e}"))?;
		*bv = Some(vault_path);
	}
	Ok(())
}

/// Tears down the running browser and clears the `browser_vault`
/// tag. Used by [`lan_sync_stop_browse`] AND by
/// [`lan_sync_start_browse`] when a vault switch forces a restart.
fn stop_browse_inner(state: &SyncState) -> Result<(), String> {
	let taken = {
		let mut guard = state
			.browser
			.lock()
			.map_err(|e| format!("browser lock poisoned: {e}"))?;
		guard.take()
	};
	{
		let mut bv = state
			.browser_vault
			.lock()
			.map_err(|e| format!("browser_vault lock poisoned: {e}"))?;
		*bv = None;
	}
	if let Some(browser) = taken {
		browser.stop().map_err(|e| format!("stop browse: {e}"))?;
	}
	Ok(())
}

/// Stops the mDNS browser.
///
/// Side effects: takes the value out of `state.browser` and calls
/// `Browser::stop`. No-op when no browser is running.
#[tauri::command]
pub async fn lan_sync_stop_browse(state: State<'_, Arc<SyncState>>) -> Result<(), String> {
	stop_browse_inner(state.inner())
}

/// Loads the per-vault trust store and returns its current contents.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root.
///
/// Returns an empty vector when the file does not exist yet (a
/// brand-new vault has trusted no one). Records with an invalid
/// `public_key_b64` (wrong length, non-base64) are silently skipped
/// by `trust::load`.
///
/// Errors propagate from `trust::load` as their `to_string`.
#[tauri::command]
pub async fn lan_sync_list_trusted_peers(vault_path: String) -> Result<Vec<TrustedPeer>, String> {
	trust::load(std::path::Path::new(&vault_path)).map_err(|e| e.to_string())
}

/// Removes a single peer from the trust store and returns the
/// updated list.
///
/// Inputs:
/// - `vault_path` — absolute path to the vault root.
/// - `fingerprint_hex` — stable primary key of the peer to remove.
///
/// No-op when no entry matches (the file is still re-written to
/// preserve the atomic-rename invariant).
///
/// Errors propagate from `trust::remove` as their `to_string`.
#[tauri::command]
pub async fn lan_sync_remove_trusted_peer(
	vault_path: String,
	fingerprint_hex: String,
) -> Result<Vec<TrustedPeer>, String> {
	trust::remove(std::path::Path::new(&vault_path), &fingerprint_hex)
		.map_err(|e| e.to_string())
}

/// Initiator-side pair command.
///
/// Opens a TCP connection to `peer_addr:peer_port`, runs Noise XX,
/// verifies the peer's Ed25519 identity matches
/// `peer_fingerprint_hex`, sends `PeerHandshake { intent: "pair" }`,
/// and awaits the remote's `PairResponse`. On `accepted=true` the
/// peer is written to `peers.json` and `peer-trusted` is emitted.
///
/// The local user opts in implicitly by invoking this command (e.g.
/// clicking "Pair" in the discovered-peers list); there is no
/// separate `accept` parameter here. The responder side runs through
/// [`lan_sync_respond_to_pair`] instead.
///
/// Errors when the connection cannot be established, the Noise
/// handshake rejects the peer, the remote returns
/// `accepted=false`, or the trust-store write fails.
#[tauri::command]
pub async fn lan_sync_pair_with_peer<R: Runtime>(
	app: AppHandle<R>,
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
	peer_addr: String,
	peer_port: u16,
	peer_fingerprint_hex: String,
) -> Result<TrustedPeer, String> {
	initiate_pair(
		app,
		state,
		vault_path,
		peer_addr,
		peer_port,
		peer_fingerprint_hex,
	)
	.await
}

/// Responder-side pair command.
///
/// Called from the `PairingPrompt` modal after the local user has
/// confirmed (or rejected) an inbound pair request. Pulls the
/// pending session matching `request_id` out of
/// `state.pending_pair_sessions`, signals the dispatcher task with
/// the user's decision, and (on accept) writes the peer to
/// `peers.json` + emits `peer-trusted`.
///
/// Inputs:
/// - `vault_path` — absolute path to the local vault root.
/// - `request_id` — correlation id from the
///   `lan-sync:pairing-incoming` event payload.
/// - `accept` — `true` accepts the pair, `false` rejects.
///
/// Returns `Some(TrustedPeer)` on accept, `None` on reject. Errors
/// when no pending entry matches `request_id` (e.g. the inbound
/// session timed out before the user clicked).
#[tauri::command]
pub async fn lan_sync_respond_to_pair<R: Runtime>(
	app: AppHandle<R>,
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
	request_id: String,
	accept: bool,
) -> Result<Option<TrustedPeer>, String> {
	respond_to_pair(app, state, vault_path, request_id, accept).await
}

/// Inner respond-mode implementation. Private so the public command
/// surface stays explicit about which side of the pair flow it
/// handles. Takes `request_id` (the pending entry key) and `accept`
/// (the user's decision).
async fn respond_to_pair<R: Runtime>(
	app: AppHandle<R>,
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
	request_id: String,
	accept: bool,
) -> Result<Option<TrustedPeer>, String> {
	let entry = {
		let mut map = state.pending_pair_sessions.lock().await;
		map.remove(&request_id)
	};
	let entry = match entry {
		Some(e) => e,
		None => {
			return Err(format!("no pending pair request with id {request_id}"));
		}
	};

	// On accept: write the peer to the trust store FIRST so the
	// `peer-trusted` event reflects committed state. Then signal the
	// dispatcher so it sends the wire ack.
	let outcome = if accept {
		let peer = TrustedPeer {
			fingerprint_hex: entry.remote_fingerprint_hex.clone(),
			fingerprint_display: entry.remote_fingerprint_display.clone(),
			public_key_b64: entry.remote_public_key_b64.clone(),
			display_name: None,
			trusted_at_ms: now_unix_ms(),
		};
		trust::upsert(std::path::Path::new(&vault_path), peer.clone())
			.map_err(|e| format!("trust upsert: {e}"))?;
		if let Err(e) = events::emit_peer_trusted(
			&app,
			&PeerTrustedPayload {
				fingerprint_hex: peer.fingerprint_hex.clone(),
				fingerprint_display: peer.fingerprint_display.clone(),
				public_key_b64: peer.public_key_b64.clone(),
				display_name: peer.display_name.clone(),
				trusted_at_ms: peer.trusted_at_ms,
			},
		) {
			eprintln!("[lan-sync] emit peer-trusted failed: {e}");
		}
		Some(peer)
	} else {
		None
	};

	if let Some(tx) = entry.responder {
		// Best-effort signal; if the dispatcher already gave up, the
		// outcome on disk is still correct.
		let _ = tx.send(accept);
	}

	Ok(outcome)
}

/// Inner initiator-mode implementation. Private so the public
/// command surface stays explicit about which side of the pair flow
/// it handles. Opens the TCP connection, runs the handshake, and on
/// remote-accept writes the peer to the trust store. Returns the
/// `TrustedPeer` that was persisted, or an error when the remote
/// rejects or any handshake step fails.
async fn initiate_pair<R: Runtime>(
	app: AppHandle<R>,
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
	peer_addr: String,
	peer_port: u16,
	peer_fingerprint_hex: String,
) -> Result<TrustedPeer, String> {
	let keys = static_keys_for(state.inner(), &vault_path)?;
	let my_proof = identity_proof_for(state.inner(), &vault_path)?;
	let my_fp_display = {
		let guard = state
			.identity
			.lock()
			.map_err(|e| format!("identity lock poisoned: {e}"))?;
		guard
			.as_ref()
			.map(|id| id.fingerprint_display())
			.unwrap_or_default()
	};

	let stream = tokio::net::TcpStream::connect((peer_addr.as_str(), peer_port))
		.await
		.map_err(|e| format!("connect {peer_addr}:{peer_port}: {e}"))?;
	let mut session = open_to(stream, &keys, &my_proof, &peer_fingerprint_hex)
		.await
		.map_err(|e| format!("handshake: {e}"))?;

	// Send the handshake envelope.
	let envelope = PeerHandshake {
		intent: INTENT_PAIR.to_string(),
		fingerprint_display: my_fp_display,
	};
	let envelope_bytes =
		serde_json::to_vec(&envelope).map_err(|e| format!("encode handshake: {e}"))?;
	session
		.send(&envelope_bytes)
		.await
		.map_err(|e| format!("send handshake: {e}"))?;

	// Await the response.
	let response_bytes = session
		.recv()
		.await
		.map_err(|e| format!("recv response: {e}"))?;
	let response: dispatch::PairResponse =
		serde_json::from_slice(&response_bytes).map_err(|e| format!("decode response: {e}"))?;

	if !response.accepted {
		return Err(format!(
			"pair not accepted by remote{}",
			response
				.reason
				.map(|r| format!(": {r}"))
				.unwrap_or_default()
		));
	}

	// Build the trusted peer record from the verified remote Ed25519
	// public key. `open_to` already enforced that
	// `session.remote_ed25519_fingerprint_hex()` equals
	// `peer_fingerprint_hex` (it would otherwise have returned
	// IdentityRejected), so the equality re-check here is a defensive
	// sanity guard rather than a security boundary.
	let derived_hex = session.remote_ed25519_fingerprint_hex();
	if derived_hex != peer_fingerprint_hex {
		return Err(format!(
			"post-handshake fingerprint mismatch: derived {derived_hex}, expected {peer_fingerprint_hex}"
		));
	}
	let remote_ed_pub = session.remote_ed25519_pub();
	let peer = TrustedPeer {
		fingerprint_hex: derived_hex.clone(),
		fingerprint_display: crate::sync::discovery::fingerprint_display_from_hex(&derived_hex),
		public_key_b64: BASE64.encode(remote_ed_pub),
		display_name: None,
		trusted_at_ms: now_unix_ms(),
	};
	trust::upsert(std::path::Path::new(&vault_path), peer.clone())
		.map_err(|e| format!("trust upsert: {e}"))?;
	if let Err(e) = events::emit_peer_trusted(
		&app,
		&PeerTrustedPayload {
			fingerprint_hex: peer.fingerprint_hex.clone(),
			fingerprint_display: peer.fingerprint_display.clone(),
			public_key_b64: peer.public_key_b64.clone(),
			display_name: peer.display_name.clone(),
			trusted_at_ms: peer.trusted_at_ms,
		},
	) {
		eprintln!("[lan-sync] emit peer-trusted failed: {e}");
	}
	Ok(peer)
}

/// Pushes a folder from the local vault to a trusted peer.
///
/// Inputs:
/// - `vault_path` — absolute path to the local vault root.
/// - `peer_fingerprint_hex` — stable primary key of the destination
///   peer; must already be in `peers.json`.
/// - `source_rel_path` — folder inside the local vault to send
///   (relative to `vault_path`, never absolute).
/// - `target_rel_path` — destination inside the remote vault.
///
/// Side effects: opens a Noise XX session to the peer's last-known
/// `(addr, port)` (from `state.last_seen_addrs`, populated by the
/// browser). Emits `lan-sync:push-progress` periodically and a final
/// `lan-sync:push-complete` regardless of outcome.
///
/// Errors when the peer is not trusted, has not been discovered
/// recently, the TCP connect / Noise handshake fails, or the push
/// engine returns an error.
#[tauri::command]
pub async fn lan_sync_push_folder<R: Runtime>(
	app: AppHandle<R>,
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
	peer_fingerprint_hex: String,
	source_rel_path: String,
	target_rel_path: String,
) -> Result<(), String> {
	// 0. Sender-side path validation. Runs BEFORE network I/O so a
	//    malformed call from the UI fails fast with a clear reason
	//    and never reaches the trust store, the discovery cache, or
	//    the Noise handshake. Layered defense:
	//    - lexical: reject absolute / drive-letter / `..` paths
	//      (`push::validate_sender_*`).
	//    - exclusion: reject `.kokobrain`, `.git`, `node_modules`,
	//      and any hidden-name component, so a user cannot send the
	//      local metadata dir (identity.key, peers.json, …).
	//    - canonical containment: after joining `vault_path` with the
	//      validated source rel-path, the canonical result must
	//      `starts_with` the canonical vault root. Catches symlinked
	//      escapes that lexical layer-1 misses.
	crate::sync::push::validate_sender_source_rel_path(&source_rel_path)
		.map_err(|e| format!("invalid source path '{source_rel_path}': {e}"))?;
	crate::sync::push::validate_sender_target_rel_path(&target_rel_path)
		.map_err(|e| format!("invalid target path '{target_rel_path}': {e}"))?;

	let source_abs_path = std::path::Path::new(&vault_path).join(&source_rel_path);
	let canonical_vault = std::path::Path::new(&vault_path)
		.canonicalize()
		.map_err(|e| format!("canonicalize vault '{vault_path}': {e}"))?;
	let canonical_source = source_abs_path
		.canonicalize()
		.map_err(|e| format!("canonicalize source '{}': {e}", source_abs_path.display()))?;
	if !canonical_source.starts_with(&canonical_vault) {
		return Err(format!(
			"source path '{source_rel_path}' resolves outside the vault root"
		));
	}

	// 1. Verify peer is in the trust store.
	let peers = trust::load(std::path::Path::new(&vault_path))
		.map_err(|e| format!("load peers: {e}"))?;
	if !peers
		.iter()
		.any(|p| p.fingerprint_hex == peer_fingerprint_hex)
	{
		return Err(format!("peer {peer_fingerprint_hex} not trusted"));
	}

	// 2. Look up the peer's last-known socket from the browser cache.
	let (addr, port) = {
		let map = state
			.last_seen_addrs
			.lock()
			.map_err(|e| format!("last_seen_addrs lock poisoned: {e}"))?;
		map.get(&peer_fingerprint_hex)
			.cloned()
			.ok_or_else(|| {
				format!("peer {peer_fingerprint_hex} not discovered (toggle browse on first)")
			})?
	};

	// 3. Open Noise XX to the peer.
	let keys = static_keys_for(state.inner(), &vault_path)?;
	let my_proof = identity_proof_for(state.inner(), &vault_path)?;
	let my_fp_display = {
		let guard = state
			.identity
			.lock()
			.map_err(|e| format!("identity lock poisoned: {e}"))?;
		guard
			.as_ref()
			.map(|id| id.fingerprint_display())
			.unwrap_or_default()
	};
	let stream = tokio::net::TcpStream::connect((addr.as_str(), port))
		.await
		.map_err(|e| format!("connect {addr}:{port}: {e}"))?;
	let mut session = open_to(stream, &keys, &my_proof, &peer_fingerprint_hex)
		.await
		.map_err(|e| format!("handshake: {e}"))?;

	// 4. Send the routing envelope (intent: "push").
	let envelope = PeerHandshake {
		intent: INTENT_PUSH.to_string(),
		fingerprint_display: my_fp_display,
	};
	let envelope_bytes =
		serde_json::to_vec(&envelope).map_err(|e| format!("encode handshake: {e}"))?;
	session
		.send(&envelope_bytes)
		.await
		.map_err(|e| format!("send handshake: {e}"))?;

	// 5. Read the responder's ack/reject.
	let response_bytes = session
		.recv()
		.await
		.map_err(|e| format!("recv push ack: {e}"))?;
	let response: dispatch::PairResponse = serde_json::from_slice(&response_bytes)
		.map_err(|e| format!("decode push ack: {e}"))?;
	if !response.accepted {
		let reason = response.reason.unwrap_or_else(|| "rejected".into());
		// Emit a final push-complete with the error so the UI knows.
		let _ = events::emit_push_complete(
			&app,
			&PushCompletePayload {
				peer_fingerprint: peer_fingerprint_hex.clone(),
				files_transferred: 0,
				error: Some(reason.clone()),
			},
		);
		return Err(format!("push refused: {reason}"));
	}

	// 6. Plan and send.
	let source_abs = PathBuf::from(&vault_path).join(&source_rel_path);
	let plan = plan_push(&source_abs).map_err(|e| format!("plan push: {e}"))?;
	let files_total = plan.files.len() as u64;
	let bytes_total = plan.total_bytes;

	let app_for_progress = app.clone();
	let peer_fp_for_progress = peer_fingerprint_hex.clone();
	let on_progress = move |bytes_done: u64, files_done: u64| {
		let payload = PushProgressPayload {
			peer_fingerprint: peer_fp_for_progress.clone(),
			files_done,
			files_total,
			bytes_done,
			bytes_total,
		};
		if let Err(e) = events::emit_push_progress(&app_for_progress, &payload) {
			eprintln!("[lan-sync] emit push-progress failed: {e}");
		}
	};

	let send_result =
		send_folder(&mut session, &source_abs, &target_rel_path, &plan, on_progress).await;

	// 7. Emit final push-complete with success/failure.
	let complete = match &send_result {
		Ok(files_transferred) => PushCompletePayload {
			peer_fingerprint: peer_fingerprint_hex.clone(),
			files_transferred: *files_transferred,
			error: None,
		},
		Err(e) => PushCompletePayload {
			peer_fingerprint: peer_fingerprint_hex.clone(),
			files_transferred: 0,
			error: Some(e.to_string()),
		},
	};
	if let Err(e) = events::emit_push_complete(&app, &complete) {
		eprintln!("[lan-sync] emit push-complete failed: {e}");
	}

	send_result.map(|_| ()).map_err(|e| format!("send: {e}"))
}

/// Returns the current wall-clock time as Unix epoch milliseconds.
/// Used to stamp `TrustedPeer::trusted_at_ms` on pair-accept paths.
fn now_unix_ms() -> u64 {
	use std::time::{SystemTime, UNIX_EPOCH};
	SystemTime::now()
		.duration_since(UNIX_EPOCH)
		.map(|d| d.as_millis() as u64)
		.unwrap_or(0)
}

/// Re-encodes a public key to base64. Kept private so the trust
/// store stays the single source of truth for serialisation.
#[allow(dead_code)]
pub(crate) fn encode_public_key(bytes: &[u8]) -> String {
	BASE64.encode(bytes)
}

/// Returns a diagnostic snapshot of the LAN sync runtime for
/// `vault_path`.
///
/// Used to triage discovery failures: surfaces the local fingerprint,
/// every local IPv4 interface (so we can confirm whether the
/// announcer's `enable_addr_auto` had the right interface to bind),
/// whether the announcer + browser are currently running, and the
/// last-seen address map populated by the browser callback.
///
/// Errors propagate from `local_ip_address::list_afinet_netifas`
/// (interface enumeration) and the underlying state locks.
#[tauri::command]
pub async fn lan_sync_debug_dump(
	state: State<'_, Arc<SyncState>>,
	vault_path: String,
) -> Result<LanSyncDebugDump, String> {
	let fp = ensure_identity_cached(state.inner(), &vault_path)?;

	let mut local_ipv4_addresses: Vec<LanSyncDebugInterface> = Vec::new();
	match local_ip_address::list_afinet_netifas() {
		Ok(list) => {
			for (name, ip) in list {
				if let std::net::IpAddr::V4(v4) = ip {
					if v4.is_loopback() {
						continue;
					}
					local_ipv4_addresses.push(LanSyncDebugInterface {
						name,
						addr: v4.to_string(),
					});
				}
			}
		}
		Err(e) => return Err(format!("list interfaces: {e}")),
	}

	let announcer_running = state
		.announcer
		.lock()
		.map_err(|e| format!("announcer lock poisoned: {e}"))?
		.is_some();
	let browser_running = state
		.browser
		.lock()
		.map_err(|e| format!("browser lock poisoned: {e}"))?
		.is_some();

	let last_seen_addrs = {
		let guard = state
			.last_seen_addrs
			.lock()
			.map_err(|e| format!("last_seen_addrs lock poisoned: {e}"))?;
		let mut out: Vec<LanSyncDebugLastSeen> = guard
			.iter()
			.map(|(fp_hex, (addr, port))| LanSyncDebugLastSeen {
				fingerprint_hex: fp_hex.clone(),
				addr: addr.clone(),
				port: *port,
			})
			.collect();
		out.sort_by(|a, b| a.fingerprint_hex.cmp(&b.fingerprint_hex));
		out
	};

	Ok(LanSyncDebugDump {
		fingerprint_hex: fp.fingerprint_hex,
		fingerprint_display: fp.fingerprint_display,
		local_ipv4_addresses,
		announcer_running,
		browser_running,
		last_seen_addrs,
	})
}
