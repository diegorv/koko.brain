//! Pins the TS token patchers (`setDueToken` / `setPriorityToken` in
//! `src/lib/utils/task-tokens.ts`) against the Rust task parser through the
//! shared fixture (`src/tests/fixtures/task-line-edits.fixture.json`). The TS
//! test checks each `text` + `op` gives `expected`; this one checks that
//! `parse_task_metadata(expected)` carries the op's due date or priority and
//! every other field of `parse_task_metadata(text)`, so a patched text parses
//! back as only that one change.
//!
//! One allowance: the parser reads one priority signifier and leaves any
//! other in the description, and a priority op drops every one it does not
//! keep. So for a priority op the wanted description is that of `text` with
//! every priority signifier removed.

use kokobrain_lib::vault::parsing::parse_task_metadata;
use kokobrain_lib::vault::task::TaskPriority;
use serde_json::Value;

const FIXTURE: &str = include_str!("../../src/tests/fixtures/task-line-edits.fixture.json");

/// Rust `PRIORITY_EMOJIS`.
const PRIORITY_EMOJIS: [char; 5] = ['🔺', '⏫', '🔼', '🔽', '⏬'];

/// `text` without its priority signifiers and the variation selector after each.
fn without_priority_signifiers(text: &str) -> String {
	let mut out = String::with_capacity(text.len());
	let mut after_signifier = false;
	for c in text.chars() {
		let is_signifier = PRIORITY_EMOJIS.contains(&c);
		if !is_signifier && !(after_signifier && c == '\u{FE0F}') {
			out.push(c);
		}
		after_signifier = is_signifier;
	}
	out
}

fn priority(name: &str) -> TaskPriority {
	match name {
		"highest" => TaskPriority::Highest,
		"high" => TaskPriority::High,
		"medium" => TaskPriority::Medium,
		"low" => TaskPriority::Low,
		"lowest" => TaskPriority::Lowest,
		other => panic!("unknown fixture priority {other:?}"),
	}
}

#[test]
fn every_expected_text_parses_as_text_with_only_the_op_applied() {
	let fixture: Value = serde_json::from_str(FIXTURE).expect("fixture is valid JSON");
	let cases = fixture["cases"].as_array().expect("cases array");
	assert!(!cases.is_empty(), "fixture holds no cases");
	let mut failures = Vec::new();
	for case in cases {
		let name = case["name"].as_str().expect("name");
		let text = case["text"].as_str().expect("text");
		let expected = case["expected"].as_str().expect("expected");
		let op = &case["op"];
		let before = parse_task_metadata(text);
		let after = parse_task_metadata(expected);
		let mut want = before.clone();
		match op["kind"].as_str().expect("op kind") {
			"due" => want.due_date = op["date"].as_str().map(String::from),
			"priority" => {
				want.priority = op["priority"].as_str().map(priority);
				want.description = parse_task_metadata(&without_priority_signifiers(text)).description;
			}
			other => panic!("{name}: unknown op kind {other:?}"),
		}
		if after != want {
			failures.push(format!("{name}:\n  expected text parses as {after:?}\n  want                    {want:?}"));
		}
	}
	assert!(failures.is_empty(), "{}", failures.join("\n"));
}
