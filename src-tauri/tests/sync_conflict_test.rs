use noted_lib::sync::conflict::{
	conflict_filename, count_existing_conflicts, enforce_conflict_limit, resolve_conflict,
	resolve_delete_modify_conflict, safe_delete_file, validate_vault_path, MAX_CONFLICTS_PER_FILE,
};
use noted_lib::sync::manifest::Side;

// ---------------------------------------------------------------------------
// conflict_filename
// ---------------------------------------------------------------------------

#[test]
fn conflict_filename_format() {
	// 2024-06-15 14:30 UTC
	let ts = 1718458200;
	let name = conflict_filename("notes/hello.md", ts);
	assert!(
		name.starts_with("notes/hello (conflicted 2024-06-15"),
		"Got: {name}"
	);
	assert!(name.ends_with(".md"), "Got: {name}");
}

#[test]
fn conflict_filename_no_extension() {
	let name = conflict_filename("README", 1718458200);
	assert!(name.starts_with("README (conflicted "));
	assert!(!name.contains('.'));
}

#[test]
fn conflict_filename_root_level() {
	let name = conflict_filename("hello.md", 1718458200);
	assert!(name.starts_with("hello (conflicted "));
	assert!(name.ends_with(".md"));
	assert!(!name.starts_with('/'));
}

// ---------------------------------------------------------------------------
// conflict limit
// ---------------------------------------------------------------------------

#[test]
fn conflict_limit_enforced() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();

	// Create the original file
	std::fs::write(vault.join("note.md"), "original").unwrap();

	// Create MAX_CONFLICTS_PER_FILE conflict files
	for i in 0..MAX_CONFLICTS_PER_FILE {
		let name = format!("note (conflicted 2024-01-{:02} 10-00).md", i + 1);
		std::fs::write(vault.join(&name), format!("conflict {i}")).unwrap();
		// Small delay to ensure different mtimes for ordering
		std::thread::sleep(std::time::Duration::from_millis(10));
	}

	let before = count_existing_conflicts(vault.to_str().unwrap(), "note.md").unwrap();
	assert_eq!(before.len(), MAX_CONFLICTS_PER_FILE);

	// Enforce limit — should remove the oldest to make room
	enforce_conflict_limit(vault.to_str().unwrap(), "note.md").unwrap();

	let after = count_existing_conflicts(vault.to_str().unwrap(), "note.md").unwrap();
	assert!(
		after.len() < MAX_CONFLICTS_PER_FILE,
		"Should have removed oldest conflicts, got {} remaining",
		after.len()
	);
}

#[test]
fn conflict_limit_not_triggered() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	std::fs::write(vault.join("note.md"), "original").unwrap();

	// Create fewer than MAX conflicts
	for i in 0..3 {
		let name = format!("note (conflicted 2024-01-{:02} 10-00).md", i + 1);
		std::fs::write(vault.join(&name), format!("conflict {i}")).unwrap();
	}

	enforce_conflict_limit(vault.to_str().unwrap(), "note.md").unwrap();

	let after = count_existing_conflicts(vault.to_str().unwrap(), "note.md").unwrap();
	assert_eq!(after.len(), 3, "Should not remove any conflicts");
}

// ---------------------------------------------------------------------------
// resolve_delete_modify_conflict
// ---------------------------------------------------------------------------

#[test]
fn resolve_delete_modify_keeps_modified() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();

	// File was deleted locally, modified on remote — keep remote version
	resolve_delete_modify_conflict(
		vault.to_str().unwrap(),
		"note.md",
		b"modified content",
		1718458200,
		Side::Remote,
	)
	.unwrap();

	let content = std::fs::read_to_string(vault.join("note.md")).unwrap();
	assert_eq!(content, "modified content");
}

// ---------------------------------------------------------------------------
// resolve_conflict
// ---------------------------------------------------------------------------

#[test]
fn resolve_conflict_newer_wins() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	std::fs::write(vault.join("note.md"), "old").unwrap();

	let conflict_name = resolve_conflict(
		vault.to_str().unwrap(),
		"note.md",
		b"local version",
		2000, // newer
		b"remote version",
		1000, // older
	)
	.unwrap();

	// Newer (local) should be at original path
	let original = std::fs::read_to_string(vault.join("note.md")).unwrap();
	assert_eq!(original, "local version");

	// Older (remote) should be at conflict path
	let conflict = std::fs::read_to_string(vault.join(&conflict_name)).unwrap();
	assert_eq!(conflict, "remote version");
}

// ---------------------------------------------------------------------------
// safe_delete_file
// ---------------------------------------------------------------------------

#[test]
fn safe_delete_validates_path() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path().to_str().unwrap();

	// Path traversal should be rejected
	let result = safe_delete_file(vault, "../escape.md");
	assert!(result.is_err(), "Should reject path traversal");
	assert!(result.unwrap_err().contains("traversal"));
}

#[test]
fn safe_delete_removes_file() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	std::fs::write(vault.join("note.md"), "content").unwrap();

	safe_delete_file(vault.to_str().unwrap(), "note.md").unwrap();
	assert!(!vault.join("note.md").exists());
}

#[test]
fn safe_delete_nonexistent_is_ok() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path().to_str().unwrap();

	// Deleting a file that doesn't exist should not error
	let result = safe_delete_file(vault, "nonexistent.md");
	assert!(result.is_ok());
}

// ---------------------------------------------------------------------------
// validate_vault_path
// ---------------------------------------------------------------------------

#[test]
fn validate_vault_path_rejects_traversal() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path().to_str().unwrap();

	assert!(validate_vault_path(vault, "../escape.md").is_err());
	assert!(validate_vault_path(vault, "sub/../../escape.md").is_err());
}

#[test]
fn validate_vault_path_rejects_absolute() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path().to_str().unwrap();

	assert!(validate_vault_path(vault, "/etc/passwd").is_err());
}

#[test]
fn validate_vault_path_accepts_normal() {
	let dir = tempfile::tempdir().unwrap();
	let vault = dir.path();
	std::fs::write(vault.join("note.md"), "ok").unwrap();

	let result = validate_vault_path(vault.to_str().unwrap(), "note.md");
	assert!(result.is_ok());
}
