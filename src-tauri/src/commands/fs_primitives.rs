//! General-purpose filesystem primitives the frontend can invoke instead of
//! reaching for `@tauri-apps/plugin-fs` directly. Every command in this module:
//!
//! 1. Takes `vault_path` (the absolute vault root) plus the operation's
//!    target path(s).
//! 2. Validates the vault root via `vault_fs::validate_vault_path` (resolves
//!    symlinks, asserts it is a directory).
//! 3. Routes every operation path through `vault_fs::resolve_in_vault`
//!    (canonicalize and verify it lives under the vault root, with parent
//!    fallback for paths whose leaf does not exist yet).
//!
//! Per ADR 0020 these checks are the security boundary; per ADR 0026 the
//! frontend stops calling `@tauri-apps/plugin-fs` for vault operations and
//! goes through these primitives via the
//! `src/lib/core/filesystem/fs-rust.service.ts` wrapper.
//!
//! `create_folder` and `create_note` stay in `commands/vault.rs` (they pre-date
//! this module and the frontend already invokes them through
//! `core/filesystem/fs.service.ts`).

use crate::utils::fs as vault_fs;
use serde::Serialize;
use std::fs;

/// Single directory entry returned by `read_dir`.
#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct FsDirEntry {
	pub name: String,
	pub path: String,
	pub is_directory: bool,
}

/// Returns `true` if the path exists, `false` otherwise. The path must resolve
/// inside the vault; a path traversal attempt returns `Err`. A missing leaf
/// still has to have a parent inside the vault.
#[tauri::command]
pub fn path_exists(vault_path: String, path: String) -> Result<bool, String> {
	let vault_root = vault_fs::validate_vault_path(&vault_path)?;
	let (_, exists) = vault_fs::resolve_in_vault(&path, &vault_root)?;
	Ok(exists)
}

/// Reads a UTF-8 text file inside the vault. Errors if the file does not
/// exist, is outside the vault, or contains invalid UTF-8.
#[tauri::command]
pub fn read_text(vault_path: String, path: String) -> Result<String, String> {
	let vault_root = vault_fs::validate_vault_path(&vault_path)?;
	let (canonical, exists) = vault_fs::resolve_in_vault(&path, &vault_root)?;
	if !exists {
		return Err(format!("File not found: {}", path));
	}
	fs::read_to_string(&canonical).map_err(|e| format!("read failed for {}: {}", path, e))
}

/// Writes content to a file inside the vault, creating or overwriting it.
/// The parent directory must exist - callers needing recursive creation use
/// `create_folder` first.
#[tauri::command]
pub fn write_text(vault_path: String, path: String, content: String) -> Result<(), String> {
	let vault_root = vault_fs::validate_vault_path(&vault_path)?;
	let (canonical, _) = vault_fs::resolve_in_vault(&path, &vault_root)?;
	fs::write(&canonical, &content).map_err(|e| format!("write failed for {}: {}", path, e))
}

/// Renames or moves a path inside the vault. Both `from` and `to` must
/// resolve inside the vault; `from` must exist, `to` must not (rename
/// refuses to clobber).
#[tauri::command]
pub fn rename_path(vault_path: String, from: String, to: String) -> Result<(), String> {
	let vault_root = vault_fs::validate_vault_path(&vault_path)?;
	let (from_canonical, from_exists) = vault_fs::resolve_in_vault(&from, &vault_root)?;
	if !from_exists {
		return Err(format!("Source not found: {}", from));
	}
	let (to_canonical, to_exists) = vault_fs::resolve_in_vault(&to, &vault_root)?;
	if to_exists {
		return Err(format!("Destination already exists: {}", to));
	}
	fs::rename(&from_canonical, &to_canonical).map_err(|e| format!("rename failed: {}", e))
}

/// Copies a file inside the vault. Source must exist and be a file;
/// destination must not exist.
#[tauri::command]
pub fn copy_path(vault_path: String, from: String, to: String) -> Result<(), String> {
	let vault_root = vault_fs::validate_vault_path(&vault_path)?;
	let (from_canonical, from_exists) = vault_fs::resolve_in_vault(&from, &vault_root)?;
	if !from_exists {
		return Err(format!("Source not found: {}", from));
	}
	if from_canonical.is_dir() {
		return Err(format!("Source is a directory (use a separate recursive command): {}", from));
	}
	let (to_canonical, to_exists) = vault_fs::resolve_in_vault(&to, &vault_root)?;
	if to_exists {
		return Err(format!("Destination already exists: {}", to));
	}
	fs::copy(&from_canonical, &to_canonical)
		.map(|_| ())
		.map_err(|e| format!("copy failed: {}", e))
}

/// Deletes a path inside the vault. When `recursive` is `true`, directories
/// are removed with all contents; otherwise only an empty directory or a
/// single file is removed.
///
/// This is a hard delete - the trash flow lives in
/// `src/lib/core/trash/trash.service.ts` and uses move-to-`.kokobrain/trash`
/// instead. Callers should use this only when they really mean "remove from
/// disk now."
#[tauri::command]
pub fn delete_path(vault_path: String, path: String, recursive: bool) -> Result<(), String> {
	let vault_root = vault_fs::validate_vault_path(&vault_path)?;
	let (canonical, exists) = vault_fs::resolve_in_vault(&path, &vault_root)?;
	if !exists {
		return Err(format!("Path not found: {}", path));
	}
	if canonical.is_dir() {
		if recursive {
			fs::remove_dir_all(&canonical).map_err(|e| format!("rmdir failed: {}", e))
		} else {
			fs::remove_dir(&canonical).map_err(|e| format!("rmdir failed: {}", e))
		}
	} else {
		fs::remove_file(&canonical).map_err(|e| format!("rm failed: {}", e))
	}
}

/// Lists the immediate children of a directory inside the vault. Returns
/// `(name, absolute_path, is_directory)` per entry.
///
/// Symlinks are skipped (matches `scan_vault` per ADR 0020 - symlinks
/// inside the vault are invisible). Hidden entries (dot-prefixed) are
/// returned because some callers - e.g. the file-history browser or the
/// settings page that inspects `.kokobrain/` - need them. The file
/// explorer applies its own dot-filter at the consumer level.
#[tauri::command]
pub fn read_dir(vault_path: String, path: String) -> Result<Vec<FsDirEntry>, String> {
	let vault_root = vault_fs::validate_vault_path(&vault_path)?;
	let (canonical, exists) = vault_fs::resolve_in_vault(&path, &vault_root)?;
	if !exists {
		return Err(format!("Directory not found: {}", path));
	}
	if !canonical.is_dir() {
		return Err(format!("Not a directory: {}", path));
	}
	let entries = fs::read_dir(&canonical).map_err(|e| format!("readdir failed: {}", e))?;
	let mut out = Vec::new();
	for entry in entries {
		let entry = entry.map_err(|e| format!("readdir entry failed: {}", e))?;
		let name = entry.file_name().to_string_lossy().to_string();
		// `symlink_metadata` (lstat) returns the metadata of the entry itself,
		// not the symlink target. Skipping here matches `scan_vault`.
		let lstat = entry
			.path()
			.symlink_metadata()
			.map_err(|e| format!("metadata failed for {}: {}", name, e))?;
		if lstat.file_type().is_symlink() {
			continue;
		}
		out.push(FsDirEntry {
			name,
			path: entry.path().to_string_lossy().to_string(),
			is_directory: lstat.is_dir(),
		});
	}
	Ok(out)
}
