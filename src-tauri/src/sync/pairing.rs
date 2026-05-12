//! Initial pairing flow: PAKE handshake authenticated by a Diceware
//! passphrase + persistent trust store at
//! `<vault>/.kokobrain/lan-sync/peers.json`.
//!
//! Pairing happens once per device pair. After both sides confirm each
//! other's Ed25519 fingerprint, their public keys are written to the
//! trust store; future sessions go through the session handshake in
//! [`crate::sync::transport`] without re-running PAKE.
//!
//! The PAKE is SPAKE2 over Ed25519 (the `spake2` crate). Both sides
//! type the same 7-word Diceware passphrase, which is normalised by
//! [`crate::sync::wordlist::normalize`] into the same canonical bytes.
//! SPAKE2 derives a 32-byte session key without ever sending the
//! passphrase over the wire; even an attacker who captures the full
//! handshake cannot brute-force the passphrase offline.
//!
//! On the success path the caller hands the derived `K_pair` to the
//! transport AEAD and uses [`crate::sync::transport::finalize_handshake`]
//! to exchange long-term Ed25519 keys + transcript signatures. After
//! both users visually confirm the fingerprints in the UI, the peer is
//! added to the trust store.

use serde::{Deserialize, Serialize};
use spake2::{Ed25519Group, Identity, Password, Spake2};
use std::path::{Path, PathBuf};

use crate::sync::wordlist::{self, PassphraseError};

/// Filename of the trust store inside `.kokobrain/lan-sync/`.
pub const PEERS_FILE: &str = "peers.json";

/// Versioning for `peers.json`. Bump on schema-breaking changes.
pub const CURRENT_PEERS_VERSION: u32 = 1;

/// SPAKE2 identity for the side that initiates the pairing
/// (`start_pairing_host` — the user who hits "Generate passphrase").
pub const PAIRING_ID_HOST: &[u8] = b"kokobrain-pair-host";

/// SPAKE2 identity for the side that joins.
pub const PAIRING_ID_GUEST: &[u8] = b"kokobrain-pair-guest";

/// One trusted peer record on disk.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrustedPeer {
	pub fingerprint_hex: String,
	pub display_name: String,
	/// Base64 of the 32-byte Ed25519 public key. Persisted so we can
	/// recover the full key even if the fingerprint hex is the only
	/// thing the UI shows.
	pub public_key_b64: String,
	pub trusted_at_ms: i64,
}

/// On-disk wrapper.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeersFile {
	pub version: u32,
	pub peers: Vec<TrustedPeer>,
}

impl Default for PeersFile {
	fn default() -> Self {
		Self {
			version: CURRENT_PEERS_VERSION,
			peers: Vec::new(),
		}
	}
}

/// Errors surfaced during pairing or trust-store I/O.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PairingError {
	/// User-provided passphrase did not pass `wordlist::normalize`.
	Passphrase(PassphraseError),
	/// `spake2::finish` returned an error (typically when the
	/// passphrase didn't match on the two sides).
	PakeFailed,
	/// `peers.json` could not be read/written.
	Io(String),
	/// Malformed `peers.json` content.
	Decode(String),
	/// Unsupported `version` field in `peers.json`.
	VersionMismatch { found: u32, supported: u32 },
	/// Tried to remove a fingerprint that wasn't in the trust store.
	UnknownPeer(String),
	/// A `peers.json` entry has a `public_key_b64` field that is not
	/// valid base64 or does not decode to exactly 32 Ed25519 bytes.
	/// Carries the offending fingerprint so the user can locate the row.
	TrustStoreCorrupt {
		fingerprint_hex: String,
		reason: String,
	},
}

impl core::fmt::Display for PairingError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Passphrase(e) => write!(f, "passphrase: {e}"),
			Self::PakeFailed => write!(f, "incorrect passphrase"),
			Self::Io(msg) => write!(f, "peers.json I/O: {msg}"),
			Self::Decode(msg) => write!(f, "peers.json decode: {msg}"),
			Self::VersionMismatch { found, supported } => write!(
				f,
				"unsupported peers.json version {found} (supported: {supported})"
			),
			Self::UnknownPeer(fp) => write!(f, "no trusted peer with fingerprint {fp}"),
			Self::TrustStoreCorrupt {
				fingerprint_hex,
				reason,
			} => write!(
				f,
				"peers.json entry {fingerprint_hex} is corrupt: {reason}"
			),
		}
	}
}

impl std::error::Error for PairingError {}

impl From<PassphraseError> for PairingError {
	fn from(e: PassphraseError) -> Self {
		PairingError::Passphrase(e)
	}
}

// ============================================================================
// SPAKE2 entry points
// ============================================================================

/// State retained by the host side between sending its outbound
/// message and receiving the guest's. Consumed by [`finish_pairing_host`].
pub struct HostPairingState {
	inner: Spake2<Ed25519Group>,
}

impl core::fmt::Debug for HostPairingState {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		f.debug_struct("HostPairingState")
			.finish_non_exhaustive()
	}
}

/// State retained by the guest side. Consumed by [`finish_pairing_guest`].
pub struct GuestPairingState {
	inner: Spake2<Ed25519Group>,
}

impl core::fmt::Debug for GuestPairingState {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		f.debug_struct("GuestPairingState")
			.finish_non_exhaustive()
	}
}

/// First half of the host side: normalise the passphrase and build
/// the SPAKE2 message to send to the guest. Returns the held state
/// (to consume later via [`finish_pairing_host`]) and the bytes the
/// transport must put on the wire.
pub fn start_pairing_host(
	passphrase: &str,
) -> Result<(HostPairingState, Vec<u8>), PairingError> {
	let canonical = wordlist::normalize(passphrase)?;
	let (state, msg) = Spake2::<Ed25519Group>::start_a(
		&Password::new(canonical.as_bytes()),
		&Identity::new(PAIRING_ID_HOST),
		&Identity::new(PAIRING_ID_GUEST),
	);
	Ok((HostPairingState { inner: state }, msg))
}

/// First half of the guest side.
pub fn start_pairing_guest(
	passphrase: &str,
) -> Result<(GuestPairingState, Vec<u8>), PairingError> {
	let canonical = wordlist::normalize(passphrase)?;
	let (state, msg) = Spake2::<Ed25519Group>::start_b(
		&Password::new(canonical.as_bytes()),
		&Identity::new(PAIRING_ID_HOST),
		&Identity::new(PAIRING_ID_GUEST),
	);
	Ok((GuestPairingState { inner: state }, msg))
}

/// Consumes the host state and the guest's message, returning the
/// derived 32-byte session key when the passphrases match.
pub fn finish_pairing_host(
	state: HostPairingState,
	guest_msg: &[u8],
) -> Result<[u8; 32], PairingError> {
	let key = state.inner.finish(guest_msg).map_err(|_| PairingError::PakeFailed)?;
	to_32_bytes(&key)
}

/// Consumes the guest state and the host's message.
pub fn finish_pairing_guest(
	state: GuestPairingState,
	host_msg: &[u8],
) -> Result<[u8; 32], PairingError> {
	let key = state.inner.finish(host_msg).map_err(|_| PairingError::PakeFailed)?;
	to_32_bytes(&key)
}

fn to_32_bytes(key: &[u8]) -> Result<[u8; 32], PairingError> {
	if key.len() < 32 {
		return Err(PairingError::PakeFailed);
	}
	let mut out = [0u8; 32];
	out.copy_from_slice(&key[..32]);
	Ok(out)
}

// ============================================================================
// peers.json persistence
// ============================================================================

/// Returns the on-disk path of `peers.json` for the given vault root.
pub fn peers_file_path(vault_root: &Path) -> PathBuf {
	vault_root.join(".kokobrain").join("lan-sync").join(PEERS_FILE)
}

/// Reads `peers.json`. Returns an empty [`PeersFile`] when missing.
///
/// Every entry's `public_key_b64` is decoded and length-checked at this
/// boundary so the transport layer can assume it is dealing with valid
/// 32-byte Ed25519 keys. A corrupt or hand-edited entry surfaces as
/// [`PairingError::TrustStoreCorrupt`] with the offending fingerprint
/// in the error payload instead of failing far downstream with a
/// generic `BadHandshakeBytes`.
pub fn read_peers(vault_root: &Path) -> Result<PeersFile, PairingError> {
	let path = peers_file_path(vault_root);
	if !path.exists() {
		return Ok(PeersFile::default());
	}
	let raw = std::fs::read_to_string(&path).map_err(|e| PairingError::Io(e.to_string()))?;
	let parsed: PeersFile =
		serde_json::from_str(&raw).map_err(|e| PairingError::Decode(e.to_string()))?;
	if parsed.version != CURRENT_PEERS_VERSION {
		return Err(PairingError::VersionMismatch {
			found: parsed.version,
			supported: CURRENT_PEERS_VERSION,
		});
	}
	for peer in &parsed.peers {
		validate_trusted_peer_pubkey(peer)?;
	}
	Ok(parsed)
}

/// Decodes a [`TrustedPeer::public_key_b64`] field and checks it carries
/// exactly 32 bytes. Returns [`PairingError::TrustStoreCorrupt`] on any
/// deviation so `peers.json` corruption (manual edit, copy-paste error,
/// disk bit-rot) is reported at load time rather than at the next
/// session handshake.
fn validate_trusted_peer_pubkey(peer: &TrustedPeer) -> Result<(), PairingError> {
	use base64::Engine;
	let bytes = base64::engine::general_purpose::STANDARD
		.decode(&peer.public_key_b64)
		.map_err(|e| PairingError::TrustStoreCorrupt {
			fingerprint_hex: peer.fingerprint_hex.clone(),
			reason: format!("public_key_b64 is not valid base64: {e}"),
		})?;
	if bytes.len() != 32 {
		return Err(PairingError::TrustStoreCorrupt {
			fingerprint_hex: peer.fingerprint_hex.clone(),
			reason: format!(
				"public_key_b64 decodes to {} bytes, expected 32",
				bytes.len()
			),
		});
	}
	Ok(())
}

/// Writes `peers.json`. Creates the parent directory on demand.
pub fn write_peers(vault_root: &Path, file: &PeersFile) -> Result<(), PairingError> {
	if file.version != CURRENT_PEERS_VERSION {
		return Err(PairingError::VersionMismatch {
			found: file.version,
			supported: CURRENT_PEERS_VERSION,
		});
	}
	let path = peers_file_path(vault_root);
	if let Some(parent) = path.parent() {
		std::fs::create_dir_all(parent).map_err(|e| PairingError::Io(e.to_string()))?;
	}
	let serialized =
		serde_json::to_string_pretty(file).map_err(|e| PairingError::Decode(e.to_string()))?;
	std::fs::write(&path, serialized).map_err(|e| PairingError::Io(e.to_string()))?;
	Ok(())
}

/// Adds (or replaces) a trusted peer entry by fingerprint.
pub fn add_trusted_peer(
	vault_root: &Path,
	peer: TrustedPeer,
) -> Result<(), PairingError> {
	let mut file = read_peers(vault_root)?;
	file.peers
		.retain(|existing| existing.fingerprint_hex != peer.fingerprint_hex);
	file.peers.push(peer);
	write_peers(vault_root, &file)
}

/// Removes a trusted peer by fingerprint. Returns
/// [`PairingError::UnknownPeer`] if the fingerprint is not in the
/// trust store.
pub fn remove_trusted_peer(
	vault_root: &Path,
	fingerprint_hex: &str,
) -> Result<(), PairingError> {
	let mut file = read_peers(vault_root)?;
	let before = file.peers.len();
	file.peers
		.retain(|existing| existing.fingerprint_hex != fingerprint_hex);
	if file.peers.len() == before {
		return Err(PairingError::UnknownPeer(fingerprint_hex.to_string()));
	}
	write_peers(vault_root, &file)
}

/// Returns true if a peer with that fingerprint is in the trust store.
pub fn is_trusted(vault_root: &Path, fingerprint_hex: &str) -> Result<bool, PairingError> {
	let file = read_peers(vault_root)?;
	Ok(file
		.peers
		.iter()
		.any(|p| p.fingerprint_hex == fingerprint_hex))
}
