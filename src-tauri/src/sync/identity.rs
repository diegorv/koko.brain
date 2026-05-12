//! Persistent peer identity for LAN sync.
//!
//! Each install gets a 32-byte Ed25519 signing key the first time the LAN
//! sync subsystem runs. The secret bytes are kept in the OS keychain
//! (`security::keychain`) and never written to disk; the public key is
//! derived in-memory every time. The hash of the public key is the
//! "fingerprint" — a 16-character hex string grouped as `XXXX-XXXX-XXXX-XXXX`
//! that both peers display side-by-side during pairing.
//!
//! Storage is abstracted through the [`KeyStorage`] trait so the module is
//! testable without touching the real keychain. Production code uses
//! [`KeychainStorage`]; the test suite uses an in-memory mock.

use ed25519_dalek::{SigningKey, VerifyingKey, SECRET_KEY_LENGTH};
use rand::Rng;
use sha2::{Digest, Sha256};

use crate::security::keychain::{self, KeychainError};

/// Length of a binary fingerprint, in bytes (first 8 bytes of SHA-256 over
/// the Ed25519 public key).
pub const FINGERPRINT_BYTES: usize = 8;

/// Errors returned when loading or creating a peer identity.
#[derive(Debug)]
pub enum IdentityError {
	/// The storage backend failed (keychain or mock).
	Storage(String),
	/// User canceled the OS authentication prompt.
	UserCanceled,
	/// Stored key has the wrong length (corrupted keychain entry).
	CorruptedKey { expected: usize, got: usize },
}

impl core::fmt::Display for IdentityError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Storage(msg) => write!(f, "identity storage error: {msg}"),
			Self::UserCanceled => write!(f, "identity authentication canceled by user"),
			Self::CorruptedKey { expected, got } => write!(
				f,
				"identity key has wrong length: expected {expected} bytes, got {got}"
			),
		}
	}
}

impl std::error::Error for IdentityError {}

impl From<KeychainError> for IdentityError {
	fn from(e: KeychainError) -> Self {
		match e {
			KeychainError::UserCanceled => IdentityError::UserCanceled,
			KeychainError::NotFound => IdentityError::Storage("not found".to_string()),
			KeychainError::Internal(msg) => IdentityError::Storage(msg),
		}
	}
}

/// Abstraction over the 32-byte key storage. Production uses the OS
/// keychain; tests use an in-memory mock.
pub trait KeyStorage {
	/// Stores or replaces the 32-byte key for the given account.
	fn store(&self, account: &str, key: &[u8; 32]) -> Result<(), IdentityError>;
	/// Retrieves the 32-byte key, or returns `Ok(None)` if absent.
	fn retrieve(&self, account: &str) -> Result<Option<[u8; 32]>, IdentityError>;
	/// Returns true if a key exists for the given account, without
	/// triggering an authentication prompt (when applicable).
	fn has(&self, account: &str) -> bool;
}

/// Production [`KeyStorage`] backed by the OS keychain
/// (`security::keychain`). On non-macOS targets the underlying keychain
/// stubs return errors, so LAN sync is effectively macOS-only for now.
pub struct KeychainStorage;

impl KeyStorage for KeychainStorage {
	fn store(&self, account: &str, key: &[u8; 32]) -> Result<(), IdentityError> {
		keychain::store_key(account, key).map_err(IdentityError::from)
	}

	fn retrieve(&self, account: &str) -> Result<Option<[u8; 32]>, IdentityError> {
		match keychain::retrieve_key(account) {
			Ok(k) => Ok(Some(k)),
			Err(KeychainError::NotFound) => Ok(None),
			Err(e) => Err(IdentityError::from(e)),
		}
	}

	fn has(&self, account: &str) -> bool {
		keychain::has_key(account)
	}
}

/// In-memory peer identity (signing key + verifying key cached for cheap
/// public-key access). Loaded once via [`load_or_create_identity`] and
/// held by the `LanSyncState` for the lifetime of the app.
///
/// `Debug` deliberately omits the secret half — the impl below renders
/// only the public fingerprint to avoid accidental leakage to logs.
pub struct PeerIdentity {
	signing_key: SigningKey,
	verifying_key: VerifyingKey,
}

impl core::fmt::Debug for PeerIdentity {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		f.debug_struct("PeerIdentity")
			.field("fingerprint", &self.fingerprint_string())
			.finish_non_exhaustive()
	}
}

impl PeerIdentity {
	/// Returns the Ed25519 signing key (private side). Callers must treat
	/// this as secret — do NOT serialize or log.
	pub fn signing_key(&self) -> &SigningKey {
		&self.signing_key
	}

	/// Returns the Ed25519 verifying key (public side). Safe to share over
	/// the wire — peers exchange this during pairing.
	pub fn verifying_key(&self) -> &VerifyingKey {
		&self.verifying_key
	}

	/// 8-byte binary fingerprint = first 8 bytes of SHA-256(public_key).
	pub fn fingerprint(&self) -> [u8; FINGERPRINT_BYTES] {
		fingerprint_of(&self.verifying_key)
	}

	/// Human-readable fingerprint as a 6-word BIP-39 phrase, e.g.
	/// `"apple-banjo-cargo-doctor-eagle-fence"`. Used for visual peer
	/// identity verification on reconnects. Storage and IPC trust-store
	/// keys keep the hex form via [`format_fingerprint`] / [`hex_of`].
	pub fn fingerprint_string(&self) -> String {
		format_fingerprint_words(&self.fingerprint())
	}
}

/// Loads the persistent identity for `account`, creating a new keypair on
/// the first call. Subsequent calls return the same key.
///
/// The `account` argument selects which slot in the keychain to use; for
/// the LAN sync feature it is `"lan-sync-identity-<hash8(install_id)>"`,
/// derived from a per-install token so two parallel installs on the same
/// machine don't share an identity.
pub fn load_or_create_identity<S: KeyStorage>(
	storage: &S,
	account: &str,
) -> Result<PeerIdentity, IdentityError> {
	if let Some(secret) = storage.retrieve(account)? {
		let signing_key = SigningKey::from_bytes(&secret);
		let verifying_key = signing_key.verifying_key();
		return Ok(PeerIdentity {
			signing_key,
			verifying_key,
		});
	}
	// No identity yet — generate, persist, return.
	let mut secret = [0u8; SECRET_KEY_LENGTH];
	rand::rng().fill_bytes(&mut secret);
	storage.store(account, &secret)?;
	let signing_key = SigningKey::from_bytes(&secret);
	let verifying_key = signing_key.verifying_key();
	Ok(PeerIdentity {
		signing_key,
		verifying_key,
	})
}

/// Computes the 8-byte binary fingerprint of an Ed25519 public key as the
/// first 8 bytes of SHA-256 over its 32-byte serialization. Deterministic.
pub fn fingerprint_of(vk: &VerifyingKey) -> [u8; FINGERPRINT_BYTES] {
	let hash = Sha256::digest(vk.as_bytes());
	let mut out = [0u8; FINGERPRINT_BYTES];
	out.copy_from_slice(&hash[..FINGERPRINT_BYTES]);
	out
}

/// Formats an 8-byte fingerprint as `XXXX-XXXX-XXXX-XXXX` (uppercase hex,
/// grouped in 4 chars). The format is purely for display — the canonical
/// trust-store representation is the raw bytes.
pub fn format_fingerprint(fp: &[u8; FINGERPRINT_BYTES]) -> String {
	let hex: String = fp.iter().map(|b| format!("{b:02X}")).collect();
	// hex is 16 chars; group as 4-4-4-4 separated by '-'.
	let mut out = String::with_capacity(19);
	for (i, c) in hex.chars().enumerate() {
		if i > 0 && i % 4 == 0 {
			out.push('-');
		}
		out.push(c);
	}
	out
}

/// Parses a `XXXX-XXXX-XXXX-XXXX` (or `XXXXXXXXXXXXXXXX`) string back into
/// an 8-byte fingerprint. Case-insensitive. Returns `None` on any deviation
/// from the expected shape (wrong length, non-hex chars, etc.).
pub fn parse_fingerprint(s: &str) -> Option<[u8; FINGERPRINT_BYTES]> {
	let cleaned: String = s.chars().filter(|c| *c != '-' && !c.is_whitespace()).collect();
	if cleaned.len() != FINGERPRINT_BYTES * 2 {
		return None;
	}
	let mut out = [0u8; FINGERPRINT_BYTES];
	for (i, byte) in out.iter_mut().enumerate() {
		let hi = u8::from_str_radix(&cleaned[i * 2..i * 2 + 1], 16).ok()?;
		let lo = u8::from_str_radix(&cleaned[i * 2 + 1..i * 2 + 2], 16).ok()?;
		*byte = (hi << 4) | lo;
	}
	Some(out)
}

/// Short 8-character form of a fingerprint, useful for filenames and log
/// lines (e.g. the conflict file `<basename>.conflict-<peer8>-<ts>.<ext>`).
pub fn short_fingerprint(fp: &[u8; FINGERPRINT_BYTES]) -> String {
	fp[..4].iter().map(|b| format!("{b:02X}")).collect()
}

/// Number of BIP-39 words used to display a fingerprint. 6 words at 11
/// bits each cover the full 64-bit fingerprint with 2 zero-padded bits
/// to spare, so the encoding is fully reversible.
pub const FINGERPRINT_WORD_COUNT: usize = 6;

/// Formats an 8-byte fingerprint as 6 BIP-39 English words separated by
/// `-`, e.g. `"apple-banjo-cargo-doctor-eagle-fence"`. The encoding is
/// deterministic and lossless: the 64-bit fingerprint is laid out
/// MSB-first across six 11-bit slots, with the final 2 bits of the last
/// slot zero-padded. See [`parse_fingerprint_words`] for the inverse.
pub fn format_fingerprint_words(fp: &[u8; FINGERPRINT_BYTES]) -> String {
	let v = u64::from_be_bytes(*fp);
	let mut out = String::with_capacity(FINGERPRINT_WORD_COUNT * 9);
	let shifts: [u8; FINGERPRINT_WORD_COUNT] = [53, 42, 31, 20, 9, 0];
	for (i, &shift) in shifts.iter().enumerate() {
		let idx = if shift == 0 {
			// Last word: shift the bottom 9 bits up by 2 so they sit in the
			// upper 9 bits of an 11-bit slot, with 2 zero pad bits.
			(((v as u16) & 0x1FF) << 2) as usize
		} else {
			((v >> shift) & 0x7FF) as usize
		};
		if i > 0 {
			out.push('-');
		}
		out.push_str(crate::sync::wordlist::word_at(idx));
	}
	out
}

/// Parses a fingerprint previously rendered by [`format_fingerprint_words`]
/// back into its 8-byte form. Returns `None` if the input is not exactly
/// [`FINGERPRINT_WORD_COUNT`] words separated by `-`, if any word is not
/// present in the BIP-39 English wordlist, or if the final word carries
/// non-zero padding bits (which would indicate the words came from a
/// different encoding scheme).
pub fn parse_fingerprint_words(s: &str) -> Option<[u8; FINGERPRINT_BYTES]> {
	let words: Vec<&str> = s.split('-').collect();
	if words.len() != FINGERPRINT_WORD_COUNT {
		return None;
	}
	let mut indices = [0u64; FINGERPRINT_WORD_COUNT];
	for (i, w) in words.iter().enumerate() {
		let idx = crate::sync::wordlist::WORDS.as_slice().binary_search(w).ok()?;
		indices[i] = idx as u64;
	}
	let shifts: [u8; FINGERPRINT_WORD_COUNT] = [53, 42, 31, 20, 9, 0];
	let mut v: u64 = 0;
	for (i, &shift) in shifts.iter().enumerate() {
		if shift == 0 {
			// Last word holds 9 fingerprint bits in its top 9 of 11; bottom 2 must be zero.
			let raw = indices[i];
			if raw & 0b11 != 0 {
				return None;
			}
			v |= raw >> 2;
		} else {
			v |= indices[i] << shift;
		}
	}
	Some(v.to_be_bytes())
}
