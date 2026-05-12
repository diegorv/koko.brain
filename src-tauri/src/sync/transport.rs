//! Noise XX transport for LAN sync.
//!
//! Provides mutual authentication, forward secrecy, and AEAD framing
//! for every TCP connection between paired devices. After the three
//! Noise XX messages complete, both sides exchange an
//! [`crate::sync::identity::IdentityProof`] as the first encrypted
//! transport frame; this binds the Noise X25519 static they just
//! authenticated to the long-lived Ed25519 device identity. Only the
//! Ed25519 fingerprint surface is checked against the caller's
//! expectation (initiator side) or the caller's accept predicate
//! (responder side). Any mismatch — wrong Ed25519 public, invalid
//! binding signature, or unexpected fingerprint — aborts the session
//! with [`TransportError::IdentityRejected`] before any application
//! data is sent.
//!
//! Static keys are derived deterministically from the device's
//! Ed25519 identity by hashing the Ed25519 secret with SHA-256 and
//! clamping to a valid X25519 scalar (RFC 7748 §5). The binding
//! signature exchanged after the handshake is what makes the Ed25519
//! key the canonical identity surface even though the wire-level
//! authentication runs over X25519. The X25519 keypair is intentionally
//! NOT stored separately in MVP — every install derives it on demand
//! from the Ed25519 secret.
//!
//! TODO(post-MVP): split the Noise static key off from the Ed25519
//! identity. Reusing key material across signature and key-exchange
//! primitives is not a recommended pattern in production crypto; the
//! MVP is safe only under the "own home, single user" threat model.
//!
//! Wire format on every TCP segment (handshake + transport):
//! `4-byte big-endian length || message_bytes`. The same prefix is
//! used during the three Noise XX handshake messages and during every
//! subsequent AEAD-encrypted frame.

use std::fmt;
use std::io;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signature, VerifyingKey, PUBLIC_KEY_LENGTH, SIGNATURE_LENGTH};
use sha2::{Digest, Sha256};
use snow::params::DHChoice;
use snow::resolvers::{CryptoResolver, DefaultResolver};
use snow::{HandshakeState, TransportState};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

use crate::sync::identity::{fingerprint_hex, IdentityProof};

/// Snow protocol descriptor used by both initiator and responder.
///
/// `Noise_XX_25519_AESGCM_SHA256` gives mutual static-key authentication,
/// forward secrecy via ephemeral keys, AES-GCM AEAD framing, and
/// SHA-256 hashing — all available from `snow`'s default crypto
/// resolver with no extra crate features.
pub const NOISE_PARAMS: &str = "Noise_XX_25519_AESGCM_SHA256";

/// Number of bytes reserved for the big-endian length prefix that
/// precedes every wire message (handshake or transport frame).
pub const FRAME_LEN_PREFIX_BYTES: usize = 4;

/// Maximum allowed ciphertext frame size, in bytes. Frames whose length
/// prefix exceeds this value are rejected before any allocation happens.
pub const MAX_FRAME_BYTES: usize = 8 * 1024 * 1024;

/// Length of an X25519 scalar / public key in bytes.
const X25519_KEY_LEN: usize = 32;

/// Length of one Noise transport-mode handshake message buffer. The
/// largest XX handshake message is bounded by `snow`'s 65535-byte
/// `MAXMSGLEN`; we use the same bound for safety.
const HANDSHAKE_BUF_LEN: usize = u16::MAX as usize;

/// Static X25519 key pair derived from the device's Ed25519 identity.
///
/// Both halves are 32 bytes. `public` is the result of multiplying the
/// X25519 base point by `private` (with the standard scalar clamping
/// applied inside `snow`'s curve25519 implementation).
#[derive(Debug, Clone)]
pub struct StaticKeys {
	/// Clamped X25519 scalar. Treat as secret material.
	pub private: [u8; X25519_KEY_LEN],
	/// Corresponding X25519 public key.
	pub public: [u8; X25519_KEY_LEN],
}

/// Derives the X25519 static keypair deterministically from an
/// Ed25519 secret seed.
///
/// The derivation is `private = clamp(SHA-256(ed_secret))`, where
/// `clamp` follows RFC 7748 §5 (clear the bottom three bits of byte 0,
/// clear the high bit of byte 31, set the second-highest bit of byte
/// 31). The public key is then computed by snow's default curve25519
/// implementation, so the result is identical across platforms.
pub fn static_keys_from_ed25519_secret(ed_secret: &[u8; 32]) -> StaticKeys {
	let mut private = [0_u8; X25519_KEY_LEN];
	let digest = Sha256::digest(ed_secret);
	private.copy_from_slice(&digest);
	clamp_x25519_scalar(&mut private);

	let resolver = DefaultResolver;
	let mut dh = resolver
		.resolve_dh(&DHChoice::Curve25519)
		.expect("snow default resolver must provide curve25519 DH");
	dh.set(&private);
	let mut public = [0_u8; X25519_KEY_LEN];
	public.copy_from_slice(dh.pubkey());

	StaticKeys { private, public }
}

/// Applies the RFC 7748 §5 scalar clamp in place. `bytes` must be at
/// least 32 bytes long; only the first 32 bytes are touched.
fn clamp_x25519_scalar(bytes: &mut [u8; X25519_KEY_LEN]) {
	bytes[0] &= 248;
	bytes[31] &= 127;
	bytes[31] |= 64;
}

/// Computes the first 16 lowercase hex chars of `SHA-256(static_pub)`.
///
/// **Deprecated since Hotfix H2.** This produced a fingerprint over the
/// X25519 static, which diverges from
/// [`crate::sync::identity::fingerprint_hex`] (the canonical Ed25519
/// surface used by mDNS, the UI, and `peers.json`). Every real two-PC
/// pair attempt fired `PeerMismatch` because the initiator pinned this
/// value while the UI and announcer used the Ed25519 one. New code
/// should call [`Session::remote_ed25519_fingerprint_hex`] (post-
/// handshake) or [`crate::sync::identity::fingerprint_hex`] (when the
/// Ed25519 public key is in hand). Retained in this commit so callers
/// can be updated in the same diff without a forced ordering; safe to
/// delete once nothing references it.
#[deprecated(
	note = "Use Session::remote_ed25519_fingerprint_hex; the X25519 fingerprint diverges from the identity surface and was the source of Hotfix H2's PeerMismatch bug."
)]
pub fn fingerprint_hex_from_static(static_pub: &[u8; X25519_KEY_LEN]) -> String {
	let digest = Sha256::digest(static_pub);
	digest.iter().take(8).map(|b| format!("{b:02x}")).collect()
}

/// Errors that can occur during handshake or framed I/O.
#[derive(Debug)]
pub enum TransportError {
	/// A `snow` Noise protocol error (handshake step, AEAD failure, ...).
	Snow(snow::Error),
	/// An underlying I/O error from the wrapped stream.
	Io(io::Error),
	/// The remote static key did not match the caller's expectation.
	/// `expected_hex` is what the caller asked for; `got_hex` is the
	/// fingerprint the peer actually presented.
	///
	/// **Note:** Hotfix H2 routes identity rejections through the new
	/// [`TransportError::IdentityRejected`] variant. `PeerMismatch` is
	/// retained for the older X25519-fingerprint path so existing
	/// callers (and tests pinning the variant shape) keep compiling
	/// against the deprecated [`fingerprint_hex_from_static`].
	PeerMismatch {
		/// Fingerprint the caller expected to see.
		expected_hex: String,
		/// Fingerprint the peer actually presented.
		got_hex: String,
	},
	/// The peer announced a frame larger than [`MAX_FRAME_BYTES`].
	FrameTooLarge(usize),
	/// The peer closed the stream cleanly. Returned from [`Session::recv`]
	/// when EOF arrives before a complete length prefix.
	Closed,
	/// Post-handshake identity check failed. Possible causes (`reason`
	/// holds a short human-readable tag for logging):
	///
	/// - the peer's [`IdentityProof`] JSON was malformed
	/// - `ed25519_pub_b64` decoded to the wrong length / not a valid
	///   curve point
	/// - `binding_sig_b64` decoded to the wrong length / failed
	///   `verify_strict` against the Noise-verified X25519 static
	/// - the derived Ed25519 fingerprint did not match the caller's
	///   pinned hex (initiator side) or the accept predicate rejected
	///   it (responder side)
	IdentityRejected {
		/// Short tag identifying which check failed. Stable enough to
		/// pattern-match in tests; not localised.
		reason: String,
	},
}

impl fmt::Display for TransportError {
	fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
		match self {
			TransportError::Snow(e) => write!(f, "noise protocol error: {e}"),
			TransportError::Io(e) => write!(f, "i/o error: {e}"),
			TransportError::PeerMismatch { expected_hex, got_hex } => write!(
				f,
				"peer static key mismatch: expected {expected_hex}, got {got_hex}"
			),
			TransportError::FrameTooLarge(n) => {
				write!(f, "frame too large: {n} bytes > {MAX_FRAME_BYTES} max")
			}
			TransportError::Closed => write!(f, "session closed"),
			TransportError::IdentityRejected { reason } => {
				write!(f, "peer identity rejected: {reason}")
			}
		}
	}
}

impl std::error::Error for TransportError {
	fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
		match self {
			TransportError::Snow(e) => Some(e),
			TransportError::Io(e) => Some(e),
			_ => None,
		}
	}
}

impl From<snow::Error> for TransportError {
	fn from(value: snow::Error) -> Self {
		TransportError::Snow(value)
	}
}

impl From<io::Error> for TransportError {
	fn from(value: io::Error) -> Self {
		TransportError::Io(value)
	}
}

/// Live, post-handshake AEAD-framed session.
///
/// Wraps a TCP stream plus the Noise transport state. Each frame is
/// prefixed with 4 big-endian bytes giving the ciphertext payload
/// length. The session caches the verified remote X25519 static, the
/// remote Ed25519 public key (validated by the post-handshake
/// [`IdentityProof`] exchange), and exposes both surfaces to callers
/// so trust decisions can be expressed in either coordinate system.
pub struct Session<S>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	stream: S,
	noise: TransportState,
	remote_static: [u8; X25519_KEY_LEN],
	remote_ed25519_pub: [u8; PUBLIC_KEY_LENGTH],
}

impl<S> Session<S>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	/// Sends one application frame. Encrypts `msg` with the Noise
	/// transport state, then writes `4-byte BE length || ciphertext`.
	///
	/// Returns `FrameTooLarge` if the plaintext would produce a
	/// ciphertext larger than [`MAX_FRAME_BYTES`].
	pub async fn send(&mut self, msg: &[u8]) -> Result<(), TransportError> {
		// AES-GCM ciphertext is `plaintext.len() + 16` bytes (tag).
		// snow caps a single transport message at MAXMSGLEN (65535).
		let max_plain = HANDSHAKE_BUF_LEN.saturating_sub(16);
		if msg.len() > max_plain {
			return Err(TransportError::FrameTooLarge(msg.len() + 16));
		}
		let mut buf = vec![0_u8; msg.len() + 16];
		let written = self.noise.write_message(msg, &mut buf)?;
		buf.truncate(written);
		if buf.len() > MAX_FRAME_BYTES {
			return Err(TransportError::FrameTooLarge(buf.len()));
		}
		write_framed(&mut self.stream, &buf).await?;
		Ok(())
	}

	/// Reads one application frame. Returns the decrypted plaintext.
	///
	/// Rejects ciphertext frames whose length prefix exceeds
	/// [`MAX_FRAME_BYTES`] before allocating, and returns
	/// [`TransportError::Closed`] if EOF arrives before a complete
	/// length prefix.
	pub async fn recv(&mut self) -> Result<Vec<u8>, TransportError> {
		let ciphertext = read_framed(&mut self.stream).await?;
		let mut plaintext = vec![0_u8; ciphertext.len()];
		let written = self.noise.read_message(&ciphertext, &mut plaintext)?;
		plaintext.truncate(written);
		Ok(plaintext)
	}

	/// Returns the verified remote X25519 static public key for this
	/// session.
	///
	/// The value was captured during the Noise handshake after the peer
	/// proved possession of the matching private key, so callers can
	/// trust it without re-running the Noise state machine.
	pub fn remote_static(&self) -> [u8; X25519_KEY_LEN] {
		self.remote_static
	}

	/// Returns the verified remote Ed25519 public key for this session.
	///
	/// The value was decoded from the peer's [`IdentityProof`] and
	/// validated by checking the binding signature against
	/// `remote_static()`, so callers can trust it without re-running
	/// the proof exchange. This is the canonical identity surface and
	/// drives `peers.json` / mDNS / UI comparisons.
	pub fn remote_ed25519_pub(&self) -> [u8; PUBLIC_KEY_LENGTH] {
		self.remote_ed25519_pub
	}

	/// Returns the first 16 lowercase hex chars of
	/// `SHA-256(remote Ed25519 public key)`.
	///
	/// Matches [`crate::sync::identity::fingerprint_hex`] computed on
	/// the peer's own [`crate::sync::identity::DeviceIdentity`] —
	/// callers can compare with the value persisted in `peers.json` or
	/// announced over mDNS.
	pub fn remote_ed25519_fingerprint_hex(&self) -> String {
		// `from_bytes` returns an error only when the bytes aren't a
		// valid curve point; we already verified that during the proof
		// exchange, so reuse the cached value.
		match VerifyingKey::from_bytes(&self.remote_ed25519_pub) {
			Ok(vk) => fingerprint_hex(&vk),
			Err(_) => String::new(),
		}
	}
}

/// Initiator handshake. Establishes a Noise XX session, exchanges
/// [`IdentityProof`]s, and verifies the resulting remote Ed25519
/// fingerprint against `expected_remote_ed25519_fingerprint_hex`
/// (first 16 hex chars of `SHA-256(remote Ed25519 public key)`).
///
/// Flow:
/// 1. Three-message Noise XX (`-> e`, `<- e, ee, s, es`, `-> s, se`).
/// 2. Initiator sends `my_identity_proof` as one encrypted frame.
/// 3. Initiator receives the peer's [`IdentityProof`].
/// 4. Initiator verifies the peer's binding signature against the
///    Noise-verified X25519 remote-static.
/// 5. Initiator compares the derived Ed25519 fingerprint hex to
///    `expected_remote_ed25519_fingerprint_hex`; mismatch returns
///    [`TransportError::IdentityRejected`].
///
/// On any error the TCP stream is left in an undefined state; callers
/// should drop it.
pub async fn open_to<S>(
	mut stream: S,
	my_keys: &StaticKeys,
	my_identity_proof: &IdentityProof,
	expected_remote_ed25519_fingerprint_hex: &str,
) -> Result<Session<S>, TransportError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let params: snow::params::NoiseParams = NOISE_PARAMS.parse()?;
	let mut handshake = snow::Builder::new(params)
		.local_private_key(&my_keys.private)?
		.build_initiator()?;

	// XX msg 1 (-> e): initiator writes.
	let mut buf = vec![0_u8; HANDSHAKE_BUF_LEN];
	let n = handshake.write_message(&[], &mut buf)?;
	write_framed(&mut stream, &buf[..n]).await?;

	// XX msg 2 (<- e, ee, s, es): initiator reads.
	let msg2 = read_framed(&mut stream).await?;
	let mut payload = vec![0_u8; HANDSHAKE_BUF_LEN];
	handshake.read_message(&msg2, &mut payload)?;

	// XX msg 3 (-> s, se): initiator writes the final message.
	let n = handshake.write_message(&[], &mut buf)?;
	write_framed(&mut stream, &buf[..n]).await?;

	let remote_static = capture_remote_static(&handshake)?;
	let transport = handshake.into_transport_mode()?;

	let mut session = Session {
		stream,
		noise: transport,
		remote_static,
		remote_ed25519_pub: [0u8; PUBLIC_KEY_LENGTH],
	};

	// IdentityProof exchange: send ours, then read theirs.
	let my_proof_bytes = serde_json::to_vec(my_identity_proof)
		.map_err(|e| TransportError::IdentityRejected { reason: format!("encode local proof: {e}") })?;
	session.send(&my_proof_bytes).await?;

	let peer_proof_bytes = session.recv().await?;
	let peer_ed = verify_remote_identity_proof(&peer_proof_bytes, &remote_static)?;
	session.remote_ed25519_pub = peer_ed.to_bytes();

	let derived_hex = fingerprint_hex(&peer_ed);
	if !constant_time_eq(
		derived_hex.as_bytes(),
		expected_remote_ed25519_fingerprint_hex.as_bytes(),
	) {
		return Err(TransportError::IdentityRejected {
			reason: format!(
				"ed25519 fingerprint mismatch: expected {expected_remote_ed25519_fingerprint_hex}, got {derived_hex}"
			),
		});
	}

	Ok(session)
}

/// Responder handshake. Reads the remote X25519 static during Noise XX,
/// exchanges [`IdentityProof`]s, then checks the derived Ed25519
/// fingerprint against `accept_predicate`.
///
/// Flow:
/// 1. Three-message Noise XX.
/// 2. Responder receives the peer's [`IdentityProof`].
/// 3. Responder verifies the peer's binding signature against the
///    Noise-verified X25519 remote-static.
/// 4. Responder computes the Ed25519 fingerprint hex and passes it to
///    `accept_predicate`. `false` returns
///    [`TransportError::IdentityRejected`].
/// 5. Responder sends `my_identity_proof` as the final frame.
///
/// On any error the TCP stream is left in an undefined state; callers
/// should drop it.
pub async fn accept<S, F>(
	mut stream: S,
	my_keys: &StaticKeys,
	my_identity_proof: &IdentityProof,
	accept_predicate: F,
) -> Result<Session<S>, TransportError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
	F: FnOnce(&str) -> bool,
{
	let params: snow::params::NoiseParams = NOISE_PARAMS.parse()?;
	let mut handshake = snow::Builder::new(params)
		.local_private_key(&my_keys.private)?
		.build_responder()?;

	// XX msg 1: responder reads.
	let msg1 = read_framed(&mut stream).await?;
	let mut payload = vec![0_u8; HANDSHAKE_BUF_LEN];
	handshake.read_message(&msg1, &mut payload)?;

	// XX msg 2: responder writes its ephemeral + static.
	let mut buf = vec![0_u8; HANDSHAKE_BUF_LEN];
	let n = handshake.write_message(&[], &mut buf)?;
	write_framed(&mut stream, &buf[..n]).await?;

	// XX msg 3: responder reads the initiator's static.
	let msg3 = read_framed(&mut stream).await?;
	handshake.read_message(&msg3, &mut payload)?;

	let remote_static = capture_remote_static(&handshake)?;
	let transport = handshake.into_transport_mode()?;

	let mut session = Session {
		stream,
		noise: transport,
		remote_static,
		remote_ed25519_pub: [0u8; PUBLIC_KEY_LENGTH],
	};

	// IdentityProof exchange. The initiator sends first per `open_to`,
	// so the responder reads first then writes back.
	let peer_proof_bytes = session.recv().await?;
	let peer_ed = verify_remote_identity_proof(&peer_proof_bytes, &remote_static)?;
	session.remote_ed25519_pub = peer_ed.to_bytes();

	let derived_hex = fingerprint_hex(&peer_ed);
	if !accept_predicate(&derived_hex) {
		return Err(TransportError::IdentityRejected {
			reason: format!("predicate rejected ed25519 fingerprint {derived_hex}"),
		});
	}

	let my_proof_bytes = serde_json::to_vec(my_identity_proof)
		.map_err(|e| TransportError::IdentityRejected { reason: format!("encode local proof: {e}") })?;
	session.send(&my_proof_bytes).await?;

	Ok(session)
}

/// Decodes an [`IdentityProof`] from JSON bytes and verifies the
/// binding signature against `remote_static` (the X25519 public the
/// Noise handshake just authenticated). Returns the recovered
/// Ed25519 [`VerifyingKey`] on success.
///
/// All failure paths produce [`TransportError::IdentityRejected`] with
/// a short tag describing which check failed.
fn verify_remote_identity_proof(
	proof_bytes: &[u8],
	remote_static: &[u8; X25519_KEY_LEN],
) -> Result<VerifyingKey, TransportError> {
	let proof: IdentityProof = serde_json::from_slice(proof_bytes).map_err(|e| {
		TransportError::IdentityRejected { reason: format!("decode proof json: {e}") }
	})?;

	let ed_bytes = BASE64
		.decode(proof.ed25519_pub_b64.as_bytes())
		.map_err(|e| TransportError::IdentityRejected {
			reason: format!("ed25519 pub b64 decode: {e}"),
		})?;
	if ed_bytes.len() != PUBLIC_KEY_LENGTH {
		return Err(TransportError::IdentityRejected {
			reason: format!(
				"ed25519 pub wrong length: expected {PUBLIC_KEY_LENGTH}, got {}",
				ed_bytes.len()
			),
		});
	}
	let mut ed_arr = [0u8; PUBLIC_KEY_LENGTH];
	ed_arr.copy_from_slice(&ed_bytes);
	let verifying_key = VerifyingKey::from_bytes(&ed_arr).map_err(|e| {
		TransportError::IdentityRejected { reason: format!("ed25519 pub invalid: {e}") }
	})?;

	let sig_bytes = BASE64
		.decode(proof.binding_sig_b64.as_bytes())
		.map_err(|e| TransportError::IdentityRejected {
			reason: format!("binding sig b64 decode: {e}"),
		})?;
	if sig_bytes.len() != SIGNATURE_LENGTH {
		return Err(TransportError::IdentityRejected {
			reason: format!(
				"binding sig wrong length: expected {SIGNATURE_LENGTH}, got {}",
				sig_bytes.len()
			),
		});
	}
	let mut sig_arr = [0u8; SIGNATURE_LENGTH];
	sig_arr.copy_from_slice(&sig_bytes);
	let signature = Signature::from_bytes(&sig_arr);

	verifying_key
		.verify_strict(remote_static, &signature)
		.map_err(|e| TransportError::IdentityRejected {
			reason: format!("binding sig verify: {e}"),
		})?;

	Ok(verifying_key)
}

/// Reads the remote static public key out of a finished `HandshakeState`.
///
/// Returns `Snow(StateProblem::MissingKeyMaterial)` if Noise didn't
/// negotiate a remote static (should never happen for XX).
fn capture_remote_static(
	handshake: &HandshakeState,
) -> Result<[u8; X25519_KEY_LEN], TransportError> {
	let remote = handshake
		.get_remote_static()
		.ok_or(TransportError::Snow(snow::Error::State(
			snow::error::StateProblem::MissingKeyMaterial,
		)))?;
	if remote.len() != X25519_KEY_LEN {
		return Err(TransportError::Snow(snow::Error::State(
			snow::error::StateProblem::MissingKeyMaterial,
		)));
	}
	let mut out = [0_u8; X25519_KEY_LEN];
	out.copy_from_slice(remote);
	Ok(out)
}

/// Writes `4-byte BE length || msg` to `stream`. Rejects payloads
/// larger than [`MAX_FRAME_BYTES`] before any byte is sent.
async fn write_framed<S>(stream: &mut S, msg: &[u8]) -> Result<(), TransportError>
where
	S: AsyncWrite + Unpin,
{
	if msg.len() > MAX_FRAME_BYTES {
		return Err(TransportError::FrameTooLarge(msg.len()));
	}
	let len = u32::try_from(msg.len())
		.map_err(|_| TransportError::FrameTooLarge(msg.len()))?;
	stream.write_all(&len.to_be_bytes()).await?;
	stream.write_all(msg).await?;
	stream.flush().await?;
	Ok(())
}

/// Reads one length-prefixed message from `stream`. Returns
/// [`TransportError::Closed`] on EOF before the prefix completes,
/// [`TransportError::FrameTooLarge`] if the announced length exceeds
/// [`MAX_FRAME_BYTES`], and propagates any I/O error otherwise.
async fn read_framed<S>(stream: &mut S) -> Result<Vec<u8>, TransportError>
where
	S: AsyncRead + Unpin,
{
	let mut len_buf = [0_u8; FRAME_LEN_PREFIX_BYTES];
	match stream.read_exact(&mut len_buf).await {
		Ok(_) => {}
		Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => {
			return Err(TransportError::Closed);
		}
		Err(e) => return Err(TransportError::Io(e)),
	}
	let len = u32::from_be_bytes(len_buf) as usize;
	if len > MAX_FRAME_BYTES {
		return Err(TransportError::FrameTooLarge(len));
	}
	let mut buf = vec![0_u8; len];
	stream.read_exact(&mut buf).await?;
	Ok(buf)
}

/// Compares two byte slices in constant time relative to their
/// shared prefix. Returns `false` immediately on length mismatch.
///
/// Used for fingerprint comparison so a side-channel timing leak
/// cannot reveal which prefix of an attacker-supplied fingerprint
/// matched the expected one.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
	if a.len() != b.len() {
		return false;
	}
	let mut acc: u8 = 0;
	for (x, y) in a.iter().zip(b.iter()) {
		acc |= x ^ y;
	}
	acc == 0
}
