use crate::db;
use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;

/// Opens the database for a vault. Called during vault initialization.
#[tauri::command]
pub fn open_vault_db(vault_path: String) -> Result<(), String> {
	debug_log("DB", format!("Opening database for vault: {}", vault_path));
	let root = vault_fs::validate_vault_path(&vault_path)?;
	db::open_database(&root)
}

/// Closes the database. Called during vault teardown.
#[tauri::command]
pub fn close_vault_db() -> Result<(), String> {
	debug_log("DB", "Closing database");
	db::close_database()
}
