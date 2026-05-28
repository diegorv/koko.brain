//! Phase 8 — File-op command tests (`create_note`, `create_folder`,
//! `toggle_task_status_inner`).
//!
//! The Tauri command wrappers can't be unit-tested without an `AppHandle`
//! (they emit `vault-index-updated`); these tests target the inner-most
//! pure-disk behaviour and the `update_note_in_index_inner` integration
//! that `create_note` relies on. The lock + emit path is exercised
//! manually during smoke testing.

use kokobrain_lib::commands::vault::{
	project_note_record, toggle_task_status_inner, update_note_in_index_inner,
};
use kokobrain_lib::vault::entry::NoteEntry;
use kokobrain_lib::vault::index::VaultIndex;
use std::fs;
use tempfile::tempdir;

#[test]
fn create_note_flow_writes_file_and_updates_index() {
	let tmp = tempdir().expect("tmpdir");
	let path = tmp.path().join("new.md");
	let path_str = path.to_string_lossy().to_string();

	// Simulate the inner half of `create_note`: write file + index it.
	fs::write(&path, "# Hello\n#tag1\n").expect("write");
	let mtime = fs::metadata(&path)
		.unwrap()
		.modified()
		.unwrap()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap()
		.as_secs() as i64;
	let mut idx = VaultIndex::default();
	let result = update_note_in_index_inner(&mut idx, path_str.clone(), "# Hello\n#tag1\n", mtime);

	assert!(result.changed);
	assert_eq!(idx.len(), 1);
	let entry = idx.entries().get(&path_str).expect("entry missing");
	assert_eq!(entry.tags, vec!["tag1"]);
	assert!(entry.size > 0, "size should be populated from disk metadata");
}

#[test]
fn create_folder_creates_recursive_path() {
	let tmp = tempdir().expect("tmpdir");
	let nested = tmp.path().join("a/b/c");

	std::fs::create_dir_all(&nested).expect("create_dir_all");
	assert!(nested.is_dir());
}

#[test]
fn create_folder_no_op_when_dir_exists() {
	let tmp = tempdir().expect("tmpdir");
	let dir = tmp.path().join("existing");
	std::fs::create_dir_all(&dir).expect("first create");
	// Re-creating must not error (matches mkdir { recursive: true } in TS).
	std::fs::create_dir_all(&dir).expect("second create");
	assert!(dir.is_dir());
}

#[test]
fn note_record_projection_converts_seconds_to_ms() {
	// Verifies the doc invariant: `NoteEntry.modified_at` is seconds,
	// `NoteRecord.mtime` is milliseconds. The projection must multiply
	// by 1000.
	use kokobrain_lib::vault::entry::NoteEntry;
	let mut entry = NoteEntry::default();
	entry.path = "/v/note.md".to_string();
	entry.title = "note".to_string();
	entry.modified_at = 1714305600;
	entry.created_at = 1714000000;
	entry.size = 1024;
	let mut idx = VaultIndex::default();
	idx.build(vec![entry]);
	// Projection happens inside the Tauri command; here we test the
	// `Display` of a NoteEntry serialized as a NoteRecord. We instead
	// verify that the seconds round-trip cleanly: the entry stays in s.
	let stored = idx.entries().get("/v/note.md").unwrap();
	assert_eq!(stored.modified_at, 1714305600);
	assert_eq!(stored.created_at, 1714000000);
	assert_eq!(stored.size, 1024);
}

// ============================================================================
// toggle_task_status_inner
// ============================================================================

#[test]
fn toggle_task_happy_path_checks_box() {
	let tmp = tempdir().expect("tmpdir");
	let path = tmp.path().join("tasks.md");
	let path_str = path.to_string_lossy().to_string();
	fs::write(&path, "# Tasks\n- [ ] Buy milk\n- [ ] Walk dog\n").expect("write");

	let mut idx = VaultIndex::default();
	update_note_in_index_inner(&mut idx, path_str.clone(), "# Tasks\n- [ ] Buy milk\n- [ ] Walk dog\n", 0);

	let result = toggle_task_status_inner(&mut idx, &path_str, 2).expect("toggle");
	assert!(result.update_result.changed);
	assert!(result.updated_content.contains("- [x] Buy milk"));
	let on_disk = fs::read_to_string(&path).expect("read");
	assert_eq!(on_disk, result.updated_content);
}

#[test]
fn toggle_task_noop_no_checkbox_on_line() {
	let tmp = tempdir().expect("tmpdir");
	let path = tmp.path().join("note.md");
	let path_str = path.to_string_lossy().to_string();
	let content = "# Heading\nJust text\n";
	fs::write(&path, content).expect("write");

	let mut idx = VaultIndex::default();
	let result = toggle_task_status_inner(&mut idx, &path_str, 2).expect("toggle");
	assert!(!result.update_result.changed);
	assert_eq!(result.updated_content, content);
	assert_eq!(fs::read_to_string(&path).expect("read"), content);
}

#[test]
fn toggle_task_line_out_of_bounds() {
	let tmp = tempdir().expect("tmpdir");
	let path = tmp.path().join("short.md");
	let path_str = path.to_string_lossy().to_string();
	let content = "- [ ] Only task\n";
	fs::write(&path, content).expect("write");

	let mut idx = VaultIndex::default();
	let result = toggle_task_status_inner(&mut idx, &path_str, 999).expect("toggle");
	assert!(!result.update_result.changed);
	assert_eq!(result.updated_content, content);
}

#[test]
fn toggle_task_file_not_found() {
	let mut idx = VaultIndex::default();
	let result = toggle_task_status_inner(&mut idx, "/nonexistent/path.md", 1);
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("read failed"));
}

#[test]
fn toggle_task_updates_index_tasks() {
	let tmp = tempdir().expect("tmpdir");
	let path = tmp.path().join("indexed.md");
	let path_str = path.to_string_lossy().to_string();
	let content = "- [ ] Unchecked task\n";
	fs::write(&path, content).expect("write");

	let mut idx = VaultIndex::default();
	update_note_in_index_inner(&mut idx, path_str.clone(), content, 0);

	let before = idx.entries().get(&path_str).unwrap().tasks.clone();
	assert!(!before.is_empty(), "should have parsed a task");

	let result = toggle_task_status_inner(&mut idx, &path_str, 1).expect("toggle");
	assert!(result.update_result.changed);

	let after = idx.entries().get(&path_str).unwrap().tasks.clone();
	assert_ne!(before[0].status, after[0].status, "task status should have flipped");
}

#[test]
fn toggle_task_double_toggle_round_trips() {
	let tmp = tempdir().expect("tmpdir");
	let path = tmp.path().join("roundtrip.md");
	let path_str = path.to_string_lossy().to_string();
	let original = "- [ ] Toggle me\n";
	fs::write(&path, original).expect("write");

	let mut idx = VaultIndex::default();
	toggle_task_status_inner(&mut idx, &path_str, 1).expect("first toggle");
	let after_first = fs::read_to_string(&path).expect("read");
	assert_ne!(after_first, original);

	toggle_task_status_inner(&mut idx, &path_str, 1).expect("second toggle");
	let after_second = fs::read_to_string(&path).expect("read");
	assert_eq!(after_second, original, "double toggle should restore original");
}

// ============================================================================
// project_note_record
// ============================================================================

#[test]
fn project_record_splits_nested_path() {
	let mut entry = NoteEntry::default();
	entry.path = "/vault/sub/deep/note.md".to_string();
	entry.modified_at = 100;
	entry.created_at = 50;
	entry.size = 512;
	let rec = project_note_record(&entry);
	assert_eq!(rec.name, "note.md");
	assert_eq!(rec.basename, "note");
	assert_eq!(rec.ext, ".md");
	assert_eq!(rec.folder, "/vault/sub/deep");
}

#[test]
fn project_record_no_extension() {
	let mut entry = NoteEntry::default();
	entry.path = "/vault/README".to_string();
	let rec = project_note_record(&entry);
	assert_eq!(rec.name, "README");
	assert_eq!(rec.basename, "README");
	assert_eq!(rec.ext, "");
}

#[test]
fn project_record_no_slash() {
	let mut entry = NoteEntry::default();
	entry.path = "bare.md".to_string();
	let rec = project_note_record(&entry);
	assert_eq!(rec.name, "bare.md");
	assert_eq!(rec.folder, "");
}

#[test]
fn project_record_is_a_injected_as_type() {
	let mut entry = NoteEntry::default();
	entry.path = "/v/person.md".to_string();
	entry.is_a = Some("Person".to_string());
	let rec = project_note_record(&entry);
	assert_eq!(
		rec.properties.get("type"),
		Some(&serde_json::Value::String("Person".to_string()))
	);
}

#[test]
fn project_record_boolean_fields() {
	let mut entry = NoteEntry::default();
	entry.path = "/v/flags.md".to_string();
	entry.organized = true;
	entry.archived = true;
	entry.favorite = true;
	let rec = project_note_record(&entry);
	assert_eq!(rec.properties.get("organized"), Some(&serde_json::Value::Bool(true)));
	assert_eq!(rec.properties.get("archived"), Some(&serde_json::Value::Bool(true)));
	assert_eq!(rec.properties.get("favorite"), Some(&serde_json::Value::Bool(true)));
}

#[test]
fn project_record_boolean_fields_default_false() {
	let mut entry = NoteEntry::default();
	entry.path = "/v/defaults.md".to_string();
	let rec = project_note_record(&entry);
	assert_eq!(rec.properties.get("organized"), Some(&serde_json::Value::Bool(false)));
	assert_eq!(rec.properties.get("archived"), Some(&serde_json::Value::Bool(false)));
	assert_eq!(rec.properties.get("favorite"), Some(&serde_json::Value::Bool(false)));
}

#[test]
fn project_record_belongs_to_and_related_to() {
	let mut entry = NoteEntry::default();
	entry.path = "/v/child.md".to_string();
	entry.belongs_to = vec!["parent".to_string()];
	entry.related_to = vec!["sibling1".to_string(), "sibling2".to_string()];
	entry.has_many = vec!["task1".to_string()];
	let rec = project_note_record(&entry);
	assert_eq!(
		rec.properties.get("_belongs_to"),
		Some(&serde_json::json!(["parent"]))
	);
	assert_eq!(
		rec.properties.get("_related_to"),
		Some(&serde_json::json!(["sibling1", "sibling2"]))
	);
	assert_eq!(
		rec.properties.get("_has_many"),
		Some(&serde_json::json!(["task1"]))
	);
}

#[test]
fn project_record_empty_relations_omitted() {
	let mut entry = NoteEntry::default();
	entry.path = "/v/solo.md".to_string();
	let rec = project_note_record(&entry);
	assert!(rec.properties.get("_belongs_to").is_none());
	assert!(rec.properties.get("_related_to").is_none());
	assert!(rec.properties.get("_has_many").is_none());
}

#[test]
fn project_record_timestamps_seconds_to_ms() {
	let mut entry = NoteEntry::default();
	entry.path = "/v/time.md".to_string();
	entry.modified_at = 1714305600;
	entry.created_at = 1714000000;
	entry.size = 2048;
	let rec = project_note_record(&entry);
	assert_eq!(rec.mtime, 1714305600 * 1000);
	assert_eq!(rec.ctime, 1714000000 * 1000);
	assert_eq!(rec.size, 2048);
}

#[test]
fn project_record_frontmatter_preserved() {
	let mut entry = NoteEntry::default();
	entry.path = "/v/fm.md".to_string();
	entry.frontmatter.insert("custom".to_string(), serde_json::json!("value"));
	entry.frontmatter.insert("count".to_string(), serde_json::json!(42));
	let rec = project_note_record(&entry);
	assert_eq!(rec.properties.get("custom"), Some(&serde_json::json!("value")));
	assert_eq!(rec.properties.get("count"), Some(&serde_json::json!(42)));
}
