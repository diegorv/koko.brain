//! Phase 9 — End-to-end watcher integration tests.
//!
//! Spins up a real `notify`-backed watcher on a tempdir, exercises the
//! debounce + filter pipeline, and asserts the emitted path lists.
//! Tests are slow-ish (each waits 500-800ms for the debounce) but
//! catch every wiring issue between `notify` and the bridge thread.

use kokobrain_lib::commands::vault::write_mod_data;
use kokobrain_lib::utils::fs::write_atomic;
use kokobrain_lib::vault::watcher::{
	replace_watcher, start_watcher_inner, stop_watcher, VaultWatcherState,
};
use std::fs;
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::Duration;
use tempfile::{tempdir, TempDir};

/// Wait helper — receives at least one emit within `timeout`. Returns
/// `None` on timeout (treat as a failure path; never silently swallow).
fn recv_emit(rx: &mpsc::Receiver<Vec<String>>, timeout: Duration) -> Option<Vec<String>> {
	rx.recv_timeout(timeout).ok()
}

/// Returns the canonical (symlink-resolved) path of `tmp.path()` as a
/// String. macOS's `/var/folders/...` is a symlink into
/// `/private/var/folders/...`; the `notify` crate reports the resolved
/// form. Without this, every test would fail with phantom path
/// mismatches.
fn canon(path: &std::path::Path) -> String {
	path.canonicalize()
		.unwrap_or_else(|_| path.to_path_buf())
		.to_string_lossy()
		.to_string()
}

fn vault_path(tmp: &TempDir) -> String {
	canon(tmp.path())
}

fn child_path(tmp: &TempDir, name: &str) -> String {
	canon(&tmp.path().join(name))
}

fn nested_path(tmp: &TempDir, parts: &[&str]) -> String {
	let mut p: PathBuf = tmp.path().to_path_buf();
	for part in parts {
		p.push(part);
	}
	canon(&p)
}

#[test]
fn watcher_emits_on_file_creation() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);
	let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

	let _watcher = start_watcher_inner(&vault, move |paths| {
		let _ = emit_tx.send(paths);
	})
	.expect("start watcher");

	// Give the watcher a moment to settle into the recursive mode.
	std::thread::sleep(Duration::from_millis(100));

	let new_file = tmp.path().join("note.md");
	fs::write(&new_file, "hello").expect("write");

	let emitted = recv_emit(&emit_rx, Duration::from_secs(3))
		.expect("watcher should emit after file creation");

	let expected = child_path(&tmp, "note.md");
	assert!(
		emitted.iter().any(|p| p == &expected),
		"emitted={:?}, expected to contain {}",
		emitted,
		expected
	);
}

#[test]
fn watcher_filters_hidden_dir() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);
	let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

	// Pre-create the hidden dir so notify can see it.
	let hidden_dir = tmp.path().join(".kokobrain");
	fs::create_dir(&hidden_dir).expect("create .kokobrain");

	let _watcher = start_watcher_inner(&vault, move |paths| {
		let _ = emit_tx.send(paths);
	})
	.expect("start watcher");
	std::thread::sleep(Duration::from_millis(100));

	// Touch a file inside the hidden dir AND a normal file. The hidden
	// one should be filtered, the normal one should reach the consumer.
	fs::write(hidden_dir.join("internal.json"), "{}").expect("write hidden");
	fs::write(tmp.path().join("real.md"), "body").expect("write real");

	let emitted = recv_emit(&emit_rx, Duration::from_secs(3))
		.expect("watcher should emit after creating real.md");

	let real = child_path(&tmp, "real.md");
	let hidden = nested_path(&tmp, &[".kokobrain", "internal.json"]);
	assert!(emitted.iter().any(|p| p == &real), "real.md missing in {:?}", emitted);
	assert!(
		!emitted.iter().any(|p| p == &hidden),
		"hidden file leaked into emit: {:?}",
		emitted
	);
}

#[test]
fn watcher_debounces_burst_into_single_emit() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);
	let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

	let _watcher = start_watcher_inner(&vault, move |paths| {
		let _ = emit_tx.send(paths);
	})
	.expect("start watcher");
	std::thread::sleep(Duration::from_millis(100));

	// Burst of writes, all within the debounce window.
	for i in 0..5 {
		fs::write(tmp.path().join(format!("note{}.md", i)), "x").expect("write");
		std::thread::sleep(Duration::from_millis(20));
	}

	// First emit gathers the whole burst.
	let first = recv_emit(&emit_rx, Duration::from_secs(3)).expect("first emit");
	assert!(
		first.len() >= 5,
		"first emit should contain all 5 files, got {:?}",
		first
	);

	// No second emit should arrive within ~700ms (no further writes).
	assert!(
		emit_rx.recv_timeout(Duration::from_millis(700)).is_err(),
		"unexpected second emit after quiet period"
	);
}

#[test]
fn watcher_stops_when_handle_dropped() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);
	let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();

	{
		let _watcher = start_watcher_inner(&vault, move |paths| {
			let _ = emit_tx.send(paths);
		})
		.expect("start watcher");
		std::thread::sleep(Duration::from_millis(100));
	} // _watcher drops here; bridge thread should exit.

	// Wait at least one debounce window (500 ms) for the bridge thread to
	// notice the channel disconnect, perform its final flush, and exit.
	// On macOS CI, FSEvents may surface a stray event during the warm-up
	// window (e.g. attributes propagating from tempdir creation); the
	// final flush would then legitimately emit it. That emit is unrelated
	// to the post-drop write being asserted below, so drain everything
	// pending before exercising the real assertion.
	std::thread::sleep(Duration::from_millis(700));
	while emit_rx.try_recv().is_ok() {}

	// New file should NOT trigger an emit (watcher dropped).
	fs::write(tmp.path().join("after.md"), "x").expect("write");
	assert!(
		emit_rx.recv_timeout(Duration::from_secs(1)).is_err(),
		"watcher should not emit after drop"
	);
}

// --- watcher replacement semantics -------------------------------------------
//
// `replace_watcher` stops the old watcher inside the state lock and joins
// its bridge thread BEFORE building the new one (Audit Tier 2 #7), so an
// old vault's final flush cannot land after it returns. The first tests
// drive `replace_watcher` / `stop_watcher` through a real
// `VaultWatcherState`; the later ones cover the same drop-old-then-start-new
// sequence at the `start_watcher_inner` boundary.

/// Collects every emit that arrives within `window`.
fn collect_emits(rx: &mpsc::Receiver<Vec<String>>, window: Duration) -> Vec<String> {
	let deadline = std::time::Instant::now() + window;
	let mut all = Vec::new();
	while let Some(left) = deadline.checked_duration_since(std::time::Instant::now()) {
		match rx.recv_timeout(left) {
			Ok(paths) => all.extend(paths),
			Err(_) => break,
		}
	}
	all
}

#[test]
fn replace_watcher_joins_old_bridge_before_returning() {
	let old_tmp = tempdir().expect("old vault tmpdir");
	let new_tmp = tempdir().expect("new vault tmpdir");
	let old_vault = vault_path(&old_tmp);
	let new_vault = vault_path(&new_tmp);
	let state = VaultWatcherState::default();

	// The same callback body for both watchers, as the app's emit closure
	// is. It is slow on purpose: an old flush that is not joined would
	// still be inside it when `replace_watcher` returns.
	let (tx, rx) = mpsc::channel::<Vec<String>>();
	let old_tx = tx.clone();
	replace_watcher(&state, &old_vault, move |paths| {
		std::thread::sleep(Duration::from_millis(300));
		let _ = old_tx.send(paths);
	})
	.expect("start old watcher");
	std::thread::sleep(Duration::from_millis(100));

	// Leave an old-vault change buffered inside the debounce window, so the
	// old bridge thread has a final flush pending when it is replaced.
	fs::write(old_tmp.path().join("pending.md"), "x").expect("write old");
	std::thread::sleep(Duration::from_millis(100));

	replace_watcher(&state, &new_vault, move |paths| {
		std::thread::sleep(Duration::from_millis(300));
		let _ = tx.send(paths);
	})
	.expect("replace with new watcher");
	// Anything already in the channel was emitted before the call returned.
	while rx.try_recv().is_ok() {}

	std::thread::sleep(Duration::from_millis(100));
	fs::write(new_tmp.path().join("after-replace.md"), "x").expect("write new");

	let after = collect_emits(&rx, Duration::from_millis(1500));
	let old_prefix = format!("{}/", old_vault);
	assert!(
		!after.iter().any(|p| p.starts_with(&old_prefix)),
		"old-vault path reached the callback after replace_watcher returned: {:?}",
		after
	);
	let expected = child_path(&new_tmp, "after-replace.md");
	assert!(
		after.iter().any(|p| p == &expected),
		"new watcher missed the write: {:?}",
		after
	);
}

#[test]
fn stop_watcher_on_empty_state_is_ok() {
	let state = VaultWatcherState::default();
	assert_eq!(stop_watcher(&state), Ok(()));
	assert!(state.lock().unwrap().is_none());
}

#[test]
fn stop_watcher_joins_bridge_before_returning() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);
	let state = VaultWatcherState::default();
	let (tx, rx) = mpsc::channel::<Vec<String>>();
	replace_watcher(&state, &vault, move |paths| {
		let _ = tx.send(paths);
	})
	.expect("start watcher");
	std::thread::sleep(Duration::from_millis(100));

	fs::write(tmp.path().join("pending.md"), "x").expect("write");
	std::thread::sleep(Duration::from_millis(100));

	stop_watcher(&state).expect("stop watcher");
	assert!(state.lock().unwrap().is_none(), "state must be empty after stop");
	while rx.try_recv().is_ok() {}

	fs::write(tmp.path().join("after-stop.md"), "x").expect("write after stop");
	assert!(
		rx.recv_timeout(Duration::from_millis(1500)).is_err(),
		"no emit may reach the callback after stop_watcher returned"
	);
}

#[test]
fn replacing_watcher_old_goes_silent_new_emits() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);

	let (old_tx, old_rx) = mpsc::channel::<Vec<String>>();
	let old_watcher = start_watcher_inner(&vault, move |paths| {
		let _ = old_tx.send(paths);
	})
	.expect("start old watcher");
	std::thread::sleep(Duration::from_millis(100));

	// Mirror the command's replace sequence: drop old FIRST, then start new.
	drop(old_watcher);
	// Wait out the old bridge thread's final flush, then drain any stray
	// warm-up events so the silence assertion below is about the new write.
	std::thread::sleep(Duration::from_millis(700));
	while old_rx.try_recv().is_ok() {}

	let (new_tx, new_rx) = mpsc::channel::<Vec<String>>();
	let _new_watcher = start_watcher_inner(&vault, move |paths| {
		let _ = new_tx.send(paths);
	})
	.expect("start new watcher");
	std::thread::sleep(Duration::from_millis(100));

	fs::write(tmp.path().join("after-replace.md"), "x").expect("write");

	let emitted = recv_emit(&new_rx, Duration::from_secs(3))
		.expect("new watcher should emit after replacement");
	let expected = child_path(&tmp, "after-replace.md");
	assert!(
		emitted.iter().any(|p| p == &expected),
		"new watcher missed the write: {:?}",
		emitted
	);
	assert!(
		old_rx.try_recv().is_err(),
		"old watcher must stay silent after being dropped"
	);
}

#[test]
fn rapid_start_stop_cycles_leave_only_final_watcher_emitting() {
	// Approximates the start/stop race the command's Mutex serializes:
	// several short-lived watchers come and go, then a final one is
	// installed. Only the final watcher may observe the final write.
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);

	let (dead_tx, dead_rx) = mpsc::channel::<Vec<String>>();
	for _ in 0..3 {
		let tx = dead_tx.clone();
		let watcher = start_watcher_inner(&vault, move |paths| {
			let _ = tx.send(paths);
		})
		.expect("start short-lived watcher");
		// Drop immediately — equivalent to start closely followed by stop.
		drop(watcher);
	}

	let (final_tx, final_rx) = mpsc::channel::<Vec<String>>();
	let _final_watcher = start_watcher_inner(&vault, move |paths| {
		let _ = final_tx.send(paths);
	})
	.expect("start final watcher");
	std::thread::sleep(Duration::from_millis(150));

	// Drain anything the short-lived watchers flushed during warm-up.
	while dead_rx.try_recv().is_ok() {}

	fs::write(tmp.path().join("final.md"), "x").expect("write");

	let emitted = recv_emit(&final_rx, Duration::from_secs(3))
		.expect("final watcher should emit");
	let expected = child_path(&tmp, "final.md");
	assert!(
		emitted.iter().any(|p| p == &expected),
		"final watcher missed the write: {:?}",
		emitted
	);
	assert!(
		dead_rx.recv_timeout(Duration::from_millis(300)).is_err(),
		"dropped watchers must not emit the post-replacement write"
	);
}

#[test]
fn watcher_emits_after_modification() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);
	let initial = tmp.path().join("note.md");
	fs::write(&initial, "v1").expect("write v1");

	let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();
	let _watcher = start_watcher_inner(&vault, move |paths| {
		let _ = emit_tx.send(paths);
	})
	.expect("start watcher");
	std::thread::sleep(Duration::from_millis(150));

	fs::write(&initial, "v2").expect("write v2");

	let emitted = recv_emit(&emit_rx, Duration::from_secs(3))
		.expect("watcher should emit after modify");
	let expected = child_path(&tmp, "note.md");
	assert!(
		emitted.iter().any(|p| p == &expected),
		"modified path missing in {:?}",
		emitted
	);
}

#[test]
fn watcher_drops_write_atomic_temp_path() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);
	let dir = tmp.path().join("dir");
	fs::create_dir(&dir).expect("create dir");

	let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();
	let _watcher = start_watcher_inner(&vault, move |paths| {
		let _ = emit_tx.send(paths);
	})
	.expect("start watcher");
	std::thread::sleep(Duration::from_millis(150));

	let target = dir.join("note.md");
	write_atomic(&target.to_string_lossy(), "body").expect("write_atomic");

	// The temp file's create and rename events can land in one burst or
	// two, so collect every emit across a few debounce windows.
	let emitted = collect_emits(&emit_rx, Duration::from_secs(2));
	let expected = nested_path(&tmp, &["dir", "note.md"]);
	assert!(
		emitted.iter().any(|p| p == &expected),
		"dir/note.md missing in {:?}",
		emitted
	);
	assert!(
		!emitted.iter().any(|p| p.contains(".tmp-")),
		"write_atomic temp path leaked into emit: {:?}",
		emitted
	);
}

/// A mod's data files reach no frontend listener: not the first write, which
/// creates the folders, not a rewrite, not the rename that keeps a corrupt
/// file. The canary proves the watcher was live for the whole window.
#[test]
fn watcher_ignores_mod_data_under_kokobrain() {
	let tmp = tempdir().expect("tmpdir");
	let vault = vault_path(&tmp);
	fs::create_dir(tmp.path().join(".kokobrain")).expect("create .kokobrain");

	let (emit_tx, emit_rx) = mpsc::channel::<Vec<String>>();
	let _watcher = start_watcher_inner(&vault, move |paths| {
		let _ = emit_tx.send(paths);
	})
	.expect("start watcher");
	std::thread::sleep(Duration::from_millis(150));

	let write = |content: &str| write_mod_data(vault.clone(), "habits".to_string(), content.to_string());
	write("{}").expect("first write");
	write("{\"a\":1}").expect("rewrite");
	let dir = tmp.path().join(".kokobrain/mods/habits");
	fs::rename(dir.join("data.json"), dir.join("data.corrupt-1.json")).expect("rename");

	let silent = collect_emits(&emit_rx, Duration::from_secs(2));
	assert_eq!(silent, Vec::<String>::new(), "mod data leaked into emit");

	fs::write(tmp.path().join("canary.md"), "live").expect("canary");
	let emitted = collect_emits(&emit_rx, Duration::from_secs(2));
	assert_eq!(emitted, vec![child_path(&tmp, "canary.md")]);
}
