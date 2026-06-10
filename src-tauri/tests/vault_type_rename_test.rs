//! Type-rename propagation tests (`propagate_type_rename_inner`).
//!
//! The Tauri command wrapper can't be unit-tested without an `AppHandle`
//! (it emits `vault-index-updated`); these tests target the inner function
//! over a real tempdir-backed index, mirroring `vault_file_ops_test.rs`.

use kokobrain_lib::commands::vault::{propagate_type_rename_inner, update_note_in_index_inner};
use kokobrain_lib::vault::index::VaultIndex;
use std::fs;
use tempfile::tempdir;

/// Writes a file and indexes it, returning its absolute path string.
fn seed(idx: &mut VaultIndex, dir: &std::path::Path, name: &str, content: &str) -> String {
	let path = dir.join(name);
	fs::write(&path, content).expect("write");
	let path_str = path.to_string_lossy().to_string();
	update_note_in_index_inner(idx, path_str.clone(), content, 0);
	path_str
}

#[test]
fn rewrites_members_and_updates_index() {
	let tmp = tempdir().expect("tmpdir");
	let mut idx = VaultIndex::default();

	let m1 = seed(&mut idx, tmp.path(), "m1.md", "---\n_type: Project\n---\n\n# M1\n");
	// Lowercase + quoted + alias key — indexes as is_a "Project" all the same.
	let m2 = seed(&mut idx, tmp.path(), "m2.md", "---\ntype: \"project\"\n---\n\n# M2\n");

	let (updated, last) = propagate_type_rename_inner(&mut idx, "Project", "Initiative");

	assert_eq!(updated, 2);
	assert!(last.is_some());
	assert_eq!(
		fs::read_to_string(&m1).unwrap(),
		"---\n_type: Initiative\n---\n\n# M1\n"
	);
	assert_eq!(
		fs::read_to_string(&m2).unwrap(),
		"---\ntype: \"Initiative\"\n---\n\n# M2\n"
	);
	assert_eq!(idx.entries()[&m1].is_a.as_deref(), Some("Initiative"));
	assert_eq!(idx.entries()[&m2].is_a.as_deref(), Some("Initiative"));
}

#[test]
fn leaves_non_members_and_definitions_untouched() {
	let tmp = tempdir().expect("tmpdir");
	let mut idx = VaultIndex::default();

	let other = seed(&mut idx, tmp.path(), "other.md", "---\n_type: Task\n---\n\n# Other\n");
	// The definition note of the renamed type has `_type: Type`, not `_type: Project`.
	let def = seed(
		&mut idx,
		tmp.path(),
		"Project.md",
		"---\n_type: Type\n_visible: true\n---\n\n# Project\n",
	);
	seed(&mut idx, tmp.path(), "m1.md", "---\n_type: Project\n---\n\n# M1\n");

	let (updated, _) = propagate_type_rename_inner(&mut idx, "Project", "Initiative");

	assert_eq!(updated, 1);
	assert_eq!(
		fs::read_to_string(&other).unwrap(),
		"---\n_type: Task\n---\n\n# Other\n"
	);
	assert_eq!(
		fs::read_to_string(&def).unwrap(),
		"---\n_type: Type\n_visible: true\n---\n\n# Project\n"
	);
	assert_eq!(idx.entries()[&other].is_a.as_deref(), Some("Task"));
}

#[test]
fn returns_zero_when_no_members_exist() {
	let tmp = tempdir().expect("tmpdir");
	let mut idx = VaultIndex::default();
	seed(&mut idx, tmp.path(), "other.md", "---\n_type: Task\n---\n");

	let (updated, last) = propagate_type_rename_inner(&mut idx, "Project", "Initiative");

	assert_eq!(updated, 0);
	assert!(last.is_none());
}

#[test]
fn continues_past_write_failures_and_counts_only_successes() {
	let tmp = tempdir().expect("tmpdir");
	let mut idx = VaultIndex::default();
	let locked = seed(&mut idx, tmp.path(), "locked.md", "---\n_type: Project\n---\n");
	let ok = seed(&mut idx, tmp.path(), "ok.md", "---\n_type: Project\n---\n");

	let mut perms = fs::metadata(&locked).expect("meta").permissions();
	perms.set_readonly(true);
	fs::set_permissions(&locked, perms).expect("chmod");

	let (updated, last) = propagate_type_rename_inner(&mut idx, "Project", "Initiative");

	assert_eq!(updated, 1);
	assert!(last.is_some());
	assert_eq!(fs::read_to_string(&ok).unwrap(), "---\n_type: Initiative\n---\n");
	assert_eq!(fs::read_to_string(&locked).unwrap(), "---\n_type: Project\n---\n");
	// The skipped file's index entry must stay consistent with its disk state.
	assert_eq!(idx.entries()[&locked].is_a.as_deref(), Some("Project"));

	// Restore permissions so the tempdir can be cleaned up.
	let mut perms = fs::metadata(&locked).expect("meta").permissions();
	#[allow(clippy::permissions_set_readonly_false)]
	perms.set_readonly(false);
	fs::set_permissions(&locked, perms).ok();
}

#[test]
fn skips_files_deleted_from_disk_but_still_indexed() {
	let tmp = tempdir().expect("tmpdir");
	let mut idx = VaultIndex::default();
	let m1 = seed(&mut idx, tmp.path(), "m1.md", "---\n_type: Project\n---\n");
	fs::remove_file(&m1).expect("remove");

	let (updated, last) = propagate_type_rename_inner(&mut idx, "Project", "Initiative");

	assert_eq!(updated, 0);
	assert!(last.is_none());
}
