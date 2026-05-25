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

#[cfg(test)]
mod tests {
	use super::*;
	use crate::db::schema;
	use rusqlite::Connection;

	fn setup_db() -> Connection {
		let conn = Connection::open_in_memory().unwrap();
		schema::create_tables(&conn).unwrap();
		conn
	}

	#[test]
	fn find_latest_hash_returns_none_when_empty() {
		let conn = setup_db();
		let result = find_latest_hash(&conn, "test.md").unwrap();
		assert!(result.is_none());
	}

	#[test]
	fn find_latest_hash_returns_last_inserted() {
		let conn = setup_db();
		insert_snapshot(&conn, "test.md", "v1", "hash_a", 2, 1000).unwrap();
		insert_snapshot(&conn, "test.md", "v2", "hash_b", 2, 2000).unwrap();

		let result = find_latest_hash(&conn, "test.md").unwrap();
		assert_eq!(result, Some("hash_b".to_string()));
	}

	#[test]
	fn find_latest_hash_isolates_by_file() {
		let conn = setup_db();
		insert_snapshot(&conn, "a.md", "content", "hash_a", 7, 1000).unwrap();
		insert_snapshot(&conn, "b.md", "content", "hash_b", 7, 2000).unwrap();

		assert_eq!(
			find_latest_hash(&conn, "a.md").unwrap(),
			Some("hash_a".to_string())
		);
		assert_eq!(
			find_latest_hash(&conn, "b.md").unwrap(),
			Some("hash_b".to_string())
		);
	}

	#[test]
	fn insert_and_list_snapshots() {
		let conn = setup_db();
		insert_snapshot(&conn, "test.md", "content1", "h1", 8, 1000).unwrap();
		insert_snapshot(&conn, "test.md", "content2", "h2", 8, 2000).unwrap();

		let list = list_snapshots(&conn, "test.md").unwrap();
		assert_eq!(list.len(), 2);
		// Newest first
		assert_eq!(list[0].timestamp, 2000);
		assert_eq!(list[1].timestamp, 1000);
	}

	#[test]
	fn list_snapshots_empty_for_unknown_file() {
		let conn = setup_db();
		let list = list_snapshots(&conn, "nonexistent.md").unwrap();
		assert!(list.is_empty());
	}

	#[test]
	fn get_snapshot_by_id_returns_content() {
		let conn = setup_db();
		insert_snapshot(&conn, "test.md", "hello world", "h1", 11, 1000).unwrap();

		let list = list_snapshots(&conn, "test.md").unwrap();
		let content = get_snapshot_by_id(&conn, list[0].id).unwrap();
		assert_eq!(content, "hello world");
	}

	#[test]
	fn get_snapshot_by_id_error_for_invalid_id() {
		let conn = setup_db();
		let result = get_snapshot_by_id(&conn, 9999);
		assert!(result.is_err());
	}

	#[test]
	fn delete_old_snapshots_removes_before_cutoff() {
		let conn = setup_db();
		insert_snapshot(&conn, "test.md", "old", "h1", 3, 100).unwrap();
		insert_snapshot(&conn, "test.md", "new", "h2", 3, 2000).unwrap();

		let deleted = delete_old_snapshots(&conn, 1000).unwrap();
		assert_eq!(deleted, 1);

		let list = list_snapshots(&conn, "test.md").unwrap();
		assert_eq!(list.len(), 1);
		assert_eq!(list[0].timestamp, 2000);
	}

	#[test]
	fn delete_old_snapshots_returns_zero_when_nothing_to_delete() {
		let conn = setup_db();
		let deleted = delete_old_snapshots(&conn, 1000).unwrap();
		assert_eq!(deleted, 0);
	}

	#[test]
	fn delete_medium_duplicates_keeps_latest_per_day() {
		let conn = setup_db();
		// Same day (day = created_at / 86400000)
		let day_ms: i64 = 86400000;
		let base = day_ms * 10; // day 10

		// 3 snapshots on day 10, same file
		insert_snapshot(&conn, "test.md", "v1", "h1", 2, base).unwrap();
		insert_snapshot(&conn, "test.md", "v2", "h2", 2, base + 1000).unwrap();
		insert_snapshot(&conn, "test.md", "v3", "h3", 2, base + 2000).unwrap();

		// cutoff_daily = base - 1, cutoff_recent = base + day_ms
		let deleted = delete_medium_duplicates(&conn, base - 1, base + day_ms).unwrap();
		assert_eq!(deleted, 2, "should delete 2 older snapshots from the same day");

		let list = list_snapshots(&conn, "test.md").unwrap();
		assert_eq!(list.len(), 1, "only latest per day should remain");
	}
}

