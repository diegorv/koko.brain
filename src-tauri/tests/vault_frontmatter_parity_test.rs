//! Pins the Rust frontmatter reader against the shared parity fixture
//! (`src/tests/fixtures/frontmatter-parity.fixture.json`). The TS side
//! (`frontmatter-parity.test.ts`) checks the same bytes against
//! `serializeProperties` and `yaml.parse`, so a case that passes on both
//! sides means the Properties panel and the Rust index agree.

use kokobrain_lib::vault::entry::NoteEntry;
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::parsing::{parse_frontmatter, parse_frontmatter_raw_yaml};
use serde_json::{json, Map, Value};
use std::process::Command;

const FIXTURE: &str = include_str!("../../src/tests/fixtures/frontmatter-parity.fixture.json");

/// Returns the fixture's `cases` array.
fn cases() -> Vec<Value> {
	let fixture: Value = serde_json::from_str(FIXTURE).expect("fixture is valid JSON");
	fixture["cases"].as_array().expect("cases array").clone()
}

/// Converts a parsed frontmatter map into a JSON object for comparison.
fn as_object(map: std::collections::BTreeMap<String, Value>) -> Value {
	Value::Object(map.into_iter().collect::<Map<String, Value>>())
}

#[test]
fn every_fixture_case_parses_to_its_rust_value() {
	let mut failures = Vec::new();
	for case in cases() {
		let name = case["name"].as_str().unwrap();
		let yaml = case["yaml"].as_str().unwrap();
		let expected = case.get("rustExpected").unwrap_or(&case["expected"]);
		let actual = as_object(parse_frontmatter(&format!("---\n{yaml}\n---\n")));
		if &actual != expected {
			failures.push(format!("{name}: expected {expected}, got {actual}"));
		}
	}
	assert!(failures.is_empty(), "fixture mismatches:\n{}", failures.join("\n"));
}

#[test]
fn view_files_use_the_same_parser_and_projection() {
	let mut failures = Vec::new();
	for case in cases() {
		let name = case["name"].as_str().unwrap();
		let yaml = case["yaml"].as_str().unwrap();
		let expected = case.get("rustExpected").unwrap_or(&case["expected"]);
		let actual = as_object(parse_frontmatter_raw_yaml(&format!("{yaml}\n")));
		if &actual != expected {
			failures.push(format!("{name}: expected {expected}, got {actual}"));
		}
	}
	assert!(failures.is_empty(), "fixture mismatches:\n{}", failures.join("\n"));
}

#[test]
fn view_file_with_a_map_inside_views_keeps_its_siblings() {
	let content = "_sidebar_label: People\n_sort: title\nviews:\n  - type: table\n    name: People\n";
	let map = parse_frontmatter_raw_yaml(content);
	assert_eq!(map.get("_sidebar_label"), Some(&json!("People")));
	assert_eq!(map.get("_sort"), Some(&json!("title")));
	assert_eq!(map.get("views"), Some(&json!([null])));
}

#[test]
fn related_to_with_a_comma_in_the_name_reaches_the_relationship_index() {
	let source = NoteEntry::from_content(
		"/v/source.md".to_string(),
		"---\n_related_to: [\"[[Smith, John]]\", \"[[C]]\"]\n---\nBody\n",
		0,
	);
	assert_eq!(source.related_to, vec!["Smith, John".to_string(), "C".to_string()]);

	let target = NoteEntry::from_content("/v/Smith, John.md".to_string(), "Body\n", 0);
	let mut idx = VaultIndex::default();
	idx.build(vec![source, target]);
	let backlinks = idx.lookup_relationship_backlinks("/v/Smith, John.md");
	assert_eq!(backlinks.len(), 1);
	assert_eq!(backlinks[0].source_path, "/v/source.md");
	assert_eq!(backlinks[0].relationship_type, "related_to");
}

#[test]
fn unquoted_wikilink_value_is_a_relationship() {
	let entry = NoteEntry::from_content(
		"/v/source.md".to_string(),
		"---\nmentor: [[A]]\n_related_to:\n  - [[B]]\n---\n",
		0,
	);
	assert_eq!(entry.related_to, vec!["B".to_string()]);
	assert_eq!(entry.relationships.get("mentor"), Some(&vec!["A".to_string()]));
}

#[test]
fn top_level_scalar_or_list_document_is_an_empty_map() {
	assert!(parse_frontmatter("---\njust text\n---\n").is_empty());
	assert!(parse_frontmatter("---\n- a\n- b\n---\n").is_empty());
}

// --- Fallback log --------------------------------------------------------------
//
// `debug_log` writes to stderr only when debug mode is on, and libtest
// swallows stderr, so the parent test re-runs this binary filtered to the
// child (same self-exec pattern as `utils_logger_test.rs`).

/// Child half: parses every fixture case with debug mode on, printing a
/// `CASE <name>` marker to stderr before each one.
#[test]
fn selftest_child_parses_with_debug_on() {
	if std::env::var("KOKO_FRONTMATTER_SELFTEST").as_deref() != Ok("emit") {
		return;
	}
	kokobrain_lib::utils::logger::set_debug_mode(true);
	for case in cases() {
		eprintln!("CASE {}", case["name"].as_str().unwrap());
		parse_frontmatter(&format!("---\n{}\n---\n", case["yaml"].as_str().unwrap()));
	}
}

/// Every `fallback` case logs exactly one `FRONTMATTER` line and every
/// other case logs none, which also proves the fallback cases really are
/// rejected by yaml-rust2 rather than parsed to the same value.
#[test]
fn each_fallback_case_emits_exactly_one_frontmatter_log() {
	let exe = std::env::current_exe().expect("test binary path");
	let output = Command::new(exe)
		.args(["selftest_child_parses_with_debug_on", "--exact", "--nocapture", "--test-threads=1"])
		.env("KOKO_FRONTMATTER_SELFTEST", "emit")
		.output()
		.expect("spawn child test");
	let stderr = String::from_utf8_lossy(&output.stderr);
	assert!(output.status.success(), "child failed: {stderr}");

	let mut logs_per_case: Vec<(String, usize)> = Vec::new();
	for line in stderr.lines() {
		if let Some(name) = line.strip_prefix("CASE ") {
			logs_per_case.push((name.to_string(), 0));
		} else if line.contains("[FRONTMATTER]") {
			logs_per_case.last_mut().expect("log after a case marker").1 += 1;
		}
	}
	let cases = cases();
	assert_eq!(logs_per_case.len(), cases.len(), "child output: {stderr}");
	for (case, (name, logs)) in cases.iter().zip(&logs_per_case) {
		let expected = usize::from(case.get("fallback") == Some(&Value::Bool(true)));
		assert_eq!(*logs, expected, "{name}: expected {expected} FRONTMATTER log(s)");
	}
}

#[test]
fn nested_alias_expansion_is_capped() {
	let mut yaml = String::from("a0: &a0 [x, x, x, x, x, x, x, x, x, x]\n");
	for i in 1..30 {
		let prev = i - 1;
		yaml.push_str(&format!("a{i}: &a{i} [*a{prev}, *a{prev}, *a{prev}, *a{prev}]\n"));
	}
	let map = parse_frontmatter(&format!("---\n{yaml}---\n"));
	assert_eq!(map.len(), 30);
	assert_eq!(map.get("a29"), Some(&json!([null, null, null, null])));
	assert_eq!(map.get("a0"), Some(&json!(["x", "x", "x", "x", "x", "x", "x", "x", "x", "x"])));
}
