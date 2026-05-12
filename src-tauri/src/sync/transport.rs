//! Noise XX transport for LAN sync.
//!
//! Provides mutual authentication, forward secrecy, and AEAD framing
//! for every TCP connection between paired devices. The peer's static
//! public key is verified at the end of the handshake against the
//! `expected_static_pub` argument (initiator side) or against a caller
//! supplied predicate (responder side); any mismatch aborts the session
//! before any application data is sent.
//!
//! Static keys are derived deterministically from the device's
//! Ed25519 identity by hashing the Ed25519 secret with SHA-256 and
//! clamping to a valid X25519 scalar (RFC 7748 §5). This avoids
//! managing a second key file in MVP. For production multi-device
//! use, replace with an independent X25519 key generated alongside
//! the Ed25519 identity at first install.
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

use sha2::{Digest, Sha256};
use snow::params::DHChoice;
use snow::resolvers::{CryptoResolver, DefaultResolver};
use snow::{HandshakeState, TransportState};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

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
/// Matches the format used by `sync::identity::fingerprint_hex` for
/// Ed25519 keys: same hash function, same prefix length, same case.
/// Callers compare two fingerprints as plain string equality.
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
/// length. The session caches the verified remote static public key
/// so callers can re-check trust on demand without touching the
/// handshake state.
pub struct Session<S>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	stream: S,
	noise: TransportState,
	remote_static: [u8; X25519_KEY_LEN],
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

	/// Returns the verified remote static public key for this session.
	///
	/// The value was captured during the handshake after the peer
	/// proved possession of the matching private key, so callers can
	/// trust it without re-running the Noise state machine.
	pub fn remote_static(&self) -> [u8; X25519_KEY_LEN] {
		self.remote_static
	}
}

/// Initiator handshake. Establishes a Noise XX session, then verifies
/// the resulting remote static key fingerprint against
/// `expected_remote_fingerprint_hex` (first 16 hex chars of
/// `SHA-256(remote_static)`).
///
/// On mismatch returns [`TransportError::PeerMismatch`] *before* any
/// application data is sent. The TCP stream is left in an undefined
/// state on error; callers should drop it.
pub async fn open_to<S>(
	mut stream: S,
	my_keys: &StaticKeys,
	expected_remote_fingerprint_hex: &str,
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

	let got_hex = fingerprint_hex_from_static(&remote_static);
	if !constant_time_eq(got_hex.as_bytes(), expected_remote_fingerprint_hex.as_bytes()) {
		return Err(TransportError::PeerMismatch {
			expected_hex: expected_remote_fingerprint_hex.to_string(),
			got_hex,
		});
	}

	Ok(Session { stream, noise: transport, remote_static })
}

/// Responder handshake. Reads the remote static key during XX, then
/// checks the resulting fingerprint against `accept_predicate`.
///
/// If the predicate returns `false`, the session is aborted with
/// [`TransportError::PeerMismatch`] (where `expected_hex` is empty
/// because the responder has no specific expectation — only an
/// accept/reject decision). The TCP stream is left in an undefined
/// state on error; callers should drop it.
pub async fn accept<S, F>(
	mut stream: S,
	my_keys: &StaticKeys,
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

	let got_hex = fingerprint_hex_from_static(&remote_static);
	if !accept_predicate(&got_hex) {
		return Err(TransportError::PeerMismatch {
			expected_hex: String::new(),
			got_hex,
		});
	}

	Ok(Session { stream, noise: transport, remote_static })
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
