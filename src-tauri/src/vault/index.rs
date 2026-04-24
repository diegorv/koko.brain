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
use serde::Serialize;
use std::collections::{HashMap, HashSet};

/// Monotonic revision number. Bumps on every mutation so consumers can
/// discard stale reads and so `vault-index-updated` payloads carry a
/// strictly-increasing stamp that clients can order against.
pub type IndexVersion = u64;

/// Outcome of a single `update_entry` call, carried as the payload of the
/// `vault-index-updated` Tauri event (Phase 2.6). Clients use it to decide
/// which consumer panels need to re-fetch: a panel showing backlinks for
/// any path in `affected` must re-invoke `get_backlinks_v2`; a panel
/// rendering metadata for any path in `changed` must re-invoke its own
/// read command.
#[derive(Serialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateResult {
	/// Paths whose `NoteEntry` was directly inserted or replaced.
	pub changed: Vec<String>,
	/// Paths whose backlinks list changed as a side effect — i.e., the
	/// updated entry added or removed a wikilink pointing at these paths.
	/// A panel rendering backlinks for any of these paths must re-fetch.
	pub affected: Vec<String>,
	/// Index revision after the mutation. Clients can use this to
	/// detect / drop out-of-order events if they maintain their own
	/// monotonic signal.
	pub version: IndexVersion,
}

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
	by_filename: HashMap<String, String>,
	version: IndexVersion,
}

impl VaultIndex {
	/// Fresh empty index. Version starts at 0; the first `build` or
	/// `update_entry` bumps to 1.
	pub fn new() -> Self {
		Self::default()
	}

	/// Populates the index from a full vault scan. Rebuilds `entries`,
	/// `by_path`, and the reverse `backlinks` map from scratch; bumps
	/// `version` by 1. Any previous state is dropped.
	///
	/// Wikilink resolution mirrors `resolveWikilink` in the TS backlinks
	/// logic: lowercase filename stem matches with a basename fallback
	/// for path-prefixed targets. First path wins on filename collisions
	/// (same as `buildResolutionCache` in TS).
	pub fn build(&mut self, entries: Vec<NoteEntry>) {
		self.entries = entries;
		self.by_path.clear();
		self.by_path.reserve(self.entries.len());
		for (i, entry) in self.entries.iter().enumerate() {
			self.by_path.insert(entry.path.clone(), i);
		}

		// Build the lowercase filename → path resolution map; first entry wins on collision.
		// Cached on the struct so subsequent get_outgoing_links_v2 / update_entry calls
		// don't pay the O(N) re-scan. Kept in sync by update_entry.
		self.by_filename.clear();
		self.by_filename.reserve(self.entries.len());
		for entry in &self.entries {
			let key = filename_stem_lower(&entry.path);
			self.by_filename
				.entry(key)
				.or_insert_with(|| entry.path.clone());
		}

		self.backlinks.clear();
		for entry in &self.entries {
			for target in &entry.outgoing_links {
				if let Some(resolved) = resolve_wikilink(target, &self.by_filename) {
					// Do not count self-links — matches the sourcePath != currentPath
					// skip in TS's findLinkedMentions.
					if resolved == entry.path {
						continue;
					}
					self.backlinks
						.entry(resolved.to_string())
						.or_default()
						.insert(entry.path.clone());
				}
			}
		}

		self.version = self.version.wrapping_add(1);
	}

	/// Inserts or replaces a single entry, keeping the reverse backlinks map
	/// in sync. Returns an `UpdateResult` listing the changed path plus every
	/// path whose backlinks list shifted as a side effect of this mutation.
	///
	/// Semantics:
	///   * First insert of a path → entry appended; outgoing_links register
	///     new incoming edges on resolved targets.
	///   * Subsequent updates → outgoing_links diffed against the previous
	///     version. Removed links retract the source from the target's
	///     backlinks set; added links register new ones. The entry itself
	///     is replaced in place (preserves the slot index in `entries`).
	///   * Self-links are filtered (consistent with `build`).
	///   * Version bumps by 1 (wrapping).
	pub fn update_entry(&mut self, entry: NoteEntry) -> UpdateResult {
		let source_path = entry.path.clone();
		let new_links = entry.outgoing_links.clone();

		// Snapshot previous outgoing links (if the entry already exists).
		let prev_links: Vec<String> = self
			.by_path
			.get(&source_path)
			.and_then(|i| self.entries.get(*i))
			.map(|e| e.outgoing_links.clone())
			.unwrap_or_default();

		// Replace / insert the entry in the entries vec and by_path.
		if let Some(idx) = self.by_path.get(&source_path) {
			self.entries[*idx] = entry;
		} else {
			self.entries.push(entry);
			self.by_path
				.insert(source_path.clone(), self.entries.len() - 1);
			// New path may introduce a new filename stem. First-wins preserves
			// the existing mapping if the stem already exists.
			let key = filename_stem_lower(&source_path);
			self.by_filename
				.entry(key)
				.or_insert_with(|| source_path.clone());
		}

		// Snapshot the cached resolver. Build() already maintains by_filename;
		// we only insert new paths above. Stem renames (path change of an
		// existing entry) would require removing the old stem + inserting the
		// new — not possible via update_entry today (it's keyed on the same
		// path), so the cache stays correct.
		let by_filename = &self.by_filename;

		// Diff outgoing links to determine which target backlinks change.
		let prev_set: HashSet<&String> = prev_links.iter().collect();
		let new_set: HashSet<&String> = new_links.iter().collect();
		let removed: Vec<&String> = prev_set.difference(&new_set).copied().collect();
		let added: Vec<&String> = new_set.difference(&prev_set).copied().collect();

		let mut affected: HashSet<String> = HashSet::new();

		// Remove source from backlinks of every target whose link was removed.
		for target in removed {
			if let Some(resolved) = resolve_wikilink(target, by_filename) {
				if resolved == source_path {
					continue;
				}
				let resolved_owned = resolved.to_string();
				if let Some(set) = self.backlinks.get_mut(&resolved_owned) {
					if set.remove(&source_path) {
						affected.insert(resolved_owned.clone());
					}
					if set.is_empty() {
						self.backlinks.remove(&resolved_owned);
					}
				}
			}
		}

		// Add source to backlinks of every target whose link was added.
		for target in added {
			if let Some(resolved) = resolve_wikilink(target, by_filename) {
				if resolved == source_path {
					continue;
				}
				let resolved_owned = resolved.to_string();
				let set = self.backlinks.entry(resolved_owned.clone()).or_default();
				if set.insert(source_path.clone()) {
					affected.insert(resolved_owned);
				}
			}
		}

		self.version = self.version.wrapping_add(1);

		UpdateResult {
			changed: vec![source_path],
			affected: affected.into_iter().collect(),
			version: self.version,
		}
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

	/// Resolves the outgoing wikilinks of the note at `source_path` to the
	/// absolute paths of their target notes. Deduplicated by target path;
	/// unresolved links are omitted (their target does not exist in the
	/// vault). Self-links are filtered to match backlinks semantics.
	///
	/// O(K) where K is the number of outgoing links on the source — uses
	/// the cached `by_filename` resolver, no full-vault scan.
	pub fn outgoing_links_of(&self, source_path: &str) -> Vec<String> {
		let entry = match self.entry_for_path(source_path) {
			Some(e) => e,
			None => return Vec::new(),
		};
		let mut seen: HashSet<String> = HashSet::new();
		let mut out = Vec::new();
		for target in &entry.outgoing_links {
			if let Some(resolved) = resolve_wikilink(target, &self.by_filename) {
				if resolved == source_path {
					continue;
				}
				if seen.insert(resolved.to_string()) {
					out.push(resolved.to_string());
				}
			}
		}
		out
	}

	/// Current revision number. Bumps on every successful mutation.
	pub fn version(&self) -> IndexVersion {
		self.version
	}
}

/// Resolves a raw wikilink target to an absolute path using the prebuilt
/// lowercase-filename lookup. First tries the target as-is (case-insensitive),
/// then falls back to the basename for path-prefixed targets
/// (`folder/sub/note` → `note`). Mirrors TS `resolveWikilink` exactly.
fn resolve_wikilink<'a>(target: &str, by_filename: &'a HashMap<String, String>) -> Option<&'a str> {
	if target.is_empty() {
		return None;
	}
	let lowered = target.to_lowercase();
	if let Some(path) = by_filename.get(&lowered) {
		return Some(path.as_str());
	}
	let basename = basename_lower(target);
	if basename != lowered {
		if let Some(path) = by_filename.get(&basename) {
			return Some(path.as_str());
		}
	}
	None
}

fn filename_stem_lower(path: &str) -> String {
	let name = path.rsplit(&['/', '\\'][..]).next().unwrap_or(path);
	let stem = name
		.strip_suffix(".md")
		.or_else(|| name.strip_suffix(".markdown"))
		.unwrap_or(name);
	stem.to_lowercase()
}

fn basename_lower(target: &str) -> String {
	let name = target.rsplit(&['/', '\\'][..]).next().unwrap_or(target);
	let stem = name
		.strip_suffix(".md")
		.or_else(|| name.strip_suffix(".markdown"))
		.unwrap_or(name);
	stem.to_lowercase()
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

	fn make_entry(path: &str, links: &[&str]) -> NoteEntry {
		NoteEntry {
			path: path.to_string(),
			title: String::new(),
			frontmatter: HashMap::new(),
			outgoing_links: links.iter().map(|s| s.to_string()).collect(),
			tags: Vec::new(),
			modified_at: None,
			word_count: 0,
			snippet: String::new(),
		}
	}

	#[test]
	fn build_populates_entries_and_by_path() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/a.md", &[]),
			make_entry("/v/b.md", &[]),
		]);
		assert_eq!(idx.len(), 2);
		assert!(!idx.is_empty());
		assert_eq!(idx.entry_for_path("/v/a.md").unwrap().path, "/v/a.md");
		assert_eq!(idx.entry_for_path("/v/b.md").unwrap().path, "/v/b.md");
		assert!(idx.entry_for_path("/v/missing.md").is_none());
	}

	#[test]
	fn build_bumps_version_each_time() {
		let mut idx = VaultIndex::new();
		assert_eq!(idx.version(), 0);
		idx.build(vec![make_entry("/v/a.md", &[])]);
		assert_eq!(idx.version(), 1);
		idx.build(vec![make_entry("/v/a.md", &[]), make_entry("/v/b.md", &[])]);
		assert_eq!(idx.version(), 2);
	}

	#[test]
	fn build_resolves_simple_filename_wikilinks() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/alpha.md", &["beta"]),
			make_entry("/v/beta.md", &[]),
		]);
		let backs = idx.backlinks_of("/v/beta.md");
		assert_eq!(backs.len(), 1);
		assert_eq!(backs[0], "/v/alpha.md");
		assert!(idx.backlinks_of("/v/alpha.md").is_empty());
	}

	#[test]
	fn build_resolves_case_insensitive() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/Alpha.md", &["ALPHA"]),
			make_entry("/v/beta.md", &["alpha"]),
		]);
		let backs = idx.backlinks_of("/v/Alpha.md");
		assert_eq!(backs.len(), 1);
		assert_eq!(backs[0], "/v/beta.md");
	}

	#[test]
	fn build_falls_back_to_basename_for_path_targets() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/beta.md", &["folder/sub/beta"]),
			make_entry("/v/alpha.md", &[]),
		]);
		// The [[folder/sub/beta]] link resolves via basename to /v/beta.md
		// (a self-link, which is filtered out), NOT to /v/alpha.md.
		assert!(idx.backlinks_of("/v/beta.md").is_empty());
	}

	#[test]
	fn build_ignores_self_links() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_entry("/v/alpha.md", &["alpha"])]);
		assert!(idx.backlinks_of("/v/alpha.md").is_empty());
	}

	#[test]
	fn build_handles_unresolved_targets() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_entry("/v/alpha.md", &["does-not-exist"])]);
		assert!(idx.backlinks_of("/v/alpha.md").is_empty());
	}

	#[test]
	fn build_first_path_wins_on_filename_collision() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/dir1/note.md", &[]),
			make_entry("/v/dir2/note.md", &[]),
			make_entry("/v/source.md", &["note"]),
		]);
		// Collision: both dir1/note.md and dir2/note.md share stem `note`.
		// First wins (insertion order): dir1/note.md should be the target.
		let backs = idx.backlinks_of("/v/dir1/note.md");
		assert_eq!(backs.len(), 1);
		assert_eq!(backs[0], "/v/source.md");
		assert!(idx.backlinks_of("/v/dir2/note.md").is_empty());
	}

	#[test]
	fn build_multiple_sources_linking_to_same_target() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/a.md", &["target"]),
			make_entry("/v/b.md", &["target"]),
			make_entry("/v/c.md", &["target"]),
			make_entry("/v/target.md", &[]),
		]);
		let mut backs: Vec<&String> = idx.backlinks_of("/v/target.md");
		backs.sort();
		assert_eq!(
			backs
				.iter()
				.map(|s| s.as_str())
				.collect::<Vec<_>>(),
			vec!["/v/a.md", "/v/b.md", "/v/c.md"]
		);
	}

	#[test]
	fn build_same_source_linking_twice_counts_once() {
		// a.md has "beta" twice in its outgoing_links (extractor dedupes, but defend against it).
		let mut idx = VaultIndex::new();
		idx.build(vec![
			NoteEntry {
				path: "/v/a.md".into(),
				outgoing_links: vec!["beta".into(), "beta".into()],
				..Default::default()
			},
			make_entry("/v/beta.md", &[]),
		]);
		assert_eq!(idx.backlinks_of("/v/beta.md").len(), 1);
	}

	#[test]
	fn build_rebuild_replaces_previous_state() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/a.md", &["b"]),
			make_entry("/v/b.md", &[]),
		]);
		assert_eq!(idx.backlinks_of("/v/b.md").len(), 1);

		// Rebuild with a fresh set — old backlinks must not persist.
		idx.build(vec![make_entry("/v/c.md", &[])]);
		assert_eq!(idx.len(), 1);
		assert!(idx.backlinks_of("/v/b.md").is_empty());
		assert!(idx.entry_for_path("/v/a.md").is_none());
	}

	// --- update_entry ---

	#[test]
	fn update_entry_inserts_new_path() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_entry("/v/target.md", &[])]);
		assert_eq!(idx.len(), 1);

		let r = idx.update_entry(make_entry("/v/new.md", &["target"]));
		assert_eq!(r.changed, vec!["/v/new.md"]);
		assert_eq!(r.affected, vec!["/v/target.md"]);
		assert_eq!(r.version, idx.version());
		assert_eq!(idx.len(), 2);
		let backs = idx.backlinks_of("/v/target.md");
		assert_eq!(backs.len(), 1);
		assert_eq!(backs[0], "/v/new.md");
	}

	#[test]
	fn update_entry_replaces_existing() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/a.md", &["target"]),
			make_entry("/v/target.md", &[]),
		]);
		assert_eq!(idx.backlinks_of("/v/target.md").len(), 1);

		// Replace a.md with new content that removes the target link.
		idx.update_entry(make_entry("/v/a.md", &[]));
		assert!(idx.backlinks_of("/v/target.md").is_empty());
		assert_eq!(idx.len(), 2);
	}

	#[test]
	fn update_entry_diffs_links_correctly() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/a.md", &["beta", "gamma"]),
			make_entry("/v/beta.md", &[]),
			make_entry("/v/gamma.md", &[]),
			make_entry("/v/delta.md", &[]),
		]);
		// a.md links to beta and gamma. Update: drop gamma, add delta.
		let r = idx.update_entry(make_entry("/v/a.md", &["beta", "delta"]));
		assert_eq!(r.changed, vec!["/v/a.md"]);
		let mut affected = r.affected.clone();
		affected.sort();
		assert_eq!(affected, vec!["/v/delta.md", "/v/gamma.md"]);

		// beta unchanged, gamma cleared, delta picked up.
		assert_eq!(idx.backlinks_of("/v/beta.md").len(), 1);
		assert!(idx.backlinks_of("/v/gamma.md").is_empty());
		assert_eq!(idx.backlinks_of("/v/delta.md").len(), 1);
	}

	#[test]
	fn update_entry_no_link_changes_reports_no_affected() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/a.md", &["beta"]),
			make_entry("/v/beta.md", &[]),
		]);
		// Update with same outgoing links — only metadata (e.g. word count) changes.
		let r = idx.update_entry(NoteEntry {
			word_count: 42,
			..make_entry("/v/a.md", &["beta"])
		});
		assert!(r.affected.is_empty());
		assert_eq!(r.changed, vec!["/v/a.md"]);
		assert_eq!(idx.entry_for_path("/v/a.md").unwrap().word_count, 42);
	}

	#[test]
	fn update_entry_self_link_ignored() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_entry("/v/a.md", &[])]);
		let r = idx.update_entry(make_entry("/v/a.md", &["a"]));
		assert!(r.affected.is_empty());
		assert!(idx.backlinks_of("/v/a.md").is_empty());
	}

	#[test]
	fn update_entry_bumps_version() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_entry("/v/a.md", &[])]);
		let v0 = idx.version();
		idx.update_entry(make_entry("/v/a.md", &["x"]));
		assert_eq!(idx.version(), v0 + 1);
		idx.update_entry(make_entry("/v/b.md", &[]));
		assert_eq!(idx.version(), v0 + 2);
	}

	// --- outgoing_links_of ---

	#[test]
	fn outgoing_links_of_resolves_simple_targets() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/source.md", &["alpha", "beta"]),
			make_entry("/v/alpha.md", &[]),
			make_entry("/v/beta.md", &[]),
		]);
		let mut out = idx.outgoing_links_of("/v/source.md");
		out.sort();
		assert_eq!(out, vec!["/v/alpha.md".to_string(), "/v/beta.md".to_string()]);
	}

	#[test]
	fn outgoing_links_of_dedupes_same_target() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			NoteEntry {
				path: "/v/source.md".into(),
				outgoing_links: vec!["alpha".into(), "alpha".into()],
				..Default::default()
			},
			make_entry("/v/alpha.md", &[]),
		]);
		assert_eq!(idx.outgoing_links_of("/v/source.md"), vec!["/v/alpha.md".to_string()]);
	}

	#[test]
	fn outgoing_links_of_omits_unresolved() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/source.md", &["alpha", "does-not-exist", "beta"]),
			make_entry("/v/alpha.md", &[]),
			make_entry("/v/beta.md", &[]),
		]);
		let out = idx.outgoing_links_of("/v/source.md");
		assert_eq!(out.len(), 2);
		assert!(out.contains(&"/v/alpha.md".to_string()));
		assert!(out.contains(&"/v/beta.md".to_string()));
	}

	#[test]
	fn outgoing_links_of_filters_self_links() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_entry("/v/source.md", &["source"])]);
		assert!(idx.outgoing_links_of("/v/source.md").is_empty());
	}

	#[test]
	fn outgoing_links_of_empty_for_unknown_path() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_entry("/v/a.md", &["b"])]);
		assert!(idx.outgoing_links_of("/v/unknown.md").is_empty());
	}

	#[test]
	fn outgoing_links_of_respects_path_basename_fallback() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/source.md", &["folder/sub/beta"]),
			make_entry("/v/beta.md", &[]),
		]);
		// `folder/sub/beta` resolves via basename to /v/beta.md.
		assert_eq!(idx.outgoing_links_of("/v/source.md"), vec!["/v/beta.md".to_string()]);
	}

	#[test]
	fn outgoing_links_survives_update_entry() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/a.md", &["target"]),
			make_entry("/v/target.md", &[]),
		]);
		// Add a new entry via update_entry — by_filename should pick it up.
		idx.update_entry(make_entry("/v/new.md", &["target"]));
		assert_eq!(idx.outgoing_links_of("/v/new.md"), vec!["/v/target.md".to_string()]);

		// Remove the outgoing link via replace.
		idx.update_entry(make_entry("/v/new.md", &[]));
		assert!(idx.outgoing_links_of("/v/new.md").is_empty());
	}

	#[test]
	fn update_entry_cleans_up_empty_backlink_sets() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/a.md", &["target"]),
			make_entry("/v/target.md", &[]),
		]);
		assert_eq!(idx.backlinks_of("/v/target.md").len(), 1);

		// Remove the only backlink.
		idx.update_entry(make_entry("/v/a.md", &[]));
		assert!(idx.backlinks_of("/v/target.md").is_empty());
		// Internal check: the target should NOT be in the map with an empty set.
		// (The public API can't see this directly, but the cleanup is what lets
		// backlinks_of return empty correctly if the target later gets re-linked.)
		idx.update_entry(make_entry("/v/c.md", &["target"]));
		assert_eq!(idx.backlinks_of("/v/target.md").len(), 1);
	}
}
