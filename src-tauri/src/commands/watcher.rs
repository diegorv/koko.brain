use crate::events::VAULT_FILES_CHANGED_EVENT;
use crate::utils::logger::debug_log;
use crate::vault::watcher::{
	replace_watcher, stop_watcher, VaultFilesChangedPayload, VaultWatcherState,
};
use tauri::Emitter;

/// Starts (or replaces) the vault watcher. Each debounced burst is emitted
/// to the frontend as `vault-files-changed`. Replacement semantics (old
/// watcher joined before the new one starts) live in `replace_watcher`.
#[tauri::command]
pub fn start_vault_watcher(
	app: tauri::AppHandle,
	state: tauri::State<'_, VaultWatcherState>,
	path: String,
) -> Result<(), String> {
	replace_watcher(&state, &path, move |paths: Vec<String>| {
		let payload = VaultFilesChangedPayload { paths };
		if let Err(e) = app.emit(VAULT_FILES_CHANGED_EVENT, &payload) {
			debug_log("WATCHER", format!("emit failed: {}", e));
		}
	})
}

/// Stops the vault watcher (if any). No-op when no watcher is running.
#[tauri::command]
pub fn stop_vault_watcher(state: tauri::State<'_, VaultWatcherState>) -> Result<(), String> {
	stop_watcher(&state)
}
