//! Integration tests for `sync::identity`: generation, file persistence,
//! permissions, fingerprint surfaces, signing.

use std::fs;

use ed25519_dalek::Verifier;
use kokobrain_lib::sync::identity::{fingerprint_display, fingerprint_hex, DeviceIdentity};
use kokobrain_lib::sync::wordlist::BIP39_WORDS;
use tempfile::TempDir;

#[test]
fn generate_returns_unique_keys() {
	let a = DeviceIdentity::generate();
	let b = DeviceIdentity::generate();
	assert_ne!(a.public_key().as_bytes(), b.public_key().as_bytes());
}

#[test]
fn load_or_create_writes_file_when_absent_then_reads_back_same_key() {
	let tmp = TempDir::new().unwrap();
	let path = tmp.path().join("identity.key");
	assert!(!path.exists());

	let first = DeviceIdentity::load_or_create(&path).unwrap();
	assert!(path.exists(), "load_or_create must create the file");

	let second = DeviceIdentity::load_or_create(&path).unwrap();
	assert_eq!(first.public_key().as_bytes(), second.public_key().as_bytes());
	assert_eq!(first.fingerprint_hex(), second.fingerprint_hex());
}

#[test]
fn load_or_create_is_idempotent() {
	let tmp = TempDir::new().unwrap();
	let path = tmp.path().join("identity.key");
	let first = DeviceIdentity::load_or_create(&path).unwrap();
	let pk_before = *first.public_key().as_bytes();
	for _ in 0..3 {
		let again = DeviceIdentity::load_or_create(&path).unwrap();
		assert_eq!(*again.public_key().as_bytes(), pk_before);
	}
}

#[cfg(unix)]
#[test]
fn created_file_has_0600_permissions_on_unix() {
	use std::os::unix::fs::MetadataExt;
	let tmp = TempDir::new().unwrap();
	let path = tmp.path().join("identity.key");
	let _ = DeviceIdentity::load_or_create(&path).unwrap();
	let mode = fs::metadata(&path).unwrap().mode() & 0o777;
	assert_eq!(mode, 0o600, "expected 0600, got {mode:o}");
}

#[test]
fn fingerprint_hex_is_16_chars_and_stable_across_loads() {
	let tmp = TempDir::new().unwrap();
	let path = tmp.path().join("identity.key");
	let first = DeviceIdentity::load_or_create(&path).unwrap();
	let hex = first.fingerprint_hex();
	assert_eq!(hex.len(), 16, "fingerprint_hex must be 16 hex chars");
	assert!(
		hex.chars().all(|c| c.is_ascii_hexdigit() && !c.is_ascii_uppercase()),
		"fingerprint_hex must be lowercase hex: {hex:?}"
	);

	let second = DeviceIdentity::load_or_create(&path).unwrap();
	assert_eq!(second.fingerprint_hex(), hex);

	// Free function on the public key matches the method.
	assert_eq!(fingerprint_hex(&first.public_key()), hex);
}

#[test]
fn fingerprint_display_is_six_hyphen_separated_words_from_wordlist() {
	let identity = DeviceIdentity::generate();
	let display = identity.fingerprint_display();
	let words: Vec<&str> = display.split('-').collect();
	assert_eq!(words.len(), 6, "expected 6 words, got {}: {display:?}", words.len());
	for w in &words {
		assert!(
			BIP39_WORDS.as_slice().binary_search(w).is_ok(),
			"word {w:?} not in BIP39 wordlist"
		);
	}
	// Free function matches the method.
	assert_eq!(fingerprint_display(&identity.public_key()), display);
}

#[test]
fn sign_produces_verifiable_signature() {
	let identity = DeviceIdentity::generate();
	let msg = b"hello kokobrain";
	let sig = identity.sign(msg);
	identity
		.public_key()
		.verify_strict(msg, &sig)
		.expect("signature must verify with the matching public key");
}

#[test]
fn sign_signature_does_not_verify_for_tampered_message() {
	let identity = DeviceIdentity::generate();
	let sig = identity.sign(b"original");
	assert!(identity.public_key().verify_strict(b"tampered", &sig).is_err());
}

#[test]
fn sign_signature_does_not_verify_under_different_key() {
	let a = DeviceIdentity::generate();
	let b = DeviceIdentity::generate();
	let sig = a.sign(b"msg");
	assert!(
		b.public_key().verify(b"msg", &sig).is_err(),
		"signature from a must not verify under b"
	);
}

#[test]
fn load_or_create_creates_parent_dir_when_missing() {
	let tmp = TempDir::new().unwrap();
	let nested = tmp.path().join("a").join("b").join("c").join("identity.key");
	assert!(!nested.parent().unwrap().exists());

	let identity = DeviceIdentity::load_or_create(&nested).unwrap();
	assert!(nested.exists(), "key file must be created");
	assert!(nested.parent().unwrap().exists(), "parent dir must be created");

	// Roundtrip: reload from the same nested path.
	let again = DeviceIdentity::load_or_create(&nested).unwrap();
	assert_eq!(identity.public_key().as_bytes(), again.public_key().as_bytes());
}

#[test]
fn load_or_create_rejects_wrong_length_file() {
	let tmp = TempDir::new().unwrap();
	let path = tmp.path().join("identity.key");
	fs::write(&path, b"not 32 bytes").unwrap();
	match DeviceIdentity::load_or_create(&path) {
		Ok(_) => panic!("expected InvalidData error for wrong-length key file"),
		Err(e) => assert_eq!(e.kind(), std::io::ErrorKind::InvalidData),
	}
}
