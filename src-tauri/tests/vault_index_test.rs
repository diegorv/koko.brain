//! Phase 2.1+ - `VaultIndex` shape and behavior tests.
//!
//! Phase 2.1 covers the struct shape, defaults, and read-only getters.
//! Subsequent phases (2.2 build, 2.5 update_entry) extend this file.

use kokobrain_lib::vault::entry::{NoteEntry, WikiLink};
use kokobrain_lib::vault::index::{UpdateResult, VaultIndex};
use std::collections::BTreeSet;

/// Builds a minimal `NoteEntry` with the given path and outgoing-link
/// targets. Title is derived; everything else is left at defaults.
fn entry_with_links(path: &str, link_targets: &[&str]) -> NoteEntry {
	let title = path
		.rsplit('/')
		.next()
		.unwrap_or(path)
		.strip_suffix(".md")
		.unwrap_or_else(|| path.rsplit('/').next().unwrap_or(path))
		.to_string();
	let outgoing_links = link_targets
		.iter()
		.enumerate()
		.map(|(i, t)| WikiLink {
			target: t.to_string(),
			alias: None,
			heading: None,
			position: i,
		})
		.collect();
	NoteEntry {
		path: path.to_string(),
		title,
		outgoing_links,
		..Default::default()
	}
}

#[test]
fn default_index_is_empty_with_version_zero() {
	let idx = VaultIndex::default();
	assert!(idx.is_empty());
	assert_eq!(idx.len(), 0);
	assert_eq!(idx.version(), 0);
	assert!(idx.entries().is_empty());
	assert!(idx.by_path().is_empty());
	assert!(idx.backlinks().is_empty());
}

#[test]
fn cloned_index_is_independent_of_source() {
	// `Clone` should perform a deep copy; mutating one must not affect the
	// other. The fields are private, but cloning + comparing `len` /
	// `version` snapshots is enough to confirm Clone derives the deep
	// semantics we expect.
	let idx = VaultIndex::default();
	let cloned = idx.clone();
	assert_eq!(idx.len(), cloned.len());
	assert_eq!(idx.version(), cloned.version());
}

#[test]
fn debug_format_does_not_panic_on_empty_index() {
	// Debug derive over private fields must compile and not panic; this is
	// a smoke test that future field additions remain `Debug`-able.
	let idx = VaultIndex::default();
	let formatted = format!("{:?}", idx);
	assert!(!formatted.is_empty());
}

// --- VaultIndex::build (Phase 2.2) ------------------------------------------

#[test]
fn build_with_empty_entries_clears_all_maps_and_bumps_version() {
	let mut idx = VaultIndex::default();
	idx.build(Vec::new());
	assert_eq!(idx.version(), 1);
	assert!(idx.entries().is_empty());
	assert!(idx.by_path().is_empty());
	assert!(idx.backlinks().is_empty());
}

#[test]
fn build_with_one_entry_no_links_populates_by_path_only() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_links("/v/note.md", &[])]);
	assert_eq!(idx.len(), 1);
	assert_eq!(idx.by_path().get("note"), Some(&"/v/note.md".to_string()));
	assert!(idx.backlinks().is_empty());
}

#[test]
fn build_resolves_simple_a_to_b_link() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/a.md", &["b"]),
		entry_with_links("/v/b.md", &[]),
	]);
	assert_eq!(idx.backlinks().len(), 1);
	let sources = idx.backlinks().get("/v/b.md").unwrap();
	assert!(sources.contains("/v/a.md"));
	assert_eq!(sources.len(), 1);
}

#[test]
fn build_resolves_cross_links_in_both_directions() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/a.md", &["b"]),
		entry_with_links("/v/b.md", &["a"]),
	]);
	assert_eq!(
		idx.backlinks().get("/v/a.md").map(|s| s.iter().collect::<Vec<_>>()),
		Some(vec![&"/v/b.md".to_string()]),
	);
	assert_eq!(
		idx.backlinks().get("/v/b.md").map(|s| s.iter().collect::<Vec<_>>()),
		Some(vec![&"/v/a.md".to_string()]),
	);
}

#[test]
fn build_filters_self_links() {
	// A note linking to itself should NOT appear in its own backlinks set.
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_links("/v/a.md", &["a", "a"])]);
	assert!(idx.backlinks().is_empty());
}

#[test]
fn build_drops_unresolved_targets() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_links("/v/a.md", &["nonexistent", "missing-note"])]);
	assert!(idx.backlinks().is_empty());
}

#[test]
fn build_collects_multiple_sources_per_target_in_sorted_order() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/c.md", &["target"]),
		entry_with_links("/v/a.md", &["target"]),
		entry_with_links("/v/b.md", &["target"]),
		entry_with_links("/v/target.md", &[]),
	]);
	let sources = idx.backlinks().get("/v/target.md").unwrap();
	let collected: Vec<&String> = sources.iter().collect();
	// BTreeSet iteration is sorted, so the panel can render a stable order.
	assert_eq!(
		collected,
		vec![&"/v/a.md".to_string(), &"/v/b.md".to_string(), &"/v/c.md".to_string()],
	);
}

#[test]
fn build_dedupes_repeated_link_to_same_target_in_one_note() {
	// `[[b]] then ... [[b]]` in note A should produce ONE entry in
	// backlinks[b], not two — the reverse index is a Set.
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/a.md", &["b", "b", "b"]),
		entry_with_links("/v/b.md", &[]),
	]);
	assert_eq!(idx.backlinks().get("/v/b.md").map(BTreeSet::len), Some(1));
}

#[test]
fn build_first_path_wins_on_stem_collision() {
	// Two markdown files with the same basename in different folders. The
	// resolution cache must keep the first one inserted (matches
	// buildResolutionCache); subsequent entries do not overwrite.
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/area-a/dup.md", &[]),
		entry_with_links("/v/area-b/dup.md", &[]),
		entry_with_links("/v/source.md", &["dup"]),
	]);
	let resolved = idx.by_path().get("dup").cloned();
	assert!(
		resolved == Some("/v/area-a/dup.md".to_string())
			|| resolved == Some("/v/area-b/dup.md".to_string()),
		"resolution cache should hold ONE of the two duplicate stems",
	);
	// Whichever wins, the other does NOT receive the backlink — only the
	// resolved path does.
	assert_eq!(idx.backlinks().len(), 1);
	let backlink_target = idx.backlinks().keys().next().unwrap().clone();
	assert_eq!(backlink_target, resolved.unwrap());
}

#[test]
fn build_uses_basename_fallback_for_path_prefixed_targets() {
	// `[[Daily/2026-04-28]]` should resolve via the basename
	// `2026-04-28` when the full path-prefixed key is absent from
	// the cache. Mirrors `resolveWikilinkCached`'s second branch.
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/2026-04-28.md", &[]),
		entry_with_links("/v/source.md", &["Daily/2026-04-28"]),
	]);
	assert_eq!(
		idx.backlinks().get("/v/2026-04-28.md").map(BTreeSet::len),
		Some(1),
	);
}

#[test]
fn build_strips_extension_in_targets_that_carry_one() {
	// `[[note.md]]` should resolve as if it were `[[note]]`.
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/note.md", &[]),
		entry_with_links("/v/source.md", &["note.md"]),
	]);
	assert_eq!(
		idx.backlinks().get("/v/note.md").map(BTreeSet::len),
		Some(1),
	);
}

#[test]
fn build_target_with_only_heading_uses_target_part_only() {
	// Phase 1.2's parseWikilinks already splits `[[t#h]]` into target='t'
	// and heading='h'. The `target` string is what the index stores; the
	// resolver only sees `t`.
	let mut idx = VaultIndex::default();
	let mut source = entry_with_links("/v/source.md", &[]);
	source.outgoing_links.push(WikiLink {
		target: "target".to_string(),
		alias: None,
		heading: Some("section".to_string()),
		position: 0,
	});
	idx.build(vec![source, entry_with_links("/v/target.md", &[])]);
	assert_eq!(
		idx.backlinks().get("/v/target.md").map(BTreeSet::len),
		Some(1),
	);
}

#[test]
fn build_target_with_alias_uses_target_part_only() {
	let mut idx = VaultIndex::default();
	let mut source = entry_with_links("/v/source.md", &[]);
	source.outgoing_links.push(WikiLink {
		target: "target".to_string(),
		alias: Some("display".to_string()),
		heading: None,
		position: 0,
	});
	idx.build(vec![source, entry_with_links("/v/target.md", &[])]);
	assert_eq!(
		idx.backlinks().get("/v/target.md").map(BTreeSet::len),
		Some(1),
	);
}

#[test]
fn rebuild_replaces_previous_state_and_bumps_version_again() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_links("/v/a.md", &["b"]), entry_with_links("/v/b.md", &[])]);
	assert_eq!(idx.version(), 1);
	assert!(idx.backlinks().contains_key("/v/b.md"));

	// Rebuild with a totally different vault — old state must be gone.
	idx.build(vec![entry_with_links("/v/x.md", &["y"]), entry_with_links("/v/y.md", &[])]);
	assert_eq!(idx.version(), 2);
	assert!(!idx.backlinks().contains_key("/v/b.md"));
	assert!(idx.backlinks().contains_key("/v/y.md"));
	assert!(!idx.by_path().contains_key("a"));
	assert!(idx.by_path().contains_key("x"));
}

#[test]
fn resolve_method_returns_path_for_known_targets_and_none_for_unknown() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/Folder/Note.md", &[]),
		entry_with_links("/v/Other.md", &[]),
	]);
	// Direct lowercase match.
	assert_eq!(idx.resolve("Note"), Some("/v/Folder/Note.md".to_string()));
	assert_eq!(idx.resolve("note"), Some("/v/Folder/Note.md".to_string()));
	// Path-prefixed via basename fallback.
	assert_eq!(idx.resolve("Folder/Note"), Some("/v/Folder/Note.md".to_string()));
	// Unknown target.
	assert_eq!(idx.resolve("DoesNotExist"), None);
	// Empty target.
	assert_eq!(idx.resolve(""), None);
}

// --- VaultIndex::lookup_backlinks (Phase 2.4) -------------------------------

#[test]
fn lookup_backlinks_empty_index_returns_empty() {
	let idx = VaultIndex::default();
	assert!(idx.lookup_backlinks("/v/anything.md").is_empty());
}

#[test]
fn lookup_backlinks_returns_empty_for_target_with_no_inbound_links() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_links("/v/lonely.md", &[])]);
	assert!(idx.lookup_backlinks("/v/lonely.md").is_empty());
}

#[test]
fn lookup_backlinks_returns_single_source_for_single_backlink() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &["target"]),
		entry_with_links("/v/target.md", &[]),
	]);
	let entries = idx.lookup_backlinks("/v/target.md");
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].path, "/v/source.md");
}

#[test]
fn lookup_backlinks_returns_multiple_sources_sorted_by_title_case_insensitive() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/Charlie.md", &["target"]),
		entry_with_links("/v/alpha.md", &["target"]),
		entry_with_links("/v/Bravo.md", &["target"]),
		entry_with_links("/v/target.md", &[]),
	]);
	let entries = idx.lookup_backlinks("/v/target.md");
	let titles: Vec<_> = entries.iter().map(|e| e.title.clone()).collect();
	// Sorted alphabetically, case-insensitively. Stable across runs.
	assert_eq!(titles, vec!["alpha", "Bravo", "Charlie"]);
}

#[test]
fn lookup_backlinks_unknown_path_returns_empty_not_panic() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_links("/v/some.md", &[])]);
	assert!(idx.lookup_backlinks("/v/never-existed.md").is_empty());
}

#[test]
fn lookup_backlinks_returns_full_entries_with_metadata() {
	// Each returned entry must carry the full NoteEntry payload — title,
	// path, etc. — not just the path. The panel renders snippets and
	// other fields, so the v2 surface returns the whole record.
	let mut source = entry_with_links("/v/source.md", &["target"]);
	source.title = "My Source".to_string();
	source.snippet = "preview text".to_string();
	source.tags = vec!["work".to_string()];

	let mut idx = VaultIndex::default();
	idx.build(vec![source, entry_with_links("/v/target.md", &[])]);

	let entries = idx.lookup_backlinks("/v/target.md");
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].title, "My Source");
	assert_eq!(entries[0].snippet, "preview text");
	assert_eq!(entries[0].tags, vec!["work".to_string()]);
}

#[test]
fn lookup_backlinks_preserves_call_site_immutability() {
	// Sanity check: read methods must not bump version. Two consecutive
	// reads should observe the same version. This catches accidental
	// mutations in lookup paths during future refactors.
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &["target"]),
		entry_with_links("/v/target.md", &[]),
	]);
	let v_before = idx.version();
	let _ = idx.lookup_backlinks("/v/target.md");
	let _ = idx.lookup_backlinks("/v/target.md");
	assert_eq!(idx.version(), v_before);
}

// --- VaultIndex::update_entry (Phase 2.5) -----------------------------------

#[test]
fn update_result_serializes_with_camel_case_keys() {
	let result = UpdateResult {
		changed: true,
		affected: vec!["/a.md".to_string(), "/b.md".to_string()],
		version: 7,
	};
	let json = serde_json::to_value(&result).unwrap();
	assert_eq!(json["changed"], true);
	assert_eq!(json["affected"][0], "/a.md");
	assert_eq!(json["affected"][1], "/b.md");
	assert_eq!(json["version"], 7);
	let obj = json.as_object().unwrap();
	for key in obj.keys() {
		assert!(!key.contains('_'), "snake_case key leaked: {}", key);
	}
}

#[test]
fn update_inserts_new_entry_and_reports_changed_with_no_affected() {
	// Brand-new entry with no outgoing links into the empty index.
	// `changed` is true (was None, now Some); `affected` is empty
	// because no resolved-target diff occurred.
	let mut idx = VaultIndex::default();
	let result = idx.update_entry(entry_with_links("/v/note.md", &[]));
	assert!(result.changed);
	assert!(result.affected.is_empty());
	assert_eq!(result.version, 1);
	assert_eq!(idx.len(), 1);
	assert_eq!(idx.by_path().get("note"), Some(&"/v/note.md".to_string()));
}

#[test]
fn update_new_entry_with_resolvable_links_records_affected() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_links("/v/target.md", &[])]);
	let result = idx.update_entry(entry_with_links("/v/source.md", &["target"]));
	assert!(result.changed);
	assert_eq!(result.affected, vec!["/v/target.md".to_string()]);
	assert_eq!(
		idx.backlinks().get("/v/target.md").map(BTreeSet::len),
		Some(1),
	);
}

#[test]
fn update_with_unchanged_entry_reports_not_changed_and_no_affected() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &["target"]),
		entry_with_links("/v/target.md", &[]),
	]);
	let v_before = idx.version();
	// Apply the same source again — same outgoing_links, same everything.
	let result = idx.update_entry(entry_with_links("/v/source.md", &["target"]));
	assert!(!result.changed);
	assert!(result.affected.is_empty());
	// Version still bumps (consumers always see a monotonic signal).
	assert_eq!(result.version, v_before + 1);
}

#[test]
fn update_adding_a_link_records_added_target_in_affected() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &[]),
		entry_with_links("/v/target.md", &[]),
	]);
	let result = idx.update_entry(entry_with_links("/v/source.md", &["target"]));
	assert!(result.changed);
	assert_eq!(result.affected, vec!["/v/target.md".to_string()]);
	assert_eq!(
		idx.backlinks().get("/v/target.md").map(BTreeSet::len),
		Some(1),
	);
}

#[test]
fn update_removing_a_link_records_removed_target_and_prunes_empty_set() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &["target"]),
		entry_with_links("/v/target.md", &[]),
	]);
	assert!(idx.backlinks().contains_key("/v/target.md"));
	let result = idx.update_entry(entry_with_links("/v/source.md", &[]));
	assert!(result.changed);
	assert_eq!(result.affected, vec!["/v/target.md".to_string()]);
	// Once the only source is gone, the empty set is pruned from the map.
	assert!(!idx.backlinks().contains_key("/v/target.md"));
}

#[test]
fn update_swapping_one_link_for_another_reports_both_in_affected_sorted() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &["alpha"]),
		entry_with_links("/v/alpha.md", &[]),
		entry_with_links("/v/beta.md", &[]),
	]);
	let result = idx.update_entry(entry_with_links("/v/source.md", &["beta"]));
	assert!(result.changed);
	// Sorted output: /v/alpha.md (removed), /v/beta.md (added).
	assert_eq!(
		result.affected,
		vec!["/v/alpha.md".to_string(), "/v/beta.md".to_string()],
	);
	assert!(!idx.backlinks().contains_key("/v/alpha.md"));
	assert_eq!(idx.backlinks().get("/v/beta.md").map(BTreeSet::len), Some(1));
}

#[test]
fn update_self_link_is_filtered_in_both_directions() {
	let mut idx = VaultIndex::default();

	// Brand-new entry with a self-link: changed = true (was absent), but
	// the resolved set excludes the self-target so backlinks stays empty.
	let r1 = idx.update_entry(entry_with_links("/v/loner.md", &["loner"]));
	assert!(r1.changed); // new entry
	assert!(r1.affected.is_empty()); // self-link filter prevented any backlink diff
	assert!(idx.backlinks().is_empty());

	// Re-apply the SAME entry: changed = false, affected = empty,
	// backlinks still empty.
	let r2 = idx.update_entry(entry_with_links("/v/loner.md", &["loner"]));
	assert!(!r2.changed);
	assert!(r2.affected.is_empty());
	assert!(idx.backlinks().is_empty());

	// Add a second self-link to a stored entry: outgoing_links shape
	// changes (so changed = true), but affected stays empty because both
	// the old AND new resolve to self.
	let r3 = idx.update_entry(entry_with_links("/v/loner.md", &["loner", "loner"]));
	assert!(r3.changed);
	assert!(r3.affected.is_empty());
	assert!(idx.backlinks().is_empty());
}

#[test]
fn update_unresolved_link_is_dropped_silently() {
	let mut idx = VaultIndex::default();
	idx.update_entry(entry_with_links("/v/source.md", &["nonexistent"]));
	assert!(idx.backlinks().is_empty());
}

#[test]
fn update_keeps_existing_entry_with_same_link_when_only_metadata_changes() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &["target"]),
		entry_with_links("/v/target.md", &[]),
	]);

	let mut updated = entry_with_links("/v/source.md", &["target"]);
	updated.snippet = "fresh snippet".to_string();
	updated.tags = vec!["new-tag".to_string()];

	let result = idx.update_entry(updated);
	// Outgoing didn't shift, so `affected` is empty.
	assert!(result.affected.is_empty());
	// But the entry itself differs (snippet/tags changed) -> changed = true.
	assert!(result.changed);
	// Stored entry now reflects the updated metadata.
	let stored = idx.entries().get("/v/source.md").unwrap();
	assert_eq!(stored.snippet, "fresh snippet");
	assert_eq!(stored.tags, vec!["new-tag".to_string()]);
}

#[test]
fn update_multiple_sources_per_target_dedupes_through_set_semantics() {
	let mut idx = VaultIndex::default();
	idx.update_entry(entry_with_links("/v/target.md", &[]));
	idx.update_entry(entry_with_links("/v/a.md", &["target"]));
	idx.update_entry(entry_with_links("/v/b.md", &["target"]));
	idx.update_entry(entry_with_links("/v/c.md", &["target"]));

	let backlinks = idx.backlinks().get("/v/target.md").unwrap();
	assert_eq!(backlinks.len(), 3);
	let collected: Vec<&String> = backlinks.iter().collect();
	assert_eq!(
		collected,
		vec![
			&"/v/a.md".to_string(),
			&"/v/b.md".to_string(),
			&"/v/c.md".to_string(),
		],
	);
}

#[test]
fn update_bumps_version_monotonically_on_each_call() {
	let mut idx = VaultIndex::default();
	let v0 = idx.version();
	idx.update_entry(entry_with_links("/v/a.md", &[]));
	idx.update_entry(entry_with_links("/v/b.md", &[]));
	idx.update_entry(entry_with_links("/v/a.md", &[])); // no-op
	assert_eq!(idx.version(), v0 + 3);
}

#[test]
fn update_first_path_wins_in_by_path_when_new_entry_collides_on_stem() {
	let mut idx = VaultIndex::default();
	idx.update_entry(entry_with_links("/v/area-a/dup.md", &[]));
	idx.update_entry(entry_with_links("/v/area-b/dup.md", &[]));

	// First wins: by_path stays at the original.
	assert_eq!(
		idx.by_path().get("dup"),
		Some(&"/v/area-a/dup.md".to_string()),
	);
	// Both entries are stored.
	assert_eq!(idx.len(), 2);
}

#[test]
fn update_re_running_on_same_path_does_not_create_phantom_by_path_entries() {
	// Calling update_entry repeatedly on the same path must not duplicate
	// or shift the by_path entry. Regression guard for: if we forgot the
	// `old_entry.is_none()` guard around the by_path insert, repeated
	// updates on a stem-colliding pair would silently flip which path
	// wins.
	let mut idx = VaultIndex::default();
	idx.update_entry(entry_with_links("/v/x/note.md", &[]));
	idx.update_entry(entry_with_links("/v/y/note.md", &[]));
	let original = idx.by_path().get("note").cloned();
	for _ in 0..3 {
		idx.update_entry(entry_with_links("/v/y/note.md", &[]));
	}
	assert_eq!(idx.by_path().get("note").cloned(), original);
}
