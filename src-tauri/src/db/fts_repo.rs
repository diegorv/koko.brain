use crate::utils::logger::debug_log;
use rusqlite::{Connection, OptionalExtension};

/// A single FTS5 search result with BM25 score and snippet.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FtsSearchResult {
	pub path: String,
	pub title: String,
	pub score: f64,
	pub snippet: String,
	pub tags: String,
}

/// Deletes all entries from both the content table and the FTS5 index.
pub fn clear_index(conn: &Connection) -> Result<(), String> {
	conn.execute("DELETE FROM notes_content", [])
		.map_err(|e| format!("Failed to clear content table: {e}"))?;
	conn.execute("DELETE FROM notes_fts", [])
		.map_err(|e| format!("Failed to clear FTS5 index: {e}"))?;
	Ok(())
}

/// Inserts a single entry into the content table and the FTS5 index.
pub fn insert_entry(
	conn: &Connection,
	path: &str,
	title: &str,
	content: &str,
	headings: &str,
	tags: &str,
) -> Result<(), String> {
	conn.execute(
		"INSERT INTO notes_content(path, title, content, headings, tags) VALUES (?1, ?2, ?3, ?4, ?5)",
		rusqlite::params![path, title, content, headings, tags],
	)
	.map_err(|e| format!("Failed to insert content entry: {e}"))?;

	let rowid = conn.last_insert_rowid();

	conn.execute(
		"INSERT INTO notes_fts(rowid, path, title, content, headings, tags) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
		rusqlite::params![rowid, path, title, content, headings, tags],
	)
	.map_err(|e| format!("Failed to insert FTS entry: {e}"))?;

	Ok(())
}

/// Searches the FTS5 index using BM25 ranking with the given MATCH query.
pub fn search_match(
	conn: &Connection,
	fts_query: &str,
	limit: usize,
) -> Result<Vec<FtsSearchResult>, String> {
	let mut stmt = conn
		.prepare(
			"SELECT path, title,
				snippet(notes_fts, 2, '<mark>', '</mark>', '...', 30) as snippet,
				bm25(notes_fts, 0.0, 2.0, 1.0, 1.5, 1.0) as score,
				tags
			FROM notes_fts
			WHERE notes_fts MATCH ?1
			ORDER BY score
			LIMIT ?2",
		)
		.map_err(|e| format!("FTS5 query failed: {e}"))?;

	let results = stmt
		.query_map(rusqlite::params![fts_query, limit as i64], |row| {
			Ok(FtsSearchResult {
				path: row.get(0)?,
				title: row.get(1)?,
				snippet: row.get(2)?,
				score: row.get(3)?,
				tags: row.get(4)?,
			})
		})
		.map_err(|e| format!("FTS5 query execution failed: {e}"))?
		.filter_map(|r| match r {
			Ok(v) => Some(v),
			Err(e) => {
				debug_log("FTS", format!("Warning: skipped corrupt row in search_match: {e}"));
				None
			}
		})
		.collect();

	Ok(results)
}

/// Deletes a single entry from the FTS5 index by path.
///
/// Reads the old content from `notes_content` and provides it to the FTS5
/// `'delete'` command so FTS5 does not need to re-read its internal content
/// store. This is the key performance fix: DELETE drops from 140–1100 ms
/// to 2–5 ms.
pub fn delete_entry(conn: &Connection, path: &str) -> Result<(), String> {
	let row: Option<(i64, String, String, String, String, String)> = conn
		.query_row(
			"SELECT rowid, path, title, content, headings, tags FROM notes_content WHERE path = ?1",
			[path],
			|row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?)),
		)
		.optional()
		.map_err(|e| format!("Failed to read content for FTS delete: {e}"))?;

	if let Some((rowid, old_path, old_title, old_content, old_headings, old_tags)) = row {
		conn.execute(
			"INSERT INTO notes_fts(notes_fts, rowid, path, title, content, headings, tags) VALUES ('delete', ?1, ?2, ?3, ?4, ?5, ?6)",
			rusqlite::params![rowid, old_path, old_title, old_content, old_headings, old_tags],
		)
		.map_err(|e| format!("Failed to delete FTS entry: {e}"))?;

		conn.execute("DELETE FROM notes_content WHERE rowid = ?1", [rowid])
			.map_err(|e| format!("Failed to delete content entry: {e}"))?;
	}

	Ok(())
}

/// Counts the total number of documents in the content table.
pub fn count_entries(conn: &Connection) -> Result<u64, String> {
	conn.query_row("SELECT COUNT(*) FROM notes_content", [], |row| row.get::<_, i64>(0).map(|v| v.max(0) as u64))
		.map_err(|e| format!("Failed to count entries: {e}"))
}

/// Queries the FTS5 vocabulary table for terms matching the given LIKE pattern.
/// Used for fuzzy term expansion.
pub fn expand_vocab_terms(
	conn: &Connection,
	like_pattern: &str,
	limit: usize,
) -> Result<Vec<String>, String> {
	let mut stmt = conn
		.prepare("SELECT DISTINCT term FROM notes_fts_vocab WHERE term LIKE ?1 LIMIT ?2")
		.map_err(|e| e.to_string())?;

	let terms: Vec<String> = stmt
		.query_map(rusqlite::params![like_pattern, limit as i64], |row| row.get(0))
		.map_err(|e| e.to_string())?
		.filter_map(|r| match r {
			Ok(v) => Some(v),
			Err(e) => {
				debug_log("FTS", format!("Warning: skipped corrupt row in expand_vocab_terms: {e}"));
				None
			}
		})
		.collect();

	Ok(terms)
}
