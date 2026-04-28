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

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::BTreeMap;

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
	/// Whitespace-delimited word count of the body (post-frontmatter).
	pub word_count: usize,
	/// First non-empty body paragraph, capped at 280 chars. Used by the
	/// future quick-switcher and command-palette previews so they don't
	/// have to re-read the file.
	pub snippet: String,
}
