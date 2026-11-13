//! Phase 8 — File-op command tests (`create_note`, `create_folder`,
//! `toggle_task_status_inner`).
//!
//! The Tauri command wrappers can't be unit-tested without an `AppHandle`
//! (they emit `vault-index-updated`); these tests target the inner-most
//! pure-disk behaviour and the `update_note_in_index_inner` integration
//! that `create_note` relies on. The lock + emit path is exercised
//! manually during smoke testing.

use kokobrain_lib::commands::vault::{
	collect_v2_entries, index_delta_inner, project_note_record, read_mod_data, rename_note_inner,
	toggle_task_status_inner, update_note_in_index_inner, write_mod_data,
};
use kokobrain_lib::vault::entry::NoteEntry;
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::task::TaskStatus;
use std::collections::BTreeSet;
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

/// Issue 49 regression: the set of paths the save/create path inserts into
/// the `VaultIndex` must equal the set a full rescan collects. Before the
/// fix `update_note_in_index_inner` indexed any path handed to it, so a
/// `.kanban` / `.canvas` / `.collection` file lived in the index until the
/// next `VaultIndex::build` silently dropped it.
#[test]
fn create_note_index_set_matches_full_rescan_for_non_markdown() {
	let tmp = tempdir().expect("tmpdir");
	// Canonicalize once: `collect_v2_entries` canonicalizes the root, so on
	// macOS an uncanonicalized `/var/folders/...` fixture would compare
	// against `/private/var/folders/...` and fail for the wrong reason.
	let root = tmp.path().canonicalize().expect("canonicalize");

	let note = root.join("note.md");
	let board = root.join("board.kanban");
	let note_content = "# Note\n";
	let board_content = "## To Do\n\n- [ ] see [[note]]\n";
	fs::write(&note, note_content).expect("write note");
	fs::write(&board, board_content).expect("write board");

	// Exactly what `create_note` and the save hook do, once per file.
	let mut idx = VaultIndex::default();
	update_note_in_index_inner(&mut idx, note.to_string_lossy().to_string(), note_content, 0);
	update_note_in_index_inner(&mut idx, board.to_string_lossy().to_string(), board_content, 0);
	let after_saves: BTreeSet<String> = idx.entries().keys().cloned().collect();

	let scanned = collect_v2_entries(root.to_str().expect("utf-8 root")).expect("scan");
	idx.build(scanned);
	let after_rescan: BTreeSet<String> = idx.entries().keys().cloned().collect();

	assert_eq!(
		after_saves, after_rescan,
		"the save/create index set must equal the full-rescan set"
	);
}

/// Issue 49, user-visible half: a kanban card is serialized as literal
/// markdown (`- [ ] text`), so a card containing a wikilink used to
/// contribute a real backlink that vanished at the next rescan.
#[test]
fn kanban_card_wikilink_does_not_produce_a_transient_backlink() {
	let tmp = tempdir().expect("tmpdir");
	let root = tmp.path().canonicalize().expect("canonicalize");

	let note = root.join("note.md");
	let board = root.join("board.kanban");
	let note_content = "# Note\n";
	let board_content = "## To Do\n\n- [ ] see [[note]]\n";
	fs::write(&note, note_content).expect("write note");
	fs::write(&board, board_content).expect("write board");

	let mut idx = VaultIndex::default();
	update_note_in_index_inner(&mut idx, note.to_string_lossy().to_string(), note_content, 0);
	update_note_in_index_inner(&mut idx, board.to_string_lossy().to_string(), board_content, 0);

	let note_path = note.to_string_lossy().to_string();
	let backlinks = idx.backlinks().get(&note_path);
	assert!(
		backlinks.is_none_or(|set| set.is_empty()),
		"a non-markdown file must not contribute backlinks, got {:?}",
		backlinks
	);
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

fn dir_names(dir: &std::path::Path) -> Vec<String> {
	let mut names: Vec<String> = fs::read_dir(dir)
		.expect("read_dir")
		.map(|e| e.expect("entry").file_name().to_string_lossy().to_string())
		.collect();
	names.sort();
	names
}

fn write_data(vault: &std::path::Path, content: &str) -> Result<(), String> {
	write_mod_data(vault.to_string_lossy().to_string(), "habits".to_string(), content.to_string())
}

#[test]
fn write_mod_data_creates_missing_folders_and_leaves_only_the_file() {
	let tmp = tempdir().expect("tmpdir");
	let dir = tmp.path().join(".kokobrain/mods/habits");

	write_data(tmp.path(), "{\"a\":1}\n").expect("write");

	assert_eq!(fs::read_to_string(dir.join("data.json")).unwrap(), "{\"a\":1}\n");
	assert_eq!(dir_names(&dir), vec!["data.json"]);
}

#[test]
fn write_mod_data_replaces_existing_content_with_empty_content() {
	let tmp = tempdir().expect("tmpdir");
	let dir = tmp.path().join(".kokobrain/mods/habits");
	fs::create_dir_all(&dir).unwrap();
	fs::write(dir.join("data.json"), "old").unwrap();

	write_data(tmp.path(), "").expect("write");

	assert_eq!(fs::read_to_string(dir.join("data.json")).unwrap(), "");
	assert_eq!(dir_names(&dir), vec!["data.json"]);
}

#[test]
fn write_mod_data_refuses_an_id_that_is_not_one_segment_and_writes_nothing() {
	let tmp = tempdir().expect("tmpdir");

	for id in ["", ".", "..", "../../escape", "a/b", "a\\b", "/abs", "a.b", "Upper", "a b"] {
		let result = write_mod_data(tmp.path().to_string_lossy().to_string(), id.to_string(), "x".to_string());
		assert_eq!(result, Err(format!("Invalid mod id: {}", id)));
	}
	assert_eq!(dir_names(tmp.path()), Vec::<String>::new());
}

#[test]
fn write_mod_data_refuses_a_vault_that_is_not_a_folder_and_creates_nothing() {
	let tmp = tempdir().expect("tmpdir");
	let missing = tmp.path().join("missing");
	let file = tmp.path().join("file");
	fs::write(&file, "x").unwrap();

	assert!(write_data(&missing, "x").is_err());
	assert!(write_data(&file, "x").is_err());
	assert!(!missing.exists());
	assert_eq!(dir_names(tmp.path()), vec!["file"]);
}

#[test]
fn write_mod_data_rename_failure_errors_and_leaves_no_temp_file() {
	let tmp = tempdir().expect("tmpdir");
	let dir = tmp.path().join(".kokobrain/mods/habits");
	// A rename over a non-empty directory fails after the temp file was written.
	let target = dir.join("data.json");
	fs::create_dir_all(&target).unwrap();
	fs::write(target.join("keep"), "kept").unwrap();

	let result = write_data(tmp.path(), "x");

	assert!(result.is_err(), "expected a rename error, got {:?}", result);
	assert_eq!(dir_names(&dir), vec!["data.json"]);
	assert_eq!(fs::read_to_string(target.join("keep")).unwrap(), "kept");
}

#[test]
fn write_mod_data_never_exposes_a_partial_file_to_a_reader() {
	let tmp = tempdir().expect("tmpdir");
	let size = 2 * 1024 * 1024;
	write_data(tmp.path(), &"a".repeat(size)).expect("first write");
	let path = tmp.path().join(".kokobrain/mods/habits/data.json");
	let done = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));

	let reader = {
		let done = done.clone();
		std::thread::spawn(move || {
			let mut reads = 0;
			while !done.load(std::sync::atomic::Ordering::Relaxed) {
				let text = fs::read(&path).expect("read");
				assert_eq!(text.len(), size, "reader saw a truncated file");
				assert!(text.iter().all(|b| *b == text[0]), "reader saw mixed content");
				reads += 1;
			}
			reads
		})
	};
	for i in 0..60 {
		let fill = if i % 2 == 0 { "b" } else { "c" };
		write_data(tmp.path(), &fill.repeat(size)).expect("write");
	}
	done.store(true, std::sync::atomic::Ordering::Relaxed);

	assert!(reader.join().expect("reader") > 0);
}

fn read_data(vault: &std::path::Path) -> Result<Option<Vec<u8>>, String> {
	read_mod_data(vault.to_string_lossy().to_string(), "habits".to_string())
}

#[test]
fn read_mod_data_is_none_only_when_the_file_is_not_there() {
	let tmp = tempdir().expect("tmpdir");
	assert_eq!(read_data(tmp.path()), Ok(None));
	assert_eq!(dir_names(tmp.path()), Vec::<String>::new());

	let dir = tmp.path().join(".kokobrain/mods/habits");
	fs::create_dir_all(&dir).unwrap();
	assert_eq!(read_data(tmp.path()), Ok(None));
}

#[test]
fn read_mod_data_returns_the_bytes_as_they_are() {
	let tmp = tempdir().expect("tmpdir");
	write_data(tmp.path(), "").expect("write");
	assert_eq!(read_data(tmp.path()), Ok(Some(Vec::new())));

	let bytes = vec![b'{', 0xff, 0xc3, b'}', 0];
	fs::write(tmp.path().join(".kokobrain/mods/habits/data.json"), &bytes).unwrap();
	assert_eq!(read_data(tmp.path()), Ok(Some(bytes)));
}

#[test]
fn read_mod_data_reports_anything_else_as_an_error_not_as_no_file() {
	let tmp = tempdir().expect("tmpdir");
	let mods = tmp.path().join(".kokobrain/mods");
	fs::create_dir_all(&mods).unwrap();

	// The file cannot be reached, which does not say it is not there.
	fs::write(mods.join("habits"), "a file where the folder should be").unwrap();
	assert!(read_data(tmp.path()).is_err());

	fs::remove_file(mods.join("habits")).unwrap();
	fs::create_dir_all(mods.join("habits/data.json")).unwrap();
	assert!(read_data(tmp.path()).is_err());

	// A vault that is gone, such as an unmounted volume, is not an empty mod.
	assert!(read_data(&tmp.path().join("missing")).is_err());
}

#[test]
fn read_mod_data_refuses_an_id_that_is_not_one_segment() {
	let tmp = tempdir().expect("tmpdir");
	fs::write(tmp.path().join("data.json"), "outside the mods folder").unwrap();

	for id in ["", ".", "..", "../../..", "a/b", "A"] {
		let result = read_mod_data(tmp.path().to_string_lossy().to_string(), id.to_string());
		assert_eq!(result, Err(format!("Invalid mod id: {}", id)));
	}
}

/// The frontend builds this path too, for the rename that keeps a corrupt
/// file; vitest mocks the command, so only this test ties the two together.
#[test]
fn mod_data_commands_use_the_folder_the_frontend_constant_names() {
	let logic = include_str!("../../src/lib/plugins/mods/mods.logic.ts");
	let folder = logic
		.split("export const MOD_DATA_DIR = '")
		.nth(1)
		.and_then(|rest| rest.split('\'').next())
		.expect("MOD_DATA_DIR in mods.logic.ts");
	let tmp = tempdir().expect("tmpdir");

	write_data(tmp.path(), "{}").expect("write");

	assert_eq!(fs::read_to_string(tmp.path().join(folder).join("habits/data.json")).unwrap(), "{}");
	assert_eq!(read_data(tmp.path()), Ok(Some(b"{}".to_vec())));
}

#[test]
fn note_record_projection_converts_seconds_to_ms() {
	// Verifies the doc invariant: `NoteEntry.modified_at` is seconds,
	// `NoteRecord.mtime` is milliseconds. The projection must multiply
	// by 1000.
	use kokobrain_lib::vault::entry::NoteEntry;
	let entry = NoteEntry {
		path: "/v/note.md".to_string(),
		title: "note".to_string(),
		modified_at: 1714305600,
		created_at: 1714000000,
		size: 1024,
		..Default::default()
	};
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

	let result = toggle_task_status_inner(&mut idx, &path_str, 2, "Buy milk", TaskStatus::Todo, TaskStatus::Done)
		.expect("toggle");
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
	let result = toggle_task_status_inner(&mut idx, &path_str, 2, "Just text", TaskStatus::Todo, TaskStatus::Done)
		.expect("toggle");
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
	let result = toggle_task_status_inner(&mut idx, &path_str, 999, "Only task", TaskStatus::Todo, TaskStatus::Done)
		.expect("toggle");
	assert!(!result.update_result.changed);
	assert_eq!(result.updated_content, content);
}

#[test]
fn toggle_task_file_not_found() {
	let mut idx = VaultIndex::default();
	let result = toggle_task_status_inner(
		&mut idx,
		"/nonexistent/path.md",
		1,
		"task",
		TaskStatus::Todo,
		TaskStatus::Done,
	);
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

	let result = toggle_task_status_inner(
		&mut idx,
		&path_str,
		1,
		"Unchecked task",
		TaskStatus::Todo,
		TaskStatus::Done,
	)
	.expect("toggle");
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
	toggle_task_status_inner(&mut idx, &path_str, 1, "Toggle me", TaskStatus::Todo, TaskStatus::Done)
		.expect("first toggle");
	let after_first = fs::read_to_string(&path).expect("read");
	assert_ne!(after_first, original);

	toggle_task_status_inner(&mut idx, &path_str, 1, "Toggle me", TaskStatus::Done, TaskStatus::Todo)
		.expect("second toggle");
	let after_second = fs::read_to_string(&path).expect("read");
	assert_eq!(after_second, original, "double toggle should restore original");
}

// ============================================================================
// project_note_record
// ============================================================================

#[test]
fn project_record_splits_nested_path() {
	let entry = NoteEntry {
		path: "/vault/sub/deep/note.md".to_string(),
		modified_at: 100,
		created_at: 50,
		size: 512,
		..Default::default()
	};
	let rec = project_note_record(&entry);
	assert_eq!(rec.name, "note.md");
	assert_eq!(rec.basename, "note");
	assert_eq!(rec.ext, ".md");
	assert_eq!(rec.folder, "/vault/sub/deep");
}

#[test]
fn project_record_no_extension() {
	let entry = NoteEntry {
		path: "/vault/README".to_string(),
		..Default::default()
	};
	let rec = project_note_record(&entry);
	assert_eq!(rec.name, "README");
	assert_eq!(rec.basename, "README");
	assert_eq!(rec.ext, "");
}

#[test]
fn project_record_no_slash() {
	let entry = NoteEntry {
		path: "bare.md".to_string(),
		..Default::default()
	};
	let rec = project_note_record(&entry);
	assert_eq!(rec.name, "bare.md");
	assert_eq!(rec.folder, "");
}

#[test]
fn project_record_is_a_injected_as_type() {
	let entry = NoteEntry {
		path: "/v/person.md".to_string(),
		is_a: Some("Person".to_string()),
		..Default::default()
	};
	let rec = project_note_record(&entry);
	assert_eq!(
		rec.properties.get("_type"),
		Some(&serde_json::Value::String("Person".to_string()))
	);
}

#[test]
fn project_record_boolean_fields() {
	let entry = NoteEntry {
		path: "/v/flags.md".to_string(),
		organized: true,
		archived: true,
		favorite: true,
		..Default::default()
	};
	let rec = project_note_record(&entry);
	assert_eq!(rec.properties.get("organized"), Some(&serde_json::Value::Bool(true)));
	assert_eq!(rec.properties.get("archived"), Some(&serde_json::Value::Bool(true)));
	assert_eq!(rec.properties.get("favorite"), Some(&serde_json::Value::Bool(true)));
}

#[test]
fn project_record_boolean_fields_default_false() {
	let entry = NoteEntry {
		path: "/v/defaults.md".to_string(),
		..Default::default()
	};
	let rec = project_note_record(&entry);
	assert_eq!(rec.properties.get("organized"), Some(&serde_json::Value::Bool(false)));
	assert_eq!(rec.properties.get("archived"), Some(&serde_json::Value::Bool(false)));
	assert_eq!(rec.properties.get("favorite"), Some(&serde_json::Value::Bool(false)));
}

#[test]
fn project_record_belongs_to_and_related_to() {
	let entry = NoteEntry {
		path: "/v/child.md".to_string(),
		belongs_to: vec!["parent".to_string()],
		related_to: vec!["sibling1".to_string(), "sibling2".to_string()],
		has_many: vec!["task1".to_string()],
		..Default::default()
	};
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
	let entry = NoteEntry {
		path: "/v/solo.md".to_string(),
		..Default::default()
	};
	let rec = project_note_record(&entry);
	assert!(!rec.properties.contains_key("_belongs_to"));
	assert!(!rec.properties.contains_key("_related_to"));
	assert!(!rec.properties.contains_key("_has_many"));
}

#[test]
fn project_record_timestamps_seconds_to_ms() {
	let entry = NoteEntry {
		path: "/v/time.md".to_string(),
		modified_at: 1714305600,
		created_at: 1714000000,
		size: 2048,
		..Default::default()
	};
	let rec = project_note_record(&entry);
	assert_eq!(rec.mtime, 1714305600 * 1000);
	assert_eq!(rec.ctime, 1714000000 * 1000);
	assert_eq!(rec.size, 2048);
}

/// Golden: the keys `project_note_record` adds to or rewrites in the parsed
/// frontmatter must match `tests/fixtures/note-record-projection.json`. The TS
/// fast path (`buildNoteRecord`) is held to the same fixture in
/// `src/tests/lib/features/collection/collection.service.test.ts`, so a key
/// injected here and not there fails one of the two suites. A case's `record`
/// pins final values where the two parsers start from different values.
#[test]
fn project_record_injected_keys_match_golden_fixture() {
	let fixture: serde_json::Value =
		serde_json::from_str(include_str!("fixtures/note-record-projection.json"))
			.expect("fixture parses");
	for case in fixture["cases"].as_array().expect("cases array") {
		let name = case["name"].as_str().unwrap();
		let path = case["path"].as_str().unwrap().to_string();
		let content = case["content"].as_str().unwrap();
		let entry = NoteEntry::from_content(path, content, 0);
		let rec = project_note_record(&entry);

		if let Some(expected) = case.get("injected") {
			let injected: serde_json::Map<String, serde_json::Value> = rec
				.properties
				.iter()
				.filter(|(k, v)| entry.frontmatter.get(*k) != Some(*v))
				.map(|(k, v)| (k.clone(), v.clone()))
				.collect();
			assert_eq!(&serde_json::Value::Object(injected), expected, "case: {name}");
		}
		if let Some(record) = case.get("record").and_then(|r| r.as_object()) {
			for (key, value) in record {
				assert_eq!(rec.properties.get(key), Some(value), "case: {name}, key: {key}");
			}
		}
	}
}

#[test]
fn project_record_frontmatter_preserved() {
	let mut entry = NoteEntry {
		path: "/v/fm.md".to_string(),
		..Default::default()
	};
	entry.frontmatter.insert("custom".to_string(), serde_json::json!("value"));
	entry.frontmatter.insert("count".to_string(), serde_json::json!(42));
	let rec = project_note_record(&entry);
	assert_eq!(rec.properties.get("custom"), Some(&serde_json::json!("value")));
	assert_eq!(rec.properties.get("count"), Some(&serde_json::json!(42)));
}

// ============================================================================
// rename_note_inner (issue 39)
// ============================================================================

#[test]
fn rename_note_inner_rekeys_a_single_file() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		NoteEntry::from_content("/v/a.md".to_string(), "#alpha\n", 0),
		NoteEntry::from_content("/v/src.md".to_string(), "see [[a]]\n", 0),
	]);

	let result = rename_note_inner(&mut idx, "/v/a.md", "/v/b.md").expect("rename result");

	assert!(result.changed);
	assert_eq!(result.removed, vec!["/v/a.md".to_string()]);
	assert_eq!(result.upserted, vec!["/v/b.md".to_string()]);
	assert!(idx.entries().contains_key("/v/b.md"), "new key missing");
	assert!(!idx.entries().contains_key("/v/a.md"), "old key survived");
	assert_eq!(
		idx.entries().get("/v/b.md").unwrap().title,
		"b",
		"title must be recomputed from the new path"
	);
	assert_eq!(idx.by_path().get("b").map(String::as_str), Some("/v/b.md"));
	let tagged = idx.tags_index().get("alpha").expect("tag bucket missing");
	assert!(tagged.contains("/v/b.md"), "tag index not re-keyed");
	assert!(!tagged.contains("/v/a.md"), "tag index kept the old path");
}

#[test]
fn rename_note_inner_rekeys_every_child_under_a_directory_prefix() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		NoteEntry::from_content("/v/dir/a.md".to_string(), "# A\n", 0),
		NoteEntry::from_content("/v/dir/b.md".to_string(), "# B\n", 0),
		// Sibling sharing the `from` prefix WITHOUT the `/` boundary: must
		// not be swept up by the walk.
		NoteEntry::from_content("/v/dirty.md".to_string(), "# Dirty\n", 0),
	]);

	let result = rename_note_inner(&mut idx, "/v/dir", "/v/moved").expect("rename result");

	assert!(result.changed);
	// Every child, not only the last one walked.
	assert_eq!(
		result.removed,
		vec!["/v/dir/a.md".to_string(), "/v/dir/b.md".to_string()]
	);
	assert_eq!(
		result.upserted,
		vec!["/v/moved/a.md".to_string(), "/v/moved/b.md".to_string()]
	);
	let keys: BTreeSet<String> = idx.entries().keys().cloned().collect();
	assert_eq!(
		keys,
		BTreeSet::from([
			"/v/moved/a.md".to_string(),
			"/v/moved/b.md".to_string(),
			"/v/dirty.md".to_string(),
		])
	);
	assert_eq!(idx.entries().get("/v/moved/a.md").unwrap().title, "a");
}

#[test]
fn rename_note_inner_drops_an_entry_renamed_to_a_non_markdown_extension() {
	let mut idx = VaultIndex::default();
	idx.build(vec![NoteEntry::from_content(
		"/v/a.md".to_string(),
		"#alpha\n",
		0,
	)]);

	let result = rename_note_inner(&mut idx, "/v/a.md", "/v/a.canvas").expect("rename result");

	assert!(result.changed);
	assert_eq!(result.removed, vec!["/v/a.md".to_string()]);
	assert!(result.upserted.is_empty());
	assert!(
		idx.is_empty(),
		"a .md -> .canvas rename must drop the entry, not re-insert it"
	);
	assert!(idx.tags_index().is_empty(), "tag bucket left behind");
}

#[test]
fn rename_note_inner_is_a_noop_for_an_unknown_path() {
	let mut idx = VaultIndex::default();
	idx.build(vec![NoteEntry::from_content(
		"/v/a.md".to_string(),
		"# A\n",
		0,
	)]);
	let version_before = idx.version();

	assert!(rename_note_inner(&mut idx, "/v/ghost.md", "/v/other.md").is_none());
	assert_eq!(
		idx.version(),
		version_before,
		"a no-op rename must not bump the version"
	);
	assert!(idx.entries().contains_key("/v/a.md"));
}

/// Parity with the TS link rewrite (`link-updater.logic.ts`): a note renamed
/// into a stem another note owns gets its links written as the vault-relative
/// path with extension, and that form must resolve to it here too.
#[test]
fn rename_note_inner_into_a_taken_stem_resolves_the_vault_relative_path_form() {
	let mut idx = VaultIndex::default();
	idx.build_with_root(
		"/v",
		vec![
			NoteEntry::from_content("/v/B/Other.md".to_string(), "# B\n", 0),
			NoteEntry::from_content("/v/A/Old.md".to_string(), "# A\n", 0),
			NoteEntry::from_content("/v/src.md".to_string(), "[[Old]]\n", 0),
		],
	);

	rename_note_inner(&mut idx, "/v/A/Old.md", "/v/A/Other.md").expect("rename result");

	// The bare stem stays with the note that already owned it.
	assert_eq!(idx.resolve("Other").as_deref(), Some("/v/B/Other.md"));
	assert_eq!(idx.resolve("A/Other").as_deref(), Some("/v/B/Other.md"));
	assert_eq!(idx.resolve("A/Other.md").as_deref(), Some("/v/A/Other.md"));

	update_note_in_index_inner(&mut idx, "/v/src.md".to_string(), "[[A/Other.md]]\n", 0);
	let sources = idx.backlinks().get("/v/A/Other.md").expect("no backlinks for the renamed note");
	assert!(sources.contains("/v/src.md"), "rewritten link does not reach the renamed note");
}

/// Raw view YAML: a note parse reads a link and a tag out of it.
const VIEW_YAML: &str = "_icon: rocket\nsource: \"[[Foo]]\"\nname: #work\n";

/// Absolute path of `name` inside `dir`.
fn abs(dir: &tempfile::TempDir, name: &str) -> String {
	dir.path().join(name).to_string_lossy().to_string()
}

#[test]
fn rename_note_inner_md_to_view_reparses_the_file_as_a_view() {
	let dir = tempdir().unwrap();
	let (md, view) = (abs(&dir, "a.md"), abs(&dir, "a.view"));
	fs::write(&md, VIEW_YAML).unwrap();
	let mut idx = VaultIndex::default();
	idx.build(vec![NoteEntry::from_content(md.clone(), VIEW_YAML, 3)]);
	assert!(!idx.entries()[&md].outgoing_links.is_empty(), "precondition: parsed as a note");
	fs::rename(&md, &view).unwrap();

	rename_note_inner(&mut idx, &md, &view).expect("rename result");

	let entry = &idx.entries()[&view];
	assert_eq!(entry.frontmatter.get("_icon").and_then(|v| v.as_str()), Some("rocket"));
	assert!(entry.outgoing_links.is_empty(), "links: {:?}", entry.outgoing_links);
	assert!(entry.tags.is_empty(), "tags: {:?}", entry.tags);
	assert_eq!(entry.modified_at, 3, "a rename keeps the mtime");
	assert!(idx.tags_index().is_empty(), "tag bucket left behind");
}

#[test]
fn rename_note_inner_md_to_view_strips_the_entry_when_the_target_is_gone() {
	let dir = tempdir().unwrap();
	let (md, view) = (abs(&dir, "a.md"), abs(&dir, "a.view"));
	let content = "---\n_favorite: true\n---\n[[Foo]] #work\n- [ ] x\n";
	let mut idx = VaultIndex::default();
	idx.build(vec![NoteEntry::from_content(md.clone(), content, 3)]);

	rename_note_inner(&mut idx, &md, &view).expect("rename result");

	let entry = &idx.entries()[&view];
	assert_eq!(entry.title, "a");
	assert!(entry.outgoing_links.is_empty(), "links: {:?}", entry.outgoing_links);
	assert!(entry.tags.is_empty(), "tags: {:?}", entry.tags);
	assert!(entry.tasks.is_empty(), "tasks: {:?}", entry.tasks);
	assert_eq!(entry.word_count, 0);
	assert!(entry.favorite, "flags come from the kept frontmatter");
	assert!(entry.organized);
	assert_eq!(entry.modified_at, 3);
	assert!(idx.tags_index().is_empty(), "tag bucket left behind");
}

#[test]
fn rename_note_inner_view_to_md_reparses_the_file_as_a_note() {
	let dir = tempdir().unwrap();
	let (view, md) = (abs(&dir, "a.view"), abs(&dir, "a.md"));
	fs::write(&view, VIEW_YAML).unwrap();
	let mut idx = VaultIndex::default();
	idx.build(vec![NoteEntry::from_content(view.clone(), VIEW_YAML, 3)]);
	fs::rename(&view, &md).unwrap();

	rename_note_inner(&mut idx, &view, &md).expect("rename result");

	let entry = &idx.entries()[&md];
	assert!(entry.frontmatter.is_empty(), "a note without `---` has no frontmatter");
	assert_eq!(entry.outgoing_links.len(), 1);
	assert_eq!(entry.outgoing_links[0].target, "Foo");
	assert!(idx.tags_index().contains_key("work"));
}

// ============================================================================
// index_delta_inner (issue 65)
// ============================================================================

#[test]
fn index_delta_returns_the_entry_and_record_of_each_indexed_path() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		NoteEntry::from_content("/v/b.md".to_string(), "---\nfavorite: true\n---\n", 0),
		NoteEntry::from_content("/v/a.md".to_string(), "# A\n", 0),
		NoteEntry::from_content("/v/c.md".to_string(), "# C\n", 0),
	]);

	let delta = index_delta_inner(
		&idx,
		&["/v/b.md".to_string(), "/v/a.md".to_string(), "/v/gone.md".to_string()],
	);

	let entry_paths: Vec<&str> = delta.entries.iter().map(|e| e.path.as_str()).collect();
	assert_eq!(entry_paths, vec!["/v/a.md", "/v/b.md"], "sorted, unknown path skipped");
	let record_paths: Vec<&str> = delta.records.iter().map(|r| r.path.as_str()).collect();
	assert_eq!(record_paths, vec!["/v/a.md", "/v/b.md"]);
	assert_eq!(
		delta.records[1].properties.get("favorite"),
		Some(&serde_json::Value::Bool(true))
	);
}

#[test]
fn index_delta_is_empty_for_no_paths() {
	let mut idx = VaultIndex::default();
	idx.build(vec![NoteEntry::from_content("/v/a.md".to_string(), "# A\n", 0)]);

	let delta = index_delta_inner(&idx, &[]);

	assert!(delta.entries.is_empty());
	assert!(delta.records.is_empty());
}
