use kokobrain_lib::sync::identity::{
	fingerprint_of, format_fingerprint, format_fingerprint_words, load_or_create_identity,
	parse_fingerprint, parse_fingerprint_words, short_fingerprint, IdentityError, KeyStorage,
	FINGERPRINT_BYTES, FINGERPRINT_WORD_COUNT,
};
use std::collections::HashMap;
use std::sync::Mutex;

/// In-memory mock for `KeyStorage`. Lets us exercise the full
/// load_or_create_identity flow without touching the OS keychain.
#[derive(Default)]
struct MemoryStorage {
	inner: Mutex<HashMap<String, [u8; 32]>>,
}

impl KeyStorage for MemoryStorage {
	fn store(&self, account: &str, key: &[u8; 32]) -> Result<(), IdentityError> {
		self.inner.lock().unwrap().insert(account.to_string(), *key);
		Ok(())
	}

	fn retrieve(&self, account: &str) -> Result<Option<[u8; 32]>, IdentityError> {
		Ok(self.inner.lock().unwrap().get(account).copied())
	}

	fn has(&self, account: &str) -> bool {
		self.inner.lock().unwrap().contains_key(account)
	}
}

/// Storage that always errors out — useful for testing the error-propagation
/// path through load_or_create_identity.
struct FailingStorage;

impl KeyStorage for FailingStorage {
	fn store(&self, _account: &str, _key: &[u8; 32]) -> Result<(), IdentityError> {
		Err(IdentityError::Storage("simulated write failure".to_string()))
	}

	fn retrieve(&self, _account: &str) -> Result<Option<[u8; 32]>, IdentityError> {
		Err(IdentityError::Storage("simulated read failure".to_string()))
	}

	fn has(&self, _account: &str) -> bool {
		false
	}
}

#[test]
fn fingerprint_is_8_bytes() {
	assert_eq!(FINGERPRINT_BYTES, 8);
}

#[test]
fn format_fingerprint_produces_xxxx_grouped_uppercase_hex() {
	let fp: [u8; 8] = [0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6, 0x07, 0x08];
	assert_eq!(format_fingerprint(&fp), "A1B2-C3D4-E5F6-0708");
}

#[test]
fn format_fingerprint_zero_bytes() {
	let fp = [0u8; 8];
	assert_eq!(format_fingerprint(&fp), "0000-0000-0000-0000");
}

#[test]
fn parse_fingerprint_accepts_grouped_uppercase() {
	let parsed = parse_fingerprint("A1B2-C3D4-E5F6-0708").unwrap();
	assert_eq!(parsed, [0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6, 0x07, 0x08]);
}

#[test]
fn parse_fingerprint_accepts_lowercase() {
	let parsed = parse_fingerprint("a1b2-c3d4-e5f6-0708").unwrap();
	assert_eq!(parsed, [0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6, 0x07, 0x08]);
}

#[test]
fn parse_fingerprint_accepts_unseparated_hex() {
	let parsed = parse_fingerprint("a1b2c3d4e5f60708").unwrap();
	assert_eq!(parsed, [0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6, 0x07, 0x08]);
}

#[test]
fn parse_fingerprint_accepts_extra_whitespace() {
	let parsed = parse_fingerprint("  A1B2  C3D4 E5F6 0708  ").unwrap();
	assert_eq!(parsed, [0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6, 0x07, 0x08]);
}

#[test]
fn parse_fingerprint_rejects_wrong_length() {
	assert!(parse_fingerprint("A1B2-C3D4-E5F6").is_none()); // too short
	assert!(parse_fingerprint("A1B2-C3D4-E5F6-0708-AAAA").is_none()); // too long
	assert!(parse_fingerprint("").is_none());
}

#[test]
fn parse_fingerprint_rejects_non_hex_chars() {
	assert!(parse_fingerprint("Z1B2-C3D4-E5F6-0708").is_none());
	assert!(parse_fingerprint("A1B2-C3D4-E5F6-07G8").is_none());
}

#[test]
fn format_then_parse_round_trips() {
	let fp: [u8; 8] = [0x00, 0xFF, 0x10, 0x80, 0x7F, 0xC0, 0x3A, 0x42];
	let formatted = format_fingerprint(&fp);
	let reparsed = parse_fingerprint(&formatted).unwrap();
	assert_eq!(fp, reparsed);
}

#[test]
fn short_fingerprint_is_8_hex_chars() {
	let fp: [u8; 8] = [0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6, 0x07, 0x08];
	let short = short_fingerprint(&fp);
	assert_eq!(short, "A1B2C3D4");
	assert_eq!(short.len(), 8);
}

#[test]
fn fingerprint_of_is_deterministic() {
	use ed25519_dalek::SigningKey;
	let secret = [42u8; 32];
	let signing = SigningKey::from_bytes(&secret);
	let vk = signing.verifying_key();
	let fp1 = fingerprint_of(&vk);
	let fp2 = fingerprint_of(&vk);
	assert_eq!(fp1, fp2);
}

#[test]
fn fingerprint_of_changes_with_key() {
	use ed25519_dalek::SigningKey;
	let signing_a = SigningKey::from_bytes(&[1u8; 32]);
	let signing_b = SigningKey::from_bytes(&[2u8; 32]);
	let fp_a = fingerprint_of(&signing_a.verifying_key());
	let fp_b = fingerprint_of(&signing_b.verifying_key());
	assert_ne!(fp_a, fp_b);
}

#[test]
fn load_or_create_creates_on_first_call() {
	let storage = MemoryStorage::default();
	assert!(!storage.has("test-account"));

	let identity = load_or_create_identity(&storage, "test-account").unwrap();

	assert!(storage.has("test-account"));
	// Verifying key is derivable from the stored secret.
	let stored = storage.retrieve("test-account").unwrap().unwrap();
	use ed25519_dalek::SigningKey;
	let derived = SigningKey::from_bytes(&stored).verifying_key();
	assert_eq!(identity.verifying_key().as_bytes(), derived.as_bytes());
}

#[test]
fn load_or_create_retrieves_existing_key() {
	let storage = MemoryStorage::default();

	let first = load_or_create_identity(&storage, "stable-account").unwrap();
	let first_fp = first.fingerprint();

	let second = load_or_create_identity(&storage, "stable-account").unwrap();
	let second_fp = second.fingerprint();

	assert_eq!(first_fp, second_fp, "second call must return the same identity");
}

#[test]
fn load_or_create_isolates_per_account() {
	let storage = MemoryStorage::default();

	let a = load_or_create_identity(&storage, "vault-a").unwrap();
	let b = load_or_create_identity(&storage, "vault-b").unwrap();

	assert_ne!(
		a.fingerprint(),
		b.fingerprint(),
		"different accounts must produce different identities"
	);
}

#[test]
fn load_or_create_propagates_storage_errors() {
	let storage = FailingStorage;
	let err = load_or_create_identity(&storage, "any").unwrap_err();
	match err {
		IdentityError::Storage(msg) => assert!(msg.contains("simulated")),
		other => panic!("expected Storage error, got {other:?}"),
	}
}

#[test]
fn identity_can_sign_and_verify() {
	let storage = MemoryStorage::default();
	let identity = load_or_create_identity(&storage, "signer").unwrap();

	use ed25519_dalek::{Signer, Verifier};
	let msg = b"transcript-hash-or-anything";
	let sig = identity.signing_key().sign(msg);
	identity
		.verifying_key()
		.verify(msg, &sig)
		.expect("signature must verify under the matching public key");
}

#[test]
fn fingerprint_string_is_six_dash_separated_words() {
	let storage = MemoryStorage::default();
	let identity = load_or_create_identity(&storage, "format-test").unwrap();
	let s = identity.fingerprint_string();
	let parts: Vec<&str> = s.split('-').collect();
	assert_eq!(parts.len(), FINGERPRINT_WORD_COUNT, "expected 6 words, got {parts:?}");
	for w in &parts {
		assert!(!w.is_empty(), "no empty segments");
		assert!(w.chars().all(|c| c.is_ascii_lowercase()), "all lowercase, got {w}");
	}
	// Round-trip through parse_fingerprint_words reproduces the raw bytes.
	let parsed = parse_fingerprint_words(&s).expect("parse must succeed");
	assert_eq!(parsed, identity.fingerprint());
}

#[test]
fn format_fingerprint_words_is_deterministic() {
	let fp = [0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0];
	let a = format_fingerprint_words(&fp);
	let b = format_fingerprint_words(&fp);
	assert_eq!(a, b);
}

#[test]
fn format_fingerprint_words_handles_zero_and_max() {
	let zero = [0u8; FINGERPRINT_BYTES];
	let max = [0xFFu8; FINGERPRINT_BYTES];
	let s_zero = format_fingerprint_words(&zero);
	let s_max = format_fingerprint_words(&max);
	assert_ne!(s_zero, s_max);
	assert_eq!(parse_fingerprint_words(&s_zero).unwrap(), zero);
	assert_eq!(parse_fingerprint_words(&s_max).unwrap(), max);
}

#[test]
fn parse_fingerprint_words_rejects_wrong_word_count() {
	// Five words, not six.
	assert!(parse_fingerprint_words("abandon-ability-able-about-above").is_none());
	// Seven words.
	assert!(parse_fingerprint_words("abandon-ability-able-about-above-absent-absorb").is_none());
}

#[test]
fn parse_fingerprint_words_rejects_unknown_word() {
	assert!(parse_fingerprint_words("abandon-ability-able-about-above-zzzzzzzz").is_none());
}

#[test]
fn parse_fingerprint_words_rejects_nonzero_padding() {
	// Construct a 6-word phrase whose last word has its bottom 2 bits non-zero.
	// `abandon` is index 0; `able` is index 2 (binary ...10), so its bottom 2 bits = 10.
	// Using it as the LAST word forces a non-zero pad rejection.
	assert!(parse_fingerprint_words("abandon-abandon-abandon-abandon-abandon-able").is_none());
}

#[test]
fn format_fingerprint_words_round_trips_random_samples() {
	// Spot-check several distinct fingerprints round-trip cleanly.
	let cases = [
		[0u8; 8],
		[0xFFu8; 8],
		[0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77],
		[0xAB, 0xCD, 0xEF, 0x01, 0x23, 0x45, 0x67, 0x89],
		[0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01],
	];
	for fp in &cases {
		let s = format_fingerprint_words(fp);
		assert_eq!(parse_fingerprint_words(&s).unwrap(), *fp, "round-trip failed for {fp:?}");
	}
}

#[test]
fn legacy_hex_format_helpers_still_work() {
	// `format_fingerprint` (hex) and `parse_fingerprint` (hex) remain available
	// for filenames, log lines, and IPC `fingerprintHex` storage. They are
	// separate from the word display path.
	let fp = [0xA1, 0xB2, 0xC3, 0xD4, 0xE5, 0xF6, 0x07, 0x08];
	let hex = format_fingerprint(&fp);
	assert_eq!(hex, "A1B2-C3D4-E5F6-0708");
	assert_eq!(parse_fingerprint(&hex).unwrap(), fp);
}
