//! Long-running encrypted session driver. Operates on any
//! `AsyncRead + AsyncWrite + Unpin + Send` so it can be tested via
//! `tokio::io::duplex(...)` pairs and run live against a `TcpStream`
//! in Stage 5 without any changes here.
//!
//! Responsibilities (the only ones in scope for Stage 2):
//! 1. Drive the full transport handshake -
//!    `OpeningClient`/`OpeningServer` exchange, X25519 ECDH,
//!    `IdentityProof` round-trip, trust-store membership check.
//! 2. Establish the post-handshake [`SealedFrame`] cipher state
//!    ([`Sealer`] + [`Opener`]) via [`transport::finalize_handshake`].
//! 3. Run an idle Ping/Pong + outbound-channel pump so the session
//!    stays live and the watcher consumer (Stage 6) has a place to
//!    drop outbound [`AppMsg`]s.
//!
//! Out of scope for this stage and deliberately stubbed in the
//! inbound dispatch table:
//! - `Subscribe` / `Manifest` exchange (lands with Stage 5).
//! - `RequestBlock` / `BlockData` chunked transfer (Stage 5).
//! - `PushUpdate` / `Delete` / `PushRename` inbound apply
//!   (Stage 5 wires the SQLite + sync engine integration).
//! - `ListShares` / `SharesAvailable` (Stage 5).
//! Until those stages land, unknown `AppMsg` variants are logged
//! via `eprintln!` and discarded; the session keeps running so the
//! Stage 2 keepalive + lifecycle tests can exercise the driver
//! without exercising application protocol.

use std::time::Duration;

use ed25519_dalek::VerifyingKey;
use futures_util::sink::SinkExt;
use futures_util::stream::{SplitSink, StreamExt};
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::sync::mpsc;
use tokio::time;
use tokio_util::bytes::Bytes;
use tokio_util::codec::{Framed, LengthDelimitedCodec};
use x25519_dalek::PublicKey;

use crate::sync::events::{self, ConnectionState, ConnectionStatePayload};
use crate::sync::identity::{fingerprint_of, format_fingerprint, PeerIdentity};
use crate::sync::protocol::{
	decode_b64, decode_frame, encode_frame, AppMsg, HandshakeMsg, MAX_FRAME_SIZE,
};
use crate::sync::transport::{
	finalize_handshake, verify_identity_proof, ClientHandshake, EstablishedSession,
	SealedFrame, ServerHandshake, TransportError,
};

/// How often each side fires an idle `Ping` if the link has been
/// quiet. 30 s matches the value documented in the architecture
/// section of the live-wiring plan. The peer's `Pong` reply resets
/// the timer.
pub const KEEPALIVE_INTERVAL: Duration = Duration::from_secs(30);

/// Wall-clock window the local side allows between sending a `Ping`
/// and receiving the matching `Pong`. If the deadline passes the
/// session is closed with [`SessionError::KeepaliveTimeout`].
pub const KEEPALIVE_TIMEOUT: Duration = Duration::from_secs(60);

/// Capacity of the outbound MPSC channel handed to the watcher
/// consumer / future stages. Picked high enough that a single batch
/// of file-system events does not have to wait on TCP backpressure
/// for the producer to make progress.
pub const OUTBOUND_QUEUE_CAPACITY: usize = 64;

/// Errors surfaced from any phase of the session driver. The variants
/// map roughly onto the lifecycle stages so the caller can decide
/// whether to retry, ban the peer, or log + drop.
#[derive(Debug)]
pub enum SessionError {
	/// Underlying socket error during framing.
	Io(std::io::Error),
	/// Wire framing problem (length cap exceeded, JSON parse error).
	Framing(String),
	/// Transport-layer cryptographic failure (bad handshake bytes,
	/// version mismatch, unknown peer, bad signature, AEAD failure,
	/// nonce replay). Carries the typed transport error for the
	/// caller to dispatch on.
	Transport(TransportError),
	/// Peer closed the stream before the handshake completed.
	UnexpectedEof,
	/// Local side received an [`AppMsg::Error`] frame from the peer
	/// and is closing the connection.
	PeerSignaledError(String),
	/// The 60 s `KEEPALIVE_TIMEOUT` elapsed without a `Pong`.
	KeepaliveTimeout,
}

impl core::fmt::Display for SessionError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Io(e) => write!(f, "session io: {e}"),
			Self::Framing(s) => write!(f, "session framing: {s}"),
			Self::Transport(e) => write!(f, "session transport: {e}"),
			Self::UnexpectedEof => write!(f, "peer closed before handshake completed"),
			Self::PeerSignaledError(s) => write!(f, "peer signalled error: {s}"),
			Self::KeepaliveTimeout => write!(f, "keepalive timeout"),
		}
	}
}

impl std::error::Error for SessionError {}

impl From<std::io::Error> for SessionError {
	fn from(e: std::io::Error) -> Self {
		Self::Io(e)
	}
}

impl From<TransportError> for SessionError {
	fn from(e: TransportError) -> Self {
		Self::Transport(e)
	}
}

/// Things every running session needs that are not encoded in the
/// stream itself. Cloned freely; all fields are cheap.
pub struct SessionContext {
	/// Local long-term identity. The session signs the handshake
	/// transcript with this key and uses its fingerprint when
	/// emitting `connection-state` events. Cloned-by-reference is
	/// fine - identity holds an Ed25519 `SigningKey` that is
	/// not `Clone`, so the driver takes it by `&PeerIdentity`.
	pub identity_signing_fp: Option<tauri::AppHandle>,
}

/// Hand a `SessionContext` shaped struct to the driver. The
/// AppHandle is needed for emitting `connection-state` and (in
/// later stages) `share-progress` / `conflict-saved` /
/// `peer-blocked`. None disables emissions - useful in unit tests
/// that don't need a real AppHandle.
pub struct SessionHandles {
	pub app_handle: Option<tauri::AppHandle>,
	/// Receiver the watcher consumer (and future callers) push
	/// outbound [`AppMsg`]s into. The session loops in `select!`
	/// between this channel, the inbound frame stream, and the
	/// keepalive ticker.
	pub outbound_rx: mpsc::Receiver<AppMsg>,
}

/// Server-side driver. Reads `OpeningClient` first, replies with
/// `OpeningServer`, exchanges `IdentityProof`, then runs the
/// post-handshake loop until either side closes.
///
/// Returns `Ok(())` on a clean shutdown (peer sent `AppMsg::Error`
/// or the outbound channel was closed). Any other condition surfaces
/// as a [`SessionError`].
pub async fn run_session_server<S>(
	stream: S,
	identity: &PeerIdentity,
	trusted: &[VerifyingKey],
	handles: SessionHandles,
) -> Result<(), SessionError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let mut framed = build_framed(stream);

	// 1. Read OpeningClient.
	let opening_client = recv_handshake(&mut framed).await?;
	let (client_eph_pub, client_nonce) = parse_opening_pubkey_and_nonce(&opening_client)?;

	// 2. Build server side.
	let server = ServerHandshake::from_client_opening(&opening_client)?;
	let server_eph_pub_bytes = *server.eph_pub.as_bytes();
	let server_nonce = server.nonce;
	let agreed_version = server.agreed_version;
	let server_opening = server.opening_message();

	// 3. Send OpeningServer.
	send_handshake(&mut framed, &server_opening).await?;

	// 4. DH + finalize.
	let client_pub = PublicKey::from(client_eph_pub);
	let shared = server.eph_secret.diffie_hellman(&client_pub);
	let (mut session, our_proof) = finalize_handshake(
		shared,
		&client_eph_pub,
		&server_eph_pub_bytes,
		&client_nonce,
		&server_nonce,
		agreed_version,
		identity.signing_key(),
		false, // is_client = false on the server side
	);

	// 5. Exchange IdentityProof.
	send_handshake(&mut framed, &our_proof).await?;
	let their_proof = recv_handshake(&mut framed).await?;
	let remote = verify_identity_proof(&their_proof, &session.transcript_hash, trusted)?;
	session.remote_pubkey = remote;

	// 6. Compute peer fingerprint + emit connected.
	let peer_fp_hex = format_fingerprint(&fingerprint_of(&remote));
	if let Some(app) = handles.app_handle.as_ref() {
		events::emit_connection_state(
			app,
			ConnectionStatePayload {
				state: ConnectionState::Connected,
				peer: Some(peer_fp_hex.clone()),
				error: None,
			},
		);
	}

	// 7. Enter the post-handshake loop.
	let result = run_post_handshake(framed, session, handles.app_handle.as_ref(), peer_fp_hex.clone(), handles.outbound_rx).await;
	if let Some(app) = handles.app_handle.as_ref() {
		emit_disconnect(app, &peer_fp_hex, &result);
	}
	result
}

/// Client-side driver. Mirror of [`run_session_server`] but sends
/// `OpeningClient` first.
pub async fn run_session_client<S>(
	stream: S,
	identity: &PeerIdentity,
	trusted: &[VerifyingKey],
	handles: SessionHandles,
) -> Result<(), SessionError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let mut framed = build_framed(stream);

	// 1. Build + send OpeningClient.
	let client = ClientHandshake::new();
	let client_eph_pub_bytes = *client.eph_pub.as_bytes();
	let client_nonce = client.nonce;
	send_handshake(&mut framed, &client.opening_message()).await?;

	// 2. Read OpeningServer.
	let opening_server = recv_handshake(&mut framed).await?;
	let (server_eph_pub, server_nonce, agreed_version) =
		parse_server_opening(&opening_server)?;

	// 3. DH + finalize.
	let server_pub = PublicKey::from(server_eph_pub);
	let shared = client.eph_secret.diffie_hellman(&server_pub);
	let (mut session, our_proof) = finalize_handshake(
		shared,
		&client_eph_pub_bytes,
		&server_eph_pub,
		&client_nonce,
		&server_nonce,
		agreed_version,
		identity.signing_key(),
		true, // is_client = true
	);

	// 4. Exchange IdentityProof.
	send_handshake(&mut framed, &our_proof).await?;
	let their_proof = recv_handshake(&mut framed).await?;
	let remote = verify_identity_proof(&their_proof, &session.transcript_hash, trusted)?;
	session.remote_pubkey = remote;

	// 5. Emit connected.
	let peer_fp_hex = format_fingerprint(&fingerprint_of(&remote));
	if let Some(app) = handles.app_handle.as_ref() {
		events::emit_connection_state(
			app,
			ConnectionStatePayload {
				state: ConnectionState::Connected,
				peer: Some(peer_fp_hex.clone()),
				error: None,
			},
		);
	}

	// 6. Enter the post-handshake loop.
	let result = run_post_handshake(framed, session, handles.app_handle.as_ref(), peer_fp_hex.clone(), handles.outbound_rx).await;
	if let Some(app) = handles.app_handle.as_ref() {
		emit_disconnect(app, &peer_fp_hex, &result);
	}
	result
}

/// Builds the length-delimited codec. 4-byte big-endian length
/// prefix, max payload size matches `protocol::MAX_FRAME_SIZE`.
fn build_framed<S>(stream: S) -> Framed<S, LengthDelimitedCodec>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	let codec = LengthDelimitedCodec::builder()
		.max_frame_length(MAX_FRAME_SIZE)
		.length_field_length(4)
		.new_codec();
	Framed::new(stream, codec)
}

/// Sends a handshake message JSON-encoded under the
/// length-delimited codec.
async fn send_handshake<S>(
	framed: &mut Framed<S, LengthDelimitedCodec>,
	msg: &HandshakeMsg,
) -> Result<(), SessionError>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	let bytes = encode_frame(msg).map_err(|e| SessionError::Framing(e.to_string()))?;
	framed
		.send(Bytes::from(bytes))
		.await
		.map_err(SessionError::Io)
}

/// Reads one handshake message from the framed stream. Returns
/// `UnexpectedEof` if the stream ends.
async fn recv_handshake<S>(
	framed: &mut Framed<S, LengthDelimitedCodec>,
) -> Result<HandshakeMsg, SessionError>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	let frame = framed
		.next()
		.await
		.ok_or(SessionError::UnexpectedEof)?
		.map_err(SessionError::Io)?;
	decode_frame(&frame).map_err(|e| SessionError::Framing(e.to_string()))
}

/// Extracts the X25519 public key + 8-byte nonce from an
/// `OpeningClient` (or `OpeningServer`) message. Used by both sides
/// to feed into the ECDH step.
fn parse_opening_pubkey_and_nonce(
	msg: &HandshakeMsg,
) -> Result<([u8; 32], [u8; 8]), SessionError> {
	let (eph_pub_b64, nonce_b64) = match msg {
		HandshakeMsg::OpeningClient {
			eph_pub_b64,
			nonce_b64,
			..
		} => (eph_pub_b64, nonce_b64),
		HandshakeMsg::OpeningServer {
			eph_pub_b64,
			nonce_b64,
			..
		} => (eph_pub_b64, nonce_b64),
		_ => {
			return Err(SessionError::Transport(TransportError::BadHandshakeBytes(
				"expected Opening{Client,Server}".to_string(),
			)));
		}
	};
	let eph = decode_b64(eph_pub_b64).map_err(|e| SessionError::Framing(e.to_string()))?;
	let nonce = decode_b64(nonce_b64).map_err(|e| SessionError::Framing(e.to_string()))?;
	if eph.len() != 32 {
		return Err(SessionError::Transport(TransportError::BadHandshakeBytes(
			format!("eph_pub has wrong length: {}", eph.len()),
		)));
	}
	if nonce.len() != 8 {
		return Err(SessionError::Transport(TransportError::BadHandshakeBytes(
			format!("nonce has wrong length: {}", nonce.len()),
		)));
	}
	let mut eph_arr = [0u8; 32];
	eph_arr.copy_from_slice(&eph);
	let mut nonce_arr = [0u8; 8];
	nonce_arr.copy_from_slice(&nonce);
	Ok((eph_arr, nonce_arr))
}

/// Client-side helper that additionally extracts the negotiated
/// version field from `OpeningServer`.
fn parse_server_opening(
	msg: &HandshakeMsg,
) -> Result<([u8; 32], [u8; 8], u8), SessionError> {
	let (eph, nonce) = parse_opening_pubkey_and_nonce(msg)?;
	let agreed_version = match msg {
		HandshakeMsg::OpeningServer {
			agreed_version, ..
		} => *agreed_version,
		_ => {
			return Err(SessionError::Transport(TransportError::BadHandshakeBytes(
				"expected OpeningServer".to_string(),
			)));
		}
	};
	Ok((eph, nonce, agreed_version))
}

/// Drives the post-handshake loop: inbound `AppMsg` frames, outbound
/// channel pumps, and the idle-keepalive ticker, all multiplexed via
/// `tokio::select!`.
///
/// For Stage 2 the inbound dispatch handles only `Ping`/`Pong`. All
/// other variants are forwarded to a `eprintln!` for visibility and
/// then ignored. Stage 5 expands this to dispatch every variant.
async fn run_post_handshake<S>(
	framed: Framed<S, LengthDelimitedCodec>,
	mut session: EstablishedSession,
	app_handle: Option<&tauri::AppHandle>,
	peer_fp_hex: String,
	mut outbound_rx: mpsc::Receiver<AppMsg>,
) -> Result<(), SessionError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let (mut sink, mut stream) = framed.split();
	let mut keepalive = time::interval(KEEPALIVE_INTERVAL);
	keepalive.set_missed_tick_behavior(time::MissedTickBehavior::Skip);

	// Tracks the wall-clock when a `Ping` was last sent without a
	// matching `Pong`. `None` means no ping in flight.
	let mut awaiting_pong_since: Option<tokio::time::Instant> = None;

	loop {
		tokio::select! {
			biased;

			// Inbound frame.
			next = stream.next() => {
				let bytes = match next {
					Some(Ok(b)) => b,
					Some(Err(e)) => return Err(SessionError::Io(e)),
					None => return Ok(()),
				};
				let sealed = SealedFrame::from_bytes(&bytes).map_err(SessionError::Transport)?;
				let plaintext = session.opener.open(&sealed).map_err(SessionError::Transport)?;
				let msg: AppMsg = decode_frame(&plaintext)
					.map_err(|e| SessionError::Framing(e.to_string()))?;
				match msg {
					AppMsg::Ping => {
						send_app(&mut sink, &mut session.sealer, &AppMsg::Pong).await?;
					}
					AppMsg::Pong => {
						awaiting_pong_since = None;
					}
					AppMsg::Error { code, message } => {
						return Err(SessionError::PeerSignaledError(format!("{code}: {message}")));
					}
					other => {
						// TODO Stage 5: dispatch `Subscribe`, `RequestBlock`,
						// `PushUpdate`, `Delete`, `PushRename`, `ListShares`.
						eprintln!(
							"[lan-sync] peer {peer_fp_hex} sent un-dispatched AppMsg variant; \
							 deferring to Stage 5: {variant}",
							variant = app_msg_variant_name(&other),
						);
					}
				}
			}

			// Outbound channel pump.
			next = outbound_rx.recv() => {
				match next {
					Some(msg) => {
						send_app(&mut sink, &mut session.sealer, &msg).await?;
					}
					None => {
						// Producer dropped its sender; treat as clean shutdown.
						return Ok(());
					}
				}
			}

			// Keepalive tick.
			_ = keepalive.tick() => {
				if let Some(since) = awaiting_pong_since {
					if since.elapsed() >= KEEPALIVE_TIMEOUT {
						return Err(SessionError::KeepaliveTimeout);
					}
				} else {
					send_app(&mut sink, &mut session.sealer, &AppMsg::Ping).await?;
					awaiting_pong_since = Some(tokio::time::Instant::now());
				}
			}
		}

		// Suppress dead-code warning until Stage 5 needs `app_handle`.
		let _ = app_handle;
	}
}

/// Encodes, seals, and sends an `AppMsg` through the post-handshake
/// sink. Pulled into its own helper so the `select!` body stays
/// readable.
async fn send_app<S>(
	sink: &mut SplitSink<Framed<S, LengthDelimitedCodec>, Bytes>,
	sealer: &mut crate::sync::transport::Sealer,
	msg: &AppMsg,
) -> Result<(), SessionError>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	let plaintext = encode_frame(msg).map_err(|e| SessionError::Framing(e.to_string()))?;
	let sealed = sealer.seal(&plaintext).map_err(SessionError::Transport)?;
	let wire = sealed.to_bytes();
	sink.send(wire).await.map_err(SessionError::Io)
}

/// Tiny debug helper - returns the variant name as a static string
/// so the un-dispatched log line is readable without dumping the
/// whole payload (which may contain user content).
fn app_msg_variant_name(msg: &AppMsg) -> &'static str {
	match msg {
		AppMsg::Ping => "Ping",
		AppMsg::Pong => "Pong",
		AppMsg::Error { .. } => "Error",
		AppMsg::ListShares { .. } => "ListShares",
		AppMsg::SharesAvailable { .. } => "SharesAvailable",
		AppMsg::Subscribe { .. } => "Subscribe",
		AppMsg::Manifest { .. } => "Manifest",
		AppMsg::RequestBlock { .. } => "RequestBlock",
		AppMsg::BlockData { .. } => "BlockData",
		AppMsg::PushUpdate { .. } => "PushUpdate",
		AppMsg::PushRename { .. } => "PushRename",
		AppMsg::Delete { .. } => "Delete",
	}
}

/// Emits the right `connection-state` payload for a session that has
/// just finished. Maps the [`SessionError`] (if any) onto either
/// `'disconnected'` or `'error'`.
fn emit_disconnect(
	app: &tauri::AppHandle,
	peer_fp_hex: &str,
	result: &Result<(), SessionError>,
) {
	let (state, error) = match result {
		Ok(()) => (ConnectionState::Disconnected, None),
		Err(e) => (ConnectionState::Error, Some(e.to_string())),
	};
	events::emit_connection_state(
		app,
		ConnectionStatePayload {
			state,
			peer: Some(peer_fp_hex.to_string()),
			error,
		},
	);
}
