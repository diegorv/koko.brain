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

use crate::vault::entry::{NoteEntry, OutgoingLink, OutgoingUnlinkedMention};
use crate::vault::parsing::{find_plain_text_mention_positions, strip_non_body_content};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeSet, HashMap};

/// Mirrors `kokobrain_lib::vault::entry` over IPC: the result of a
/// single `VaultIndex::update_entry` call. Serialised as camelCase to
/// match the TS `UpdateResultV2` declared in
/// `src/lib/types/vault-v2.types.ts`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResult {
	/// Whether the stored entry differs from the previous version (any
	/// field — outgoing links, tags, frontmatter, snippet, etc. — OR
	/// this is a brand-new entry). Consumers use this to decide whether
	/// to re-fetch downstream views.
	pub changed: bool,
	/// Absolute paths whose backlinks set was modified by this update —
	/// either gained the source as a backlink (resolution added) or lost
	/// it (resolution removed). Empty when no resolved-target diff
	/// occurred. Sorted for stable IPC payloads.
	pub affected: Vec<String>,
	/// The post-update monotonic version of the index.
	pub version: u64,
}

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

	/// Inserts or updates a single note's metadata in-place.
	///
	/// Computes the diff between the old entry's resolved outgoing-link
	/// set and the new entry's resolved set, then patches the
	/// `backlinks` reverse index incrementally — adding the source path
	/// to backlink sets it newly resolves into and removing it from sets
	/// it no longer resolves into. Empty backlink sets are pruned. Self-
	/// links (target resolves to source) are filtered both ways. Always
	/// bumps `version` after applying the update so consumers reacting to
	/// `vault-index-updated` have a monotonic signal even when the entry
	/// itself was logically unchanged.
	///
	/// `UpdateResult.changed` reports the full-equality result (every
	/// `NoteEntry` field compared, plus a `true` short-circuit when the
	/// entry is new). `UpdateResult.affected` is the union of removed
	/// and added resolved targets, sorted for stable IPC payloads.
	pub fn update_entry(&mut self, entry: NoteEntry) -> UpdateResult {
		let path = entry.path.clone();

		// --- Phase 1: snapshot under &self ----------------------------------
		// Cloning the old entry decouples us from the borrow checker so the
		// rest of the function can take &mut self freely. Clone cost is the
		// usual ~one BTreeMap + a few Vec allocations.
		let old_entry = self.entries.get(&path).cloned();

		// Compute resolved outgoing-target sets. `resolve` takes &self; we
		// don't hold any &mut borrow at this point.
		let old_resolved: BTreeSet<String> = match &old_entry {
			Some(e) => e
				.outgoing_links
				.iter()
				.filter_map(|link| self.resolve(&link.target))
				.filter(|p| p != &path)
				.collect(),
			None => BTreeSet::new(),
		};
		let new_resolved: BTreeSet<String> = entry
			.outgoing_links
			.iter()
			.filter_map(|link| self.resolve(&link.target))
			.filter(|p| p != &path)
			.collect();

		// Full-equality check while we still have access to `entry`.
		let changed = old_entry.as_ref() != Some(&entry);

		let removed: Vec<String> = old_resolved.difference(&new_resolved).cloned().collect();
		let added: Vec<String> = new_resolved.difference(&old_resolved).cloned().collect();

		// --- Phase 2: apply mutations under &mut self -----------------------
		// For each removed target, drop our source from its backlink set and
		// prune the set if it became empty. The two-step (read -> remove)
		// pattern avoids a borrow conflict between `get_mut` and `remove`.
		for target in &removed {
			let became_empty = if let Some(set) = self.backlinks.get_mut(target) {
				set.remove(&path);
				set.is_empty()
			} else {
				false
			};
			if became_empty {
				self.backlinks.remove(target);
			}
		}

		for target in &added {
			self.backlinks
				.entry(target.clone())
				.or_default()
				.insert(path.clone());
		}

		// First-write-wins for the resolution cache: only insert when the
		// entry is genuinely new. An update to an existing path keeps the
		// cache pointing at the same path it already had.
		if old_entry.is_none() {
			let key = note_name_from_target(&path).to_lowercase();
			self.by_path.entry(key).or_insert_with(|| path.clone());
		}

		self.entries.insert(path, entry);
		self.version += 1;

		// affected = removed ∪ added (set-diff already deduped); sort for
		// stable downstream payloads.
		let mut affected: Vec<String> = removed;
		affected.extend(added);
		affected.sort();

		UpdateResult {
			changed,
			affected,
			version: self.version,
		}
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

	/// Returns the outgoing wikilinks of the entry at `path`, each with its
	/// resolved target path filled in via the index's `by_path` cache.
	/// Empty when `path` is unknown to the index.
	///
	/// Mirrors the consumer side of `outgoing-links.logic.ts::getOutgoingLinks`
	/// — the parsing was done at scan time, only resolution happens here.
	/// `resolved_path` is `None` for broken links.
	pub fn lookup_outgoing_links(&self, path: &str) -> Vec<OutgoingLink> {
		let entry = match self.entries.get(path) {
			Some(e) => e,
			None => return Vec::new(),
		};
		entry
			.outgoing_links
			.iter()
			.map(|link| OutgoingLink {
				target: link.target.clone(),
				alias: link.alias.clone(),
				heading: link.heading.clone(),
				resolved_path: resolve_with_cache(&link.target, &self.by_path),
				position: link.position,
			})
			.collect()
	}

	/// Returns notes whose names appear as plain text in `content` but are
	/// NOT already linked from `path` via wikilinks. The result is sorted
	/// by `note_name` (case-insensitive) for stable UI ordering.
	///
	/// Mirrors `outgoing-links.logic.ts::findOutgoingUnlinkedMentions`. The
	/// caller passes `content` because the index does not store full
	/// per-note content; for the active-tab panel the content is already
	/// in `editorStore.activeTab.content`, so the IPC roundtrip carries it
	/// once and avoids cache invalidation problems.
	///
	/// Empty `content` returns an empty list (matches TS short-circuit).
	pub fn lookup_outgoing_unlinked_mentions(
		&self,
		path: &str,
		content: &str,
	) -> Vec<OutgoingUnlinkedMention> {
		if content.is_empty() {
			return Vec::new();
		}

		// Build the "already-linked" set from the current note's outgoing
		// links — match by lowercased target AND by lowercased basename of
		// the target (mirrors `getNoteName(t).toLowerCase()` from TS).
		let current_links: Vec<String> = self
			.entries
			.get(path)
			.map(|e| {
				e.outgoing_links
					.iter()
					.flat_map(|l| {
						let target_lower = l.target.to_lowercase();
						let basename_lower = note_name_from_target(&l.target).to_lowercase();
						if target_lower == basename_lower {
							vec![target_lower]
						} else {
							vec![target_lower, basename_lower]
						}
					})
					.collect()
			})
			.unwrap_or_default();

		let stripped = strip_non_body_content(content);
		let stripped_lower = stripped.to_lowercase();
		let mut mentions: Vec<OutgoingUnlinkedMention> = Vec::new();

		for other_path in self.entries.keys() {
			if other_path == path {
				continue;
			}
			let note_name = note_name_from_target(other_path);
			if note_name.is_empty() {
				continue;
			}
			let note_name_lower = note_name.to_lowercase();
			if current_links.iter().any(|t| t == &note_name_lower) {
				continue;
			}
			let positions = find_plain_text_mention_positions(content, &stripped_lower, note_name);
			let count = positions.len();
			if count > 0 {
				mentions.push(OutgoingUnlinkedMention {
					note_name: note_name.to_string(),
					note_path: other_path.clone(),
					count,
				});
			}
		}

		mentions.sort_by(|a, b| a.note_name.to_lowercase().cmp(&b.note_name.to_lowercase()));
		mentions
	}
}
