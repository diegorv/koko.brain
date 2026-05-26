pub mod fts_repo;
pub mod history_repo;
pub mod schema;
pub mod semantic_repo;

use crate::utils::logger::debug_log;
use rusqlite::Connection;
use std::path::Path;
use std::sync::Mutex;

/// Global database connection, initialized on vault open.
///
/// Used by history (snapshots) and semantic (chunks / semantic_meta) writers
/// and readers. FTS5 traffic goes through a separate connection (`FTS_DB`)
/// so a long-running rebuild does not block these other commands behind a
/// single Mutex.
static DB: Mutex<Option<Connection>> = Mutex::new(None);

/// Dedicated database connection for FTS5 traffic (rebuild, incremental
/// update, search, stats).
///
/// SQLite WAL mode allows one writer + many readers on the same database
/// file across connections. Splitting FTS off `DB` means a 3 s+ FTS rebuild
/// no longer serializes history / semantic / IPC commands behind the same
/// Mutex<Connection>. Both connections target the same `.kokobrain/kokobrain.db`
/// file, so schema and data stay consistent.
static FTS_DB: Mutex<Option<Connection>> = Mutex::new(None);

/// Opens (or creates) the SQLite database at `{vault_path}/.kokobrain/kokobrain.db`.
/// Enables WAL mode for concurrent reads + crash safety.
/// Creates all tables if they don't exist.
///
/// Also opens a second connection (`FTS_DB`) to the same file for FTS5
/// traffic so long-running index rebuilds do not block the rest of the
/// commands.
pub fn open_database(vault_path: &Path) -> Result<(), String> {
	let db_path = vault_path.join(".kokobrain").join("kokobrain.db");

	// Ensure .kokobrain/ directory exists
	if let Some(parent) = db_path.parent() {
		std::fs::create_dir_all(parent)
			.map_err(|e| format!("Failed to create .kokobrain dir: {e}"))?;
	}

	let conn =
		Connection::open(&db_path).map_err(|e| format!("Failed to open database: {e}"))?;

	// WAL mode: concurrent reads, crash-safe writes.
	conn.pragma_update(None, "journal_mode", "WAL")
		.map_err(|e| format!("Failed to set WAL mode: {e}"))?;

	// busy_timeout covers the rare case where both connections attempt to
	// acquire a write lock simultaneously (e.g. history INSERT while FTS
	// rebuild is committing). SQLite serializes writers per file; without a
	// timeout the second writer would fail immediately with SQLITE_BUSY.
	conn.pragma_update(None, "busy_timeout", 5000)
		.map_err(|e| format!("Failed to set busy_timeout: {e}"))?;

	schema::create_tables(&conn)?;

	debug_log("DB", format!("Database opened: {:?}, WAL mode enabled", db_path));
	{
		let mut db = DB.lock().map_err(|e| format!("Lock error: {e}"))?;
		*db = Some(conn);
	}

	// Second connection to the same file for FTS5 traffic. Schema is already
	// in place from the main connection above; this conn just attaches to it.
	let fts_conn = Connection::open(&db_path)
		.map_err(|e| format!("Failed to open FTS database connection: {e}"))?;
	fts_conn
		.pragma_update(None, "journal_mode", "WAL")
		.map_err(|e| format!("Failed to set WAL mode on FTS connection: {e}"))?;
	fts_conn
		.pragma_update(None, "busy_timeout", 5000)
		.map_err(|e| format!("Failed to set busy_timeout on FTS connection: {e}"))?;
	// NORMAL is safe in WAL mode: fsyncs only at checkpoint, not every
	// commit. Prevents incremental FTS updates from blocking on fsync.
	fts_conn
		.pragma_update(None, "synchronous", "NORMAL")
		.map_err(|e| format!("Failed to set synchronous on FTS connection: {e}"))?;
	{
		let mut fts_db = FTS_DB.lock().map_err(|e| format!("Lock error: {e}"))?;
		*fts_db = Some(fts_conn);
	}

	Ok(())
}

/// Closes both database connections and releases resources.
pub fn close_database() -> Result<(), String> {
	{
		let mut db = DB.lock().map_err(|e| format!("Lock error: {e}"))?;
		*db = None;
	}
	let mut fts_db = FTS_DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	*fts_db = None;
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
pub fn with_db_transaction<F, T>(label: &str, f: F) -> Result<T, String>
where
	F: FnOnce(&Connection) -> Result<T, String>,
{
	let db = DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	let conn = db.as_ref().ok_or("Database not open")?;
	debug_log("DB", format!("BEGIN — {label}"));
	conn.execute_batch("BEGIN")
		.map_err(|e| format!("Failed to begin transaction: {e}"))?;
	match f(conn) {
		Ok(result) => {
			conn.execute_batch("COMMIT")
				.map_err(|e| format!("Failed to commit transaction: {e}"))?;
			debug_log("DB", format!("COMMIT — {label}"));
			Ok(result)
		}
		Err(e) => {
			if let Err(rb_err) = conn.execute_batch("ROLLBACK") {
				debug_log("DB", format!("ROLLBACK failed ({label}): {rb_err}"));
			}
			debug_log("DB", format!("ROLLBACK — {label}: {e}"));
			Err(e)
		}
	}
}

/// Runs a closure with a reference to the open FTS database connection.
///
/// Use for any FTS5 traffic (rebuild, incremental update, search, stats).
/// Independent Mutex from `with_db` so a long-running FTS rebuild does not
/// queue history / semantic / general IPC commands behind it.
pub fn with_fts_db<F, T>(f: F) -> Result<T, String>
where
	F: FnOnce(&Connection) -> Result<T, String>,
{
	let db = FTS_DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	let conn = db.as_ref().ok_or("FTS database not open")?;
	f(conn)
}

/// FTS-connection counterpart of [`with_db_transaction`].
pub fn with_fts_db_transaction<F, T>(label: &str, f: F) -> Result<T, String>
where
	F: FnOnce(&Connection) -> Result<T, String>,
{
	let db = FTS_DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	let conn = db.as_ref().ok_or("FTS database not open")?;
	debug_log("DB", format!("BEGIN — {label}"));
	conn.execute_batch("BEGIN")
		.map_err(|e| format!("Failed to begin transaction: {e}"))?;
	match f(conn) {
		Ok(result) => {
			conn.execute_batch("COMMIT")
				.map_err(|e| format!("Failed to commit transaction: {e}"))?;
			debug_log("DB", format!("COMMIT — {label}"));
			Ok(result)
		}
		Err(e) => {
			if let Err(rb_err) = conn.execute_batch("ROLLBACK") {
				debug_log("DB", format!("ROLLBACK failed ({label}): {rb_err}"));
			}
			debug_log("DB", format!("ROLLBACK — {label}: {e}"));
			Err(e)
		}
	}
}

/// Runs a WAL checkpoint on the FTS connection. Call after large batch
/// writes (full index rebuild) to compact the WAL and prevent the next
/// small transaction from triggering an expensive auto-checkpoint.
pub fn checkpoint_fts_wal() -> Result<(), String> {
	let db = FTS_DB.lock().map_err(|e| format!("Lock error: {e}"))?;
	let conn = db.as_ref().ok_or("FTS database not open")?;
	conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE)")
		.map_err(|e| format!("WAL checkpoint failed: {e}"))?;
	debug_log("DB", "FTS WAL checkpoint (TRUNCATE) completed".to_string());
	Ok(())
}
