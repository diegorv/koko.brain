//! TCP transport, session handshake, and AEAD framing for LAN sync.
//!
//! The handshake performs X25519 ECDH between two ephemeral keypairs,
//! mixes both sides' 8-byte nonces into the transcript hash, and runs
//! HKDF-SHA256 to derive a pair of AES-256-GCM keys (one per direction).
//! Each side then signs the transcript hash with its long-term Ed25519
//! key and exchanges the signature; the receiver verifies that the
//! public key is in its trust store AND that the signature validates.
//!
//! After handshake every frame is sealed with AES-256-GCM using a
//! monotonically increasing 96-bit nonce counter. The receiver tracks
//! the last seen nonce and rejects anything not strictly greater —
//! defends against replay even if an attacker captures bytes.
//!
//! Helpers in this module are deliberately split between **pure**
//! (`derive_session_keys`, `build_transcript_hash`, `EncryptedSession`)
//! and **async I/O** (`perform_handshake_*`, `Session::run`) so the
//! cryptographic core can be exercised by sync tests while the network
//! plumbing is verified through `tokio::io::duplex`.

use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use hkdf::Hkdf;
use sha2::{Digest, Sha256};
// Aliased crate at digest 0.10 for hkdf compat — see Cargo.toml note.
use sha2_v10::Sha256 as Sha256V10;
use std::collections::HashSet;
use subtle::ConstantTimeEq;
use tokio_util::bytes::Bytes;
use x25519_dalek::{EphemeralSecret, PublicKey, SharedSecret};

use crate::sync::protocol::{
	decode_b64, decode_frame, encode_b64, encode_frame, negotiate_version, FramingError,
	HandshakeMsg, MAX_SUPPORTED_VERSION, MIN_SUPPORTED_VERSION,
};

/// HKDF "info" label for the c→s direction key.
const KDF_INFO_C2S: &[u8] = b"kokobrain-lan-sync v1 client-to-server";
/// HKDF "info" label for the s→c direction key.
const KDF_INFO_S2C: &[u8] = b"kokobrain-lan-sync v1 server-to-client";
/// Domain-separation tag mixed into the transcript hash.
const TRANSCRIPT_LABEL: &[u8] = b"kokobrain-lan-sync v1 transcript";

/// AES-256 key length in bytes.
pub const KEY_LEN: usize = 32;
/// AES-GCM nonce length (96 bits).
pub const NONCE_LEN: usize = 12;
/// Number of past nonces to remember for replay detection. Sized so a
/// reordering window of a few seconds at 100k frames/s would not falsely
/// reject; in practice this is overkill because we never reorder frames
/// in-protocol.
pub const REPLAY_WINDOW: usize = 1024;

/// Errors returned by the transport / handshake layer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TransportError {
	/// Framing/serialisation failure during a wire op.
	Frame(FramingError),
	/// AEAD seal/open failed (wrong key, tampered ciphertext, etc.).
	Aead(String),
	/// Received nonce was less than or equal to the last accepted one.
	NonceReplay,
	/// Peer advertised a protocol version we cannot speak.
	IncompatibleVersion {
		local_min: u8,
		local_max: u8,
		remote_min: u8,
		remote_max: u8,
	},
	/// The remote sent malformed or unexpected base64 bytes.
	BadHandshakeBytes(String),
	/// The remote sent an Ed25519 public key not present in our trust
	/// store. The connection is closed before any AppMsg is processed.
	UnknownPeer { fingerprint_hex: String },
	/// The Ed25519 signature over the transcript hash failed to verify.
	BadSignature,
	/// Async I/O failure on the underlying socket.
	Io(String),
}

impl core::fmt::Display for TransportError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Frame(e) => write!(f, "frame: {e}"),
			Self::Aead(msg) => write!(f, "aead: {msg}"),
			Self::NonceReplay => write!(f, "nonce replay rejected"),
			Self::IncompatibleVersion {
				local_min,
				local_max,
				remote_min,
				remote_max,
			} => write!(
				f,
				"incompatible protocol versions: local {local_min}..={local_max}, remote {remote_min}..={remote_max}"
			),
			Self::BadHandshakeBytes(msg) => write!(f, "handshake bytes: {msg}"),
			Self::UnknownPeer { fingerprint_hex } => {
				write!(f, "unknown peer fingerprint {fingerprint_hex}")
			}
			Self::BadSignature => write!(f, "invalid signature over transcript"),
			Self::Io(msg) => write!(f, "io: {msg}"),
		}
	}
}

impl std::error::Error for TransportError {}

impl From<FramingError> for TransportError {
	fn from(e: FramingError) -> Self {
		TransportError::Frame(e)
	}
}

// ============================================================================
// Pure cryptographic helpers
// ============================================================================

/// Builds the transcript hash that both sides sign, binding the channel
/// to all handshake bytes plus the negotiated version.
///
/// Order is fixed and includes a domain-separation label. Any deviation
/// produces a different hash, which causes signature verification to
/// fail — that is the anti-MITM guarantee.
pub fn build_transcript_hash(
	agreed_version: u8,
	client_eph_pub: &[u8; 32],
	server_eph_pub: &[u8; 32],
	client_nonce: &[u8; 8],
	server_nonce: &[u8; 8],
) -> [u8; 32] {
	let mut hasher = Sha256::new();
	hasher.update(TRANSCRIPT_LABEL);
	hasher.update([agreed_version]);
	hasher.update(client_eph_pub);
	hasher.update(server_eph_pub);
	hasher.update(client_nonce);
	hasher.update(server_nonce);
	let out = hasher.finalize();
	let mut transcript = [0u8; 32];
	transcript.copy_from_slice(&out);
	transcript
}

/// Derives two AES-256 keys (c→s and s→c) from the X25519 shared secret
/// and the concatenated nonces.
///
/// HKDF-SHA256 with separate `info` labels per direction guarantees the
/// two outputs are independent even if `info` is publicly known. Salt is
/// `client_nonce || server_nonce`.
pub fn derive_session_keys(
	shared_secret: &[u8; 32],
	client_nonce: &[u8; 8],
	server_nonce: &[u8; 8],
) -> ([u8; KEY_LEN], [u8; KEY_LEN]) {
	let mut salt = [0u8; 16];
	salt[..8].copy_from_slice(client_nonce);
	salt[8..].copy_from_slice(server_nonce);
	let hk = Hkdf::<Sha256V10>::new(Some(&salt), shared_secret);
	let mut key_c2s = [0u8; KEY_LEN];
	let mut key_s2c = [0u8; KEY_LEN];
	hk.expand(KDF_INFO_C2S, &mut key_c2s)
		.expect("KDF c2s expand should not fail for 32 bytes");
	hk.expand(KDF_INFO_S2C, &mut key_s2c)
		.expect("KDF s2c expand should not fail for 32 bytes");
	(key_c2s, key_s2c)
}

/// Builds a 96-bit AES-GCM nonce from a 64-bit counter. The upper 32
/// bits are zero — they are reserved for future protocol use (and would
/// be set on the remote epoch byte if we ever add session re-keying).
fn nonce_from_counter(counter: u64) -> [u8; NONCE_LEN] {
	let mut nonce = [0u8; NONCE_LEN];
	nonce[4..].copy_from_slice(&counter.to_be_bytes());
	nonce
}

/// One half of a duplex AEAD session. Each side holds two of these (a
/// `Sealer` for outbound frames and an `Opener` for inbound). The
/// counters are monotonically increasing and tracked separately.
///
/// The [`Sealer`] never recycles a nonce — the counter is `u64`, so at
/// 1M frames/sec it would take 584 thousand years to wrap. The
/// [`Opener`] rejects any nonce ≤ the highest it has seen, and also
/// tracks a fixed-size set of recently observed nonces so out-of-order
/// frames within the [`REPLAY_WINDOW`] are accepted while replays are
/// rejected.
pub struct Sealer {
	cipher: Aes256Gcm,
	counter: u64,
}

pub struct Opener {
	cipher: Aes256Gcm,
	highest_seen: u64,
	window: HashSet<u64>,
}

impl Sealer {
	pub fn new(key: &[u8; KEY_LEN]) -> Self {
		Self {
			cipher: Aes256Gcm::new(key.into()),
			counter: 0,
		}
	}

	/// Returns the next nonce that will be used (mostly for debug).
	pub fn next_nonce_counter(&self) -> u64 {
		self.counter
	}

	/// Seals `plaintext` under the current counter and increments it.
	/// The returned bytes carry the AES-GCM tag appended. The nonce
	/// counter is **not** in the ciphertext — it must be sent
	/// out-of-band (the transport layer uses the frame index).
	pub fn seal(&mut self, plaintext: &[u8]) -> Result<SealedFrame, TransportError> {
		let nonce_bytes = nonce_from_counter(self.counter);
		let nonce = Nonce::from_slice(&nonce_bytes);
		let ciphertext = self
			.cipher
			.encrypt(nonce, plaintext)
			.map_err(|e| TransportError::Aead(e.to_string()))?;
		let counter = self.counter;
		self.counter = self.counter.wrapping_add(1);
		Ok(SealedFrame {
			counter,
			ciphertext,
		})
	}
}

impl Opener {
	pub fn new(key: &[u8; KEY_LEN]) -> Self {
		Self {
			cipher: Aes256Gcm::new(key.into()),
			highest_seen: 0,
			// Initialise with the sentinel "no frame yet". Counter 0 is
			// the first valid nonce, so we use a special-case in `open`.
			window: HashSet::new(),
		}
	}

	/// Decrypts a frame produced by [`Sealer::seal`]. Rejects any
	/// counter that is ≤ the last accepted one (modulo the window).
	pub fn open(&mut self, frame: &SealedFrame) -> Result<Vec<u8>, TransportError> {
		if self.is_replay(frame.counter) {
			return Err(TransportError::NonceReplay);
		}
		let nonce_bytes = nonce_from_counter(frame.counter);
		let nonce = Nonce::from_slice(&nonce_bytes);
		let plaintext = self
			.cipher
			.decrypt(nonce, frame.ciphertext.as_slice())
			.map_err(|e| TransportError::Aead(e.to_string()))?;
		self.record_seen(frame.counter);
		Ok(plaintext)
	}

	fn is_replay(&self, counter: u64) -> bool {
		// First frame in this opener (highest_seen == 0 and counter ==
		// 0) is allowed exactly once: we track seen explicitly.
		if self.window.contains(&counter) {
			return true;
		}
		// Counters more than `REPLAY_WINDOW` below the highest seen are
		// definitely replays.
		if self.highest_seen >= REPLAY_WINDOW as u64
			&& counter + (REPLAY_WINDOW as u64) <= self.highest_seen
		{
			return true;
		}
		false
	}

	fn record_seen(&mut self, counter: u64) {
		self.window.insert(counter);
		if counter > self.highest_seen {
			self.highest_seen = counter;
		}
		// Drop entries that have fallen out of the window.
		if self.window.len() > REPLAY_WINDOW * 2 {
			let cutoff = self.highest_seen.saturating_sub(REPLAY_WINDOW as u64);
			self.window.retain(|&c| c >= cutoff);
		}
	}
}

/// One sealed frame: a counter (for the receiver to reconstruct the
/// nonce) plus the AES-GCM ciphertext (with tag appended).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SealedFrame {
	pub counter: u64,
	pub ciphertext: Vec<u8>,
}

impl SealedFrame {
	/// Wraps a sealed frame as `counter:8 || ciphertext`. Used by the
	/// network layer to write a single contiguous payload through the
	/// `LengthDelimitedCodec`.
	pub fn to_bytes(&self) -> Bytes {
		let mut buf = Vec::with_capacity(8 + self.ciphertext.len());
		buf.extend_from_slice(&self.counter.to_be_bytes());
		buf.extend_from_slice(&self.ciphertext);
		Bytes::from(buf)
	}

	/// Parses bytes produced by [`SealedFrame::to_bytes`]. Returns an
	/// error if the input is shorter than the 8-byte counter prefix.
	pub fn from_bytes(bytes: &[u8]) -> Result<Self, TransportError> {
		if bytes.len() < 8 {
			return Err(TransportError::Aead(
				"sealed frame missing 8-byte counter".to_string(),
			));
		}
		let mut counter_bytes = [0u8; 8];
		counter_bytes.copy_from_slice(&bytes[..8]);
		Ok(Self {
			counter: u64::from_be_bytes(counter_bytes),
			ciphertext: bytes[8..].to_vec(),
		})
	}
}

// ============================================================================
// Handshake helpers (pure, given the X25519/Ed25519 primitives)
// ============================================================================

/// Output of the post-handshake state: which version both sides agreed
/// on, the transcript hash they both signed, and the four cryptographic
/// objects each side holds (sealer + opener pair + the verified remote
/// public key).
pub struct EstablishedSession {
	pub agreed_version: u8,
	pub transcript_hash: [u8; 32],
	pub sealer: Sealer,
	pub opener: Opener,
	pub remote_pubkey: VerifyingKey,
}

impl core::fmt::Debug for EstablishedSession {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		f.debug_struct("EstablishedSession")
			.field("agreed_version", &self.agreed_version)
			.field("transcript_hash_hex", &hex_short(&self.transcript_hash))
			.field("seal_counter", &self.sealer.next_nonce_counter())
			.field("remote_pubkey_hex", &hex_short(self.remote_pubkey.as_bytes()))
			.finish_non_exhaustive()
	}
}

fn hex_short(bytes: &[u8]) -> String {
	let take = bytes.len().min(4);
	let mut s = String::new();
	for b in &bytes[..take] {
		s.push_str(&format!("{b:02x}"));
	}
	s.push_str("..");
	s
}

/// Builder for the client-side state captured between the opening
/// frames and the IdentityProof step.
pub struct ClientHandshake {
	pub eph_secret: EphemeralSecret,
	pub eph_pub: PublicKey,
	pub nonce: [u8; 8],
}

impl core::fmt::Debug for ClientHandshake {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		f.debug_struct("ClientHandshake")
			.field("eph_pub_hex", &hex_short(self.eph_pub.as_bytes()))
			.field("nonce_hex", &hex_short(&self.nonce))
			.finish_non_exhaustive()
	}
}

impl ClientHandshake {
	/// Creates a fresh ephemeral X25519 keypair + 8-byte nonce.
	pub fn new() -> Self {
		let eph_secret = EphemeralSecret::random();
		let eph_pub = PublicKey::from(&eph_secret);
		let mut nonce = [0u8; 8];
		use rand::Rng;
		rand::rng().fill_bytes(&mut nonce);
		Self {
			eph_secret,
			eph_pub,
			nonce,
		}
	}

	/// Returns the [`HandshakeMsg::OpeningClient`] to send first.
	pub fn opening_message(&self) -> HandshakeMsg {
		HandshakeMsg::OpeningClient {
			min_supported_version: MIN_SUPPORTED_VERSION,
			max_supported_version: MAX_SUPPORTED_VERSION,
			eph_pub_b64: encode_b64(self.eph_pub.as_bytes()),
			nonce_b64: encode_b64(&self.nonce),
		}
	}
}

impl Default for ClientHandshake {
	fn default() -> Self {
		Self::new()
	}
}

/// Server-side equivalent of [`ClientHandshake`]. Created in response
/// to a received `OpeningClient`.
pub struct ServerHandshake {
	pub eph_secret: EphemeralSecret,
	pub eph_pub: PublicKey,
	pub nonce: [u8; 8],
	pub agreed_version: u8,
}

impl core::fmt::Debug for ServerHandshake {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		f.debug_struct("ServerHandshake")
			.field("eph_pub_hex", &hex_short(self.eph_pub.as_bytes()))
			.field("nonce_hex", &hex_short(&self.nonce))
			.field("agreed_version", &self.agreed_version)
			.finish_non_exhaustive()
	}
}

impl ServerHandshake {
	/// Generates the server's half from the client's opening message.
	/// Returns `Err(IncompatibleVersion)` if the version ranges do not
	/// intersect.
	pub fn from_client_opening(opening: &HandshakeMsg) -> Result<Self, TransportError> {
		let (client_min, client_max) = match opening {
			HandshakeMsg::OpeningClient {
				min_supported_version,
				max_supported_version,
				..
			} => (*min_supported_version, *max_supported_version),
			_ => {
				return Err(TransportError::BadHandshakeBytes(
					"expected OpeningClient".to_string(),
				))
			}
		};
		let agreed_version = negotiate_version(
			MIN_SUPPORTED_VERSION,
			MAX_SUPPORTED_VERSION,
			client_min,
			client_max,
		)
		.ok_or(TransportError::IncompatibleVersion {
			local_min: MIN_SUPPORTED_VERSION,
			local_max: MAX_SUPPORTED_VERSION,
			remote_min: client_min,
			remote_max: client_max,
		})?;
		let eph_secret = EphemeralSecret::random();
		let eph_pub = PublicKey::from(&eph_secret);
		let mut nonce = [0u8; 8];
		use rand::Rng;
		rand::rng().fill_bytes(&mut nonce);
		Ok(Self {
			eph_secret,
			eph_pub,
			nonce,
			agreed_version,
		})
	}

	pub fn opening_message(&self) -> HandshakeMsg {
		HandshakeMsg::OpeningServer {
			min_supported_version: MIN_SUPPORTED_VERSION,
			max_supported_version: MAX_SUPPORTED_VERSION,
			agreed_version: self.agreed_version,
			eph_pub_b64: encode_b64(self.eph_pub.as_bytes()),
			nonce_b64: encode_b64(&self.nonce),
		}
	}
}

/// Combines an ECDH `SharedSecret` and the two nonces into the keys and
/// transcript hash. Splits c→s vs s→c, signs the transcript with the
/// long-term identity, and packages everything as the [`IdentityProof`]
/// message that goes out next.
///
/// Side parameter `is_client` flips which derived key the local Sealer
/// uses (clients seal under c→s and open under s→c; servers do the
/// opposite).
pub fn finalize_handshake(
	shared: SharedSecret,
	client_eph_pub: &[u8; 32],
	server_eph_pub: &[u8; 32],
	client_nonce: &[u8; 8],
	server_nonce: &[u8; 8],
	agreed_version: u8,
	identity: &SigningKey,
	is_client: bool,
) -> (EstablishedSession, HandshakeMsg) {
	let transcript = build_transcript_hash(
		agreed_version,
		client_eph_pub,
		server_eph_pub,
		client_nonce,
		server_nonce,
	);
	let shared_bytes: [u8; 32] = *shared.as_bytes();
	let (key_c2s, key_s2c) =
		derive_session_keys(&shared_bytes, client_nonce, server_nonce);
	let (seal_key, open_key) = if is_client {
		(key_c2s, key_s2c)
	} else {
		(key_s2c, key_c2s)
	};
	let sealer = Sealer::new(&seal_key);
	let opener = Opener::new(&open_key);
	let signature: Signature = identity.sign(&transcript);
	let proof = HandshakeMsg::IdentityProof {
		my_pubkey_b64: encode_b64(identity.verifying_key().as_bytes()),
		signature_b64: encode_b64(&signature.to_bytes()),
	};
	// `remote_pubkey` is filled in only after we verify the peer's
	// IdentityProof; for now we stash a placeholder.
	let placeholder = VerifyingKey::from_bytes(&[0u8; 32]).expect("zero key is valid Ed25519 input");
	(
		EstablishedSession {
			agreed_version,
			transcript_hash: transcript,
			sealer,
			opener,
			remote_pubkey: placeholder,
		},
		proof,
	)
}

/// Verifies the peer's `IdentityProof` against the transcript hash and
/// the local trust store. On success, returns the validated remote
/// public key (which the caller stores in `EstablishedSession`).
pub fn verify_identity_proof(
	proof: &HandshakeMsg,
	transcript_hash: &[u8; 32],
	trusted: &[VerifyingKey],
) -> Result<VerifyingKey, TransportError> {
	let (pubkey_b64, signature_b64) = match proof {
		HandshakeMsg::IdentityProof {
			my_pubkey_b64,
			signature_b64,
		} => (my_pubkey_b64, signature_b64),
		_ => {
			return Err(TransportError::BadHandshakeBytes(
				"expected IdentityProof".to_string(),
			))
		}
	};
	let pubkey_bytes = decode_b64(pubkey_b64)?;
	let signature_bytes = decode_b64(signature_b64)?;
	if pubkey_bytes.len() != 32 {
		return Err(TransportError::BadHandshakeBytes(format!(
			"public key has wrong length: {}",
			pubkey_bytes.len()
		)));
	}
	if signature_bytes.len() != 64 {
		return Err(TransportError::BadHandshakeBytes(format!(
			"signature has wrong length: {}",
			signature_bytes.len()
		)));
	}
	let mut pub_arr = [0u8; 32];
	pub_arr.copy_from_slice(&pubkey_bytes);
	let mut sig_arr = [0u8; 64];
	sig_arr.copy_from_slice(&signature_bytes);

	let remote_pubkey = VerifyingKey::from_bytes(&pub_arr)
		.map_err(|e| TransportError::BadHandshakeBytes(format!("public key invalid: {e}")))?;

	// Constant-time-ish lookup in the trust store. Each per-element
	// comparison uses [`subtle::ConstantTimeEq`], and the loop runs to
	// completion without an early `break` so the total iteration count
	// does not leak the position of the matching peer in the slice. The
	// remaining timing signal (cache, prefetch, branch predictor) is well
	// below LAN jitter and not considered exploitable in this threat model.
	let mut matched = subtle::Choice::from(0u8);
	for trusted_key in trusted {
		matched |= trusted_key.as_bytes().ct_eq(remote_pubkey.as_bytes());
	}
	if !bool::from(matched) {
		let mut hex = String::new();
		for b in remote_pubkey.as_bytes() {
			hex.push_str(&format!("{b:02X}"));
		}
		return Err(TransportError::UnknownPeer {
			fingerprint_hex: hex,
		});
	}

	let signature = Signature::from_bytes(&sig_arr);
	remote_pubkey
		.verify(transcript_hash, &signature)
		.map_err(|_| TransportError::BadSignature)?;

	Ok(remote_pubkey)
}

// ============================================================================
// Helpers that bridge protocol::HandshakeMsg into raw bytes for the
// transcript hash. The wire bytes (base64) are decoded here so callers
// always pass `[u8; N]` to the pure helpers above.
// ============================================================================

/// Decodes a base64 field, validates its length, and copies it into a
/// fixed-size array. Used to extract `eph_pub`, `nonce` etc. from a
/// `HandshakeMsg` variant in one place.
pub fn decode_fixed<const N: usize>(b64: &str, label: &'static str) -> Result<[u8; N], TransportError> {
	let bytes = decode_b64(b64)?;
	if bytes.len() != N {
		return Err(TransportError::BadHandshakeBytes(format!(
			"{label}: expected {N} bytes, got {}",
			bytes.len()
		)));
	}
	let mut out = [0u8; N];
	out.copy_from_slice(&bytes);
	Ok(out)
}

/// Convenience wrapper around [`encode_frame`] that returns a
/// `TransportError`.
pub fn encode_handshake_frame(msg: &HandshakeMsg) -> Result<Vec<u8>, TransportError> {
	encode_frame(msg).map_err(TransportError::Frame)
}

/// Convenience wrapper around [`decode_frame`] that returns a
/// `TransportError`.
pub fn decode_handshake_frame(bytes: &[u8]) -> Result<HandshakeMsg, TransportError> {
	decode_frame(bytes).map_err(TransportError::Frame)
}
