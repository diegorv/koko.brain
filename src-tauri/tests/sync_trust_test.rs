//! Integration tests for `sync::trust`: peers.json CRUD, atomic writes,
//! permissions, and tolerance for malformed records.

use std::fs;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use ed25519_dalek::SigningKey;
use kokobrain_lib::sync::identity::fingerprint_hex;
use kokobrain_lib::sync::trust::{
	load, migrate_in_place, peers_path, remove, save, upsert, TrustedPeer,
};
use tempfile::TempDir;

/// Builds a syntactically valid `TrustedPeer` whose `public_key_b64`
/// decodes to a real Ed25519 public key (so it survives the H2
/// curve-point check in `load`). The Ed25519 keypair is generated
/// deterministically from `seed` via `SigningKey::from_bytes(&[seed; 32])`.
///
/// `fp_hex` is the override used as the record's stable primary key.
/// **Important:** when the caller wants `load`/`migrate_in_place` to
/// be a no-op, `fp_hex` should equal
/// `fingerprint_hex(&signing_key.verifying_key())` so the migration
/// finds the record already in canonical form.
fn fake_peer(seed: u8, fp_hex: &str, name: Option<&str>, ts: u64) -> TrustedPeer {
	let sk = SigningKey::from_bytes(&[seed; 32]);
	let pk = *sk.verifying_key().as_bytes();
	TrustedPeer {
		fingerprint_hex: fp_hex.to_string(),
		fingerprint_display: "alpha-bravo-charlie-delta-echo-foxtrot".to_string(),
		public_key_b64: BASE64.encode(pk),
		display_name: name.map(|s| s.to_string()),
		trusted_at_ms: ts,
	}
}

/// Builds a `TrustedPeer` whose `fingerprint_hex` matches the Ed25519
/// fingerprint derived from `seed`. Use this in tests that exercise
/// `load`/`upsert`/`remove` so `migrate_in_place` stays a no-op and
/// roundtrip equality holds.
fn canonical_fake_peer(seed: u8, name: Option<&str>, ts: u64) -> TrustedPeer {
	let sk = SigningKey::from_bytes(&[seed; 32]);
	let vk = sk.verifying_key();
	let fp = fingerprint_hex(&vk);
	fake_peer(seed, &fp, name, ts)
}

#[test]
fn peers_path_returns_kokobrain_peers_json() {
	let tmp = TempDir::new().unwrap();
	let p = peers_path(tmp.path());
	let trailing = p.strip_prefix(tmp.path()).unwrap();
	assert_eq!(
		trailing,
		std::path::Path::new(".kokobrain").join("peers.json")
	);
}

#[test]
fn load_on_missing_file_returns_empty_vec() {
	let tmp = TempDir::new().unwrap();
	let peers = load(tmp.path()).unwrap();
	assert!(peers.is_empty());
}

#[test]
fn save_and_load_roundtrip_preserves_fields_and_order() {
	let tmp = TempDir::new().unwrap();
	let a = canonical_fake_peer(0x01, Some("laptop"), 1);
	let b = canonical_fake_peer(0x02, None, 2);
	let c = canonical_fake_peer(0x03, Some("phone"), 3);
	let input = vec![a.clone(), b.clone(), c.clone()];

	save(tmp.path(), &input).unwrap();
	let out = load(tmp.path()).unwrap();
	assert_eq!(out, vec![a, b, c]);
}

#[test]
fn upsert_appends_when_fingerprint_is_new() {
	let tmp = TempDir::new().unwrap();
	let a = canonical_fake_peer(0x01, None, 100);
	let b = canonical_fake_peer(0x02, None, 200);
	let after_a = upsert(tmp.path(), a.clone()).unwrap();
	assert_eq!(after_a, vec![a.clone()]);
	let after_b = upsert(tmp.path(), b.clone()).unwrap();
	assert_eq!(after_b, vec![a, b]);
}

#[test]
fn upsert_replaces_when_fingerprint_matches() {
	let tmp = TempDir::new().unwrap();
	// Pick a single seed so `original` and `updated` share the same
	// canonical fingerprint. Only `display_name` + `trusted_at_ms`
	// differ between the two records.
	let original = canonical_fake_peer(0x01, Some("old name"), 100);
	let mut updated = original.clone();
	updated.display_name = Some("new name".to_string());
	updated.trusted_at_ms = 999;
	upsert(tmp.path(), original.clone()).unwrap();
	upsert(tmp.path(), canonical_fake_peer(0x02, None, 200)).unwrap();
	let after = upsert(tmp.path(), updated.clone()).unwrap();
	assert_eq!(after.len(), 2, "length must stay the same on replace");
	assert_eq!(after[0], updated, "replacement must keep the original slot");
	assert_eq!(after[0].display_name.as_deref(), Some("new name"));
	assert_eq!(after[0].trusted_at_ms, 999);
}

#[test]
fn remove_deletes_matching_entry() {
	let tmp = TempDir::new().unwrap();
	let a = canonical_fake_peer(0x01, None, 1);
	let b = canonical_fake_peer(0x02, None, 2);
	let c = canonical_fake_peer(0x03, None, 3);
	save(tmp.path(), &[a.clone(), b.clone(), c.clone()]).unwrap();
	let target = b.fingerprint_hex.clone();
	let after = remove(tmp.path(), &target).unwrap();
	assert_eq!(after, vec![a, c]);
}

#[test]
fn remove_is_noop_on_missing_fingerprint() {
	let tmp = TempDir::new().unwrap();
	let a = canonical_fake_peer(0x01, None, 1);
	save(tmp.path(), &[a.clone()]).unwrap();
	let after = remove(tmp.path(), "ffffffffffffffff").unwrap();
	assert_eq!(after, vec![a]);
}

#[test]
fn load_skips_records_with_invalid_base64_pubkey_length() {
	let tmp = TempDir::new().unwrap();
	let path = peers_path(tmp.path());
	fs::create_dir_all(path.parent().unwrap()).unwrap();
	// Hand-write JSON with three entries: a valid Ed25519 public key,
	// a too-short pubkey, and garbage base64. Under H2 the "valid"
	// record must be both 32 bytes AND a real curve point.
	let valid_pub = real_ed25519_pub(&[0xa1u8; 32]);
	let valid_fp = fingerprint_hex_for_pub(&valid_pub);
	let valid_b64 = BASE64.encode(valid_pub);
	let short_b64 = BASE64.encode([0x22u8; 16]); // 16 bytes, not 32
	let json = format!(
		r#"[
			{{"fingerprintHex":"{valid_fp}","fingerprintDisplay":"w-w-w-w-w-w","publicKeyB64":"{valid_b64}","displayName":null,"trustedAtMs":1}},
			{{"fingerprintHex":"short","fingerprintDisplay":"w-w-w-w-w-w","publicKeyB64":"{short_b64}","displayName":null,"trustedAtMs":2}},
			{{"fingerprintHex":"junk","fingerprintDisplay":"w-w-w-w-w-w","publicKeyB64":"!!!not-base64!!!","displayName":null,"trustedAtMs":3}}
		]"#
	);
	fs::write(&path, json).unwrap();

	let out = load(tmp.path()).unwrap();
	assert_eq!(out.len(), 1, "only the valid record survives");
	assert_eq!(out[0].fingerprint_hex, valid_fp);
}

/// Returns a real Ed25519 public key bytes derived from `seed` via
/// `SigningKey::from_bytes`. Used by tests that need a 32-byte
/// `public_key_b64` that passes `VerifyingKey::from_bytes`.
fn real_ed25519_pub(seed: &[u8; 32]) -> [u8; 32] {
	let sk = SigningKey::from_bytes(seed);
	*sk.verifying_key().as_bytes()
}

/// Computes the Ed25519 fingerprint hex for raw 32 public-key bytes.
fn fingerprint_hex_for_pub(pub_bytes: &[u8; 32]) -> String {
	use ed25519_dalek::VerifyingKey;
	let vk = VerifyingKey::from_bytes(pub_bytes).expect("test seed must produce valid Ed25519 pub");
	fingerprint_hex(&vk)
}

#[cfg(unix)]
#[test]
fn save_and_upsert_apply_0600_perms_on_unix() {
	use std::os::unix::fs::MetadataExt;
	let tmp = TempDir::new().unwrap();
	let peer = canonical_fake_peer(0x01, None, 1);

	save(tmp.path(), &[peer.clone()]).unwrap();
	let mode = fs::metadata(peers_path(tmp.path())).unwrap().mode() & 0o777;
	assert_eq!(mode, 0o600, "after save: expected 0600, got {mode:o}");

	upsert(tmp.path(), canonical_fake_peer(0x02, None, 2)).unwrap();
	let mode = fs::metadata(peers_path(tmp.path())).unwrap().mode() & 0o777;
	assert_eq!(mode, 0o600, "after upsert: expected 0600, got {mode:o}");
}

#[test]
fn atomic_write_leaves_no_tmp_file_after_success() {
	let tmp = TempDir::new().unwrap();
	let peer = canonical_fake_peer(0x01, None, 1);
	save(tmp.path(), &[peer]).unwrap();
	let kokobrain_dir = tmp.path().join(".kokobrain");
	let entries: Vec<_> = fs::read_dir(&kokobrain_dir)
		.unwrap()
		.filter_map(|e| e.ok())
		.map(|e| e.file_name().to_string_lossy().into_owned())
		.collect();
	assert!(
		!entries.iter().any(|name| name.ends_with(".tmp")),
		"no .tmp file should remain after a successful save; found: {entries:?}"
	);
	assert!(entries.iter().any(|n| n == "peers.json"));
}

#[test]
fn save_creates_kokobrain_parent_dir_when_missing() {
	let tmp = TempDir::new().unwrap();
	let kokobrain_dir = tmp.path().join(".kokobrain");
	assert!(!kokobrain_dir.exists());

	save(tmp.path(), &[canonical_fake_peer(0x01, None, 1)]).unwrap();
	assert!(kokobrain_dir.exists(), ".kokobrain dir must be auto-created");
	assert!(kokobrain_dir.join("peers.json").exists());
}

// ============================================================================
// Hotfix H2 — `migrate_in_place` self-heal
// ============================================================================

#[test]
fn migrate_in_place_on_missing_file_is_noop() {
	let tmp = TempDir::new().unwrap();
	migrate_in_place(tmp.path()).expect("missing file must be Ok");
	assert!(
		!peers_path(tmp.path()).exists(),
		"migrate must not touch the disk when the file is absent"
	);
}

#[test]
fn migrate_in_place_rewrites_mismatched_fingerprint_hex() {
	let tmp = TempDir::new().unwrap();
	// Build a record whose `public_key_b64` decodes to a real Ed25519
	// pub but whose `fingerprint_hex` was set to the legacy X25519-
	// derived form. `fake_peer` lets us set any fp_hex independently
	// of the keypair.
	let wrong_record = fake_peer(0x07, "deadbeefcafebabe", Some("legacy"), 1234);
	save(tmp.path(), &[wrong_record.clone()]).unwrap();

	migrate_in_place(tmp.path()).expect("migrate ok");

	let after = load(tmp.path()).unwrap();
	assert_eq!(after.len(), 1, "valid record must survive migration");
	let derived = {
		let sk = SigningKey::from_bytes(&[0x07_u8; 32]);
		fingerprint_hex(&sk.verifying_key())
	};
	assert_eq!(
		after[0].fingerprint_hex, derived,
		"migration must rewrite the fingerprint to the Ed25519 hash"
	);
	// Other fields are preserved.
	assert_eq!(after[0].display_name.as_deref(), Some("legacy"));
	assert_eq!(after[0].trusted_at_ms, 1234);
	assert_eq!(after[0].public_key_b64, wrong_record.public_key_b64);
}

#[test]
fn load_drops_records_whose_pubkey_is_not_a_valid_ed25519_curve_point() {
	// `load` must reject 32-byte `public_key_b64` blobs that are not
	// valid encoded Ed25519 points. We search a small space of fixed
	// patterns at module load time to find one that is guaranteed to
	// be rejected by `VerifyingKey::from_bytes`; this avoids relying
	// on a specific algebraic coincidence for any given byte pattern.
	use ed25519_dalek::VerifyingKey;
	let tmp = TempDir::new().unwrap();
	let path = peers_path(tmp.path());
	fs::create_dir_all(path.parent().unwrap()).unwrap();
	let mut bogus: Option<[u8; 32]> = None;
	for byte in 0u8..=0xff {
		let mut candidate = [byte; 32];
		// Toggle a few bits so we don't accidentally hit a famous
		// low-order point.
		candidate[0] ^= 0xaa;
		candidate[15] ^= 0x55;
		if VerifyingKey::from_bytes(&candidate).is_err() {
			bogus = Some(candidate);
			break;
		}
	}
	let bogus = bogus.expect("at least one 32-byte pattern must be invalid as Ed25519");
	let bogus_b64 = BASE64.encode(bogus);
	let json = format!(
		r#"[{{"fingerprintHex":"old-x25519","fingerprintDisplay":"w-w-w-w-w-w","publicKeyB64":"{bogus_b64}","displayName":null,"trustedAtMs":1}}]"#
	);
	fs::write(&path, json).unwrap();

	let out = load(tmp.path()).unwrap();
	assert!(out.is_empty(), "non-curve-point records must be dropped");
}

#[test]
fn migrate_in_place_is_idempotent_after_first_pass() {
	let tmp = TempDir::new().unwrap();
	let wrong_record = fake_peer(0x07, "deadbeefcafebabe", None, 7);
	save(tmp.path(), &[wrong_record]).unwrap();

	migrate_in_place(tmp.path()).unwrap();
	let path = peers_path(tmp.path());
	let bytes_after_first = fs::read(&path).unwrap();
	let mtime_after_first = fs::metadata(&path).unwrap().modified().unwrap();
	// Force a real-world delta so a second rewrite would change mtime.
	std::thread::sleep(std::time::Duration::from_millis(15));

	migrate_in_place(tmp.path()).unwrap();
	let bytes_after_second = fs::read(&path).unwrap();
	let mtime_after_second = fs::metadata(&path).unwrap().modified().unwrap();
	assert_eq!(
		bytes_after_first, bytes_after_second,
		"second migrate must be a content no-op"
	);
	assert_eq!(
		mtime_after_first, mtime_after_second,
		"second migrate must not rewrite the file (no `save` call)"
	);
}
