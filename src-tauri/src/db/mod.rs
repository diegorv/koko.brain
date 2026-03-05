pub mod fts_repo;
pub mod history_repo;
pub mod schema;
pub mod semantic_repo;

use crate::utils::logger::debug_log;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Global database connection, initialized on vault open.
static DB: Mutex<Option<Connection>> = Mutex::new(None);

/// Opens (or creates) the SQLite database at `{vault_path}/.kokobrain/kokobrain.db`.
/// Enables WAL mode for concurrent reads + crash safety.
/// Creates all tables if they don't exist.
pub fn open_database(vault_path: &Path) -> Result<(), String> {
	let db_path = vault_path.join(".kokobrain").join("kokobrain.db");

	// Ensure .kokobrain/ directory exists
	if let Some(parent) = db_path.parent() {
		std::fs::create_dir_all(parent)
			.map_err(|e| format!("Failed to create .kokobrain dir: {e}"))?;
	}

	let conn =
		Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))?;

	// WAL mode: concurrent reads, crash-safe writes
	conn.pragma_update(None, "journal_mode", "WAL")
		.map_err(|e| format!("Failed to set WAL mode: {e}"))?;

	schema::create_tables(&conn)?;

	debug_log("DB", format!("Database opened: {:?}, WAL mode enabled", db_path));
	let mut db = DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	*db = Some(conn);
	Ok(())
}

/// Closes the database connection and releases resources.
pub fn close_database() -> Result<(), String> {
	let mut db = DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	*db = None;
	Ok(())
}

/// Runs a closure with a reference to the open database connection.
/// Returns Err if the database is not open.
pub fn with_db<F, T>(f: F) -> Result<T, String>
where
	F: FnOnce(&Connection) -> Result<T, String>,
{
	let db = DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	let conn = db.as_ref().ok_or("Database not open")?;
	f(conn)
}

/// Runs a closure inside a SQL transaction (BEGIN/COMMIT/ROLLBACK).
/// Automatically rolls back on error.
pub fn with_db_transaction<F, T>(f: F) -> Result<T, String>
where
	F: FnOnce(&Connection) -> Result<T, String>,
{
	let db = DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	let conn = db.as_ref().ok_or("Database not open")?;
	debug_log("DB", "Transaction BEGIN");
	conn.execute_batch("BEGIN")
		.map_err(|e| format!("Failed to begin transaction: {e}"))?;
	match f(conn) {
		Ok(result) => {
			conn.execute_batch("COMMIT")
				.map_err(|e| format!("Failed to commit transaction: {e}"))?;
			debug_log("DB", "Transaction COMMIT");
			Ok(result)
		}
		Err(e) => {
			if let Err(rb_err) = conn.execute_batch("ROLLBACK") {
				debug_log("DB", format!("ROLLBACK failed: {rb_err}"));
			}
			debug_log("DB", format!("Transaction ROLLBACK: {e}"));
			Err(e)
		}
	}
}
