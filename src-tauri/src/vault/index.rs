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
use crate::vault::parsing;
use serde::Serialize;
use serde_json::Value;
use std::collections::{HashMap, HashSet};

/// Monotonic revision number. Bumps on every mutation so consumers can
/// discard stale reads and so `vault-index-updated` payloads carry a
/// strictly-increasing stamp that clients can order against.
pub type IndexVersion = u64;

/// One aggregate row produced by `outgoing_unlinked_mentions_of` — a note in
/// the vault whose title appears as plain text in the source body (with word
/// boundaries, outside of wikilinks, outside of frontmatter/code) but is not
/// already wikilinked from the source.
///
/// Matches the TS `OutgoingUnlinkedMention` shape in
/// `src/lib/features/outgoing-links/outgoing-links.types.ts`.
#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct OutgoingUnlinkedMention {
	pub note_name: String,
	pub note_path: String,
	pub count: usize,
}

/// One aggregate row produced by `all_tags` — a tag that appears in the vault
/// along with its file count and the preserved first-occurrence casing of
/// the name. Clients use `count` for the tag tree and `file_paths` for
/// secondary navigation (panel-side filters).
///
/// Matches the TS `TagEntry` shape in
/// `src/lib/features/tags/tags.types.ts`.
#[derive(Serialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TagAggregate {
	pub name: String,
	pub count: usize,
	pub file_paths: Vec<String>,
}

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
	/// Tag → set of absolute file paths. Keyed by lowercase tag for
	/// case-insensitive lookup; `tags_display` preserves the original
	/// casing chosen by the first note that introduced the tag.
	tags_by_name: HashMap<String, HashSet<String>>,
	/// Lowercase tag → first-occurrence display casing. Mirrors the TS
	/// case-insensitive dedup + first-wins casing from
	/// `tags.logic.ts::aggregateTags`.
	tags_display: HashMap<String, String>,
	/// Property key → canonicalised value → set of absolute paths. Enables
	/// O(1) "notes where status == done" queries. Keys preserve casing as
	/// written in frontmatter (`Status` and `status` are distinct). Values
	/// are canonicalised to `String` via `canonicalise_property_value`;
	/// arrays explode (each element is a separate value entry); objects
	/// are skipped (non-trivial to query in O(1)). Maintained by `build`
	/// + `update_entry`.
	properties: HashMap<String, HashMap<String, HashSet<String>>>,
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
		self.tags_by_name.clear();
		self.tags_display.clear();
		self.properties.clear();
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
			for tag in &entry.tags {
				let lower = tag.to_lowercase();
				self.tags_by_name
					.entry(lower.clone())
					.or_default()
					.insert(entry.path.clone());
				self.tags_display
					.entry(lower)
					.or_insert_with(|| tag.clone());
			}
			for (key, value) in &entry.frontmatter {
				for canon in canonicalise_property_value(value) {
					self.properties
						.entry(key.clone())
						.or_default()
						.entry(canon)
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

		// Snapshot previous outgoing links + tags + frontmatter (if entry already exists).
		let (prev_links, prev_tags, prev_frontmatter) = self
			.by_path
			.get(&source_path)
			.and_then(|i| self.entries.get(*i))
			.map(|e| (e.outgoing_links.clone(), e.tags.clone(), e.frontmatter.clone()))
			.unwrap_or_default();
		let new_tags = entry.tags.clone();
		let new_frontmatter = entry.frontmatter.clone();

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

		// Tag diff: drop source from old tags no longer present, insert into new ones.
		let prev_tag_lower: HashSet<String> =
			prev_tags.iter().map(|t| t.to_lowercase()).collect();
		let new_tag_lower: HashSet<String> = new_tags.iter().map(|t| t.to_lowercase()).collect();
		for tag in prev_tags.iter() {
			let lower = tag.to_lowercase();
			if !new_tag_lower.contains(&lower) {
				if let Some(set) = self.tags_by_name.get_mut(&lower) {
					set.remove(&source_path);
					if set.is_empty() {
						self.tags_by_name.remove(&lower);
						self.tags_display.remove(&lower);
					}
				}
			}
		}
		for tag in new_tags.iter() {
			let lower = tag.to_lowercase();
			if !prev_tag_lower.contains(&lower) {
				self.tags_by_name
					.entry(lower.clone())
					.or_default()
					.insert(source_path.clone());
				self.tags_display
					.entry(lower)
					.or_insert_with(|| tag.clone());
			}
		}

		// Properties diff: symmetric difference on (key, canonicalised value) pairs.
		let prev_pairs: HashSet<(String, String)> = prev_frontmatter
			.iter()
			.flat_map(|(k, v)| {
				canonicalise_property_value(v)
					.into_iter()
					.map(move |canon| (k.clone(), canon))
			})
			.collect();
		let new_pairs: HashSet<(String, String)> = new_frontmatter
			.iter()
			.flat_map(|(k, v)| {
				canonicalise_property_value(v)
					.into_iter()
					.map(move |canon| (k.clone(), canon))
			})
			.collect();
		for (key, canon) in prev_pairs.difference(&new_pairs) {
			if let Some(by_val) = self.properties.get_mut(key) {
				if let Some(set) = by_val.get_mut(canon) {
					set.remove(&source_path);
					if set.is_empty() {
						by_val.remove(canon);
					}
				}
				if by_val.is_empty() {
					self.properties.remove(key);
				}
			}
		}
		for (key, canon) in new_pairs.difference(&prev_pairs) {
			self.properties
				.entry(key.clone())
				.or_default()
				.entry(canon.clone())
				.or_default()
				.insert(source_path.clone());
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

	/// Scans the supplied body (typically the editor's current content for the
	/// source) for plain-text mentions of every other note's title — returns
	/// per-note aggregates where `count > 0`. Mentions that are already
	/// wikilinks from this source (including path-basename variants), mentions
	/// inside `[[…]]`, and mentions inside frontmatter / fenced code are
	/// excluded. Matches the TS `findOutgoingUnlinkedMentions` semantics.
	///
	/// Takes `content` explicitly instead of reading disk because the editor
	/// buffer may differ from disk when the user is typing. O(N × M) where N
	/// is vault size and M is body size; acceptable because this runs only
	/// when the Outgoing panel is open + dirty (deferred compute).
	pub fn outgoing_unlinked_mentions_of(
		&self,
		source_path: &str,
		content: &str,
	) -> Vec<OutgoingUnlinkedMention> {
		if content.is_empty() {
			return Vec::new();
		}
		let source_entry = self.entry_for_path(source_path);
		let already_linked: HashSet<String> = source_entry
			.map(|e| {
				e.outgoing_links
					.iter()
					.flat_map(|t| {
						let lower = t.to_lowercase();
						let base = basename_lower(t);
						if base == lower {
							vec![lower]
						} else {
							vec![lower, base]
						}
					})
					.collect()
			})
			.unwrap_or_default();

		let stripped = parsing::strip_non_body_content(content);

		let mut mentions: Vec<OutgoingUnlinkedMention> = self
			.entries
			.iter()
			.filter(|e| e.path != source_path)
			.filter_map(|entry| {
				let note_name = filename_stem(&entry.path);
				if note_name.is_empty() {
					return None;
				}
				let note_name_lower = note_name.to_lowercase();
				if already_linked.contains(&note_name_lower) {
					return None;
				}
				let count = parsing::count_plain_text_mentions(&stripped, &note_name);
				if count == 0 {
					return None;
				}
				Some(OutgoingUnlinkedMention {
					note_name,
					note_path: entry.path.clone(),
					count,
				})
			})
			.collect();

		mentions.sort_by(|a, b| {
			a.note_name
				.to_lowercase()
				.cmp(&b.note_name.to_lowercase())
		});
		mentions
	}

	/// Returns every absolute path of a note that carries the given tag.
	/// Lookup is case-insensitive; order is unspecified (callers should
	/// sort if needed). O(1).
	pub fn notes_with_tag(&self, tag: &str) -> Vec<String> {
		self.tags_by_name
			.get(&tag.to_lowercase())
			.map(|set| set.iter().cloned().collect())
			.unwrap_or_default()
	}

	/// Aggregate view of every tag in the vault: display name, file count, and
	/// full path list. Sorted by name (case-insensitive) for stable UI.
	/// Mirrors TS `aggregateTags` output.
	pub fn all_tags(&self) -> Vec<TagAggregate> {
		let mut out: Vec<TagAggregate> = self
			.tags_by_name
			.iter()
			.map(|(lower, paths)| {
				let name = self
					.tags_display
					.get(lower)
					.cloned()
					.unwrap_or_else(|| lower.clone());
				let mut file_paths: Vec<String> = paths.iter().cloned().collect();
				file_paths.sort();
				TagAggregate {
					count: paths.len(),
					name,
					file_paths,
				}
			})
			.collect();
		out.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
		out
	}

	/// Returns every absolute path whose frontmatter has `key` set to a value
	/// that canonicalises to `value`. For array properties, the source note
	/// matches if ANY element of the array canonicalises to `value` — e.g.
	/// `tags: [alpha, beta]` matches both a query for "alpha" and "beta".
	/// Value comparison is exact (case-sensitive) on the canonical string.
	pub fn notes_with_property<V: AsRef<str>>(&self, key: &str, value: V) -> Vec<String> {
		self.properties
			.get(key)
			.and_then(|by_val| by_val.get(value.as_ref()))
			.map(|set| set.iter().cloned().collect())
			.unwrap_or_default()
	}

	/// Distinct canonicalised values for `key` across the vault, sorted.
	/// Useful for building property-value filter dropdowns in the UI.
	pub fn property_values(&self, key: &str) -> Vec<String> {
		let mut values: Vec<String> = self
			.properties
			.get(key)
			.map(|by_val| by_val.keys().cloned().collect())
			.unwrap_or_default();
		values.sort();
		values
	}

	/// The raw frontmatter map of the note at `path`, empty when unknown.
	pub fn note_properties(&self, path: &str) -> HashMap<String, Value> {
		self.entry_for_path(path)
			.map(|e| e.frontmatter.clone())
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

fn filename_stem(path: &str) -> String {
	let name = path.rsplit(&['/', '\\'][..]).next().unwrap_or(path);
	name.strip_suffix(".md")
		.or_else(|| name.strip_suffix(".markdown"))
		.unwrap_or(name)
		.to_string()
}

/// Canonicalises a `serde_json::Value` into a list of string keys used for
/// property indexing. Scalars produce one key; arrays explode into one key
/// per element; objects are skipped (no stable O(1) indexable shape).
///
///   * String → the raw string
///   * Number → `n.to_string()` (preserves int / float form as serialised)
///   * Bool   → "true" / "false"
///   * Null   → "null"
///   * Array  → flat-map over elements (also drops objects-inside-arrays)
///   * Object → empty vec (skip)
fn canonicalise_property_value(value: &Value) -> Vec<String> {
	match value {
		Value::String(s) => vec![s.clone()],
		Value::Number(n) => vec![n.to_string()],
		Value::Bool(b) => vec![b.to_string()],
		Value::Null => vec!["null".to_string()],
		Value::Array(items) => items
			.iter()
			.flat_map(|v| canonicalise_property_value(v))
			.collect(),
		Value::Object(_) => Vec::new(),
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

	// --- tags aggregation ---

	fn make_tagged(path: &str, tags: &[&str]) -> NoteEntry {
		NoteEntry {
			path: path.to_string(),
			tags: tags.iter().map(|s| s.to_string()).collect(),
			..Default::default()
		}
	}

	#[test]
	fn notes_with_tag_returns_paths() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_tagged("/v/a.md", &["work"]),
			make_tagged("/v/b.md", &["work", "urgent"]),
			make_tagged("/v/c.md", &["personal"]),
		]);
		let mut work = idx.notes_with_tag("work");
		work.sort();
		assert_eq!(work, vec!["/v/a.md", "/v/b.md"]);
		assert_eq!(idx.notes_with_tag("urgent"), vec!["/v/b.md"]);
		assert!(idx.notes_with_tag("nonexistent").is_empty());
	}

	#[test]
	fn notes_with_tag_is_case_insensitive() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_tagged("/v/a.md", &["Work"])]);
		assert_eq!(idx.notes_with_tag("work"), vec!["/v/a.md"]);
		assert_eq!(idx.notes_with_tag("WORK"), vec!["/v/a.md"]);
	}

	#[test]
	fn all_tags_aggregates_with_first_occurrence_casing() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_tagged("/v/a.md", &["Work"]),
			make_tagged("/v/b.md", &["work"]),       // Lowercase — but "Work" should persist
			make_tagged("/v/c.md", &["Personal"]),
		]);
		let all = idx.all_tags();
		assert_eq!(all.len(), 2);
		let work = all.iter().find(|t| t.name == "Work").expect("Work case preserved");
		assert_eq!(work.count, 2);
		assert_eq!(work.file_paths.len(), 2);
	}

	#[test]
	fn all_tags_sorted_case_insensitive() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_tagged("/v/a.md", &["Zebra"]),
			make_tagged("/v/b.md", &["alpha"]),
			make_tagged("/v/c.md", &["Mango"]),
		]);
		let all = idx.all_tags();
		assert_eq!(
			all.iter().map(|t| t.name.as_str()).collect::<Vec<_>>(),
			vec!["alpha", "Mango", "Zebra"]
		);
	}

	#[test]
	fn update_entry_diffs_tags() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_tagged("/v/a.md", &["old1", "old2"])]);
		assert_eq!(idx.notes_with_tag("old1"), vec!["/v/a.md"]);
		assert_eq!(idx.notes_with_tag("old2"), vec!["/v/a.md"]);

		idx.update_entry(make_tagged("/v/a.md", &["old1", "new1"]));
		assert_eq!(idx.notes_with_tag("old1"), vec!["/v/a.md"]);
		assert!(idx.notes_with_tag("old2").is_empty());
		assert_eq!(idx.notes_with_tag("new1"), vec!["/v/a.md"]);
	}

	#[test]
	fn update_entry_cleans_up_empty_tag_sets() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_tagged("/v/a.md", &["solo"])]);
		assert_eq!(idx.all_tags().len(), 1);

		idx.update_entry(make_tagged("/v/a.md", &[]));
		assert!(idx.all_tags().is_empty());
	}

	#[test]
	fn update_entry_insert_with_new_tag_registers_display() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_tagged("/v/a.md", &["Alpha"])]);
		idx.update_entry(make_tagged("/v/b.md", &["alpha"]));
		let all = idx.all_tags();
		assert_eq!(all.len(), 1);
		assert_eq!(all[0].name, "Alpha"); // first-occurrence casing preserved across updates
		assert_eq!(all[0].count, 2);
	}

	#[test]
	fn build_rebuilds_tag_index_from_scratch() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_tagged("/v/a.md", &["old"])]);
		assert_eq!(idx.notes_with_tag("old"), vec!["/v/a.md"]);

		// Rebuild with different entries — old tags must be cleared.
		idx.build(vec![make_tagged("/v/b.md", &["new"])]);
		assert!(idx.notes_with_tag("old").is_empty());
		assert_eq!(idx.notes_with_tag("new"), vec!["/v/b.md"]);
	}

	// --- properties ---

	fn make_frontmatter(path: &str, pairs: &[(&str, Value)]) -> NoteEntry {
		let mut fm = HashMap::new();
		for (k, v) in pairs {
			fm.insert(k.to_string(), v.clone());
		}
		NoteEntry {
			path: path.to_string(),
			frontmatter: fm,
			..Default::default()
		}
	}

	#[test]
	fn notes_with_property_scalar_match() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_frontmatter("/v/a.md", &[("status", Value::String("done".into()))]),
			make_frontmatter("/v/b.md", &[("status", Value::String("active".into()))]),
			make_frontmatter("/v/c.md", &[("status", Value::String("done".into()))]),
		]);
		let mut done = idx.notes_with_property("status", "done");
		done.sort();
		assert_eq!(done, vec!["/v/a.md", "/v/c.md"]);
		assert_eq!(idx.notes_with_property("status", "active"), vec!["/v/b.md"]);
		assert!(idx.notes_with_property("status", "missing").is_empty());
	}

	#[test]
	fn notes_with_property_number_values() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_frontmatter("/v/a.md", &[("priority", Value::Number(3i64.into()))]),
			make_frontmatter("/v/b.md", &[("priority", Value::Number(1i64.into()))]),
		]);
		assert_eq!(idx.notes_with_property("priority", "3"), vec!["/v/a.md"]);
		assert_eq!(idx.notes_with_property("priority", "1"), vec!["/v/b.md"]);
	}

	#[test]
	fn notes_with_property_bool_and_null() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_frontmatter("/v/a.md", &[("draft", Value::Bool(true))]),
			make_frontmatter("/v/b.md", &[("draft", Value::Bool(false))]),
			make_frontmatter("/v/c.md", &[("draft", Value::Null)]),
		]);
		assert_eq!(idx.notes_with_property("draft", "true"), vec!["/v/a.md"]);
		assert_eq!(idx.notes_with_property("draft", "false"), vec!["/v/b.md"]);
		assert_eq!(idx.notes_with_property("draft", "null"), vec!["/v/c.md"]);
	}

	#[test]
	fn notes_with_property_array_explodes() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_frontmatter(
			"/v/a.md",
			&[(
				"labels",
				Value::Array(vec![
					Value::String("alpha".into()),
					Value::String("beta".into()),
				]),
			)],
		)]);
		assert_eq!(idx.notes_with_property("labels", "alpha"), vec!["/v/a.md"]);
		assert_eq!(idx.notes_with_property("labels", "beta"), vec!["/v/a.md"]);
		assert!(idx.notes_with_property("labels", "gamma").is_empty());
	}

	#[test]
	fn notes_with_property_object_values_skipped() {
		let mut idx = VaultIndex::new();
		let mut nested = serde_json::Map::new();
		nested.insert("host".into(), Value::String("localhost".into()));
		idx.build(vec![make_frontmatter(
			"/v/a.md",
			&[("config", Value::Object(nested))],
		)]);
		// Objects don't canonicalise, so no key is registered.
		assert!(idx.notes_with_property("config", "localhost").is_empty());
		assert!(idx.property_values("config").is_empty());
	}

	#[test]
	fn property_values_lists_distinct_sorted() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_frontmatter("/v/a.md", &[("status", Value::String("done".into()))]),
			make_frontmatter("/v/b.md", &[("status", Value::String("active".into()))]),
			make_frontmatter("/v/c.md", &[("status", Value::String("done".into()))]),
			make_frontmatter("/v/d.md", &[("status", Value::String("waiting".into()))]),
		]);
		assert_eq!(idx.property_values("status"), vec!["active", "done", "waiting"]);
	}

	#[test]
	fn note_properties_returns_frontmatter() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_frontmatter(
			"/v/a.md",
			&[
				("status", Value::String("done".into())),
				("priority", Value::Number(3i64.into())),
			],
		)]);
		let fm = idx.note_properties("/v/a.md");
		assert_eq!(fm.get("status"), Some(&Value::String("done".into())));
		assert_eq!(fm.get("priority"), Some(&Value::Number(3i64.into())));
		assert!(idx.note_properties("/v/unknown.md").is_empty());
	}

	#[test]
	fn update_entry_diffs_properties() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_frontmatter(
			"/v/a.md",
			&[("status", Value::String("active".into()))],
		)]);
		assert_eq!(idx.notes_with_property("status", "active"), vec!["/v/a.md"]);

		idx.update_entry(make_frontmatter(
			"/v/a.md",
			&[("status", Value::String("done".into()))],
		));
		assert!(idx.notes_with_property("status", "active").is_empty());
		assert_eq!(idx.notes_with_property("status", "done"), vec!["/v/a.md"]);
	}

	#[test]
	fn update_entry_cleans_up_empty_property_sets() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_frontmatter(
			"/v/a.md",
			&[("status", Value::String("only".into()))],
		)]);
		assert_eq!(idx.property_values("status"), vec!["only"]);

		idx.update_entry(make_frontmatter("/v/a.md", &[]));
		assert!(idx.property_values("status").is_empty());
	}

	#[test]
	fn update_entry_array_property_diffs_per_element() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_frontmatter(
			"/v/a.md",
			&[(
				"labels",
				Value::Array(vec![
					Value::String("alpha".into()),
					Value::String("beta".into()),
				]),
			)],
		)]);
		assert_eq!(idx.notes_with_property("labels", "alpha"), vec!["/v/a.md"]);

		idx.update_entry(make_frontmatter(
			"/v/a.md",
			&[(
				"labels",
				Value::Array(vec![
					Value::String("beta".into()),
					Value::String("gamma".into()),
				]),
			)],
		));
		// alpha dropped, beta retained, gamma added.
		assert!(idx.notes_with_property("labels", "alpha").is_empty());
		assert_eq!(idx.notes_with_property("labels", "beta"), vec!["/v/a.md"]);
		assert_eq!(idx.notes_with_property("labels", "gamma"), vec!["/v/a.md"]);
	}

	#[test]
	fn build_rebuilds_property_index_from_scratch() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_frontmatter(
			"/v/a.md",
			&[("old", Value::String("x".into()))],
		)]);
		assert_eq!(idx.property_values("old"), vec!["x"]);

		idx.build(vec![make_frontmatter(
			"/v/b.md",
			&[("new", Value::String("y".into()))],
		)]);
		assert!(idx.property_values("old").is_empty());
		assert_eq!(idx.property_values("new"), vec!["y"]);
	}

	// --- outgoing_unlinked_mentions_of ---

	fn make_titled(path: &str) -> NoteEntry {
		NoteEntry {
			path: path.to_string(),
			..Default::default()
		}
	}

	#[test]
	fn outgoing_unlinked_finds_plain_text_mentions() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_titled("/v/source.md"), make_titled("/v/alpha.md")]);
		let body = "We talked about alpha yesterday.";
		let mentions = idx.outgoing_unlinked_mentions_of("/v/source.md", body);
		assert_eq!(mentions.len(), 1);
		assert_eq!(mentions[0].note_name, "alpha");
		assert_eq!(mentions[0].note_path, "/v/alpha.md");
		assert_eq!(mentions[0].count, 1);
	}

	#[test]
	fn outgoing_unlinked_skips_already_linked_targets() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_entry("/v/source.md", &["alpha"]),
			make_titled("/v/alpha.md"),
		]);
		let body = "We talked about alpha and [[alpha]] again.";
		let mentions = idx.outgoing_unlinked_mentions_of("/v/source.md", body);
		// Source already wikilinks to alpha — no unlinked mention reported.
		assert!(mentions.is_empty());
	}

	#[test]
	fn outgoing_unlinked_skips_source_itself() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_titled("/v/source.md")]);
		let body = "I am source talking about source.";
		let mentions = idx.outgoing_unlinked_mentions_of("/v/source.md", body);
		assert!(mentions.is_empty());
	}

	#[test]
	fn outgoing_unlinked_counts_multiple_occurrences() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_titled("/v/source.md"), make_titled("/v/alpha.md")]);
		let body = "alpha once, alpha twice, alpha thrice.";
		let mentions = idx.outgoing_unlinked_mentions_of("/v/source.md", body);
		assert_eq!(mentions.len(), 1);
		assert_eq!(mentions[0].count, 3);
	}

	#[test]
	fn outgoing_unlinked_sorted_by_note_name() {
		let mut idx = VaultIndex::new();
		idx.build(vec![
			make_titled("/v/source.md"),
			make_titled("/v/Zebra.md"),
			make_titled("/v/alpha.md"),
			make_titled("/v/Mango.md"),
		]);
		let body = "zebra, alpha, mango in some order";
		let mentions = idx.outgoing_unlinked_mentions_of("/v/source.md", body);
		assert_eq!(mentions.len(), 3);
		assert_eq!(mentions[0].note_name, "alpha");
		assert_eq!(mentions[1].note_name, "Mango");
		assert_eq!(mentions[2].note_name, "Zebra");
	}

	#[test]
	fn outgoing_unlinked_excludes_wikilink_matches() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_titled("/v/source.md"), make_titled("/v/alpha.md")]);
		// [[alpha]] still counts as "already linked" via outgoing_links on the source.
		// But if we craft a source with NO outgoing_links and put alpha both inside
		// and outside brackets, only the outside one should count.
		let body = "Reading [[alpha]] then alpha plain.";
		let mentions = idx.outgoing_unlinked_mentions_of("/v/source.md", body);
		assert_eq!(mentions.len(), 1);
		assert_eq!(mentions[0].count, 1);
	}

	#[test]
	fn outgoing_unlinked_strips_frontmatter_and_code() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_titled("/v/source.md"), make_titled("/v/alpha.md")]);
		let body = "---\nrelated: alpha\n---\n```\nalpha\n```\nOnly this alpha counts.";
		let mentions = idx.outgoing_unlinked_mentions_of("/v/source.md", body);
		assert_eq!(mentions.len(), 1);
		assert_eq!(mentions[0].count, 1);
	}

	#[test]
	fn outgoing_unlinked_empty_content() {
		let mut idx = VaultIndex::new();
		idx.build(vec![make_titled("/v/source.md"), make_titled("/v/alpha.md")]);
		assert!(idx.outgoing_unlinked_mentions_of("/v/source.md", "").is_empty());
	}

	#[test]
	fn outgoing_unlinked_unknown_source_still_scans() {
		// An unknown source has no outgoing_links, so nothing is pre-excluded.
		// The scan still finds plain mentions.
		let mut idx = VaultIndex::new();
		idx.build(vec![make_titled("/v/alpha.md"), make_titled("/v/beta.md")]);
		let body = "alpha and beta mentioned.";
		let mentions = idx.outgoing_unlinked_mentions_of("/v/unknown.md", body);
		assert_eq!(mentions.len(), 2);
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
