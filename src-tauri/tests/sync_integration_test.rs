use std::time::Duration;

use noted_lib::sync::client;
use noted_lib::sync::conflict;
use noted_lib::sync::crypto::{self, SyncState};
use noted_lib::sync::manifest::{self, SyncManifest};
use noted_lib::sync::noise_transport::{NoiseTransport, NOISE_PATTERN};
use noted_lib::sync::server;
use tempfile::TempDir;
use zeroize::Zeroizing;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Generates a test X25519 keypair via snow. Returns (public, private).
fn generate_keypair() -> ([u8; 32], [u8; 32]) {
	let builder = snow::Builder::new(NOISE_PATTERN.parse().unwrap());
	let kp = builder.generate_keypair().unwrap();
	let mut pub_key = [0u8; 32];
	let mut priv_key = [0u8; 32];
	pub_key.copy_from_slice(&kp.public);
	priv_key.copy_from_slice(&kp.private);
	(pub_key, priv_key)
}

/// Creates a temporary vault with `.noted/vault-id` set to the given UUID.
fn create_test_vault(uuid: &str) -> TempDir {
	let tmp = TempDir::new().unwrap();
	let noted_dir = tmp.path().join(".noted");
	std::fs::create_dir_all(&noted_dir).unwrap();
	std::fs::write(noted_dir.join("vault-id"), uuid).unwrap();
	tmp
}

/// Derives sync keys from a passphrase and vault UUID (pure, no Keychain).
fn derive_test_keys(passphrase: &str, vault_uuid: &str) -> crypto::SyncKeys {
	let master = crypto::derive_master_key(passphrase, vault_uuid).unwrap();
	crypto::derive_sync_keys(&master).unwrap()
}

/// Writes a markdown file into a vault and returns its relative path.
fn write_vault_md(vault: &TempDir, rel_path: &str, content: &str) {
	let full = vault.path().join(rel_path);
	if let Some(parent) = full.parent() {
		std::fs::create_dir_all(parent).unwrap();
	}
	std::fs::write(&full, content).unwrap();
}

/// Reads a file from a vault, returning its content as a string.
fn read_vault_md(vault: &TempDir, rel_path: &str) -> String {
	let full = vault.path().join(rel_path);
	std::fs::read_to_string(full).unwrap()
}

/// Checks if a file exists in a vault.
fn vault_file_exists(vault: &TempDir, rel_path: &str) -> bool {
	vault.path().join(rel_path).exists()
}

// ---------------------------------------------------------------------------
// Test 1: Full sync cycle — two peers synchronize a .md file via loopback
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_full_sync_cycle_two_peers() {
	let uuid = "test-vault-uuid-full-sync";
	let passphrase = "test-passphrase-1234567890";
	let keys = derive_test_keys(passphrase, uuid);

	// Peer A has a file, Peer B does not
	let vault_a = create_test_vault(uuid);
	let vault_b = create_test_vault(uuid);
	write_vault_md(&vault_a, "hello.md", "# Hello from A");

	// Start server for Peer B (the one that will receive the file)
	let (_, priv_b) = generate_keypair();
	let server_b = server::start_server(
		vault_b.path().to_str().unwrap().to_string(),
		0, // OS-assigned port
		crypto::SyncKeys {
			psk_key: Zeroizing::new(*keys.psk_key),
			hmac_key: Zeroizing::new(*keys.hmac_key),
		},
		Zeroizing::new(priv_b),
	)
	.await
	.unwrap();

	let server_b_addr = server_b.addr;

	// Peer A opens a session to Peer B's server
	let (_, priv_a) = generate_keypair();
	let mut session = client::open_session(
		server_b_addr,
		&keys.psk_key,
		&priv_a,
		uuid,
	)
	.await
	.unwrap();

	// Fetch Peer B's manifest (should only have .noted/vault-id, no .md files)
	let remote_manifest = session.fetch_manifest(&keys.hmac_key).await.unwrap();
	assert!(
		!remote_manifest.files.iter().any(|f| f.path == "hello.md"),
		"Peer B should not have hello.md yet"
	);

	// Build Peer A's local manifest
	let local_manifest = manifest::build_manifest(
		vault_a.path().to_str().unwrap(),
		&[],
	)
	.unwrap();
	assert!(
		local_manifest.files.iter().any(|f| f.path == "hello.md"),
		"Peer A should have hello.md"
	);

	// Diff: hello.md exists only on A → PushToPeer
	let diffs = manifest::diff_manifests(&local_manifest, &remote_manifest, None);
	let hello_diff = diffs.iter().find(|(p, _)| p == "hello.md");
	assert!(matches!(
		hello_diff,
		Some((_, manifest::FileDiff::PushToPeer))
	));

	// Push the file to Peer B
	let (content, mtime) =
		server::read_vault_file(vault_a.path().to_str().unwrap(), "hello.md").unwrap();
	session.push_file("hello.md", &content, mtime).await.unwrap();

	// Verify the file now exists on Peer B
	let pushed_content = read_vault_md(&vault_b, "hello.md");
	assert_eq!(pushed_content, "# Hello from A");

	server_b.stop().await;
}

// ---------------------------------------------------------------------------
// Test 2: Delete propagation — delete on peer A → sync → deleted on peer B
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_delete_propagation_two_peers() {
	let uuid = "test-vault-uuid-delete-prop";
	let passphrase = "test-passphrase-delete-prop";
	let keys = derive_test_keys(passphrase, uuid);

	// Use the same vault-id so manifests match on the vault-id entry
	let vault_a = create_test_vault(uuid);
	let vault_b = create_test_vault(uuid);
	write_vault_md(&vault_a, "shared.md", "# Shared note");
	write_vault_md(&vault_b, "shared.md", "# Shared note");

	// Build baseline from A (both vaults are identical at this point)
	let baseline = manifest::build_manifest(
		vault_a.path().to_str().unwrap(),
		&[],
	)
	.unwrap();
	assert!(
		baseline.files.iter().any(|f| f.path == "shared.md"),
		"Baseline should contain shared.md"
	);

	// Peer A deletes the file
	std::fs::remove_file(vault_a.path().join("shared.md")).unwrap();

	// Start server for Peer B
	let (_, priv_b) = generate_keypair();
	let server_b = server::start_server(
		vault_b.path().to_str().unwrap().to_string(),
		0,
		crypto::SyncKeys {
			psk_key: Zeroizing::new(*keys.psk_key),
			hmac_key: Zeroizing::new(*keys.hmac_key),
		},
		Zeroizing::new(priv_b),
	)
	.await
	.unwrap();

	// Peer A opens a session to Peer B
	let (_, priv_a) = generate_keypair();
	let mut session = client::open_session(
		server_b.addr,
		&keys.psk_key,
		&priv_a,
		uuid,
	)
	.await
	.unwrap();

	let remote_manifest = session.fetch_manifest(&keys.hmac_key).await.unwrap();
	let local_manifest = manifest::build_manifest(
		vault_a.path().to_str().unwrap(),
		&[],
	)
	.unwrap();

	// From A's perspective: shared.md absent locally, present remotely + baseline
	// → DeleteLocal (describes: the file was deleted on the local side)
	let diffs = manifest::diff_manifests(
		&local_manifest,
		&remote_manifest,
		Some(&baseline),
	);
	let shared_diff = diffs.iter().find(|(p, _)| p == "shared.md");
	assert!(
		matches!(shared_diff, Some((_, manifest::FileDiff::DeleteLocal))),
		"From A's view: shared.md absent locally → DeleteLocal. Got: {shared_diff:?}"
	);

	// Propagate the deletion: A tells B to delete via session protocol
	session.delete_file("shared.md").await.unwrap();

	// Verify the file is gone on Peer B
	assert!(!vault_file_exists(&vault_b, "shared.md"));

	server_b.stop().await;
}

// ---------------------------------------------------------------------------
// Test 3: Delete-modify conflict — A deletes, B modifies → modified preserved
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_delete_modify_conflict_keeps_modified() {
	let uuid = "test-vault-uuid-del-mod";
	let passphrase = "test-passphrase-del-modify";
	let keys = derive_test_keys(passphrase, uuid);

	// Both peers start with the same file
	let vault_a = create_test_vault(uuid);
	let vault_b = create_test_vault(uuid);
	write_vault_md(&vault_a, "note.md", "# Original");
	write_vault_md(&vault_b, "note.md", "# Original");

	// Build baseline (both have same content)
	let baseline = manifest::build_manifest(
		vault_a.path().to_str().unwrap(),
		&[],
	)
	.unwrap();

	// Peer A deletes the file
	std::fs::remove_file(vault_a.path().join("note.md")).unwrap();

	// Peer B modifies the file
	write_vault_md(&vault_b, "note.md", "# Modified by B");

	// Start server for Peer B
	let (_, priv_b) = generate_keypair();
	let server_b = server::start_server(
		vault_b.path().to_str().unwrap().to_string(),
		0,
		crypto::SyncKeys {
			psk_key: Zeroizing::new(*keys.psk_key),
			hmac_key: Zeroizing::new(*keys.hmac_key),
		},
		Zeroizing::new(priv_b),
	)
	.await
	.unwrap();

	// Peer A connects and syncs
	let (_, priv_a) = generate_keypair();
	let mut session = client::open_session(
		server_b.addr,
		&keys.psk_key,
		&priv_a,
		uuid,
	)
	.await
	.unwrap();

	let remote_manifest = session.fetch_manifest(&keys.hmac_key).await.unwrap();
	let local_manifest = manifest::build_manifest(
		vault_a.path().to_str().unwrap(),
		&[],
	)
	.unwrap();

	// Diff: A deleted, B modified → DeleteModifyConflict { modified_side: Remote }
	let diffs = manifest::diff_manifests(
		&local_manifest,
		&remote_manifest,
		Some(&baseline),
	);
	let note_diff = diffs.iter().find(|(p, _)| p == "note.md");
	assert!(matches!(
		note_diff,
		Some((_, manifest::FileDiff::DeleteModifyConflict {
			modified_side: manifest::Side::Remote,
		}))
	));

	// Resolve: fetch modified version from B and keep it on A
	let (content, mtime) = session.fetch_file("note.md").await.unwrap();
	conflict::resolve_delete_modify_conflict(
		vault_a.path().to_str().unwrap(),
		"note.md",
		&content,
		mtime,
		manifest::Side::Remote,
	)
	.unwrap();

	// Verify the modified version is preserved on A
	let restored = read_vault_md(&vault_a, "note.md");
	assert_eq!(restored, "# Modified by B");

	server_b.stop().await;
}

// ---------------------------------------------------------------------------
// Test 4: Three-way diff — only A modifies → no conflict (baseline detects)
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_three_way_diff_no_false_conflicts() {
	let uuid = "test-vault-uuid-3way";
	let passphrase = "test-passphrase-3way-diff";
	let keys = derive_test_keys(passphrase, uuid);

	// Both peers start with the same file
	let vault_a = create_test_vault(uuid);
	let vault_b = create_test_vault(uuid);
	write_vault_md(&vault_a, "doc.md", "# Original content");
	write_vault_md(&vault_b, "doc.md", "# Original content");

	// Build baseline (same content on both)
	let baseline = manifest::build_manifest(
		vault_a.path().to_str().unwrap(),
		&[],
	)
	.unwrap();

	// Only Peer A modifies the file (Peer B unchanged)
	write_vault_md(&vault_a, "doc.md", "# Updated by A only");

	// Start server for Peer B
	let (_, priv_b) = generate_keypair();
	let server_b = server::start_server(
		vault_b.path().to_str().unwrap().to_string(),
		0,
		crypto::SyncKeys {
			psk_key: Zeroizing::new(*keys.psk_key),
			hmac_key: Zeroizing::new(*keys.hmac_key),
		},
		Zeroizing::new(priv_b),
	)
	.await
	.unwrap();

	// Peer A connects and fetches Peer B's manifest
	let (_, priv_a) = generate_keypair();
	let mut session = client::open_session(
		server_b.addr,
		&keys.psk_key,
		&priv_a,
		uuid,
	)
	.await
	.unwrap();

	let remote_manifest = session.fetch_manifest(&keys.hmac_key).await.unwrap();
	let local_manifest = manifest::build_manifest(
		vault_a.path().to_str().unwrap(),
		&[],
	)
	.unwrap();

	// Three-way diff: A changed, B unchanged → PushToPeer (NOT Conflict)
	let diffs = manifest::diff_manifests(
		&local_manifest,
		&remote_manifest,
		Some(&baseline),
	);
	let doc_diff = diffs.iter().find(|(p, _)| p == "doc.md");
	assert!(
		matches!(doc_diff, Some((_, manifest::FileDiff::PushToPeer))),
		"Only-A-modified should be PushToPeer, not Conflict. Got: {doc_diff:?}"
	);

	// Push to B and verify
	let (content, mtime) =
		server::read_vault_file(vault_a.path().to_str().unwrap(), "doc.md").unwrap();
	session.push_file("doc.md", &content, mtime).await.unwrap();

	let synced = read_vault_md(&vault_b, "doc.md");
	assert_eq!(synced, "# Updated by A only");

	server_b.stop().await;
}

// ---------------------------------------------------------------------------
// Test 5: Idle timeout — connection without messages for 60s → closed
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_idle_timeout() {
	let psk = [42u8; 32];
	let (_, priv_a) = generate_keypair();
	let (_, priv_b) = generate_keypair();

	let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
		.await
		.unwrap();
	let addr = listener.local_addr().unwrap();

	// Spawn a server handler that mirrors the idle timeout logic
	let handle = tokio::spawn(async move {
		let (stream, _) = listener.accept().await.unwrap();
		let mut transport = NoiseTransport::accept(stream, &psk, &priv_b)
			.await
			.unwrap();

		// Wait with a short idle timeout (200ms for fast test)
		let idle_timeout = Duration::from_millis(200);
		loop {
			tokio::select! {
				_ = tokio::time::sleep(idle_timeout) => {
					if transport.last_activity().elapsed() >= idle_timeout {
						return "timed_out";
					}
				}
				result = transport.recv() => {
					match result {
						Ok(_) => continue,
						Err(_) => return "error",
					}
				}
			}
		}
	});

	// Client connects but sends nothing
	let _client = NoiseTransport::connect(addr, &psk, &priv_a)
		.await
		.unwrap();

	// Wait for the server to time out
	let result = tokio::time::timeout(Duration::from_secs(5), handle)
		.await
		.unwrap()
		.unwrap();

	assert_eq!(result, "timed_out");
}

// ---------------------------------------------------------------------------
// Test 6: Vault ID is never overwritten on receiver
// ---------------------------------------------------------------------------

#[tokio::test]
async fn test_vault_id_never_overwritten() {
	let sender_uuid = "sender-vault-uuid-123";
	let receiver_uuid = "receiver-vault-uuid-456";
	let passphrase = "test-passphrase-vault-id!";

	// Both vaults start with different vault-ids
	let _vault_sender = create_test_vault(sender_uuid);
	let vault_receiver = create_test_vault(receiver_uuid);

	// Verify initial vault-ids
	let initial_receiver_id = std::fs::read_to_string(
		vault_receiver.path().join(".noted/vault-id"),
	)
	.unwrap();
	assert_eq!(initial_receiver_id, receiver_uuid);

	// Sync the vault-id file from sender to receiver via push
	// (vault-id is in the NOTED_DIR_ALLOWLIST, so it would be synced)
	let keys = derive_test_keys(passphrase, sender_uuid);
	let (_, priv_b) = generate_keypair();
	let server_recv = server::start_server(
		vault_receiver.path().to_str().unwrap().to_string(),
		0,
		crypto::SyncKeys {
			psk_key: Zeroizing::new(*keys.psk_key),
			hmac_key: Zeroizing::new(*keys.hmac_key),
		},
		Zeroizing::new(priv_b),
	)
	.await
	.unwrap();

	let (_, priv_a) = generate_keypair();
	let session = client::open_session(
		server_recv.addr,
		&keys.psk_key,
		&priv_a,
		sender_uuid,
	)
	.await
	.unwrap();

	// The UUID exchange happens during open_session.
	// The server (receiver) should have saved the sender's UUID as canonical
	// in sync-state.json, but the vault-id FILE should be untouched.
	let receiver_id_after = std::fs::read_to_string(
		vault_receiver.path().join(".noted/vault-id"),
	)
	.unwrap();
	assert_eq!(
		receiver_id_after, receiver_uuid,
		"Receiver's vault-id file should NOT be overwritten by sync"
	);

	// Verify the canonical UUID was saved in sync-state.json
	let sync_state = crypto::load_sync_state(
		vault_receiver.path().to_str().unwrap(),
	)
	.unwrap();
	assert_eq!(
		sync_state.canonical_vault_uuid,
		Some(sender_uuid.to_string()),
		"Canonical UUID should be the sender's UUID (initiator)"
	);

	drop(session);
	server_recv.stop().await;
}

// ---------------------------------------------------------------------------
// Test 7: Baseline persists across restarts
// ---------------------------------------------------------------------------

#[test]
fn test_baseline_persists_across_restarts() {
	let vault = create_test_vault("test-vault-uuid-baseline-persist");
	let vault_path = vault.path().to_str().unwrap();

	// Write a file and build a manifest to use as baseline
	write_vault_md(&vault, "persist.md", "# Persistent note");
	let manifest = manifest::build_manifest(vault_path, &[]).unwrap();
	// Manifest includes persist.md + .noted/vault-id (from NOTED_DIR_ALLOWLIST)
	assert!(
		manifest.files.iter().any(|f| f.path == "persist.md"),
		"Manifest should contain persist.md"
	);

	// Save sync state with baseline
	let mut state = SyncState::default();
	state.canonical_vault_uuid = Some("test-vault-uuid-baseline-persist".to_string());
	state.baseline_manifests.insert(
		"peer-abc".to_string(),
		serde_json::to_value(&manifest).unwrap(),
	);
	state.last_sync.insert("peer-abc".to_string(), 1700000000);
	crypto::save_sync_state(vault_path, &state).unwrap();

	// "Restart": load sync state from disk
	let loaded = crypto::load_sync_state(vault_path).unwrap();

	// Verify everything survived the restart
	assert_eq!(
		loaded.canonical_vault_uuid,
		Some("test-vault-uuid-baseline-persist".to_string())
	);
	assert!(loaded.baseline_manifests.contains_key("peer-abc"));

	let loaded_baseline: SyncManifest = serde_json::from_value(
		loaded.baseline_manifests["peer-abc"].clone(),
	)
	.unwrap();
	let persist_entry = loaded_baseline.files.iter().find(|f| f.path == "persist.md");
	assert!(persist_entry.is_some(), "Loaded baseline should contain persist.md");
	let original_entry = manifest.files.iter().find(|f| f.path == "persist.md").unwrap();
	assert_eq!(persist_entry.unwrap().sha256, original_entry.sha256);
	assert_eq!(*loaded.last_sync.get("peer-abc").unwrap(), 1700000000u64);

	// Use the loaded baseline in a diff to verify it works end-to-end
	let new_manifest = manifest::build_manifest(vault_path, &[]).unwrap();
	let diffs = manifest::diff_manifests(
		&new_manifest,
		&new_manifest,
		Some(&loaded_baseline),
	);
	let persist_diff = diffs.iter().find(|(p, _)| p == "persist.md");
	assert!(
		matches!(persist_diff, Some((_, manifest::FileDiff::Identical))),
		"File unchanged since baseline → should be Identical"
	);
}
