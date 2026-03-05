use crate::utils::logger::debug_log;
use rusqlite::{Connection, OptionalExtension};
use std::collections::{HashMap, HashSet};

/// Raw chunk data loaded from DB (before embedding deserialization).
pub struct ChunkRow {
	pub key: String,
	pub source_path: String,
	pub content: String,
	pub heading: Option<String>,
	pub line_start: i64,
	pub line_end: i64,
	pub embedding_bytes: Vec<u8>,
}

/// Minimal chunk info for diagnostics.
pub struct ChunkSample {
	pub source_path: String,
	pub heading: Option<String>,
	pub embedding_bytes_len: i64,
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
	for row in rows.flatten() {
		if let Ok(ts) = row.1.parse::<i64>() {
			// Strip "mtime:" prefix to get the relative path
			let path = row.0.strip_prefix("mtime:").unwrap_or(&row.0);
			map.insert(path.to_string(), ts);
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
	line_start: i64,
	line_end: i64,
	content_hash: &str,
	embedding_bytes: &[u8],
	embedded_at: i64,
) -> Result<(), String> {
	conn.execute(
		"INSERT OR REPLACE INTO chunks (key, source_path, content, heading, line_start, line_end, content_hash, embedding, embedded_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
		rusqlite::params![
			key,
			source_path,
			content,
			heading,
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

/// Loads all chunk rows with their raw embedding bytes.
/// Used for search (caller deserializes embeddings and computes similarity).
pub fn load_all_embeddings(conn: &Connection) -> Result<Vec<ChunkRow>, String> {
	let mut stmt = conn
		.prepare(
			"SELECT key, source_path, content, heading, line_start, line_end, embedding FROM chunks",
		)
		.map_err(|e| format!("Failed to query chunks: {e}"))?;

	let rows: Vec<ChunkRow> = stmt
		.query_map([], |row| {
			Ok(ChunkRow {
				key: row.get(0)?,
				source_path: row.get(1)?,
				content: row.get(2)?,
				heading: row.get(3)?,
				line_start: row.get(4)?,
				line_end: row.get(5)?,
				embedding_bytes: row.get(6)?,
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
		.filter_map(|r| r.ok())
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
	conn.query_row("SELECT COUNT(*) FROM chunks", [], |row| row.get(0))
		.map_err(|e| format!("Failed to count chunks: {e}"))
}

/// Counts distinct source files in the index.
pub fn count_sources(conn: &Connection) -> Result<u64, String> {
	conn.query_row(
		"SELECT COUNT(DISTINCT source_path) FROM chunks",
		[],
		|row| row.get(0),
	)
	.map_err(|e| format!("Failed to count sources: {e}"))
}

/// Gets a sample of chunks for diagnostics.
pub fn get_sample_chunks(conn: &Connection, limit: usize) -> Result<Vec<ChunkSample>, String> {
	let mut stmt = conn
		.prepare("SELECT source_path, heading, length(embedding) FROM chunks LIMIT ?1")
		.map_err(|e| format!("Query failed: {e}"))?;
	let rows: Vec<ChunkSample> = stmt
		.query_map([limit], |row| {
			Ok(ChunkSample {
				source_path: row.get(0)?,
				heading: row.get(1)?,
				embedding_bytes_len: row.get(2)?,
			})
		})
		.map_err(|e| e.to_string())?
		.filter_map(|r| match r {
			Ok(v) => Some(v),
			Err(e) => {
				debug_log("SEMANTIC", format!("Warning: skipped corrupt row in get_sample_chunks: {e}"));
				None
			}
		})
		.collect();
	Ok(rows)
}
