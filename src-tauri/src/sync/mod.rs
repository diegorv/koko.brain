//! LAN sync MVP — discovery, pairing (TOFU), one-shot folder push.
//!
//! This module is the single mount point for the feature. The host file
//! `lib.rs` calls `sync::init()` once; everything else (commands, types,
//! transport, push) is added inside this module + `commands/sync.rs`.
//! Per-stage growth never touches host files outside the plugin.

pub mod identity;
pub mod wordlist;

use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

/// Build the LAN sync Tauri plugin.
///
/// Stage 0 registers no commands and no setup work; the seam exists only so
/// future stages can attach commands, state, and listeners without editing
/// `lib.rs` again.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
	Builder::new("kokobrain-sync")
		.setup(|_app, _api| Ok(()))
		.build()
}
