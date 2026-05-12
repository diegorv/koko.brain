//! Integration tests for `sync::identity`: generation, file persistence,
//! permissions, fingerprint surfaces, signing, and the Hotfix H2
//! identity-binding signature exchange.

use std::fs;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::{Signature, Verifier, VerifyingKey, SIGNATURE_LENGTH};
use kokobrain_lib::sync::identity::{fingerprint_display, fingerprint_hex, DeviceIdentity};
use kokobrain_lib::sync::transport::static_keys_from_ed25519_secret;
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

// ============================================================================
// Hotfix H2 binding-signature exchange
// ============================================================================

#[test]
fn load_or_create_writes_both_identity_and_binding_files() {
	let tmp = TempDir::new().unwrap();
	let key_path = tmp.path().join("identity.key");
	let sig_path = tmp.path().join("identity-binding.sig");
	assert!(!key_path.exists());
	assert!(!sig_path.exists());

	let _ = DeviceIdentity::load_or_create(&key_path).unwrap();

	assert!(key_path.exists(), "identity.key must be created");
	assert!(sig_path.exists(), "identity-binding.sig must be created");
	let sig_bytes = fs::read(&sig_path).unwrap();
	assert_eq!(
		sig_bytes.len(),
		SIGNATURE_LENGTH,
		"binding sig file must be exactly {SIGNATURE_LENGTH} bytes"
	);
}

#[cfg(unix)]
#[test]
fn binding_sig_file_has_0600_permissions_on_unix() {
	use std::os::unix::fs::MetadataExt;
	let tmp = TempDir::new().unwrap();
	let key_path = tmp.path().join("identity.key");
	let _ = DeviceIdentity::load_or_create(&key_path).unwrap();

	let sig_path = tmp.path().join("identity-binding.sig");
	let mode = fs::metadata(&sig_path).unwrap().mode() & 0o777;
	assert_eq!(mode, 0o600, "binding sig expected 0600, got {mode:o}");
}

#[test]
fn load_or_create_reuses_existing_binding_when_it_verifies() {
	let tmp = TempDir::new().unwrap();
	let key_path = tmp.path().join("identity.key");
	let sig_path = tmp.path().join("identity-binding.sig");

	let _ = DeviceIdentity::load_or_create(&key_path).unwrap();
	let sig_before = fs::read(&sig_path).unwrap();

	// Second call: must NOT rewrite the binding file because it
	// already verifies against the on-disk identity's X25519 pub.
	let id2 = DeviceIdentity::load_or_create(&key_path).unwrap();
	let sig_after = fs::read(&sig_path).unwrap();
	assert_eq!(sig_before, sig_after, "binding sig must be reused, not rewritten");

	// And the in-memory binding sig verifies against the in-memory
	// X25519 pub.
	let proof = id2.identity_proof();
	let secret_bytes = fs::read(&key_path).unwrap();
	let mut secret = [0u8; 32];
	secret.copy_from_slice(&secret_bytes);
	let x25519 = static_keys_from_ed25519_secret(&secret);
	let sig = decode_signature(&proof.binding_sig_b64);
	id2.public_key()
		.verify_strict(&x25519.public, &sig)
		.expect("binding sig from identity_proof must verify against on-disk x25519");
}

#[test]
fn load_or_create_regenerates_corrupted_binding_signature() {
	let tmp = TempDir::new().unwrap();
	let key_path = tmp.path().join("identity.key");
	let sig_path = tmp.path().join("identity-binding.sig");

	let _ = DeviceIdentity::load_or_create(&key_path).unwrap();
	let sig_before = fs::read(&sig_path).unwrap();

	// Corrupt the first byte of the binding sig file.
	let mut corrupted = sig_before.clone();
	corrupted[0] ^= 0xff;
	fs::write(&sig_path, &corrupted).unwrap();

	// Reload — the loader must detect the verify failure and
	// regenerate the file in place.
	let id_after = DeviceIdentity::load_or_create(&key_path).unwrap();
	let sig_after = fs::read(&sig_path).unwrap();
	assert_eq!(sig_after.len(), SIGNATURE_LENGTH);
	assert_ne!(sig_after, corrupted, "corrupted bytes must be overwritten");

	// The regenerated sig verifies against the live X25519 pub.
	let proof = id_after.identity_proof();
	let secret_bytes = fs::read(&key_path).unwrap();
	let mut secret = [0u8; 32];
	secret.copy_from_slice(&secret_bytes);
	let x25519 = static_keys_from_ed25519_secret(&secret);
	let sig = decode_signature(&proof.binding_sig_b64);
	id_after
		.public_key()
		.verify_strict(&x25519.public, &sig)
		.expect("regenerated sig must verify");
}

#[test]
fn load_or_create_regenerates_when_binding_sig_file_missing() {
	let tmp = TempDir::new().unwrap();
	let key_path = tmp.path().join("identity.key");
	let sig_path = tmp.path().join("identity-binding.sig");

	let _ = DeviceIdentity::load_or_create(&key_path).unwrap();
	assert!(sig_path.exists());
	fs::remove_file(&sig_path).unwrap();
	assert!(!sig_path.exists());

	let id = DeviceIdentity::load_or_create(&key_path).unwrap();
	assert!(sig_path.exists(), "missing binding sig file must be regenerated");
	let proof = id.identity_proof();
	let secret_bytes = fs::read(&key_path).unwrap();
	let mut secret = [0u8; 32];
	secret.copy_from_slice(&secret_bytes);
	let x25519 = static_keys_from_ed25519_secret(&secret);
	let sig = decode_signature(&proof.binding_sig_b64);
	id.public_key()
		.verify_strict(&x25519.public, &sig)
		.expect("freshly created sig must verify");
}

#[test]
fn identity_proof_contains_base64_pub_and_signature() {
	let tmp = TempDir::new().unwrap();
	let key_path = tmp.path().join("identity.key");
	let id = DeviceIdentity::load_or_create(&key_path).unwrap();

	let proof = id.identity_proof();

	// ed25519_pub_b64 decodes to 32 bytes and equals the in-memory pub.
	let pub_bytes = BASE64.decode(proof.ed25519_pub_b64.as_bytes()).unwrap();
	assert_eq!(pub_bytes.len(), 32);
	assert_eq!(pub_bytes.as_slice(), id.public_key().as_bytes());

	// binding_sig_b64 decodes to 64 bytes and verifies against the
	// in-memory X25519 pub derived from the on-disk secret.
	let sig_bytes = BASE64.decode(proof.binding_sig_b64.as_bytes()).unwrap();
	assert_eq!(sig_bytes.len(), SIGNATURE_LENGTH);
	let mut arr = [0u8; SIGNATURE_LENGTH];
	arr.copy_from_slice(&sig_bytes);
	let sig = Signature::from_bytes(&arr);
	let secret_bytes = fs::read(&key_path).unwrap();
	let mut secret = [0u8; 32];
	secret.copy_from_slice(&secret_bytes);
	let x25519 = static_keys_from_ed25519_secret(&secret);
	let vk: VerifyingKey = id.public_key();
	vk.verify_strict(&x25519.public, &sig)
		.expect("identity_proof binding sig must verify against derived x25519 pub");
}

/// Decodes a base64-encoded 64-byte Ed25519 signature into a
/// `Signature`. Panics on malformed input — only used in the H2 tests
/// above so the assertions stay one-line.
fn decode_signature(b64: &str) -> Signature {
	let bytes = BASE64.decode(b64.as_bytes()).unwrap();
	assert_eq!(bytes.len(), SIGNATURE_LENGTH);
	let mut arr = [0u8; SIGNATURE_LENGTH];
	arr.copy_from_slice(&bytes);
	Signature::from_bytes(&arr)
}
