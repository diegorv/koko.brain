//! TCP wire driver for the initial pairing flow. Sits on top of
//! `crate::sync::pairing` (which owns the pure SPAKE2 state machine)
//! and `crate::sync::transport` (Sealer/Opener + transcript binding)
//! to negotiate a mutually-verified remote identity over an
//! `AsyncRead + AsyncWrite` stream.
//!
//! What this module proves at the end of [`run_pairing_host`] /
//! [`run_pairing_guest`]:
//! 1. The peer typed the same passphrase (SPAKE2 cannot complete
//!    otherwise).
//! 2. The peer holds the Ed25519 secret key matching the
//!    `public_key_b64` they sent (signature verification under the
//!    transcript hash).
//! 3. The transcript hash binds the SPAKE2 messages, so an attacker
//!    cannot replay an `IdentityProof` from a previous pairing.
//!
//! The user-confirmation choreography (showing the remote fingerprint
//! to the user, waiting on a `confirm/reject` button) lives in the
//! Tauri command layer that *calls* these helpers, not here. This
//! module just hands the caller a verified [`RemotePeerIdentity`]
//! and lets them decide what to write to `peers.json`.
//!
//! Wire protocol (length-delimited JSON frames):
//! 1. Each side sends `PairFrame::SpakeMsg { msg_b64 }`.
//! 2. Each side calls `finish_pairing_{host,guest}` -> 32-byte
//!    `K_pair`. From `K_pair` we derive a pair of AEAD keys via
//!    [`transport::derive_session_keys`] with fixed 8-byte
//!    pseudo-nonces (`"pair-h2g"` and `"pair-g2h"`) - the
//!    derivation function is keyed by `K_pair`, so the result is
//!    unique per pairing.
//! 3. Each side computes
//!    `transcript = SHA256("kokobrain-pair-v1" || host_spake || guest_spake)`,
//!    signs it with its long-term Ed25519 identity, seals the
//!    proof with the local-side Sealer, and sends
//!    `PairFrame::IdentityProof { pubkey_b64, signature_b64,
//!    sealed_counter, sealed_ciphertext }`.
//! 4. Each side opens the peer's proof, decodes the pubkey, verifies
//!    the signature against the (already-computed) transcript, and
//!    returns the remote identity to the caller.

use ed25519_dalek::{Signature, Signer, VerifyingKey};
use futures_util::sink::SinkExt;
use futures_util::stream::StreamExt;
use serde::{Deserialize, Serialize};
use sha2_v10::{Digest, Sha256};
use tokio::io::{AsyncRead, AsyncWrite};
use tokio_util::bytes::Bytes;
use tokio_util::codec::{Framed, LengthDelimitedCodec};

use crate::sync::identity::{fingerprint_of, format_fingerprint, PeerIdentity};
use crate::sync::pairing::{
	finish_pairing_guest, finish_pairing_host, start_pairing_guest, start_pairing_host,
	PairingError,
};
use crate::sync::protocol::{decode_b64, decode_frame, encode_b64, encode_frame, MAX_FRAME_SIZE};
use crate::sync::transport::{
	derive_session_keys, Opener, Sealer, SealedFrame, TransportError,
};

/// Domain-separation label for the pairing transcript. Distinct from
/// the session-transport label so a recorded session handshake can't
/// be replayed as a pairing handshake and vice versa.
const PAIR_TRANSCRIPT_LABEL: &[u8] = b"kokobrain-pair-v1";

/// Fixed 8-byte pseudo-nonces fed into
/// [`transport::derive_session_keys`] for the post-SPAKE2 AEAD
/// keys. They are not secrets; they just provide directional
/// separation between the host->guest and guest->host streams. The
/// secret material is `K_pair` itself.
const PAIR_NONCE_H2G: [u8; 8] = *b"pair-h2g";
const PAIR_NONCE_G2H: [u8; 8] = *b"pair-g2h";

/// Information the caller (Tauri command layer) receives back after
/// a successful pairing handshake. The caller is responsible for
/// surfacing this to the UI (via a `pairing-passphrase-required`
/// event) and persisting the trust entry on confirm.
#[derive(Debug, Clone)]
pub struct RemotePeerIdentity {
	/// 32-byte Ed25519 public key the peer proved control of.
	pub verifying_key: VerifyingKey,
	/// 8-byte SHA-256 fingerprint of the public key
	/// (`sync::identity::fingerprint_of`).
	pub fingerprint: [u8; 8],
	/// `XXXX-XXXX-XXXX-XXXX` hex form for trust-store keying.
	pub fingerprint_hex: String,
}

/// Errors emitted from any phase of the pairing wire driver.
#[derive(Debug)]
pub enum PairingSessionError {
	/// Stream I/O failure during framing.
	Io(std::io::Error),
	/// Framing (JSON / length) error.
	Framing(String),
	/// SPAKE2 failed - passphrases did not match.
	Spake(PairingError),
	/// AEAD seal/open failure or transcript signature verification
	/// failure. The peer either lied or the wire was tampered with.
	Transport(TransportError),
	/// Peer closed the stream before the handshake completed.
	UnexpectedEof,
	/// A frame variant arrived out of the expected sequence.
	OutOfOrder(&'static str),
}

impl core::fmt::Display for PairingSessionError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Io(e) => write!(f, "pairing io: {e}"),
			Self::Framing(s) => write!(f, "pairing framing: {s}"),
			Self::Spake(e) => write!(f, "pairing spake: {e}"),
			Self::Transport(e) => write!(f, "pairing transport: {e}"),
			Self::UnexpectedEof => write!(f, "peer closed before pairing completed"),
			Self::OutOfOrder(s) => write!(f, "pairing wire out of order: expected {s}"),
		}
	}
}

impl std::error::Error for PairingSessionError {}

impl From<std::io::Error> for PairingSessionError {
	fn from(e: std::io::Error) -> Self {
		Self::Io(e)
	}
}

impl From<PairingError> for PairingSessionError {
	fn from(e: PairingError) -> Self {
		Self::Spake(e)
	}
}

impl From<TransportError> for PairingSessionError {
	fn from(e: TransportError) -> Self {
		Self::Transport(e)
	}
}

/// Wire frames exchanged during pairing. Each variant carries the
/// minimum information needed for its step. AEAD-protected payloads
/// live inside the `sealed_*` fields and are opened only after both
/// sides have derived `K_pair`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
enum PairFrame {
	/// SPAKE2 first message. Sent unencrypted because both sides
	/// need it before they can derive any AEAD key.
	SpakeMsg { msg_b64: String },
	/// AEAD-sealed Ed25519 identity proof. Decoded only after
	/// `K_pair` is established.
	IdentityProof {
		sealed_counter: u64,
		sealed_ciphertext_b64: String,
	},
}

/// Inner plaintext encoded inside a sealed `IdentityProof` frame.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct IdentityProofPlaintext {
	pubkey_b64: String,
	signature_b64: String,
}

/// Drives the host (passphrase generator) side of the pairing flow.
/// The caller passes in a stream that is already connected to the
/// guest. Returns the verified remote identity once both sides
/// complete their `IdentityProof` exchange.
pub async fn run_pairing_host<S>(
	stream: S,
	passphrase: &str,
	identity: &PeerIdentity,
) -> Result<RemotePeerIdentity, PairingSessionError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let mut framed = build_framed(stream);

	// 1. SPAKE2 message exchange.
	let (host_state, host_msg) = start_pairing_host(passphrase)?;
	send_frame(
		&mut framed,
		&PairFrame::SpakeMsg {
			msg_b64: encode_b64(&host_msg),
		},
	)
	.await?;
	let guest_msg = expect_spake_msg(&mut framed).await?;

	// 2. Derive K_pair, AEAD keys, transcript hash.
	let k_pair = finish_pairing_host(host_state, &guest_msg)?;
	let (key_h2g, key_g2h) = derive_session_keys(&k_pair, &PAIR_NONCE_H2G, &PAIR_NONCE_G2H);
	let transcript = pair_transcript(&host_msg, &guest_msg);

	// 3. Exchange IdentityProof: host seals under h2g, opens under g2h.
	let mut sealer = Sealer::new(&key_h2g);
	let mut opener = Opener::new(&key_g2h);
	let remote = exchange_identity_proof(
		&mut framed,
		identity,
		&transcript,
		&mut sealer,
		&mut opener,
	)
	.await?;
	Ok(remote)
}

/// Mirror of [`run_pairing_host`] for the guest (passphrase typist).
pub async fn run_pairing_guest<S>(
	stream: S,
	passphrase: &str,
	identity: &PeerIdentity,
) -> Result<RemotePeerIdentity, PairingSessionError>
where
	S: AsyncRead + AsyncWrite + Unpin + Send,
{
	let mut framed = build_framed(stream);

	// 1. SPAKE2 message exchange. The guest receives the host's
	//    message first (the host opened the listener) before sending
	//    its own - mirror of the host's send-then-recv order.
	let host_msg = expect_spake_msg(&mut framed).await?;
	let (guest_state, guest_msg) = start_pairing_guest(passphrase)?;
	send_frame(
		&mut framed,
		&PairFrame::SpakeMsg {
			msg_b64: encode_b64(&guest_msg),
		},
	)
	.await?;

	let k_pair = finish_pairing_guest(guest_state, &host_msg)?;
	let (key_h2g, key_g2h) = derive_session_keys(&k_pair, &PAIR_NONCE_H2G, &PAIR_NONCE_G2H);
	let transcript = pair_transcript(&host_msg, &guest_msg);

	// Guest seals under g2h, opens under h2g (mirror of host).
	let mut sealer = Sealer::new(&key_g2h);
	let mut opener = Opener::new(&key_h2g);
	let remote = exchange_identity_proof(
		&mut framed,
		identity,
		&transcript,
		&mut sealer,
		&mut opener,
	)
	.await?;
	Ok(remote)
}

/// Builds the length-delimited codec used for pairing frames.
/// Identical configuration to the session driver (8 MiB cap, 4-byte
/// big-endian length).
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

async fn send_frame<S>(
	framed: &mut Framed<S, LengthDelimitedCodec>,
	frame: &PairFrame,
) -> Result<(), PairingSessionError>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	let bytes = encode_frame(frame).map_err(|e| PairingSessionError::Framing(e.to_string()))?;
	framed
		.send(Bytes::from(bytes))
		.await
		.map_err(PairingSessionError::Io)
}

async fn recv_frame<S>(
	framed: &mut Framed<S, LengthDelimitedCodec>,
) -> Result<PairFrame, PairingSessionError>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	let frame = framed
		.next()
		.await
		.ok_or(PairingSessionError::UnexpectedEof)?
		.map_err(PairingSessionError::Io)?;
	decode_frame(&frame).map_err(|e| PairingSessionError::Framing(e.to_string()))
}

async fn expect_spake_msg<S>(
	framed: &mut Framed<S, LengthDelimitedCodec>,
) -> Result<Vec<u8>, PairingSessionError>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	match recv_frame(framed).await? {
		PairFrame::SpakeMsg { msg_b64 } => {
			decode_b64(&msg_b64).map_err(|e| PairingSessionError::Framing(e.to_string()))
		}
		_ => Err(PairingSessionError::OutOfOrder("SpakeMsg")),
	}
}

/// Builds the 32-byte SHA-256 transcript hash. Sequence is
/// `label || host_msg_len_be || host_msg || guest_msg_len_be ||
/// guest_msg` so two messages of different lengths cannot pun.
fn pair_transcript(host_msg: &[u8], guest_msg: &[u8]) -> [u8; 32] {
	let mut hasher = Sha256::new();
	hasher.update(PAIR_TRANSCRIPT_LABEL);
	hasher.update((host_msg.len() as u64).to_be_bytes());
	hasher.update(host_msg);
	hasher.update((guest_msg.len() as u64).to_be_bytes());
	hasher.update(guest_msg);
	hasher.finalize().into()
}

/// Implements the "both sides seal their IdentityProof, exchange,
/// verify the other's" portion of the handshake. Returns the verified
/// remote identity. Order-agnostic: callers send their own proof
/// before reading the peer's.
async fn exchange_identity_proof<S>(
	framed: &mut Framed<S, LengthDelimitedCodec>,
	local_identity: &PeerIdentity,
	transcript: &[u8; 32],
	sealer: &mut Sealer,
	opener: &mut Opener,
) -> Result<RemotePeerIdentity, PairingSessionError>
where
	S: AsyncRead + AsyncWrite + Unpin,
{
	// Build + seal local proof.
	let signature: Signature = local_identity.signing_key().sign(transcript);
	let proof = IdentityProofPlaintext {
		pubkey_b64: encode_b64(local_identity.verifying_key().as_bytes()),
		signature_b64: encode_b64(&signature.to_bytes()),
	};
	let plaintext = encode_frame(&proof).map_err(|e| PairingSessionError::Framing(e.to_string()))?;
	let sealed = sealer.seal(&plaintext)?;
	send_frame(
		framed,
		&PairFrame::IdentityProof {
			sealed_counter: sealed.counter,
			sealed_ciphertext_b64: encode_b64(&sealed.ciphertext),
		},
	)
	.await?;

	// Receive + open peer's proof.
	let frame = recv_frame(framed).await?;
	let (counter, ct_b64) = match frame {
		PairFrame::IdentityProof {
			sealed_counter,
			sealed_ciphertext_b64,
		} => (sealed_counter, sealed_ciphertext_b64),
		_ => return Err(PairingSessionError::OutOfOrder("IdentityProof")),
	};
	let ciphertext =
		decode_b64(&ct_b64).map_err(|e| PairingSessionError::Framing(e.to_string()))?;
	let sealed = SealedFrame {
		counter,
		ciphertext,
	};
	let plaintext = opener.open(&sealed)?;
	let peer_proof: IdentityProofPlaintext = decode_frame(&plaintext)
		.map_err(|e| PairingSessionError::Framing(e.to_string()))?;

	// Verify signature against the (already-computed) transcript.
	let pubkey_bytes =
		decode_b64(&peer_proof.pubkey_b64).map_err(|e| PairingSessionError::Framing(e.to_string()))?;
	if pubkey_bytes.len() != 32 {
		return Err(PairingSessionError::Transport(
			TransportError::BadHandshakeBytes(format!(
				"pubkey has wrong length: {}",
				pubkey_bytes.len()
			)),
		));
	}
	let sig_bytes = decode_b64(&peer_proof.signature_b64)
		.map_err(|e| PairingSessionError::Framing(e.to_string()))?;
	if sig_bytes.len() != 64 {
		return Err(PairingSessionError::Transport(
			TransportError::BadHandshakeBytes(format!(
				"signature has wrong length: {}",
				sig_bytes.len()
			)),
		));
	}
	let mut pubkey_arr = [0u8; 32];
	pubkey_arr.copy_from_slice(&pubkey_bytes);
	let mut sig_arr = [0u8; 64];
	sig_arr.copy_from_slice(&sig_bytes);
	let remote_pubkey = VerifyingKey::from_bytes(&pubkey_arr).map_err(|e| {
		PairingSessionError::Transport(TransportError::BadHandshakeBytes(format!(
			"pubkey invalid: {e}"
		)))
	})?;
	let signature = Signature::from_bytes(&sig_arr);
	remote_pubkey
		.verify_strict(transcript, &signature)
		.map_err(|_| PairingSessionError::Transport(TransportError::BadSignature))?;

	let fp = fingerprint_of(&remote_pubkey);
	Ok(RemotePeerIdentity {
		verifying_key: remote_pubkey,
		fingerprint: fp,
		fingerprint_hex: format_fingerprint(&fp),
	})
}
