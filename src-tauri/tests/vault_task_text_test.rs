//! Guarded task text writes located by line number, expected text and
//! expected status (tasks-view-ux Issue 122): the pure
//! `set_task_text_in_content` and the command half `write_task_text_inner`
//! against a tempdir vault and an in-memory index.

use kokobrain_lib::commands::vault::{collect_v2_entries, write_task_text_inner};
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::parsing::set_task_text_in_content;
use kokobrain_lib::vault::task::TaskStatus;

// --- helpers -------------------------------------------------------------------

/// A tempdir vault holding `files`, and an index built over it with its root set.
fn vault(files: &[(&str, &str)]) -> (tempfile::TempDir, String, VaultIndex) {
	let dir = tempfile::tempdir().unwrap();
	for (rel, content) in files {
		let path = dir.path().join(rel);
		std::fs::create_dir_all(path.parent().unwrap()).unwrap();
		std::fs::write(path, content).unwrap();
	}
	let root = dir.path().canonicalize().unwrap().to_string_lossy().to_string();
	let mut idx = VaultIndex::default();
	idx.build_with_root(&root, collect_v2_entries(&root).unwrap());
	(dir, root, idx)
}

fn read(root: &str, rel: &str) -> String {
	std::fs::read_to_string(format!("{}/{}", root, rel)).unwrap()
}

const NOTE: &str = "# Calls\n- [ ] call Ana\nplain line\n";

// --- set_task_text_in_content ----------------------------------------------------

#[test]
fn set_task_text_in_content_replaces_only_the_text_of_that_line() {
	assert_eq!(
		set_task_text_in_content(NOTE, 2, "call Bob"),
		"# Calls\n- [ ] call Bob\nplain line\n"
	);
}

#[test]
fn set_task_text_in_content_leaves_out_of_range_and_non_task_lines_alone() {
	for line in [0, 3, 4, 99] {
		assert_eq!(set_task_text_in_content(NOTE, line, "x"), NOTE, "line {line}");
	}
}

// --- write_task_text_inner ---------------------------------------------------------

#[test]
fn writes_new_text_on_an_unanchored_line_and_returns_the_reparsed_task() {
	let (_dir, root, mut idx) = vault(&[("Calls.md", NOTE)]);
	let abs = format!("{}/Calls.md", root);
	assert_eq!(idx.entries()[&abs].tasks[0].metadata.due_date, None);

	let result = write_task_text_inner(
		&mut idx,
		&root,
		"Calls.md",
		2,
		"call Ana",
		TaskStatus::Todo,
		"call Ana 📅 2026-11-20",
	)
	.unwrap();

	let expected = "# Calls\n- [ ] call Ana 📅 2026-11-20\nplain line\n";
	assert_eq!(read(&root, "Calls.md"), expected);
	assert_eq!(result.updated_content, expected);
	assert!(!result.stale);
	assert!(result.update_result.changed);
	assert_eq!(result.update_result.upserted, vec![abs.clone()]);
	let task = result.task.expect("the written task");
	assert_eq!(task.text, "call Ana 📅 2026-11-20");
	assert_eq!(task.line_number, 2);
	assert_eq!(task.status, TaskStatus::Todo);
	assert_eq!(task.metadata.due_date.as_deref(), Some("2026-11-20"));
	assert_eq!(task.metadata.description, "call Ana");
	assert_eq!(idx.entries()[&abs].tasks[0].metadata.due_date.as_deref(), Some("2026-11-20"));
}

#[test]
fn keeps_the_indent_marker_and_box_byte_for_byte() {
	let lines = [
		("\t\t- [ ] tabbed", TaskStatus::Todo),
		("* [ ] starred", TaskStatus::Todo),
		("  + [/] plussed", TaskStatus::InProgress),
		("3. [ ] ordered", TaskStatus::Todo),
		("\t12. [x] ordered done", TaskStatus::Done),
		("- [X] upper done", TaskStatus::Done),
	];
	let content = lines.iter().map(|(l, _)| *l).collect::<Vec<_>>().join("\n") + "\n";
	let (_dir, root, mut idx) = vault(&[("n.md", &content)]);

	for (i, (line, status)) in lines.iter().enumerate() {
		let text = line.split_once("] ").unwrap().1;
		let new_text = format!("{} ⏫", text);
		let result = write_task_text_inner(&mut idx, &root, "n.md", i + 1, text, *status, &new_text).unwrap();
		assert!(!result.stale, "{line:?}");
		let written = read(&root, "n.md");
		let prefix = &line[..line.len() - text.len()];
		assert_eq!(written.split('\n').nth(i).unwrap(), format!("{}{}", prefix, new_text), "{line:?}");
		assert_eq!(result.task.unwrap().status, *status, "{line:?}");
	}
}

#[test]
fn a_line_that_no_longer_holds_the_expected_task_is_stale_and_unwritten() {
	let (_dir, root, mut idx) = vault(&[("Calls.md", NOTE)]);
	let version = idx.version();
	let cases: [(usize, &str, TaskStatus, &str); 5] = [
		(2, "call Bob", TaskStatus::Todo, "text differs"),
		(2, "call Ana", TaskStatus::Done, "status differs"),
		(0, "call Ana", TaskStatus::Todo, "line 0"),
		(9, "call Ana", TaskStatus::Todo, "past the end"),
		(3, "plain line", TaskStatus::Todo, "not a task"),
	];

	for (line, text, status, why) in cases {
		let result = write_task_text_inner(&mut idx, &root, "Calls.md", line, text, status, "call Ana 🔺").unwrap();
		assert!(result.stale, "{why}");
		assert!(!result.update_result.changed, "{why}");
		assert!(result.task.is_none(), "{why}");
		assert_eq!(result.updated_content, NOTE, "{why}");
		assert_eq!(read(&root, "Calls.md"), NOTE, "{why}");
	}
	assert_eq!(idx.version(), version);
}

#[test]
fn new_text_holding_a_line_break_or_blank_is_refused() {
	let (_dir, root, mut idx) = vault(&[("Calls.md", NOTE)]);

	for new_text in ["call\nAna", "call Ana\r", "", "  \t "] {
		let result = write_task_text_inner(&mut idx, &root, "Calls.md", 2, "call Ana", TaskStatus::Todo, new_text);
		assert!(result.is_err(), "accepted {new_text:?}");
	}
	assert_eq!(read(&root, "Calls.md"), NOTE);
}

#[test]
fn new_text_on_a_missing_note_is_refused_before_reading_it() {
	let (_dir, root, mut idx) = vault(&[]);

	let err = write_task_text_inner(&mut idx, &root, "Missing.md", 1, "x", TaskStatus::Todo, "a\nb").unwrap_err();
	assert!(err.contains("line break"), "{err}");
}

#[test]
fn a_missing_note_is_an_error() {
	let (_dir, root, mut idx) = vault(&[]);

	assert!(write_task_text_inner(&mut idx, &root, "Missing.md", 1, "x", TaskStatus::Todo, "y").is_err());
	assert!(!std::path::Path::new(&format!("{}/Missing.md", root)).exists());
}

#[test]
fn the_same_text_writes_nothing_and_is_not_stale() {
	let (_dir, root, mut idx) = vault(&[("Calls.md", NOTE)]);
	let version = idx.version();

	let result = write_task_text_inner(&mut idx, &root, "Calls.md", 2, "call Ana", TaskStatus::Todo, "call Ana").unwrap();

	assert!(!result.stale);
	assert!(!result.update_result.changed);
	assert!(result.task.is_none());
	assert_eq!(result.updated_content, NOTE);
	assert_eq!(read(&root, "Calls.md"), NOTE);
	assert_eq!(idx.version(), version);
}

#[test]
fn a_root_other_than_the_open_vault_is_refused() {
	let (_dir, root, mut idx) = vault(&[("Calls.md", NOTE)]);
	let (_other_dir, other_root, _) = vault(&[("Calls.md", NOTE)]);

	let result = write_task_text_inner(&mut idx, &other_root, "Calls.md", 2, "call Ana", TaskStatus::Todo, "call Bob");
	assert!(result.is_err());
	assert_eq!(read(&other_root, "Calls.md"), NOTE);
	assert_eq!(read(&root, "Calls.md"), NOTE);

	let mut closed = VaultIndex::default();
	let result = write_task_text_inner(&mut closed, &root, "Calls.md", 2, "call Ana", TaskStatus::Todo, "call Bob");
	assert!(result.is_err());
	assert_eq!(read(&root, "Calls.md"), NOTE);
}

#[test]
fn paths_that_are_not_vault_relative_markdown_are_refused() {
	let (dir, root, mut idx) = vault(&[("Calls.md", NOTE)]);
	let outside_path = dir.path().parent().unwrap().join("outside-122.md");
	std::fs::write(&outside_path, NOTE).unwrap();
	let outside = outside_path.to_string_lossy().to_string();
	let absolute_inside = format!("{}/Calls.md", root);

	for rel in ["../outside-122.md", outside.as_str(), absolute_inside.as_str(), "a/../Calls.md", "Calls.txt"] {
		let result = write_task_text_inner(&mut idx, &root, rel, 2, "call Ana", TaskStatus::Todo, "call Bob");
		assert!(result.is_err(), "accepted {rel:?}");
	}
	assert_eq!(read(&root, "Calls.md"), NOTE);
	assert_eq!(std::fs::read_to_string(&outside_path).unwrap(), NOTE);
	std::fs::remove_file(outside_path).unwrap();
}
