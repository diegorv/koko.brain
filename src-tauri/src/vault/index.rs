//! In-memory vault metadata index.
//!
//! `VaultIndex` is the single source of truth for note-level metadata after
//! the performance refactor (ADR 0025). Phase 2.1 establishes the struct
//! shell — entries + path lookup + reverse backlinks map + monotonic
//! version counter — and a `Default` / `new` constructor. Subsequent
//! phase tasks layer behaviour on top:
//!
//!   * Phase 2.2 — `VaultIndex::build(entries)` with reverse-index wiring.
//!   * Phase 2.3 — Tauri managed state so a single `RwLock<VaultIndex>`
//!     lives for the app lifetime.
//!   * Phase 2.4 — `get_backlinks_v2` read command.
//!   * Phase 2.5 — `update_entry(entry)` → `UpdateResult { changed,
//!     affected }` incremental updater.
//!   * Phase 2.6 — `update_note_in_index` Tauri command that parses
//!     content via vault::parsing, calls update_entry, and emits
//!     `vault-index-updated`.
//!
//! Every mutation must go through `update_entry`. Writes that touch
//! `entries` / `backlinks` / `by_path` directly would let the reverse
//! index drift — this module rejects that by making those fields
//! private with getter-only accessors, mirroring the getter-based
//! Svelte-store pattern in the TS codebase (ADR 0005).

use crate::vault::entry::NoteEntry;
use std::collections::{HashMap, HashSet};

/// Monotonic revision number. Bumps on every mutation so consumers can
/// discard stale reads and so `vault-index-updated` payloads carry a
/// strictly-increasing stamp that clients can order against.
pub type IndexVersion = u64;

/// In-memory vault metadata index. One entry per markdown note; a reverse
/// map from "target path" → "source paths that wikilink to it" for O(K)
/// backlink lookups; and a version stamp.
///
/// Construction: `VaultIndex::default()` — empty. Populate with
/// `VaultIndex::build(entries)` (Phase 2.2). Incrementally update with
/// `VaultIndex::update_entry(entry)` (Phase 2.5).
///
/// Read access is via the `entries()` / `entry_for_path()` / `backlinks_of()`
/// / `version()` getters. Fields are private so the reverse index cannot
/// drift out of sync with `entries`.
#[derive(Debug, Default, Clone)]
pub struct VaultIndex {
	entries: Vec<NoteEntry>,
	by_path: HashMap<String, usize>,
	backlinks: HashMap<String, HashSet<String>>,
	version: IndexVersion,
}

impl VaultIndex {
	/// Fresh empty index. Version starts at 0; the first `build` or
	/// `update_entry` bumps to 1.
	pub fn new() -> Self {
		Self::default()
	}

	/// Read-only slice of all entries, in insertion order. Callers that
	/// need lookup by path should use `entry_for_path` (O(1)) instead of
	/// iterating this slice.
	pub fn entries(&self) -> &[NoteEntry] {
		&self.entries
	}

	/// O(1) entry lookup by absolute path, or `None` if no note with that
	/// path is in the index.
	pub fn entry_for_path(&self, path: &str) -> Option<&NoteEntry> {
		self.by_path.get(path).and_then(|i| self.entries.get(*i))
	}

	/// Number of entries currently in the index.
	pub fn len(&self) -> usize {
		self.entries.len()
	}

	/// True when the index has no entries.
	pub fn is_empty(&self) -> bool {
		self.entries.is_empty()
	}

	/// Returns every source path that has an outgoing wikilink resolving
	/// to `target_path`. O(1) lookup against the reverse index; returns
	/// an empty slice when nothing links to `target_path`. The reverse
	/// index is populated by Phase 2.2's `build` and maintained by Phase
	/// 2.5's `update_entry`, so this getter returns empty until those
	/// tasks land.
	pub fn backlinks_of(&self, target_path: &str) -> Vec<&String> {
		self.backlinks
			.get(target_path)
			.map(|set| set.iter().collect())
			.unwrap_or_default()
	}

	/// Current revision number. Bumps on every successful mutation.
	pub fn version(&self) -> IndexVersion {
		self.version
	}
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn default_is_empty() {
		let idx = VaultIndex::default();
		assert_eq!(idx.len(), 0);
		assert!(idx.is_empty());
		assert_eq!(idx.version(), 0);
		assert!(idx.entries().is_empty());
		assert!(idx.entry_for_path("/anywhere.md").is_none());
		assert!(idx.backlinks_of("/anywhere.md").is_empty());
	}

	#[test]
	fn new_equals_default() {
		let a = VaultIndex::new();
		let b = VaultIndex::default();
		assert_eq!(a.len(), b.len());
		assert_eq!(a.version(), b.version());
	}
}
