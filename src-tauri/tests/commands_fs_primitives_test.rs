//! Tests for the FS primitive commands introduced in Task 3 of
//! `tasks/todo/migrate-plugin-fs-to-rust-commands.md`. Each command:
//!
//! - Happy path inside the vault.
//! - Path-traversal attempt outside the vault is rejected with
//!   "Path is outside vault directory".
//! - Missing target handling that matches the command's contract
//!   (`path_exists` returns false; everything else errors).
//!
//! Tests call the underlying functions directly instead of going through
//! `tauri::invoke` because the Tauri runtime is not bootstrapped in unit
//! tests; the function signatures match the `#[tauri::command]` shape, so
//! the security and behaviour contract is the same.

use kokobrain_lib::commands::fs_primitives::{
	copy_path, delete_path, path_exists, read_dir, read_text, rename_path, write_text,
};
use std::fs;
use tempfile::TempDir;

fn setup_vault() -> (TempDir, String) {
	let tmp = TempDir::new().unwrap();
	// Canonicalize so test assertions match what the commands compute under
	// macOS' /var -> /private/var symlink.
	let path = tmp.path().canonicalize().unwrap().to_string_lossy().to_string();
	(tmp, path)
}

// ── path_exists ────────────────────────────────────────────────────────────

#[test]
fn path_exists_returns_true_for_existing_file() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/note.md", vault);
	fs::write(&p, "x").unwrap();

	let exists = path_exists(vault, p).unwrap();
	assert!(exists);
}

#[test]
fn path_exists_returns_false_for_missing_file_in_vault() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/missing.md", vault);

	let exists = path_exists(vault, p).unwrap();
	assert!(!exists);
}

#[test]
fn path_exists_rejects_path_outside_vault() {
	let (_tmp, vault) = setup_vault();
	let outside = TempDir::new().unwrap();
	let outside_path = outside.path().join("evil.md").to_string_lossy().to_string();
	fs::write(&outside_path, "x").unwrap();

	let err = path_exists(vault, outside_path).unwrap_err();
	assert!(err.contains("outside vault"), "got: {}", err);
}

#[test]
fn path_exists_rejects_traversal_with_parent_outside_vault() {
	let (_tmp, vault) = setup_vault();
	let outside = TempDir::new().unwrap();
	let p = format!("{}/note.md", outside.path().to_string_lossy());

	let err = path_exists(vault, p).unwrap_err();
	assert!(err.contains("outside vault"), "got: {}", err);
}

// ── read_text ──────────────────────────────────────────────────────────────

#[test]
fn read_text_returns_file_content() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/note.md", vault);
	fs::write(&p, "hello world").unwrap();

	let content = read_text(vault, p).unwrap();
	assert_eq!(content, "hello world");
}

#[test]
fn read_text_errors_on_missing_file() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/missing.md", vault);

	let err = read_text(vault, p).unwrap_err();
	assert!(err.contains("not found"), "got: {}", err);
}

#[test]
fn read_text_rejects_path_outside_vault() {
	let (_tmp, vault) = setup_vault();
	let outside = TempDir::new().unwrap();
	let outside_path = outside.path().join("evil.md").to_string_lossy().to_string();
	fs::write(&outside_path, "secret").unwrap();

	let err = read_text(vault, outside_path).unwrap_err();
	assert!(err.contains("outside vault"), "got: {}", err);
}

// ── write_text ─────────────────────────────────────────────────────────────

#[test]
fn write_text_creates_new_file() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/new.md", vault);

	write_text(vault, p.clone(), "fresh".to_string()).unwrap();
	assert_eq!(fs::read_to_string(&p).unwrap(), "fresh");
}

#[test]
fn write_text_overwrites_existing_file() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/note.md", vault);
	fs::write(&p, "old").unwrap();

	write_text(vault, p.clone(), "new".to_string()).unwrap();
	assert_eq!(fs::read_to_string(&p).unwrap(), "new");
}

#[test]
fn write_text_rejects_path_outside_vault() {
	let (_tmp, vault) = setup_vault();
	let outside = TempDir::new().unwrap();
	let outside_path = outside.path().join("evil.md").to_string_lossy().to_string();

	let err = write_text(vault, outside_path.clone(), "x".to_string()).unwrap_err();
	assert!(err.contains("outside vault"), "got: {}", err);
	assert!(!std::path::Path::new(&outside_path).exists());
}

// ── rename_path ────────────────────────────────────────────────────────────

#[test]
fn rename_path_moves_file() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/a.md", vault);
	let to = format!("{}/b.md", vault);
	fs::write(&from, "x").unwrap();

	rename_path(vault, from.clone(), to.clone()).unwrap();
	assert!(!std::path::Path::new(&from).exists());
	assert_eq!(fs::read_to_string(&to).unwrap(), "x");
}

#[test]
fn rename_path_errors_when_source_missing() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/missing.md", vault);
	let to = format!("{}/b.md", vault);

	let err = rename_path(vault, from, to).unwrap_err();
	assert!(err.contains("Source not found"), "got: {}", err);
}

#[test]
fn rename_path_errors_when_destination_exists() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/a.md", vault);
	let to = format!("{}/b.md", vault);
	fs::write(&from, "x").unwrap();
	fs::write(&to, "y").unwrap();

	let err = rename_path(vault, from, to).unwrap_err();
	assert!(err.contains("already exists"), "got: {}", err);
}

#[test]
fn rename_path_rejects_destination_outside_vault() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/a.md", vault);
	fs::write(&from, "x").unwrap();
	let outside = TempDir::new().unwrap();
	let to = outside.path().join("b.md").to_string_lossy().to_string();

	let err = rename_path(vault, from, to).unwrap_err();
	assert!(err.contains("outside vault"), "got: {}", err);
}

// ── copy_path ──────────────────────────────────────────────────────────────

#[test]
fn copy_path_duplicates_file() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/a.md", vault);
	let to = format!("{}/b.md", vault);
	fs::write(&from, "x").unwrap();

	copy_path(vault, from.clone(), to.clone()).unwrap();
	assert_eq!(fs::read_to_string(&from).unwrap(), "x");
	assert_eq!(fs::read_to_string(&to).unwrap(), "x");
}

#[test]
fn copy_path_errors_when_source_missing() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/missing.md", vault);
	let to = format!("{}/b.md", vault);

	let err = copy_path(vault, from, to).unwrap_err();
	assert!(err.contains("Source not found"), "got: {}", err);
}

#[test]
fn copy_path_errors_when_source_is_directory() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/sub", vault);
	let to = format!("{}/dup", vault);
	fs::create_dir(&from).unwrap();

	let err = copy_path(vault, from, to).unwrap_err();
	assert!(err.contains("Source is a directory"), "got: {}", err);
}

#[test]
fn copy_path_rejects_path_outside_vault() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/a.md", vault);
	fs::write(&from, "x").unwrap();
	let outside = TempDir::new().unwrap();
	let to = outside.path().join("b.md").to_string_lossy().to_string();

	let err = copy_path(vault, from, to).unwrap_err();
	assert!(err.contains("outside vault"), "got: {}", err);
}

// ── delete_path ────────────────────────────────────────────────────────────

#[test]
fn delete_path_removes_file() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/note.md", vault);
	fs::write(&p, "x").unwrap();

	delete_path(vault, p.clone(), false).unwrap();
	assert!(!std::path::Path::new(&p).exists());
}

#[test]
fn delete_path_removes_empty_directory() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/empty", vault);
	fs::create_dir(&p).unwrap();

	delete_path(vault, p.clone(), false).unwrap();
	assert!(!std::path::Path::new(&p).exists());
}

#[test]
fn delete_path_recursive_removes_non_empty_directory() {
	let (_tmp, vault) = setup_vault();
	let dir = format!("{}/sub", vault);
	fs::create_dir(&dir).unwrap();
	fs::write(format!("{}/inner.md", dir), "x").unwrap();

	delete_path(vault, dir.clone(), true).unwrap();
	assert!(!std::path::Path::new(&dir).exists());
}

#[test]
fn delete_path_non_recursive_errors_on_non_empty_directory() {
	let (_tmp, vault) = setup_vault();
	let dir = format!("{}/sub", vault);
	fs::create_dir(&dir).unwrap();
	fs::write(format!("{}/inner.md", dir), "x").unwrap();

	let err = delete_path(vault, dir, false).unwrap_err();
	assert!(err.contains("rmdir failed"), "got: {}", err);
}

#[test]
fn delete_path_errors_when_target_missing() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/missing.md", vault);

	let err = delete_path(vault, p, false).unwrap_err();
	assert!(err.contains("not found"), "got: {}", err);
}

#[test]
fn delete_path_rejects_path_outside_vault() {
	let (_tmp, vault) = setup_vault();
	let outside = TempDir::new().unwrap();
	let outside_file = outside.path().join("evil.md").to_string_lossy().to_string();
	fs::write(&outside_file, "secret").unwrap();

	let err = delete_path(vault, outside_file.clone(), false).unwrap_err();
	assert!(err.contains("outside vault"), "got: {}", err);
	assert!(std::path::Path::new(&outside_file).exists());
}

// ── read_dir ───────────────────────────────────────────────────────────────

#[test]
fn read_dir_lists_files_and_directories() {
	let (_tmp, vault) = setup_vault();
	fs::write(format!("{}/a.md", vault), "x").unwrap();
	fs::write(format!("{}/b.md", vault), "y").unwrap();
	fs::create_dir(format!("{}/sub", vault)).unwrap();

	let mut entries = read_dir(vault.clone(), vault).unwrap();
	entries.sort_by(|a, b| a.name.cmp(&b.name));

	assert_eq!(entries.len(), 3);
	assert_eq!(entries[0].name, "a.md");
	assert!(!entries[0].is_directory);
	assert_eq!(entries[1].name, "b.md");
	assert!(!entries[1].is_directory);
	assert_eq!(entries[2].name, "sub");
	assert!(entries[2].is_directory);
}

#[test]
fn read_dir_errors_on_missing_directory() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/missing", vault);

	let err = read_dir(vault, p).unwrap_err();
	assert!(err.contains("not found"), "got: {}", err);
}

#[test]
fn read_dir_errors_when_target_is_a_file() {
	let (_tmp, vault) = setup_vault();
	let p = format!("{}/note.md", vault);
	fs::write(&p, "x").unwrap();

	let err = read_dir(vault, p).unwrap_err();
	assert!(err.contains("Not a directory"), "got: {}", err);
}

#[test]
fn read_dir_rejects_path_outside_vault() {
	let (_tmp, vault) = setup_vault();
	let outside = TempDir::new().unwrap();
	let outside_path = outside.path().to_string_lossy().to_string();

	let err = read_dir(vault, outside_path).unwrap_err();
	assert!(err.contains("outside vault"), "got: {}", err);
}

#[cfg(unix)]
#[test]
fn read_dir_skips_symlinks_matching_scan_vault_behaviour() {
	let (_tmp, vault) = setup_vault();
	fs::write(format!("{}/real.md", vault), "x").unwrap();
	std::os::unix::fs::symlink(
		format!("{}/real.md", vault),
		format!("{}/link.md", vault),
	)
	.unwrap();

	let entries = read_dir(vault.clone(), vault).unwrap();
	assert_eq!(entries.len(), 1, "symlink should be skipped");
	assert_eq!(entries[0].name, "real.md");
}

// ── symlink rejection at leaf (ADR 0020 + Task 3 review hardening) ─────────

#[cfg(unix)]
#[test]
fn write_text_rejects_writing_through_a_symlink_leaf() {
	let (_tmp, vault) = setup_vault();
	let target = format!("{}/real.md", vault);
	let link = format!("{}/link.md", vault);
	fs::write(&target, "original").unwrap();
	std::os::unix::fs::symlink(&target, &link).unwrap();

	let err = write_text(vault, link, "overwritten".to_string()).unwrap_err();
	assert!(err.contains("symlink"), "got: {}", err);
	// Target untouched.
	assert_eq!(fs::read_to_string(&target).unwrap(), "original");
}

#[cfg(unix)]
#[test]
fn write_text_rejects_writing_through_a_broken_symlink() {
	let (_tmp, vault) = setup_vault();
	let outside = TempDir::new().unwrap();
	let outside_target = outside.path().join("evil.md").to_string_lossy().to_string();
	let link = format!("{}/link.md", vault);
	// Target file does not exist - this is a broken symlink pointing OUTSIDE the vault.
	std::os::unix::fs::symlink(&outside_target, &link).unwrap();

	let err = write_text(vault, link, "x".to_string()).unwrap_err();
	assert!(err.contains("symlink"), "got: {}", err);
	// The outside target was never created.
	assert!(!std::path::Path::new(&outside_target).exists());
}

#[cfg(unix)]
#[test]
fn copy_path_rejects_destination_symlink() {
	let (_tmp, vault) = setup_vault();
	let from = format!("{}/a.md", vault);
	let real = format!("{}/real.md", vault);
	let link = format!("{}/link.md", vault);
	fs::write(&from, "x").unwrap();
	fs::write(&real, "real").unwrap();
	std::os::unix::fs::symlink(&real, &link).unwrap();

	let err = copy_path(vault, from, link).unwrap_err();
	// Either rejected as "already exists" (because the symlink itself
	// exists) or as a symlink. Both are acceptable; both prevent the
	// symlink target from being overwritten.
	assert!(
		err.contains("symlink") || err.contains("already exists"),
		"got: {}",
		err,
	);
	assert_eq!(fs::read_to_string(&real).unwrap(), "real");
}

#[cfg(unix)]
#[test]
fn rename_path_rejects_source_symlink() {
	let (_tmp, vault) = setup_vault();
	let real = format!("{}/real.md", vault);
	let link = format!("{}/link.md", vault);
	let dest = format!("{}/dest.md", vault);
	fs::write(&real, "x").unwrap();
	std::os::unix::fs::symlink(&real, &link).unwrap();

	let err = rename_path(vault, link, dest).unwrap_err();
	assert!(err.contains("symlink"), "got: {}", err);
}
