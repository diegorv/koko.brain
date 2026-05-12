//! Integration tests for `sync::push`: planning, traversal defense,
//! and end-to-end folder push over a real Noise XX session.
//!
//! Every async test wires the initiator and responder together via
//! `tokio::io::duplex`, then runs `transport::open_to` / `transport::accept`
//! concurrently to obtain a matched pair of `Session<DuplexStream>`
//! halves. The push engine then drives the wire protocol on top.

use std::fs;
use std::path::{Path, PathBuf};

use kokobrain_lib::sync::push::{
	plan_push, receive_folder, sanitize_rel_path, send_folder, should_skip_component,
	validate_sender_source_rel_path, validate_sender_target_rel_path, FileEntry, PushError,
	PushPlan, INCOMING_DIR, PROGRESS_INTERVAL_BYTES, PUSH_FILE_CHUNK_BYTES,
};
use kokobrain_lib::sync::identity::DeviceIdentity;
use kokobrain_lib::sync::transport::{
	accept, open_to, static_keys_from_ed25519_secret, Session, StaticKeys,
};
use sha2::{Digest, Sha256};
use tempfile::TempDir;
use tokio::io::DuplexStream;

/// Duplex buffer big enough to fit the manifest plus several large
/// chunks without back-pressuring either side.
const DUPLEX_CAP: usize = 8 * 1024 * 1024;

// ============================================================================
// Constants and module shape
// ============================================================================

#[test]
fn push_chunk_bytes_fits_under_noise_transport_limit() {
	// Snow's XX implementation caps a single transport msg plaintext
	// at 65519 bytes (u16::MAX - 16 for the AES-GCM tag). Anything
	// the push engine offers as a raw chunk must fit there.
	assert!(PUSH_FILE_CHUNK_BYTES <= 65519);
	assert!(PUSH_FILE_CHUNK_BYTES > 0);
}

#[test]
fn progress_interval_bytes_is_at_least_one_chunk() {
	// Triggering progress at least once per chunk is a sanity floor
	// — a smaller threshold would just spam the callback.
	assert!(PROGRESS_INTERVAL_BYTES as usize >= PUSH_FILE_CHUNK_BYTES);
}

#[test]
fn incoming_dir_is_inside_kokobrain() {
	assert!(INCOMING_DIR.starts_with(".kokobrain"));
}

// ============================================================================
// plan_push — directory walk and exclusion rules
// ============================================================================

#[test]
fn plan_push_walks_simple_tree() {
	let dir = TempDir::new().unwrap();
	let root = dir.path();
	fs::write(root.join("a.txt"), b"hello").unwrap();
	fs::write(root.join("b.txt"), b"world!").unwrap();
	fs::create_dir(root.join("sub")).unwrap();
	fs::write(root.join("sub/c.txt"), b"deep").unwrap();

	let plan = plan_push(root).expect("plan");
	assert_eq!(plan.files.len(), 3);
	assert_eq!(plan.total_bytes, 5 + 6 + 4);
	let names: Vec<&str> = plan.files.iter().map(|f| f.rel_path.as_str()).collect();
	assert_eq!(names, vec!["a.txt", "b.txt", "sub/c.txt"]);
}

#[test]
fn plan_push_returns_empty_for_empty_dir() {
	let dir = TempDir::new().unwrap();
	let plan = plan_push(dir.path()).expect("plan");
	assert!(plan.files.is_empty());
	assert_eq!(plan.total_bytes, 0);
}

#[test]
fn plan_push_excludes_hidden_files_and_dirs() {
	let dir = TempDir::new().unwrap();
	let root = dir.path();
	fs::write(root.join("ok.md"), b"keep").unwrap();
	fs::write(root.join(".gitignore"), b"hidden").unwrap();
	fs::create_dir(root.join(".git")).unwrap();
	fs::write(root.join(".git/HEAD"), b"hidden").unwrap();
	fs::create_dir(root.join(".kokobrain")).unwrap();
	fs::write(root.join(".kokobrain/state.json"), b"hidden").unwrap();

	let plan = plan_push(root).expect("plan");
	let names: Vec<&str> = plan.files.iter().map(|f| f.rel_path.as_str()).collect();
	assert_eq!(names, vec!["ok.md"]);
}

#[test]
fn plan_push_excludes_node_modules() {
	let dir = TempDir::new().unwrap();
	let root = dir.path();
	fs::write(root.join("ok.md"), b"keep").unwrap();
	fs::create_dir(root.join("node_modules")).unwrap();
	fs::write(root.join("node_modules/bigdep.js"), b"x".repeat(1024))
		.unwrap();

	let plan = plan_push(root).expect("plan");
	assert_eq!(plan.files.len(), 1);
	assert_eq!(plan.files[0].rel_path, "ok.md");
}

#[cfg(unix)]
#[test]
fn plan_push_skips_symlinks_without_following() {
	use std::os::unix::fs::symlink;
	let dir = TempDir::new().unwrap();
	let root = dir.path();
	fs::write(root.join("real.md"), b"real").unwrap();
	// Symlink to an external file inside the test temp dir. Even a
	// symlink to a file that exists must be excluded entirely.
	let other = TempDir::new().unwrap();
	let target_file = other.path().join("target.md");
	fs::write(&target_file, b"target").unwrap();
	symlink(&target_file, root.join("link.md")).unwrap();
	// Also a dir symlink — must not be recursed into.
	symlink(other.path(), root.join("link_dir")).unwrap();

	let plan = plan_push(root).expect("plan");
	let names: Vec<&str> = plan.files.iter().map(|f| f.rel_path.as_str()).collect();
	assert_eq!(names, vec!["real.md"]);
}

#[test]
fn plan_push_rejects_missing_source() {
	let dir = TempDir::new().unwrap();
	let missing = dir.path().join("nope");
	match plan_push(&missing) {
		Err(PushError::InvalidSource { .. }) => {}
		other => panic!("expected InvalidSource, got {other:?}"),
	}
}

#[test]
fn plan_push_rejects_when_source_is_a_file() {
	let dir = TempDir::new().unwrap();
	let file = dir.path().join("file.md");
	fs::write(&file, b"hi").unwrap();
	match plan_push(&file) {
		Err(PushError::InvalidSource { .. }) => {}
		other => panic!("expected InvalidSource, got {other:?}"),
	}
}

#[test]
fn should_skip_component_rules() {
	assert!(should_skip_component(""));
	assert!(should_skip_component("."));
	assert!(should_skip_component(".."));
	assert!(should_skip_component(".git"));
	assert!(should_skip_component(".kokobrain"));
	assert!(should_skip_component(".hidden"));
	assert!(should_skip_component("node_modules"));
	assert!(!should_skip_component("notes.md"));
	assert!(!should_skip_component("sub"));
}

// ============================================================================
// sanitize_rel_path — three layers of path traversal defense
// ============================================================================

#[test]
fn sanitize_rejects_dotdot_segment() {
	let dir = TempDir::new().unwrap();
	let root = dir.path();
	match sanitize_rel_path(root, "", "..") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal, got {other:?}"),
	}
	match sanitize_rel_path(root, "", "a/../b") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal for embedded ..: {other:?}"),
	}
	match sanitize_rel_path(root, "", "../escape") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal, got {other:?}"),
	}
}

#[test]
fn sanitize_rejects_dotdot_in_target_path() {
	let dir = TempDir::new().unwrap();
	match sanitize_rel_path(dir.path(), "../escape", "file.md") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal in target, got {other:?}"),
	}
}

#[test]
fn sanitize_rejects_absolute_unix_path() {
	let dir = TempDir::new().unwrap();
	match sanitize_rel_path(dir.path(), "", "/etc/passwd") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal, got {other:?}"),
	}
}

#[test]
fn sanitize_rejects_backslash_absolute() {
	let dir = TempDir::new().unwrap();
	match sanitize_rel_path(dir.path(), "", "\\WindowsSystem32") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal, got {other:?}"),
	}
}

#[test]
fn sanitize_rejects_windows_drive_letter() {
	let dir = TempDir::new().unwrap();
	match sanitize_rel_path(dir.path(), "", "C:\\evil") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal for drive letter, got {other:?}"),
	}
	match sanitize_rel_path(dir.path(), "", "Z:/evil") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal for drive letter, got {other:?}"),
	}
}

#[test]
fn sanitize_rejects_backslash_dotdot() {
	let dir = TempDir::new().unwrap();
	match sanitize_rel_path(dir.path(), "", "a\\..\\b") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal via backslash, got {other:?}"),
	}
}

#[test]
fn sanitize_accepts_nested_relative_path() {
	let dir = TempDir::new().unwrap();
	let root = dir.path();
	let out = sanitize_rel_path(root, "target", "sub/nested.md").expect("ok");
	let canonical_root = root.canonicalize().unwrap();
	// The result must be the canonical root joined with the supplied
	// segments. Compare canonicalised parent (the file doesn't exist)
	// to the canonicalised root prefix.
	let parent = out.parent().unwrap();
	fs::create_dir_all(parent).unwrap();
	let canonical_parent = parent.canonicalize().unwrap();
	assert!(canonical_parent.starts_with(&canonical_root));
	assert!(out.ends_with("target/sub/nested.md"));
}

#[cfg(unix)]
#[test]
fn sanitize_rejects_symlinked_escape_under_canonicalize() {
	use std::os::unix::fs::symlink;
	let vault = TempDir::new().unwrap();
	let outside = TempDir::new().unwrap();
	// Create a symlink inside the vault root pointing to a directory
	// outside it. Layer 1 cannot see this — only layer 2/3 catches it.
	let link = vault.path().join("escape");
	symlink(outside.path(), &link).unwrap();
	// Now ask sanitize for a file inside the symlinked dir.
	match sanitize_rel_path(vault.path(), "escape", "evil.md") {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal via symlink, got {other:?}"),
	}
}

// ============================================================================
// End-to-end push helpers
// ============================================================================

/// Returns matched static keys for the initiator and responder.
///
/// Both halves derive from the same Ed25519 seeds used by
/// [`identity_pair`], so the binding signature in each side's
/// `IdentityProof` covers the very X25519 public the Noise handshake
/// authenticates.
fn pair_keys() -> (StaticKeys, StaticKeys) {
	(
		static_keys_from_ed25519_secret(&INIT_SEED),
		static_keys_from_ed25519_secret(&RESP_SEED),
	)
}

/// Ed25519 secret seed used by both `pair_keys` (X25519 derivation)
/// and `identity_pair` (DeviceIdentity construction) for the
/// initiator. Hard-coded so the binding signature and the Noise
/// static line up.
const INIT_SEED: [u8; 32] = [0x41_u8; 32];

/// Ed25519 secret seed used for the responder. See [`INIT_SEED`].
const RESP_SEED: [u8; 32] = [0x42_u8; 32];

/// Builds a `DeviceIdentity` for `seed` by pre-writing the secret file
/// into a fresh tempdir, then calling `load_or_create`. The tempdir
/// must outlive the returned identity for the binding-sig file to
/// remain reachable; we keep it alive by returning it.
fn identity_for(seed: &[u8; 32]) -> (DeviceIdentity, TempDir) {
	let tmp = TempDir::new().unwrap();
	let path = tmp.path().join("identity.key");
	fs::write(&path, seed).unwrap();
	let id = DeviceIdentity::load_or_create(&path).unwrap();
	(id, tmp)
}

/// Spawns a transport handshake on `tokio::io::duplex` and returns the
/// two session halves once both sides have completed.
async fn handshaked_pair() -> (Session<DuplexStream>, Session<DuplexStream>) {
	let (initiator_keys, responder_keys) = pair_keys();
	let (init_identity, _init_tmp) = identity_for(&INIT_SEED);
	let (resp_identity, _resp_tmp) = identity_for(&RESP_SEED);
	let initiator_fp = init_identity.fingerprint_hex();
	let responder_fp = resp_identity.fingerprint_hex();
	let init_proof = init_identity.identity_proof();
	let resp_proof = resp_identity.identity_proof();
	let (init_side, resp_side) = tokio::io::duplex(DUPLEX_CAP);
	let init_task = tokio::spawn(async move {
		open_to(init_side, &initiator_keys, &init_proof, &responder_fp).await
	});
	let resp_task = tokio::spawn({
		let initiator_fp = initiator_fp.clone();
		async move {
			accept(resp_side, &responder_keys, &resp_proof, |fp| fp == initiator_fp).await
		}
	});
	let init_session = init_task.await.unwrap().expect("initiator handshake");
	let resp_session = resp_task.await.unwrap().expect("responder handshake");
	(init_session, resp_session)
}

/// Hashes one file's contents for content-equality checks.
fn sha256_file(path: &Path) -> [u8; 32] {
	let bytes = fs::read(path).expect("read file");
	let digest = Sha256::digest(&bytes);
	let mut out = [0_u8; 32];
	out.copy_from_slice(&digest);
	out
}

// ============================================================================
// End-to-end push (happy paths)
// ============================================================================

#[tokio::test]
async fn e2e_pushes_a_single_small_file() {
	let source = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	fs::write(source.path().join("hello.md"), b"hello, world").unwrap();

	let plan = plan_push(source.path()).unwrap();
	assert_eq!(plan.files.len(), 1);

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();
	let vault_path = vault.path().to_path_buf();

	let send_task = tokio::spawn(async move {
		send_folder(
			&mut init_session,
			&source_path,
			"target",
			&plan,
			|_b, _f| {},
		)
		.await
	});
	let recv_task = tokio::spawn(async move {
		receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await
	});

	let sent = send_task.await.unwrap().expect("send");
	let recv = recv_task.await.unwrap().expect("recv");
	assert_eq!(sent, 1);
	assert_eq!(recv, 1);

	let dst = vault.path().join("target/hello.md");
	assert!(dst.exists(), "destination file should exist");
	assert_eq!(fs::read(dst).unwrap(), b"hello, world");
}

#[tokio::test]
async fn e2e_pushes_a_large_multi_chunk_file() {
	let source = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	// 256 KiB requires multiple chunks at 60 KiB each.
	let big: Vec<u8> = (0..(256 * 1024)).map(|i| (i % 251) as u8).collect();
	fs::write(source.path().join("big.bin"), &big).unwrap();

	let plan = plan_push(source.path()).unwrap();
	let expected_hash = {
		let mut hasher = Sha256::new();
		hasher.update(&big);
		let d = hasher.finalize();
		let mut out = [0_u8; 32];
		out.copy_from_slice(&d);
		out
	};

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();
	let vault_path = vault.path().to_path_buf();

	let send_task = tokio::spawn(async move {
		send_folder(&mut init_session, &source_path, "t", &plan, |_b, _f| {}).await
	});
	let recv_task = tokio::spawn(async move {
		receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await
	});

	send_task.await.unwrap().expect("send");
	recv_task.await.unwrap().expect("recv");

	let dst = vault.path().join("t/big.bin");
	assert!(dst.exists());
	assert_eq!(fs::metadata(&dst).unwrap().len(), 256 * 1024);
	assert_eq!(sha256_file(&dst), expected_hash);
}

#[tokio::test]
async fn e2e_pushes_mixed_size_tree() {
	let source = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	let root = source.path();
	// Mix of empty, tiny, and chunk-spanning files in nested dirs.
	fs::write(root.join("empty.md"), b"").unwrap();
	fs::write(root.join("tiny.md"), b"hi").unwrap();
	fs::create_dir(root.join("a")).unwrap();
	fs::create_dir(root.join("a/b")).unwrap();
	fs::write(root.join("a/one.txt"), b"file one").unwrap();
	fs::write(root.join("a/b/two.txt"), b"file two").unwrap();
	let big: Vec<u8> = (0..(70 * 1024)).map(|i| (i & 0xff) as u8).collect();
	fs::write(root.join("a/b/big.bin"), &big).unwrap();
	for i in 0..5 {
		fs::write(root.join(format!("note-{i}.md")), format!("content {i}"))
			.unwrap();
	}

	let plan = plan_push(root).unwrap();
	assert_eq!(plan.files.len(), 10);

	// Pre-compute expected hashes for every source file.
	let expected_hashes: Vec<(String, [u8; 32])> = plan
		.files
		.iter()
		.map(|f| (f.rel_path.clone(), sha256_file(&root.join(&f.rel_path))))
		.collect();

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();
	let vault_path = vault.path().to_path_buf();

	let send_task = tokio::spawn(async move {
		send_folder(&mut init_session, &source_path, "tgt", &plan, |_b, _f| {}).await
	});
	let recv_task = tokio::spawn(async move {
		receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await
	});

	let sent = send_task.await.unwrap().expect("send");
	let recv = recv_task.await.unwrap().expect("recv");
	assert_eq!(sent, 10);
	assert_eq!(recv, 10);

	for (rel, expected) in expected_hashes {
		let dst = vault.path().join("tgt").join(&rel);
		assert!(dst.exists(), "missing {rel}");
		assert_eq!(sha256_file(&dst), expected, "content mismatch for {rel}");
	}
}

#[tokio::test]
async fn e2e_empty_folder_completes_cleanly() {
	let source = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	let plan = plan_push(source.path()).unwrap();
	assert!(plan.files.is_empty());

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();
	let vault_path = vault.path().to_path_buf();

	let send_task = tokio::spawn(async move {
		send_folder(&mut init_session, &source_path, "target", &plan, |_b, _f| {})
			.await
	});
	let recv_task = tokio::spawn(async move {
		receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await
	});

	assert_eq!(send_task.await.unwrap().expect("send"), 0);
	assert_eq!(recv_task.await.unwrap().expect("recv"), 0);
}

#[tokio::test]
async fn e2e_progress_callback_is_invoked_during_large_transfer() {
	use std::sync::atomic::{AtomicU64, Ordering};
	use std::sync::Arc;

	let source = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	let big: Vec<u8> = vec![0xab; 1024 * 1024]; // 1 MiB so progress fires several times.
	fs::write(source.path().join("big.bin"), &big).unwrap();
	let plan = plan_push(source.path()).unwrap();

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();
	let vault_path = vault.path().to_path_buf();

	let send_counter = Arc::new(AtomicU64::new(0));
	let send_max_bytes = Arc::new(AtomicU64::new(0));
	let recv_counter = Arc::new(AtomicU64::new(0));
	let recv_max_bytes = Arc::new(AtomicU64::new(0));

	let send_counter_c = send_counter.clone();
	let send_max_bytes_c = send_max_bytes.clone();
	let send_task = tokio::spawn(async move {
		send_folder(&mut init_session, &source_path, "t", &plan, move |b, _f| {
			send_counter_c.fetch_add(1, Ordering::SeqCst);
			send_max_bytes_c.fetch_max(b, Ordering::SeqCst);
		})
		.await
	});
	let recv_counter_c = recv_counter.clone();
	let recv_max_bytes_c = recv_max_bytes.clone();
	let recv_task = tokio::spawn(async move {
		receive_folder(&mut resp_session, &vault_path, move |b, _f| {
			recv_counter_c.fetch_add(1, Ordering::SeqCst);
			recv_max_bytes_c.fetch_max(b, Ordering::SeqCst);
		})
		.await
	});

	send_task.await.unwrap().expect("send");
	recv_task.await.unwrap().expect("recv");

	assert!(
		send_counter.load(Ordering::SeqCst) >= 1,
		"send-side progress must fire at least once"
	);
	assert!(
		recv_counter.load(Ordering::SeqCst) >= 1,
		"recv-side progress must fire at least once"
	);
	// At completion the callback has been called with the full
	// payload byte count.
	assert_eq!(send_max_bytes.load(Ordering::SeqCst), 1024 * 1024);
	assert_eq!(recv_max_bytes.load(Ordering::SeqCst), 1024 * 1024);
}

// ============================================================================
// End-to-end push (failure paths)
// ============================================================================

#[tokio::test]
async fn e2e_responder_rejects_path_traversal_in_manifest() {
	// Build a "malicious" source by writing a manifest manually via a
	// modified plan: we keep a real source folder, but rewrite the
	// rel_paths inside the plan to include a traversal segment.
	let source = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	fs::write(source.path().join("ok.txt"), b"plaintext").unwrap();

	// Construct a plan with a poisoned rel_path. The send side will
	// happily transmit whatever the plan announces.
	let mut plan = plan_push(source.path()).unwrap();
	plan.files[0].rel_path = "../../etc/passwd".to_string();

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();
	let vault_path = vault.path().to_path_buf();

	let send_task = tokio::spawn(async move {
		send_folder(
			&mut init_session,
			&source_path,
			"target",
			&plan,
			|_b, _f| {},
		)
		.await
	});
	let recv_task = tokio::spawn(async move {
		receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await
	});

	let send_result = send_task.await.unwrap();
	let recv_result = recv_task.await.unwrap();

	// Receiver MUST reject with a PathTraversal error.
	match recv_result {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal on recv, got {other:?}"),
	}
	// Sender sees the rejected manifest ack as PushError::Rejected.
	match send_result {
		Err(PushError::Rejected { .. }) => {}
		other => panic!("expected Rejected on send, got {other:?}"),
	}

	// And critically: no file exists outside the vault.
	let escaped = vault.path().parent().unwrap().join("etc/passwd");
	assert!(!escaped.exists());
	// Staging dir was cleaned up too.
	let incoming = vault.path().join(INCOMING_DIR);
	if incoming.exists() {
		// The .kokobrain/incoming root may exist (mkdir -p), but no
		// uuid subdir should be left behind.
		let any_child = fs::read_dir(&incoming).unwrap().next().is_some();
		assert!(!any_child, "no staging children should remain");
	}
}

#[tokio::test]
async fn e2e_responder_rejects_absolute_rel_path() {
	let source = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	fs::write(source.path().join("ok.txt"), b"x").unwrap();
	let mut plan = plan_push(source.path()).unwrap();
	plan.files[0].rel_path = "/etc/passwd".to_string();

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();
	let vault_path = vault.path().to_path_buf();

	let send_task = tokio::spawn(async move {
		send_folder(&mut init_session, &source_path, "t", &plan, |_b, _f| {}).await
	});
	let recv_task = tokio::spawn(async move {
		receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await
	});

	let _ = send_task.await.unwrap();
	match recv_task.await.unwrap() {
		Err(PushError::PathTraversal { .. }) => {}
		other => panic!("expected PathTraversal, got {other:?}"),
	}
}

#[tokio::test]
async fn e2e_no_partial_files_visible_at_destination_on_traversal_attack() {
	// Combined check: malicious manifest with a clean first entry and
	// a traversal second entry. The clean one must NOT be observable
	// at the final destination because apply happens after the whole
	// receive succeeds, and the receive aborts before any apply.
	let source = TempDir::new().unwrap();
	let vault = TempDir::new().unwrap();
	fs::write(source.path().join("clean.txt"), b"clean").unwrap();
	fs::write(source.path().join("evil.txt"), b"evil").unwrap();
	let mut plan = plan_push(source.path()).unwrap();
	// Inject traversal on the second file.
	let evil_idx = plan
		.files
		.iter()
		.position(|f| f.rel_path == "evil.txt")
		.unwrap();
	plan.files[evil_idx].rel_path = "../escape.txt".to_string();

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();
	let vault_path = vault.path().to_path_buf();

	let send_task = tokio::spawn(async move {
		send_folder(&mut init_session, &source_path, "tgt", &plan, |_b, _f| {})
			.await
	});
	let recv_task = tokio::spawn(async move {
		receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await
	});

	let _ = send_task.await.unwrap();
	assert!(matches!(
		recv_task.await.unwrap(),
		Err(PushError::PathTraversal { .. })
	));

	// Neither the clean file nor the escape file lands.
	assert!(!vault.path().join("tgt/clean.txt").exists());
	assert!(!vault.path().parent().unwrap().join("escape.txt").exists());
}

// ============================================================================
// Wire ack semantics
// ============================================================================

/// Calls `receive_folder` but the moment a manifest arrives, replies
/// with `ManifestAck { accepted: false }` to exercise the sender's
/// `Rejected` path. Reaches into the protocol via a minimal duplicate
/// of `recv_message` / `send_message`.
#[tokio::test]
async fn sender_returns_rejected_when_responder_declines_manifest() {
	let source = TempDir::new().unwrap();
	fs::write(source.path().join("a.md"), b"a").unwrap();
	let plan = plan_push(source.path()).unwrap();

	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let source_path = source.path().to_path_buf();

	let send_task = tokio::spawn(async move {
		send_folder(&mut init_session, &source_path, "t", &plan, |_b, _f| {}).await
	});
	let fake_resp = tokio::spawn(async move {
		// Read the manifest, throw it away, return a rejection.
		let _ = resp_session.recv().await.expect("manifest");
		let reject = br#"{"type":"ManifestAck","accepted":false,"reason":"nope"}"#;
		resp_session.send(reject).await.expect("send ack");
		// Hold the session open long enough for the sender's recv to
		// see the response.
	});
	let send_result = send_task.await.unwrap();
	fake_resp.await.unwrap();

	match send_result {
		Err(PushError::Rejected { reason }) => assert_eq!(reason, "nope"),
		other => panic!("expected Rejected, got {other:?}"),
	}
}

// ============================================================================
// Receive-side I/O error: cleanup leaves no partial files
// ============================================================================

#[tokio::test]
async fn receive_cleanup_removes_staging_on_io_failure() {
	// Force an I/O error mid-transfer by pointing the vault at a path
	// whose parent is read-only on Unix. On non-Unix we skip; the
	// guarantee is exercised plenty via the traversal tests.
	#[cfg(unix)]
	{
		use std::os::unix::fs::PermissionsExt;
		let parent = TempDir::new().unwrap();
		let vault = parent.path().join("vault-ro-child");
		fs::create_dir(&vault).unwrap();
		// chmod a-w on the vault dir so creating .kokobrain inside
		// fails. The receive_folder call must clean up before returning.
		let mut perms = fs::metadata(&vault).unwrap().permissions();
		perms.set_mode(0o555);
		fs::set_permissions(&vault, perms).unwrap();

		let source = TempDir::new().unwrap();
		fs::write(source.path().join("x.md"), b"x").unwrap();
		let plan = plan_push(source.path()).unwrap();

		let (mut init_session, mut resp_session) = handshaked_pair().await;
		let source_path = source.path().to_path_buf();
		let vault_path = vault.clone();

		let send_task = tokio::spawn(async move {
			send_folder(&mut init_session, &source_path, "t", &plan, |_b, _f| {}).await
		});
		let recv_task = tokio::spawn(async move {
			receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await
		});

		let _ = send_task.await.unwrap();
		let recv_result = recv_task.await.unwrap();
		match recv_result {
			Err(PushError::Io(_)) => {}
			other => panic!("expected Io, got {other:?}"),
		}

		// Restore permissions so the tmp drop can clean up.
		let mut perms = fs::metadata(&vault).unwrap().permissions();
		perms.set_mode(0o755);
		fs::set_permissions(&vault, perms).unwrap();
		// And confirm no .kokobrain landed (we couldn't write at all).
		assert!(!vault.join(INCOMING_DIR).exists());
	}
}

// ============================================================================
// Receive-side error: bad protocol message at start
// ============================================================================

#[tokio::test]
async fn receive_rejects_unexpected_first_message() {
	let vault = TempDir::new().unwrap();
	let (mut init_session, mut resp_session) = handshaked_pair().await;
	let vault_path = vault.path().to_path_buf();

	// Sender sends a PushDone first — wrong order.
	let bad = br#"{"type":"PushDone"}"#;
	init_session.send(bad).await.expect("send");

	let recv_result =
		receive_folder(&mut resp_session, &vault_path, |_b, _f| {}).await;
	match recv_result {
		Err(PushError::Protocol { expected, .. }) => {
			assert_eq!(expected, "Manifest");
		}
		other => panic!("expected Protocol, got {other:?}"),
	}
}

// ============================================================================
// PushPlan equality / helpers
// ============================================================================

#[test]
fn push_plan_with_no_files_has_zero_bytes() {
	let p = PushPlan { files: vec![], total_bytes: 0 };
	assert_eq!(p.total_bytes, 0);
	assert!(p.files.is_empty());
}

#[test]
fn file_entry_roundtrips_via_serde() {
	let entry = FileEntry { rel_path: "a/b.md".into(), size: 12 };
	let json = serde_json::to_string(&entry).unwrap();
	let parsed: FileEntry = serde_json::from_str(&json).unwrap();
	assert_eq!(parsed, entry);
}

// ============================================================================
// Sender-side path validators (H4 — hotfix for audit #16 + #17)
// ============================================================================

#[test]
fn validate_sender_source_rel_path_rejects_empty() {
	assert!(matches!(
		validate_sender_source_rel_path(""),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_rejects_absolute_unix() {
	assert!(matches!(
		validate_sender_source_rel_path("/etc/passwd"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_rejects_backslash_absolute() {
	assert!(matches!(
		validate_sender_source_rel_path("\\\\Users\\\\Diego"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_rejects_windows_drive_prefix() {
	assert!(matches!(
		validate_sender_source_rel_path("C:\\evil"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_rejects_dotdot_segment() {
	assert!(matches!(
		validate_sender_source_rel_path("Notes/../escape"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_rejects_dotkokobrain_terminal() {
	assert!(matches!(
		validate_sender_source_rel_path(".kokobrain"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_rejects_dotkokobrain_nested() {
	assert!(matches!(
		validate_sender_source_rel_path("Notes/.kokobrain/identity.key"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_rejects_dotgit_anywhere() {
	assert!(matches!(
		validate_sender_source_rel_path(".git"),
		Err(PushError::PathTraversal { .. })
	));
	assert!(matches!(
		validate_sender_source_rel_path("Notes/.git/HEAD"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_rejects_node_modules() {
	assert!(matches!(
		validate_sender_source_rel_path("node_modules"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_source_rel_path_allows_unknown_hidden_prefix() {
	// A user-chosen hidden folder (.private-notes, .my-stuff) is
	// allowed. The walker still skips hidden ENTRIES inside it via
	// `should_skip_component`. Only the well-known dangerous names
	// (`.kokobrain`, `.git`, `node_modules`) are blocked outright.
	assert!(validate_sender_source_rel_path(".private-notes").is_ok());
	assert!(validate_sender_source_rel_path("Notes/.private/file").is_ok());
}

#[test]
fn validate_sender_source_rel_path_accepts_nested_visible_path() {
	assert!(validate_sender_source_rel_path("Notes/Subfolder").is_ok());
}

#[test]
fn validate_sender_target_rel_path_accepts_empty_meaning_vault_root() {
	assert!(validate_sender_target_rel_path("").is_ok());
}

#[test]
fn validate_sender_target_rel_path_rejects_dotkokobrain() {
	assert!(matches!(
		validate_sender_target_rel_path(".kokobrain"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn validate_sender_target_rel_path_rejects_dotdot() {
	assert!(matches!(
		validate_sender_target_rel_path("Notes/../../boot"),
		Err(PushError::PathTraversal { .. })
	));
}

#[test]
fn plan_push_rejects_dotkokobrain_as_source_folder() {
	let tmp = TempDir::new().unwrap();
	let dotkb = tmp.path().join(".kokobrain");
	std::fs::create_dir_all(&dotkb).unwrap();
	std::fs::write(dotkb.join("identity.key"), b"secret").unwrap();

	let err = plan_push(&dotkb).unwrap_err();
	let msg = format!("{err}");
	assert!(
		msg.contains("exclusion") || msg.contains("'.kokobrain'"),
		"unexpected error: {msg}"
	);
}

#[test]
fn plan_push_rejects_dotgit_as_source_folder() {
	let tmp = TempDir::new().unwrap();
	let dotgit = tmp.path().join(".git");
	std::fs::create_dir_all(&dotgit).unwrap();
	std::fs::write(dotgit.join("HEAD"), b"ref: refs/heads/main").unwrap();

	assert!(matches!(plan_push(&dotgit), Err(PushError::InvalidSource { .. })));
}

#[test]
fn plan_push_accepts_normal_folder() {
	let tmp = TempDir::new().unwrap();
	let notes = tmp.path().join("Notes");
	std::fs::create_dir_all(&notes).unwrap();
	std::fs::write(notes.join("a.md"), b"hi").unwrap();
	assert!(plan_push(&notes).is_ok());
}

// ============================================================================
// Helper used in tests but not exported: build a small canonical path
// to make assertions less fragile against macOS /private/var symlink.
// ============================================================================

#[allow(dead_code)]
fn canonicalize(p: &Path) -> PathBuf {
	p.canonicalize().expect("canonicalize")
}
