//! Sanity tests for the Tauri commands surface in
//! `commands::sync`. We don't drive the actual `tauri::State<...>`
//! plumbing here (that requires a Tauri runtime); instead we exercise
//! the pure pathways each command delegates to, so refactors that
//! change command bodies surface in tests.

use kokobrain_lib::sync::pairing::{self, TrustedPeer};
use kokobrain_lib::sync::shares::{self, Share, ShareDirection, ShareMode, SharesFile};
use uuid::Uuid;

fn vault_root() -> tempfile::TempDir {
	tempfile::tempdir().unwrap()
}

fn make_share(mode: ShareMode, local_path: &str) -> Share {
	Share {
		id: format!("share-{}", Uuid::new_v4()),
		mode,
		local_path: local_path.to_string(),
		excludes: Vec::new(),
		allowed_peer_fingerprints: vec!["AAAA-BBBB-CCCC-DDDD".to_string()],
		direction: ShareDirection::Bi,
		read_only: false,
		created_at_ms: 1_700_000_000_000,
	}
}

fn make_peer(fp: &str) -> TrustedPeer {
	TrustedPeer {
		fingerprint_hex: fp.to_string(),
		display_name: "Test".to_string(),
		public_key_b64: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=".to_string(),
		trusted_at_ms: 1_700_000_000_000,
	}
}

#[test]
fn add_then_list_shares_round_trips_through_disk() {
	let tmp = vault_root();
	let share = make_share(ShareMode::Subfolder, "Projects/sync-test");
	let mut file = shares::read_shares(tmp.path()).unwrap();
	file.shares.push(share.clone());
	shares::write_shares(tmp.path(), &file).unwrap();
	let listed = shares::read_shares(tmp.path()).unwrap();
	assert_eq!(listed.shares.len(), 1);
	assert_eq!(listed.shares[0].id, share.id);
}

#[test]
fn remove_share_keeps_others_intact() {
	let tmp = vault_root();
	let a = make_share(ShareMode::Subfolder, "Projects/a");
	let b = make_share(ShareMode::Subfolder, "Projects/b");
	let file = SharesFile {
		version: shares::CURRENT_SHARES_VERSION,
		shares: vec![a.clone(), b.clone()],
	};
	shares::write_shares(tmp.path(), &file).unwrap();
	// Simulate what the command does: read, retain, write.
	let mut file2 = shares::read_shares(tmp.path()).unwrap();
	file2.shares.retain(|s| s.id != a.id);
	shares::write_shares(tmp.path(), &file2).unwrap();
	let final_file = shares::read_shares(tmp.path()).unwrap();
	assert_eq!(final_file.shares.len(), 1);
	assert_eq!(final_file.shares[0].id, b.id);
}

#[test]
fn list_trusted_peers_returns_added_peer() {
	let tmp = vault_root();
	pairing::add_trusted_peer(tmp.path(), make_peer("AAAA-BBBB-CCCC-DDDD")).unwrap();
	let file = pairing::read_peers(tmp.path()).unwrap();
	assert_eq!(file.peers.len(), 1);
	assert_eq!(file.peers[0].fingerprint_hex, "AAAA-BBBB-CCCC-DDDD");
}

#[test]
fn list_trusted_peers_is_empty_on_fresh_vault() {
	let tmp = vault_root();
	let file = pairing::read_peers(tmp.path()).unwrap();
	assert!(file.peers.is_empty());
}

#[test]
fn validate_share_rejects_dot_kokobrain() {
	let tmp = vault_root();
	let share = make_share(ShareMode::Subfolder, ".kokobrain");
	let result = shares::validate_share_config(tmp.path(), &share);
	assert!(result.is_err());
}

#[test]
fn share_root_with_excludes_passes_validation() {
	let tmp = vault_root();
	let mut share = make_share(ShareMode::RootWithExcludes, "");
	share.excludes = vec!["Trabalho".to_string(), "Pessoal".to_string()];
	assert!(shares::validate_share_config(tmp.path(), &share).is_ok());
}
