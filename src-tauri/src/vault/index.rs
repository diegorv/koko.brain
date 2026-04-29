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
use crate::vault::task::{display_name, FileTaskGroup, TagAggregate, Task};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::{BTreeMap, BTreeSet, HashMap};

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

/// Canonical-JSON serialisation used as the inner key of
/// `properties_index`. `serde_json::to_string` produces no whitespace by
/// default, so equivalent values produce identical strings; differing
/// numeric forms (`1` vs `1.0`) and quoted vs unquoted scalars stay
/// distinct as the YAML parser produced them. Errors fall back to an
/// empty string — never reached for `JsonValue` inputs in practice.
fn canon_value_key(value: &JsonValue) -> String {
	serde_json::to_string(value).unwrap_or_default()
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
	/// Reverse tag index: lowercase tag -> sorted set of paths that
	/// contain this tag. Phase 7 — replaces the TS
	/// `tags.service.ts::tagMap`. Keys are always lowercased so
	/// `JavaScript` and `javascript` aggregate into one entry; the
	/// original casing for display is recovered from `entries[*].tags`
	/// at lookup time (`lookup_all_tags`).
	tags_index: HashMap<String, BTreeSet<String>>,
	/// Reverse property index: frontmatter key -> canonical-JSON-value
	/// string -> sorted set of paths. Phase 8 — supports
	/// `query_notes_by_property` and `get_property_values` lookups
	/// without scanning every entry. Keys are case-sensitive (frontmatter
	/// keys are user-defined identifiers); values are canonicalised via
	/// `serde_json::to_string` to satisfy `HashMap`'s `Hash + Eq` bounds
	/// (`JsonValue` is neither). The lookup commands re-canonicalise the
	/// query value on read. Array values index by the FULL serialized
	/// array (one entry per distinct value combination); list-membership
	/// queries are out of scope for Phase 8.
	properties_index: HashMap<String, HashMap<String, BTreeSet<String>>>,
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

	/// Returns a read-only view of the reverse tag index.
	pub fn tags_index(&self) -> &HashMap<String, BTreeSet<String>> {
		&self.tags_index
	}

	/// Returns a read-only view of the reverse property index.
	pub fn properties_index(&self) -> &HashMap<String, HashMap<String, BTreeSet<String>>> {
		&self.properties_index
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
		self.tags_index.clear();
		self.properties_index.clear();

		// Pass 1: insert entries and build the resolution cache. Done in
		// one loop so the cache reflects the same source-of-truth set the
		// reverse-index pass will read.
		for entry in entries {
			let path = entry.path.clone();
			let key = note_name_from_target(&path).to_lowercase();
			// First path wins on collisions — matches `buildResolutionCache`.
			self.by_path.entry(key).or_insert_with(|| path.clone());
			// Populate `tags_index` per-entry. Lowercasing the key gives the
			// case-insensitive aggregation TS `extractAllTags` produces.
			for tag in &entry.tags {
				self.tags_index
					.entry(tag.to_lowercase())
					.or_default()
					.insert(path.clone());
			}
			// Populate `properties_index`. Phase 8.
			for (prop_key, prop_value) in &entry.frontmatter {
				let canon = canon_value_key(prop_value);
				self.properties_index
					.entry(prop_key.clone())
					.or_default()
					.entry(canon)
					.or_default()
					.insert(path.clone());
			}
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

		// Tag diff for the reverse `tags_index`. Lowercase keys so e.g.
		// `JavaScript`/`javascript` collide. Phase 7.
		let old_tags: BTreeSet<String> = old_entry
			.as_ref()
			.map(|e| e.tags.iter().map(|t| t.to_lowercase()).collect())
			.unwrap_or_default();
		let new_tags: BTreeSet<String> =
			entry.tags.iter().map(|t| t.to_lowercase()).collect();
		let tags_removed: Vec<String> =
			old_tags.difference(&new_tags).cloned().collect();
		let tags_added: Vec<String> =
			new_tags.difference(&old_tags).cloned().collect();

		// Property diff for the reverse `properties_index`. We compare
		// the SET of `(key, canonical-value)` pairs — moving a property
		// from value A to value B counts as "remove A, add B". Phase 8.
		let old_props: BTreeSet<(String, String)> = old_entry
			.as_ref()
			.map(|e| {
				e.frontmatter
					.iter()
					.map(|(k, v)| (k.clone(), canon_value_key(v)))
					.collect()
			})
			.unwrap_or_default();
		let new_props: BTreeSet<(String, String)> = entry
			.frontmatter
			.iter()
			.map(|(k, v)| (k.clone(), canon_value_key(v)))
			.collect();
		let props_removed: Vec<(String, String)> =
			old_props.difference(&new_props).cloned().collect();
		let props_added: Vec<(String, String)> =
			new_props.difference(&old_props).cloned().collect();

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

		// Tag-side incremental updates — same shape as backlinks above.
		for tag in &tags_removed {
			let became_empty = if let Some(set) = self.tags_index.get_mut(tag) {
				set.remove(&path);
				set.is_empty()
			} else {
				false
			};
			if became_empty {
				self.tags_index.remove(tag);
			}
		}
		for tag in &tags_added {
			self.tags_index
				.entry(tag.clone())
				.or_default()
				.insert(path.clone());
		}

		// Property-side incremental updates. Phase 8. Empty value-set →
		// drop the inner map entry; empty key-map → drop the outer entry
		// (so `lookup_property_values` for a removed key returns []).
		for (key, canon) in &props_removed {
			let value_set_empty = if let Some(by_value) = self.properties_index.get_mut(key) {
				let inner_empty = if let Some(paths) = by_value.get_mut(canon) {
					paths.remove(&path);
					paths.is_empty()
				} else {
					false
				};
				if inner_empty {
					by_value.remove(canon);
				}
				by_value.is_empty()
			} else {
				false
			};
			if value_set_empty {
				self.properties_index.remove(key);
			}
		}
		for (key, canon) in &props_added {
			self.properties_index
				.entry(key.clone())
				.or_default()
				.entry(canon.clone())
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

	/// Returns every `NoteEntry` whose body contains a plain-text mention
	/// of `path`'s note name (basename without `.md`/`.markdown`) but does
	/// NOT have a wikilink to it. Sorted by title (case-insensitive) for
	/// stable UI ordering.
	///
	/// Mirrors `findUnlinkedMentions` from
	/// `src/lib/features/backlinks/backlinks.logic.ts:217`, which is the
	/// incoming counterpart of `lookup_outgoing_unlinked_mentions`. The
	/// already-linked exclusion uses the same reverse-link index that
	/// `lookup_backlinks` consumes — every source the wikilink reverse
	/// resolution placed into `backlinks[path]` is filtered out.
	///
	/// The `VaultIndex` does not store full per-note bodies (only a 280-
	/// byte snippet), so this function re-reads each candidate file from
	/// disk inside Rust. Files that fail to read are silently skipped.
	/// Phase 11.5a — replaces the TS-side full-content scan that the
	/// `BacklinksPanel` previously ran over `noteIndexStore.noteContents`.
	pub fn lookup_incoming_unlinked_mentions(&self, path: &str) -> Vec<NoteEntry> {
		let note_name = note_name_from_target(path);
		if note_name.is_empty() {
			return Vec::new();
		}

		// Build the exclusion set from the existing reverse-link index:
		// every source path already linking TO `path` via a wikilink is
		// rendered in the linked-mentions panel and must not appear here.
		let already_linked: BTreeSet<String> = self
			.backlinks
			.get(path)
			.cloned()
			.unwrap_or_default();

		let mut results: Vec<NoteEntry> = Vec::new();

		for (other_path, entry) in &self.entries {
			if other_path == path {
				continue;
			}
			if already_linked.contains(other_path) {
				continue;
			}

			// Read the candidate's body from disk. Skip on read errors —
			// the file may have been removed between the last index update
			// and this call (watcher race), in which case it shouldn't
			// appear in the panel anyway.
			let content = match std::fs::read_to_string(other_path) {
				Ok(c) => c,
				Err(_) => continue,
			};

			let stripped = strip_non_body_content(&content);
			let stripped_lower = stripped.to_lowercase();
			let positions =
				find_plain_text_mention_positions(&content, &stripped_lower, note_name);

			if !positions.is_empty() {
				results.push(entry.clone());
			}
		}

		results.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
		results
	}

	// ------------------------------------------------------------------
	// Phase 7 — Tag and Task lookups
	// ------------------------------------------------------------------

	/// Returns every `NoteEntry` whose tags contain `tag`
	/// (case-insensitively, leading `#` stripped). Sorted by title for
	/// stable UI ordering. Mirrors `tagMap.get(tag)?.filePaths` from the
	/// TS `tags.service.ts`, but returns full entries (not just paths) so
	/// the consumer panel can render previews without an extra IPC.
	pub fn lookup_notes_with_tag(&self, tag: &str) -> Vec<NoteEntry> {
		let key = tag.trim_start_matches('#').to_lowercase();
		let mut sources: Vec<NoteEntry> = match self.tags_index.get(&key) {
			Some(set) => set
				.iter()
				.filter_map(|p| self.entries.get(p).cloned())
				.collect(),
			None => Vec::new(),
		};
		sources.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
		sources
	}

	/// Returns the flat list of tag aggregates (one per distinct tag,
	/// case-insensitive) sorted alphabetically. Mirrors the input to
	/// `tags.logic.ts::buildTagTree`. The `name` field carries the FIRST
	/// occurrence's original casing (the TS `extractAllTags`
	/// first-occurrence-wins rule); ties on lowercase produce one entry.
	pub fn lookup_all_tags(&self) -> Vec<TagAggregate> {
		// First-occurrence-wins display casing. Iterate entries in path
		// order is not deterministic for HashMap; this would still match
		// TS as long as both paths share the same lowercase form, but the
		// VISIBLE casing depends on which entry is hit first. For the
		// common case where every author writes a tag the same way, this
		// is irrelevant. Determinism in tests is provided by the
		// alphabetical sort at the end.
		let mut display_case: HashMap<String, String> = HashMap::new();
		for entry in self.entries.values() {
			for tag in &entry.tags {
				let key = tag.to_lowercase();
				display_case.entry(key).or_insert_with(|| tag.clone());
			}
		}
		let mut out: Vec<TagAggregate> = self
			.tags_index
			.iter()
			.map(|(key, paths)| TagAggregate {
				name: display_case.get(key).cloned().unwrap_or_else(|| key.clone()),
				count: paths.len(),
				file_paths: paths.iter().cloned().collect(),
			})
			.collect();
		out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
		out
	}

	/// Returns every entry's tasks grouped by file, sorted by
	/// `modified_at` descending. Empty groups (files with zero tasks) are
	/// filtered out. Mirrors `tasks.logic.ts::buildGroupsFromIndex`.
	pub fn lookup_all_tasks(&self) -> Vec<FileTaskGroup> {
		let mut out: Vec<FileTaskGroup> = self
			.entries
			.values()
			.filter(|e| !e.tasks.is_empty())
			.map(|e| FileTaskGroup {
				file_path: e.path.clone(),
				file_name: display_name(&e.path),
				modified_at: e.modified_at,
				tasks: e.tasks.clone(),
			})
			.collect();
		out.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
		out
	}

	/// Returns the parsed task list for the entry at `path`. Empty when
	/// `path` is unknown to the index or the entry has no tasks.
	pub fn lookup_tasks_in_path(&self, path: &str) -> Vec<Task> {
		self.entries
			.get(path)
			.map(|e| e.tasks.clone())
			.unwrap_or_default()
	}

	// ------------------------------------------------------------------
	// Phase 8 — Property lookups
	// ------------------------------------------------------------------

	/// Returns every `NoteEntry` whose `frontmatter[key]` equals `value`
	/// (canonical-JSON equality). Sorted by title for stable UI ordering.
	/// Empty when the key isn't present in the index, when no entry has
	/// that exact value, or when `path` is unknown to the index.
	pub fn lookup_notes_by_property(&self, key: &str, value: &JsonValue) -> Vec<NoteEntry> {
		let canon = canon_value_key(value);
		let by_value = match self.properties_index.get(key) {
			Some(m) => m,
			None => return Vec::new(),
		};
		let paths = match by_value.get(&canon) {
			Some(s) => s,
			None => return Vec::new(),
		};
		let mut sources: Vec<NoteEntry> = paths
			.iter()
			.filter_map(|p| self.entries.get(p).cloned())
			.collect();
		sources.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
		sources
	}

	/// Returns every distinct value the index has seen for `key`,
	/// deserialised back from the canonical-JSON keys. Useful for the
	/// Properties Panel's value autocomplete. Empty when the key is
	/// unknown to the index.
	pub fn lookup_property_values(&self, key: &str) -> Vec<JsonValue> {
		let by_value = match self.properties_index.get(key) {
			Some(m) => m,
			None => return Vec::new(),
		};
		let mut out: Vec<JsonValue> = by_value
			.keys()
			.filter_map(|canon| serde_json::from_str(canon).ok())
			.collect();
		// Stable order: lexicographically by canonical string. Numeric
		// values sort by string form, which is "good enough" for an
		// autocomplete list.
		out.sort_by(|a, b| canon_value_key(a).cmp(&canon_value_key(b)));
		out
	}

	/// Returns the entry's frontmatter map (cloned) at `path`. Empty
	/// when `path` is unknown to the index. Phase 8 — the IPC consumer
	/// re-uses the same shape (`Record<string, FrontmatterValue>`) the
	/// existing TS `parseFrontmatterProperties` produces.
	pub fn lookup_note_properties(&self, path: &str) -> BTreeMap<String, JsonValue> {
		self.entries
			.get(path)
			.map(|e| e.frontmatter.clone())
			.unwrap_or_default()
	}

	/// Removes a single note from the index. Cleans up `entries`,
	/// `by_path` (only if the slot pointed at this exact path),
	/// `backlinks` (drops the source from every target's set + prunes
	/// empty sets), and `tags_index` (drops the path from every tag's
	/// set + prunes empty sets). Bumps `version` even when the path was
	/// not present (consumers see a monotonic signal so the panel
	/// re-fetches and confirms its current view).
	///
	/// Phase 7 — replaces the previous TS-only deletion bookkeeping in
	/// `fs.service.ts` (which mutated `noteIndexStore` and the tags
	/// `tagMap` in lock-step). Without this, deleted files would linger
	/// in `tags_index` until the next vault rebuild and visibly leak
	/// into the panels.
	pub fn remove_entry(&mut self, path: &str) -> UpdateResult {
		let removed_entry = self.entries.remove(path);
		let was_present = removed_entry.is_some();
		let mut affected: BTreeSet<String> = BTreeSet::new();

		if let Some(entry) = removed_entry {
			// Backlinks side: drop `path` as a source from every target it
			// was resolved into. We don't have the resolved-target list cached,
			// so iterate the entire reverse index. This is O(N) in the number
			// of targets we link to — typically small.
			let targets_to_clean: Vec<String> = self
				.backlinks
				.iter()
				.filter(|(_, sources)| sources.contains(path))
				.map(|(t, _)| t.clone())
				.collect();
			for target in targets_to_clean {
				let became_empty = if let Some(set) = self.backlinks.get_mut(&target) {
					set.remove(path);
					set.is_empty()
				} else {
					false
				};
				if became_empty {
					self.backlinks.remove(&target);
				}
				affected.insert(target);
			}

			// `backlinks[path]` itself: the deleted entry can no longer have
			// inbound links rendered for it, so drop the entire set.
			self.backlinks.remove(path);

			// Tags side: drop `path` from every tag set the entry contributed
			// to. Same shape as the backlink cleanup; pruning empty sets keeps
			// `lookup_all_tags` from emitting zero-count entries.
			for tag in &entry.tags {
				let key = tag.to_lowercase();
				let became_empty = if let Some(set) = self.tags_index.get_mut(&key) {
					set.remove(path);
					set.is_empty()
				} else {
					false
				};
				if became_empty {
					self.tags_index.remove(&key);
				}
			}

			// Properties side: drop `path` from every (key, canon-value)
			// bucket the entry contributed to. Phase 8.
			for (prop_key, prop_value) in &entry.frontmatter {
				let canon = canon_value_key(prop_value);
				let key_empty = if let Some(by_value) = self.properties_index.get_mut(prop_key) {
					let inner_empty = if let Some(paths) = by_value.get_mut(&canon) {
						paths.remove(path);
						paths.is_empty()
					} else {
						false
					};
					if inner_empty {
						by_value.remove(&canon);
					}
					by_value.is_empty()
				} else {
					false
				};
				if key_empty {
					self.properties_index.remove(prop_key);
				}
			}

			// `by_path` cleanup: drop the slot ONLY when it was pointing
			// at this exact path. If multiple entries shared a stem, the
			// next entry-rebuild repopulates first-write-wins; until then
			// the wikilink simply resolves to nothing.
			let key = note_name_from_target(path).to_lowercase();
			if self.by_path.get(&key).map(|p| p == path).unwrap_or(false) {
				self.by_path.remove(&key);
			}
		}

		self.version += 1;

		UpdateResult {
			changed: was_present,
			affected: affected.into_iter().collect(),
			version: self.version,
		}
	}
}
