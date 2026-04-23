//! `NoteEntry` — the atomic unit of the Rust-side vault index.
//!
//! One entry per markdown note. Fields mirror what the TS panels need to render:
//! the path + title for display, the parsed frontmatter map for property-based
//! queries (collections, file-icons), `outgoing_links` + `tags` for the backlink
//! and tag indexes built on top of this (Phase 2+), and `modified_at` +
//! `word_count` + `snippet` for sort/preview surfaces (quick switcher, search
//! results). Extractors that populate the slots live in sibling modules
//! (`parsing` — Phase 1.2–1.4).
//!
//! Serde serialises to camelCase so the TS side can consume the JSON payload
//! directly without a per-field rename, matching the existing `FileNode`
//! convention in `commands::vault`.

use crate::vault::parsing;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

/// A single note's metadata, as produced by `scan_vault_v2` and maintained by
/// `VaultIndex`. Never mutated by the frontend — reads only, with writes going
/// through the dedicated Rust write commands that update the entry and emit
/// `vault-index-updated`.
///
/// `modified_at` is milliseconds since the UNIX epoch, matching `FileNode`.
/// `snippet` is the first ~200 chars of body content (after frontmatter) with
/// whitespace collapsed — suitable for quick-switcher previews and for
/// search-result teasers when FTS5 doesn't hit.
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct NoteEntry {
	/// Absolute filesystem path (canonicalised). Matches the path keys used
	/// throughout the TS indexes per ADR 0020 (absolute-path-indexes).
	pub path: String,
	/// Display title — frontmatter `title` if present, otherwise the filename
	/// stem (`.md` / `.markdown` extension stripped).
	pub title: String,
	/// Parsed YAML frontmatter as a generic JSON value map. Malformed YAML
	/// degrades to an empty map — never panics, never propagates a parse
	/// error. Value is `serde_json::Value` (not a YAML-specific value type)
	/// so the camelCase JSON payload TS receives is homogeneous.
	pub frontmatter: HashMap<String, Value>,
	/// Wikilink targets extracted from the note body (frontmatter + code
	/// fences excluded). Each entry is the raw target string as it appears
	/// inside `[[…]]`, with display pipe, heading `#`, and block `#^`
	/// suffixes stripped. Deduplication / resolution happens one layer up
	/// when `VaultIndex` builds the reverse index.
	pub outgoing_links: Vec<String>,
	/// Tag set merged from frontmatter `tags:` and inline `#tag` in the
	/// body (code fences excluded, in-word matches rejected). Order is not
	/// significant; the list is deduplicated.
	pub tags: Vec<String>,
	/// File mtime in milliseconds since the UNIX epoch. `None` when the OS
	/// does not expose mtime or the call fails.
	pub modified_at: Option<u64>,
	/// Body word count — body text only, not frontmatter or code fences.
	/// Used for outline / word-count surfaces without forcing a re-read.
	pub word_count: usize,
	/// Up-to-~200-char preview of the note body (whitespace collapsed).
	/// For quick-switcher previews and search-result teasers.
	pub snippet: String,
}

/// Maximum character count stored in `NoteEntry.snippet`. Tuned for quick-
/// switcher previews where ~200 chars fits two lines at typical widths.
pub const SNIPPET_MAX_CHARS: usize = 200;

impl NoteEntry {
	/// Builds a `NoteEntry` from raw note content plus mtime. Invokes every
	/// parser in `vault::parsing`, so the returned entry is fully populated
	/// and ready to sit inside `VaultIndex`. Never panics — malformed YAML
	/// frontmatter degrades to an empty map, invalid UTF-8 bytes upstream are
	/// the caller's concern (this function takes &str).
	pub fn from_content(path: &str, content: &str, modified_at: Option<u64>) -> Self {
		let frontmatter = parsing::parse_frontmatter(content);
		let title = resolve_title(path, &frontmatter);
		let outgoing_links = parsing::extract_outgoing_links(content);
		let tags = parsing::extract_tags(content);
		let word_count = count_body_words(content);
		let snippet = make_snippet(content, SNIPPET_MAX_CHARS);
		Self {
			path: path.to_string(),
			title,
			frontmatter,
			outgoing_links,
			tags,
			modified_at,
			word_count,
			snippet,
		}
	}
}

/// Title resolution: a string `title` in frontmatter wins; otherwise the
/// filename stem (path's last `/`-separated segment with `.md` / `.markdown`
/// stripped). Numbers / booleans in `title` are coerced to their string
/// representation so a valid non-string frontmatter title still produces a
/// non-empty title. Null / array / object frontmatter titles fall through to
/// the filename.
pub fn resolve_title(path: &str, frontmatter: &HashMap<String, Value>) -> String {
	if let Some(v) = frontmatter.get("title") {
		match v {
			Value::String(s) if !s.is_empty() => return s.clone(),
			Value::Number(n) => return n.to_string(),
			Value::Bool(b) => return b.to_string(),
			_ => {}
		}
	}
	filename_stem(path)
}

fn filename_stem(path: &str) -> String {
	let name = path.rsplit(&['/', '\\'][..]).next().unwrap_or(path);
	name.strip_suffix(".md")
		.or_else(|| name.strip_suffix(".markdown"))
		.unwrap_or(name)
		.to_string()
}

/// Counts body words (whitespace-separated runs) with frontmatter and fenced
/// code blocks stripped. Uses `strip_non_body_content` so positions are not
/// shifted — consistent with how the rest of the parsing module treats "the
/// body".
pub fn count_body_words(content: &str) -> usize {
	let body = parsing::strip_non_body_content(content);
	body.split_whitespace().count()
}

/// Builds a short preview of the note body. Strips frontmatter and fenced
/// code blocks via `strip_non_body_content`, collapses every whitespace run
/// into a single space, trims, and truncates to at most `max_chars`
/// characters (NOT bytes — matches the CJK-safe truncation done in the
/// semantic chunker).
pub fn make_snippet(content: &str, max_chars: usize) -> String {
	let body = parsing::strip_non_body_content(content);
	let mut out = String::with_capacity(max_chars.min(body.len()));
	let mut last_was_space = true;
	for c in body.chars() {
		if c.is_whitespace() {
			if !last_was_space {
				out.push(' ');
				last_was_space = true;
			}
		} else {
			out.push(c);
			last_was_space = false;
		}
		if out.chars().count() >= max_chars {
			break;
		}
	}
	out.trim().to_string()
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn default_values_are_empty() {
		let entry = NoteEntry::default();
		assert_eq!(entry.path, "");
		assert_eq!(entry.title, "");
		assert!(entry.frontmatter.is_empty());
		assert!(entry.outgoing_links.is_empty());
		assert!(entry.tags.is_empty());
		assert_eq!(entry.modified_at, None);
		assert_eq!(entry.word_count, 0);
		assert_eq!(entry.snippet, "");
	}

	#[test]
	fn serialises_with_camel_case_field_names() {
		let mut fm = HashMap::new();
		fm.insert("status".to_string(), Value::String("done".to_string()));
		let entry = NoteEntry {
			path: "/vault/notes/alpha.md".to_string(),
			title: "alpha".to_string(),
			frontmatter: fm,
			outgoing_links: vec!["beta".to_string()],
			tags: vec!["work".to_string()],
			modified_at: Some(1_700_000_000_000),
			word_count: 42,
			snippet: "Some body text".to_string(),
		};

		let json = serde_json::to_value(&entry).expect("serialises");
		let obj = json.as_object().expect("object");
		// camelCase keys — TS consumers read them unchanged.
		assert!(obj.contains_key("outgoingLinks"));
		assert!(obj.contains_key("modifiedAt"));
		assert!(obj.contains_key("wordCount"));
		// snake_case should NOT appear.
		assert!(!obj.contains_key("outgoing_links"));
		assert!(!obj.contains_key("modified_at"));
		assert!(!obj.contains_key("word_count"));
		// Frontmatter map is preserved as-is.
		assert_eq!(obj["frontmatter"]["status"], Value::String("done".into()));
	}

	#[test]
	fn roundtrips_through_json() {
		let mut fm = HashMap::new();
		fm.insert("draft".to_string(), Value::Bool(true));
		let entry = NoteEntry {
			path: "/vault/x.md".to_string(),
			title: "x".to_string(),
			frontmatter: fm,
			outgoing_links: vec!["y".to_string(), "z".to_string()],
			tags: vec!["a".to_string()],
			modified_at: Some(123),
			word_count: 7,
			snippet: "body".to_string(),
		};
		let json = serde_json::to_string(&entry).expect("to_string");
		let round: NoteEntry = serde_json::from_str(&json).expect("from_str");
		assert_eq!(round, entry);
	}

	#[test]
	fn from_content_populates_every_field() {
		let content = concat!(
			"---\n",
			"title: Alpha\n",
			"tags: [work, status/active]\n",
			"priority: 3\n",
			"---\n",
			"# Heading\n",
			"\n",
			"See [[Beta]] and #focus. Some body text with enough words to count.\n",
		);
		let entry = NoteEntry::from_content("/vault/alpha.md", content, Some(42));
		assert_eq!(entry.path, "/vault/alpha.md");
		assert_eq!(entry.title, "Alpha");
		assert_eq!(entry.modified_at, Some(42));
		assert_eq!(entry.outgoing_links, vec!["Beta"]);
		assert!(entry.tags.contains(&"work".to_string()));
		assert!(entry.tags.contains(&"status/active".to_string()));
		assert!(entry.tags.contains(&"focus".to_string()));
		assert_eq!(entry.frontmatter["priority"], Value::Number(3i64.into()));
		assert!(entry.word_count > 0);
		assert!(!entry.snippet.is_empty());
		assert!(entry.snippet.contains("Heading") || entry.snippet.contains("body"));
	}

	#[test]
	fn from_content_falls_back_to_filename_title() {
		let entry = NoteEntry::from_content("/vault/subdir/my-note.md", "no frontmatter", Some(1));
		assert_eq!(entry.title, "my-note");
	}

	#[test]
	fn resolve_title_coerces_number_and_bool_frontmatter_values() {
		let mut fm = HashMap::new();
		fm.insert("title".to_string(), Value::Number(42i64.into()));
		assert_eq!(resolve_title("/vault/x.md", &fm), "42");

		let mut fm = HashMap::new();
		fm.insert("title".to_string(), Value::Bool(true));
		assert_eq!(resolve_title("/vault/x.md", &fm), "true");
	}

	#[test]
	fn resolve_title_falls_back_on_null_or_array() {
		let mut fm = HashMap::new();
		fm.insert("title".to_string(), Value::Null);
		assert_eq!(resolve_title("/vault/x.md", &fm), "x");

		let mut fm = HashMap::new();
		fm.insert("title".to_string(), Value::Array(vec![]));
		assert_eq!(resolve_title("/vault/x.md", &fm), "x");
	}

	#[test]
	fn filename_stem_strips_extensions() {
		assert_eq!(filename_stem("/a/b/note.md"), "note");
		assert_eq!(filename_stem("/a/b/note.markdown"), "note");
		assert_eq!(filename_stem("note.md"), "note");
		assert_eq!(filename_stem("/a/no-ext"), "no-ext");
	}

	#[test]
	fn count_body_words_excludes_frontmatter_and_code() {
		let content = "---\ntitle: x\n---\none two three\n```\nfour five\n```\nsix";
		assert_eq!(count_body_words(content), 4);
	}

	#[test]
	fn make_snippet_collapses_whitespace_and_truncates() {
		let content = "   alpha\n\n\nbeta   gamma   ";
		let snip = make_snippet(content, 100);
		assert_eq!(snip, "alpha beta gamma");
	}

	#[test]
	fn make_snippet_truncates_at_char_count_not_bytes() {
		// Each emoji is 4 bytes. 10 chars = 40 bytes; make_snippet must count chars.
		let content = "🔐🔑🗝️🔒🔓🛡️🏰🗡️🛠️🔧🧿";
		let snip = make_snippet(content, 5);
		assert!(snip.chars().count() <= 5);
	}

	#[test]
	fn make_snippet_strips_frontmatter_and_code_fences() {
		let content = "---\ntitle: x\n---\n```\ncode here\n```\n\nactual body";
		let snip = make_snippet(content, 100);
		assert_eq!(snip, "actual body");
	}

	#[test]
	fn omits_default_values_via_round_trip_not_via_skip() {
		// The struct does NOT use skip_serializing_if — consumer code (TS) relies on
		// every field being present. This test pins that expectation so a future
		// "optimise payload size" refactor doesn't silently break TS consumers.
		let entry = NoteEntry::default();
		let json = serde_json::to_value(&entry).expect("serialises");
		let obj = json.as_object().expect("object");
		for key in [
			"path",
			"title",
			"frontmatter",
			"outgoingLinks",
			"tags",
			"modifiedAt",
			"wordCount",
			"snippet",
		] {
			assert!(obj.contains_key(key), "missing key {key}");
		}
	}
}
