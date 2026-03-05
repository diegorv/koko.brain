use rusqlite::{Connection, OptionalExtension};

/// Metadata for a single snapshot (without content, for listing).
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotInfo {
	pub id: i64,
	pub timestamp: u64,
	pub size: u64,
}

/// Returns the hash of the most recent snapshot for a given file, if any.
/// Returns `None` only when no rows match. Propagates real DB errors.
pub fn find_latest_hash(conn: &Connection, file_path: &str) -> Result<Option<String>, String> {
	conn.query_row(
		"SELECT hash FROM snapshots WHERE file_path = ?1 ORDER BY created_at DESC LIMIT 1",
		[file_path],
		|row| row.get(0),
	)
	.optional()
	.map_err(|e| format!("Failed to query latest hash: {e}"))
}

/// Inserts a new snapshot row.
pub fn insert_snapshot(
	conn: &Connection,
	file_path: &str,
	content: &str,
	hash: &str,
	size: i64,
	created_at: i64,
) -> Result<(), String> {
	conn.execute(
		"INSERT INTO snapshots (file_path, content, hash, size, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
		rusqlite::params![file_path, content, hash, size, created_at],
	)
	.map_err(|e| format!("Failed to save snapshot: {e}"))?;
	Ok(())
}

/// Lists all snapshots for a file, newest first.
pub fn list_snapshots(conn: &Connection, file_path: &str) -> Result<Vec<SnapshotInfo>, String> {
	let mut stmt = conn
		.prepare(
			"SELECT id, created_at, size FROM snapshots WHERE file_path = ?1 ORDER BY created_at DESC",
		)
		.map_err(|e| format!("Failed to prepare query: {e}"))?;

	let rows = stmt
		.query_map([file_path], |row| {
			Ok(SnapshotInfo {
				id: row.get(0)?,
				timestamp: row.get::<_, i64>(1)?.max(0) as u64,
				size: row.get::<_, i64>(2)?.max(0) as u64,
			})
		})
		.map_err(|e| format!("Failed to query history: {e}"))?;

	let mut results = Vec::new();
	for row in rows {
		results.push(row.map_err(|e| format!("Failed to read row: {e}"))?);
	}
	Ok(results)
}

/// Reads the full content of a specific snapshot by ID.
pub fn get_snapshot_by_id(conn: &Connection, snapshot_id: i64) -> Result<String, String> {
	conn.query_row(
		"SELECT content FROM snapshots WHERE id = ?1",
		[snapshot_id],
		|row| row.get(0),
	)
	.map_err(|e| format!("Snapshot not found: {e}"))
}

/// Deletes all snapshots older than `cutoff_ms` (milliseconds since epoch).
/// Returns the number of deleted rows.
pub fn delete_old_snapshots(conn: &Connection, cutoff_ms: i64) -> Result<u32, String> {
	conn.execute(
		"DELETE FROM snapshots WHERE created_at < ?1",
		[cutoff_ms],
	)
	.map(|n| n.min(u32::MAX as usize) as u32)
	.map_err(|e| format!("Failed to delete old snapshots: {e}"))
}

/// In the medium range (cutoff_daily..cutoff_recent), keeps only the latest
/// snapshot per day per file. Returns the number of deleted rows.
pub fn delete_medium_duplicates(
	conn: &Connection,
	cutoff_daily: i64,
	cutoff_recent: i64,
) -> Result<u32, String> {
	conn.execute(
		"DELETE FROM snapshots WHERE created_at >= ?1 AND created_at < ?2
		 AND id NOT IN (
			SELECT MAX(id) FROM snapshots
			WHERE created_at >= ?1 AND created_at < ?2
			GROUP BY file_path, (created_at / 86400000)
		 )",
		rusqlite::params![cutoff_daily, cutoff_recent],
	)
	.map(|n| n.min(u32::MAX as usize) as u32)
	.map_err(|e| format!("Failed to thin medium snapshots: {e}"))
}

