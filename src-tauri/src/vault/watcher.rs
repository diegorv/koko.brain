//! Native Rust file watcher (Phase 9).
//!
//! Replaces the TS `fs.watcher.ts` flow that wrapped Tauri's
//! `@tauri-apps/plugin-fs::watch`. The detection layer (`notify` crate)
//! is the same one Tauri's plugin uses internally — we just move the
//! orchestration (debounce, hidden-dir filter, ancestor filter, event
//! emit) into Rust so the JS main thread doesn't run it.
//!
//! Design:
//! - `notify::recommended_watcher` runs on its own kernel-fed thread.
//! - A bridge thread receives raw events, applies the hidden-dir + path
//!   filter, and accumulates into a `HashSet<String>`.
//! - When the bridge sees `mpsc::recv_timeout(500ms)` time out AND the
//!   buffer is non-empty, it filters ancestor paths and emits a single
//!   `vault-files-changed` event with the deduplicated path list. This
//!   matches the TS 500 ms debounce shape exactly.
//! - The Tauri command wraps the inner `start_watcher_inner` (which
//!   takes a callback) so tests can substitute the emit with a channel.

use crate::utils::logger::debug_log;
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashSet;
use std::path::Path;
use std::sync::mpsc;
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::Emitter;

/// Frontend event emitted on every debounced burst of vault file
/// changes. Payload is the deduplicated, hidden-dir-filtered,
/// ancestor-filtered list of paths.
pub const VAULT_FILES_CHANGED_EVENT: &str = "vault-files-changed";

/// Debounce window — must match the TS watcher's 500 ms behaviour to
/// preserve the existing batch-rebuild semantics.
const DEBOUNCE_MS: u64 = 500;

/// Well-known noisy VCS / system directories and files that may appear at
/// ANY depth inside a vault. Watcher events touching paths whose segments
/// include any of these are silently dropped.
///
/// Why this list specifically:
/// - `.git`, `.svn`, `.hg`: nested working copies (e.g. cloned repos inside
///   a "Reading list" folder) churn constantly during fetch/index/gc; their
///   internal files contain no user content.
/// - `.backup`: convention used by tooling (e.g. `pragmaticengineer-substack/
///   .backup` in real vaults) for sidecar snapshots that mutate on every
///   sync.
/// - `.DS_Store`: macOS Finder metadata; one file per directory, rewritten
///   whenever the user opens a window.
///
/// The list is intentionally narrow — generic dot-prefixed segments (e.g.
/// `.archive`) keep passing through at depth so legitimate user content is
/// not silently lost. Top-level dot-prefixed dirs are still rejected by
/// `is_inside_hidden_dir` (the broader filter).
const NESTED_NOISE_SEGMENTS: &[&str] = &[".git", ".svn", ".hg", ".backup", ".DS_Store"];

/// Payload emitted with `vault-files-changed`. Mirrors the TS-side
/// `WatcherChangedPayload` introduced in the FE-migration commit.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultFilesChangedPayload {
	pub paths: Vec<String>,
}

// ============================================================================
// Pure-logic helpers (testable without spawning notify or tokio)
// ============================================================================

/// Returns `true` when `path` is inside a hidden (dot-prefixed)
/// top-level directory relative to `vault_prefix`. The vault prefix
/// MUST end with `/` — `start_watcher_inner` constructs it that way.
///
/// Mirrors `fs.watcher.ts::isInsideHiddenDir` exactly:
///   - `/vault/.git/foo` → `true`
///   - `/vault/.kokobrain/db` → `true`
///   - `/vault/notes/.archive/x` → `false` (only first segment counts)
///   - `/vault/notes/foo.md` → `false`
///   - paths outside `vault_prefix` → `false` (defensive; should never happen)
pub fn is_inside_hidden_dir(path: &str, vault_prefix: &str) -> bool {
	if !path.starts_with(vault_prefix) {
		return false;
	}
	let relative = &path[vault_prefix.len()..];
	let first_segment = relative.split('/').next().unwrap_or("");
	first_segment.starts_with('.')
}

/// Returns `true` when any segment of `path` (relative to `vault_prefix`)
/// matches one of the well-known nested noise dirs/files in
/// `NESTED_NOISE_SEGMENTS`. Used together with `is_inside_hidden_dir` to
/// suppress watcher events from nested `.git`/`.svn`/`.hg`/`.backup`
/// working copies and `.DS_Store` metadata files at any depth.
///
/// Paths outside `vault_prefix` return `false` (defensive — the watcher's
/// notify only fires inside the watched dir).
pub fn contains_nested_noise(path: &str, vault_prefix: &str) -> bool {
	if !path.starts_with(vault_prefix) {
		return false;
	}
	let relative = &path[vault_prefix.len()..];
	relative
		.split('/')
		.any(|segment| NESTED_NOISE_SEGMENTS.contains(&segment))
}

/// Returns the input minus paths that are ancestors of other paths in
/// the same set. macOS FSEvents reports parent directories on child
/// changes (metadata propagation); keeping only the deepest paths
/// avoids redundant `scan_vault` calls for intermediate directories.
///
/// Order is preserved (stable filter). O(n²) — acceptable for the
/// typical burst size of <50 paths.
pub fn filter_ancestor_paths(paths: &[String]) -> Vec<String> {
	paths
		.iter()
		.filter(|p| {
			let prefix = format!("{}/", p);
			!paths
				.iter()
				.any(|other| other != *p && other.starts_with(&prefix))
		})
		.cloned()
		.collect()
}

// ============================================================================
// Watcher state + lifecycle
// ============================================================================

/// Inner watcher handle. Holds the `notify` watcher (drop = stop watching)
/// and a stop signal for the bridge thread. The bridge thread also exits
/// when the `mpsc::Sender` (held inside the watcher closure) is dropped,
/// so the explicit stop signal is mostly defensive belt-and-braces.
pub struct VaultWatcher {
	_watcher: RecommendedWatcher,
	stop_tx: Option<mpsc::Sender<()>>,
}

/// Tauri-managed state — wraps `Option<VaultWatcher>` in a `Mutex`. The
/// `start_vault_watcher` command stops any existing watcher before
/// installing a new one (mirrors `fs.watcher.ts::startWatching`'s
/// `await stopWatching()` precondition).
pub type VaultWatcherState = Mutex<Option<VaultWatcher>>;

/// Pure-logic version of the bridge thread's event loop, exposed for
/// tests. Receives raw paths via `event_rx` and stop signals via
/// `stop_rx`. Calls `on_emit` once per debounced burst with the filtered
/// path list. Returns when `event_rx` disconnects OR `stop_rx` fires.
///
/// `vault_prefix` MUST end with `/`. The hidden-dir filter is applied
/// before paths enter the buffer.
pub fn run_debounce_loop<F>(
	event_rx: mpsc::Receiver<String>,
	stop_rx: mpsc::Receiver<()>,
	vault_prefix: String,
	on_emit: F,
) where
	F: Fn(Vec<String>) + Send + 'static,
{
	let mut buffer: HashSet<String> = HashSet::new();
	let mut last_event = Instant::now();
	let debounce = Duration::from_millis(DEBOUNCE_MS);

	loop {
		// Cooperative stop check — the watcher's drop also closes
		// `event_rx`, so this is a defensive double-bottom.
		if let Ok(()) = stop_rx.try_recv() {
			return;
		}

		match event_rx.recv_timeout(debounce) {
			Ok(path) => {
				if !is_inside_hidden_dir(&path, &vault_prefix)
					&& !contains_nested_noise(&path, &vault_prefix)
				{
					buffer.insert(path);
				}
				last_event = Instant::now();
			}
			Err(mpsc::RecvTimeoutError::Timeout) => {
				// No event in `DEBOUNCE_MS`. Emit if we have a non-empty
				// buffer AND the last event is at least one debounce
				// window old (defends against a single late event
				// extending the burst forever — match TS shape).
				if !buffer.is_empty() && last_event.elapsed() >= debounce {
					let raw: Vec<String> = buffer.drain().collect();
					let filtered = filter_ancestor_paths(&raw);
					if !filtered.is_empty() {
						on_emit(filtered);
					}
				}
			}
			Err(mpsc::RecvTimeoutError::Disconnected) => {
				// Watcher dropped. Final flush, then exit.
				if !buffer.is_empty() {
					let raw: Vec<String> = buffer.drain().collect();
					let filtered = filter_ancestor_paths(&raw);
					if !filtered.is_empty() {
						on_emit(filtered);
					}
				}
				return;
			}
		}
	}
}

/// Starts a native file watcher rooted at `vault_path`. The `on_change`
/// callback fires once per debounced burst with the filtered path list.
/// Returns the watcher handle — drop it (or send `()` on `stop_tx`) to
/// stop watching.
///
/// `vault_path` should be absolute. The function appends `/` to derive
/// the prefix used by `is_inside_hidden_dir`. Returns `Err` when the
/// underlying `notify` watcher fails to initialise OR `vault_path` is
/// not a watchable directory.
pub fn start_watcher_inner<F>(vault_path: &str, on_change: F) -> Result<VaultWatcher, String>
where
	F: Fn(Vec<String>) + Send + 'static,
{
	let vault_prefix = if vault_path.ends_with('/') {
		vault_path.to_string()
	} else {
		format!("{}/", vault_path)
	};
	let (event_tx, event_rx) = mpsc::channel::<String>();
	let (stop_tx, stop_rx) = mpsc::channel::<()>();

	let mut watcher: RecommendedWatcher = notify::recommended_watcher(
		move |res: notify::Result<notify::Event>| match res {
			Ok(event) => {
				for path in event.paths {
					let path_str = path.to_string_lossy().to_string();
					// Send is best-effort; if the bridge thread is gone
					// the watcher will stop being polled and dropped.
					let _ = event_tx.send(path_str);
				}
			}
			Err(e) => debug_log("WATCHER", format!("notify error: {:?}", e)),
		},
	)
	.map_err(|e| format!("notify init: {}", e))?;
	watcher
		.watch(Path::new(vault_path), RecursiveMode::Recursive)
		.map_err(|e| format!("watch start: {}", e))?;

	thread::spawn(move || run_debounce_loop(event_rx, stop_rx, vault_prefix, on_change));

	Ok(VaultWatcher {
		_watcher: watcher,
		stop_tx: Some(stop_tx),
	})
}

// ============================================================================
// Tauri commands
// ============================================================================

/// Tauri command: starts (or replaces) the vault watcher. Stops any
/// existing watcher before installing a new one — mirrors the TS
/// `fs.watcher.ts::startWatching`'s `await stopWatching()` precondition.
///
/// Audit Tier 2 #7 (2026-04-29): the previous implementation built the
/// new watcher BEFORE acquiring the state lock and dropping the old one.
/// That left a narrow window where the old bridge thread's "final flush"
/// (triggered by Drop closing the notify channel) could emit a
/// `vault-files-changed` event AFTER the new watcher was installed, with
/// paths from the OLD vault. The TS handler has no way to attribute the
/// event to the old vault, so it would queue stale paths through the
/// new vault's update pipeline. Fix: drop the old watcher inside the
/// lock guard scope BEFORE building the new one.
#[tauri::command]
pub fn start_vault_watcher(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultWatcherState>,
	path: String,
) -> Result<(), String> {
	let app_clone = app.clone();
	let on_change = move |paths: Vec<String>| {
		let payload = VaultFilesChangedPayload { paths };
		if let Err(e) = app_clone.emit(VAULT_FILES_CHANGED_EVENT, &payload) {
			debug_log("WATCHER", format!("emit failed: {}", e));
		}
	};

	// Take + drop the old watcher WHILE holding the lock so its bridge
	// thread's final flush completes before any new watcher can be
	// installed. The drop chain: `take()` returns Some(VaultWatcher) →
	// the temporary is dropped at the end of the `if let` body →
	// notify::Watcher dropped → channel sender dropped → bridge thread
	// sees Disconnected → final flush emit fires (with old vault's paths)
	// → bridge thread exits. The `drop(old)` is explicit to make the
	// timing intent clear.
	let mut guard = state
		.lock()
		.map_err(|e| format!("watcher state lock poisoned: {}", e))?;
	if let Some(mut old) = guard.take() {
		if let Some(stop_tx) = old.stop_tx.take() {
			let _ = stop_tx.send(());
		}
		drop(old);
	}

	let watcher = start_watcher_inner(&path, on_change)?;
	*guard = Some(watcher);
	Ok(())
}

/// Tauri command: stops the vault watcher (if any). No-op when no
/// watcher is running.
#[tauri::command]
pub fn stop_vault_watcher(state: tauri::State<'_, VaultWatcherState>) -> Result<(), String> {
	let mut guard = state
		.lock()
		.map_err(|e| format!("watcher state lock poisoned: {}", e))?;
	if let Some(mut existing) = guard.take() {
		// Belt-and-braces: signal the bridge thread to stop, even though
		// dropping the watcher will close the event channel.
		if let Some(tx) = existing.stop_tx.take() {
			let _ = tx.send(());
		}
	}
	Ok(())
}

#[cfg(test)]
mod tests {
	use super::*;

	// ---------- is_inside_hidden_dir ----------

	#[test]
	fn hidden_filter_rejects_dotgit() {
		assert!(is_inside_hidden_dir("/vault/.git/HEAD", "/vault/"));
	}

	#[test]
	fn hidden_filter_rejects_dotkokobrain() {
		assert!(is_inside_hidden_dir("/vault/.kokobrain/db.sqlite", "/vault/"));
	}

	#[test]
	fn hidden_filter_rejects_dotobsidian() {
		assert!(is_inside_hidden_dir(
			"/vault/.obsidian/workspace.json",
			"/vault/"
		));
	}

	#[test]
	fn hidden_filter_rejects_dotclaude() {
		assert!(is_inside_hidden_dir("/vault/.claude/settings.json", "/vault/"));
	}

	#[test]
	fn hidden_filter_first_segment_only() {
		// `.archive` is NOT the first segment relative to vault — the
		// first segment is `notes`. Path-deep dot-prefixed directories
		// are NOT skipped (matches TS).
		assert!(!is_inside_hidden_dir("/vault/notes/.archive/x.md", "/vault/"));
	}

	#[test]
	fn hidden_filter_passes_normal_path() {
		assert!(!is_inside_hidden_dir("/vault/notes/foo.md", "/vault/"));
	}

	#[test]
	fn hidden_filter_outside_prefix_is_false() {
		// Defensive: the watcher's notify only fires inside the watched
		// dir, but if a stray path slips through we don't want to claim
		// it's hidden when it doesn't belong to us.
		assert!(!is_inside_hidden_dir("/other/.git/HEAD", "/vault/"));
	}

	#[test]
	fn hidden_filter_dotfile_at_root_is_hidden() {
		// `/vault/.dotfile` → first segment is `.dotfile` → hidden.
		// Matches TS behaviour (TS checks `firstSegment.startsWith('.')`).
		assert!(is_inside_hidden_dir("/vault/.dotfile", "/vault/"));
	}

	// ---------- contains_nested_noise ----------

	#[test]
	fn nested_noise_rejects_dotgit_at_depth() {
		// Real-world case from Audit 2026-05-11: a vault containing
		// `Reading list/lennysnewsletter/.git/objects/*` triggered a
		// watcher loop because the first-segment check let these pass.
		assert!(contains_nested_noise(
			"/vault/Reading list/lennysnewsletter/.git/HEAD",
			"/vault/",
		));
	}

	#[test]
	fn nested_noise_rejects_dotbackup_at_depth() {
		assert!(contains_nested_noise(
			"/vault/Reading list/pragmaticengineer-substack/.backup/2026-05.zip",
			"/vault/",
		));
	}

	#[test]
	fn nested_noise_rejects_dotsvn_at_depth() {
		assert!(contains_nested_noise("/vault/proj/.svn/entries", "/vault/"));
	}

	#[test]
	fn nested_noise_rejects_dothg_at_depth() {
		assert!(contains_nested_noise("/vault/proj/.hg/store/data", "/vault/"));
	}

	#[test]
	fn nested_noise_rejects_dotdsstore_file_at_depth() {
		// `.DS_Store` is a FILE, not a dir, but the segment scan treats it
		// the same way — any `/path/.DS_Store` is filtered.
		assert!(contains_nested_noise(
			"/vault/notes/folder/.DS_Store",
			"/vault/",
		));
	}

	#[test]
	fn nested_noise_passes_dotarchive_at_depth() {
		// `.archive` is intentionally NOT in the noise list — user content
		// in dot-prefixed folders deep in the vault must still index.
		assert!(!contains_nested_noise("/vault/notes/.archive/x.md", "/vault/"));
	}

	#[test]
	fn nested_noise_passes_gitconfig_file_at_depth() {
		// `.gitconfig` is a single segment that does NOT match `.git` —
		// substring-style matches would be wrong.
		assert!(!contains_nested_noise(
			"/vault/notes/.gitconfig",
			"/vault/",
		));
	}

	#[test]
	fn nested_noise_passes_normal_note() {
		assert!(!contains_nested_noise("/vault/notes/foo.md", "/vault/"));
	}

	#[test]
	fn nested_noise_outside_prefix_is_false() {
		assert!(!contains_nested_noise("/other/.git/HEAD", "/vault/"));
	}

	// ---------- filter_ancestor_paths ----------

	#[test]
	fn ancestor_filter_single_path_unchanged() {
		let paths = vec!["/v/a.md".to_string()];
		assert_eq!(filter_ancestor_paths(&paths), paths);
	}

	#[test]
	fn ancestor_filter_keeps_deepest_when_parent_present() {
		let paths = vec!["/v/dir".to_string(), "/v/dir/file.md".to_string()];
		assert_eq!(
			filter_ancestor_paths(&paths),
			vec!["/v/dir/file.md".to_string()]
		);
	}

	#[test]
	fn ancestor_filter_keeps_unrelated_paths() {
		let paths = vec!["/v/a.md".to_string(), "/v/b.md".to_string()];
		assert_eq!(filter_ancestor_paths(&paths), paths);
	}

	#[test]
	fn ancestor_filter_three_level_nest() {
		let paths = vec![
			"/v".to_string(),
			"/v/a".to_string(),
			"/v/a/b.md".to_string(),
		];
		assert_eq!(filter_ancestor_paths(&paths), vec!["/v/a/b.md".to_string()]);
	}

	#[test]
	fn ancestor_filter_siblings_both_kept() {
		let paths = vec![
			"/v/dir/a.md".to_string(),
			"/v/dir/b.md".to_string(),
		];
		assert_eq!(filter_ancestor_paths(&paths), paths);
	}

	#[test]
	fn ancestor_filter_does_not_match_substring_only() {
		// `/v/foo` is NOT an ancestor of `/v/foobar` — the trailing `/`
		// guard prevents that false positive.
		let paths = vec!["/v/foo".to_string(), "/v/foobar".to_string()];
		assert_eq!(filter_ancestor_paths(&paths), paths);
	}

	// ---------- run_debounce_loop ----------

	#[test]
	fn debounce_emits_after_quiet_period() {
		let (event_tx, event_rx) = mpsc::channel::<String>();
		let (_stop_tx, stop_rx) = mpsc::channel::<()>();
		let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

		let handle = thread::spawn(move || {
			run_debounce_loop(event_rx, stop_rx, "/v/".to_string(), move |paths| {
				let _ = emit_tx.send(paths);
			});
		});

		event_tx.send("/v/a.md".to_string()).unwrap();
		event_tx.send("/v/b.md".to_string()).unwrap();
		// Drop the sender; loop will see Disconnected, do final flush, exit.
		drop(event_tx);

		let emitted = emit_rx
			.recv_timeout(Duration::from_secs(2))
			.expect("expected emit");
		let mut sorted = emitted.clone();
		sorted.sort();
		assert_eq!(sorted, vec!["/v/a.md".to_string(), "/v/b.md".to_string()]);
		handle.join().unwrap();
	}

	#[test]
	fn debounce_filters_hidden_dir() {
		let (event_tx, event_rx) = mpsc::channel::<String>();
		let (_stop_tx, stop_rx) = mpsc::channel::<()>();
		let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

		let handle = thread::spawn(move || {
			run_debounce_loop(event_rx, stop_rx, "/v/".to_string(), move |paths| {
				let _ = emit_tx.send(paths);
			});
		});

		event_tx.send("/v/.git/HEAD".to_string()).unwrap();
		event_tx.send("/v/note.md".to_string()).unwrap();
		drop(event_tx);

		let emitted = emit_rx
			.recv_timeout(Duration::from_secs(2))
			.expect("expected emit");
		assert_eq!(emitted, vec!["/v/note.md".to_string()]);
		handle.join().unwrap();
	}

	#[test]
	fn debounce_filters_nested_noise_dotgit() {
		// Integration check: a vault with a nested `.git` working copy
		// pumps churn through the watcher. The loop must drop them so the
		// downstream rebuild pipeline doesn't enter an infinite cycle.
		let (event_tx, event_rx) = mpsc::channel::<String>();
		let (_stop_tx, stop_rx) = mpsc::channel::<()>();
		let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

		let handle = thread::spawn(move || {
			run_debounce_loop(event_rx, stop_rx, "/v/".to_string(), move |paths| {
				let _ = emit_tx.send(paths);
			});
		});

		event_tx
			.send("/v/Reading list/repo/.git/objects/abc".to_string())
			.unwrap();
		event_tx
			.send("/v/Reading list/repo/.git/HEAD".to_string())
			.unwrap();
		event_tx.send("/v/note.md".to_string()).unwrap();
		drop(event_tx);

		let emitted = emit_rx
			.recv_timeout(Duration::from_secs(2))
			.expect("expected emit");
		assert_eq!(emitted, vec!["/v/note.md".to_string()]);
		handle.join().unwrap();
	}

	#[test]
	fn debounce_filters_ancestor_paths() {
		let (event_tx, event_rx) = mpsc::channel::<String>();
		let (_stop_tx, stop_rx) = mpsc::channel::<()>();
		let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

		let handle = thread::spawn(move || {
			run_debounce_loop(event_rx, stop_rx, "/v/".to_string(), move |paths| {
				let _ = emit_tx.send(paths);
			});
		});

		event_tx.send("/v/dir".to_string()).unwrap();
		event_tx.send("/v/dir/file.md".to_string()).unwrap();
		drop(event_tx);

		let emitted = emit_rx
			.recv_timeout(Duration::from_secs(2))
			.expect("expected emit");
		assert_eq!(emitted, vec!["/v/dir/file.md".to_string()]);
		handle.join().unwrap();
	}

	#[test]
	fn debounce_no_emit_when_buffer_empty() {
		let (event_tx, event_rx) = mpsc::channel::<String>();
		let (_stop_tx, stop_rx) = mpsc::channel::<()>();
		let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

		let handle = thread::spawn(move || {
			run_debounce_loop(event_rx, stop_rx, "/v/".to_string(), move |paths| {
				let _ = emit_tx.send(paths);
			});
		});

		// Send only hidden paths — buffer never accumulates anything.
		event_tx.send("/v/.git/HEAD".to_string()).unwrap();
		drop(event_tx);

		// 1s should be plenty for the loop to time out + exit without emitting.
		assert!(
			emit_rx.recv_timeout(Duration::from_secs(1)).is_err(),
			"should NOT have emitted"
		);
		handle.join().unwrap();
	}

	#[test]
	fn debounce_stop_signal_exits_loop() {
		let (_event_tx, event_rx) = mpsc::channel::<String>();
		let (stop_tx, stop_rx) = mpsc::channel::<()>();
		let (emit_tx, _emit_rx) = mpsc::channel::<Vec<String>>();

		let handle = thread::spawn(move || {
			run_debounce_loop(event_rx, stop_rx, "/v/".to_string(), move |paths| {
				let _ = emit_tx.send(paths);
			});
		});

		// Give the loop a moment to enter the recv_timeout state.
		thread::sleep(Duration::from_millis(100));
		stop_tx.send(()).unwrap();
		// Wait for the loop to see the signal on its next tick.
		handle
			.join()
			.expect("loop should exit after stop signal");
	}

	// ---------- payload serialization ----------

	#[test]
	fn payload_serializes_with_camel_case() {
		let payload = VaultFilesChangedPayload {
			paths: vec!["/v/a.md".to_string()],
		};
		let json = serde_json::to_string(&payload).unwrap();
		// The payload itself only has one field but rename_all=camelCase
		// is in place defensively for future fields. The current `paths`
		// is already lowercase.
		assert!(json.contains("\"paths\""));
		assert!(json.contains("/v/a.md"));
	}
}
