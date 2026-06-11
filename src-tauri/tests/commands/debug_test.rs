//! Integration tests for the `commands::debug` module.
//!
//! `get_process_memory` is covered by the module's inline `#[cfg(test)]`
//! tests; here we cover the `set_tauri_debug_mode` command wrapper, which
//! had zero references. Asserts on the REAL logger state (the global
//! `DEBUG_ENABLED` flag read back via `logger::is_debug_enabled`), not on
//! the call having happened.

use kokobrain_lib::commands::debug::set_tauri_debug_mode;
use kokobrain_lib::utils::logger;
use std::sync::Mutex;

/// The logger flag is process-global; tests in this binary run in parallel
/// threads, so every test that toggles it must hold this lock (same pattern
/// as db_test.rs's TEST_LOCK).
static DEBUG_FLAG_LOCK: Mutex<()> = Mutex::new(());

#[test]
fn set_tauri_debug_mode_toggles_real_logger_state() {
	let _guard = DEBUG_FLAG_LOCK.lock().unwrap();

	// Enable -> logger reports enabled.
	set_tauri_debug_mode(true).unwrap();
	assert!(
		logger::is_debug_enabled(),
		"enabling via the command must flip the global logger flag on"
	);

	// Disable -> logger reports disabled.
	set_tauri_debug_mode(false).unwrap();
	assert!(
		!logger::is_debug_enabled(),
		"disabling via the command must flip the global logger flag off"
	);
}

#[test]
fn set_tauri_debug_mode_is_idempotent() {
	let _guard = DEBUG_FLAG_LOCK.lock().unwrap();

	set_tauri_debug_mode(false).unwrap();
	set_tauri_debug_mode(false).unwrap();
	assert!(!logger::is_debug_enabled(), "double-disable stays disabled");
}
