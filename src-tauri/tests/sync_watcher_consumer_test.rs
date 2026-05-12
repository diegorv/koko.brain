//! Tests for `src-tauri/src/sync/watcher_consumer.rs`. Exercise the
//! `process_one` boundary directly because the consumer's `tokio`
//! debounce loop is timing-sensitive; the boundary covers the
//! interesting behaviour: vault-prefix stripping, share filtering,
//! AppMsg construction, and fan-out to every active outbound
//! channel.

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use kokobrain_lib::sync::identity::{
	load_or_create_identity, IdentityError, KeyStorage, PeerIdentity,
};
use kokobrain_lib::sync::protocol::AppMsg;
use kokobrain_lib::sync::shares::{
	self, Share, ShareDirection, ShareMode, SharesFile, CURRENT_SHARES_VERSION,
};
use kokobrain_lib::sync::watcher_consumer::{
	process_one, ConsumerContext, OutboundChannel,
};
use tokio::sync::mpsc;

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

fn fresh_identity(account: &str) -> PeerIdentity {
	load_or_create_identity(&MemoryStorage::default(), account).unwrap()
}

fn write_share(vault_root: &std::path::Path) -> Share {
	let share = Share {
		id: "share-test".into(),
		mode: ShareMode::RootWithExcludes,
		local_path: String::new(),
		excludes: Vec::new(),
		allowed_peer_fingerprints: Vec::new(),
		direction: ShareDirection::Bi,
		read_only: false,
		created_at_ms: 0,
	};
	let file = SharesFile {
		version: CURRENT_SHARES_VERSION,
		shares: vec![share.clone()],
	};
	shares::write_shares(vault_root, &file).unwrap();
	share
}

fn build_ctx(
	vault_root: std::path::PathBuf,
	identity: PeerIdentity,
) -> (
	ConsumerContext,
	Arc<tokio::sync::Mutex<HashMap<String, OutboundChannel>>>,
) {
	let map = Arc::new(tokio::sync::Mutex::new(HashMap::new()));
	let ctx = ConsumerContext {
		vault_root,
		identity,
		active_connections: map.clone(),
	};
	(ctx, map)
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn process_one_emits_push_update_for_existing_file() {
	let tmp = tempfile::tempdir().unwrap();
	let vault_root = tmp.path().to_path_buf();
	write_share(&vault_root);
	std::fs::write(vault_root.join("note.md"), b"hello world").unwrap();

	let (ctx, active_map) = build_ctx(vault_root.clone(), fresh_identity("consumer-A"));
	let (tx, mut rx) = mpsc::channel::<AppMsg>(8);
	active_map
		.lock()
		.await
		.insert("conn-A".into(), OutboundChannel { outbound: tx });

	let abs = vault_root.join("note.md").to_string_lossy().to_string();
	process_one(&ctx, &abs).await.unwrap();

	let msg = rx.try_recv().expect("PushUpdate must arrive at the outbound channel");
	match msg {
		AppMsg::PushUpdate {
			share_id,
			path_rel,
			sha256_hash,
			..
		} => {
			assert_eq!(share_id, "share-test");
			assert_eq!(path_rel, "note.md");
			// 32 bytes -> 64 hex chars.
			assert_eq!(sha256_hash.len(), 64);
		}
		other => panic!("expected PushUpdate, got {other:?}"),
	}
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn process_one_emits_delete_for_missing_file() {
	let tmp = tempfile::tempdir().unwrap();
	let vault_root = tmp.path().to_path_buf();
	write_share(&vault_root);
	// Note: the file never exists - simulating a watcher event for a
	// path that has already been deleted by the time the consumer
	// processes it.

	let (ctx, active_map) = build_ctx(vault_root.clone(), fresh_identity("consumer-B"));
	let (tx, mut rx) = mpsc::channel::<AppMsg>(8);
	active_map
		.lock()
		.await
		.insert("conn-B".into(), OutboundChannel { outbound: tx });

	let abs = vault_root.join("removed.md").to_string_lossy().to_string();
	process_one(&ctx, &abs).await.unwrap();

	let msg = rx.try_recv().expect("Delete must arrive");
	assert!(matches!(msg, AppMsg::Delete { .. }), "got {msg:?}");
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn process_one_silently_skips_paths_outside_vault() {
	let tmp = tempfile::tempdir().unwrap();
	let vault_root = tmp.path().to_path_buf();
	write_share(&vault_root);

	let (ctx, active_map) = build_ctx(vault_root.clone(), fresh_identity("consumer-C"));
	let (tx, mut rx) = mpsc::channel::<AppMsg>(8);
	active_map
		.lock()
		.await
		.insert("conn-C".into(), OutboundChannel { outbound: tx });

	// Path that doesn't begin with vault_root.
	process_one(&ctx, "/etc/passwd").await.unwrap();
	assert!(
		rx.try_recv().is_err(),
		"out-of-vault paths must not produce AppMsgs"
	);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn process_one_fans_out_to_every_active_connection() {
	let tmp = tempfile::tempdir().unwrap();
	let vault_root = tmp.path().to_path_buf();
	write_share(&vault_root);
	std::fs::write(vault_root.join("note.md"), b"fan").unwrap();

	let (ctx, active_map) = build_ctx(vault_root.clone(), fresh_identity("consumer-D"));
	let (tx_a, mut rx_a) = mpsc::channel::<AppMsg>(8);
	let (tx_b, mut rx_b) = mpsc::channel::<AppMsg>(8);
	{
		let mut g = active_map.lock().await;
		g.insert("conn-D-a".into(), OutboundChannel { outbound: tx_a });
		g.insert("conn-D-b".into(), OutboundChannel { outbound: tx_b });
	}

	let abs = vault_root.join("note.md").to_string_lossy().to_string();
	process_one(&ctx, &abs).await.unwrap();

	assert!(matches!(rx_a.try_recv(), Ok(AppMsg::PushUpdate { .. })));
	assert!(matches!(rx_b.try_recv(), Ok(AppMsg::PushUpdate { .. })));
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn process_one_drops_hidden_segment_paths() {
	let tmp = tempfile::tempdir().unwrap();
	let vault_root = tmp.path().to_path_buf();
	write_share(&vault_root);
	// `.kokobrain` is hidden -> share filter rejects.
	std::fs::create_dir_all(vault_root.join(".kokobrain")).unwrap();
	std::fs::write(vault_root.join(".kokobrain/notes.json"), b"x").unwrap();

	let (ctx, active_map) = build_ctx(vault_root.clone(), fresh_identity("consumer-E"));
	let (tx, mut rx) = mpsc::channel::<AppMsg>(8);
	active_map
		.lock()
		.await
		.insert("conn-E".into(), OutboundChannel { outbound: tx });

	let abs = vault_root
		.join(".kokobrain/notes.json")
		.to_string_lossy()
		.to_string();
	process_one(&ctx, &abs).await.unwrap();
	assert!(
		rx.try_recv().is_err(),
		"hidden-segment paths must not produce AppMsgs"
	);
}
