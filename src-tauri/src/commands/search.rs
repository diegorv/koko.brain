use crate::search::text_search::{search_in_content, SearchMatch};
use crate::utils::fs as vault_fs;
use crate::utils::logger::debug_log;
use std::fs;
use std::path::Path;

/// Maximum recursion depth for directory traversal (prevents symlink loops / extreme nesting).
const MAX_DEPTH: usize = 64;

/// Maximum file size (in bytes) to read for search. Files above this are skipped.
const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10 MB

/// Performs case-insensitive full-text search across all `.md` / `.markdown` files in the vault.
/// Skips hidden files/directories (dot-prefixed), which includes the `.kokobrain` internal folder.
#[tauri::command]
pub fn search_vault(vault_path: String, query: String) -> Result<Vec<SearchMatch>, String> {
	if query.is_empty() {
		return Ok(Vec::new());
	}

	debug_log("SEARCH", format!("Full-text search: \"{}\"", query));
	let root = vault_fs::validate_vault_path(&vault_path)?;
	let query_lower = query.to_lowercase();
	let mut results = Vec::new();

	collect_search_matches(&root, &query_lower, &mut results, 0)?;
	debug_log("SEARCH", format!("Search complete: {} matches", results.len()));
	Ok(results)
}

fn collect_search_matches(
	dir: &Path,
	query_lower: &str,
	results: &mut Vec<SearchMatch>,
	depth: usize,
) -> Result<(), String> {
	if depth >= MAX_DEPTH {
		return Ok(());
	}

	let entries =
		fs::read_dir(dir).map_err(|e| format!("Failed to read directory {:?}: {}", dir, e))?;

	for entry in entries {
		let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
		let file_name = entry.file_name().to_string_lossy().to_string();

		if file_name.starts_with('.') {
			continue;
		}

		let path = entry.path();

		// Use symlink_metadata (lstat) for atomic symlink check + metadata read,
		// eliminating the TOCTOU window between is_symlink() and metadata().
		let metadata = match fs::symlink_metadata(&path) {
			Ok(m) => m,
			Err(_) => continue,
		};

		// Skip symlinks to prevent loops and path traversal
		if metadata.file_type().is_symlink() {
			continue;
		}

		if metadata.is_dir() {
			collect_search_matches(&path, query_lower, results, depth + 1)?;
		} else if file_name.ends_with(".md") || file_name.ends_with(".markdown") {
			// Skip files that are too large
			if metadata.len() > MAX_FILE_SIZE {
				continue;
			}
			if let Ok(content) = fs::read_to_string(&path) {
				let path_str = path.to_string_lossy().to_string();
				let display_name = file_name
					.strip_suffix(".md")
					.or_else(|| file_name.strip_suffix(".markdown"))
					.unwrap_or(&file_name);
				search_in_content(&path_str, display_name, &content, query_lower, results);
			}
		}
	}

	Ok(())
}
