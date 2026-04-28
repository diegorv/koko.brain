//! Phase 1.1 — `NoteEntry` shape + serde camelCase contract.
//!
//! These tests pin the over-the-wire JSON encoding because the TS mirror at
//! `src/lib/types/vault-v2.types.ts` (Phase 1.6) and every consumer command
//! (`get_backlinks_v2`, `get_outgoing_links_v2`, `update_note_in_index`)
//! depend on the camelCase field names. A field rename here without a
//! matching TS update is a silent breakage; lock the shape with explicit
//! key assertions.

use kokobrain_lib::vault::entry::{NoteEntry, WikiLink};
use serde_json::{json, Value};
use std::collections::BTreeMap;

#[test]
fn note_entry_default_is_empty() {
	let entry = NoteEntry::default();
	assert_eq!(entry.path, "");
	assert_eq!(entry.title, "");
	assert!(entry.frontmatter.is_empty());
	assert!(entry.outgoing_links.is_empty());
	assert!(entry.tags.is_empty());
	assert_eq!(entry.modified_at, 0);
	assert_eq!(entry.word_count, 0);
	assert_eq!(entry.snippet, "");
}

#[test]
fn wikilink_default_is_empty() {
	let link = WikiLink::default();
	assert_eq!(link.target, "");
	assert!(link.alias.is_none());
	assert!(link.heading.is_none());
	assert_eq!(link.position, 0);
}

#[test]
fn wikilink_serializes_with_camel_case_position_field() {
	let link = WikiLink {
		target: "Daily/2026-04-28".to_string(),
		alias: Some("today".to_string()),
		heading: Some("agenda".to_string()),
		position: 42,
	};

	let value = serde_json::to_value(&link).unwrap();
	assert_eq!(value["target"], "Daily/2026-04-28");
	assert_eq!(value["alias"], "today");
	assert_eq!(value["heading"], "agenda");
	assert_eq!(value["position"], 42);
}

#[test]
fn wikilink_serializes_optional_fields_as_null_when_absent() {
	let link = WikiLink {
		target: "plain".to_string(),
		..Default::default()
	};
	let value = serde_json::to_value(&link).unwrap();
	assert!(value["alias"].is_null());
	assert!(value["heading"].is_null());
}

#[test]
fn wikilink_round_trips_through_json() {
	let original = WikiLink {
		target: "Note With Spaces".to_string(),
		alias: None,
		heading: Some("section".to_string()),
		position: 100,
	};
	let json = serde_json::to_string(&original).unwrap();
	let parsed: WikiLink = serde_json::from_str(&json).unwrap();
	assert_eq!(parsed, original);
}

#[test]
fn note_entry_serializes_with_camel_case_keys() {
	let mut frontmatter = BTreeMap::new();
	frontmatter.insert("status".to_string(), json!("draft"));
	frontmatter.insert("priority".to_string(), json!(3));

	let entry = NoteEntry {
		path: "/abs/path/note.md".to_string(),
		title: "note".to_string(),
		frontmatter,
		outgoing_links: vec![WikiLink {
			target: "linked".to_string(),
			alias: None,
			heading: None,
			position: 12,
		}],
		tags: vec!["work".to_string(), "alpha".to_string()],
		modified_at: 1714305600,
		created_at: 1714000000,
		size: 1024,
		word_count: 215,
		snippet: "This is the first paragraph.".to_string(),
		tasks: Vec::new(),
	};

	let value = serde_json::to_value(&entry).unwrap();
	let obj = value.as_object().unwrap();

	// Pin every field name. Renames here MUST be matched in vault-v2.types.ts.
	let expected_keys = [
		"path",
		"title",
		"frontmatter",
		"outgoingLinks",
		"tags",
		"modifiedAt",
		"createdAt",
		"size",
		"wordCount",
		"snippet",
		"tasks",
	];
	for key in expected_keys {
		assert!(obj.contains_key(key), "missing key: {}", key);
	}
	// Sanity-check there are no rogue snake_case keys leaking through.
	for key in obj.keys() {
		assert!(!key.contains('_'), "snake_case key leaked: {}", key);
	}

	assert_eq!(value["path"], "/abs/path/note.md");
	assert_eq!(value["title"], "note");
	assert_eq!(value["modifiedAt"], 1714305600);
	assert_eq!(value["wordCount"], 215);
	assert_eq!(value["outgoingLinks"][0]["position"], 12);
	assert_eq!(value["frontmatter"]["status"], "draft");
	assert_eq!(value["frontmatter"]["priority"], 3);
}

#[test]
fn note_entry_frontmatter_preserves_arbitrary_json_value_shapes() {
	let mut frontmatter = BTreeMap::new();
	frontmatter.insert("scalar".to_string(), Value::String("text".to_string()));
	frontmatter.insert("number".to_string(), json!(1.5));
	frontmatter.insert("bool".to_string(), json!(true));
	frontmatter.insert("null".to_string(), Value::Null);
	frontmatter.insert("array".to_string(), json!(["a", "b", "c"]));
	frontmatter.insert("nested".to_string(), json!({ "deep": { "deeper": "v" } }));

	let entry = NoteEntry {
		frontmatter,
		..Default::default()
	};

	let value = serde_json::to_value(&entry).unwrap();
	assert_eq!(value["frontmatter"]["scalar"], "text");
	assert_eq!(value["frontmatter"]["number"], 1.5);
	assert_eq!(value["frontmatter"]["bool"], true);
	assert!(value["frontmatter"]["null"].is_null());
	assert_eq!(value["frontmatter"]["array"][1], "b");
	assert_eq!(value["frontmatter"]["nested"]["deep"]["deeper"], "v");
}

#[test]
fn note_entry_round_trips_through_json() {
	let mut frontmatter = BTreeMap::new();
	frontmatter.insert("tags".to_string(), json!(["work", "draft"]));

	let original = NoteEntry {
		path: "/v/n.md".to_string(),
		title: "n".to_string(),
		frontmatter,
		outgoing_links: vec![WikiLink {
			target: "other".to_string(),
			alias: Some("o".to_string()),
			heading: None,
			position: 7,
		}],
		tags: vec!["work".to_string()],
		modified_at: 42,
		created_at: 30,
		size: 100,
		word_count: 10,
		snippet: "snip".to_string(),
		tasks: Vec::new(),
	};

	let json = serde_json::to_string(&original).unwrap();
	let parsed: NoteEntry = serde_json::from_str(&json).unwrap();
	assert_eq!(parsed, original);
}

// --- NoteEntry::from_content (Phase 1.5) ------------------------------------
//
// Builds a full NoteEntry from a (path, content, mtime) triple. The
// extractors landed in 1.2-1.4 are already covered by vault_parsing_test;
// these tests focus on the GLUE: title derivation, body-scoped word count,
// snippet shape + truncation, and that the right extractors get the right
// inputs.

#[test]
fn from_content_empty_string_yields_zero_word_count_and_empty_snippet() {
	let entry = NoteEntry::from_content("/abs/note.md".into(), "", 1714305600);
	assert_eq!(entry.path, "/abs/note.md");
	assert_eq!(entry.title, "note");
	assert_eq!(entry.modified_at, 1714305600);
	assert_eq!(entry.word_count, 0);
	assert_eq!(entry.snippet, "");
	assert!(entry.frontmatter.is_empty());
	assert!(entry.outgoing_links.is_empty());
	assert!(entry.tags.is_empty());
}

#[test]
fn from_content_strips_md_extension_for_title() {
	let entry = NoteEntry::from_content("/abs/Daily Note.md".into(), "", 0);
	assert_eq!(entry.title, "Daily Note");
}

#[test]
fn from_content_strips_markdown_extension_for_title() {
	let entry = NoteEntry::from_content("/abs/Wiki Page.markdown".into(), "", 0);
	assert_eq!(entry.title, "Wiki Page");
}

#[test]
fn from_content_keeps_filename_when_no_known_extension() {
	let entry = NoteEntry::from_content("/abs/README".into(), "", 0);
	assert_eq!(entry.title, "README");
}

#[test]
fn from_content_title_uses_basename_for_nested_paths() {
	let entry =
		NoteEntry::from_content("/Users/me/vault/area/sub/note.md".into(), "", 0);
	assert_eq!(entry.title, "note");
}

#[test]
fn from_content_word_count_skips_frontmatter() {
	let content = "---\ntitle: Heavy\nauthor: me\nrating: 5\n---\nbody one two three four five";
	let entry = NoteEntry::from_content("/n.md".into(), content, 0);
	assert_eq!(entry.word_count, 6); // body has 6 whitespace-delimited tokens
}

#[test]
fn from_content_word_count_handles_multiple_lines() {
	let content = "first paragraph\nsecond line still part of it.\n\nThird paragraph here.";
	let entry = NoteEntry::from_content("/n.md".into(), content, 0);
	assert_eq!(entry.word_count, 11);
}

#[test]
fn from_content_word_count_zero_when_body_is_only_whitespace() {
	let entry = NoteEntry::from_content("/n.md".into(), "   \n\n\t\t\n", 0);
	assert_eq!(entry.word_count, 0);
}

#[test]
fn from_content_snippet_joins_non_blank_lines_with_spaces() {
	// Blank lines are collapsed (not treated as paragraph terminators) so
	// `# Heading\n\nLead paragraph` produces a useful preview rather than
	// stopping at the heading. See compute_snippet docs for rationale.
	let content = "First sentence.\nSecond sentence still in para 1.\n\nSecond paragraph included too.";
	let entry = NoteEntry::from_content("/n.md".into(), content, 0);
	assert_eq!(
		entry.snippet,
		"First sentence. Second sentence still in para 1. Second paragraph included too.",
	);
}

#[test]
fn from_content_snippet_skips_leading_blank_lines() {
	let content = "\n\n  \nFirst real line.";
	let entry = NoteEntry::from_content("/n.md".into(), content, 0);
	assert_eq!(entry.snippet, "First real line.");
}

#[test]
fn from_content_snippet_truncates_at_280_bytes() {
	let line = "x ".repeat(200); // 400 chars / bytes
	let content = format!("---\n---\n{line}");
	let entry = NoteEntry::from_content("/n.md".into(), &content, 0);
	assert!(entry.snippet.len() <= 280);
	assert!(entry.snippet.len() > 0);
	assert!(entry.snippet.is_char_boundary(entry.snippet.len()));
}

#[test]
fn from_content_snippet_truncates_at_codepoint_boundary_for_multibyte() {
	// é (e + combining acute) is 3 bytes via "e\u{0301}". Build a body whose
	// 280-byte truncation would land mid-codepoint without the boundary
	// rewind. The output length must be <= 280 AND a valid char boundary.
	let body: String = "café ".repeat(80); // each "café " is 6 bytes
	let content = format!("---\n---\n{body}");
	let entry = NoteEntry::from_content("/n.md".into(), &content, 0);
	assert!(entry.snippet.len() <= 280);
	assert!(entry.snippet.is_char_boundary(entry.snippet.len()));
	// Should still be valid UTF-8 (implicit by being a String, but make it
	// explicit by re-validating).
	std::str::from_utf8(entry.snippet.as_bytes())
		.expect("snippet should be valid UTF-8");
}

#[test]
fn from_content_full_document_populates_all_fields() {
	let content = "---\ntitle: Q2 Review\ntags: [work, q2]\nrating: 4.5\n---\n# Heading\n\nThis is the lead paragraph linking to [[Other Note]] and tagging #project.\n\nMore content below.";
	let entry =
		NoteEntry::from_content("/abs/Q2 Review.md".into(), content, 1714305600);

	assert_eq!(entry.path, "/abs/Q2 Review.md");
	assert_eq!(entry.title, "Q2 Review");
	assert_eq!(entry.modified_at, 1714305600);

	// Frontmatter (parsed via parse_frontmatter): title, tags, rating
	assert_eq!(
		entry.frontmatter.get("title"),
		Some(&serde_json::Value::String("Q2 Review".to_string())),
	);
	assert_eq!(entry.frontmatter.get("tags"), Some(&json!(["work", "q2"])));
	assert_eq!(entry.frontmatter.get("rating"), Some(&json!(4.5)));

	// Outgoing links: just the wikilink in the body.
	assert_eq!(entry.outgoing_links.len(), 1);
	assert_eq!(entry.outgoing_links[0].target, "Other Note");

	// Tags: frontmatter (work, q2) merged with inline (project).
	assert_eq!(entry.tags, vec!["work", "q2", "project"]);

	// Word count is body-scoped (excludes frontmatter).
	assert!(entry.word_count > 0);
	assert!(entry.word_count < 30, "word count should not include frontmatter");

	// Snippet joins all non-blank body lines with spaces. Heading and
	// lead paragraph appear together for a useful preview.
	assert!(entry.snippet.starts_with("# Heading"));
	assert!(entry.snippet.contains("[[Other Note]]"));
	assert!(entry.snippet.contains("More content below"));
}
