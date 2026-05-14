//! IPC commands for the MCP server boot-time flag.
//!
//! The actual on/off decision happens inside `tauri::Builder::setup()`
//! before any frontend code runs (see `crate::mcp::config` and the
//! gate in `lib.rs::run()`). These commands let the frontend keep the
//! global mirror file in sync with the per-vault `AppSettings.mcp`
//! field so the next launch reflects the user's most recent choice.
//!
//! The toggle does not stop a running MCP server — `mcp::start` has no
//! cancellation token (see `mcp/mod.rs:51-55`). The Settings UI tells
//! the user a restart is required.

use tauri::{AppHandle, Manager, Runtime};

use crate::mcp::config;

/// Persists the boot-time MCP flag to `<app_config_dir>/mcp.json`.
///
/// Errors are stringified so the frontend can `try { ... } catch` — same
/// convention as the other commands in this crate. A failure here leaves
/// the previous mirror value in place; the next boot will fall back to
/// `enabled = true` only if the file was never written (or got corrupted).
#[tauri::command]
pub async fn set_mcp_enabled<R: Runtime>(app: AppHandle<R>, enabled: bool) -> Result<(), String> {
	let dir = app
		.path()
		.app_config_dir()
		.map_err(|e| format!("Could not resolve app_config_dir: {e}"))?;
	config::write_mcp_enabled(&dir, enabled).map_err(|e| format!("Failed to write mcp.json: {e}"))
}

/// Reads the boot-time MCP flag from `<app_config_dir>/mcp.json`.
///
/// Mirrors the same permissive defaults `config::is_mcp_enabled` applies
/// at boot, so the frontend gets the exact value the next launch would
/// observe. Used by the Settings UI to initialize its view of the flag
/// when the per-vault `AppSettings.mcp` field has not yet been written.
#[tauri::command]
pub async fn get_mcp_enabled<R: Runtime>(app: AppHandle<R>) -> Result<bool, String> {
	let dir = app
		.path()
		.app_config_dir()
		.map_err(|e| format!("Could not resolve app_config_dir: {e}"))?;
	Ok(config::is_mcp_enabled(&dir))
}
