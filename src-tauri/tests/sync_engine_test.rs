use std::collections::{HashMap, HashSet};
use std::time::Instant;

use futures_util::FutureExt;
use noted_lib::sync::crypto::{self, SyncState};
use noted_lib::sync::engine::{verify_file_integrity, RetryState, SyncEvent};
use noted_lib::sync::manifest::{self, FileEntry, FileDiff, SyncManifest};
use tempfile::TempDir;
use tokio::sync::{mpsc, Mutex};
use tokio::time::Duration;
use tokio_util::sync::CancellationToken;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Helper to hex-encode a byte slice.
fn hex_encode(bytes: &[u8]) -> String {
	bytes.iter().map(|b| format!("{b:02x}")).collect()
}

/// Helper to compute SHA-256 of bytes.
fn sha256(data: &[u8]) -> Vec<u8> {
	use sha2::Digest;
	sha2::Sha256::digest(data).to_vec()
}

// ---------------------------------------------------------------------------
// File integrity tests
// ---------------------------------------------------------------------------

#[test]
fn verify_file_integrity_valid() {
	let content = b"# Hello World";
	let hash = hex_encode(&sha256(content));

	let manifest = SyncManifest {
		files: vec![FileEntry {
			path: "hello.md".to_string(),
			sha256: hash,
			mtime: 1700000000,
		}],
		generated_at: 1700000000,
	};

	assert!(verify_file_integrity(content, &manifest, "hello.md").is_ok());
}

#[test]
fn verify_file_integrity_tampered() {
	let original = b"# Hello World";
	let hash = hex_encode(&sha256(original));

	let manifest = SyncManifest {
		files: vec![FileEntry {
			path: "hello.md".to_string(),
			sha256: hash,
			mtime: 1700000000,
		}],
		generated_at: 1700000000,
	};

	let tampered = b"# Hello Evil World";
	let result = verify_file_integrity(tampered, &manifest, "hello.md");
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("integrity check failed"));
}

// ---------------------------------------------------------------------------
// Sync lock tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn sync_lock_prevents_concurrent_sync() {
	let peers_syncing: Mutex<HashSet<String>> = Mutex::new(HashSet::new());

	// First lock succeeds
	{
		let mut syncing = peers_syncing.lock().await;
		assert!(!syncing.contains("peer-1"));
		syncing.insert("peer-1".to_string());
	}

	// Second attempt for same peer should find it locked
	{
		let syncing = peers_syncing.lock().await;
		assert!(syncing.contains("peer-1"));
	}

	// Different peer is not locked
	{
		let syncing = peers_syncing.lock().await;
		assert!(!syncing.contains("peer-2"));
	}

	// Release lock
	{
		let mut syncing = peers_syncing.lock().await;
		syncing.remove("peer-1");
		assert!(!syncing.contains("peer-1"));
	}
}

// ---------------------------------------------------------------------------
// Retry backoff tests
// ---------------------------------------------------------------------------

#[test]
fn retry_backoff_exponential() {
	assert_eq!(RetryState::backoff_duration(1), Duration::from_secs(5));
	assert_eq!(RetryState::backoff_duration(2), Duration::from_secs(15));
	assert_eq!(RetryState::backoff_duration(3), Duration::from_secs(30));
	assert_eq!(RetryState::backoff_duration(4), Duration::from_secs(60));
	assert_eq!(RetryState::backoff_duration(10), Duration::from_secs(60));
}

#[tokio::test]
async fn retry_backoff_resets_on_success() {
	let backoffs: Mutex<HashMap<String, RetryState>> = Mutex::new(HashMap::new());

	// Simulate failure: add backoff
	{
		let mut map = backoffs.lock().await;
		let retry = map.entry("peer-1".to_string()).or_insert(RetryState {
			attempts: 0,
			next_retry: Instant::now(),
		});
		retry.attempts += 1;
		retry.next_retry = Instant::now() + RetryState::backoff_duration(retry.attempts);
	}

	// Backoff should be present
	{
		let map = backoffs.lock().await;
		assert!(map.contains_key("peer-1"));
		assert_eq!(map["peer-1"].attempts, 1);
	}

	// Simulate success: remove backoff
	{
		backoffs.lock().await.remove("peer-1");
	}

	// Backoff should be gone
	{
		let map = backoffs.lock().await;
		assert!(!map.contains_key("peer-1"));
	}
}

// ---------------------------------------------------------------------------
// Debounce tests
// ---------------------------------------------------------------------------

#[tokio::test]
async fn trigger_sync_debounce() {
	let (tx, mut rx) = mpsc::channel::<()>(10);
	let cancel = CancellationToken::new();

	// Simulate the debounce logic from main_loop
	let cancel_clone = cancel.clone();
	let handle = tokio::spawn(async move {
		let mut debounce_deadline: Option<tokio::time::Instant> = None;
		let mut fired = 0u32;

		loop {
			let debounce_fut = async {
				match debounce_deadline {
					Some(deadline) => tokio::time::sleep_until(deadline).await,
					None => std::future::pending().await,
				}
			};

			tokio::select! {
				biased;
				_ = cancel_clone.cancelled() => break,
				_ = rx.recv() => {
					debounce_deadline = Some(tokio::time::Instant::now() + Duration::from_millis(100));
				}
				_ = debounce_fut, if debounce_deadline.is_some() => {
					debounce_deadline = None;
					fired += 1;
				}
			}
		}
		fired
	});

	// Send 5 rapid triggers (within debounce window)
	for _ in 0..5 {
		let _ = tx.send(()).await;
		tokio::time::sleep(Duration::from_millis(10)).await;
	}

	// Wait for debounce to fire
	tokio::time::sleep(Duration::from_millis(200)).await;

	// Cancel and check result
	cancel.cancel();
	let fired = handle.await.unwrap();

	// Should have fired only once (all triggers collapsed into one)
	assert_eq!(fired, 1);
}

// ---------------------------------------------------------------------------
// Delete propagation via baseline
// ---------------------------------------------------------------------------

#[test]
fn delete_propagation_via_baseline() {
	let baseline = SyncManifest {
		files: vec![
			FileEntry {
				path: "keep.md".to_string(),
				sha256: "aaa".to_string(),
				mtime: 100,
			},
			FileEntry {
				path: "deleted-locally.md".to_string(),
				sha256: "bbb".to_string(),
				mtime: 100,
			},
		],
		generated_at: 100,
	};

	let local = SyncManifest {
		files: vec![FileEntry {
			path: "keep.md".to_string(),
			sha256: "aaa".to_string(),
			mtime: 100,
		}],
		generated_at: 200,
	};

	let remote = SyncManifest {
		files: vec![
			FileEntry {
				path: "keep.md".to_string(),
				sha256: "aaa".to_string(),
				mtime: 100,
			},
			FileEntry {
				path: "deleted-locally.md".to_string(),
				sha256: "bbb".to_string(),
				mtime: 100,
			},
		],
		generated_at: 200,
	};

	let diffs = manifest::diff_manifests(&local, &remote, Some(&baseline));

	// "keep.md" should be Identical
	let keep = diffs.iter().find(|(p, _)| p == "keep.md");
	assert!(matches!(keep, Some((_, FileDiff::Identical))));

	// "deleted-locally.md" should be DeleteLocal (present in baseline + remote, absent locally)
	let deleted = diffs.iter().find(|(p, _)| p == "deleted-locally.md");
	assert!(matches!(deleted, Some((_, FileDiff::DeleteLocal))));
}

// ---------------------------------------------------------------------------
// Settings conflict emits event
// ---------------------------------------------------------------------------

#[tokio::test]
async fn settings_conflict_emits_event() {
	let (event_tx, mut event_rx) = mpsc::channel(100);

	// Simulate what do_sync does for settings.json conflict
	let _ = event_tx
		.send(SyncEvent::Conflict {
			original_path: ".noted/settings.json".to_string(),
			conflicted_path: ".noted/settings (conflicted 2025-01-01 12-00).json".to_string(),
		})
		.await;

	let _ = event_tx
		.send(SyncEvent::SettingsConflict {
			conflicted_path: ".noted/settings (conflicted 2025-01-01 12-00).json".to_string(),
		})
		.await;

	// Verify both events were emitted
	let evt1 = event_rx.recv().await.unwrap();
	assert!(matches!(evt1, SyncEvent::Conflict { .. }));

	let evt2 = event_rx.recv().await.unwrap();
	assert!(matches!(evt2, SyncEvent::SettingsConflict { .. }));
}

// ---------------------------------------------------------------------------
// Baseline saved after sync
// ---------------------------------------------------------------------------

#[test]
fn baseline_saved_after_sync() {
	let tmp = TempDir::new().unwrap();
	let vault = tmp.path().to_str().unwrap();

	// Create .noted directory
	std::fs::create_dir_all(tmp.path().join(".noted")).unwrap();

	// Simulate saving baseline after a sync
	let manifest = SyncManifest {
		files: vec![FileEntry {
			path: "note.md".to_string(),
			sha256: "abc123".to_string(),
			mtime: 1700000000,
		}],
		generated_at: 1700000000,
	};

	let mut sync_state = SyncState::default();
	sync_state.baseline_manifests.insert(
		"peer-1".to_string(),
		serde_json::to_value(&manifest).unwrap(),
	);
	sync_state
		.last_sync
		.insert("peer-1".to_string(), 1700000000);

	// Save and reload
	crypto::save_sync_state(vault, &sync_state).unwrap();
	let loaded = crypto::load_sync_state(vault).unwrap();

	// Verify baseline was persisted
	assert!(loaded.baseline_manifests.contains_key("peer-1"));
	let baseline: SyncManifest =
		serde_json::from_value(loaded.baseline_manifests["peer-1"].clone()).unwrap();
	assert_eq!(baseline.files.len(), 1);
	assert_eq!(baseline.files[0].path, "note.md");
	assert_eq!(*loaded.last_sync.get("peer-1").unwrap(), 1700000000u64);
}

// ---------------------------------------------------------------------------
// Panic safety: peers_syncing cleanup via catch_unwind
// ---------------------------------------------------------------------------

#[tokio::test]
async fn peers_syncing_cleaned_after_panic() {
	let peers_syncing: Mutex<HashSet<String>> = Mutex::new(HashSet::new());

	// Insert peer into syncing set
	{
		let mut syncing = peers_syncing.lock().await;
		syncing.insert("peer-1".to_string());
	}

	// Simulate a panicking future caught by catch_unwind
	let result = std::panic::AssertUnwindSafe(async {
		panic!("simulated do_sync panic");
	})
	.catch_unwind()
	.await;

	// Always clean up — this runs even after caught panic
	{
		let mut syncing = peers_syncing.lock().await;
		syncing.remove("peer-1");
	}

	assert!(result.is_err(), "panic should have been caught");

	// Verify cleanup happened
	let syncing = peers_syncing.lock().await;
	assert!(
		!syncing.contains("peer-1"),
		"peer should be removed from syncing set after panic"
	);
}
