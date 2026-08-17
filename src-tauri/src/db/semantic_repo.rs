use crate::utils::logger::debug_log;
use rusqlite::{Connection, OptionalExtension};
use std::collections::{HashMap, HashSet};

/// Raw chunk data loaded from DB (before embedding deserialization).
pub struct ChunkRow {
	pub key: String,
	pub source_path: String,
	pub content: String,
	pub heading: Option<String>,
	pub parent_headings: Vec<String>,
	pub line_start: i64,
	pub line_end: i64,
	pub embedding_bytes: Vec<u8>,
}

/// Deserializes a JSON array of strings (the `parent_headings` column).
/// Empty string and malformed JSON both fall back to an empty Vec rather than
/// failing the row read — a stale row with garbage in the column should still
/// be searchable; the next reindex fixes it.
fn parse_parent_headings(raw: &str) -> Vec<String> {
	if raw.is_empty() {
		return Vec::new();
	}
	serde_json::from_str::<Vec<String>>(raw).unwrap_or_default()
}

/// Deletes all chunks from the index. Used on model change.
pub fn clear_all_chunks(conn: &Connection) -> Result<(), String> {
	conn.execute("DELETE FROM chunks", [])
		.map_err(|e| format!("Failed to clear chunks: {e}"))?;
	Ok(())
}

/// Loads all stored mtimes from the semantic_meta table.
/// Returns a map of `relative_path -> unix_timestamp`.
pub fn get_stored_mtimes(conn: &Connection) -> Result<HashMap<String, i64>, String> {
	let mut map = HashMap::new();
	let mut stmt = conn
		.prepare("SELECT key, value FROM semantic_meta WHERE key LIKE 'mtime:%'")
		.map_err(|e| format!("Failed to query mtimes: {e}"))?;
	let rows = stmt
		.query_map([], |row| {
			let key: String = row.get(0)?;
			let val: String = row.get(1)?;
			Ok((key, val))
		})
		.map_err(|e| e.to_string())?;
	for row in rows {
		match row {
			Ok((key, val)) => {
				if let Ok(ts) = val.parse::<i64>() {
					// Strip "mtime:" prefix to get the relative path
					let path = key.strip_prefix("mtime:").unwrap_or(&key);
					map.insert(path.to_string(), ts);
				}
			}
			Err(e) => {
				debug_log("SEMANTIC", format!("Warning: skipped corrupt row in get_stored_mtimes: {e}"));
			}
		}
	}
	Ok(map)
}

/// Stores mtimes for a batch of files.
pub fn upsert_mtimes(conn: &Connection, entries: &[(String, i64)]) -> Result<(), String> {
	for (rel_path, mtime) in entries {
		conn.execute(
			"INSERT OR REPLACE INTO semantic_meta (key, value) VALUES (?1, ?2)",
			rusqlite::params![format!("mtime:{}", rel_path), mtime.to_string()],
		)
		.map_err(|e| format!("Failed to store mtime: {e}"))?;
	}
	Ok(())
}

/// Deletes a single chunk by its unique key.
pub fn delete_chunk_by_key(conn: &Connection, key: &str) -> Result<(), String> {
	conn.execute("DELETE FROM chunks WHERE key = ?1", [key])
		.map_err(|e| format!("Failed to delete chunk {}: {e}", key))?;
	Ok(())
}

/// Deletes all chunks for a given source file path.
pub fn delete_chunks_for_path(conn: &Connection, source_path: &str) -> Result<(), String> {
	conn.execute(
		"DELETE FROM chunks WHERE source_path = ?1",
		[source_path],
	)
	.map_err(|e| format!("Failed to delete chunks for {}: {e}", source_path))?;
	Ok(())
}

/// Inserts (or replaces) a single chunk with its embedding.
pub fn insert_chunk(
	conn: &Connection,
	key: &str,
	source_path: &str,
	content: &str,
	heading: Option<&str>,
	parent_headings: &[String],
	line_start: i64,
	line_end: i64,
	content_hash: &str,
	embedding_bytes: &[u8],
	embedded_at: i64,
) -> Result<(), String> {
	let parent_json = serde_json::to_string(parent_headings)
		.map_err(|e| format!("Failed to serialize parent_headings: {e}"))?;
	conn.execute(
		"INSERT OR REPLACE INTO chunks (key, source_path, content, heading, parent_headings, line_start, line_end, content_hash, embedding, embedded_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
		rusqlite::params![
			key,
			source_path,
			content,
			heading,
			parent_json,
			line_start,
			line_end,
			content_hash,
			embedding_bytes,
			embedded_at,
		],
	)
	.map_err(|e| format!("Failed to insert chunk: {e}"))?;
	Ok(())
}

/// Returns content hashes for all chunks of a given source file.
/// Used to skip re-embedding when content hasn't changed.
/// Returns a map of `chunk_key -> content_hash`.
pub fn get_chunk_hashes_for_path(conn: &Connection, source_path: &str) -> Result<HashMap<String, String>, String> {
	let mut stmt = conn
		.prepare("SELECT key, content_hash FROM chunks WHERE source_path = ?1")
		.map_err(|e| format!("Failed to query chunk hashes for {}: {e}", source_path))?;
	let map: HashMap<String, String> = stmt
		.query_map([source_path], |row| {
			Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
		})
		.map_err(|e| e.to_string())?
		.filter_map(|r| match r {
			Ok(v) => Some(v),
			Err(e) => {
				debug_log("SEMANTIC", format!("Warning: skipped corrupt row in get_chunk_hashes_for_path: {e}"));
				None
			}
		})
		.collect();
	Ok(map)
}

/// Loads all chunk rows with their raw embedding bytes.
/// Used for search (caller deserializes embeddings and computes similarity).
pub fn load_all_embeddings(conn: &Connection) -> Result<Vec<ChunkRow>, String> {
	let mut stmt = conn
		.prepare(
			"SELECT key, source_path, content, heading, parent_headings, line_start, line_end, embedding FROM chunks",
		)
		.map_err(|e| format!("Failed to query chunks: {e}"))?;

	let rows: Vec<ChunkRow> = stmt
		.query_map([], |row| {
			let parent_json: String = row.get(4)?;
			Ok(ChunkRow {
				key: row.get(0)?,
				source_path: row.get(1)?,
				content: row.get(2)?,
				heading: row.get(3)?,
				parent_headings: parse_parent_headings(&parent_json),
				line_start: row.get(5)?,
				line_end: row.get(6)?,
				embedding_bytes: row.get(7)?,
			})
		})
		.map_err(|e| format!("Failed to iterate chunks: {e}"))?
		.filter_map(|r| match r {
			Ok(v) => Some(v),
			Err(e) => {
				debug_log("SEMANTIC", format!("Warning: skipped corrupt row in load_all_embeddings: {e}"));
				None
			}
		})
		.collect();

	Ok(rows)
}

/// Returns all distinct source paths currently indexed.
pub fn get_distinct_sources(conn: &Connection) -> Result<Vec<String>, String> {
	let mut stmt = conn
		.prepare("SELECT DISTINCT source_path FROM chunks")
		.map_err(|e| format!("Failed to query chunk sources: {e}"))?;
	let paths: Vec<String> = stmt
		.query_map([], |row| row.get(0))
		.map_err(|e| e.to_string())?
		.filter_map(|r| match r {
			Ok(v) => Some(v),
			Err(e) => {
				debug_log("SEMANTIC", format!("Warning: skipped corrupt row in get_distinct_sources: {e}"));
				None
			}
		})
		.collect();
	Ok(paths)
}

/// Gets a value from the semantic_meta table by key.
/// Returns `None` only when no rows match. Propagates real DB errors.
pub fn get_meta(conn: &Connection, key: &str) -> Result<Option<String>, String> {
	conn.query_row(
		"SELECT value FROM semantic_meta WHERE key = ?1",
		[key],
		|row| row.get(0),
	)
	.optional()
	.map_err(|e| format!("Failed to query meta key '{}': {e}", key))
}

/// Inserts or replaces a value in the semantic_meta table.
pub fn upsert_meta(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
	conn.execute(
		"INSERT OR REPLACE INTO semantic_meta (key, value) VALUES (?1, ?2)",
		rusqlite::params![key, value],
	)
	.map_err(|e| format!("Failed to upsert meta {}: {e}", key))?;
	Ok(())
}

/// Deletes mtime entries from semantic_meta for files no longer in the vault.
/// Returns the number of deleted entries.
pub fn delete_orphaned_mtimes(
	conn: &Connection,
	existing_paths: &HashSet<&str>,
) -> Result<u32, String> {
	let mut stmt = conn
		.prepare("SELECT key FROM semantic_meta WHERE key LIKE 'mtime:%'")
		.map_err(|e| format!("Failed to query mtimes: {e}"))?;
	let keys: Vec<String> = stmt
		.query_map([], |row| row.get(0))
		.map_err(|e| e.to_string())?
		.filter_map(|r| match r {
			Ok(v) => Some(v),
			Err(e) => {
				debug_log("SEMANTIC", format!("Warning: skipped corrupt row in delete_orphaned_mtimes: {e}"));
				None
			}
		})
		.collect();

	let mut deleted = 0u32;
	for key in &keys {
		if let Some(path) = key.strip_prefix("mtime:") {
			if !existing_paths.contains(path) {
				conn.execute("DELETE FROM semantic_meta WHERE key = ?1", [key])
					.map_err(|e| format!("Failed to delete orphaned mtime: {e}"))?;
				deleted += 1;
			}
		}
	}
	Ok(deleted)
}

/// Counts total chunks in the index.
pub fn count_chunks(conn: &Connection) -> Result<u64, String> {
	conn.query_row("SELECT COUNT(*) FROM chunks", [], |row| row.get::<_, i64>(0).map(|v| v.max(0) as u64))
		.map_err(|e| format!("Failed to count chunks: {e}"))
}

/// Counts distinct source files in the index.
pub fn count_sources(conn: &Connection) -> Result<u64, String> {
	conn.query_row(
		"SELECT COUNT(DISTINCT source_path) FROM chunks",
		[],
		|row| row.get::<_, i64>(0).map(|v| v.max(0) as u64),
	)
	.map_err(|e| format!("Failed to count sources: {e}"))
}

/// Returns indexing info for a single source file: number of chunks and the
/// most recent `embedded_at` timestamp (None if the file has no chunks).
/// Single round-trip; uses the `idx_chunks_source` index.
pub fn get_file_index_info(
	conn: &Connection,
	source_path: &str,
) -> Result<(u64, Option<i64>), String> {
	conn.query_row(
		"SELECT COUNT(*), MAX(embedded_at) FROM chunks WHERE source_path = ?1",
		[source_path],
		|row| {
			let count: i64 = row.get(0)?;
			let last: Option<i64> = row.get(1)?;
			Ok((count.max(0) as u64, last))
		},
	)
	.map_err(|e| format!("Failed to query file index info for {}: {e}", source_path))
}

#[cfg(test)]
mod tests {
	use super::*;
	use crate::db::schema;
	use rusqlite::Connection;
	use std::collections::HashSet;

	fn setup() -> Connection {
		let conn = Connection::open_in_memory().unwrap();
		schema::create_tables(&conn).unwrap();
		conn
	}

	// --- clear_all_chunks ---

	#[test]
	fn clear_all_chunks_empties_table() {
		let conn = setup();
		insert_chunk(
			&conn, "k1", "a.md", "text", None, &[], 1, 5, "h1", b"emb", 1000,
		)
		.unwrap();
		assert_eq!(count_chunks(&conn).unwrap(), 1);

		clear_all_chunks(&conn).unwrap();
		assert_eq!(count_chunks(&conn).unwrap(), 0);
	}

	#[test]
	fn clear_all_chunks_on_empty_table_is_ok() {
		let conn = setup();
		clear_all_chunks(&conn).unwrap();
		assert_eq!(count_chunks(&conn).unwrap(), 0);
	}

	// --- get_stored_mtimes / upsert_mtimes ---

	#[test]
	fn upsert_and_get_mtimes() {
		let conn = setup();
		let entries = vec![
			("notes/a.md".to_string(), 100i64),
			("notes/b.md".to_string(), 200),
		];
		upsert_mtimes(&conn, &entries).unwrap();

		let map = get_stored_mtimes(&conn).unwrap();
		assert_eq!(map.len(), 2);
		assert_eq!(map["notes/a.md"], 100);
		assert_eq!(map["notes/b.md"], 200);
	}

	#[test]
	fn upsert_mtimes_overwrites_existing() {
		let conn = setup();
		upsert_mtimes(&conn, &[("a.md".to_string(), 100)]).unwrap();
		upsert_mtimes(&conn, &[("a.md".to_string(), 999)]).unwrap();

		let map = get_stored_mtimes(&conn).unwrap();
		assert_eq!(map["a.md"], 999);
	}

	#[test]
	fn get_stored_mtimes_empty() {
		let conn = setup();
		let map = get_stored_mtimes(&conn).unwrap();
		assert!(map.is_empty());
	}

	// --- delete_chunks_for_path / delete_chunks_for_paths ---

	#[test]
	fn delete_chunks_for_path_removes_matching() {
		let conn = setup();
		insert_chunk(&conn, "k1", "a.md", "t1", None, &[], 1, 5, "h1", b"e", 1000)
			.unwrap();
		insert_chunk(&conn, "k2", "b.md", "t2", None, &[], 1, 5, "h2", b"e", 1000)
			.unwrap();

		delete_chunks_for_path(&conn, "a.md").unwrap();
		assert_eq!(count_chunks(&conn).unwrap(), 1);

		let sources = get_distinct_sources(&conn).unwrap();
		assert_eq!(sources, vec!["b.md"]);
	}

	// --- insert_chunk ---

	#[test]
	fn insert_chunk_stores_all_fields() {
		let conn = setup();
		insert_chunk(
			&conn,
			"notes/a.md#0",
			"notes/a.md",
			"Hello world",
			Some("Introduction"),
			&[],
			1,
			10,
			"abc123",
			b"\x01\x02\x03",
			5000,
		)
		.unwrap();

		let rows = load_all_embeddings(&conn).unwrap();
		assert_eq!(rows.len(), 1);
		assert_eq!(rows[0].key, "notes/a.md#0");
		assert_eq!(rows[0].source_path, "notes/a.md");
		assert_eq!(rows[0].content, "Hello world");
		assert_eq!(rows[0].heading.as_deref(), Some("Introduction"));
		assert_eq!(rows[0].line_start, 1);
		assert_eq!(rows[0].line_end, 10);
		assert_eq!(rows[0].embedding_bytes, b"\x01\x02\x03");
	}

	#[test]
	fn insert_chunk_replaces_on_same_key() {
		let conn = setup();
		insert_chunk(&conn, "k1", "a.md", "old", None, &[], 1, 5, "h1", b"e1", 1000)
			.unwrap();
		insert_chunk(
			&conn,
			"k1",
			"a.md",
			"updated",
			Some("New heading"),
			&[],
			2,
			8,
			"h2",
			b"e2",
			2000,
		)
		.unwrap();

		assert_eq!(count_chunks(&conn).unwrap(), 1);
		let rows = load_all_embeddings(&conn).unwrap();
		assert_eq!(rows[0].content, "updated");
		assert_eq!(rows[0].heading.as_deref(), Some("New heading"));
	}

	// --- load_all_embeddings ---

	#[test]
	fn load_all_embeddings_empty() {
		let conn = setup();
		let rows = load_all_embeddings(&conn).unwrap();
		assert!(rows.is_empty());
	}

	// --- get_distinct_sources ---

	#[test]
	fn get_distinct_sources_deduplicates() {
		let conn = setup();
		insert_chunk(&conn, "k1", "a.md", "t1", None, &[], 1, 5, "h1", b"e", 1000)
			.unwrap();
		insert_chunk(&conn, "k2", "a.md", "t2", None, &[], 6, 10, "h2", b"e", 1000)
			.unwrap();
		insert_chunk(&conn, "k3", "b.md", "t3", None, &[], 1, 5, "h3", b"e", 1000)
			.unwrap();

		let sources = get_distinct_sources(&conn).unwrap();
		assert_eq!(sources.len(), 2);
		assert!(sources.contains(&"a.md".to_string()));
		assert!(sources.contains(&"b.md".to_string()));
	}

	// --- get_meta / upsert_meta ---

	#[test]
	fn upsert_and_get_meta() {
		let conn = setup();
		upsert_meta(&conn, "model_hash", "abc123").unwrap();

		let val = get_meta(&conn, "model_hash").unwrap();
		assert_eq!(val.as_deref(), Some("abc123"));
	}

	#[test]
	fn get_meta_returns_none_for_missing_key() {
		let conn = setup();
		let val = get_meta(&conn, "nonexistent").unwrap();
		assert!(val.is_none());
	}

	#[test]
	fn upsert_meta_overwrites() {
		let conn = setup();
		upsert_meta(&conn, "key1", "old").unwrap();
		upsert_meta(&conn, "key1", "new").unwrap();

		let val = get_meta(&conn, "key1").unwrap();
		assert_eq!(val.as_deref(), Some("new"));
	}

	// --- count_chunks / count_sources ---

	#[test]
	fn count_chunks_and_sources() {
		let conn = setup();
		assert_eq!(count_chunks(&conn).unwrap(), 0);
		assert_eq!(count_sources(&conn).unwrap(), 0);

		insert_chunk(&conn, "k1", "a.md", "t1", None, &[], 1, 5, "h1", b"e", 1000)
			.unwrap();
		insert_chunk(&conn, "k2", "a.md", "t2", None, &[], 6, 10, "h2", b"e", 1000)
			.unwrap();
		insert_chunk(&conn, "k3", "b.md", "t3", None, &[], 1, 5, "h3", b"e", 1000)
			.unwrap();

		assert_eq!(count_chunks(&conn).unwrap(), 3);
		assert_eq!(count_sources(&conn).unwrap(), 2);
	}

	// --- delete_orphaned_mtimes ---

	#[test]
	fn delete_orphaned_mtimes_removes_stale_entries() {
		let conn = setup();
		upsert_mtimes(
			&conn,
			&[
				("a.md".to_string(), 100),
				("b.md".to_string(), 200),
				("deleted.md".to_string(), 300),
			],
		)
		.unwrap();

		let existing: HashSet<&str> = ["a.md", "b.md"].iter().copied().collect();
		let deleted = delete_orphaned_mtimes(&conn, &existing).unwrap();
		assert_eq!(deleted, 1);

		let map = get_stored_mtimes(&conn).unwrap();
		assert_eq!(map.len(), 2);
		assert!(map.contains_key("a.md"));
		assert!(map.contains_key("b.md"));
		assert!(!map.contains_key("deleted.md"));
	}

	#[test]
	fn delete_orphaned_mtimes_no_orphans() {
		let conn = setup();
		upsert_mtimes(
			&conn,
			&[("a.md".to_string(), 100), ("b.md".to_string(), 200)],
		)
		.unwrap();

		let existing: HashSet<&str> = ["a.md", "b.md"].iter().copied().collect();
		let deleted = delete_orphaned_mtimes(&conn, &existing).unwrap();
		assert_eq!(deleted, 0);

		let map = get_stored_mtimes(&conn).unwrap();
		assert_eq!(map.len(), 2);
	}

	#[test]
	fn delete_orphaned_mtimes_empty_table() {
		let conn = setup();
		let existing: HashSet<&str> = ["a.md"].iter().copied().collect();
		let deleted = delete_orphaned_mtimes(&conn, &existing).unwrap();
		assert_eq!(deleted, 0);
	}

	#[test]
	fn delete_orphaned_mtimes_preserves_non_mtime_meta() {
		let conn = setup();
		upsert_meta(&conn, "model_hash", "abc123").unwrap();
		upsert_mtimes(&conn, &[("orphan.md".to_string(), 100)]).unwrap();

		let existing: HashSet<&str> = HashSet::new();
		let deleted = delete_orphaned_mtimes(&conn, &existing).unwrap();
		assert_eq!(deleted, 1);

		// model_hash should still exist
		let val = get_meta(&conn, "model_hash").unwrap();
		assert_eq!(val.as_deref(), Some("abc123"));
	}

	// --- get_file_index_info ---

	#[test]
	fn get_file_index_info_returns_zero_for_unknown_path() {
		let conn = setup();
		let (count, last) = get_file_index_info(&conn, "missing.md").unwrap();
		assert_eq!(count, 0);
		assert!(last.is_none());
	}

	#[test]
	fn get_file_index_info_returns_count_and_latest_embedded_at() {
		let conn = setup();
		insert_chunk(&conn, "k1", "a.md", "t1", None, &[], 1, 5, "h1", b"e", 1000)
			.unwrap();
		insert_chunk(&conn, "k2", "a.md", "t2", None, &[], 6, 10, "h2", b"e", 4500)
			.unwrap();
		insert_chunk(&conn, "k3", "a.md", "t3", None, &[], 11, 15, "h3", b"e", 2200)
			.unwrap();
		// Unrelated file -- must not leak into the result.
		insert_chunk(&conn, "k4", "b.md", "t4", None, &[], 1, 5, "h4", b"e", 9000)
			.unwrap();

		let (count, last) = get_file_index_info(&conn, "a.md").unwrap();
		assert_eq!(count, 3);
		assert_eq!(last, Some(4500), "latest embedded_at among a.md chunks");
	}

	#[test]
	fn get_file_index_info_isolates_by_source_path() {
		let conn = setup();
		insert_chunk(&conn, "k1", "a.md", "t1", None, &[], 1, 5, "h1", b"e", 1000)
			.unwrap();
		insert_chunk(&conn, "k2", "b.md", "t2", None, &[], 1, 5, "h2", b"e", 2000)
			.unwrap();

		let (count_b, last_b) = get_file_index_info(&conn, "b.md").unwrap();
		assert_eq!(count_b, 1);
		assert_eq!(last_b, Some(2000));
	}

	// --- Audit finding #12 -- silent truncation of malformed embeddings -----------
	//
	// FIXED (task B11): `commands/semantic.rs::get_or_load_cache` now goes
	// through `deserialize_embedding`, which rejects blobs whose length is
	// not a multiple of 4 (skip + log) instead of silently truncating via
	// `chunks_exact(4)`. The DB layer still accepts any byte length on insert
	// (first test below documents that), which is fine: the read side guards.
	//
	// Audit plan: ~/.claude/plans/atue-como-um-auditor-witty-minsky.md (Appendix A.1).

	#[test]
	fn audit_finding_12_db_persists_malformed_embedding_bytes_unchanged() {
		let conn = setup();
		// 4 bytes that decode as f32 1.0 in little-endian + 1 orphan byte.
		let bad_emb: &[u8] = &[0x00, 0x00, 0x80, 0x3F, 0xFF];
		insert_chunk(
			&conn, "k1", "a.md", "text", None, &[], 1, 5, "h1", bad_emb, 1000,
		)
		.unwrap();

		let rows = load_all_embeddings(&conn).unwrap();
		assert_eq!(rows.len(), 1, "row inserted");
		assert_eq!(
			rows[0].embedding_bytes.len(),
			5,
			"DB stores raw bytes verbatim -- no length validation on insert or load"
		);
	}

	#[test]
	fn audit_finding_12_malformed_blob_is_rejected_by_deserializer() {
		// The fixed read path: a blob with a trailing orphan byte is rejected
		// outright instead of being truncated to a shorter vector.
		let bad_emb: Vec<u8> = vec![0x00, 0x00, 0x80, 0x3F, 0xFF];
		assert!(
			crate::commands::semantic::deserialize_embedding(&bad_emb).is_none(),
			"len % 4 != 0 must be rejected"
		);

		// And a well-formed blob still round-trips.
		let good_emb: Vec<u8> = vec![0x00, 0x00, 0x80, 0x3F];
		let deserialized = crate::commands::semantic::deserialize_embedding(&good_emb)
			.expect("well-formed blob deserializes");
		assert_eq!(deserialized.len(), 1);
		assert!((deserialized[0] - 1.0_f32).abs() < f32::EPSILON);
	}

	// --- corrupt-row skip behavior (pinning for the logged-skip pattern) ---

	#[test]
	fn get_chunk_hashes_for_path_skips_corrupt_rows_and_keeps_valid_ones() {
		let conn = setup();
		insert_chunk(
			&conn, "good", "a.md", "text", None, &[], 1, 2, "hash-good", &[0u8; 4], 1,
		)
		.unwrap();
		// Stage a corrupt row: a BLOB in the TEXT content_hash column (SQLite
		// TEXT affinity stores BLOBs verbatim) triggers a type mismatch on read.
		conn.execute(
			"INSERT INTO chunks (key, source_path, content, parent_headings, line_start, line_end, content_hash, embedding, embedded_at)
			 VALUES ('bad', 'a.md', 'text', '[]', 1, 2, X'00FF', X'00000000', 1)",
			[],
		)
		.unwrap();

		let map = get_chunk_hashes_for_path(&conn, "a.md").unwrap();
		assert_eq!(map.len(), 1, "corrupt row skipped, valid row kept");
		assert_eq!(map.get("good").map(String::as_str), Some("hash-good"));
	}

	#[test]
	fn get_stored_mtimes_skips_corrupt_values_and_keeps_valid_ones() {
		let conn = setup();
		upsert_mtimes(&conn, &[("a.md".to_string(), 111)]).unwrap();
		conn.execute(
			"INSERT OR REPLACE INTO semantic_meta (key, value) VALUES ('mtime:bad.md', X'00FF')",
			[],
		)
		.unwrap();

		let map = get_stored_mtimes(&conn).unwrap();
		assert_eq!(map.len(), 1, "corrupt value skipped, valid entry kept");
		assert_eq!(map.get("a.md"), Some(&111));
	}
}
