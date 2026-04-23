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
