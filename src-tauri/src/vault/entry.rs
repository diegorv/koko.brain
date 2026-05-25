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
		"_color", "_template", "_view", "_visible",
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
