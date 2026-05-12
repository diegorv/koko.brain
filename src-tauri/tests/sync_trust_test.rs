//! Integration tests for `sync::trust`: peers.json CRUD, atomic writes,
//! permissions, and tolerance for malformed records.

use std::fs;

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use kokobrain_lib::sync::trust::{load, peers_path, remove, save, upsert, TrustedPeer};
use tempfile::TempDir;

/// Builds a syntactically valid `TrustedPeer` with a fake 32-byte public
/// key derived from `seed` (just `seed` repeated 32 times). The
/// `fingerprint_hex` is derived from the seed for predictable equality.
fn fake_peer(seed: u8, fp_hex: &str, name: Option<&str>, ts: u64) -> TrustedPeer {
	let pk = [seed; 32];
	TrustedPeer {
		fingerprint_hex: fp_hex.to_string(),
		fingerprint_display: "alpha-bravo-charlie-delta-echo-foxtrot".to_string(),
		public_key_b64: BASE64.encode(pk),
		display_name: name.map(|s| s.to_string()),
		trusted_at_ms: ts,
	}
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
	let a = fake_peer(0x01, "0000000000000001", Some("laptop"), 1);
	let b = fake_peer(0x02, "0000000000000002", None, 2);
	let c = fake_peer(0x03, "0000000000000003", Some("phone"), 3);
	let input = vec![a.clone(), b.clone(), c.clone()];

	save(tmp.path(), &input).unwrap();
	let out = load(tmp.path()).unwrap();
	assert_eq!(out, vec![a, b, c]);
}

#[test]
fn upsert_appends_when_fingerprint_is_new() {
	let tmp = TempDir::new().unwrap();
	let a = fake_peer(0x01, "aaaa000000000001", None, 100);
	let b = fake_peer(0x02, "aaaa000000000002", None, 200);
	let after_a = upsert(tmp.path(), a.clone()).unwrap();
	assert_eq!(after_a, vec![a.clone()]);
	let after_b = upsert(tmp.path(), b.clone()).unwrap();
	assert_eq!(after_b, vec![a, b]);
}

#[test]
fn upsert_replaces_when_fingerprint_matches() {
	let tmp = TempDir::new().unwrap();
	let original = fake_peer(0x01, "bbbb000000000001", Some("old name"), 100);
	let updated = fake_peer(0x09, "bbbb000000000001", Some("new name"), 999);
	upsert(tmp.path(), original.clone()).unwrap();
	upsert(tmp.path(), fake_peer(0x02, "bbbb000000000002", None, 200)).unwrap();
	let after = upsert(tmp.path(), updated.clone()).unwrap();
	assert_eq!(after.len(), 2, "length must stay the same on replace");
	assert_eq!(after[0], updated, "replacement must keep the original slot");
	assert_eq!(after[0].display_name.as_deref(), Some("new name"));
	assert_eq!(after[0].trusted_at_ms, 999);
}

#[test]
fn remove_deletes_matching_entry() {
	let tmp = TempDir::new().unwrap();
	let a = fake_peer(0x01, "cccc000000000001", None, 1);
	let b = fake_peer(0x02, "cccc000000000002", None, 2);
	let c = fake_peer(0x03, "cccc000000000003", None, 3);
	save(tmp.path(), &[a.clone(), b.clone(), c.clone()]).unwrap();
	let after = remove(tmp.path(), "cccc000000000002").unwrap();
	assert_eq!(after, vec![a, c]);
}

#[test]
fn remove_is_noop_on_missing_fingerprint() {
	let tmp = TempDir::new().unwrap();
	let a = fake_peer(0x01, "dddd000000000001", None, 1);
	save(tmp.path(), &[a.clone()]).unwrap();
	let after = remove(tmp.path(), "ffffffffffffffff").unwrap();
	assert_eq!(after, vec![a]);
}

#[test]
fn load_skips_records_with_invalid_base64_pubkey_length() {
	let tmp = TempDir::new().unwrap();
	let path = peers_path(tmp.path());
	fs::create_dir_all(path.parent().unwrap()).unwrap();
	// Hand-write JSON with three entries: valid, too-short pubkey, and
	// garbage base64.
	let valid_b64 = BASE64.encode([0x11u8; 32]);
	let short_b64 = BASE64.encode([0x22u8; 16]); // 16 bytes, not 32
	let json = format!(
		r#"[
			{{"fingerprintHex":"good","fingerprintDisplay":"w-w-w-w-w-w","publicKeyB64":"{valid_b64}","displayName":null,"trustedAtMs":1}},
			{{"fingerprintHex":"short","fingerprintDisplay":"w-w-w-w-w-w","publicKeyB64":"{short_b64}","displayName":null,"trustedAtMs":2}},
			{{"fingerprintHex":"junk","fingerprintDisplay":"w-w-w-w-w-w","publicKeyB64":"!!!not-base64!!!","displayName":null,"trustedAtMs":3}}
		]"#
	);
	fs::write(&path, json).unwrap();

	let out = load(tmp.path()).unwrap();
	assert_eq!(out.len(), 1, "only the valid record survives");
	assert_eq!(out[0].fingerprint_hex, "good");
}

#[cfg(unix)]
#[test]
fn save_and_upsert_apply_0600_perms_on_unix() {
	use std::os::unix::fs::MetadataExt;
	let tmp = TempDir::new().unwrap();
	let peer = fake_peer(0x01, "eeee000000000001", None, 1);

	save(tmp.path(), &[peer.clone()]).unwrap();
	let mode = fs::metadata(peers_path(tmp.path())).unwrap().mode() & 0o777;
	assert_eq!(mode, 0o600, "after save: expected 0600, got {mode:o}");

	upsert(
		tmp.path(),
		fake_peer(0x02, "eeee000000000002", None, 2),
	)
	.unwrap();
	let mode = fs::metadata(peers_path(tmp.path())).unwrap().mode() & 0o777;
	assert_eq!(mode, 0o600, "after upsert: expected 0600, got {mode:o}");
}

#[test]
fn atomic_write_leaves_no_tmp_file_after_success() {
	let tmp = TempDir::new().unwrap();
	let peer = fake_peer(0x01, "ffff000000000001", None, 1);
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

	save(tmp.path(), &[fake_peer(0x01, "0000000000000001", None, 1)]).unwrap();
	assert!(kokobrain_dir.exists(), ".kokobrain dir must be auto-created");
	assert!(kokobrain_dir.join("peers.json").exists());
}
