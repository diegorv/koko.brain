//! `VaultIndex`: the canonical Rust-side store for vault metadata.
//!
//! Single source of truth for `NoteEntry` records, the lowercase wikilink
//! resolution cache, and the reverse-link index. Built once via
//! [`VaultIndex::build`] (Phase 2.2) and maintained incrementally via
//! [`VaultIndex::update_entry`] (Phase 2.5). Read-only access is
//! getter-based to prevent drift between `entries` and the auxiliary
//! indexes — every mutation funnels through `build` or `update_entry`.
//!
//! See ADR 0025 (`docs/adr/0025-rust-vault-index.md`) for the migration
//! plan and how this replaces the per-feature TS stores.

use crate::vault::entry::NoteEntry;
use std::collections::{BTreeSet, HashMap};

/// Canonical vault metadata index.
///
/// Fields are private; access is via the inherent getter methods. This is
/// intentional: outside callers must not be able to mutate `entries`
/// without `by_path` and `backlinks` being recomputed in lock-step. Phase
/// 2.2's `build` and Phase 2.5's `update_entry` are the only mutation
/// paths.
#[derive(Debug, Clone, Default)]
pub struct VaultIndex {
	/// Primary store: absolute path -> enriched per-note metadata.
	entries: HashMap<String, NoteEntry>,
	/// Wikilink resolution cache: lowercase note name -> absolute path.
	/// Mirrors `WikilinkResolutionCache` from
	/// `src/lib/features/backlinks/backlinks.logic.ts:70`. First path
	/// wins on stem collisions, matching `buildResolutionCache`.
	by_path: HashMap<String, String>,
	/// Reverse index: target path -> sorted set of source paths that
	/// link to it. Equivalent to `noteIndexStore.reverseIndex`. BTreeSet
	/// gives stable iteration order for tests and IPC snapshots; backlink
	/// sets are typically small (median 1-5 sources per target) so the
	/// O(log n) cost is irrelevant.
	backlinks: HashMap<String, BTreeSet<String>>,
	/// Monotonic counter bumped on every `update_entry` call (even no-ops).
	/// Consumers listen to `vault-index-updated` and use this to invalidate
	/// cached views; `UpdateResult.changed` distinguishes real changes from
	/// no-ops when the consumer needs to skip work.
	version: u64,
}

impl VaultIndex {
	/// Returns a read-only view of the per-path entry map.
	pub fn entries(&self) -> &HashMap<String, NoteEntry> {
		&self.entries
	}

	/// Returns a read-only view of the lowercase-name resolution cache.
	pub fn by_path(&self) -> &HashMap<String, String> {
		&self.by_path
	}

	/// Returns a read-only view of the reverse-link index.
	pub fn backlinks(&self) -> &HashMap<String, BTreeSet<String>> {
		&self.backlinks
	}

	/// Current monotonic version. Starts at 0 on a fresh index.
	pub fn version(&self) -> u64 {
		self.version
	}

	/// Total number of indexed entries.
	pub fn len(&self) -> usize {
		self.entries.len()
	}

	/// Whether the index has no entries.
	pub fn is_empty(&self) -> bool {
		self.entries.is_empty()
	}
}
