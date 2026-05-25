//! Per-note metadata entry shape.
//!
//! Mirrors the TS surface at `src/lib/types/vault-v2.types.ts` (Phase 1.6).
//! Field shape matches `backlinks.logic.ts::WikiLink` for outgoing links
//! and uses `serde_json::Value` for arbitrary frontmatter so the
//! TS-side `FrontmatterValue` recursive type maps directly. Tags are
//! produced by `vault::parsing::extract_tags_strict` (Phase 1.3), which
//! mirrors `tags.logic.ts::extractAllTags` exactly. The permissive
//! `search::fts_logic::extract_tags` keeps its own broader rules for FTS
//! recall and intentionally diverges from this one.

use crate::vault::parsing::{
	extract_outgoing_links, extract_tags_strict, extract_tasks, parse_frontmatter,
	strip_frontmatter,
};
use crate::vault::task::Task;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::BTreeMap;

/// Maximum length (in bytes) of `NoteEntry::snippet`. Truncation is at a
/// codepoint boundary so the resulting `String` is always valid UTF-8.
const SNIPPET_MAX_LEN: usize = 280;

/// One outgoing wikilink in a note's body.
///
/// Mirrors `WikiLink` in `src/lib/features/backlinks/backlinks.types.ts`.
/// `position` is the byte offset of the opening `[[` in the original
/// content (before any frontmatter or code-fence stripping), so callers
/// that compute snippets can index directly into the note's raw bytes.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WikiLink {
	/// The wikilink target as written, after trimming surrounding whitespace
	/// and stripping the alias / heading suffixes.
	pub target: String,
	/// Optional alias following `|`, e.g. `[[target|alias]]`. `None` when absent.
	pub alias: Option<String>,
	/// Optional heading or block reference following `#`, e.g.
	/// `[[target#heading]]` or `[[target#^block-id]]`. `None` when absent.
	pub heading: Option<String>,
	/// Byte offset of the opening `[[` in the original content.
	pub position: usize,
}

/// One outgoing wikilink already resolved against the `VaultIndex` —
/// returned by `get_outgoing_links_v2` to the `OutgoingLinksPanel`.
/// Mirrors `outgoing-links.types.ts::OutgoingLink`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutgoingLink {
	/// The wikilink target as written, after trimming the alias / heading.
	pub target: String,
	/// Optional alias following `|`, e.g. `[[target|alias]]`. `None` when absent.
	pub alias: Option<String>,
	/// Optional heading or block reference following `#`. `None` when absent.
	pub heading: Option<String>,
	/// Absolute path the wikilink resolved to via the `by_path` cache.
	/// `None` for broken links (target file does not exist in the vault).
	pub resolved_path: Option<String>,
	/// Byte offset of the opening `[[` in the source content.
	pub position: usize,
}

/// One per-note record returned by `get_all_property_records` — the
/// projection consumed by the TS `collection.service` / kb-api. Mirrors
/// the existing TS `NoteRecord` shape one-for-one (`name`, `basename`,
/// `folder`, `ext`, `mtime` ms, `ctime` ms, `size`, `properties`).
///
/// IMPORTANT: `mtime` and `ctime` are MILLISECONDS here (TS-side
/// expectation) — the source `NoteEntry.modified_at` / `created_at` are
/// SECONDS. The conversion happens in `commands::vault::all_records`.
/// Phase 8.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteRecord {
	/// Absolute filesystem path.
	pub path: String,
	/// Basename including extension (e.g. `note.md`).
	pub name: String,
	/// Basename without extension (e.g. `note`).
	pub basename: String,
	/// Parent directory's absolute path (no trailing slash). Empty for
	/// root-level files.
	pub folder: String,
	/// Extension including the leading dot (e.g. `.md`). Empty for
	/// extensionless files.
	pub ext: String,
	/// Modified timestamp in MILLISECONDS since UNIX epoch. Converted
	/// from `NoteEntry.modified_at` (seconds) at projection time.
	pub mtime: i64,
	/// Created timestamp in MILLISECONDS since UNIX epoch. `0` when the
	/// filesystem doesn't expose creation time.
	pub ctime: i64,
	/// File size in bytes.
	pub size: u64,
	/// Frontmatter as a flat map. Mirrors TS `parseFrontmatterProperties`
	/// output minus the `Property` wrapper (the TS service maps it back
	/// after IPC).
	pub properties: BTreeMap<String, JsonValue>,
}

/// One unlinked mention of a vault note in the active note's body —
/// returned by `get_outgoing_unlinked_mentions_v2`. Mirrors
/// `outgoing-links.types.ts::OutgoingUnlinkedMention`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutgoingUnlinkedMention {
	/// Note name (basename without `.md` / `.markdown`).
	pub note_name: String,
	/// Absolute path of the mentioned note.
	pub note_path: String,
	/// Number of plain-text occurrences of `note_name` in the active body.
	pub count: usize,
}

/// A backlink from a frontmatter relationship field.
/// Carries the source entry info plus the relationship type label.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelationshipBacklink {
	/// Absolute path of the note that references the target.
	pub source_path: String,
	/// Title of the source note.
	pub source_name: String,
	/// Relationship type (e.g. "belongs_to", "related_to", or custom field name).
	pub relationship_type: String,
}

/// Canonical per-note metadata used by the Rust `VaultIndex`.
///
/// Constructed by Phase 1.5's `scan_vault_v2` and Phase 2's
/// `update_note_in_index`. The field set is fixed across the migration:
/// every consumer command (`get_backlinks_v2`, `get_outgoing_links_v2`,
/// `get_notes_with_tag`, etc.) returns slices or projections of this type.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct NoteEntry {
	/// Absolute filesystem path. Frontend keeps absolute paths everywhere
	/// (CLAUDE.md Indexing & Watcher item 5); we mirror that here so the
	/// path round-trips IPC without normalization.
	pub path: String,
	/// File name without the `.md` / `.markdown` extension. Equivalent to
	/// `backlinks.logic.ts::getNoteName(path)`.
	pub title: String,
	/// Parsed YAML frontmatter. Empty when the file has no frontmatter or
	/// the frontmatter failed to parse. Values are stored as
	/// `serde_json::Value`, which covers the TS `FrontmatterValue` recursive
	/// type (null / bool / number / string / array / object) without a custom
	/// enum. `BTreeMap` preserves a stable key order for tests and IPC
	/// snapshots.
	pub frontmatter: BTreeMap<String, JsonValue>,
	/// Outgoing wikilinks in document order.
	pub outgoing_links: Vec<WikiLink>,
	/// Tags after the strict extractor: deduplicated case-insensitively
	/// keeping the first occurrence's casing, trailing slashes stripped,
	/// digit-first identifiers rejected, HTML comments excluded.
	pub tags: Vec<String>,
	/// Last-modified time in seconds since the UNIX epoch. Sourced from the
	/// filesystem at scan time, not from the file's frontmatter.
	pub modified_at: i64,
	/// Created time in seconds since the UNIX epoch. Phase 8 — needed for
	/// kb-api / collection queries that expose `file.ctime`. `0` when the
	/// underlying filesystem doesn't expose creation time (Linux extX).
	pub created_at: i64,
	/// File size in bytes. Phase 8 — needed for kb-api / collection
	/// queries that expose `file.size`. Sourced from `fs::metadata` at
	/// scan time and at every save (`update_note_in_index` re-stats).
	pub size: u64,
	/// Whitespace-delimited word count of the body (post-frontmatter).
	pub word_count: usize,
	/// First non-empty body paragraph, capped at `SNIPPET_MAX_LEN` bytes
	/// (truncated at a codepoint boundary). Used by the future quick-
	/// switcher and command-palette previews so they don't have to re-read
	/// the file.
	pub snippet: String,
	/// Markdown task list items in document order. Phase 7 — populated by
	/// `vault::parsing::extract_tasks` at construction time. Empty Vec when
	/// the note has no tasks.
	pub tasks: Vec<Task>,
	/// Document type from the `type` frontmatter key (after alias resolution).
	/// Casing normalized: first letter uppercase, rest preserved.
	/// `None` when the note has no type field.
	pub is_a: Option<String>,
	/// Lifecycle flag: note has been explicitly organized. Default `false`.
	pub organized: bool,
	/// Lifecycle flag: note is archived (hidden from default views). Default `false`.
	pub archived: bool,
	/// Lifecycle flag: note is pinned as a favorite. Default `false`.
	pub favorite: bool,
	/// Hierarchical ownership targets from `belongs_to` frontmatter field.
	/// Wikilink targets extracted from the value (e.g. `[[project]]` -> `"project"`).
	pub belongs_to: Vec<String>,
	/// Lateral relationship targets from `related_to` frontmatter field.
	pub related_to: Vec<String>,
	/// Generic relationships: frontmatter fields whose values contain wikilinks.
	/// Key is the field name, value is the list of wikilink targets.
	pub relationships: BTreeMap<String, Vec<String>>,
}

impl NoteEntry {
	/// Builds a `NoteEntry` from a file's path, raw content, and last-
	/// modified timestamp. The `path` and `modified_at` are passed through
	/// verbatim; `title`, `frontmatter`, `outgoing_links`, `tags`,
	/// `word_count`, and `snippet` are derived from `content`.
	///
	/// `word_count` and `snippet` are computed over the BODY (post-
	/// frontmatter) so heavy frontmatter does not inflate counts or
	/// produce useless previews.
	pub fn from_content(path: String, content: &str, modified_at: i64) -> Self {
		Self::from_content_full(path, content, modified_at, 0, 0)
	}

	/// Like `from_content` but takes the file's `created_at` and `size`
	/// directly. Phase 8 — `scan_vault_v2` and `update_note_in_index` pass
	/// these in from `fs::metadata`. The simpler `from_content` keeps
	/// existing callers (and tests) working with default `0` values.
	pub fn from_content_full(
		path: String,
		content: &str,
		modified_at: i64,
		created_at: i64,
		size: u64,
	) -> Self {
		let title = extract_title_from_path(&path);
		let frontmatter = parse_frontmatter(content);
		let outgoing_links = extract_outgoing_links(content);
		let tags = extract_tags_strict(content);
		let tasks = extract_tasks(content);
		let is_a = extract_is_a(&frontmatter);
		let organized = extract_bool_flag(&frontmatter, "_organized");
		let archived = extract_bool_flag(&frontmatter, "_archived");
		let favorite = extract_bool_flag(&frontmatter, "_favorite");
		let belongs_to = extract_wikilink_targets(&frontmatter, "belongs_to");
		let related_to = extract_wikilink_targets(&frontmatter, "related_to");
		let relationships = extract_all_relationships(&frontmatter);
		let body = strip_frontmatter(content);
		let word_count = compute_word_count(body);
		let snippet = compute_snippet(body);
		Self {
			path,
			title,
			frontmatter,
			outgoing_links,
			tags,
			modified_at,
			created_at,
			size,
			word_count,
			snippet,
			tasks,
			is_a,
			organized,
			archived,
			favorite,
			belongs_to,
			related_to,
			relationships,
		}
	}
}

/// Extracts the title from a file path: filename without `.md` /
/// `.markdown` suffix. Equivalent to
/// `backlinks.logic.ts::getNoteName(path)`.
fn extract_title_from_path(path: &str) -> String {
	let name = path.rsplit('/').next().unwrap_or(path);
	name.strip_suffix(".md")
		.or_else(|| name.strip_suffix(".markdown"))
		.unwrap_or(name)
		.to_string()
}

/// Counts whitespace-delimited words in `body`. Empty bodies and bodies
/// containing only whitespace return 0.
fn compute_word_count(body: &str) -> usize {
	body.split_whitespace().count()
}

/// Returns the leading body content as a snippet: every non-blank line
/// (in document order, post-frontmatter) joined with single spaces, then
/// truncated to `SNIPPET_MAX_LEN` bytes at a codepoint boundary.
///
/// Blank lines are collapsed (skipped silently) rather than treated as
/// paragraph breaks. This keeps headings+paragraphs preview-friendly:
/// `# Title\n\nLead text` produces `"# Title Lead text"`, whereas a
/// stop-at-blank-line strategy would emit only `"# Title"` and lose the
/// useful preview content. Markdown structure (headings, code fences,
/// list markers) is preserved verbatim — the consumer's renderer decides
/// how to display it.
fn compute_snippet(body: &str) -> String {
	let mut snippet = String::new();
	for line in body.lines() {
		let trimmed = line.trim();
		if trimmed.is_empty() {
			continue;
		}
		if !snippet.is_empty() {
			snippet.push(' ');
		}
		snippet.push_str(trimmed);
		if snippet.len() >= SNIPPET_MAX_LEN {
			break;
		}
	}
	if snippet.len() > SNIPPET_MAX_LEN {
		let mut end = SNIPPET_MAX_LEN;
		while end > 0 && !snippet.is_char_boundary(end) {
			end -= 1;
		}
		snippet.truncate(end);
	}
	snippet
}

/// Extracts the `type` value from parsed frontmatter and normalizes casing
/// (first letter uppercase, rest preserved). Returns `None` when absent or
/// not a string.
fn extract_is_a(frontmatter: &BTreeMap<String, JsonValue>) -> Option<String> {
	let val = frontmatter.get("type")?;
	let s = val.as_str()?;
	if s.is_empty() {
		return None;
	}
	Some(normalize_type_casing(s))
}

/// First letter uppercase, rest preserved.
fn normalize_type_casing(s: &str) -> String {
	let mut chars = s.chars();
	match chars.next() {
		None => String::new(),
		Some(c) => c.to_uppercase().to_string() + chars.as_str(),
	}
}

/// Extracts a boolean flag from frontmatter. Returns `false` when absent
/// or not a boolean value.
fn extract_bool_flag(frontmatter: &BTreeMap<String, JsonValue>, key: &str) -> bool {
	frontmatter
		.get(key)
		.and_then(|v| v.as_bool())
		.unwrap_or(false)
}

/// Extracts wikilink targets from a frontmatter field value.
/// Supports string values (`"[[target]]"`) and arrays (`["[[a]]", "[[b]]"]`).
fn extract_wikilink_targets(frontmatter: &BTreeMap<String, JsonValue>, key: &str) -> Vec<String> {
	let Some(val) = frontmatter.get(key) else {
		return Vec::new();
	};
	match val {
		JsonValue::String(s) => extract_wikilinks_from_str(s),
		JsonValue::Array(arr) => {
			arr.iter()
				.filter_map(|v| v.as_str())
				.flat_map(extract_wikilinks_from_str)
				.collect()
		}
		_ => Vec::new(),
	}
}

/// Extracts all frontmatter fields (excluding known system keys) that contain
/// wikilinks in their values. Returns a map of field name -> wikilink targets.
fn extract_all_relationships(frontmatter: &BTreeMap<String, JsonValue>) -> BTreeMap<String, Vec<String>> {
	const SYSTEM_KEYS: &[&str] = &[
		"type", "belongs_to", "related_to",
		"_organized", "_archived", "_favorite",
		"_order", "_sort", "_icon", "_sidebar_label",
		"_color", "_title_color", "_template", "_view", "_visible",
		"_list_properties_display",
		"tags", "aliases",
	];
	let mut result = BTreeMap::new();
	for (key, val) in frontmatter {
		if SYSTEM_KEYS.contains(&key.as_str()) {
			continue;
		}
		let targets = match val {
			JsonValue::String(s) => extract_wikilinks_from_str(s),
			JsonValue::Array(arr) => {
				arr.iter()
					.filter_map(|v| v.as_str())
					.flat_map(extract_wikilinks_from_str)
					.collect()
			}
			_ => Vec::new(),
		};
		if !targets.is_empty() {
			result.insert(key.clone(), targets);
		}
	}
	result
}

/// Extracts wikilink targets (`[[target]]`) from a string value.
fn extract_wikilinks_from_str(s: &str) -> Vec<String> {
	let mut targets = Vec::new();
	let bytes = s.as_bytes();
	let mut i = 0;
	while i + 1 < bytes.len() {
		if bytes[i] == b'[' && bytes[i + 1] == b'[' {
			i += 2;
			let start = i;
			while i + 1 < bytes.len() && !(bytes[i] == b']' && bytes[i + 1] == b']') {
				i += 1;
			}
			if i + 1 < bytes.len() {
				let raw = &s[start..i];
				let target = raw.split('|').next().unwrap_or(raw);
				let target = target.split('#').next().unwrap_or(target);
				let trimmed = target.trim();
				if !trimmed.is_empty() {
					targets.push(trimmed.to_string());
				}
				i += 2;
			}
		} else {
			i += 1;
		}
	}
	targets
}

#[cfg(test)]
mod tests {
	use super::*;
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
			is_a: None,
			organized: false,
			archived: false,
			favorite: false,
			belongs_to: Vec::new(),
			related_to: Vec::new(),
			relationships: BTreeMap::new(),
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
			"isA",
			"organized",
			"archived",
			"favorite",
			"belongsTo",
			"relatedTo",
			"relationships",
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
			is_a: None,
			organized: false,
			archived: false,
			favorite: false,
			belongs_to: Vec::new(),
			related_to: Vec::new(),
			relationships: BTreeMap::new(),
		};

		let json = serde_json::to_string(&original).unwrap();
		let parsed: NoteEntry = serde_json::from_str(&json).unwrap();
		assert_eq!(parsed, original);
	}

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
		// e\u{0301} (e + combining acute) is 3 bytes. Build a body whose
		// 280-byte truncation would land mid-codepoint without the boundary
		// rewind. The output length must be <= 280 AND a valid char boundary.
		let body: String = "caf\u{00e9} ".repeat(80); // each "caf\u{00e9} " is 6 bytes
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

	#[test]
	fn from_content_extracts_is_a_from_type_field() {
		let content = "---\ntype: Project\ntitle: Launch\n---\nBody";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.is_a, Some("Project".to_string()));
	}

	#[test]
	fn from_content_normalizes_is_a_casing_lowercase() {
		let content = "---\ntype: project\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.is_a, Some("Project".to_string()));
	}

	#[test]
	fn from_content_normalizes_is_a_casing_allcaps() {
		let content = "---\ntype: NOTE\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.is_a, Some("NOTE".to_string()));
	}

	#[test]
	fn from_content_is_a_none_when_no_type_field() {
		let content = "---\ntitle: Hello\n---\nBody";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.is_a, None);
	}

	#[test]
	fn from_content_is_a_via_alias_is_a() {
		let content = "---\nis_a: Person\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.is_a, Some("Person".to_string()));
	}

	#[test]
	fn from_content_is_a_none_for_empty_type_value() {
		let content = "---\ntype:\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.is_a, None);
	}

	#[test]
	fn from_content_is_a_none_for_non_string_type() {
		let content = "---\ntype: [a, b]\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.is_a, None);
	}

	#[test]
	fn from_content_lifecycle_flags_default_false() {
		let content = "---\ntitle: Hello\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(!entry.organized);
		assert!(!entry.archived);
		assert!(!entry.favorite);
	}

	#[test]
	fn from_content_organized_flag_from_canonical_key() {
		let content = "---\n_organized: true\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(entry.organized);
	}

	#[test]
	fn from_content_archived_flag_from_canonical_key() {
		let content = "---\n_archived: true\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(entry.archived);
	}

	#[test]
	fn from_content_favorite_flag_from_canonical_key() {
		let content = "---\n_favorite: true\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(entry.favorite);
	}

	#[test]
	fn from_content_lifecycle_flags_via_aliases() {
		let content = "---\norganized: true\narchived: true\nfavorite: true\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(entry.organized);
		assert!(entry.archived);
		assert!(entry.favorite);
	}

	#[test]
	fn from_content_lifecycle_flags_false_when_explicit() {
		let content = "---\n_organized: false\n_archived: false\n_favorite: false\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(!entry.organized);
		assert!(!entry.archived);
		assert!(!entry.favorite);
	}

	#[test]
	fn from_content_lifecycle_flags_ignore_non_boolean() {
		let content = "---\n_organized: yes\n_archived: 1\n_favorite: on\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(!entry.organized);
		assert!(!entry.archived);
		assert!(!entry.favorite);
	}

	#[test]
	fn from_content_belongs_to_single_wikilink() {
		let content = "---\nbelongs_to: \"[[project]]\"\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.belongs_to, vec!["project"]);
	}

	#[test]
	fn from_content_belongs_to_array_of_wikilinks() {
		let content = "---\nbelongs_to: [\"[[a]]\", \"[[b]]\"]\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.belongs_to, vec!["a", "b"]);
	}

	#[test]
	fn from_content_belongs_to_via_alias() {
		let content = "---\nbelongs to: \"[[project]]\"\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.belongs_to, vec!["project"]);
	}

	#[test]
	fn from_content_related_to_single_wikilink() {
		let content = "---\nrelated_to: \"[[maps]]\"\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.related_to, vec!["maps"]);
	}

	#[test]
	fn from_content_relationships_empty_when_no_wikilinks() {
		let content = "---\ntitle: Hello\nstatus: draft\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(entry.relationships.is_empty());
	}

	#[test]
	fn from_content_relationships_custom_field_with_wikilink() {
		let content = "---\nmentor: \"[[john]]\"\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.relationships.get("mentor"), Some(&vec!["john".to_string()]));
	}

	#[test]
	fn from_content_relationships_excludes_system_keys() {
		let content = "---\ntype: Project\ntags: [work]\nmentor: \"[[john]]\"\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(!entry.relationships.contains_key("type"));
		assert!(!entry.relationships.contains_key("tags"));
		assert!(entry.relationships.contains_key("mentor"));
	}

	#[test]
	fn from_content_wikilink_strips_alias_and_heading() {
		let content = "---\nbelongs_to: \"[[project|My Project]]\"\nrelated_to: \"[[note#section]]\"\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert_eq!(entry.belongs_to, vec!["project"]);
		assert_eq!(entry.related_to, vec!["note"]);
	}

	#[test]
	fn from_content_belongs_to_empty_when_absent() {
		let content = "---\ntitle: No rels\n---\n";
		let entry = NoteEntry::from_content("/n.md".into(), content, 0);
		assert!(entry.belongs_to.is_empty());
		assert!(entry.related_to.is_empty());
	}
}
