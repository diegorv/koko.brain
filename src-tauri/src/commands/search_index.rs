use crate::db;
use crate::search::fts_logic::{
	extract_headings, extract_tags, extract_title, plan_reconcile, sanitize_fts_term,
};
use crate::search::fuzzy;
use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use std::collections::HashMap;
use std::path::{Path, PathBuf};

// Re-export for tests and other consumers
pub use crate::db::fts_repo::FtsSearchResult;

/// Statistics about the FTS5 search index, reported by one reconcile pass.
#[derive(serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IndexStats {
	/// Rows in `notes_content` after the pass.
	pub total_documents: u64,
	/// Files on disk that had no row and were indexed.
	pub added: u64,
	/// Rows whose file differed on disk and got re-indexed.
	pub updated: u64,
	/// Rows whose file no longer exists and were dropped.
	pub removed: u64,
	/// Rows left alone - their files were never opened.
	pub unchanged: u64,
}

/// Reconciles the FTS5 search index with what is on disk.
///
/// The Tauri command is `async` so the CPU + I/O work is offloaded to a
/// blocking worker thread via `spawn_blocking`. A synchronous `fn` command
/// would run on the main Tauri IPC thread and block every other `invoke()` /
/// `listen()` call for the duration of the rebuild (~3 s on a vault of
/// ~1,800 notes), which noticeably stalls app startup.
#[tauri::command]
pub async fn build_search_index(vault_path: String) -> Result<IndexStats, String> {
	tokio::task::spawn_blocking(move || build_search_index_inner(vault_path))
		.await
		.map_err(|e| format!("build_search_index task join error: {e}"))?
}

/// Synchronous implementation of the FTS5 reconcile. Exposed for tests and for
/// callers that are already running on a blocking context. Production callers
/// from the frontend go through the async `build_search_index` wrapper above.
///
/// Walks the vault for `path -> mtime`, reads the same map out of
/// `notes_content`, and applies the diff: rows whose file is gone are deleted,
/// files that are new or whose mtime differs from their row are read and
/// indexed, and every other row is left untouched and never re-read. The full
/// `clear_index` + rebuild survives for the two cases where a per-row diff is
/// pointless: an empty table (also what an `FTS_SCHEMA_VERSION` mismatch
/// leaves behind after `create_tables` drops and recreates it) and a table
/// where no row at all survives the pass.
pub fn build_search_index_inner(vault_path: String) -> Result<IndexStats, String> {
	let start = std::time::Instant::now();
	let vault = vault_fs::validate_vault_path(&vault_path)?;
	// Empty exclusion list on purpose: FTS indexes `_templates`, which the
	// semantic side's EXCLUDED_FOLDERS skips. Do not borrow that constant here.
	let entries = vault_fs::collect_markdown_paths_with_mtime(&vault, &[])?;

	let mut disk: HashMap<String, i64> = HashMap::with_capacity(entries.len());
	let mut abs_paths: HashMap<String, PathBuf> = HashMap::with_capacity(entries.len());
	for (rel_path, abs_path, mtime) in entries {
		disk.insert(rel_path.clone(), mtime);
		abs_paths.insert(rel_path, abs_path);
	}

	let stored = db::with_fts_db(db::fts_repo::get_entry_mtimes)?;
	let plan = plan_reconcile(&disk, &stored);

	let mut skipped = 0u64;
	let adds = read_files(&plan.added, &abs_paths, &disk, &mut skipped);
	let updates = read_files(&plan.updated, &abs_paths, &disk, &mut skipped);
	if skipped > 0 {
		debug_log("FTS", format!("Skipped {} files due to read errors", skipped));
	}

	// A per-row diff only earns its cost when some row survives it. Nothing
	// survives when the table is empty, and nothing survives the first open
	// after the `mtime` column migration either: every pre-existing row carries
	// mtime 0, so all of them land in `updated` and each would pay an FTS5
	// `'delete'` re-tokenization (2-5 ms) that `clear_index` does for the whole
	// table in one statement. `skipped == 0` is the guard: a file that could
	// not be read keeps its old row, which a clear would throw away.
	let full_rebuild = stored.is_empty() || (skipped == 0 && plan.unchanged == 0);

	let wrote = !adds.is_empty() || !updates.is_empty() || !plan.removed.is_empty();

	let result = db::with_fts_db_transaction("fts index reconcile", |conn| {
		if full_rebuild {
			// No row survives this pass, so one statement replaces N per-row
			// deletes. It also clears a `notes_fts` left behind without its
			// content rows.
			db::fts_repo::clear_index(conn)?;
		}

		for path in &plan.removed {
			db::fts_repo::delete_entry(conn, path)?;
		}
		// `delete_entry` is a no-op when the row is absent, so the `added` paths
		// go through it too: `stored` was snapshotted before every file read, and
		// a save or a watcher-driven `update_search_index_file` landing in that
		// window inserts the row first. A bare INSERT would then hit the
		// `notes_content.path` UNIQUE constraint and roll the whole reconcile
		// back, leaving the drift this pass exists to clear.
		for (path, content, mtime) in adds.iter().chain(updates.iter()) {
			db::fts_repo::delete_entry(conn, path)?;
			index_entry(conn, path, content, *mtime)?;
		}

		Ok(IndexStats {
			total_documents: db::fts_repo::count_entries(conn)?,
			added: adds.len() as u64,
			updated: updates.len() as u64,
			removed: plan.removed.len() as u64,
			unchanged: plan.unchanged,
		})
	})?;

	debug_log(
		"FTS",
		format!(
			"Reconciled: {} added, {} updated, {} removed, {} unchanged - {} documents in {}ms",
			result.added,
			result.updated,
			result.removed,
			result.unchanged,
			result.total_documents,
			start.elapsed().as_millis(),
		),
	);

	// Compact WAL after a batch write so the next incremental
	// update_search_index_file doesn't trigger an expensive auto-checkpoint.
	if wrote {
		if let Err(e) = db::checkpoint_fts_wal() {
			debug_log("FTS", format!("WAL checkpoint after reconcile failed: {e}"));
		}
	}

	Ok(result)
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
	let limit = max_results.unwrap_or(50);
	let use_fuzzy = fuzzy.unwrap_or(false);
	search_fts_inner(trimmed, limit, use_fuzzy)
}

/// Synchronous FTS search shared by the public command and the hybrid pipeline.
pub fn search_fts_inner(
	query: &str,
	limit: usize,
	use_fuzzy: bool,
) -> Result<Vec<FtsSearchResult>, String> {
	let start = std::time::Instant::now();
	debug_log("FTS", format!("Query: \"{}\", fuzzy: {}", query, use_fuzzy));

	db::with_fts_db(|conn| {
		let fts_query = build_fts_query(conn, query, use_fuzzy)?;
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
///
/// `file_path` is vault-relative (the FTS key); `vault_path` is the absolute
/// vault root it resolves against, needed to stat the file for the `mtime`
/// stored on the row - without it the next `build_search_index` would read
/// this file again for nothing.
///
/// Runs on a blocking worker thread so the slow FTS5 DELETE does not block
/// the Tauri IPC thread (same pattern as `build_search_index`).
#[tauri::command]
pub async fn update_search_index_file(
	file_path: String,
	content: String,
	vault_path: String,
) -> Result<(), String> {
	tokio::task::spawn_blocking(move || {
		update_search_index_file_inner(file_path, content, vault_path)
	})
	.await
	.map_err(|e| format!("update_search_index_file task join error: {e}"))?
}

/// Synchronous implementation used by the async command and by tests.
pub fn update_search_index_file_inner(
	file_path: String,
	content: String,
	vault_path: String,
) -> Result<(), String> {
	debug_log("FTS", format!("Updating: {}", file_path));
	let mtime = file_mtime_secs(&vault_path, &file_path).unwrap_or_else(|e| {
		// The row still has to carry the new content; mtime 0 just costs one
		// re-read on the next vault open.
		debug_log("FTS", format!("Failed to read mtime for {}: {} - storing 0", file_path, e));
		0
	});
	db::with_fts_db_transaction("fts update file", |conn| {
		db::fts_repo::delete_entry(conn, &file_path)?;
		index_entry(conn, &file_path, &content, mtime)
	})
}

/// Removes a file from the FTS5 index (called on file delete).
///
/// Runs on a blocking worker thread so the slow FTS5 DELETE does not block
/// the Tauri IPC thread.
#[tauri::command]
pub async fn remove_from_search_index(file_path: String) -> Result<(), String> {
	tokio::task::spawn_blocking(move || remove_from_search_index_inner(file_path))
		.await
		.map_err(|e| format!("remove_from_search_index task join error: {e}"))?
}

/// Synchronous implementation used by the async command and by tests.
pub fn remove_from_search_index_inner(file_path: String) -> Result<(), String> {
	debug_log("FTS", format!("Removing: {}", file_path));
	db::with_fts_db(|conn| db::fts_repo::delete_entry(conn, &file_path))
}

// --- Private helpers ---

/// Extracts the FTS fields from `content` and inserts the row with `mtime`.
fn index_entry(
	conn: &rusqlite::Connection,
	rel_path: &str,
	content: &str,
	mtime: i64,
) -> Result<(), String> {
	let title = extract_title(rel_path);
	let headings = extract_headings(content);
	let tags = extract_tags(content);
	db::fts_repo::insert_entry(conn, rel_path, &title, content, &headings, &tags, mtime)
}

/// Reads the listed vault-relative paths off disk, returning
/// `(rel_path, content, mtime)` for each one that could be read and bumping
/// `skipped` for each one that could not.
fn read_files(
	paths: &[String],
	abs_paths: &HashMap<String, PathBuf>,
	disk: &HashMap<String, i64>,
	skipped: &mut u64,
) -> Vec<(String, String, i64)> {
	let mut out = Vec::with_capacity(paths.len());
	for rel_path in paths {
		let Some(abs_path) = abs_paths.get(rel_path) else { continue };
		match std::fs::read_to_string(abs_path) {
			Ok(content) => out.push((
				rel_path.clone(),
				content,
				disk.get(rel_path).copied().unwrap_or(0),
			)),
			Err(e) => {
				debug_log("FTS", format!("WARNING: skipped {}: {}", rel_path, e));
				*skipped += 1;
			}
		}
	}
	out
}

/// Resolves a vault-relative path against the vault root and returns its
/// mtime in seconds since the UNIX epoch - the same unit the semantic index
/// stores (`commands::semantic::update_stored_mtime`) and the same unit
/// `collect_markdown_paths_with_mtime` reports, so the two are comparable.
/// Returns `Err` when the vault or the file cannot be resolved, or when the
/// resolved path escapes the vault root.
fn file_mtime_secs(vault_path: &str, file_path: &str) -> Result<i64, String> {
	let vault_root = Path::new(vault_path)
		.canonicalize()
		.map_err(|e| format!("Invalid vault path: {e}"))?;
	let abs_canonical = vault_root
		.join(file_path)
		.canonicalize()
		.map_err(|e| format!("Cannot resolve path {}: {e}", file_path))?;
	if !abs_canonical.starts_with(&vault_root) {
		return Err(format!("Path traversal detected: {}", file_path));
	}
	Ok(std::fs::metadata(&abs_canonical)
		.and_then(|m| m.modified())
		.ok()
		.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
		.map(|d| d.as_secs() as i64)
		.unwrap_or(0))
}

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

