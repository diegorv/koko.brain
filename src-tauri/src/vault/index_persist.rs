//! Debounced background writer for the `VaultIndex` disk snapshot.
//!
//! Wraps `index_cache::serialize_snapshot` + `write_snapshot_atomic`
//! in a debounce + generation-counter pattern so rapid mutations (a
//! burst of `update_entry` calls during a save burst, an
//! `incremental_update` fan-out) collapse into a single disk write.
//!
//! Generation-counter pattern is shared with `commands/semantic.rs`
//! (the embedder unload scheduler): each schedule call increments a
//! monotonic counter and spawns a `tokio::time::sleep` task. When the
//! task wakes, it compares its captured generation against the current
//! counter; only the latest schedule "wins" and performs the write.
//! Older scheduled tasks exit early.
//!
//! `flush_pending_snapshot` waits for any in-flight write to complete
//! so vault-close / vault-switch can guarantee the on-disk snapshot
//! reflects the latest mutation before tearing down the watcher.
//!
//! The module deliberately keeps no reference to Tauri's `AppHandle`:
//! the command-layer caller resolves the cache path from the handle
//! (via `cache_file_path` in `index_cache`) and passes it in. Keeping
//! this module AppHandle-free means unit tests can drive it against
//! `tempfile::tempdir()` without spinning up a Tauri runtime.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Mutex as StdMutex, OnceLock};
use tauri::async_runtime;
use tokio::sync::Mutex;
use tokio::time::Duration;

use crate::vault::entry::NoteEntry;
use crate::vault::index_cache::{
	cache_file_path, hash_vault_path, serialize_snapshot, write_snapshot_atomic,
};

/// Join handle type returned by `tauri::async_runtime::spawn`.
/// Tauri's bundled runtime is Tokio underneath, so the handle is
/// awaitable from any Tokio-aware context (commands, tests).
type SpawnHandle = async_runtime::JoinHandle<()>;

/// Default quiet window before a scheduled snapshot write fires.
/// Bursts of mutations within this window collapse into a single
/// write. Override at test time via `set_debounce_ms_for_tests`.
pub const DEFAULT_DEBOUNCE_MS: u64 = 5_000;

/// Monotonic generation counter incremented on every
/// `schedule_snapshot_write` call. The spawned write task captures
/// the current value at schedule time and compares it on wake-up;
/// mismatches indicate a newer schedule won the slot and the older
/// task should exit without writing.
static GENERATION: AtomicU64 = AtomicU64::new(0);

/// Number of successful writes performed since process start (or last
/// `reset_writes_for_tests`). Used by tests to assert collapse
/// behaviour without inspecting the filesystem directly.
static PERFORMED_WRITES: AtomicU64 = AtomicU64::new(0);

/// Test-only override for the debounce window. Zero means "use
/// `DEFAULT_DEBOUNCE_MS`". Production code never touches this; tests
/// set a 50 ms window so the assertions run in well under a second.
static DEBOUNCE_OVERRIDE_MS: AtomicU64 = AtomicU64::new(0);

/// Currently-open vault path, populated by `scan_vault_v2` at boot
/// and cleared on vault close. Mirrors the pattern in
/// `commands/semantic.rs:21`. Needed by `schedule_snapshot_for_app`
/// so the lazy-snapshot task can resolve the cache file path on
/// wake-up without the AppHandle re-resolving it on every call.
static VAULT_PATH: StdMutex<Option<String>> = StdMutex::new(None);

fn inflight_slot() -> &'static Mutex<Option<SpawnHandle>> {
	static SLOT: OnceLock<Mutex<Option<SpawnHandle>>> = OnceLock::new();
	SLOT.get_or_init(|| Mutex::new(None))
}

fn current_debounce_ms() -> u64 {
	let override_ms = DEBOUNCE_OVERRIDE_MS.load(Ordering::SeqCst);
	if override_ms > 0 {
		override_ms
	} else {
		DEFAULT_DEBOUNCE_MS
	}
}

/// Schedule a snapshot write to `cache_path`.
///
/// Multiple calls within `current_debounce_ms()` collapse into a
/// single write: each call bumps `GENERATION`, spawns a sleep+check
/// task, and only the task whose captured generation matches the
/// current counter when it wakes actually writes.
///
/// `cache_path` and `vault_hash` are supplied by the caller — the
/// command-layer caller in Task 5 resolves them from the `AppHandle`.
/// Serialization failures and IO failures are logged via `eprintln!`
/// and swallowed; they never propagate to the caller because the
/// in-memory index is the authoritative state and a missed disk
/// write only costs one cold-start cycle (next launch falls back to
/// `scan_vault_v2`).
pub fn schedule_snapshot_write(
	cache_path: PathBuf,
	vault_hash: String,
	entries: Vec<NoteEntry>,
) {
	let my_gen = GENERATION.fetch_add(1, Ordering::SeqCst).wrapping_add(1);
	let debounce = current_debounce_ms();

	let handle = async_runtime::spawn(async move {
		tokio::time::sleep(Duration::from_millis(debounce)).await;
		if GENERATION.load(Ordering::SeqCst) != my_gen {
			// Newer schedule won the slot; the latest call's task
			// will perform the write. Exit silently.
			return;
		}
		let now_secs = chrono::Utc::now().timestamp();
		let bytes = match serialize_snapshot(vault_hash, now_secs, &entries) {
			Ok(b) => b,
			Err(e) => {
				eprintln!("[INDEX-PERSIST] serialize failed: {e}");
				return;
			}
		};
		if let Err(e) = write_snapshot_atomic(&cache_path, &bytes) {
			eprintln!("[INDEX-PERSIST] write failed: {e}");
			return;
		}
		PERFORMED_WRITES.fetch_add(1, Ordering::SeqCst);
	});

	// Best-effort: replace the slot's prior handle with ours so
	// `flush_pending_snapshot` awaits the latest scheduled write. If
	// the lock is contended (only happens during test races), drop
	// the handle silently — the task still runs, it just won't be
	// awaited by flush.
	if let Ok(mut slot) = inflight_slot().try_lock() {
		*slot = Some(handle);
	}
}

/// Wait synchronously for any in-flight write to complete. Called
/// from the vault-close / vault-switch lifecycle (Task 8) so the
/// on-disk snapshot reflects the session's last mutation before the
/// watcher is torn down.
///
/// Awaits at most one task: whichever schedule won the last slot.
/// Earlier tasks either already exited (gen mismatch) or completed
/// their write before `flush` was called.
pub async fn flush_pending_snapshot() {
	let handle = inflight_slot().lock().await.take();
	if let Some(h) = handle {
		let _ = h.await;
	}
}

/// Stores the currently-open vault path. Called from `scan_vault_v2`
/// at the start of every vault open so subsequent
/// `schedule_snapshot_for_app` calls (triggered by
/// `update_note_in_index`) know which vault they belong to.
pub fn set_vault_path(path: String) {
	if let Ok(mut slot) = VAULT_PATH.lock() {
		*slot = Some(path);
	}
}

/// Clears the currently-open vault path. Called from vault-close.
/// After `flush_pending_snapshot().await`, calling this makes
/// subsequent `schedule_snapshot_for_app` calls no-ops until the next
/// `set_vault_path` (i.e. the next vault open).
pub fn clear_vault_path() {
	if let Ok(mut slot) = VAULT_PATH.lock() {
		*slot = None;
	}
}

/// Returns the currently-open vault path, if any.
pub fn current_vault_path() -> Option<String> {
	VAULT_PATH.lock().ok().and_then(|s| s.clone())
}

/// Schedule a snapshot write of the currently-open vault's index. The
/// entries snapshot is taken at wake-up time (after the debounce
/// fires), not at call time — so a burst of mutations does not pay
/// the per-call clone cost, only the latest survivor does.
///
/// Resolves the cache path via the AppHandle's `app_local_data_dir`
/// (Tauri 2 path API) at wake-up time. Reads the live `VaultIndex`
/// via `app.state::<VaultIndexState>()` — guarantees the snapshot
/// reflects ALL mutations that happened up to the moment the
/// debounce fired, including those that were scheduled and then
/// overridden by newer schedules.
///
/// All failure paths (no vault open, missing app dir, lock poison,
/// serialize failure, write failure) log + return without panicking;
/// the in-memory index is the authoritative state and a missed disk
/// write only costs one cold-start cycle (next launch falls back to
/// `scan_vault_v2`).
pub fn schedule_snapshot_for_app(app: tauri::AppHandle) {
	use tauri::Manager;

	let my_gen = GENERATION.fetch_add(1, Ordering::SeqCst).wrapping_add(1);
	let debounce = current_debounce_ms();

	let handle = async_runtime::spawn(async move {
		tokio::time::sleep(Duration::from_millis(debounce)).await;
		if GENERATION.load(Ordering::SeqCst) != my_gen {
			return;
		}
		let vault_path = match current_vault_path() {
			Some(p) => p,
			None => {
				eprintln!("[INDEX-PERSIST] no vault path set; skipping write");
				return;
			}
		};
		let base_dir = match app.path().app_local_data_dir() {
			Ok(p) => p.join("index"),
			Err(e) => {
				eprintln!("[INDEX-PERSIST] no app_local_data_dir: {e}");
				return;
			}
		};
		let cache_path = match cache_file_path(&base_dir, &vault_path) {
			Ok(p) => p,
			Err(e) => {
				eprintln!("[INDEX-PERSIST] resolve cache path: {e}");
				return;
			}
		};
		let vault_hash = hash_vault_path(&vault_path);

		let state: tauri::State<crate::vault::VaultIndexState> = app.state();
		let entries: Vec<NoteEntry> = match state.read() {
			Ok(idx) => idx.entries().values().cloned().collect(),
			Err(e) => {
				eprintln!("[INDEX-PERSIST] state read poisoned: {e}");
				return;
			}
		};

		let now_secs = chrono::Utc::now().timestamp();
		let bytes = match serialize_snapshot(vault_hash, now_secs, &entries) {
			Ok(b) => b,
			Err(e) => {
				eprintln!("[INDEX-PERSIST] serialize failed: {e}");
				return;
			}
		};
		if let Err(e) = write_snapshot_atomic(&cache_path, &bytes) {
			eprintln!("[INDEX-PERSIST] write failed: {e}");
			return;
		}
		PERFORMED_WRITES.fetch_add(1, Ordering::SeqCst);
	});

	if let Ok(mut slot) = inflight_slot().try_lock() {
		*slot = Some(handle);
	}
}

/// Test-only: override the debounce window so tests don't have to
/// wait 5 s per assertion. Pass `0` to restore the default.
pub fn set_debounce_ms_for_tests(ms: u64) {
	DEBOUNCE_OVERRIDE_MS.store(ms, Ordering::SeqCst);
}

/// Test-only: returns the number of successful writes since process
/// start (or the last `reset_writes_for_tests` call). Inspects the
/// `PERFORMED_WRITES` counter directly.
pub fn writes_performed_for_tests() -> u64 {
	PERFORMED_WRITES.load(Ordering::SeqCst)
}

/// Test-only: zero the write counter + generation so successive test
/// cases don't observe each other's state. Does NOT cancel any
/// in-flight task — callers should `flush_pending_snapshot().await`
/// first if they need a clean slate.
pub fn reset_for_tests() {
	PERFORMED_WRITES.store(0, Ordering::SeqCst);
	GENERATION.store(0, Ordering::SeqCst);
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::vault::entry::NoteEntry;
	use std::collections::BTreeMap;
	use std::sync::Mutex as StdMutex;

	// Test cases mutate process-global state (GENERATION,
	// PERFORMED_WRITES, DEBOUNCE_OVERRIDE_MS, the inflight slot). Run
	// them serially so they don't trample each other.
	static TEST_LOCK: StdMutex<()> = StdMutex::new(());

	fn sample_entry(path: &str) -> NoteEntry {
		NoteEntry {
			path: path.to_string(),
			title: "x".to_string(),
			frontmatter: BTreeMap::new(),
			outgoing_links: Vec::new(),
			tags: Vec::new(),
			modified_at: 0,
			created_at: 0,
			size: 0,
			word_count: 0,
			snippet: String::new(),
			tasks: Vec::new(),
		}
	}

	#[tokio::test]
	async fn rapid_schedules_collapse_to_one_write() {
		let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
		flush_pending_snapshot().await;
		reset_for_tests();
		set_debounce_ms_for_tests(60);

		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("vault.bincode");
		let hash = "test-hash".to_string();
		let entries = vec![sample_entry("/v/a.md")];

		for _ in 0..5 {
			schedule_snapshot_write(cache_path.clone(), hash.clone(), entries.clone());
		}
		flush_pending_snapshot().await;

		assert_eq!(writes_performed_for_tests(), 1, "5 rapid schedules should collapse to 1 write");
		assert!(cache_path.exists());

		set_debounce_ms_for_tests(0);
	}

	#[tokio::test]
	async fn flush_synchronously_waits_for_in_flight_write() {
		let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
		flush_pending_snapshot().await;
		reset_for_tests();
		set_debounce_ms_for_tests(100);

		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("vault.bincode");
		schedule_snapshot_write(cache_path.clone(), "hash".into(), vec![]);
		// Immediately flush — file should NOT exist yet (debounce
		// hasn't fired). flush awaits the task; on return the file
		// must exist.
		assert!(!cache_path.exists(), "file should not exist before debounce fires");
		flush_pending_snapshot().await;
		assert!(cache_path.exists(), "flush should wait for the write");
		assert_eq!(writes_performed_for_tests(), 1);

		set_debounce_ms_for_tests(0);
	}

	#[tokio::test]
	async fn write_failure_does_not_propagate() {
		let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
		flush_pending_snapshot().await;
		reset_for_tests();
		set_debounce_ms_for_tests(50);

		// Aim the write at a path that cannot be created (parent is a
		// file, not a directory) — write_snapshot_atomic must fail
		// internally and the scheduled task must swallow the error.
		let tmp = tempfile::tempdir().unwrap();
		let blocker = tmp.path().join("not_a_dir");
		std::fs::write(&blocker, b"i am a file").unwrap();
		let cache_path = blocker.join("vault.bincode");

		schedule_snapshot_write(cache_path.clone(), "hash".into(), vec![]);
		// Must not panic; must return without erroring.
		flush_pending_snapshot().await;

		assert_eq!(writes_performed_for_tests(), 0, "no write counter bump on failure");
		assert!(!cache_path.exists());

		set_debounce_ms_for_tests(0);
	}

	#[tokio::test]
	async fn flush_is_safe_when_nothing_scheduled() {
		let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
		flush_pending_snapshot().await;
		reset_for_tests();
		// No schedule call — flush must just return.
		flush_pending_snapshot().await;
		assert_eq!(writes_performed_for_tests(), 0);
	}

	#[tokio::test]
	async fn newer_schedule_wins_over_older() {
		let _guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
		flush_pending_snapshot().await;
		reset_for_tests();
		set_debounce_ms_for_tests(80);

		let tmp = tempfile::tempdir().unwrap();
		let cache_path = tmp.path().join("vault.bincode");

		let entries_v1 = vec![sample_entry("/v/a.md")];
		let entries_v2 = vec![sample_entry("/v/a.md"), sample_entry("/v/b.md")];

		schedule_snapshot_write(cache_path.clone(), "hash".into(), entries_v1);
		// Wait ~20 ms (well under the 80 ms debounce), then schedule
		// a newer version — the older task should lose the gen check.
		tokio::time::sleep(Duration::from_millis(20)).await;
		schedule_snapshot_write(cache_path.clone(), "hash".into(), entries_v2.clone());
		flush_pending_snapshot().await;

		// Verify the cache has the v2 payload.
		let bytes = std::fs::read(&cache_path).unwrap();
		let snap = crate::vault::index_cache::deserialize_snapshot(&bytes).unwrap();
		assert_eq!(snap.into_entries().unwrap(), entries_v2);
		assert_eq!(writes_performed_for_tests(), 1);

		set_debounce_ms_for_tests(0);
	}
}
