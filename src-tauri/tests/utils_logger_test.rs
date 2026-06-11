//! Functional tests for `utils::logger::debug_log`'s stderr output.
//!
//! `debug_log` has two sinks: stderr (always, when enabled) and a
//! `tauri-debug-log` event emitted through the global `APP_HANDLE`.
//!
//! EXCLUSION: the event-emission path is NOT tested here. `init_logger`
//! takes a concrete `&tauri::AppHandle` (i.e. `AppHandle<Wry>`), which
//! cannot be constructed in a test process — the tauri `test` feature
//! (MockRuntime) is not enabled in Cargo.toml, and even with it the
//! signature is Wry-bound. Testing that boundary would require a source
//! change (generic runtime), which is out of scope for a test-only batch.
//!
//! The stderr path IS verified functionally via a self-exec pattern: the
//! parent test re-runs this same test binary filtered to a child test
//! (gated behind an env var so it is a no-op in normal runs), passes
//! `--nocapture` so libtest does not swallow the output, and asserts on
//! the child process's captured stderr.

use std::process::Command;

/// Child half of the self-exec pair: emits one enabled debug_log line.
/// No-op unless spawned by the parent test below (env var gate), so a
/// plain `cargo test` run passes through it silently.
#[test]
fn selftest_child_emits_when_enabled() {
	if std::env::var("KOKO_LOGGER_SELFTEST").as_deref() != Ok("emit") {
		return;
	}
	kokobrain_lib::utils::logger::set_debug_mode(true);
	kokobrain_lib::utils::logger::debug_log("LOGGER-SELFTEST", "hello-from-child");
}

/// Child half: debug mode disabled — debug_log must be a no-op.
#[test]
fn selftest_child_silent_when_disabled() {
	if std::env::var("KOKO_LOGGER_SELFTEST").as_deref() != Ok("silent") {
		return;
	}
	kokobrain_lib::utils::logger::set_debug_mode(false);
	kokobrain_lib::utils::logger::debug_log("LOGGER-SELFTEST-OFF", "must-not-appear");
}

/// Runs this test binary filtered to a single child test, with output
/// uncaptured, and returns the child's stderr.
fn run_child(test_name: &str, mode: &str) -> String {
	let exe = std::env::current_exe().expect("current test binary path");
	let output = Command::new(exe)
		.args([test_name, "--exact", "--nocapture"])
		.env("KOKO_LOGGER_SELFTEST", mode)
		.output()
		.expect("spawn child test process");
	assert!(
		output.status.success(),
		"child test process failed: stdout={} stderr={}",
		String::from_utf8_lossy(&output.stdout),
		String::from_utf8_lossy(&output.stderr)
	);
	String::from_utf8_lossy(&output.stderr).to_string()
}

#[test]
fn debug_log_enabled_writes_timestamped_tag_and_message_to_stderr() {
	let stderr = run_child("selftest_child_emits_when_enabled", "emit");

	assert!(
		stderr.contains("[LOGGER-SELFTEST] hello-from-child"),
		"stderr must carry the tag and message: got {stderr:?}"
	);
	// Full line shape: [HH:MM:SS.mmm] [TAG] message
	let line_re =
		regex::Regex::new(r"\[\d{2}:\d{2}:\d{2}\.\d{3}\] \[LOGGER-SELFTEST\] hello-from-child")
			.unwrap();
	assert!(
		line_re.is_match(&stderr),
		"stderr line must be prefixed with a [HH:MM:SS.mmm] timestamp: got {stderr:?}"
	);
}

#[test]
fn debug_log_disabled_writes_nothing_to_stderr() {
	let stderr = run_child("selftest_child_silent_when_disabled", "silent");

	assert!(
		!stderr.contains("LOGGER-SELFTEST-OFF"),
		"disabled debug_log must not reach stderr: got {stderr:?}"
	);
}
