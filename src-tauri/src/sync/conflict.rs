use std::path::{Path, PathBuf};

use super::manifest::Side;
use crate::utils::logger::debug_log;

/// Maximum number of conflict files kept per original file.
pub const MAX_CONFLICTS_PER_FILE: usize = 10;

// ---------------------------------------------------------------------------
// Path validation
// ---------------------------------------------------------------------------

/// Validates that a path is within the vault root (anti path-traversal).
///
/// Rejects paths containing `..`, absolute paths, and symlinks.
pub fn validate_vault_path(vault_path: &str, relative_path: &str) -> Result<PathBuf, String> {
	if relative_path.contains("..") {
		return Err(format!("Path traversal detected: {relative_path}"));
	}
	if Path::new(relative_path).is_absolute() {
		return Err(format!("Absolute path not allowed: {relative_path}"));
	}

	let full = Path::new(vault_path).join(relative_path);
	let canonical_vault = std::fs::canonicalize(vault_path)
		.map_err(|e| format!("Failed to canonicalize vault path: {e}"))?;

	if full.exists() {
		// File exists: verify it resolves inside the vault
		let canonical_file = std::fs::canonicalize(&full)
			.map_err(|e| format!("Failed to canonicalize file path: {e}"))?;
		if !canonical_file.starts_with(&canonical_vault) {
			return Err(format!(
				"Path escapes vault: {relative_path}"
			));
		}
		// Reject symlinks
		let meta = std::fs::symlink_metadata(&full)
			.map_err(|e| format!("Failed to read metadata: {e}"))?;
		if meta.file_type().is_symlink() {
			return Err(format!("Symlink not allowed: {relative_path}"));
		}
	} else {
		// File doesn't exist yet: verify the nearest existing ancestor resolves inside the vault
		let mut ancestor = full.parent();
		while let Some(dir) = ancestor {
			if dir.exists() {
				let canonical_dir = std::fs::canonicalize(dir)
					.map_err(|e| format!("Failed to canonicalize parent dir: {e}"))?;
				if !canonical_dir.starts_with(&canonical_vault) {
					return Err(format!("Path escapes vault: {relative_path}"));
				}
				break;
			}
			ancestor = dir.parent();
		}
	}

	Ok(full)
}

// ---------------------------------------------------------------------------
// Conflict filenames
// ---------------------------------------------------------------------------

/// Generates a conflict filename from the original path and a modification timestamp.
///
/// Format: `"{stem} (conflicted {YYYY-MM-DD HH-MM-SS}){ext}"`.
pub fn conflict_filename(original_path: &str, mtime: u64) -> String {
	let path = Path::new(original_path);
	let stem = path
		.file_stem()
		.map(|s| s.to_string_lossy().to_string())
		.unwrap_or_default();
	let ext = path
		.extension()
		.map(|e| format!(".{}", e.to_string_lossy()))
		.unwrap_or_default();
	let parent = path
		.parent()
		.map(|p| {
			let s = p.to_string_lossy().to_string();
			if s.is_empty() {
				s
			} else {
				format!("{s}/")
			}
		})
		.unwrap_or_default();

	let dt = chrono::DateTime::from_timestamp(mtime as i64, 0)
		.unwrap_or_default()
		.format("%Y-%m-%d %H-%M-%S");

	format!("{parent}{stem} (conflicted {dt}){ext}")
}

// ---------------------------------------------------------------------------
// Conflict counting and rotation
// ---------------------------------------------------------------------------

/// Finds existing conflict files for the given original path.
///
/// Returns paths sorted by modification time (oldest first).
pub fn count_existing_conflicts(
	vault_path: &str,
	original_path: &str,
) -> Result<Vec<PathBuf>, String> {
	let path = Path::new(original_path);
	let stem = path
		.file_stem()
		.map(|s| s.to_string_lossy().to_string())
		.unwrap_or_default();
	let ext = path
		.extension()
		.map(|e| format!(".{}", e.to_string_lossy()))
		.unwrap_or_default();

	let dir = Path::new(vault_path).join(
		path.parent()
			.map(|p| p.to_string_lossy().to_string())
			.unwrap_or_default(),
	);

	if !dir.is_dir() {
		return Ok(Vec::new());
	}

	let prefix = format!("{stem} (conflicted ");
	let mut conflicts: Vec<(PathBuf, std::time::SystemTime)> = Vec::new();

	for entry in std::fs::read_dir(&dir).map_err(|e| format!("Failed to read dir: {e}"))? {
		let entry = entry.map_err(|e| format!("Failed to read entry: {e}"))?;
		let name = entry.file_name().to_string_lossy().to_string();
		if name.starts_with(&prefix) && name.ends_with(&ext) {
			let mtime = entry
				.metadata()
				.and_then(|m| m.modified())
				.unwrap_or(std::time::UNIX_EPOCH);
			conflicts.push((entry.path(), mtime));
		}
	}

	// Sort oldest first
	conflicts.sort_by_key(|(_, mtime)| *mtime);
	Ok(conflicts.into_iter().map(|(p, _)| p).collect())
}

/// Enforces the conflict file limit by removing the oldest files when exceeded.
pub fn enforce_conflict_limit(vault_path: &str, original_path: &str) -> Result<(), String> {
	let conflicts = count_existing_conflicts(vault_path, original_path)?;
	if conflicts.len() >= MAX_CONFLICTS_PER_FILE {
		let to_remove = conflicts.len() - MAX_CONFLICTS_PER_FILE + 1;
		debug_log("SYNC:CONFLICT", format!(
			"Conflict limit reached for '{original_path}': removing {to_remove} oldest file(s)"
		));
		for path in conflicts.iter().take(to_remove) {
			std::fs::remove_file(path)
				.map_err(|e| format!("Failed to remove old conflict: {e}"))?;
		}
	}
	Ok(())
}

// ---------------------------------------------------------------------------
// Conflict resolution
// ---------------------------------------------------------------------------

/// Resolves a content conflict between local and remote versions.
///
/// Uses `mtime` as tiebreaker: the newer version stays at the original path,
/// the older is renamed to a conflict file. Returns the conflict filename.
pub fn resolve_conflict(
	vault_path: &str,
	path: &str,
	local_content: &[u8],
	local_mtime: u64,
	remote_content: &[u8],
	remote_mtime: u64,
) -> Result<String, String> {
	let full = validate_vault_path(vault_path, path)?;
	enforce_conflict_limit(vault_path, path)?;

	// Newer version wins the original path
	let (winner, loser, loser_mtime) = if local_mtime >= remote_mtime {
		debug_log("SYNC:CONFLICT", format!(
			"Conflict on '{path}': local wins (local_mtime={local_mtime} >= remote_mtime={remote_mtime})"
		));
		(local_content, remote_content, remote_mtime)
	} else {
		debug_log("SYNC:CONFLICT", format!(
			"Conflict on '{path}': remote wins (remote_mtime={remote_mtime} > local_mtime={local_mtime})"
		));
		(remote_content, local_content, local_mtime)
	};

	let conflict_name = conflict_filename(path, loser_mtime);
	debug_log("SYNC:CONFLICT", format!("Conflict file: '{conflict_name}'"));
	let conflict_full = validate_vault_path(vault_path, &conflict_name)?;

	// Ensure parent directory exists
	if let Some(parent) = conflict_full.parent() {
		std::fs::create_dir_all(parent)
			.map_err(|e| format!("Failed to create parent dir: {e}"))?;
	}

	// Write winner to original, loser to conflict file
	std::fs::write(&full, winner).map_err(|e| format!("Failed to write winner: {e}"))?;
	std::fs::write(&conflict_full, loser)
		.map_err(|e| format!("Failed to write conflict file: {e}"))?;

	Ok(conflict_name)
}

/// Resolves a delete-modify conflict by always preserving the modified version.
pub fn resolve_delete_modify_conflict(
	vault_path: &str,
	path: &str,
	modified_content: &[u8],
	_modified_mtime: u64,
	_modifier: Side,
) -> Result<(), String> {
	debug_log("SYNC:CONFLICT", format!(
		"Delete-modify conflict on '{path}': preserving modified version ({} bytes)",
		modified_content.len()
	));
	let full = validate_vault_path(vault_path, path)?;

	if let Some(parent) = full.parent() {
		std::fs::create_dir_all(parent)
			.map_err(|e| format!("Failed to create parent dir: {e}"))?;
	}

	std::fs::write(&full, modified_content)
		.map_err(|e| format!("Failed to write modified version: {e}"))?;

	Ok(())
}

/// Safely deletes a file within the vault after path validation.
///
/// Re-checks that the target is not a symlink immediately before deletion
/// to mitigate TOCTOU race conditions where the path could be swapped.
pub fn safe_delete_file(vault_path: &str, path: &str) -> Result<(), String> {
	let full = validate_vault_path(vault_path, path)?;

	if full.exists() {
		// Re-verify not a symlink right before deletion (TOCTOU mitigation)
		let meta = std::fs::symlink_metadata(&full)
			.map_err(|e| format!("Failed to read metadata before delete: {e}"))?;
		if meta.file_type().is_symlink() {
			return Err(format!("Symlink not allowed (race detected): {path}"));
		}
		std::fs::remove_file(&full).map_err(|e| format!("Failed to delete file: {e}"))?;
		debug_log("SYNC:CONFLICT", format!("Deleted file: {path}"));
	}
	Ok(())
}
