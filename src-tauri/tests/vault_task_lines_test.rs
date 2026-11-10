//! Guarded task-line writes located by `🆔 td-…` anchor (todoist-bisync
//! Issue 03): the pure `apply_task_line_edits` and the command half
//! `write_task_lines_inner` against a tempdir vault and an in-memory index.

use kokobrain_lib::commands::vault::{collect_v2_entries, write_task_lines_inner};
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::task_lines::{
	apply_task_line_edits, TaskLineEditOutcome, TaskLineEdits, TaskLineInsert, TaskLineRemove,
	TaskLineReplace, TaskLinesOutcome, TaskLinesStale, TaskLinesStaleReason,
};
use serde_json::{json, to_value};

// --- helpers -------------------------------------------------------------------

fn replace(anchor: &str, expected: &str, new_line: &str) -> TaskLineReplace {
	TaskLineReplace {
		anchor: anchor.into(),
		expected_line: expected.into(),
		new_line: new_line.into(),
		line_number: None,
	}
}

/// Writes the first anchor onto line `line_number` (1-based), which has none yet.
fn attach(line_number: u32, anchor: &str, expected: &str, new_line: &str) -> TaskLineReplace {
	TaskLineReplace {
		line_number: Some(line_number),
		..replace(anchor, expected, new_line)
	}
}

fn remove(anchor: &str, expected: &str) -> TaskLineRemove {
	TaskLineRemove {
		anchor: anchor.into(),
		expected_line: expected.into(),
	}
}

fn insert(after_heading: Option<&str>, lines: &[&str]) -> TaskLineInsert {
	TaskLineInsert {
		after_heading: after_heading.map(String::from),
		lines: lines.iter().map(|l| l.to_string()).collect(),
	}
}

fn edits(
	replace: Vec<TaskLineReplace>,
	insert: Vec<TaskLineInsert>,
	remove: Vec<TaskLineRemove>,
) -> TaskLineEdits {
	TaskLineEdits {
		replace,
		insert,
		remove,
	}
}

/// Applies `e` to `content` and expects the edit to go through.
fn applied(content: &str, e: &TaskLineEdits) -> String {
	match apply_task_line_edits(content, e).unwrap() {
		TaskLineEditOutcome::Applied(updated) => updated,
		TaskLineEditOutcome::Stale(stale) => panic!("expected applied, got stale {:?}", stale),
	}
}

/// Applies `e` to `content` and expects it to be stale.
fn stale(content: &str, e: &TaskLineEdits) -> TaskLinesStale {
	match apply_task_line_edits(content, e).unwrap() {
		TaskLineEditOutcome::Stale(stale) => stale,
		TaskLineEditOutcome::Applied(updated) => panic!("expected stale, got {:?}", updated),
	}
}

const A: &str = "- [ ] Buy milk 🆔 td-a";
const B: &str = "- [ ] Call 📅 2026-11-10 🆔 td-b";

// --- pure: replace / remove ----------------------------------------------------

#[test]
fn replace_rewrites_only_the_line_that_carries_the_anchor() {
	let content = format!("# Inbox\n{}\n{}\n", A, B);
	let e = edits(vec![replace("td-b", B, "- [x] Call 📅 2026-11-10 🆔 td-b")], vec![], vec![]);

	assert_eq!(applied(&content, &e), format!("# Inbox\n{}\n- [x] Call 📅 2026-11-10 🆔 td-b\n", A));
}

#[test]
fn remove_drops_the_line_that_carries_the_anchor() {
	let content = format!("{}\n{}\n", A, B);
	let e = edits(vec![], vec![], vec![remove("td-a", A)]);

	assert_eq!(applied(&content, &e), format!("{}\n", B));
}

#[test]
fn an_anchor_token_that_is_not_the_first_id_on_the_line_still_counts() {
	let line = "- [ ] x 🆔 mine 🆔 td-a";
	let e = edits(vec![replace("td-a", line, "- [x] x 🆔 mine 🆔 td-a")], vec![], vec![]);

	assert_eq!(applied(&format!("{}\n", line), &e), "- [x] x 🆔 mine 🆔 td-a\n");
}

#[test]
fn an_anchor_that_only_prefixes_another_is_not_a_match() {
	let content = "- [ ] x 🆔 td-ab\n";
	let s = stale(content, &edits(vec![], vec![], vec![remove("td-a", "- [ ] x 🆔 td-a")]));

	assert_eq!(s.reason, TaskLinesStaleReason::AnchorMissing);
}

#[test]
fn a_missing_anchor_is_stale() {
	let s = stale(&format!("{}\n", A), &edits(vec![replace("td-z", "x", "y")], vec![], vec![]));

	assert_eq!(
		s,
		TaskLinesStale {
			reason: TaskLinesStaleReason::AnchorMissing,
			subject: "td-z".into(),
		}
	);
}

#[test]
fn an_anchor_on_two_lines_is_stale() {
	let content = format!("{}\n{}\n", A, A);
	let s = stale(&content, &edits(vec![replace("td-a", A, "- [x] Buy milk 🆔 td-a")], vec![], vec![]));

	assert_eq!(s.reason, TaskLinesStaleReason::AnchorDuplicated);
	assert_eq!(s.subject, "td-a");
}

#[test]
fn a_line_that_differs_from_the_expected_one_is_stale() {
	let content = "- [ ] Buy oat milk 🆔 td-a\n";
	let s = stale(content, &edits(vec![], vec![], vec![remove("td-a", A)]));

	assert_eq!(s.reason, TaskLinesStaleReason::LineDiffers);
	assert_eq!(s.subject, "td-a");
}

#[test]
fn one_stale_edit_stops_the_whole_batch() {
	let content = format!("{}\n{}\n", A, B);
	let e = edits(
		vec![replace("td-a", A, "- [x] Buy milk 🆔 td-a")],
		vec![insert(None, &["- [ ] New 🆔 td-c"])],
		vec![remove("td-b", "- [ ] Call 🆔 td-b")],
	);

	assert_eq!(stale(&content, &e).reason, TaskLinesStaleReason::LineDiffers);
}

#[test]
fn two_edits_whose_anchors_share_one_line_are_stale() {
	let shared = "- [ ] a 🆔 td-1 b 🆔 td-2";
	let content = format!("{}\n- [ ] keep me 🆔 td-3\n", shared);
	let removes = edits(vec![], vec![], vec![remove("td-1", shared), remove("td-2", shared)]);
	let replaces = edits(vec![replace("td-1", shared, "N1 🆔 td-1"), replace("td-2", shared, "N2 🆔 td-2")], vec![], vec![]);
	let mixed = edits(vec![replace("td-1", shared, "N1 🆔 td-1")], vec![], vec![remove("td-2", shared)]);

	for e in [&removes, &replaces, &mixed] {
		let s = stale(&content, e);
		assert_eq!(s.reason, TaskLinesStaleReason::AnchorDuplicated);
		assert_eq!(s.subject, "td-2");
	}
}

#[test]
fn any_edit_on_a_crlf_note_is_stale() {
	let content = "## Work\r\n- [ ] one 🆔 td-a\r\n";
	let inserts = [insert(None, &["- [ ] t 🆔 td-c"]), insert(Some("Work"), &["- [ ] t 🆔 td-c"])];

	for i in inserts {
		let s = stale(content, &edits(vec![], vec![i], vec![]));
		assert_eq!(s.reason, TaskLinesStaleReason::CrlfLineEndings);
	}
	assert_eq!(applied(content, &edits(vec![], vec![], vec![])), content);
}

// --- pure: replace by line number (first anchor) -------------------------------

#[test]
fn a_line_number_replace_writes_the_first_anchor_onto_a_line_that_still_matches() {
	let content = format!("# Inbox\n- [ ] Call Bob\n{}\n", A);
	let e = edits(vec![attach(2, "td-new", "- [ ] Call Bob", "- [ ] Call Bob 🆔 td-new")], vec![], vec![]);

	assert_eq!(applied(&content, &e), format!("# Inbox\n- [ ] Call Bob 🆔 td-new\n{}\n", A));
}

#[test]
fn a_line_number_replace_on_a_line_that_changed_or_moved_is_stale() {
	let content = "- [ ] Call Bob today\n";
	for e in [
		edits(vec![attach(1, "td-new", "- [ ] Call Bob", "- [ ] Call Bob 🆔 td-new")], vec![], vec![]),
		edits(vec![attach(2, "td-new", "- [ ] Call Bob today", "- [ ] Call Bob today 🆔 td-new")], vec![], vec![]),
		edits(vec![attach(0, "td-new", "- [ ] Call Bob today", "- [ ] Call Bob today 🆔 td-new")], vec![], vec![]),
	] {
		assert_eq!(
			stale(content, &e),
			TaskLinesStale {
				reason: TaskLinesStaleReason::LineDiffers,
				subject: "td-new".into(),
			}
		);
	}
}

#[test]
fn a_line_number_replace_whose_anchor_is_already_in_the_note_is_refused() {
	let content = "- [ ] Call Bob\n- [ ] Other 🆔 td-new\n";
	let e = edits(vec![attach(1, "td-new", "- [ ] Call Bob", "- [ ] Call Bob 🆔 td-new")], vec![], vec![]);

	assert_eq!(stale(content, &e).reason, TaskLinesStaleReason::AnchorExists);
}

#[test]
fn a_line_number_replace_mixes_with_anchored_replacements_and_removals() {
	let content = format!("{}\n- [ ] Call Bob\n{}\n", A, B);
	let e = edits(
		vec![attach(2, "td-new", "- [ ] Call Bob", "- [ ] Call Bob 🆔 td-new")],
		vec![],
		vec![remove("td-a", A)],
	);

	assert_eq!(applied(&content, &e), format!("- [ ] Call Bob 🆔 td-new\n{}\n", B));
}

#[test]
fn a_line_number_replace_whose_new_line_lacks_its_anchor_is_an_error() {
	let e = edits(vec![attach(1, "td-new", "- [ ] Call Bob", "- [ ] Call Bob")], vec![], vec![]);

	assert!(apply_task_line_edits("- [ ] Call Bob\n", &e).is_err());
}

// --- pure: insert --------------------------------------------------------------

#[test]
fn insert_at_the_end_goes_after_the_last_non_blank_line() {
	let e = edits(vec![], vec![insert(None, &["- [ ] New 🆔 td-c"])], vec![]);

	assert_eq!(applied("", &e), "- [ ] New 🆔 td-c\n");
	assert_eq!(applied("a\n", &e), "a\n- [ ] New 🆔 td-c\n");
	assert_eq!(applied("a", &e), "a\n- [ ] New 🆔 td-c");
	assert_eq!(applied("a\n\n", &e), "a\n- [ ] New 🆔 td-c\n\n");
}

#[test]
fn insert_after_a_heading_goes_after_the_last_line_before_the_next_heading() {
	let content = "# P\n\n## Work\n- [ ] one\n\n### Sub\n- [ ] sub\n## Home\n- [ ] h\n";
	let e = edits(vec![], vec![insert(Some("Work"), &["- [ ] two 🆔 td-c", "- [ ] three 🆔 td-d"])], vec![]);

	assert_eq!(
		applied(content, &e),
		"# P\n\n## Work\n- [ ] one\n- [ ] two 🆔 td-c\n- [ ] three 🆔 td-d\n\n### Sub\n- [ ] sub\n## Home\n- [ ] h\n"
	);
}

#[test]
fn two_inserts_under_one_heading_keep_their_order() {
	let e = edits(
		vec![],
		vec![insert(Some("Work"), &["- [ ] a 🆔 td-c"]), insert(Some("Work"), &["- [ ] b 🆔 td-d"])],
		vec![],
	);

	assert_eq!(applied("## Work\n", &e), "## Work\n- [ ] a 🆔 td-c\n- [ ] b 🆔 td-d\n");
}

#[test]
fn headings_inside_frontmatter_or_code_fences_are_not_headings() {
	let content = "---\n# Work\n---\n```\n## Work\n```\n## Work\n";
	let e = edits(vec![], vec![insert(Some("Work"), &["- [ ] t 🆔 td-c"])], vec![]);

	assert_eq!(applied(content, &e), "---\n# Work\n---\n```\n## Work\n```\n## Work\n- [ ] t 🆔 td-c\n");
}

#[test]
fn insert_after_an_empty_heading_goes_right_below_it() {
	let content = "## Work\n\n## Home\n";
	let e = edits(vec![], vec![insert(Some("Work"), &["- [ ] t 🆔 td-c"])], vec![]);

	assert_eq!(applied(content, &e), "## Work\n- [ ] t 🆔 td-c\n\n## Home\n");
}

#[test]
fn insert_after_a_missing_heading_is_stale() {
	let s = stale("## Home\n", &edits(vec![], vec![insert(Some("Work"), &["- [ ] t 🆔 td-c"])], vec![]));

	assert_eq!(
		s,
		TaskLinesStale {
			reason: TaskLinesStaleReason::HeadingMissing,
			subject: "Work".into(),
		}
	);
}

#[test]
fn insert_after_a_heading_that_appears_twice_is_stale() {
	let content = "## Work\n- a\n## Work\n- b\n";
	let s = stale(content, &edits(vec![], vec![insert(Some("Work"), &["- [ ] t 🆔 td-c"])], vec![]));

	assert_eq!(s.reason, TaskLinesStaleReason::HeadingDuplicated);
}

#[test]
fn insert_of_an_anchor_already_in_the_file_is_refused() {
	let content = format!("{}\n", A);
	let s = stale(&content, &edits(vec![], vec![insert(None, &["- [ ] again 🆔 td-a"])], vec![]));

	assert_eq!(
		s,
		TaskLinesStale {
			reason: TaskLinesStaleReason::AnchorExists,
			subject: "td-a".into(),
		}
	);
}

#[test]
fn a_move_within_one_file_is_one_call() {
	let content = format!("## Work\n{}\n## Home\n- [ ] h\n", A);
	let e = edits(vec![], vec![insert(Some("Home"), &[A])], vec![remove("td-a", A)]);

	assert_eq!(applied(&content, &e), format!("## Work\n## Home\n- [ ] h\n{}\n", A));
}

#[test]
fn lines_without_an_anchor_can_be_inserted() {
	let e = edits(vec![], vec![insert(None, &["", "## Work", "- [ ] t 🆔 td-c"])], vec![]);

	assert_eq!(applied("# P\n", &e), "# P\n\n## Work\n- [ ] t 🆔 td-c\n");
}

// --- pure: invalid batches -----------------------------------------------------

#[test]
fn a_new_line_with_a_line_break_is_an_error() {
	let content = format!("{}\n", A);
	assert!(apply_task_line_edits(&content, &edits(vec![replace("td-a", A, "x\ny")], vec![], vec![])).is_err());
	assert!(apply_task_line_edits(&content, &edits(vec![], vec![insert(None, &["x\r"])], vec![])).is_err());
}

#[test]
fn an_anchor_named_by_two_edits_is_an_error() {
	let content = format!("{}\n", A);
	let e = edits(vec![replace("td-a", A, "x 🆔 td-a")], vec![], vec![remove("td-a", A)]);

	assert!(apply_task_line_edits(&content, &e).is_err());
}

#[test]
fn the_same_anchor_in_two_inserted_lines_is_an_error() {
	let e = edits(vec![], vec![insert(None, &["- a 🆔 td-c"]), insert(None, &["- b 🆔 td-c"])], vec![]);

	assert!(apply_task_line_edits("", &e).is_err());
}

// --- wire format ---------------------------------------------------------------

#[test]
fn edits_deserialize_from_the_camel_case_ts_shape() {
	let e: TaskLineEdits = serde_json::from_value(json!({
		"replace": [{ "anchor": "td-a", "expectedLine": "x", "newLine": "y" }],
		"insert": [{ "afterHeading": null, "lines": ["z"] }],
		"remove": [{ "anchor": "td-b", "expectedLine": "w" }],
	}))
	.unwrap();

	assert_eq!(e.replace[0].new_line, "y");
	assert_eq!(e.replace[0].line_number, None);
	assert_eq!(e.insert[0].after_heading, None);
	assert_eq!(e.remove[0].expected_line, "w");
}

#[test]
fn outcome_and_reason_serialize_to_camel_case_literals() {
	assert_eq!(to_value(TaskLinesOutcome::Written).unwrap(), json!("written"));
	assert_eq!(to_value(TaskLinesOutcome::Missing).unwrap(), json!("missing"));
	assert_eq!(to_value(TaskLinesStaleReason::AnchorDuplicated).unwrap(), json!("anchorDuplicated"));
}

// --- command half --------------------------------------------------------------

/// A tempdir vault holding `files`, indexed with its canonical root as the
/// open vault. Returns the dir guard, the canonical root and the index.
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

#[test]
fn write_task_lines_writes_the_note_updates_the_index_and_returns_the_content() {
	let (_dir, root, mut idx) = vault(&[("Todoist/Inbox.md", &format!("{}\n", A))]);
	let new_line = "- [x] Buy milk 🆔 td-a";

	let result = write_task_lines_inner(
		&mut idx,
		&root,
		"Todoist/Inbox.md",
		&edits(vec![replace("td-a", A, new_line)], vec![], vec![]),
	)
	.unwrap();

	let expected = format!("{}\n", new_line);
	assert_eq!(result.outcome, TaskLinesOutcome::Written);
	assert_eq!(result.content.as_deref(), Some(expected.as_str()));
	assert_eq!(read(&root, "Todoist/Inbox.md"), expected);
	assert!(result.update_result.changed);
	let abs = format!("{}/Todoist/Inbox.md", root);
	assert_eq!(result.update_result.upserted, vec![abs.clone()]);
	assert!(idx.entries()[&abs].tasks[0].checked);
}

#[test]
fn a_stale_batch_writes_nothing_and_leaves_the_index_alone() {
	let content = format!("{}\n", A);
	let (_dir, root, mut idx) = vault(&[("n.md", &content)]);
	let version = idx.version();

	let result = write_task_lines_inner(
		&mut idx,
		&root,
		"n.md",
		&edits(vec![replace("td-a", "- [ ] Buy oat milk 🆔 td-a", "x 🆔 td-a")], vec![], vec![]),
	)
	.unwrap();

	assert_eq!(result.outcome, TaskLinesOutcome::Stale);
	assert_eq!(result.stale.unwrap().reason, TaskLinesStaleReason::LineDiffers);
	assert_eq!(result.content, None);
	assert_eq!(read(&root, "n.md"), content);
	assert_eq!(idx.version(), version);
	assert!(!result.update_result.changed);
}

#[test]
fn a_batch_that_changes_nothing_is_unchanged_and_not_written() {
	let content = format!("{}\n", A);
	let (_dir, root, mut idx) = vault(&[("n.md", &content)]);
	let version = idx.version();

	let result =
		write_task_lines_inner(&mut idx, &root, "n.md", &edits(vec![replace("td-a", A, A)], vec![], vec![]))
			.unwrap();

	assert_eq!(result.outcome, TaskLinesOutcome::Unchanged);
	assert_eq!(result.content.as_deref(), Some(content.as_str()));
	assert_eq!(idx.version(), version);
}

#[test]
fn a_root_other_than_the_open_vault_is_refused() {
	let (_dir, root, mut idx) = vault(&[("n.md", &format!("{}\n", A))]);
	let (_other, other_root, _) = vault(&[("n.md", &format!("{}\n", A))]);
	let e = edits(vec![], vec![], vec![remove("td-a", A)]);

	assert!(write_task_lines_inner(&mut idx, &other_root, "n.md", &e).is_err());
	assert_eq!(read(&other_root, "n.md"), format!("{}\n", A));
	assert_eq!(read(&root, "n.md"), format!("{}\n", A));
}

#[test]
fn no_open_vault_is_refused() {
	let (_dir, root, _) = vault(&[("n.md", &format!("{}\n", A))]);
	let mut idx = VaultIndex::default();

	assert!(write_task_lines_inner(&mut idx, &root, "n.md", &edits(vec![], vec![], vec![remove("td-a", A)])).is_err());
	assert_eq!(read(&root, "n.md"), format!("{}\n", A));
}

#[test]
fn paths_that_are_not_vault_relative_markdown_are_refused() {
	let (dir, root, mut idx) = vault(&[("n.md", &format!("{}\n", A))]);
	let outside = dir.path().parent().unwrap().join("outside.md").to_string_lossy().to_string();
	let e = edits(vec![], vec![insert(None, &["- [ ] x 🆔 td-c"])], vec![]);

	for rel in ["", "../outside.md", "./n.md", outside.as_str(), "n.txt", "a/../n.md"] {
		assert!(write_task_lines_inner(&mut idx, &root, rel, &e).is_err(), "accepted {:?}", rel);
	}
	assert_eq!(read(&root, "n.md"), format!("{}\n", A));
}

#[cfg(unix)]
#[test]
fn a_path_through_a_symlink_out_of_the_vault_is_refused() {
	let (_dir, root, mut idx) = vault(&[]);
	let target = tempfile::tempdir().unwrap();
	std::fs::write(target.path().join("n.md"), format!("{}\n", A)).unwrap();
	std::os::unix::fs::symlink(target.path(), format!("{}/link", root)).unwrap();

	let e = edits(vec![], vec![], vec![remove("td-a", A)]);
	assert!(write_task_lines_inner(&mut idx, &root, "link/n.md", &e).is_err());
	let missing = edits(vec![], vec![insert(None, &["- [ ] x 🆔 td-c"])], vec![]);
	assert!(write_task_lines_inner(&mut idx, &root, "link/new.md", &missing).is_err());
	assert_eq!(std::fs::read_to_string(target.path().join("n.md")).unwrap(), format!("{}\n", A));
}

#[test]
fn a_missing_note_with_only_end_inserts_is_missing_and_not_created() {
	let (_dir, root, mut idx) = vault(&[]);

	let result = write_task_lines_inner(
		&mut idx,
		&root,
		"Todoist/New.md",
		&edits(vec![], vec![insert(None, &["- [ ] x 🆔 td-c"])], vec![]),
	)
	.unwrap();

	assert_eq!(result.outcome, TaskLinesOutcome::Missing);
	assert!(!std::path::Path::new(&format!("{}/Todoist/New.md", root)).exists());
}

#[test]
fn a_missing_note_with_a_batch_of_no_text_is_unchanged_and_not_created() {
	let (_dir, root, mut idx) = vault(&[]);

	for e in [edits(vec![], vec![], vec![]), edits(vec![], vec![insert(None, &["", ""])], vec![])] {
		let result = write_task_lines_inner(&mut idx, &root, "Todoist/New.md", &e).unwrap();
		assert_eq!(result.outcome, TaskLinesOutcome::Unchanged);
		assert_eq!(result.content, None);
	}
	assert!(!std::path::Path::new(&format!("{}/Todoist/New.md", root)).exists());
}

#[test]
fn two_removals_on_one_shared_line_write_nothing() {
	let shared = "- [ ] a 🆔 td-1 b 🆔 td-2";
	let content = format!("{}\n- [ ] keep me 🆔 td-3\n", shared);
	let (_dir, root, mut idx) = vault(&[("n.md", &content)]);

	let result =
		write_task_lines_inner(&mut idx, &root, "n.md", &edits(vec![], vec![], vec![remove("td-1", shared), remove("td-2", shared)]))
			.unwrap();

	assert_eq!(result.outcome, TaskLinesOutcome::Stale);
	assert_eq!(read(&root, "n.md"), content);
}

#[test]
fn a_missing_note_with_a_replace_or_a_heading_insert_is_stale() {
	let (_dir, root, mut idx) = vault(&[]);

	let replaced =
		write_task_lines_inner(&mut idx, &root, "New.md", &edits(vec![replace("td-a", A, A)], vec![], vec![]))
			.unwrap();
	let headed = write_task_lines_inner(
		&mut idx,
		&root,
		"New.md",
		&edits(vec![], vec![insert(Some("Work"), &["- [ ] x 🆔 td-c"])], vec![]),
	)
	.unwrap();

	assert_eq!(replaced.stale.unwrap().reason, TaskLinesStaleReason::AnchorMissing);
	assert_eq!(headed.stale.unwrap().reason, TaskLinesStaleReason::HeadingMissing);
}
