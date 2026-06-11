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

use crate::vault::entry::{NoteEntry, OutgoingLink, OutgoingUnlinkedMention, RelationshipBacklink};
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

/// Cheap snapshot for an incoming-unlinked-mentions scan: just the
/// search term and the candidate paths. Produced under the index read
/// lock with O(N) string clones (NOT full `NoteEntry` clones — those
/// happen later, only for matched paths, in `lookup_entries`).
///
/// The async command path uses this to drop the lock + free the Tauri
/// runtime worker before spawn_blocking the disk reads. Cloning ~2000
/// strings is ~1-5 ms; cloning ~2000 full NoteEntry structs (with their
/// frontmatter BTreeMaps and outgoing-link Vecs) was 50-100 ms — that
/// overhead serialised concurrent IPCs (`get_backlinks_v2`,
/// `readTextFile`) waiting on the same runtime worker, blowing
/// `openFileInEditor:fresh` p95 to 85 ms during burst opens.
#[derive(Debug, Clone)]
pub struct UnlinkedMentionsCandidates {
	/// Basename of the target note (without `.md`/`.markdown`). Empty
	/// when the input path had no resolvable basename — `match_*`
	/// short-circuits to an empty result.
	pub note_name: String,
	/// Absolute paths to scan. Already filtered to exclude the target
	/// itself and every source already in `backlinks[path]`.
	pub candidate_paths: Vec<String>,
}

/// Reads each `candidate_paths` file from disk and returns the subset
/// whose body contains a plain-text mention of `note_name` (after
/// frontmatter / fenced-code stripping and Unicode word-boundary
/// checks). No lock; safe (and intended) to call from a
/// `tokio::task::spawn_blocking` task.
///
/// Files that fail to read are silently skipped (e.g. deleted between
/// the snapshot and the read — same race tolerance as the legacy TS
/// `findUnlinkedMentions`).
pub fn match_unlinked_mentions(note_name: &str, candidate_paths: Vec<String>) -> Vec<String> {
	if note_name.is_empty() {
		return Vec::new();
	}
	let mut matched: Vec<String> = Vec::new();
	for candidate_path in candidate_paths {
		let content = match std::fs::read_to_string(&candidate_path) {
			Ok(c) => c,
			Err(_) => continue,
		};
		let stripped = strip_non_body_content(&content);
		// ASCII-only lowercase preserves byte length (full `.to_lowercase()`
		// changes the byte length of İ/ẞ/Ⱥ/Ⱦ), keeping match offsets aligned
		// with `content` for the word-boundary check. See
		// `find_plain_text_mention_positions`.
		let stripped_lower = stripped.to_ascii_lowercase();
		let positions =
			find_plain_text_mention_positions(&content, &stripped_lower, note_name);
		if !positions.is_empty() {
			matched.push(candidate_path);
		}
	}
	matched
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

			// Audit #1 (2026-04-29): retroactive backlinks for newly created
			// notes. When a source S was inserted with `[[NewName]]` BEFORE
			// NewName.md existed, the resolve() call at S's insert time
			// returned None — so backlinks[NewName_path] stayed empty even
			// after NewName.md is later added. The user-visible bug: opening
			// the new note shows "no backlinks" despite real wikilinks in S.
			//
			// Now that the new path is in by_path (above), any existing
			// entry's outgoing wikilink that resolves to it is reachable
			// again. Re-scan all other entries; collect those whose links
			// resolve to this new path; add them to backlinks[new_path].
			//
			// Cost: O(N * L) per genuinely-new insert, where N = total entries
			// and L = average outgoing-link count. For a 1944-note vault with
			// ~5 links each, ~10k cheap string compares per new note. Only
			// runs on `old_entry.is_none()`, so saves do not pay this cost.
			let new_path_ref = path.as_str();
			let by_path_ref = &self.by_path;
			let retro_sources: Vec<String> = self
				.entries
				.iter()
				.filter(|(src_path, _)| src_path.as_str() != new_path_ref)
				.filter_map(|(src_path, src_entry)| {
					let resolves_to_new = src_entry.outgoing_links.iter().any(|link| {
						resolve_with_cache(&link.target, by_path_ref).as_deref()
							== Some(new_path_ref)
					});
					resolves_to_new.then(|| src_path.clone())
				})
				.collect();
			if !retro_sources.is_empty() {
				let set = self.backlinks.entry(path.clone()).or_default();
				for src in retro_sources {
					set.insert(src);
				}
			}
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

	/// Returns notes that reference the target note via frontmatter relationship
	/// fields (`_belongs_to`, `_related_to`, `_has_many`, or custom fields in
	/// `relationships`). Resolves wikilink targets against `by_path` to match
	/// on absolute paths.
	pub fn lookup_relationship_backlinks(&self, target_path: &str) -> Vec<RelationshipBacklink> {
		let target_name = target_path
			.rsplit('/')
			.next()
			.unwrap_or(target_path)
			.strip_suffix(".md")
			.or_else(|| target_path.rsplit('/').next().unwrap_or(target_path).strip_suffix(".markdown"))
			.unwrap_or(target_path.rsplit('/').next().unwrap_or(target_path));
		let target_lower = target_name.to_lowercase();

		let mut results = Vec::new();
		for entry in self.entries.values() {
			if entry.path == target_path {
				continue;
			}
			for t in &entry.belongs_to {
				if self.resolves_to(t, target_path, &target_lower) {
					results.push(RelationshipBacklink {
						source_path: entry.path.clone(),
						source_name: entry.title.clone(),
						relationship_type: "belongs_to".to_string(),
					});
					break;
				}
			}
			for t in &entry.related_to {
				if self.resolves_to(t, target_path, &target_lower) {
					results.push(RelationshipBacklink {
						source_path: entry.path.clone(),
						source_name: entry.title.clone(),
						relationship_type: "related_to".to_string(),
					});
					break;
				}
			}
			for t in &entry.has_many {
				if self.resolves_to(t, target_path, &target_lower) {
					results.push(RelationshipBacklink {
						source_path: entry.path.clone(),
						source_name: entry.title.clone(),
						relationship_type: "has_many".to_string(),
					});
					break;
				}
			}
			for (field_name, targets) in &entry.relationships {
				for t in targets {
					if self.resolves_to(t, target_path, &target_lower) {
						results.push(RelationshipBacklink {
							source_path: entry.path.clone(),
							source_name: entry.title.clone(),
							relationship_type: field_name.clone(),
						});
						break;
					}
				}
			}
		}
		results.sort_by(|a, b| a.source_name.to_lowercase().cmp(&b.source_name.to_lowercase()));
		results
	}

	/// Checks if a wikilink target resolves to the given path.
	fn resolves_to(&self, target: &str, expected_path: &str, expected_name_lower: &str) -> bool {
		// Resolve exactly like outgoing links do (`resolve_with_cache`:
		// full-key then basename), so a path-qualified target such as
		// "projects/Alpha" maps to the SINGLE resolved path instead of
		// matching every note that merely shares the "Alpha" basename. The
		// bare basename compare remains only as the final fallback for a
		// target with no entry in the index at all (genuinely unresolvable).
		match resolve_with_cache(target, &self.by_path) {
			Some(resolved) => resolved == expected_path,
			None => note_name_from_target(target).to_lowercase() == *expected_name_lower,
		}
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
		// ASCII-only lowercase preserves byte length (full `.to_lowercase()`
		// changes the byte length of İ/ẞ/Ⱥ/Ⱦ), keeping match offsets aligned
		// with `content` for the word-boundary check. See
		// `find_plain_text_mention_positions`.
		let stripped_lower = stripped.to_ascii_lowercase();
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
	/// incoming counterpart of `lookup_outgoing_unlinked_mentions`.
	///
	/// This is a thin convenience wrapper that runs the three-phase
	/// scan synchronously: cheap snapshot, disk-bound matching, full-
	/// entry lookup. Production callers from
	/// `commands::vault::get_unlinked_mentions_v2` invoke the phases
	/// individually so the disk-bound phase runs on a `spawn_blocking`
	/// thread without holding the `VaultIndexState` lock or the Tauri
	/// runtime worker.
	pub fn lookup_incoming_unlinked_mentions(&self, path: &str) -> Vec<NoteEntry> {
		let UnlinkedMentionsCandidates { note_name, candidate_paths } =
			self.unlinked_mentions_candidates(path);
		let matched = match_unlinked_mentions(&note_name, candidate_paths);
		let mut results = self.lookup_entries(&matched);
		results.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));
		results
	}

	/// Phase 1 of the incoming-unlinked-mentions scan: produce the
	/// search term + candidate path list. Cheap O(N) string clones —
	/// designed to be called under a brief read lock and the result
	/// moved to a `spawn_blocking` task without keeping the lock.
	///
	/// Excludes the target itself and every source already in
	/// `backlinks[path]` (those render in the linked-mentions panel).
	pub fn unlinked_mentions_candidates(&self, path: &str) -> UnlinkedMentionsCandidates {
		let note_name = note_name_from_target(path).to_string();
		if note_name.is_empty() {
			return UnlinkedMentionsCandidates {
				note_name,
				candidate_paths: Vec::new(),
			};
		}

		let already_linked: BTreeSet<String> = self
			.backlinks
			.get(path)
			.cloned()
			.unwrap_or_default();

		let candidate_paths: Vec<String> = self
			.entries
			.keys()
			.filter(|p| p.as_str() != path && !already_linked.contains(p.as_str()))
			.cloned()
			.collect();

		UnlinkedMentionsCandidates {
			note_name,
			candidate_paths,
		}
	}

	/// Phase 3 of the incoming-unlinked-mentions scan: clone the full
	/// `NoteEntry` for each path in `paths`. Skips paths missing from
	/// `entries` (race with concurrent removes between phases 1-3).
	///
	/// Typically called with the matched-paths Vec returned by
	/// `match_unlinked_mentions`, so M is small (1-20) and the clone
	/// cost is negligible.
	pub fn lookup_entries(&self, paths: &[String]) -> Vec<NoteEntry> {
		paths
			.iter()
			.filter_map(|p| self.entries.get(p).cloned())
			.collect()
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

			// `by_path` cleanup: drop the slot when it pointed at this
			// exact path, then promote any surviving same-stem entry into
			// the slot. Audit 2026-05-22 (#123): the previous version
			// simply dropped the slot and waited for the next full rebuild,
			// which left wikilinks to `[[stem]]` unresolvable whenever two
			// notes shared a stem (e.g. `foo.md` at root and
			// `subdir/foo.md`). After promotion, the surviving entry's
			// retroactive backlinks must also be reconstructed: every
			// source whose outgoing wikilink resolves through the
			// now-updated cache to the surviving path needs to appear in
			// `backlinks[surviving]`.
			let key = note_name_from_target(path).to_lowercase();
			if self.by_path.get(&key).map(|p| p == path).unwrap_or(false) {
				self.by_path.remove(&key);
				let surviving: Option<String> = self
					.entries
					.keys()
					.find(|other| {
						note_name_from_target(other).to_lowercase() == key
					})
					.cloned();
				if let Some(surviving_path) = surviving {
					self.by_path.insert(key, surviving_path.clone());

					// Rebuild backlinks for the promoted entry. Self-links
					// are filtered to match the policy used elsewhere.
					let by_path_ref = &self.by_path;
					let promoted_ref = surviving_path.as_str();
					let retro_sources: Vec<String> = self
						.entries
						.iter()
						.filter(|(src, _)| src.as_str() != promoted_ref)
						.filter_map(|(src, entry)| {
							let hits = entry.outgoing_links.iter().any(|link| {
								resolve_with_cache(&link.target, by_path_ref).as_deref()
									== Some(promoted_ref)
							});
							hits.then(|| src.clone())
						})
						.collect();
					if !retro_sources.is_empty() {
						let set = self
							.backlinks
							.entry(surviving_path.clone())
							.or_default();
						for src in retro_sources {
							set.insert(src);
						}
						// Contract: `affected` lists every path whose backlinks
						// set was modified — the promoted entry just gained its
						// retroactive backlinks.
						affected.insert(surviving_path);
					}
				}
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

#[cfg(test)]
mod tests {
	use super::*;
	use crate::vault::entry::WikiLink;
	use crate::vault::task::Task;
	use serde_json::json;

	// ---- helpers --------------------------------------------------------

	fn make_entry(path: &str, links: &[&str], tags: &[&str]) -> NoteEntry {
		NoteEntry {
			path: path.to_string(),
			title: note_name_from_target(path).to_string(),
			outgoing_links: links
				.iter()
				.map(|t| WikiLink {
					target: t.to_string(),
					..Default::default()
				})
				.collect(),
			tags: tags.iter().map(|t| t.to_string()).collect(),
			..Default::default()
		}
	}

	fn make_entry_with_fm(
		path: &str,
		links: &[&str],
		tags: &[&str],
		frontmatter: BTreeMap<String, JsonValue>,
	) -> NoteEntry {
		let mut e = make_entry(path, links, tags);
		e.frontmatter = frontmatter;
		e
	}

	fn make_entry_with_rels(
		path: &str,
		belongs_to: &[&str],
		related_to: &[&str],
		relationships: BTreeMap<String, Vec<String>>,
	) -> NoteEntry {
		let mut e = make_entry(path, &[], &[]);
		e.belongs_to = belongs_to.iter().map(|s| s.to_string()).collect();
		e.related_to = related_to.iter().map(|s| s.to_string()).collect();
		e.relationships = relationships;
		e
	}

	fn fm(pairs: &[(&str, JsonValue)]) -> BTreeMap<String, JsonValue> {
		pairs.iter().map(|(k, v)| (k.to_string(), v.clone())).collect()
	}

	// ---- Group 1: Private helpers --------------------------------------

	#[test]
	fn note_name_strips_extension() {
		assert_eq!(note_name_from_target("foo.md"), "foo");
		assert_eq!(note_name_from_target("bar.markdown"), "bar");
		assert_eq!(note_name_from_target("baz.tar.gz"), "baz.tar");
	}

	#[test]
	fn note_name_strips_directory() {
		assert_eq!(note_name_from_target("/vault/sub/note.md"), "note");
		assert_eq!(note_name_from_target("sub/deep/file.txt"), "file");
	}

	#[test]
	fn note_name_hidden_file_stays() {
		assert_eq!(note_name_from_target(".hidden"), ".hidden");
		assert_eq!(note_name_from_target("/vault/.config"), ".config");
	}

	#[test]
	fn note_name_no_extension() {
		assert_eq!(note_name_from_target("README"), "README");
		assert_eq!(note_name_from_target("/vault/README"), "README");
	}

	#[test]
	fn note_name_bare_target() {
		assert_eq!(note_name_from_target("foo"), "foo");
	}

	#[test]
	fn canon_value_key_deterministic() {
		assert_eq!(canon_value_key(&json!("hello")), r#""hello""#);
		assert_eq!(canon_value_key(&json!(42)), "42");
		assert_eq!(canon_value_key(&json!(true)), "true");
		assert_eq!(canon_value_key(&json!(null)), "null");
	}

	#[test]
	fn resolve_with_cache_exact_match() {
		let mut cache = HashMap::new();
		cache.insert("foo".to_string(), "/vault/foo.md".to_string());
		assert_eq!(
			resolve_with_cache("foo", &cache),
			Some("/vault/foo.md".to_string())
		);
	}

	#[test]
	fn resolve_with_cache_case_insensitive() {
		let mut cache = HashMap::new();
		cache.insert("foo".to_string(), "/vault/foo.md".to_string());
		assert_eq!(
			resolve_with_cache("FOO", &cache),
			Some("/vault/foo.md".to_string())
		);
	}

	#[test]
	fn resolve_with_cache_basename_fallback() {
		let mut cache = HashMap::new();
		cache.insert("note".to_string(), "/vault/note.md".to_string());
		assert_eq!(
			resolve_with_cache("sub/note", &cache),
			Some("/vault/note.md".to_string())
		);
	}

	#[test]
	fn resolve_with_cache_no_fallback_when_same_as_target() {
		let cache = HashMap::new();
		assert_eq!(resolve_with_cache("missing", &cache), None);
	}

	#[test]
	fn resolve_with_cache_empty_input() {
		let cache = HashMap::new();
		assert_eq!(resolve_with_cache("", &cache), None);
	}

	// ---- Group 2: build() ----------------------------------------------

	#[test]
	fn build_empty_entries() {
		let mut idx = VaultIndex::default();
		idx.build(vec![]);
		assert!(idx.is_empty());
		assert_eq!(idx.version(), 1);
	}

	#[test]
	fn build_single_entry_populates_all_indexes() {
		let mut idx = VaultIndex::default();
		let entry = make_entry_with_fm(
			"/v/note.md",
			&[],
			&["rust", "dev"],
			fm(&[("type", json!("project"))]),
		);
		idx.build(vec![entry]);

		assert_eq!(idx.len(), 1);
		assert!(idx.entries().contains_key("/v/note.md"));
		assert_eq!(idx.by_path().get("note"), Some(&"/v/note.md".to_string()));
		assert!(idx.tags_index().get("rust").unwrap().contains("/v/note.md"));
		assert!(idx.tags_index().get("dev").unwrap().contains("/v/note.md"));
		assert!(idx.properties_index().get("type").is_some());
	}

	#[test]
	fn build_backlinks_from_wikilinks() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["b"], &[]);
		let b = make_entry("/v/b.md", &[], &[]);
		idx.build(vec![a, b]);

		let backlinks_b = idx.backlinks().get("/v/b.md");
		assert!(backlinks_b.is_some());
		assert!(backlinks_b.unwrap().contains("/v/a.md"));
	}

	#[test]
	fn build_self_links_filtered() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["a"], &[]);
		idx.build(vec![a]);

		let backlinks_a = idx.backlinks().get("/v/a.md");
		assert!(backlinks_a.is_none());
	}

	#[test]
	fn build_unresolved_links_no_backlink() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["nonexistent"], &[]);
		idx.build(vec![a]);

		assert!(idx.backlinks().is_empty());
	}

	#[test]
	fn build_stem_collision_first_wins() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/sub1/note.md", &[], &[]);
		let b = make_entry("/v/sub2/note.md", &[], &[]);
		idx.build(vec![a, b]);

		let resolved = idx.by_path().get("note").unwrap();
		assert_eq!(resolved, "/v/sub1/note.md");
	}

	#[test]
	fn build_tags_lowercased() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &[], &["JavaScript"]);
		let b = make_entry("/v/b.md", &[], &["javascript"]);
		idx.build(vec![a, b]);

		let tag_set = idx.tags_index().get("javascript").unwrap();
		assert_eq!(tag_set.len(), 2);
	}

	#[test]
	fn build_properties_indexed() {
		let mut idx = VaultIndex::default();
		let a = make_entry_with_fm("/v/a.md", &[], &[], fm(&[("status", json!("active"))]));
		let b = make_entry_with_fm("/v/b.md", &[], &[], fm(&[("status", json!("active"))]));
		let c = make_entry_with_fm("/v/c.md", &[], &[], fm(&[("status", json!("done"))]));
		idx.build(vec![a, b, c]);

		let by_value = idx.properties_index().get("status").unwrap();
		assert_eq!(by_value.get(&canon_value_key(&json!("active"))).unwrap().len(), 2);
		assert_eq!(by_value.get(&canon_value_key(&json!("done"))).unwrap().len(), 1);
	}

	#[test]
	fn build_version_bumped_once() {
		let mut idx = VaultIndex::default();
		idx.build(vec![make_entry("/v/a.md", &[], &[])]);
		assert_eq!(idx.version(), 1);
	}

	#[test]
	fn build_multiple_links_between_notes() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["b", "c"], &[]);
		let b = make_entry("/v/b.md", &["c"], &[]);
		let c = make_entry("/v/c.md", &[], &[]);
		idx.build(vec![a, b, c]);

		let bl_b = idx.backlinks().get("/v/b.md").unwrap();
		assert!(bl_b.contains("/v/a.md"));

		let bl_c = idx.backlinks().get("/v/c.md").unwrap();
		assert!(bl_c.contains("/v/a.md"));
		assert!(bl_c.contains("/v/b.md"));
	}

	// ---- Group 3: update_entry() ---------------------------------------

	#[test]
	fn update_entry_insert_new() {
		let mut idx = VaultIndex::default();
		let result = idx.update_entry(make_entry("/v/a.md", &[], &[]));
		assert!(result.changed);
		assert_eq!(idx.len(), 1);
		assert_eq!(idx.version(), 1);
	}

	#[test]
	fn update_entry_same_data_not_changed() {
		let mut idx = VaultIndex::default();
		let entry = make_entry("/v/a.md", &[], &["tag1"]);
		idx.update_entry(entry.clone());
		let result = idx.update_entry(entry);
		assert!(!result.changed);
		assert_eq!(idx.version(), 2);
	}

	#[test]
	fn update_entry_adds_backlinks() {
		let mut idx = VaultIndex::default();
		idx.build(vec![make_entry("/v/b.md", &[], &[])]);

		let a = make_entry("/v/a.md", &["b"], &[]);
		let result = idx.update_entry(a);

		assert!(result.changed);
		assert!(result.affected.contains(&"/v/b.md".to_string()));
		assert!(idx.backlinks().get("/v/b.md").unwrap().contains("/v/a.md"));
	}

	#[test]
	fn update_entry_removes_backlinks() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["b"], &[]);
		let b = make_entry("/v/b.md", &[], &[]);
		idx.build(vec![a, b]);

		assert!(idx.backlinks().get("/v/b.md").unwrap().contains("/v/a.md"));

		let a_no_links = make_entry("/v/a.md", &[], &[]);
		let result = idx.update_entry(a_no_links);

		assert!(result.changed);
		assert!(result.affected.contains(&"/v/b.md".to_string()));
		assert!(idx.backlinks().get("/v/b.md").is_none());
	}

	#[test]
	fn update_entry_updates_tags() {
		let mut idx = VaultIndex::default();
		idx.update_entry(make_entry("/v/a.md", &[], &["old"]));
		assert!(idx.tags_index().contains_key("old"));

		idx.update_entry(make_entry("/v/a.md", &[], &["new"]));
		assert!(!idx.tags_index().contains_key("old"));
		assert!(idx.tags_index().contains_key("new"));
	}

	#[test]
	fn update_entry_updates_properties() {
		let mut idx = VaultIndex::default();
		idx.update_entry(make_entry_with_fm(
			"/v/a.md", &[], &[],
			fm(&[("status", json!("draft"))]),
		));
		assert!(idx.properties_index().get("status").unwrap()
			.contains_key(&canon_value_key(&json!("draft"))));

		idx.update_entry(make_entry_with_fm(
			"/v/a.md", &[], &[],
			fm(&[("status", json!("published"))]),
		));
		assert!(!idx.properties_index().get("status").unwrap()
			.contains_key(&canon_value_key(&json!("draft"))));
		assert!(idx.properties_index().get("status").unwrap()
			.contains_key(&canon_value_key(&json!("published"))));
	}

	#[test]
	fn update_entry_empty_backlink_sets_pruned() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["b"], &[]);
		let b = make_entry("/v/b.md", &[], &[]);
		idx.build(vec![a, b]);
		assert!(idx.backlinks().contains_key("/v/b.md"));

		idx.update_entry(make_entry("/v/a.md", &[], &[]));
		assert!(!idx.backlinks().contains_key("/v/b.md"));
	}

	#[test]
	fn update_entry_retroactive_backlinks() {
		let mut idx = VaultIndex::default();
		idx.update_entry(make_entry("/v/a.md", &["b"], &[]));
		assert!(idx.backlinks().get("/v/b.md").is_none());

		idx.update_entry(make_entry("/v/b.md", &[], &[]));
		let bl = idx.backlinks().get("/v/b.md");
		assert!(bl.is_some(), "retroactive backlinks should exist");
		assert!(bl.unwrap().contains("/v/a.md"));
	}

	#[test]
	fn update_entry_by_path_first_write_wins() {
		let mut idx = VaultIndex::default();
		idx.update_entry(make_entry("/v/sub1/note.md", &[], &[]));
		idx.update_entry(make_entry("/v/sub2/note.md", &[], &[]));

		assert_eq!(idx.by_path().get("note"), Some(&"/v/sub1/note.md".to_string()));
	}

	// ---- Group 4: remove_entry() ---------------------------------------

	#[test]
	fn remove_entry_cleans_all_indexes() {
		let mut idx = VaultIndex::default();
		let entry = make_entry_with_fm(
			"/v/a.md",
			&["b"],
			&["tag1"],
			fm(&[("status", json!("active"))]),
		);
		let b = make_entry("/v/b.md", &[], &[]);
		idx.build(vec![entry, b]);

		assert_eq!(idx.len(), 2);
		assert!(idx.tags_index().contains_key("tag1"));
		assert!(idx.properties_index().contains_key("status"));
		assert!(idx.backlinks().contains_key("/v/b.md"));

		let result = idx.remove_entry("/v/a.md");
		assert!(result.changed);
		assert_eq!(idx.len(), 1);
		assert!(!idx.tags_index().contains_key("tag1"));
		assert!(!idx.properties_index().contains_key("status"));
		assert!(!idx.backlinks().contains_key("/v/b.md"));
	}

	#[test]
	fn remove_entry_nonexistent_path() {
		let mut idx = VaultIndex::default();
		let result = idx.remove_entry("/v/nope.md");
		assert!(!result.changed);
		assert!(idx.version() > 0);
	}

	#[test]
	fn remove_entry_source_cleans_target_backlinks() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["b"], &[]);
		let b = make_entry("/v/b.md", &[], &[]);
		idx.build(vec![a, b]);

		assert!(idx.backlinks().get("/v/b.md").unwrap().contains("/v/a.md"));

		idx.remove_entry("/v/a.md");
		assert!(!idx.backlinks().contains_key("/v/b.md"));
	}

	#[test]
	fn remove_entry_by_path_promotion() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/sub1/note.md", &[], &[]);
		let b = make_entry("/v/sub2/note.md", &[], &[]);
		idx.build(vec![a, b]);

		assert_eq!(idx.by_path().get("note"), Some(&"/v/sub1/note.md".to_string()));

		idx.remove_entry("/v/sub1/note.md");
		assert_eq!(idx.by_path().get("note"), Some(&"/v/sub2/note.md".to_string()));
	}

	#[test]
	fn remove_entry_retroactive_backlinks_for_promoted() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/sub1/note.md", &[], &[]);
		let b = make_entry("/v/sub2/note.md", &[], &[]);
		let c = make_entry("/v/c.md", &["note"], &[]);
		idx.build(vec![a, b, c]);

		assert!(idx.backlinks().get("/v/sub1/note.md").unwrap().contains("/v/c.md"));

		idx.remove_entry("/v/sub1/note.md");
		let bl = idx.backlinks().get("/v/sub2/note.md");
		assert!(bl.is_some(), "promoted entry should have retroactive backlinks");
		assert!(bl.unwrap().contains("/v/c.md"));
	}

	#[test]
	fn remove_entry_empty_tag_sets_pruned() {
		let mut idx = VaultIndex::default();
		idx.build(vec![make_entry("/v/a.md", &[], &["lonely"])]);
		assert!(idx.tags_index().contains_key("lonely"));

		idx.remove_entry("/v/a.md");
		assert!(!idx.tags_index().contains_key("lonely"));
	}

	// ---- Group 5: Lookup functions -------------------------------------

	#[test]
	fn lookup_backlinks_sorted_by_title() {
		let mut idx = VaultIndex::default();
		let mut z = make_entry("/v/z.md", &["target"], &[]);
		z.title = "Zebra".to_string();
		let mut a = make_entry("/v/a.md", &["target"], &[]);
		a.title = "Alpha".to_string();
		let target = make_entry("/v/target.md", &[], &[]);
		idx.build(vec![z, a, target]);

		let bl = idx.lookup_backlinks("/v/target.md");
		assert_eq!(bl.len(), 2);
		assert_eq!(bl[0].title, "Alpha");
		assert_eq!(bl[1].title, "Zebra");
	}

	#[test]
	fn lookup_backlinks_unknown_path_empty() {
		let idx = VaultIndex::default();
		assert!(idx.lookup_backlinks("/v/nope.md").is_empty());
	}

	#[test]
	fn lookup_relationship_backlinks_belongs_to() {
		let mut idx = VaultIndex::default();
		let parent = make_entry("/v/parent.md", &[], &[]);
		let child = make_entry_with_rels("/v/child.md", &["parent"], &[], BTreeMap::new());
		idx.build(vec![parent, child]);

		let rels = idx.lookup_relationship_backlinks("/v/parent.md");
		assert_eq!(rels.len(), 1);
		assert_eq!(rels[0].relationship_type, "belongs_to");
		assert_eq!(rels[0].source_path, "/v/child.md");
	}

	#[test]
	fn lookup_relationship_backlinks_related_to() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &[], &[]);
		let b = make_entry_with_rels("/v/b.md", &[], &["a"], BTreeMap::new());
		idx.build(vec![a, b]);

		let rels = idx.lookup_relationship_backlinks("/v/a.md");
		assert_eq!(rels.len(), 1);
		assert_eq!(rels[0].relationship_type, "related_to");
	}

	#[test]
	fn lookup_relationship_backlinks_has_many() {
		let mut idx = VaultIndex::default();
		let target = make_entry("/v/task.md", &[], &[]);
		let mut owner = make_entry("/v/owner.md", &[], &[]);
		owner.has_many = vec!["task".to_string()];
		idx.build(vec![target, owner]);

		let rels = idx.lookup_relationship_backlinks("/v/task.md");
		assert_eq!(rels.len(), 1);
		assert_eq!(rels[0].relationship_type, "has_many");
		assert_eq!(rels[0].source_path, "/v/owner.md");
	}

	#[test]
	fn lookup_relationship_backlinks_custom() {
		let mut idx = VaultIndex::default();
		let target = make_entry("/v/target.md", &[], &[]);
		let mut rels_map = BTreeMap::new();
		rels_map.insert("blocks".to_string(), vec!["target".to_string()]);
		let source = make_entry_with_rels("/v/source.md", &[], &[], rels_map);
		idx.build(vec![target, source]);

		let rels = idx.lookup_relationship_backlinks("/v/target.md");
		assert_eq!(rels.len(), 1);
		assert_eq!(rels[0].relationship_type, "blocks");
	}

	#[test]
	fn relationship_backlinks_no_false_positive_on_basename_collision() {
		// Two notes share the basename "Note" in different folders. A third
		// note's `_belongs_to` points at ONE of them via a path-qualified
		// target ("a/Note"). resolves_to must map that to the single resolved
		// path (first path wins on a basename collision, like every other link
		// resolution), NOT match every "Note". Pre-fix the basename-only
		// fallback matched both, giving the non-targeted peer a phantom
		// relationship backlink.
		let mut idx = VaultIndex::default();
		// Insertion order fixes the resolution winner: "note" -> /v/a/Note.md.
		let a = make_entry("/v/a/Note.md", &[], &[]);
		let b = make_entry("/v/b/Note.md", &[], &[]);
		let src = make_entry_with_rels("/v/src.md", &["a/Note"], &[], BTreeMap::new());
		idx.build(vec![a, b, src]);

		// The note the target resolves to gets the backlink...
		let on_a = idx.lookup_relationship_backlinks("/v/a/Note.md");
		assert_eq!(on_a.len(), 1);
		assert_eq!(on_a[0].source_path, "/v/src.md");

		// ...and the colliding peer that was NOT targeted gets none.
		let on_b = idx.lookup_relationship_backlinks("/v/b/Note.md");
		assert!(
			on_b.is_empty(),
			"basename-collision peer must not get a phantom relationship backlink"
		);
	}

	#[test]
	fn lookup_outgoing_links_resolves_targets() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["b", "missing"], &[]);
		let b = make_entry("/v/b.md", &[], &[]);
		idx.build(vec![a, b]);

		let links = idx.lookup_outgoing_links("/v/a.md");
		assert_eq!(links.len(), 2);

		let resolved: Vec<_> = links.iter().filter(|l| l.resolved_path.is_some()).collect();
		assert_eq!(resolved.len(), 1);
		assert_eq!(resolved[0].resolved_path, Some("/v/b.md".to_string()));

		let broken: Vec<_> = links.iter().filter(|l| l.resolved_path.is_none()).collect();
		assert_eq!(broken.len(), 1);
		assert_eq!(broken[0].target, "missing");
	}

	#[test]
	fn lookup_outgoing_links_unknown_path_empty() {
		let idx = VaultIndex::default();
		assert!(idx.lookup_outgoing_links("/v/nope.md").is_empty());
	}

	#[test]
	fn unlinked_mentions_candidates_excludes_self_and_linked() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["b"], &[]);
		let b = make_entry("/v/b.md", &[], &[]);
		let c = make_entry("/v/c.md", &[], &[]);
		idx.build(vec![a, b, c]);

		let cands = idx.unlinked_mentions_candidates("/v/a.md");
		assert_eq!(cands.note_name, "a");
		assert!(!cands.candidate_paths.contains(&"/v/a.md".to_string()));
	}

	#[test]
	fn lookup_notes_with_tag_case_insensitive() {
		let mut idx = VaultIndex::default();
		idx.build(vec![
			make_entry("/v/a.md", &[], &["Rust"]),
			make_entry("/v/b.md", &[], &["rust"]),
		]);

		let notes = idx.lookup_notes_with_tag("RUST");
		assert_eq!(notes.len(), 2);
	}

	#[test]
	fn lookup_notes_with_tag_strips_hash() {
		let mut idx = VaultIndex::default();
		idx.build(vec![make_entry("/v/a.md", &[], &["tag1"])]);

		let notes = idx.lookup_notes_with_tag("#tag1");
		assert_eq!(notes.len(), 1);
	}

	#[test]
	fn lookup_all_tags_aggregated_sorted() {
		let mut idx = VaultIndex::default();
		idx.build(vec![
			make_entry("/v/a.md", &[], &["beta", "Alpha"]),
			make_entry("/v/b.md", &[], &["alpha"]),
		]);

		let tags = idx.lookup_all_tags();
		assert_eq!(tags.len(), 2);
		assert_eq!(tags[0].name.to_lowercase(), "alpha");
		assert_eq!(tags[0].count, 2);
		assert_eq!(tags[1].name.to_lowercase(), "beta");
		assert_eq!(tags[1].count, 1);
	}

	#[test]
	fn lookup_all_tasks_sorted_by_modified_desc() {
		let mut idx = VaultIndex::default();
		let mut old = make_entry("/v/old.md", &[], &[]);
		old.modified_at = 100;
		old.tasks = vec![Task { text: "task".to_string(), ..Default::default() }];
		let mut new = make_entry("/v/new.md", &[], &[]);
		new.modified_at = 200;
		new.tasks = vec![Task { text: "task".to_string(), ..Default::default() }];
		idx.build(vec![old, new]);

		let groups = idx.lookup_all_tasks();
		assert_eq!(groups.len(), 2);
		assert_eq!(groups[0].file_path, "/v/new.md");
		assert_eq!(groups[1].file_path, "/v/old.md");
	}

	#[test]
	fn lookup_all_tasks_skips_empty() {
		let mut idx = VaultIndex::default();
		idx.build(vec![make_entry("/v/a.md", &[], &[])]);
		assert!(idx.lookup_all_tasks().is_empty());
	}

	#[test]
	fn lookup_tasks_in_path_returns_tasks_or_empty() {
		let mut idx = VaultIndex::default();
		let mut e = make_entry("/v/a.md", &[], &[]);
		e.tasks = vec![Task { text: "do it".to_string(), ..Default::default() }];
		idx.build(vec![e]);

		assert_eq!(idx.lookup_tasks_in_path("/v/a.md").len(), 1);
		assert!(idx.lookup_tasks_in_path("/v/nope.md").is_empty());
	}

	#[test]
	fn lookup_notes_by_property_canonical_match() {
		let mut idx = VaultIndex::default();
		idx.build(vec![
			make_entry_with_fm("/v/a.md", &[], &[], fm(&[("type", json!("project"))])),
			make_entry_with_fm("/v/b.md", &[], &[], fm(&[("type", json!("note"))])),
		]);

		let notes = idx.lookup_notes_by_property("type", &json!("project"));
		assert_eq!(notes.len(), 1);
		assert_eq!(notes[0].path, "/v/a.md");
	}

	#[test]
	fn lookup_notes_by_property_unknown_key_empty() {
		let idx = VaultIndex::default();
		assert!(idx.lookup_notes_by_property("nope", &json!("x")).is_empty());
	}

	#[test]
	fn lookup_property_values_sorted() {
		let mut idx = VaultIndex::default();
		idx.build(vec![
			make_entry_with_fm("/v/a.md", &[], &[], fm(&[("status", json!("beta"))])),
			make_entry_with_fm("/v/b.md", &[], &[], fm(&[("status", json!("alpha"))])),
		]);

		let vals = idx.lookup_property_values("status");
		assert_eq!(vals.len(), 2);
		assert_eq!(vals[0], json!("alpha"));
		assert_eq!(vals[1], json!("beta"));
	}

	#[test]
	fn lookup_note_properties_clone_or_default() {
		let mut idx = VaultIndex::default();
		idx.build(vec![make_entry_with_fm(
			"/v/a.md", &[], &[],
			fm(&[("key", json!("val"))]),
		)]);

		let props = idx.lookup_note_properties("/v/a.md");
		assert_eq!(props.get("key"), Some(&json!("val")));

		let empty = idx.lookup_note_properties("/v/nope.md");
		assert!(empty.is_empty());
	}

	// ---- Group 6: Edge cases -------------------------------------------

	#[test]
	fn entry_no_links_no_tags_no_fm() {
		let mut idx = VaultIndex::default();
		idx.build(vec![make_entry("/v/plain.md", &[], &[])]);
		assert_eq!(idx.len(), 1);
		assert!(idx.backlinks().is_empty());
		assert!(idx.tags_index().is_empty());
		assert!(idx.properties_index().is_empty());
	}

	#[test]
	fn resolve_public_wrapper() {
		let mut idx = VaultIndex::default();
		idx.build(vec![make_entry("/v/foo.md", &[], &[])]);
		assert_eq!(idx.resolve("foo"), Some("/v/foo.md".to_string()));
		assert_eq!(idx.resolve(""), None);
		assert_eq!(idx.resolve("nonexistent"), None);
	}

	#[test]
	fn unicode_note_names_and_tags() {
		let mut idx = VaultIndex::default();
		let entry = make_entry("/v/caf\u{00e9}.md", &[], &["\u{65e5}\u{672c}\u{8a9e}"]);
		idx.build(vec![entry]);

		assert_eq!(idx.len(), 1);
		assert!(idx.tags_index().contains_key("\u{65e5}\u{672c}\u{8a9e}"));
	}

	#[test]
	fn build_then_rebuild_clears_stale_data() {
		let mut idx = VaultIndex::default();
		idx.build(vec![
			make_entry("/v/a.md", &["b"], &["tag1"]),
			make_entry("/v/b.md", &[], &[]),
		]);
		assert!(idx.backlinks().contains_key("/v/b.md"));
		assert!(idx.tags_index().contains_key("tag1"));

		idx.build(vec![make_entry("/v/c.md", &[], &["tag2"])]);
		assert_eq!(idx.len(), 1);
		assert!(!idx.backlinks().contains_key("/v/b.md"));
		assert!(!idx.tags_index().contains_key("tag1"));
		assert!(idx.tags_index().contains_key("tag2"));
	}

	#[test]
	fn update_then_remove_then_reinsert() {
		let mut idx = VaultIndex::default();
		idx.update_entry(make_entry("/v/a.md", &[], &["tag"]));
		assert!(idx.tags_index().contains_key("tag"));

		idx.remove_entry("/v/a.md");
		assert!(!idx.tags_index().contains_key("tag"));
		assert_eq!(idx.len(), 0);

		let result = idx.update_entry(make_entry("/v/a.md", &[], &["tag"]));
		assert!(result.changed);
		assert_eq!(idx.len(), 1);
		assert!(idx.tags_index().contains_key("tag"));
	}

	#[test]
	fn remove_entry_with_inbound_backlinks_cleans_own_set() {
		let mut idx = VaultIndex::default();
		let a = make_entry("/v/a.md", &["target"], &[]);
		let b = make_entry("/v/b.md", &["target"], &[]);
		let target = make_entry("/v/target.md", &[], &[]);
		idx.build(vec![a, b, target]);

		assert_eq!(idx.backlinks().get("/v/target.md").unwrap().len(), 2);

		idx.remove_entry("/v/target.md");
		assert!(!idx.backlinks().contains_key("/v/target.md"));
	}

	#[test]
	fn update_entry_affected_sorted() {
		let mut idx = VaultIndex::default();
		idx.build(vec![
			make_entry("/v/z.md", &[], &[]),
			make_entry("/v/a.md", &[], &[]),
		]);

		let result = idx.update_entry(make_entry("/v/src.md", &["z", "a"], &[]));
		assert_eq!(result.affected, vec!["/v/a.md", "/v/z.md"]);
	}
}
