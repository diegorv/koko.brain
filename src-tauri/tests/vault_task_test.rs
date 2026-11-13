//! Phase 7 — Task integration tests (FS-level, TempDir, VaultIndex).
//!
//! Unit tests for `extract_tasks`, `parse_task_metadata`, `map_checkbox_char`,
//! and `set_task_status_in_content` live inline in `src/vault/parsing.rs`.

use kokobrain_lib::commands::vault::{toggle_task_status_inner, update_note_in_index_inner};
use kokobrain_lib::vault::entry::NoteEntry;
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::task::{Task, TaskHeading, TaskMetadata, TaskPriority, TaskStatus};
use std::sync::{Arc, Barrier};
use std::thread;

// --- Task headings recorded at index time -------------------------------------

/// Shorthand for an expected `TaskHeading`.
fn heading(level: u8, text: &str, line: u32) -> TaskHeading {
	TaskHeading { level, text: text.to_string(), line }
}

/// Each task's (text, heading index), in document order.
fn task_headings_of(entry: &NoteEntry) -> Vec<(&str, Option<u32>)> {
	entry.tasks.iter().map(|t| (t.text.as_str(), t.heading)).collect()
}

#[test]
fn task_headings_skip_frontmatter_and_fences() {
	let content = "---\ntitle: x\n# comment\n---\n## A #to-list\n- [ ] a task\n### B\n- [ ] b task\n```\n# not a heading\n- [ ] fenced\n```\n## C\n- [ ] c task\n";
	let entry = NoteEntry::from_content("/v/note.md".to_string(), content, 0);
	assert_eq!(
		entry.task_headings,
		vec![heading(2, "A #to-list", 5), heading(3, "B", 7), heading(2, "C", 13)]
	);
	assert_eq!(
		task_headings_of(&entry),
		vec![("a task", Some(0)), ("b task", Some(1)), ("c task", Some(2))]
	);
	assert_eq!(entry.tasks.iter().map(|t| t.line_number).collect::<Vec<_>>(), vec![6, 8, 14]);
}

#[test]
fn task_headings_are_empty_for_a_note_without_tasks() {
	let entry = NoteEntry::from_content("/v/plain.md".to_string(), "# Title\n## Section\ntext\n", 0);
	assert!(entry.tasks.is_empty());
	assert!(entry.task_headings.is_empty());
	let json = serde_json::to_value(&entry).unwrap();
	assert!(json.get("taskHeadings").is_none(), "empty headings are omitted on the wire");
}

#[test]
fn task_before_the_first_heading_has_no_heading() {
	let content = "- [ ] early\n#  Spaced title  \n- [ ] late\n";
	let entry = NoteEntry::from_content("/v/early.md".to_string(), content, 0);
	assert_eq!(entry.task_headings, vec![heading(1, "Spaced title", 2)]);
	assert_eq!(task_headings_of(&entry), vec![("early", None), ("late", Some(0))]);
	let json = serde_json::to_value(&entry).unwrap();
	assert!(json["tasks"][0].get("heading").is_none(), "a None heading is omitted on the wire");
	assert_eq!(json["tasks"][1]["heading"], 0);
	assert_eq!(json["taskHeadings"][0]["level"], 1);
}

#[test]
fn task_headings_read_crlf_lines() {
	let content = "---\r\na: 1\r\n---\r\n## A\r\n- [ ] t\r\n";
	let entry = NoteEntry::from_content("/v/crlf.md".to_string(), content, 0);
	assert_eq!(entry.task_headings, vec![heading(2, "A", 4)]);
	assert_eq!(entry.tasks.iter().map(|t| t.heading).collect::<Vec<_>>(), vec![Some(0)]);
}

#[test]
fn entry_json_without_heading_fields_deserializes() {
	let entry = NoteEntry::from_content("/v/old.md".to_string(), "- [ ] t\n", 0);
	let mut json = serde_json::to_value(&entry).unwrap();
	json.as_object_mut().unwrap().remove("taskHeadings");
	let back: NoteEntry = serde_json::from_value(json).unwrap();
	assert!(back.task_headings.is_empty());
	assert_eq!(back.tasks[0].heading, None);
}

// --- Audit finding #9 — toggle_task_status FS-level TOCTOU --------------------
//
// `commands/vault.rs::toggle_task_status_inner` does read -> modify -> write
// on the file on disk (lines 559, 561, 574). The write-lock on VaultIndex
// is held throughout, but the FILE has no lock. Another process (external
// vim, Obsidian running in parallel, sync apps like iCloud/Dropbox/
// Syncthing) that rewrites the file between the read and the write gets
// its changes silently overwritten.
//
// Marked #[ignore] because the result is timing-dependent -- thread B's
// few-microsecond sleep can land before/during/after thread A's
// read-write window. Repeats N iterations to raise the chance that at
// least one lands in the bad window.
//
// Audit plan: ~/.claude/plans/atue-como-um-auditor-witty-minsky.md (Appendix A.3).

#[test]
#[ignore]
fn audit_finding_9_toggle_task_loses_concurrent_external_edit() {
	const ITERATIONS: usize = 200;
	let mut lost = 0;

	for _i in 0..ITERATIONS {
		let dir = tempfile::tempdir().unwrap();
		let path = dir.path().join("note.md");
		std::fs::write(&path, "- [ ] Buy milk\n- [ ] Write tests\n").unwrap();
		let path_str = path.to_string_lossy().to_string();
		let path_b = path_str.clone();

		// Barrier synchronizes so both threads start at roughly the same time.
		let barrier = Arc::new(Barrier::new(2));
		let barrier_b = Arc::clone(&barrier);

		let h = thread::spawn(move || {
			barrier_b.wait();
			// Short sleep to try to land between the read (l. 559) and
			// the write (l. 574) of toggle_task_status_inner. Value chosen
			// empirically; too small lands before the read, too large
			// lands after the write.
			thread::sleep(std::time::Duration::from_micros(10));
			let _ = std::fs::write(
				&path_b,
				"- [ ] Buy milk\n- [ ] Write tests\n- [ ] Externally added\n",
			);
		});

		let mut idx = VaultIndex::default();
		barrier.wait();
		let _ = toggle_task_status_inner(
			&mut idx,
			&path_str,
			1,
			"Buy milk",
			TaskStatus::Todo,
			TaskStatus::Done,
		);
		h.join().unwrap();

		let final_content = std::fs::read_to_string(&path).unwrap();
		// If the external edit was lost (toggle_task wrote AFTER thread B's
		// write), "Externally added" will not be in the file.
		if !final_content.contains("Externally added") {
			lost += 1;
		}
	}

	// We don't assert `lost == 0` because the test is probabilistic -- the
	// goal is to DETECT when the TOCTOU window is exercised in practice.
	// We print and fail only if it NEVER lands in the window (unlikely in
	// 200 iterations; if zero, revisit the test setup, e.g. sleep timing).
	// Users running this manually will see "lost > 0" as bug confirmation.
	eprintln!(
		"audit_finding_9: {} of {} iterations lost the external edit (FS race confirmed when >0)",
		lost, ITERATIONS
	);
	assert!(
		lost > 0 || ITERATIONS == 0,
		"expected at least 1 loss in {} iterations to confirm the TOCTOU window; \
		if always 0, adjust thread B's sleep timing",
		ITERATIONS
	);
}

#[test]
#[ignore]
fn audit_finding_9_toggle_task_no_concurrent_writer_preserves_state() {
	// Deterministic counterpart: WITHOUT a concurrent thread,
	// toggle_task_inner produces the expected result. Serves as baseline
	// and sanity check to distinguish a TOCTOU bug (#9) from a bug in
	// toggle itself.
	let dir = tempfile::tempdir().unwrap();
	let path = dir.path().join("note.md");
	std::fs::write(&path, "- [ ] Buy milk\n- [ ] Write tests\n").unwrap();
	let path_str = path.to_string_lossy().to_string();

	let mut idx = VaultIndex::default();
	let result = toggle_task_status_inner(
		&mut idx,
		&path_str,
		1,
		"Buy milk",
		TaskStatus::Todo,
		TaskStatus::Done,
	)
	.unwrap();

	let final_content = std::fs::read_to_string(&path).unwrap();
	assert_eq!(final_content, "- [x] Buy milk\n- [ ] Write tests\n");
	assert_eq!(result.updated_content, final_content);
}

// --- toggle_task_status guard and target status --------------------------------
//
// The Tasks list can be seconds behind disk, so the command re-parses the line
// and writes nothing (`stale: true`) unless it still holds the expected task.

/// Writes `content` to a tempdir note and indexes it. Returns the dir guard,
/// the path and the index.
fn task_note(content: &str) -> (tempfile::TempDir, String, VaultIndex) {
	let dir = tempfile::tempdir().unwrap();
	let path = dir.path().join("note.md");
	std::fs::write(&path, content).unwrap();
	let path_str = path.to_string_lossy().to_string();
	let mut idx = VaultIndex::default();
	update_note_in_index_inner(&mut idx, path_str.clone(), content, 0);
	(dir, path_str, idx)
}

#[test]
fn toggle_important_task_to_done_writes_x() {
	let (_dir, path, mut idx) = task_note("- [!] call\n");

	let result = toggle_task_status_inner(
		&mut idx,
		&path,
		1,
		"call",
		TaskStatus::Important,
		TaskStatus::Done,
	)
	.unwrap();

	assert_eq!(std::fs::read_to_string(&path).unwrap(), "- [x] call\n");
	assert_eq!(result.updated_content, "- [x] call\n");
	assert!(!result.stale);
	assert!(result.update_result.changed);
}

#[test]
fn toggle_with_different_text_on_the_line_is_stale() {
	let content = "- [ ] other\n";
	let (_dir, path, mut idx) = task_note(content);

	let result =
		toggle_task_status_inner(&mut idx, &path, 1, "call", TaskStatus::Todo, TaskStatus::Done)
			.unwrap();

	assert_eq!(std::fs::read_to_string(&path).unwrap(), content);
	assert_eq!(result.updated_content, content);
	assert!(result.stale);
	assert!(!result.update_result.changed);
}

#[test]
fn toggle_with_different_status_on_the_line_is_stale() {
	let content = "- [x] call\n";
	let (_dir, path, mut idx) = task_note(content);

	let result =
		toggle_task_status_inner(&mut idx, &path, 1, "call", TaskStatus::Todo, TaskStatus::Done)
			.unwrap();

	assert_eq!(std::fs::read_to_string(&path).unwrap(), content);
	assert_eq!(result.updated_content, content);
	assert!(result.stale);
	assert!(!result.update_result.changed);
}

#[test]
fn toggle_past_the_end_is_stale() {
	let content = "- [ ] call\n";
	let (_dir, path, mut idx) = task_note(content);

	let result =
		toggle_task_status_inner(&mut idx, &path, 99, "call", TaskStatus::Todo, TaskStatus::Done)
			.unwrap();

	assert_eq!(std::fs::read_to_string(&path).unwrap(), content);
	assert_eq!(result.updated_content, content);
	assert!(result.stale);
	assert!(!result.update_result.changed);
}

#[test]
fn toggle_line_zero_is_stale() {
	let content = "- [ ] call\n";
	let (_dir, path, mut idx) = task_note(content);

	let result =
		toggle_task_status_inner(&mut idx, &path, 0, "call", TaskStatus::Todo, TaskStatus::Done)
			.unwrap();

	assert_eq!(std::fs::read_to_string(&path).unwrap(), content);
	assert_eq!(result.updated_content, content);
	assert!(result.stale);
	assert!(!result.update_result.changed);
}

#[test]
fn toggle_ordered_task_changes_only_the_marker() {
	let (_dir, path, mut idx) = task_note("1. [ ] a\n");

	let result =
		toggle_task_status_inner(&mut idx, &path, 1, "a", TaskStatus::Todo, TaskStatus::Done)
			.unwrap();

	assert_eq!(std::fs::read_to_string(&path).unwrap(), "1. [x] a\n");
	assert!(!result.stale);
}

#[test]
fn toggle_task_with_bracket_in_text_changes_only_the_marker() {
	let (_dir, path, mut idx) = task_note("- [x] document the [ ] empty checkbox syntax\n");

	let result = toggle_task_status_inner(
		&mut idx,
		&path,
		1,
		"document the [ ] empty checkbox syntax",
		TaskStatus::Done,
		TaskStatus::Todo,
	)
	.unwrap();

	assert_eq!(
		std::fs::read_to_string(&path).unwrap(),
		"- [ ] document the [ ] empty checkbox syntax\n"
	);
	assert!(!result.stale);
}

#[test]
fn toggle_to_the_current_status_is_a_non_stale_noop() {
	let content = "- [x] call\n";
	let (_dir, path, mut idx) = task_note(content);

	let result =
		toggle_task_status_inner(&mut idx, &path, 1, "call", TaskStatus::Done, TaskStatus::Done)
			.unwrap();

	assert_eq!(std::fs::read_to_string(&path).unwrap(), content);
	assert_eq!(result.updated_content, content);
	assert!(!result.stale);
	assert!(!result.update_result.changed);
}

// --- Task / TaskStatus / TaskPriority IPC serde contract ----------------------
//
// `Task` and its enums mirror the TS string-literal unions in
// `tasks.types.ts` / `task-metadata.types.ts`. Field names must serialize
// camelCase and enum variants kebab-case, and every variant must round-trip
// (Deserialize is used when payloads come back over IPC). Behavioral tests
// for parsing (indent levels, 1-based line numbers, status chars, priority
// emojis) live inline in `src/vault/parsing.rs`; this section pins the wire
// contract of the structs themselves.

#[test]
fn task_status_all_variants_round_trip_kebab_case() {
	let cases = [
		(TaskStatus::Todo, "\"todo\""),
		(TaskStatus::Done, "\"done\""),
		(TaskStatus::Cancelled, "\"cancelled\""),
		(TaskStatus::InProgress, "\"in-progress\""),
		(TaskStatus::Question, "\"question\""),
		(TaskStatus::Forwarded, "\"forwarded\""),
		(TaskStatus::Important, "\"important\""),
	];
	for (status, json) in cases {
		assert_eq!(serde_json::to_string(&status).unwrap(), json);
		let back: TaskStatus = serde_json::from_str(json).unwrap();
		assert_eq!(back, status, "round-trip failed for {json}");
	}
}

#[test]
fn task_priority_all_variants_round_trip_kebab_case() {
	let cases = [
		(TaskPriority::Highest, "\"highest\""),
		(TaskPriority::High, "\"high\""),
		(TaskPriority::Medium, "\"medium\""),
		(TaskPriority::None, "\"none\""),
		(TaskPriority::Low, "\"low\""),
		(TaskPriority::Lowest, "\"lowest\""),
	];
	for (priority, json) in cases {
		assert_eq!(serde_json::to_string(&priority).unwrap(), json);
		let back: TaskPriority = serde_json::from_str(json).unwrap();
		assert_eq!(back, priority, "round-trip failed for {json}");
	}
}

#[test]
fn task_default_is_unchecked_todo_with_empty_metadata() {
	let t = Task::default();
	assert!(!t.checked);
	assert_eq!(t.indent, 0);
	assert_eq!(t.line_number, 0);
	assert_eq!(t.status, TaskStatus::Todo);
	assert_eq!(t.text, "");
	assert_eq!(t.metadata, TaskMetadata::default());
	assert!(t.metadata.tags.is_empty());
	assert!(t.metadata.priority.is_none());
}

#[test]
fn task_serializes_camel_case_field_names() {
	let task = Task {
		text: "Buy milk".to_string(),
		checked: true,
		indent: 2,
		line_number: 7,
		status: TaskStatus::Done,
		metadata: TaskMetadata::default(),
		heading: Some(3),
	};
	let json = serde_json::to_value(&task).unwrap();
	assert_eq!(json["heading"], 3);
	assert_eq!(json["lineNumber"], 7, "line_number must serialize as lineNumber");
	assert!(
		json.get("line_number").is_none(),
		"snake_case field name must not leak over IPC"
	);
	assert_eq!(json["checked"], true);
	assert_eq!(json["indent"], 2);
	assert_eq!(json["status"], "done");

	let back: Task = serde_json::from_value(json).unwrap();
	assert_eq!(back, task);
}

#[test]
fn task_with_max_line_number_round_trips_losslessly() {
	let task = Task {
		text: "edge".to_string(),
		line_number: usize::MAX,
		..Default::default()
	};
	let json = serde_json::to_string(&task).unwrap();
	let back: Task = serde_json::from_str(&json).unwrap();
	assert_eq!(back.line_number, usize::MAX);
	assert_eq!(back, task);
}

#[test]
fn task_metadata_minimal_json_deserializes_with_defaulted_options() {
	// IPC payloads may omit every optional signifier field — `default`
	// attributes must fill them with None instead of failing.
	let m: TaskMetadata =
		serde_json::from_str(r#"{"description":"plain task","tags":[]}"#).unwrap();
	assert_eq!(m.description, "plain task");
	assert!(m.tags.is_empty());
	assert!(m.due_date.is_none());
	assert!(m.scheduled_date.is_none());
	assert!(m.start_date.is_none());
	assert!(m.created_date.is_none());
	assert!(m.done_date.is_none());
	assert!(m.cancelled_date.is_none());
	assert!(m.priority.is_none());
	assert!(m.recurrence.is_none());
	assert!(m.id.is_none());
	assert!(m.depends_on.is_none());
	assert!(m.on_completion.is_none());
}

#[test]
fn task_metadata_with_all_fields_round_trips_camel_case() {
	let m = TaskMetadata {
		description: "full task".to_string(),
		due_date: Some("2026-06-11".to_string()),
		scheduled_date: Some("2026-06-12".to_string()),
		start_date: Some("2026-06-10".to_string()),
		created_date: Some("2026-06-01".to_string()),
		done_date: Some("2026-06-13".to_string()),
		cancelled_date: None,
		priority: Some(TaskPriority::High),
		recurrence: Some(kokobrain_lib::vault::task::RecurrenceRule {
			text: "every week".to_string(),
		}),
		id: Some("abc123".to_string()),
		depends_on: Some(vec!["xyz".to_string()]),
		on_completion: Some("delete".to_string()),
		tags: vec!["#work".to_string()],
	};
	let json = serde_json::to_value(&m).unwrap();
	assert_eq!(json["dueDate"], "2026-06-11");
	assert_eq!(json["priority"], "high");
	assert_eq!(json["dependsOn"][0], "xyz");
	assert_eq!(json["onCompletion"], "delete");
	// cancelled_date is None -> omitted entirely
	assert!(json.get("cancelledDate").is_none());

	let back: TaskMetadata = serde_json::from_value(json).unwrap();
	assert_eq!(back, m);
}
