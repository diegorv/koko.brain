//! Generic `/api/invoke` dispatcher. One match arm per Tauri command —
//! the arm deserializes its args, calls the same `_core` function the
//! Tauri command calls, and serializes the result back to JSON. The
//! big match keeps the wiring discoverable: searching for a command
//! name finds both the Tauri registration in `lib.rs` and the HTTP arm
//! here.
//!
//! Conventions:
//!   - Each command has a `pub fn <name>_core(...) -> Result<T, String>`
//!     in its module (or an existing helper like `update_note_in_index_inner`
//!     that already takes plain types). The Tauri `#[tauri::command]`
//!     wrapper is a thin shim that destructures `State<'_, T>` /
//!     `AppHandle` and calls into `_core`.
//!   - Per-arg structs live next to the dispatcher arm (this file)
//!     unless they're useful elsewhere — keep them local to avoid
//!     leaking transport-specific types into command modules.
//!   - `args` is the raw `serde_json::Value` body. Deserialize into a
//!     local `#[derive(Deserialize)]` struct named after the command
//!     (`scan_vault_v2` -> `ScanVaultV2Args`). The Tauri IPC layer
//!     deserializes from positional / keyword args; we deserialize from
//!     a JSON object with the same camelCase field names the JS
//!     `invoke('cmd', { arg1, arg2 })` call already produces.

use serde::Deserialize;
use serde_json::Value;
use tauri::Manager;

use crate::http::{bad_req, internal, not_found, AppState, InvokeErr};
use axum::{http::StatusCode, Json};

/// Helper: bind args to a typed struct, returning the standard 400 on
/// bad shape. Generic so each arm can name its own arg struct.
fn parse_args<T: for<'de> Deserialize<'de>>(args: Value) -> Result<T, (StatusCode, Json<InvokeErr>)> {
	serde_json::from_value::<T>(args).map_err(|e| bad_req(format!("invalid args: {}", e)))
}

/// Helper: serialize a command's success value to JSON, mapping
/// serialization failures (should be impossible for our `Serialize`
/// types but stays defensive) to 500.
fn ok_value<T: serde::Serialize>(value: T) -> Result<Value, (StatusCode, Json<InvokeErr>)> {
	serde_json::to_value(value).map_err(|e| internal(format!("serialize result: {}", e)))
}

/// Helper: turn a `Result<T, String>` from a core fn into the dispatcher
/// return shape. Keeps every arm a one-liner.
fn from_core<T: serde::Serialize>(r: Result<T, String>) -> Result<Value, (StatusCode, Json<InvokeErr>)> {
	ok_value(r.map_err(internal)?)
}

// Suppress the unused warnings for helpers that aren't reached yet
// while the dispatcher is being filled in — each helper is consumed
// by the upcoming arms.
#[allow(dead_code)]
fn _silence_unused(state: &AppState) {
	let _ = state.app_handle.clone();
}

/// The big match. New commands plug in here; the function stays a flat
/// list so the diff for each command addition is one block.
pub async fn dispatch_command(
	state: &AppState,
	cmd: &str,
	args: Value,
) -> Result<Value, (StatusCode, Json<InvokeErr>)> {
	match cmd {
		// Dispatcher arms are filled in by the per-batch follow-up
		// commits. Any cmd not yet wired returns 404 so the frontend
		// surfaces a clear "this command is not exposed over HTTP yet"
		// error instead of silently hanging.
		_ => Err(not_found(cmd)),
	}
}

// Keep these silencers active until every arg type is wired. They prevent
// `unused_imports` warnings from breaking `-D warnings` in CI on the
// foundation commit.
#[allow(dead_code)]
fn _silence_imports() {
	let _ = parse_args::<()>(Value::Null);
	let _: Result<Value, _> = ok_value(0u32);
	let _: Result<Value, _> = from_core::<()>(Ok(()));
}
