//! Tauri command handlers for the LAN sync plugin.
//!
//! Intentionally empty at Stage 0. Commands are added by subsequent stages
//! (Stage 5: discovery + trust queries; Stage 8: pairing + push) and wired
//! through `crate::sync::init` via `.invoke_handler(...)`.
