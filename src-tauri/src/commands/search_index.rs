use crate::db;
use crate::search::fts_logic::{extract_headings, extract_tags, extract_title, sanitize_fts_term};
use crate::search::fuzzy;
use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;

// Re-export for tests and other consumers
pub use crate::db::fts_repo::FtsSearchResult;

/// Statistics about the FTS5 search index.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IndexStats {
	pub total_documents: u64,
}

/// Builds the FTS5 search index by scanning all markdown files in the vault.
/// Clears existing data and re-indexes from scratch.
#[tauri::command]
pub fn build_search_index(vault_path: String) -> Result<IndexStats, String> {
	let start = std::time::Instant::now();
	let vault = vault_fs::validate_vault_path(&vault_path)?;
	let entries = vault_fs::collect_markdown_paths(&vault, &[])?;
	debug_log("FTS", format!("Building index: {} files", entries.len()));

	// Read file contents, logging any files that fail to read
	let total_entries = entries.len();
	let mut skipped = 0u64;
	let mut files: Vec<(String, String)> = Vec::new();
	for (rel_path, abs_path) in entries {
		match std::fs::read_to_string(&abs_path) {
			Ok(content) => files.push((rel_path, content)),
			Err(e) => {
				debug_log("FTS", format!("WARNING: skipped {}: {}", rel_path, e));
				skipped += 1;
			}
		}
	}
	if skipped > 0 {
		debug_log("FTS", format!("Skipped {} of {} files due to read errors", skipped, total_entries));
	}

	db::with_db_transaction(|conn| {
		db::fts_repo::clear_index(conn)?;

		let mut count = 0u64;
		for (rel_path, content) in &files {
			let title = extract_title(rel_path);
			let headings = extract_headings(content);
			let tags = extract_tags(content);

			db::fts_repo::insert_entry(conn, rel_path, &title, content, &headings, &tags)?;
			count += 1;
		}

		debug_log("FTS", format!("Index built: {} documents in {}ms", count, start.elapsed().as_millis()));
		Ok(IndexStats {
			total_documents: count,
		})
	})
}

/// Searches the FTS5 index using BM25 ranking with optional fuzzy matching.
#[tauri::command]
pub fn search_fts(
	query: String,
	max_results: Option<usize>,
	fuzzy: Option<bool>,
) -> Result<Vec<FtsSearchResult>, String> {
	let trimmed = query.trim();
	if trimmed.is_empty() {
		return Ok(Vec::new());
	}

	let start = std::time::Instant::now();
	let limit = max_results.unwrap_or(50);
	let use_fuzzy = fuzzy.unwrap_or(false);
	debug_log("FTS", format!("Query: \"{}\", fuzzy: {}", trimmed, use_fuzzy));

	db::with_db(|conn| {
		let fts_query = build_fts_query(conn, trimmed, use_fuzzy)?;
		// Empty query string would cause FTS5 MATCH syntax error
		if fts_query.is_empty() {
			return Ok(Vec::new());
		}
		let results = db::fts_repo::search_match(conn, &fts_query, limit)?;
		debug_log("FTS", format!("Results: {} matches in {}ms", results.len(), start.elapsed().as_millis()));
		Ok(results)
	})
}

/// Updates the FTS5 index for a single file (called on save).
/// Uses a transaction to ensure delete+insert is atomic (no partial state on failure).
#[tauri::command]
pub fn update_search_index_file(file_path: String, content: String) -> Result<(), String> {
	debug_log("FTS", format!("Updating: {}", file_path));
	db::with_db_transaction(|conn| {
		db::fts_repo::delete_entry(conn, &file_path)?;

		let title = extract_title(&file_path);
		let headings = extract_headings(&content);
		let tags = extract_tags(&content);

		db::fts_repo::insert_entry(conn, &file_path, &title, &content, &headings, &tags)
	})
}

/// Removes a file from the FTS5 index (called on file delete).
#[tauri::command]
pub fn remove_from_search_index(file_path: String) -> Result<(), String> {
	debug_log("FTS", format!("Removing: {}", file_path));
	db::with_db(|conn| db::fts_repo::delete_entry(conn, &file_path))
}

/// Returns statistics about the FTS5 search index.
#[tauri::command]
pub fn get_search_index_stats() -> Result<IndexStats, String> {
	db::with_db(|conn| {
		let count = db::fts_repo::count_entries(conn)?;
		Ok(IndexStats {
			total_documents: count,
		})
	})
}

// --- Private helpers ---

/// Builds an FTS5 MATCH query string from user input.
/// With fuzzy enabled, expands each term to include Levenshtein-close alternatives.
fn build_fts_query(
	conn: &rusqlite::Connection,
	query: &str,
	use_fuzzy: bool,
) -> Result<String, String> {
	let terms: Vec<&str> = query.split_whitespace().collect();
	if terms.is_empty() {
		return Ok(String::new());
	}

	let mut parts = Vec::new();
	for term in &terms {
		let sanitized = sanitize_fts_term(term);
		if sanitized.is_empty() {
			continue;
		}

		if use_fuzzy {
			let expanded = fuzzy::expand_fuzzy_terms(conn, &sanitized)?;
			if expanded.len() > 1 {
				let or_parts: Vec<String> = expanded
					.iter()
					.map(|t| format!("\"{}\"", t))
					.collect();
				parts.push(format!("({})", or_parts.join(" OR ")));
			} else {
				parts.push(format!("\"{}\"", sanitized));
			}
		} else {
			parts.push(format!("\"{}\"", sanitized));
		}
	}

	Ok(parts.join(" "))
}

