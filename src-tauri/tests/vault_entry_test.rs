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
		word_count: 215,
		snippet: "This is the first paragraph.".to_string(),
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
		"wordCount",
		"snippet",
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
		word_count: 10,
		snippet: "snip".to_string(),
	};

	let json = serde_json::to_string(&original).unwrap();
	let parsed: NoteEntry = serde_json::from_str(&json).unwrap();
	assert_eq!(parsed, original);
}
