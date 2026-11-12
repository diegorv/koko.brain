//! Pins the task headings the indexer records (`NoteEntry.task_headings`,
//! `Task.heading`) against the shared parity fixture
//! (`src/tests/fixtures/task-headings-parity.fixture.json`). The e2e mock
//! parser is checked against the same fixture in
//! `src/tests/e2e/task-headings-parity.test.ts`, so the mock cannot drift.

use kokobrain_lib::vault::entry::NoteEntry;
use serde_json::{json, Map, Value};

const FIXTURE: &str = include_str!("../../src/tests/fixtures/task-headings-parity.fixture.json");

/// The wire fields the fixture pins: `taskHeadings` when present, and each
/// task's `text`, `lineNumber` and `heading` when present.
fn heading_fields(entry: &NoteEntry) -> Value {
	let wire = serde_json::to_value(entry).expect("entry serializes");
	let mut out = Map::new();
	if let Some(headings) = wire.get("taskHeadings") {
		out.insert("taskHeadings".to_string(), headings.clone());
	}
	let tasks: Vec<Value> = wire["tasks"]
		.as_array()
		.expect("tasks array")
		.iter()
		.map(|t| {
			let mut task = Map::new();
			task.insert("text".to_string(), t["text"].clone());
			task.insert("lineNumber".to_string(), t["lineNumber"].clone());
			if let Some(h) = t.get("heading") {
				task.insert("heading".to_string(), h.clone());
			}
			Value::Object(task)
		})
		.collect();
	out.insert("tasks".to_string(), json!(tasks));
	Value::Object(out)
}

#[test]
fn indexer_records_the_fixture_headings() {
	let fixture: Value = serde_json::from_str(FIXTURE).expect("fixture is valid JSON");
	let cases = fixture["cases"].as_array().expect("cases array");
	assert!(!cases.is_empty());
	for case in cases {
		let name = case["name"].as_str().expect("case name");
		let content = case["content"].as_str().expect("case content");
		let entry = NoteEntry::from_content("/vault/note.md".to_string(), content, 0);
		assert_eq!(heading_fields(&entry), case["expected"], "case: {name}");
	}
}
