use kokobrain_lib::sync::pairing::{
	add_trusted_peer, finish_pairing_guest, finish_pairing_host, is_trusted, peers_file_path,
	read_peers, remove_trusted_peer, start_pairing_guest, start_pairing_host, write_peers,
	PairingError, PeersFile, TrustedPeer, CURRENT_PEERS_VERSION,
};
use kokobrain_lib::sync::wordlist::generate_passphrase;

fn passphrase_a() -> String {
	// Deterministic test passphrase — words are real BIP-39 entries.
	"abandon-ability-able-about-above-absent-absorb".to_string()
}

fn passphrase_b() -> String {
	"abstract-absurd-abuse-access-accident-account-accuse".to_string()
}

// ============================================================================
// SPAKE2 happy path
// ============================================================================

#[test]
fn pairing_succeeds_when_passphrases_match() {
	let pp = passphrase_a();

	let (host_state, host_msg) = start_pairing_host(&pp).unwrap();
	let (guest_state, guest_msg) = start_pairing_guest(&pp).unwrap();

	let host_key = finish_pairing_host(host_state, &guest_msg).unwrap();
	let guest_key = finish_pairing_guest(guest_state, &host_msg).unwrap();

	assert_eq!(host_key, guest_key, "matching passphrases must derive identical keys");
	assert_eq!(host_key.len(), 32);
}

#[test]
fn pairing_works_with_freshly_generated_passphrase() {
	// Same passphrase generated via the real word picker should work.
	let pp = generate_passphrase().join("-");

	let (host_state, host_msg) = start_pairing_host(&pp).unwrap();
	let (guest_state, guest_msg) = start_pairing_guest(&pp).unwrap();

	let host_key = finish_pairing_host(host_state, &guest_msg).unwrap();
	let guest_key = finish_pairing_guest(guest_state, &host_msg).unwrap();
	assert_eq!(host_key, guest_key);
}

#[test]
fn pairing_succeeds_with_user_typed_whitespace_variations() {
	let canonical = passphrase_a();
	let typed_with_spaces = "abandon ability able about above absent absorb";
	let typed_with_caps = "ABANDON-Ability-ABLE-about-ABOVE-absent-absorb";

	let (h1, h_msg) = start_pairing_host(&canonical).unwrap();
	let (g1, g_msg) = start_pairing_guest(typed_with_spaces).unwrap();
	let k1 = finish_pairing_host(h1, &g_msg).unwrap();
	let k2 = finish_pairing_guest(g1, &h_msg).unwrap();
	assert_eq!(k1, k2);

	let (h2, h_msg) = start_pairing_host(&canonical).unwrap();
	let (g2, g_msg) = start_pairing_guest(typed_with_caps).unwrap();
	let k3 = finish_pairing_host(h2, &g_msg).unwrap();
	let k4 = finish_pairing_guest(g2, &h_msg).unwrap();
	assert_eq!(k3, k4);
}

// ============================================================================
// SPAKE2 mismatch path
// ============================================================================

#[test]
fn pairing_keys_diverge_when_passphrases_differ() {
	let (host_state, host_msg) = start_pairing_host(&passphrase_a()).unwrap();
	let (guest_state, guest_msg) = start_pairing_guest(&passphrase_b()).unwrap();

	let host_key = finish_pairing_host(host_state, &guest_msg).unwrap();
	let guest_key = finish_pairing_guest(guest_state, &host_msg).unwrap();

	// SPAKE2 doesn't fail outright on a mismatch — it returns DIFFERENT
	// keys. The follow-up AES-GCM step (transport layer) will reject
	// any payload sealed under the wrong key, producing the generic
	// "incorrect passphrase" error to the user.
	assert_ne!(host_key, guest_key);
}

// ============================================================================
// Passphrase validation
// ============================================================================

#[test]
fn invalid_passphrase_is_rejected_with_typed_error() {
	let err = start_pairing_host("only three words").unwrap_err();
	assert!(matches!(err, PairingError::Passphrase(_)));
}

#[test]
fn unknown_word_is_surfaced_specifically() {
	let err = start_pairing_host(
		"kokobrain ability able about above absent absorb",
	)
	.unwrap_err();
	match err {
		PairingError::Passphrase(inner) => {
			let display = format!("{inner}");
			assert!(
				display.contains("kokobrain"),
				"error should name the offending word, got {display}"
			);
		}
		other => panic!("expected Passphrase error, got {other:?}"),
	}
}

#[test]
fn empty_passphrase_is_rejected() {
	let err = start_pairing_host("").unwrap_err();
	assert!(matches!(err, PairingError::Passphrase(_)));
}

// ============================================================================
// Trust store persistence
// ============================================================================

fn sample_peer(fp: &str, name: &str) -> TrustedPeer {
	TrustedPeer {
		fingerprint_hex: fp.to_string(),
		display_name: name.to_string(),
		public_key_b64: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".to_string(),
		trusted_at_ms: 1_700_000_000_000,
	}
}

#[test]
fn read_peers_returns_default_when_missing() {
	let tmp = tempfile::tempdir().unwrap();
	let file = read_peers(tmp.path()).unwrap();
	assert_eq!(file.version, CURRENT_PEERS_VERSION);
	assert!(file.peers.is_empty());
}

#[test]
fn write_then_read_round_trips() {
	let tmp = tempfile::tempdir().unwrap();
	let original = PeersFile {
		version: CURRENT_PEERS_VERSION,
		peers: vec![
			sample_peer("AAAA-BBBB-CCCC-DDDD", "MacBook"),
			sample_peer("1111-2222-3333-4444", "Desktop"),
		],
	};
	write_peers(tmp.path(), &original).unwrap();
	let parsed = read_peers(tmp.path()).unwrap();
	assert_eq!(parsed, original);
}

#[test]
fn write_creates_parent_directory() {
	let tmp = tempfile::tempdir().unwrap();
	let file = PeersFile::default();
	write_peers(tmp.path(), &file).unwrap();
	assert!(peers_file_path(tmp.path()).exists());
}

#[test]
fn read_rejects_unsupported_version() {
	let tmp = tempfile::tempdir().unwrap();
	let dir = tmp.path().join(".kokobrain").join("lan-sync");
	std::fs::create_dir_all(&dir).unwrap();
	std::fs::write(
		dir.join("peers.json"),
		serde_json::to_string_pretty(&serde_json::json!({
			"version": 999,
			"peers": []
		}))
		.unwrap(),
	)
	.unwrap();
	let err = read_peers(tmp.path()).unwrap_err();
	matches!(
		err,
		PairingError::VersionMismatch {
			found: 999,
			supported: _
		}
	);
}

#[test]
fn read_rejects_malformed_json() {
	let tmp = tempfile::tempdir().unwrap();
	let dir = tmp.path().join(".kokobrain").join("lan-sync");
	std::fs::create_dir_all(&dir).unwrap();
	std::fs::write(dir.join("peers.json"), "not json").unwrap();
	let err = read_peers(tmp.path()).unwrap_err();
	matches!(err, PairingError::Decode(_));
}

#[test]
fn add_trusted_peer_persists_entry() {
	let tmp = tempfile::tempdir().unwrap();
	add_trusted_peer(tmp.path(), sample_peer("AAAA-BBBB-CCCC-DDDD", "MacBook")).unwrap();
	let file = read_peers(tmp.path()).unwrap();
	assert_eq!(file.peers.len(), 1);
	assert_eq!(file.peers[0].display_name, "MacBook");
}

#[test]
fn add_trusted_peer_replaces_existing_fingerprint() {
	let tmp = tempfile::tempdir().unwrap();
	add_trusted_peer(tmp.path(), sample_peer("AAAA-BBBB-CCCC-DDDD", "Old name")).unwrap();
	add_trusted_peer(tmp.path(), sample_peer("AAAA-BBBB-CCCC-DDDD", "New name")).unwrap();
	let file = read_peers(tmp.path()).unwrap();
	assert_eq!(file.peers.len(), 1, "must dedupe by fingerprint");
	assert_eq!(file.peers[0].display_name, "New name");
}

#[test]
fn add_multiple_peers_keeps_them_all() {
	let tmp = tempfile::tempdir().unwrap();
	add_trusted_peer(tmp.path(), sample_peer("AAAA-BBBB-CCCC-DDDD", "A")).unwrap();
	add_trusted_peer(tmp.path(), sample_peer("1111-2222-3333-4444", "B")).unwrap();
	add_trusted_peer(tmp.path(), sample_peer("FFFF-EEEE-DDDD-CCCC", "C")).unwrap();
	let file = read_peers(tmp.path()).unwrap();
	assert_eq!(file.peers.len(), 3);
}

#[test]
fn remove_trusted_peer_drops_entry() {
	let tmp = tempfile::tempdir().unwrap();
	add_trusted_peer(tmp.path(), sample_peer("AAAA-BBBB-CCCC-DDDD", "A")).unwrap();
	add_trusted_peer(tmp.path(), sample_peer("1111-2222-3333-4444", "B")).unwrap();
	remove_trusted_peer(tmp.path(), "AAAA-BBBB-CCCC-DDDD").unwrap();
	let file = read_peers(tmp.path()).unwrap();
	assert_eq!(file.peers.len(), 1);
	assert_eq!(file.peers[0].display_name, "B");
}

#[test]
fn remove_unknown_peer_returns_error() {
	let tmp = tempfile::tempdir().unwrap();
	let err = remove_trusted_peer(tmp.path(), "NEVER-SEEN-AAAA-BBBB").unwrap_err();
	matches!(err, PairingError::UnknownPeer(_));
}

#[test]
fn is_trusted_check() {
	let tmp = tempfile::tempdir().unwrap();
	add_trusted_peer(tmp.path(), sample_peer("AAAA-BBBB-CCCC-DDDD", "A")).unwrap();
	assert!(is_trusted(tmp.path(), "AAAA-BBBB-CCCC-DDDD").unwrap());
	assert!(!is_trusted(tmp.path(), "9999-9999-9999-9999").unwrap());
}

// ============================================================================
// Trust store integrity (S3)
// ============================================================================

/// Writes a hand-crafted `peers.json` with `public_key_b64` swapped for
/// `bad_b64`. Used by the integrity tests below.
fn write_peers_json_with_pubkey(
	vault_root: &std::path::Path,
	fingerprint_hex: &str,
	bad_b64: &str,
) {
	let dir = vault_root.join(".kokobrain").join("lan-sync");
	std::fs::create_dir_all(&dir).unwrap();
	let json = serde_json::json!({
		"version": CURRENT_PEERS_VERSION,
		"peers": [
			{
				"fingerprintHex": fingerprint_hex,
				"displayName": "Hand-edited",
				"publicKeyB64": bad_b64,
				"trustedAtMs": 1_700_000_000_000_i64,
			}
		]
	});
	std::fs::write(
		dir.join("peers.json"),
		serde_json::to_string_pretty(&json).unwrap(),
	)
	.unwrap();
}

#[test]
fn read_rejects_peer_with_invalid_base64_pubkey() {
	let tmp = tempfile::tempdir().unwrap();
	// `!!!` contains characters outside the base64 alphabet.
	write_peers_json_with_pubkey(tmp.path(), "DEAD-BEEF-CAFE-BABE", "!!!");
	let err = read_peers(tmp.path()).unwrap_err();
	matches!(
		err,
		PairingError::TrustStoreCorrupt {
			fingerprint_hex: _,
			reason: _
		}
	);
	match err {
		PairingError::TrustStoreCorrupt {
			fingerprint_hex,
			reason: _,
		} => assert_eq!(fingerprint_hex, "DEAD-BEEF-CAFE-BABE"),
		other => panic!("expected TrustStoreCorrupt, got {other:?}"),
	}
}

#[test]
fn read_rejects_peer_with_wrong_length_pubkey() {
	let tmp = tempfile::tempdir().unwrap();
	// Decodes to 16 bytes (valid base64, wrong size for an Ed25519 key).
	write_peers_json_with_pubkey(tmp.path(), "AAAA-BBBB-CCCC-DDDD", "AAECAwQFBgcICQoLDA0ODw==");
	let err = read_peers(tmp.path()).unwrap_err();
	match err {
		PairingError::TrustStoreCorrupt {
			fingerprint_hex,
			reason,
		} => {
			assert_eq!(fingerprint_hex, "AAAA-BBBB-CCCC-DDDD");
			assert!(
				reason.contains("16 bytes"),
				"reason should mention the actual byte count, got {reason:?}"
			);
		}
		other => panic!("expected TrustStoreCorrupt, got {other:?}"),
	}
}

#[cfg(unix)]
#[test]
fn write_peers_sets_owner_only_permissions() {
	use std::os::unix::fs::PermissionsExt;
	let tmp = tempfile::tempdir().unwrap();
	let file = PeersFile {
		version: CURRENT_PEERS_VERSION,
		peers: vec![sample_peer("AAAA-BBBB-CCCC-DDDD", "Machine")],
	};
	write_peers(tmp.path(), &file).unwrap();
	let mode = std::fs::metadata(peers_file_path(tmp.path()))
		.unwrap()
		.permissions()
		.mode();
	// `mode()` returns the full st_mode including file-type bits; mask
	// down to the permission bits before comparing.
	assert_eq!(mode & 0o777, 0o600, "peers.json must be 0600, got {mode:o}");
}

#[cfg(unix)]
#[test]
fn add_trusted_peer_preserves_owner_only_permissions() {
	use std::os::unix::fs::PermissionsExt;
	let tmp = tempfile::tempdir().unwrap();
	add_trusted_peer(tmp.path(), sample_peer("AAAA-BBBB-CCCC-DDDD", "First")).unwrap();
	add_trusted_peer(tmp.path(), sample_peer("1111-2222-3333-4444", "Second")).unwrap();
	let mode = std::fs::metadata(peers_file_path(tmp.path()))
		.unwrap()
		.permissions()
		.mode();
	assert_eq!(mode & 0o777, 0o600);
}

#[test]
fn read_accepts_well_formed_32_byte_pubkey() {
	let tmp = tempfile::tempdir().unwrap();
	// 32 zero bytes encoded as base64 (43 'A's + one padding '=').
	write_peers_json_with_pubkey(
		tmp.path(),
		"FEED-FACE-DEAD-BEEF",
		"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
	);
	let file = read_peers(tmp.path()).unwrap();
	assert_eq!(file.peers.len(), 1);
}
