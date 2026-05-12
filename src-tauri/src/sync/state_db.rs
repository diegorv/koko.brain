//! Per-share SQLite state for LAN sync.
//!
//! Stored at `<vault>/.kokobrain/lan-sync/state.sqlite`. Holds three
//! tables:
//!
//! - `share_state`: one row per share with the current Lamport clock,
//!   `manifest_version` (bumped every time the local view of files
//!   changes), and `last_seen_peer_addr` (cache for reconnect).
//! - `file_state`: per-file metadata used for diff/LWW (`mtime_ms`,
//!   `lamport`, `sha256_hash`, `origin_fingerprint`, `kind`).
//! - `tombstones`: deletions, kept until both peers have observed them
//!   so a re-created file with the same name is not silently revived.
//!
//! All public functions take a borrowed [`rusqlite::Connection`] —
//! callers (sync engine, Tauri commands) own connection lifetime so
//! they can wrap multiple statements in a single transaction.

use crate::sync::protocol::EntryKind;
use rusqlite::{params, Connection};
use std::path::{Path, PathBuf};

pub const STATE_DB_FILE: &str = "state.sqlite";

/// Current schema version. Mismatched schemas trigger
/// [`StateDbError::SchemaVersionMismatch`]. Migrations are intentionally
/// manual until [`tasks/todo/lan-sync-followups.md`] adds a framework.
pub const CURRENT_SCHEMA_VERSION: u32 = 1;

/// Errors surfaced by the state DB layer.
#[derive(Debug)]
pub enum StateDbError {
	Sqlite(rusqlite::Error),
	SchemaVersionMismatch { found: u32, supported: u32 },
}

impl core::fmt::Display for StateDbError {
	fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
		match self {
			Self::Sqlite(e) => write!(f, "state.sqlite: {e}"),
			Self::SchemaVersionMismatch { found, supported } => write!(
				f,
				"unsupported state.sqlite schema {found} (supported: {supported})"
			),
		}
	}
}

impl std::error::Error for StateDbError {}

impl From<rusqlite::Error> for StateDbError {
	fn from(e: rusqlite::Error) -> Self {
		StateDbError::Sqlite(e)
	}
}

/// Per-share row in `share_state`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ShareStateRow {
	pub share_id: String,
	pub lamport: u64,
	pub manifest_version: u64,
	pub last_seen_peer_addr: Option<String>,
}

/// Per-file row in `file_state`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FileStateRow {
	pub share_id: String,
	pub path_rel: String,
	pub kind: EntryKind,
	pub mtime_ms: i64,
	pub lamport: u64,
	pub sha256_hash: String,
	pub size: i64,
	pub origin_fingerprint: String,
}

/// One tombstone row.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TombstoneRow {
	pub share_id: String,
	pub path_rel: String,
	pub deleted_at_mtime_ms: i64,
	pub deleted_at_lamport: u64,
	pub origin_fingerprint: String,
}

/// Returns the on-disk path of `state.sqlite` for the given vault root.
pub fn state_db_path(vault_root: &Path) -> PathBuf {
	vault_root.join(".kokobrain").join("lan-sync").join(STATE_DB_FILE)
}

/// Opens the state DB at `state_db_path(vault_root)`, creating the
/// parent directory + the schema on first use. Returns a fresh
/// connection; callers own it and can wrap transactions as needed.
pub fn open_state_db(vault_root: &Path) -> Result<Connection, StateDbError> {
	let path = state_db_path(vault_root);
	if let Some(parent) = path.parent() {
		std::fs::create_dir_all(parent).map_err(|e| {
			StateDbError::Sqlite(rusqlite::Error::ToSqlConversionFailure(Box::new(
				std::io::Error::other(e),
			)))
		})?;
	}
	let conn = Connection::open(&path)?;
	init_schema(&conn)?;
	Ok(conn)
}

/// Convenience: in-memory DB (used by tests, plus the future "scratch"
/// mode for ephemeral previews).
pub fn open_in_memory() -> Result<Connection, StateDbError> {
	let conn = Connection::open_in_memory()?;
	init_schema(&conn)?;
	Ok(conn)
}

/// Idempotent schema bootstrap. Safe to call on every open.
pub fn init_schema(conn: &Connection) -> Result<(), StateDbError> {
	conn.execute_batch(
		"
		CREATE TABLE IF NOT EXISTS schema_meta (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);

		CREATE TABLE IF NOT EXISTS share_state (
			share_id TEXT PRIMARY KEY,
			lamport INTEGER NOT NULL DEFAULT 0,
			manifest_version INTEGER NOT NULL DEFAULT 0,
			last_seen_peer_addr TEXT
		);

		CREATE TABLE IF NOT EXISTS file_state (
			share_id TEXT NOT NULL,
			path_rel TEXT NOT NULL,
			kind TEXT NOT NULL CHECK(kind IN ('file','directory')),
			mtime_ms INTEGER NOT NULL,
			lamport INTEGER NOT NULL,
			sha256_hash TEXT NOT NULL,
			size INTEGER NOT NULL,
			origin_fingerprint TEXT NOT NULL,
			PRIMARY KEY(share_id, path_rel)
		);

		CREATE TABLE IF NOT EXISTS tombstones (
			share_id TEXT NOT NULL,
			path_rel TEXT NOT NULL,
			deleted_at_mtime_ms INTEGER NOT NULL,
			deleted_at_lamport INTEGER NOT NULL,
			origin_fingerprint TEXT NOT NULL,
			PRIMARY KEY(share_id, path_rel)
		);
		",
	)?;
	// Initialise schema version on first run.
	conn.execute(
		"INSERT OR IGNORE INTO schema_meta(key, value) VALUES ('version', ?1)",
		params![CURRENT_SCHEMA_VERSION.to_string()],
	)?;
	let stored: String = conn
		.query_row(
			"SELECT value FROM schema_meta WHERE key = 'version'",
			[],
			|row| row.get::<_, String>(0),
		)
		.unwrap_or_else(|_| CURRENT_SCHEMA_VERSION.to_string());
	let found: u32 = stored.parse().unwrap_or(0);
	if found != CURRENT_SCHEMA_VERSION {
		return Err(StateDbError::SchemaVersionMismatch {
			found,
			supported: CURRENT_SCHEMA_VERSION,
		});
	}
	Ok(())
}

// ============================================================================
// share_state CRUD
// ============================================================================

/// Reads the share row, returning a default zeroed row when missing.
pub fn read_share_state(
	conn: &Connection,
	share_id: &str,
) -> Result<ShareStateRow, StateDbError> {
	let row = conn.query_row(
		"SELECT lamport, manifest_version, last_seen_peer_addr FROM share_state WHERE share_id = ?1",
		params![share_id],
		|r| Ok(ShareStateRow {
			share_id: share_id.to_string(),
			lamport: r.get::<_, i64>(0)? as u64,
			manifest_version: r.get::<_, i64>(1)? as u64,
			last_seen_peer_addr: r.get(2)?,
		}),
	);
	match row {
		Ok(r) => Ok(r),
		Err(rusqlite::Error::QueryReturnedNoRows) => Ok(ShareStateRow {
			share_id: share_id.to_string(),
			lamport: 0,
			manifest_version: 0,
			last_seen_peer_addr: None,
		}),
		Err(e) => Err(e.into()),
	}
}

/// Bumps the share's Lamport clock by 1 and returns the new value.
pub fn bump_lamport(conn: &Connection, share_id: &str) -> Result<u64, StateDbError> {
	let current = read_share_state(conn, share_id)?;
	let next = current.lamport.saturating_add(1);
	conn.execute(
		"INSERT INTO share_state(share_id, lamport, manifest_version, last_seen_peer_addr)
		 VALUES (?1, ?2, ?3, ?4)
		 ON CONFLICT(share_id) DO UPDATE SET lamport = excluded.lamport",
		params![
			share_id,
			next as i64,
			current.manifest_version as i64,
			current.last_seen_peer_addr,
		],
	)?;
	Ok(next)
}

/// Returns `max(local, observed) + 1` and persists it. Use on every
/// inbound apply to keep Lamport clocks monotonic across peers.
pub fn merge_remote_lamport(
	conn: &Connection,
	share_id: &str,
	remote_lamport: u64,
) -> Result<u64, StateDbError> {
	let current = read_share_state(conn, share_id)?;
	let next = current.lamport.max(remote_lamport).saturating_add(1);
	conn.execute(
		"INSERT INTO share_state(share_id, lamport, manifest_version, last_seen_peer_addr)
		 VALUES (?1, ?2, ?3, ?4)
		 ON CONFLICT(share_id) DO UPDATE SET lamport = excluded.lamport",
		params![
			share_id,
			next as i64,
			current.manifest_version as i64,
			current.last_seen_peer_addr,
		],
	)?;
	Ok(next)
}

/// Bumps `manifest_version` on every local file_state change. Used by
/// the anti-entropy `Subscribe { since_version }` flow.
pub fn bump_manifest_version(conn: &Connection, share_id: &str) -> Result<u64, StateDbError> {
	let current = read_share_state(conn, share_id)?;
	let next = current.manifest_version.saturating_add(1);
	conn.execute(
		"INSERT INTO share_state(share_id, lamport, manifest_version, last_seen_peer_addr)
		 VALUES (?1, ?2, ?3, ?4)
		 ON CONFLICT(share_id) DO UPDATE SET manifest_version = excluded.manifest_version",
		params![
			share_id,
			current.lamport as i64,
			next as i64,
			current.last_seen_peer_addr,
		],
	)?;
	Ok(next)
}

/// Updates the cached last-seen address for reconnect attempts.
pub fn set_last_seen_peer_addr(
	conn: &Connection,
	share_id: &str,
	addr: Option<&str>,
) -> Result<(), StateDbError> {
	let current = read_share_state(conn, share_id)?;
	conn.execute(
		"INSERT INTO share_state(share_id, lamport, manifest_version, last_seen_peer_addr)
		 VALUES (?1, ?2, ?3, ?4)
		 ON CONFLICT(share_id) DO UPDATE SET last_seen_peer_addr = excluded.last_seen_peer_addr",
		params![
			share_id,
			current.lamport as i64,
			current.manifest_version as i64,
			addr,
		],
	)?;
	Ok(())
}

// ============================================================================
// file_state CRUD
// ============================================================================

/// Inserts or replaces the file_state row for a (share, path).
pub fn upsert_file_state(
	conn: &Connection,
	row: &FileStateRow,
) -> Result<(), StateDbError> {
	let kind = match row.kind {
		EntryKind::File => "file",
		EntryKind::Directory => "directory",
	};
	conn.execute(
		"INSERT INTO file_state(share_id, path_rel, kind, mtime_ms, lamport, sha256_hash, size, origin_fingerprint)
		 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
		 ON CONFLICT(share_id, path_rel) DO UPDATE SET
			kind = excluded.kind,
			mtime_ms = excluded.mtime_ms,
			lamport = excluded.lamport,
			sha256_hash = excluded.sha256_hash,
			size = excluded.size,
			origin_fingerprint = excluded.origin_fingerprint",
		params![
			row.share_id,
			row.path_rel,
			kind,
			row.mtime_ms,
			row.lamport as i64,
			row.sha256_hash,
			row.size,
			row.origin_fingerprint,
		],
	)?;
	Ok(())
}

/// Returns the file_state row for `(share_id, path_rel)`, or `None`.
pub fn get_file_state(
	conn: &Connection,
	share_id: &str,
	path_rel: &str,
) -> Result<Option<FileStateRow>, StateDbError> {
	let row = conn.query_row(
		"SELECT kind, mtime_ms, lamport, sha256_hash, size, origin_fingerprint FROM file_state WHERE share_id = ?1 AND path_rel = ?2",
		params![share_id, path_rel],
		|r| {
			let kind_str: String = r.get(0)?;
			let kind = match kind_str.as_str() {
				"directory" => EntryKind::Directory,
				_ => EntryKind::File,
			};
			Ok(FileStateRow {
				share_id: share_id.to_string(),
				path_rel: path_rel.to_string(),
				kind,
				mtime_ms: r.get(1)?,
				lamport: r.get::<_, i64>(2)? as u64,
				sha256_hash: r.get(3)?,
				size: r.get(4)?,
				origin_fingerprint: r.get(5)?,
			})
		},
	);
	match row {
		Ok(r) => Ok(Some(r)),
		Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
		Err(e) => Err(e.into()),
	}
}

/// Lists every file_state row for a share. Used to build the manifest
/// the engine sends to peers in `AppMsg::Manifest`.
pub fn list_file_states(
	conn: &Connection,
	share_id: &str,
) -> Result<Vec<FileStateRow>, StateDbError> {
	let mut stmt = conn.prepare(
		"SELECT path_rel, kind, mtime_ms, lamport, sha256_hash, size, origin_fingerprint
		 FROM file_state WHERE share_id = ?1 ORDER BY path_rel ASC",
	)?;
	let rows = stmt.query_map(params![share_id], |r| {
		let kind_str: String = r.get(1)?;
		let kind = match kind_str.as_str() {
			"directory" => EntryKind::Directory,
			_ => EntryKind::File,
		};
		Ok(FileStateRow {
			share_id: share_id.to_string(),
			path_rel: r.get(0)?,
			kind,
			mtime_ms: r.get(2)?,
			lamport: r.get::<_, i64>(3)? as u64,
			sha256_hash: r.get(4)?,
			size: r.get(5)?,
			origin_fingerprint: r.get(6)?,
		})
	})?;
	let mut out = Vec::new();
	for r in rows {
		out.push(r?);
	}
	Ok(out)
}

/// Removes a file_state row. Returns `true` if a row was actually
/// deleted.
pub fn delete_file_state(
	conn: &Connection,
	share_id: &str,
	path_rel: &str,
) -> Result<bool, StateDbError> {
	let n = conn.execute(
		"DELETE FROM file_state WHERE share_id = ?1 AND path_rel = ?2",
		params![share_id, path_rel],
	)?;
	Ok(n > 0)
}

// ============================================================================
// tombstones CRUD
// ============================================================================

/// Inserts or replaces a tombstone.
pub fn upsert_tombstone(
	conn: &Connection,
	row: &TombstoneRow,
) -> Result<(), StateDbError> {
	conn.execute(
		"INSERT INTO tombstones(share_id, path_rel, deleted_at_mtime_ms, deleted_at_lamport, origin_fingerprint)
		 VALUES (?1, ?2, ?3, ?4, ?5)
		 ON CONFLICT(share_id, path_rel) DO UPDATE SET
			deleted_at_mtime_ms = excluded.deleted_at_mtime_ms,
			deleted_at_lamport = excluded.deleted_at_lamport,
			origin_fingerprint = excluded.origin_fingerprint",
		params![
			row.share_id,
			row.path_rel,
			row.deleted_at_mtime_ms,
			row.deleted_at_lamport as i64,
			row.origin_fingerprint,
		],
	)?;
	Ok(())
}

/// Returns the tombstone for `(share_id, path_rel)`, or `None`.
pub fn get_tombstone(
	conn: &Connection,
	share_id: &str,
	path_rel: &str,
) -> Result<Option<TombstoneRow>, StateDbError> {
	let row = conn.query_row(
		"SELECT deleted_at_mtime_ms, deleted_at_lamport, origin_fingerprint FROM tombstones WHERE share_id = ?1 AND path_rel = ?2",
		params![share_id, path_rel],
		|r| Ok(TombstoneRow {
			share_id: share_id.to_string(),
			path_rel: path_rel.to_string(),
			deleted_at_mtime_ms: r.get(0)?,
			deleted_at_lamport: r.get::<_, i64>(1)? as u64,
			origin_fingerprint: r.get(2)?,
		}),
	);
	match row {
		Ok(r) => Ok(Some(r)),
		Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
		Err(e) => Err(e.into()),
	}
}

/// Removes a tombstone (e.g. when a file is intentionally recreated
/// with the same name AND a newer lamport).
pub fn delete_tombstone(
	conn: &Connection,
	share_id: &str,
	path_rel: &str,
) -> Result<bool, StateDbError> {
	let n = conn.execute(
		"DELETE FROM tombstones WHERE share_id = ?1 AND path_rel = ?2",
		params![share_id, path_rel],
	)?;
	Ok(n > 0)
}
