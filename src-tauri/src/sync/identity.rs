//! Long-term Ed25519 device identity for LAN sync (file-backed, MVP).
//!
//! Every install gets one persistent Ed25519 keypair. The 32-byte secret
//! seed is stored on disk at a caller-provided path (typically inside
//! `.kokobrain/`) with 0600 permissions on Unix; the public key and
//! fingerprint forms are derived in memory.
//!
//! The fingerprint comes in two equivalent surfaces:
//! - [`fingerprint_hex`] — first 16 hex chars of `SHA-256(public_key)`,
//!   stable across versions; used as the stable key in `peers.json`.
//! - [`fingerprint_display`] — six BIP-39 English words joined by `-`,
//!   for human side-by-side comparison during pairing.
//!
//! Storage uses a write-temp + atomic rename pattern so a crash mid-write
//! never leaves a half-written key file.
//!
//! ## Identity binding (Hotfix H2)
//!
//! The Ed25519 fingerprint is the *canonical* device identity surface
//! across mDNS, the UI, and `peers.json`. The Noise XX transport,
//! however, runs over X25519 — so the same install must present an
//! X25519 static key that is provably owned by the same operator as
//! the Ed25519 identity. The X25519 keypair is derived deterministically
//! from the Ed25519 secret (see
//! [`crate::sync::transport::static_keys_from_ed25519_secret`]), and an
//! [`IdentityProof`] containing the Ed25519 public key plus a signature
//! over the X25519 public key is exchanged after every Noise handshake.
//! The signature is loaded from / persisted to a sibling file
//! `identity-binding.sig` alongside the Ed25519 secret so a peer can
//! cheaply re-prove the binding on every reconnect.

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey, SECRET_KEY_LENGTH, SIGNATURE_LENGTH};
use rand::RngExt as _;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::wordlist::six_words_from_bytes;

/// Returns the first 16 hex characters (lowercase) of `SHA-256(public_key)`.
///
/// Stable identifier used as the primary key in the per-vault trust store
/// (`peers.json`). Deterministic for a given public key, independent of
/// platform endianness.
pub fn fingerprint_hex(public_key: &VerifyingKey) -> String {
	let digest = Sha256::digest(public_key.as_bytes());
	digest.iter().take(8).map(|b| format!("{b:02x}")).collect()
}

/// Returns six BIP-39 English words separated by `-`, derived from the
/// first 66 bits of `SHA-256(public_key)`.
///
/// Used for human verification on first-pair: both devices show the same
/// phrase and the user reads it out loud (or visually compares). Words
/// come from [`crate::sync::wordlist::BIP39_WORDS`].
pub fn fingerprint_display(public_key: &VerifyingKey) -> String {
	let digest = Sha256::digest(public_key.as_bytes());
	let words = six_words_from_bytes(&digest);
	words.join("-")
}

/// Wire-level proof that the Ed25519 identity owns the X25519 static
/// key it just authenticated over Noise.
///
/// Exchanged immediately after the Noise XX handshake completes. The
/// receiver decodes `ed25519_pub_b64` to 32 bytes, decodes
/// `binding_sig_b64` to 64 bytes, then calls `verify_strict` on the
/// signature against the verified remote X25519 static (from
/// `Session::remote_static`). A valid signature means the Ed25519
/// identity holder produced the X25519 key Noise authenticated, so
/// the Ed25519 fingerprint is the canonical identity surface.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IdentityProof {
	/// Base64-encoded raw 32-byte Ed25519 public key.
	pub ed25519_pub_b64: String,
	/// Base64-encoded 64-byte Ed25519 signature over the X25519 static
	/// public key. The signed message is exactly the X25519 public key
	/// bytes (no envelope, no domain separator), so a peer verifies
	/// against `Session::remote_static()`.
	pub binding_sig_b64: String,
}

/// In-memory device identity. Holds the Ed25519 signing key (private)
/// and the binding signature over the derived X25519 static public key.
///
/// `Debug` and `Clone` are deliberately *not* derived: cloning would
/// duplicate the secret half across threads, and the default `Debug` on
/// [`SigningKey`] would leak the secret to log output.
pub struct DeviceIdentity {
	signing_key: SigningKey,
	binding_sig: Signature,
}

impl DeviceIdentity {
	/// Generates a fresh device identity using the OS RNG via
	/// [`rand::rng`].
	///
	/// Also derives the X25519 static keypair from the new Ed25519
	/// secret and produces the binding signature over the X25519
	/// public key. The returned identity is not persisted; call
	/// [`DeviceIdentity::load_or_create`] for the on-disk flow.
	pub fn generate() -> Self {
		let mut secret = [0u8; SECRET_KEY_LENGTH];
		rand::rng().fill(&mut secret);
		let signing_key = SigningKey::from_bytes(&secret);
		let binding_sig = sign_binding(&signing_key, &secret);
		Self { signing_key, binding_sig }
	}

	/// Loads the device identity from `path`, creating it on the first
	/// call.
	///
	/// Two files participate:
	/// - `path` — raw 32-byte Ed25519 secret seed (no header, no
	///   base64). Required to be exactly [`SECRET_KEY_LENGTH`] bytes
	///   when present; otherwise this returns
	///   [`io::ErrorKind::InvalidData`].
	/// - `<parent>/identity-binding.sig` — raw 64-byte Ed25519
	///   signature over the X25519 public key derived from the loaded
	///   secret. If absent, malformed, or fails to verify against the
	///   current X25519 public, it is regenerated by signing the
	///   current X25519 public with the Ed25519 signing key and
	///   re-written with 0600 permissions on Unix.
	///
	/// If `path` does not exist, the parent directory is created (if
	/// missing), a fresh keypair is generated via [`Self::generate`], and
	/// the secret is written to a sibling temp file then atomically
	/// renamed onto `path`. On Unix, the final file is `chmod 0600`
	/// before rename. The binding signature file follows the same
	/// atomic-rename + 0600 pattern.
	///
	/// Errors propagate from the underlying filesystem operations. On
	/// disk-write failure the temp file is best-effort removed.
	pub fn load_or_create(path: &Path) -> io::Result<Self> {
		let secret = if path.exists() {
			let bytes = fs::read(path)?;
			if bytes.len() != SECRET_KEY_LENGTH {
				return Err(io::Error::new(
					io::ErrorKind::InvalidData,
					format!(
						"identity key has wrong length: expected {SECRET_KEY_LENGTH} bytes, got {}",
						bytes.len()
					),
				));
			}
			let mut secret = [0u8; SECRET_KEY_LENGTH];
			secret.copy_from_slice(&bytes);
			secret
		} else {
			// Ensure parent directory exists.
			if let Some(parent) = path.parent() {
				if !parent.as_os_str().is_empty() {
					fs::create_dir_all(parent)?;
				}
			}

			let mut secret = [0u8; SECRET_KEY_LENGTH];
			rand::rng().fill(&mut secret);

			// Atomic write: temp file alongside + rename.
			let tmp_path = temp_path_for(path);
			write_with_perms(&tmp_path, &secret)?;
			if let Err(e) = fs::rename(&tmp_path, path) {
				let _ = fs::remove_file(&tmp_path);
				return Err(e);
			}
			secret
		};

		let signing_key = SigningKey::from_bytes(&secret);
		let binding_path = binding_path_for(path);
		let binding_sig = load_or_create_binding(&binding_path, &signing_key, &secret)?;

		Ok(Self { signing_key, binding_sig })
	}

	/// Returns the public verifying key. Cheap — derives from the cached
	/// signing key on each call.
	pub fn public_key(&self) -> VerifyingKey {
		self.signing_key.verifying_key()
	}

	/// Returns the stable hex fingerprint. See [`fingerprint_hex`].
	pub fn fingerprint_hex(&self) -> String {
		fingerprint_hex(&self.public_key())
	}

	/// Returns the six-word display fingerprint. See [`fingerprint_display`].
	pub fn fingerprint_display(&self) -> String {
		fingerprint_display(&self.public_key())
	}

	/// Signs `msg` with the device's Ed25519 signing key. The signature
	/// is verifiable with the matching public key from [`Self::public_key`].
	pub fn sign(&self, msg: &[u8]) -> Signature {
		self.signing_key.sign(msg)
	}

	/// Returns the [`IdentityProof`] this device sends to a freshly-
	/// handshaked peer.
	///
	/// The proof contains the base64-encoded Ed25519 public key (32
	/// bytes when decoded) and the base64-encoded binding signature (64
	/// bytes when decoded) over the device's X25519 static public key.
	/// Callers send this as a single encrypted JSON frame after Noise
	/// XX completes; the peer verifies the signature against the
	/// remote-static it just learned.
	pub fn identity_proof(&self) -> IdentityProof {
		IdentityProof {
			ed25519_pub_b64: BASE64.encode(self.public_key().as_bytes()),
			binding_sig_b64: BASE64.encode(self.binding_sig.to_bytes()),
		}
	}
}

/// Returns the sibling path for the binding-signature file:
/// `<parent_of_identity_key>/identity-binding.sig`. Used by
/// [`DeviceIdentity::load_or_create`] so both files live next to each
/// other under `<vault>/.kokobrain/`.
fn binding_path_for(identity_key_path: &Path) -> PathBuf {
	identity_key_path
		.parent()
		.map(|p| p.join("identity-binding.sig"))
		.unwrap_or_else(|| PathBuf::from("identity-binding.sig"))
}

/// Produces the binding signature for an Ed25519 secret seed. Derives
/// the X25519 static public key from `secret` and signs those 32 bytes
/// with `signing_key`. Used by both the in-memory generation path and
/// the on-disk regeneration path inside [`load_or_create_binding`].
fn sign_binding(signing_key: &SigningKey, secret: &[u8; SECRET_KEY_LENGTH]) -> Signature {
	let keys = crate::sync::transport::static_keys_from_ed25519_secret(secret);
	signing_key.sign(&keys.public)
}

/// Loads, validates, and (when needed) regenerates the binding
/// signature file at `binding_path`.
///
/// Validation rules:
/// - file must exist
/// - must be exactly [`SIGNATURE_LENGTH`] (64) bytes
/// - must verify with `signing_key.verifying_key()` against the
///   X25519 public derived from `secret`
///
/// On any failure (missing, wrong length, verify error) the function
/// signs a fresh binding over the current X25519 public and atomically
/// writes it to `binding_path` with 0600 permissions on Unix. Returns
/// the live [`Signature`] in either case.
fn load_or_create_binding(
	binding_path: &Path,
	signing_key: &SigningKey,
	secret: &[u8; SECRET_KEY_LENGTH],
) -> io::Result<Signature> {
	let verifying = signing_key.verifying_key();
	let keys = crate::sync::transport::static_keys_from_ed25519_secret(secret);

	if binding_path.exists() {
		let bytes = fs::read(binding_path)?;
		if bytes.len() == SIGNATURE_LENGTH {
			let mut sig_bytes = [0u8; SIGNATURE_LENGTH];
			sig_bytes.copy_from_slice(&bytes);
			let sig = Signature::from_bytes(&sig_bytes);
			if verifying.verify_strict(&keys.public, &sig).is_ok() {
				return Ok(sig);
			}
		}
		// fall through and regenerate
	}

	// Ensure parent dir exists (mirrors load_or_create's contract).
	if let Some(parent) = binding_path.parent() {
		if !parent.as_os_str().is_empty() {
			fs::create_dir_all(parent)?;
		}
	}

	let sig = signing_key.sign(&keys.public);
	let tmp_path = temp_path_for(binding_path);
	if let Err(e) = write_with_perms(&tmp_path, &sig.to_bytes()) {
		let _ = fs::remove_file(&tmp_path);
		return Err(e);
	}
	if let Err(e) = fs::rename(&tmp_path, binding_path) {
		let _ = fs::remove_file(&tmp_path);
		return Err(e);
	}
	Ok(sig)
}

/// Returns a sibling temp path for `path` used by the atomic-write flow.
/// Same directory, same filename plus `.tmp` suffix.
fn temp_path_for(path: &Path) -> PathBuf {
	let mut tmp = path.as_os_str().to_owned();
	tmp.push(".tmp");
	PathBuf::from(tmp)
}

/// Writes `bytes` to `path` with restrictive permissions on Unix
/// (0600 — owner read/write only). On non-Unix platforms the file is
/// created with default permissions; sandboxing is platform-specific.
fn write_with_perms(path: &Path, bytes: &[u8]) -> io::Result<()> {
	fs::write(path, bytes)?;
	#[cfg(unix)]
	{
		use std::os::unix::fs::PermissionsExt;
		let mut perms = fs::metadata(path)?.permissions();
		perms.set_mode(0o600);
		fs::set_permissions(path, perms)?;
	}
	Ok(())
}
