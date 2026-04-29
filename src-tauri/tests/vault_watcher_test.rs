//! Phase 9 — End-to-end watcher integration tests.
//!
//! Spins up a real `notify`-backed watcher on a tempdir, exercises the
//! debounce + filter pipeline, and asserts the emitted path lists.
//! Tests are slow-ish (each waits 500-800ms for the debounce) but
//! catch every wiring issue between `notify` and the bridge thread.

use kokobrain_lib::vault::watcher::start_watcher_inner;
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
