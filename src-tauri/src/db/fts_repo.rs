use crate::utils::logger::debug_log;
use rusqlite::Connection;

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

/// Deletes all entries from the FTS5 index.
pub fn clear_index(conn: &Connection) -> Result<(), String> {
	conn.execute("DELETE FROM notes_fts", [])
		.map_err(|e| format!("Failed to clear FTS5 index: {e}"))?;
	Ok(())
}

/// Inserts a single entry into the FTS5 index.
pub fn insert_entry(
	conn: &Connection,
	path: &str,
	title: &str,
	content: &str,
	headings: &str,
	tags: &str,
) -> Result<(), String> {
	conn.execute(
		"INSERT INTO notes_fts(path, title, content, headings, tags) VALUES (?1, ?2, ?3, ?4, ?5)",
		rusqlite::params![path, title, content, headings, tags],
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
		.query_map(rusqlite::params![fts_query, limit], |row| {
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
pub fn delete_entry(conn: &Connection, path: &str) -> Result<(), String> {
	conn.execute("DELETE FROM notes_fts WHERE path = ?1", [path])
		.map_err(|e| format!("Failed to delete FTS entry: {e}"))?;
	Ok(())
}

/// Counts the total number of documents in the FTS5 index.
pub fn count_entries(conn: &Connection) -> Result<u64, String> {
	conn.query_row("SELECT COUNT(*) FROM notes_fts", [], |row| row.get(0))
		.map_err(|e| format!("Failed to count FTS entries: {e}"))
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
		.query_map(rusqlite::params![like_pattern, limit], |row| row.get(0))
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
