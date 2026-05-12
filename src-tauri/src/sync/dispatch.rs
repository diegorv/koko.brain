//! Per-connection dispatch for inbound LAN sync TCP sessions.
//!
//! After [`crate::sync::transport::accept`] finishes a Noise XX handshake
//! on an inbound TCP stream, the resulting [`Session`] is handed to
//! [`handle_inbound_connection`]. The handler reads one
//! [`PeerHandshake`] envelope, then routes to one of two flows:
//!
//! 1. `intent == "pair"`: register a [`PendingPairEntry`] in
//!    [`crate::sync::SyncState::pending_pair_sessions`], emit
//!    `lan-sync:pairing-incoming` so the local UI can prompt the user,
//!    and block on the oneshot from
//!    [`crate::commands::sync::lan_sync_pair_with_peer`] (respond mode).
//!    On accept the dispatcher sends a
//!    [`PairResponse { accepted: true }`], on reject it sends
//!    [`PairResponse { accepted: false }`] and closes.
//!
//! 2. `intent == "push"`: confirm the remote fingerprint is present in
//!    `peers.json`. If trusted, drive
//!    [`crate::sync::push::receive_folder`] and emit
//!    `lan-sync:push-progress` + `lan-sync:push-complete`. Otherwise
//!    send a [`PairResponse { accepted: false, reason: "not trusted" }`]
//!    and close.
//!
//! Extracted into its own module so tests can drive the dispatch over
//! `tokio::io::duplex` streams instead of real TCP. The handler is
//! generic over the underlying stream `S: AsyncRead + AsyncWrite +
//! Unpin + Send`.

use std::path::PathBuf;
use std::sync::Arc;

use serde::{Deserialize, Serialize};
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::sync::oneshot;

use crate::sync::events::{
	emit_pairing_incoming, emit_push_complete, emit_push_progress, PairingIncomingPayload,
	PushCompletePayload, PushProgressPayload,
};
use crate::sync::push::{receive_folder, PushError};
use crate::sync::transport::{fingerprint_hex_from_static, Session, TransportError};
use crate::sync::trust;
use crate::sync::SyncState;

/// Handshake envelope sent by the initiator immediately after the Noise
/// XX handshake completes. The single field that drives routing is
/// `intent`.
///
/// `intent` is one of:
/// - `"pair"` — request user-confirmed TOFU pairing.
/// - `"push"` — already-trusted peer wants to push a folder.
///
/// `fingerprint_display` is the initiator's own six-word fingerprint;
/// carried so the inbound UI can show it before the recipient has had
/// a chance to derive it from the remote static key. Verified against
/// the actual derived value before being shown to the user — a remote
/// supplying a different string than its real fingerprint is treated
/// as a protocol error (see [`DispatchError::FingerprintLie`]).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeerHandshake {
	/// Routing intent. Either `"pair"` or `"push"`; any other value is
	/// rejected as a protocol error.
	pub intent: String,
	/// Initiator's own six-word fingerprint display, supplied for the
	/// UI prompt on the responder side. Validated against the derived
	/// form before use.
	pub fingerprint_display: String,
}

/// Single-message reply to a [`PeerHandshake`]. Sent by the responder
/// at the end of pairing (after the user accepts / rejects) or as a
/// short-circuit rejection for unwanted push attempts.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairResponse {
	/// `true` when the responder accepts the action (pair or push),
	/// `false` when it refuses.
	pub accepted: bool,
	/// Optional human-readable explanation when `accepted=false`.
	#[serde(skip_serializing_if = "Option::is_none")]
	pub reason: Option<String>,
}

/// Tag for the well-known pairing intent value.
pub const INTENT_PAIR: &str = "pair";

/// Tag for the well-known push intent value.
pub const INTENT_PUSH: &str = "push";

/// Live pending-pair record stored under
/// [`SyncState::pending_pair_sessions`] while the local user has not
/// yet accepted / rejected an inbound pair.
///
/// The session itself stays owned by the dispatcher task — there is no
/// shared `Session` here. The respond-side command communicates with
/// the dispatcher via the [`oneshot::Sender`] in `responder`.
pub struct PendingPairEntry {
	/// Oneshot channel the respond-side command pings with `true`
	/// (accept) or `false` (reject). Wrapped in `Option` so the
	/// command can `take()` it under the lock without poisoning the
	/// whole map.
	pub responder: Option<oneshot::Sender<bool>>,
	/// Stable hex fingerprint of the remote peer.
	pub remote_fingerprint_hex: String,
	/// Six-word fingerprint display of the remote peer (derived from
	/// the remote static key; matches what the initiator showed).
	pub remote_fingerprint_display: String,
	/// Base64-encoded X25519 static public key of the remote peer.
	/// Persisted to `peers.json` on accept.
	pub remote_public_key_b64: String,
	/// LAN address the inbound TCP connection arrived from.
	pub remote_addr: String,
	/// TCP port of the inbound socket.
	pub remote_port: u16,
}

/// Errors that can surface from [`handle_inbound_connection`]. Each
/// variant maps to a human-readable string for logging — there is no
/// frontend-facing surface (the command shim already handles its own
/// errors).
#[derive(Debug)]
pub enum DispatchError {
	/// Transport-layer failure during the handshake-envelope exchange.
	Transport(TransportError),
	/// JSON decode of the [`PeerHandshake`] failed.
	Serde(serde_json::Error),
	/// Generic I/O error while loading the trust store.
	Io(std::io::Error),
	/// Push-engine error surfaced from [`receive_folder`].
	Push(PushError),
	/// Remote announced an `intent` we don't recognise.
	UnknownIntent(String),
	/// Remote's announced `fingerprint_display` does not match what
	/// we derive from its static key — refuse the connection.
	FingerprintLie {
		/// Display string the remote claimed.
		claimed: String,
		/// Display string derived from the actual static key.
		derived: String,
	},
	/// State lock was poisoned (a previous command panicked while
	/// holding it).
	StatePoisoned(String),
}

impl std::fmt::Display for DispatchError {
	fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
		match self {
			Self::Transport(e) => write!(f, "transport: {e}"),
			Self::Serde(e) => write!(f, "decode handshake: {e}"),
			Self::Io(e) => write!(f, "io: {e}"),
			Self::Push(e) => write!(f, "push: {e}"),
			Self::UnknownIntent(s) => write!(f, "unknown intent: {s:?}"),
			Self::FingerprintLie { claimed, derived } => write!(
				f,
				"remote claimed fingerprint {claimed:?} but derived {derived:?}"
			),
			Self::StatePoisoned(s) => write!(f, "state lock poisoned: {s}"),
		}
	}
}

impl std::error::Error for DispatchError {}

impl From<TransportError> for DispatchError {
	fn from(e: TransportError) -> Self {
		Self::Transport(e)
	}
}

impl From<serde_json::Error> for DispatchError {
	fn from(e: serde_json::Error) -> Self {
		Self::Serde(e)
	}
}

impl From<std::io::Error> for DispatchError {
	fn from(e: std::io::Error) -> Self {
		Self::Io(e)
	}
}

impl From<PushError> for DispatchError {
	fn from(e: PushError) -> Self {
		Self::Push(e)
	}
}

/// Drives a single accepted inbound session through pairing or push.
///
/// `session` is a fully-handshaked Noise XX session — both sides have
/// proven possession of their static keys. `vault_path` is the
/// absolute path to the vault whose `peers.json` the dispatcher should
/// consult on `intent: "push"` and update on accepted `intent: "pair"`.
///
/// `app` is used only to emit Tauri events (`lan-sync:pairing-incoming`,
/// `lan-sync:push-progress`, `lan-sync:push-complete`) and is therefore
/// generic over `R: tauri::Runtime` so tests can swap in a mock runtime.
/// `state` carries the shared `pending_pair_sessions` map.
///
/// On any error the function returns without closing the session
/// gracefully; the caller (an accept-loop task) drops the stream which
/// triggers an EOF on the initiator side.
pub async fn handle_inbound_connection<R, S>(
	app: tauri::AppHandle<R>,
	state: Arc<SyncState>,
	vault_path: PathBuf,
	mut session: Session<S>,
	remote_addr: String,
	remote_port: u16,
) -> Result<(), DispatchError>
where
	R: tauri::Runtime,
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	// 1. Read the routing envelope.
	let envelope_bytes = session.recv().await?;
	let handshake: PeerHandshake = serde_json::from_slice(&envelope_bytes)?;

	let remote_static = session.remote_static();
	let remote_fp_hex = fingerprint_hex_from_static(&remote_static);
	let remote_fp_display = crate::sync::discovery::fingerprint_display_from_hex(&remote_fp_hex);

	// Reject a peer that lies about its own display fingerprint — the
	// UI shows that string verbatim, so a mismatch could trick the user.
	if !handshake.fingerprint_display.is_empty()
		&& handshake.fingerprint_display != remote_fp_display
	{
		return Err(DispatchError::FingerprintLie {
			claimed: handshake.fingerprint_display,
			derived: remote_fp_display,
		});
	}

	match handshake.intent.as_str() {
		INTENT_PAIR => {
			handle_pair_intent(
				app,
				state,
				vault_path,
				&mut session,
				remote_fp_hex,
				remote_fp_display,
				remote_addr,
				remote_port,
			)
			.await
		}
		INTENT_PUSH => {
			handle_push_intent(
				app,
				vault_path,
				&mut session,
				remote_fp_hex,
			)
			.await
		}
		other => Err(DispatchError::UnknownIntent(other.to_string())),
	}
}

/// Pairing-intent path. Stashes a [`PendingPairEntry`] under the
/// shared state, emits `lan-sync:pairing-incoming`, then awaits the
/// respond-side oneshot. Sends the final [`PairResponse`] back over
/// the session.
async fn handle_pair_intent<R, S>(
	app: tauri::AppHandle<R>,
	state: Arc<SyncState>,
	_vault_path: PathBuf,
	session: &mut Session<S>,
	remote_fp_hex: String,
	remote_fp_display: String,
	remote_addr: String,
	remote_port: u16,
) -> Result<(), DispatchError>
where
	R: tauri::Runtime,
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let request_id = uuid::Uuid::new_v4().to_string();
	let (tx, rx) = oneshot::channel::<bool>();

	// Base64-encode the static key for trust-store storage.
	use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
	let remote_pubkey_b64 = BASE64.encode(session.remote_static());

	{
		let mut map = state
			.pending_pair_sessions
			.lock()
			.await;
		map.insert(
			request_id.clone(),
			PendingPairEntry {
				responder: Some(tx),
				remote_fingerprint_hex: remote_fp_hex.clone(),
				remote_fingerprint_display: remote_fp_display.clone(),
				remote_public_key_b64: remote_pubkey_b64,
				remote_addr: remote_addr.clone(),
				remote_port,
			},
		);
	}

	// Emit the prompt event so the local UI can pop a modal.
	let payload = PairingIncomingPayload {
		fingerprint_hex: remote_fp_hex.clone(),
		fingerprint_display: remote_fp_display,
		addr: remote_addr,
		port: remote_port,
		request_id: request_id.clone(),
	};
	if let Err(e) = emit_pairing_incoming(&app, &payload) {
		eprintln!("[lan-sync] emit pairing-incoming failed: {e}");
	}

	// Block until the respond-side command flips the oneshot. The
	// channel is dropped if the entry is removed without sending —
	// treat that as an implicit reject.
	let accepted = rx.await.unwrap_or(false);

	// Send the wire reply.
	let response = PairResponse { accepted, reason: None };
	let bytes = serde_json::to_vec(&response)?;
	session.send(&bytes).await?;

	// If the respond-side command never popped the entry (shouldn't
	// happen, but defensively), clean it up here.
	let mut map = state.pending_pair_sessions.lock().await;
	map.remove(&request_id);

	Ok(())
}

/// Push-intent path. Verifies the remote fingerprint against
/// `peers.json`. On match runs [`receive_folder`] with progress
/// callbacks; on mismatch sends a `PairResponse { accepted: false,
/// reason: "not trusted" }` and closes.
async fn handle_push_intent<R, S>(
	app: tauri::AppHandle<R>,
	vault_path: PathBuf,
	session: &mut Session<S>,
	remote_fp_hex: String,
) -> Result<(), DispatchError>
where
	R: tauri::Runtime,
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let peers = trust::load(&vault_path)?;
	let trusted = peers.iter().any(|p| p.fingerprint_hex == remote_fp_hex);
	if !trusted {
		let reject = PairResponse {
			accepted: false,
			reason: Some("not trusted".into()),
		};
		let bytes = serde_json::to_vec(&reject)?;
		// Best-effort send; if it fails the peer just sees a closed
		// stream which is also fine.
		let _ = session.send(&bytes).await;
		return Ok(());
	}

	// Trusted: ack and drive the receive engine.
	let ack = PairResponse { accepted: true, reason: None };
	let bytes = serde_json::to_vec(&ack)?;
	session.send(&bytes).await?;

	// Drive receive_folder with progress callbacks fanning into the
	// Tauri event bus. files_total / bytes_total are unknown to the
	// receive side up front (the push engine streams without
	// communicating the manifest totals to receive_folder's progress
	// callback — only `bytes_done, files_done`), so the totals fields
	// are set to 0 here; the UI just shows the running totals.
	let app_for_progress = app.clone();
	let peer_fp_for_progress = remote_fp_hex.clone();
	let on_progress = move |bytes_done: u64, files_done: u64| {
		let payload = PushProgressPayload {
			peer_fingerprint: peer_fp_for_progress.clone(),
			files_done,
			files_total: 0,
			bytes_done,
			bytes_total: 0,
		};
		if let Err(e) = emit_push_progress(&app_for_progress, &payload) {
			eprintln!("[lan-sync] emit push-progress failed: {e}");
		}
	};

	let result = receive_folder(session, &vault_path, on_progress).await;

	let complete = match &result {
		Ok(files_transferred) => PushCompletePayload {
			peer_fingerprint: remote_fp_hex.clone(),
			files_transferred: *files_transferred,
			error: None,
		},
		Err(e) => PushCompletePayload {
			peer_fingerprint: remote_fp_hex.clone(),
			files_transferred: 0,
			error: Some(e.to_string()),
		},
	};
	if let Err(e) = emit_push_complete(&app, &complete) {
		eprintln!("[lan-sync] emit push-complete failed: {e}");
	}

	result.map(|_| ()).map_err(DispatchError::Push)
}
