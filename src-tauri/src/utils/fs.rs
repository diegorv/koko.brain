use std::path::{Path, PathBuf};

/// Maximum recursion depth for directory traversal.
const MAX_DEPTH: usize = 64;

/// Validates and canonicalizes a vault path.
///
/// Resolves symlinks and `..` components, then verifies the result is a directory.
/// Returns the canonicalized path on success — callers should use this canonical path
/// for all subsequent filesystem operations to prevent TOCTOU race conditions.
pub fn validate_vault_path(vault_path: &str) -> Result<PathBuf, String> {
	let canonical = Path::new(vault_path)
		.canonicalize()
		.map_err(|e| format!("Failed to resolve vault path: {e}"))?;
	if !canonical.is_dir() {
		return Err(format!("Path is not a directory: {}", vault_path));
	}
	Ok(canonical)
}

/// A collected markdown file entry: (relative_path, absolute_path).
pub type MarkdownEntry = (String, PathBuf);

/// Recursively collects markdown file paths from a vault directory.
///
/// Returns `(relative_path, absolute_path)` pairs for all `.md` / `.markdown` files.
/// Skips hidden files/directories (dot-prefixed) and any directories in `excluded_folders`.
pub fn collect_markdown_paths(
	vault_root: &Path,
	excluded_folders: &[&str],
) -> Result<Vec<MarkdownEntry>, String> {
	let mut entries = Vec::new();
	walk_dir(vault_root, vault_root, &mut entries, excluded_folders, 0)?;
	Ok(entries)
}

fn walk_dir(
	dir: &Path,
	vault_root: &Path,
	entries: &mut Vec<MarkdownEntry>,
	excluded_folders: &[&str],
	depth: usize,
) -> Result<(), String> {
	if depth >= MAX_DEPTH {
		return Ok(());
	}

	let dir_entries = std::fs::read_dir(dir)
		.map_err(|e| format!("Failed to read directory {:?}: {e}", dir))?;

	for entry in dir_entries {
		let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
		let file_name = entry.file_name().to_string_lossy().to_string();

		// Skip hidden files/directories
		if file_name.starts_with('.') {
			continue;
		}

		let path = entry.path();

		// Use symlink_metadata (lstat) for atomic symlink check,
		// eliminating the TOCTOU window between is_symlink() and is_dir().
		let metadata = match std::fs::symlink_metadata(&path) {
			Ok(m) => m,
			Err(_) => continue,
		};

		// Skip symlinks to prevent loops and path traversal
		if metadata.file_type().is_symlink() {
			continue;
		}

		if metadata.is_dir() {
			if excluded_folders.contains(&file_name.as_str()) {
				continue;
			}
			walk_dir(&path, vault_root, entries, excluded_folders, depth + 1)?;
		} else if file_name.ends_with(".md") || file_name.ends_with(".markdown") {
			let rel_path = path
				.strip_prefix(vault_root)
				.map(|p| p.to_string_lossy().to_string())
				.unwrap_or_else(|_| path.to_string_lossy().to_string());
			entries.push((rel_path, path));
		}
	}

	Ok(())
}
