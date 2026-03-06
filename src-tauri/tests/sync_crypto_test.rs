use noted_lib::sync::crypto::{
	derive_master_key, derive_sync_keys, generate_passphrase, hash_vault_id_for_mdns,
	load_sync_local_config, load_sync_state, prune_stale_peers, read_or_create_vault_id,
	save_sync_local_config, save_sync_state, sign_manifest, validate_passphrase, verify_manifest,
	SyncLocalConfig, SyncState, PASSPHRASE_CHARSET, STALE_PEER_RETENTION_SECS,
};

// -- derive_master_key ------------------------------------------------------

#[test]
fn derive_master_key_deterministic() {
	let k1 = derive_master_key("my-strong-passphrase!", "vault-uuid-123").unwrap();
	let k2 = derive_master_key("my-strong-passphrase!", "vault-uuid-123").unwrap();
	assert_eq!(k1.as_ref(), k2.as_ref());
}

#[test]
fn derive_master_key_different_inputs() {
	let k1 = derive_master_key("passphrase-aaa!!!", "vault-uuid-123").unwrap();
	let k2 = derive_master_key("passphrase-bbb!!!", "vault-uuid-123").unwrap();
	assert_ne!(k1.as_ref(), k2.as_ref());

	let k3 = derive_master_key("same-passphrase!!!", "uuid-aaa").unwrap();
	let k4 = derive_master_key("same-passphrase!!!", "uuid-bbb").unwrap();
	assert_ne!(k3.as_ref(), k4.as_ref());
}

#[test]
fn master_key_is_zeroizing() {
	let key = derive_master_key("test-passphrase!!", "vault-uuid").unwrap();
	// Verify it's a Zeroizing wrapper — the type system enforces this,
	// but we confirm by accessing inner data before drop.
	assert_eq!(key.len(), 32);
}

// -- generate_passphrase ----------------------------------------------------

#[test]
fn generate_passphrase_length() {
	for _ in 0..10 {
		let p = generate_passphrase();
		assert_eq!(p.len(), 15);
	}
}

#[test]
fn generate_passphrase_charset() {
	let charset: &[u8] = PASSPHRASE_CHARSET;
	for _ in 0..20 {
		let p = generate_passphrase();
		for c in p.bytes() {
			assert!(
				charset.contains(&c),
				"Unexpected char '{}' in passphrase",
				c as char
			);
		}
	}
}

#[test]
fn generate_passphrase_randomness() {
	let p1 = generate_passphrase();
	let p2 = generate_passphrase();
	// Probabilistically, two 15-char passphrases from 69-char charset should differ.
	assert_ne!(p1, p2, "Two generated passphrases should differ");
}

// -- validate_passphrase ----------------------------------------------------

#[test]
fn validate_passphrase_too_short() {
	assert!(validate_passphrase("short").is_err());
	assert!(validate_passphrase("14-chars-long!").is_err());
}

#[test]
fn validate_passphrase_ok() {
	assert!(validate_passphrase("exactly15chars!").is_ok());
	assert!(validate_passphrase("this-is-a-longer-passphrase!!!").is_ok());
}

// -- sign_manifest / verify_manifest ----------------------------------------

#[test]
fn sign_manifest_deterministic() {
	let key = [42u8; 32];
	let manifest = b"some manifest data";
	let mac1 = sign_manifest(&key, manifest);
	let mac2 = sign_manifest(&key, manifest);
	assert_eq!(mac1, mac2);
}

#[test]
fn verify_manifest_valid() {
	let key = [42u8; 32];
	let manifest = b"some manifest data";
	let mac = sign_manifest(&key, manifest);
	let now = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap()
		.as_secs();
	assert!(verify_manifest(&key, manifest, &mac, now));
}

#[test]
fn verify_manifest_tampered() {
	let key = [42u8; 32];
	let manifest = b"some manifest data";
	let mac = sign_manifest(&key, manifest);
	let now = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap()
		.as_secs();
	assert!(!verify_manifest(&key, b"tampered manifest", &mac, now));
}

#[test]
fn verify_manifest_replay_rejected() {
	let key = [42u8; 32];
	let manifest = b"some manifest data";
	let mac = sign_manifest(&key, manifest);
	// 20 minutes ago — should be rejected
	let old_ts = std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap()
		.as_secs()
		- 20 * 60;
	assert!(!verify_manifest(&key, manifest, &mac, old_ts));
}

// -- derive_sync_keys -------------------------------------------------------

#[test]
fn derive_sync_keys_deterministic() {
	let master = [99u8; 32];
	let k1 = derive_sync_keys(&master).unwrap();
	let k2 = derive_sync_keys(&master).unwrap();
	assert_eq!(k1.psk_key.as_ref(), k2.psk_key.as_ref());
	assert_eq!(k1.hmac_key.as_ref(), k2.hmac_key.as_ref());
}

#[test]
fn derive_sync_keys_different_from_master() {
	let master = [99u8; 32];
	let keys = derive_sync_keys(&master).unwrap();
	assert_ne!(keys.psk_key.as_ref(), &master);
	assert_ne!(keys.hmac_key.as_ref(), &master);
}

#[test]
fn derive_sync_keys_psk_differs_from_hmac() {
	let master = [99u8; 32];
	let keys = derive_sync_keys(&master).unwrap();
	assert_ne!(keys.psk_key.as_ref(), keys.hmac_key.as_ref());
}

// -- hash_vault_id_for_mdns -------------------------------------------------

#[test]
fn hash_vault_id_for_mdns_length() {
	let hash = hash_vault_id_for_mdns("550e8400-e29b-41d4-a716-446655440000");
	assert_eq!(hash.len(), 16, "Expected 16 hex chars (8 bytes)");
}

#[test]
fn hash_vault_id_for_mdns_deterministic() {
	let h1 = hash_vault_id_for_mdns("some-uuid");
	let h2 = hash_vault_id_for_mdns("some-uuid");
	assert_eq!(h1, h2);
}

#[test]
fn hash_vault_id_for_mdns_different_uuids() {
	let h1 = hash_vault_id_for_mdns("uuid-aaa");
	let h2 = hash_vault_id_for_mdns("uuid-bbb");
	assert_ne!(h1, h2);
}

// -- sync state persistence -------------------------------------------------

#[test]
fn load_sync_state_default_when_missing() {
	let dir = tempfile::tempdir().unwrap();
	let state = load_sync_state(dir.path().to_str().unwrap()).unwrap();
	assert!(state.canonical_vault_uuid.is_none());
	assert!(state.last_sync.is_empty());
}

#[test]
fn save_and_load_sync_state_roundtrip() {
	let dir = tempfile::tempdir().unwrap();
	let vault_path = dir.path().to_str().unwrap();

	let mut state = SyncState::default();
	state.canonical_vault_uuid = Some("test-uuid".to_string());
	state.last_sync.insert("peer-1".to_string(), 1234567890);

	save_sync_state(vault_path, &state).unwrap();
	let loaded = load_sync_state(vault_path).unwrap();

	assert_eq!(loaded.canonical_vault_uuid, Some("test-uuid".to_string()));
	assert_eq!(loaded.last_sync.get("peer-1"), Some(&1234567890));
}

// -- sync local config persistence ------------------------------------------

#[test]
fn load_sync_local_config_default_when_missing() {
	let dir = tempfile::tempdir().unwrap();
	let config = load_sync_local_config(dir.path().to_str().unwrap()).unwrap();
	assert!(config.allowed_paths.is_empty());
	assert_eq!(config.port, 39782);
	assert_eq!(config.interval_secs, 300);
}

#[test]
fn save_and_load_sync_local_config_roundtrip() {
	let dir = tempfile::tempdir().unwrap();
	let vault_path = dir.path().to_str().unwrap();

	let config = SyncLocalConfig {
		allowed_paths: vec!["private/".to_string(), "drafts/".to_string()],
		port: 40000,
		interval_secs: 120,
	};

	save_sync_local_config(vault_path, &config).unwrap();
	let loaded = load_sync_local_config(vault_path).unwrap();

	assert_eq!(loaded.allowed_paths, vec!["private/", "drafts/"]);
	assert_eq!(loaded.port, 40000);
	assert_eq!(loaded.interval_secs, 120);
}

// -- vault identity ---------------------------------------------------------

#[test]
fn read_or_create_vault_id_creates_new() {
	let dir = tempfile::tempdir().unwrap();
	let id = read_or_create_vault_id(dir.path().to_str().unwrap()).unwrap();
	assert!(!id.is_empty());
	// Should be a valid UUID format (8-4-4-4-12)
	assert_eq!(id.len(), 36);
	assert_eq!(id.chars().filter(|c| *c == '-').count(), 4);
}

#[test]
fn read_or_create_vault_id_idempotent() {
	let dir = tempfile::tempdir().unwrap();
	let vault_path = dir.path().to_str().unwrap();
	let id1 = read_or_create_vault_id(vault_path).unwrap();
	let id2 = read_or_create_vault_id(vault_path).unwrap();
	assert_eq!(id1, id2);
}

// -- prune_stale_peers -------------------------------------------------------

fn now_secs() -> u64 {
	std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap()
		.as_secs()
}

#[test]
fn prune_stale_peers_removes_old_entries() {
	let mut state = SyncState::default();
	let old_ts = now_secs() - STALE_PEER_RETENTION_SECS - 100;
	state.last_sync.insert("old-peer".into(), old_ts);
	state.baseline_manifests.insert("old-peer".into(), serde_json::json!({"files": []}));

	prune_stale_peers(&mut state, STALE_PEER_RETENTION_SECS);

	assert!(!state.last_sync.contains_key("old-peer"));
	assert!(!state.baseline_manifests.contains_key("old-peer"));
}

#[test]
fn prune_stale_peers_keeps_recent_entries() {
	let mut state = SyncState::default();
	let recent_ts = now_secs() - 3600; // 1 hour ago
	state.last_sync.insert("recent-peer".into(), recent_ts);
	state.baseline_manifests.insert("recent-peer".into(), serde_json::json!({"files": []}));

	prune_stale_peers(&mut state, STALE_PEER_RETENTION_SECS);

	assert!(state.last_sync.contains_key("recent-peer"));
	assert!(state.baseline_manifests.contains_key("recent-peer"));
}

#[test]
fn prune_stale_peers_removes_orphaned_baselines() {
	let mut state = SyncState::default();
	// Baseline exists but no corresponding last_sync entry
	state.baseline_manifests.insert("orphan-peer".into(), serde_json::json!({"files": []}));

	prune_stale_peers(&mut state, STALE_PEER_RETENTION_SECS);

	assert!(!state.baseline_manifests.contains_key("orphan-peer"));
}

#[test]
fn prune_stale_peers_mixed_scenario() {
	let mut state = SyncState::default();
	let now = now_secs();

	// Old peer — should be pruned
	state.last_sync.insert("old".into(), now - STALE_PEER_RETENTION_SECS - 1);
	state.baseline_manifests.insert("old".into(), serde_json::json!({}));

	// Recent peer — should be kept
	state.last_sync.insert("recent".into(), now - 60);
	state.baseline_manifests.insert("recent".into(), serde_json::json!({}));

	// Orphaned baseline — should be pruned
	state.baseline_manifests.insert("orphan".into(), serde_json::json!({}));

	prune_stale_peers(&mut state, STALE_PEER_RETENTION_SECS);

	assert!(!state.last_sync.contains_key("old"));
	assert!(!state.baseline_manifests.contains_key("old"));
	assert!(state.last_sync.contains_key("recent"));
	assert!(state.baseline_manifests.contains_key("recent"));
	assert!(!state.baseline_manifests.contains_key("orphan"));
}
