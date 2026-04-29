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

/// A collected markdown file entry with modification time: (relative_path, absolute_path, mtime_secs).
/// The mtime is seconds since UNIX epoch, extracted during directory walk to avoid separate stat() calls.
pub type MarkdownEntryWithMtime = (String, PathBuf, i64);

/// A collected markdown file entry with full metadata:
/// `(relative_path, absolute_path, mtime_secs, ctime_secs, size_bytes)`. Phase 8 —
/// kb-api / collection queries expose `file.ctime` and `file.size`, so the
/// scan must capture both. `ctime` is `0` on filesystems that don't expose
/// creation time (Linux extX historically; mostly fine on macOS/APFS,
/// Windows NTFS).
pub type MarkdownEntryWithMetadata = (String, PathBuf, i64, i64, u64);

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

/// Like `collect_markdown_paths`, but also collects modification times from the
/// metadata already fetched during the walk. Eliminates the need for separate
/// `std::fs::metadata()` calls per file.
pub fn collect_markdown_paths_with_mtime(
	vault_root: &Path,
	excluded_folders: &[&str],
) -> Result<Vec<MarkdownEntryWithMtime>, String> {
	let mut entries = Vec::new();
	walk_dir_with_mtime(vault_root, vault_root, &mut entries, excluded_folders, 0)?;
	Ok(entries)
}

/// Like `collect_markdown_paths_with_mtime` but also captures ctime + size.
/// Used by Phase 8's `scan_vault_v2` so per-entry metadata exposed to
/// kb-api / collection queries (`file.ctime`, `file.size`) matches the
/// filesystem state at scan time.
pub fn collect_markdown_paths_with_metadata(
	vault_root: &Path,
	excluded_folders: &[&str],
) -> Result<Vec<MarkdownEntryWithMetadata>, String> {
	let mut entries = Vec::new();
	walk_dir_with_metadata(vault_root, vault_root, &mut entries, excluded_folders, 0)?;
	Ok(entries)
}

/// Returns true when `file_name` ends with `.md` or `.markdown`,
/// case-INSENSITIVELY. Audit Tier 1 #6 (2026-04-29).
///
/// Pre-fix the check was `ends_with(".md") || ends_with(".markdown")` —
/// a file named `Note.MD` (capital extension on case-preserving APFS) was
/// silently skipped from indexing. The user could open the file in the
/// editor (Tauri's `readTextFile` is case-insensitive on APFS) but
/// backlinks / tags / properties were missing because the index never
/// contained an entry for it.
///
/// Cost: one `to_lowercase()` per filename during walk. Negligible at
/// 2k-note vault scale; would need profiling at 100k+ notes if cost matters.
pub fn is_markdown_filename(file_name: &str) -> bool {
	let lower = file_name.to_ascii_lowercase();
	lower.ends_with(".md") || lower.ends_with(".markdown")
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
		} else if is_markdown_filename(&file_name) {
			let rel_path = path
				.strip_prefix(vault_root)
				.map(|p| p.to_string_lossy().to_string())
				.unwrap_or_else(|_| path.to_string_lossy().to_string());
			entries.push((rel_path, path));
		}
	}

	Ok(())
}

fn walk_dir_with_mtime(
	dir: &Path,
	vault_root: &Path,
	entries: &mut Vec<MarkdownEntryWithMtime>,
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

		if file_name.starts_with('.') {
			continue;
		}

		let path = entry.path();

		let metadata = match std::fs::symlink_metadata(&path) {
			Ok(m) => m,
			Err(_) => continue,
		};

		if metadata.file_type().is_symlink() {
			continue;
		}

		if metadata.is_dir() {
			if excluded_folders.contains(&file_name.as_str()) {
				continue;
			}
			walk_dir_with_mtime(&path, vault_root, entries, excluded_folders, depth + 1)?;
		} else if is_markdown_filename(&file_name) {
			let rel_path = path
				.strip_prefix(vault_root)
				.map(|p| p.to_string_lossy().to_string())
				.unwrap_or_else(|_| path.to_string_lossy().to_string());
			let mtime = metadata
				.modified()
				.ok()
				.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
				.map(|d| d.as_secs() as i64)
				.unwrap_or(0);
			entries.push((rel_path, path, mtime));
		}
	}

	Ok(())
}

fn walk_dir_with_metadata(
	dir: &Path,
	vault_root: &Path,
	entries: &mut Vec<MarkdownEntryWithMetadata>,
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

		if file_name.starts_with('.') {
			continue;
		}

		let path = entry.path();

		let metadata = match std::fs::symlink_metadata(&path) {
			Ok(m) => m,
			Err(_) => continue,
		};

		if metadata.file_type().is_symlink() {
			continue;
		}

		if metadata.is_dir() {
			if excluded_folders.contains(&file_name.as_str()) {
				continue;
			}
			walk_dir_with_metadata(&path, vault_root, entries, excluded_folders, depth + 1)?;
		} else if is_markdown_filename(&file_name) {
			let rel_path = path
				.strip_prefix(vault_root)
				.map(|p| p.to_string_lossy().to_string())
				.unwrap_or_else(|_| path.to_string_lossy().to_string());
			let mtime = metadata
				.modified()
				.ok()
				.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
				.map(|d| d.as_secs() as i64)
				.unwrap_or(0);
			let ctime = metadata
				.created()
				.ok()
				.and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
				.map(|d| d.as_secs() as i64)
				.unwrap_or(0);
			let size = metadata.len();
			entries.push((rel_path, path, mtime, ctime, size));
		}
	}

	Ok(())
}
