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

use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use ed25519_dalek::{Signature, Signer, SigningKey, VerifyingKey, SECRET_KEY_LENGTH};
use rand::RngExt as _;
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

/// In-memory device identity. Holds the Ed25519 signing key (private)
/// and derives the public key + fingerprint surfaces on demand.
///
/// `Debug` and `Clone` are deliberately *not* derived: cloning would
/// duplicate the secret half across threads, and the default `Debug` on
/// [`SigningKey`] would leak the secret to log output.
pub struct DeviceIdentity {
	signing_key: SigningKey,
}

impl DeviceIdentity {
	/// Generates a fresh device identity using the OS RNG via
	/// [`rand::rng`]. The returned identity is not persisted; call
	/// [`DeviceIdentity::load_or_create`] for the on-disk flow.
	pub fn generate() -> Self {
		let mut secret = [0u8; SECRET_KEY_LENGTH];
		rand::rng().fill(&mut secret);
		let signing_key = SigningKey::from_bytes(&secret);
		Self { signing_key }
	}

	/// Loads the device identity from `path`, creating it on the first
	/// call.
	///
	/// File format is the raw 32-byte secret seed (no header, no base64).
	/// If `path` exists, the file is read and required to be exactly
	/// [`SECRET_KEY_LENGTH`] bytes; otherwise this returns
	/// [`io::ErrorKind::InvalidData`].
	///
	/// If `path` does not exist, the parent directory is created (if
	/// missing), a fresh keypair is generated via [`Self::generate`], and
	/// the secret is written to a sibling temp file then atomically
	/// renamed onto `path`. On Unix, the final file is `chmod 0600`
	/// before rename.
	///
	/// Errors propagate from the underlying filesystem operations. On
	/// disk-write failure the temp file is best-effort removed.
	pub fn load_or_create(path: &Path) -> io::Result<Self> {
		if path.exists() {
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
			let signing_key = SigningKey::from_bytes(&secret);
			return Ok(Self { signing_key });
		}

		// Ensure parent directory exists.
		if let Some(parent) = path.parent() {
			if !parent.as_os_str().is_empty() {
				fs::create_dir_all(parent)?;
			}
		}

		let identity = Self::generate();
		let secret = identity.signing_key.to_bytes();

		// Atomic write: temp file alongside + rename.
		let tmp_path = temp_path_for(path);
		write_secret(&tmp_path, &secret)?;
		if let Err(e) = fs::rename(&tmp_path, path) {
			let _ = fs::remove_file(&tmp_path);
			return Err(e);
		}

		Ok(identity)
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
}

/// Returns a sibling temp path for `path` used by the atomic-write flow.
/// Same directory, same filename plus `.tmp` suffix.
fn temp_path_for(path: &Path) -> PathBuf {
	let mut tmp = path.as_os_str().to_owned();
	tmp.push(".tmp");
	PathBuf::from(tmp)
}

/// Writes `secret` to `path` with restrictive permissions on Unix
/// (0600 — owner read/write only). On non-Unix platforms the file is
/// created with default permissions; sandboxing is platform-specific.
fn write_secret(path: &Path, secret: &[u8; SECRET_KEY_LENGTH]) -> io::Result<()> {
	fs::write(path, secret)?;
	#[cfg(unix)]
	{
		use std::os::unix::fs::PermissionsExt;
		let mut perms = fs::metadata(path)?.permissions();
		perms.set_mode(0o600);
		fs::set_permissions(path, perms)?;
	}
	Ok(())
}
