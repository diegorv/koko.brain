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

/// TS `getNoteName` equivalent for arbitrary input strings (paths AND
/// wikilink targets). Strips everything after the LAST `/`, then drops
/// the trailing extension if any (`foo.md` -> `foo`, `foo.tar.gz` ->
/// `foo.tar`, `.hidden` stays as `.hidden`). Mirrors
/// `src/lib/features/backlinks/backlinks.logic.ts::getNoteName`.
fn note_name_from_target(target: &str) -> &str {
	let after_slash = target.rsplit('/').next().unwrap_or(target);
	match after_slash.rfind('.') {
		Some(idx) if idx > 0 => &after_slash[..idx],
		_ => after_slash,
	}
}

/// Resolves a wikilink target against a precomputed `by_path` cache.
/// Mirrors `resolveWikilinkCached` in `backlinks.logic.ts:85`:
///
/// 1. Lowercase the target and look up the cache.
/// 2. If that misses AND the target contains a path prefix (i.e. the
///    note-name basename differs from the full lowercased target),
///    look up the basename.
fn resolve_with_cache(target: &str, cache: &HashMap<String, String>) -> Option<String> {
	if target.is_empty() {
		return None;
	}
	let target_lower = target.to_lowercase();
	if let Some(path) = cache.get(&target_lower) {
		return Some(path.clone());
	}
	let basename = note_name_from_target(target).to_lowercase();
	if basename != target_lower {
		cache.get(&basename).cloned()
	} else {
		None
	}
}

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

	/// Resolves a wikilink target string to an absolute path via the
	/// `by_path` cache. Returns `None` for empty input or unresolved
	/// targets. See `resolve_with_cache` for the matching rules.
	pub fn resolve(&self, target: &str) -> Option<String> {
		resolve_with_cache(target, &self.by_path)
	}

	/// Rebuilds the index from a fresh batch of entries. Clears all maps,
	/// reinserts every entry, populates the resolution cache (first path
	/// wins on stem collisions), and recomputes the reverse-link index.
	/// Bumps `version` once at the end.
	///
	/// Self-links (a wikilink in note A whose target resolves to A) are
	/// filtered out — they would otherwise be indistinguishable from real
	/// backlinks in the panel UI. Unresolved targets are silently
	/// dropped (the panel cannot render a backlink to a path that does
	/// not exist).
	pub fn build(&mut self, entries: Vec<NoteEntry>) {
		self.entries.clear();
		self.by_path.clear();
		self.backlinks.clear();

		// Pass 1: insert entries and build the resolution cache. Done in
		// one loop so the cache reflects the same source-of-truth set the
		// reverse-index pass will read.
		for entry in entries {
			let path = entry.path.clone();
			let key = note_name_from_target(&path).to_lowercase();
			// First path wins on collisions — matches `buildResolutionCache`.
			self.by_path.entry(key).or_insert_with(|| path.clone());
			self.entries.insert(path, entry);
		}

		// Pass 2: compute the reverse-link index. Collect (target, source)
		// pairs first under an immutable borrow, then mutate `backlinks`
		// in a second loop. This avoids the borrow checker complaint that
		// would arise from calling `self.backlinks.entry()` while still
		// borrowing `self.entries` and `self.by_path`.
		let pairs: Vec<(String, String)> = self
			.entries
			.iter()
			.flat_map(|(src, entry)| {
				let by_path = &self.by_path;
				entry
					.outgoing_links
					.iter()
					.filter_map(move |link| {
						let resolved = resolve_with_cache(&link.target, by_path)?;
						(resolved != *src).then_some((resolved, src.clone()))
					})
			})
			.collect();
		for (target, source) in pairs {
			self.backlinks
				.entry(target)
				.or_default()
				.insert(source);
		}

		self.version += 1;
	}

	/// Returns every `NoteEntry` whose outgoing links resolve to `path`,
	/// sorted by title (case-insensitive) for stable UI ordering.
	///
	/// Defensively filters out entries whose paths are missing from
	/// `entries` — should not happen in normal operation (the reverse
	/// index is updated in lock-step with entries), but it keeps the
	/// panel rendering safe across watcher races and hand-built test
	/// fixtures. Mirrors the consumer-side semantics of
	/// `findLinkedMentionsFromReverse` from `backlinks.logic.ts:183`.
	pub fn lookup_backlinks(&self, path: &str) -> Vec<NoteEntry> {
		let mut sources: Vec<NoteEntry> = match self.backlinks.get(path) {
			Some(set) => set
				.iter()
				.filter_map(|p| self.entries.get(p).cloned())
				.collect(),
			None => Vec::new(),
		};
		sources.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
		sources
	}
}
