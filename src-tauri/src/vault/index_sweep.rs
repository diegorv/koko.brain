//! Mtime reconciliation sweep that runs after the cache-load path in
//! `scan_vault_v2_cached`. Walks the vault, compares per-file
//! `modified_at` against the loaded `VaultIndex` snapshot, and applies
//! incremental `update_entry` / `remove_entry` calls to bring the
//! in-memory index in sync with what's actually on disk.
//!
//! Files that match the snapshot's stored mtime are skipped (cheap
//! stat, no parse). Stale or new files are re-parsed. Files in the
//! snapshot but absent from disk are removed.
//!
//! Emits `vault-index-updated` (with `affected: []` signalling
//! "full rebuild — re-fetch from scratch") and
//! `VAULT_INDEX_SWEEP_COMPLETE_EVENT` when the sweep finishes. The TS
//! bootstrap waits for the sweep-complete event before starting the
//! file watcher (Task 7) to avoid interleaving watcher-triggered
//! events with the sweep's in-flight mutations.
//!
//! Runs on `tokio::spawn` and never blocks the IPC return. Cancellable
//! via the static `SWEEP_GENERATION` counter: a new sweep
//! (e.g. triggered by vault-switch) supersedes any in-flight one.

use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use crate::vault::entry::NoteEntry;
use crate::vault::index::UpdateResult;
use crate::vault::{VaultIndexState, VAULT_INDEX_UPDATED_EVENT};

/// Frontend event name emitted when the boot reconciliation sweep
/// completes. TS bootstrap defers `startWatching` until this fires
/// so file-watcher events don't interleave with the sweep's
/// `update_entry` calls.
pub const VAULT_INDEX_SWEEP_COMPLETE_EVENT: &str = "vault-index-sweep-complete";

/// Generation counter so a vault-switch can cancel an in-flight sweep
/// from a previous vault. Each spawn captures the value at start;
/// the sweep checks before applying each mutation and exits early
/// on mismatch.
static SWEEP_GENERATION: AtomicU64 = AtomicU64::new(0);

/// Spawns the mtime reconciliation sweep on a background tokio task.
/// Returns immediately. Caller is responsible for ensuring the
/// `VaultIndex` has already been populated from the cache before
/// invoking — the sweep reads the index's current `modified_at`
/// values to decide what's stale.
pub fn spawn_reconcile(app: tauri::AppHandle, vault_path: String) {
	let my_gen = SWEEP_GENERATION.fetch_add(1, Ordering::SeqCst).wrapping_add(1);
	// Use Tauri's bundled async runtime — sync Tauri commands like
	// scan_vault_v2_cached run outside Tokio context, so a bare
	// `tokio::spawn` panics with "there is no reactor running".
	// `tauri::async_runtime::spawn` always lands the task on Tauri's
	// global Tokio runtime, regardless of the caller's context.
	tauri::async_runtime::spawn(async move {
		reconcile_with_disk(app, vault_path, my_gen).await;
	});
}

async fn reconcile_with_disk(
	app: tauri::AppHandle,
	vault_path: String,
	my_gen: u64,
) {
	use tauri::Emitter;
	use tauri::Manager;

	let start = Instant::now();
	debug_log("INDEX-SWEEP", format!("starting reconcile for {}", vault_path));

	// Phase 1: snapshot the (path, modified_at) pairs from the
	// in-memory index under a brief read lock. Releasing the lock
	// before the disk walk avoids blocking command readers for the
	// full sweep duration.
	let snapshot_mtimes: HashMap<String, i64> = {
		let state: tauri::State<VaultIndexState> = app.state();
		let Ok(idx) = state.read() else {
			debug_log("INDEX-SWEEP", "state read poisoned; aborting sweep".to_string());
			return;
		};
		idx.entries()
			.iter()
			.map(|(p, e)| (p.clone(), e.modified_at))
			.collect()
	};

	// Phase 2: walk the vault on a blocking task (filesystem IO).
	let vault_root = PathBuf::from(&vault_path);
	let disk_entries = match tokio::task::spawn_blocking(move || {
		vault_fs::collect_markdown_paths_with_metadata(&vault_root, &[])
	})
	.await
	{
		Ok(Ok(entries)) => entries,
		Ok(Err(e)) => {
			debug_log("INDEX-SWEEP", format!("walk failed: {}", e));
			return;
		}
		Err(e) => {
			debug_log("INDEX-SWEEP", format!("walk join failed: {}", e));
			return;
		}
	};

	if SWEEP_GENERATION.load(Ordering::SeqCst) != my_gen {
		debug_log("INDEX-SWEEP", "superseded during walk; aborting".to_string());
		return;
	}

	// Phase 3: diff against the snapshot.
	let mut to_reindex: Vec<(String, i64, i64, u64)> = Vec::new();
	let mut disk_paths: HashSet<String> = HashSet::new();
	for (_rel, abs, mtime, ctime, size) in disk_entries {
		let abs_str = abs.to_string_lossy().to_string();
		match snapshot_mtimes.get(&abs_str) {
			None => {
				// New file (added while app was closed).
				to_reindex.push((abs_str.clone(), mtime, ctime, size));
			}
			Some(&cached_mtime) if cached_mtime != mtime => {
				// Stale (content edited externally or by `update_note_in_index`
				// from a prior session whose final save didn't make it into the
				// snapshot before the app was force-killed).
				to_reindex.push((abs_str.clone(), mtime, ctime, size));
			}
			_ => {}
		}
		disk_paths.insert(abs_str);
	}

	let to_remove: Vec<String> = snapshot_mtimes
		.keys()
		.filter(|p| !disk_paths.contains(*p))
		.cloned()
		.collect();

	// Phase 4: apply mutations. Each per-file read + parse runs on a
	// blocking task so the tokio runtime isn't tied up; the lock is
	// acquired per-file so command readers can interleave between
	// updates.
	let mut applied: usize = 0;
	for (path, mtime, ctime, size) in to_reindex {
		if SWEEP_GENERATION.load(Ordering::SeqCst) != my_gen {
			debug_log("INDEX-SWEEP", "superseded mid-apply; aborting".to_string());
			return;
		}
		let path_for_blocking = path.clone();
		let content = match tokio::task::spawn_blocking(move || fs::read_to_string(&path_for_blocking)).await {
			Ok(Ok(c)) => c,
			Ok(Err(e)) => {
				debug_log(
					"INDEX-SWEEP",
					format!("skip stale {}: read error: {}", path, e),
				);
				continue;
			}
			Err(e) => {
				debug_log("INDEX-SWEEP", format!("join error reading {}: {}", path, e));
				continue;
			}
		};
		let entry = NoteEntry::from_content_full(path, &content, mtime, ctime, size);
		let state: tauri::State<VaultIndexState> = app.state();
		{
			if let Ok(mut idx) = state.write() {
				let _ = idx.update_entry(entry);
				applied += 1;
			}
		};
		drop(state);
	}

	let mut removed: usize = 0;
	if !to_remove.is_empty() {
		let state: tauri::State<VaultIndexState> = app.state();
		{
			if let Ok(mut idx) = state.write() {
				for path in &to_remove {
					let _ = idx.remove_entry(path);
					removed += 1;
				}
			}
		};
		drop(state);
	}

	// Phase 5: emit one consolidated vault-index-updated (panels
	// re-fetch from scratch) and the sweep-complete event (TS
	// bootstrap watcher-start gate).
	let final_version = {
		let state: tauri::State<VaultIndexState> = app.state();
		state.read().map(|i| i.version()).unwrap_or(0)
	};

	if applied + removed > 0 {
		let payload = UpdateResult {
			changed: true,
			affected: Vec::new(),
			version: final_version,
		};
		if let Err(e) = app.emit(VAULT_INDEX_UPDATED_EVENT, &payload) {
			debug_log("INDEX-SWEEP", format!("vault-index-updated emit failed: {}", e));
		}
	}

	if let Err(e) = app.emit(VAULT_INDEX_SWEEP_COMPLETE_EVENT, ()) {
		debug_log("INDEX-SWEEP", format!("sweep-complete emit failed: {}", e));
	}

	debug_log(
		"INDEX-SWEEP",
		format!(
			"reconcile complete: {} reindexed, {} removed in {}ms",
			applied,
			removed,
			start.elapsed().as_millis(),
		),
	);
}
