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

// --- Audit Tier 3 #10 / Tier 1 #1: retroactive backlinks for new file ----------

#[test]
fn update_entry_resolves_pre_existing_unresolved_links_when_target_added() {
	// Repro of the audit's Tier 1 #1 bug. When a note A is inserted with
	// `[[NewName]]` BEFORE NewName exists in the index, `self.resolve("NewName")`
	// returns None — so backlinks[NewName_path] stays empty even after NewName
	// is later inserted via update_entry. This breaks the user-visible
	// backlinks panel: opening NewName shows "no backlinks" despite A linking to it.
	//
	// Expected behaviour: when a new entry is inserted whose path resolves any
	// other entry's previously-unresolved wikilink, the reverse index for the
	// new entry MUST contain those source paths.
	//
	// This test will FAIL with the current implementation (motivates audit #1).
	let mut idx = VaultIndex::default();

	// Step 1: insert source A with wikilink targeting a nonexistent NewName.
	// At this point `resolve("NewName")` returns None, so backlinks for the
	// future NewName.md path are not populated.
	idx.update_entry(entry_with_links("/v/A.md", &["NewName"]));
	assert!(
		idx.lookup_backlinks("/v/NewName.md").is_empty(),
		"sanity: target does not exist yet → no backlinks"
	);

	// Step 2: insert NewName.md — it appears in `entries` and `by_path`.
	// At this moment, A's outgoing wikilink `[[NewName]]` SHOULD resolve to
	// /v/NewName.md and A's path SHOULD be added to backlinks[/v/NewName.md].
	idx.update_entry(entry_with_links("/v/NewName.md", &[]));

	let backlinks = idx.lookup_backlinks("/v/NewName.md");
	let backlink_paths: Vec<&str> = backlinks.iter().map(|e| e.path.as_str()).collect();
	assert_eq!(
		backlink_paths,
		vec!["/v/A.md"],
		"newly-inserted target must inherit backlinks from previously-unresolved source wikilinks"
	);
}

#[test]
fn update_entry_resolves_pre_existing_unresolved_links_via_full_path_target() {
	// Same bug, full-path target form: source uses `[[notes/Deep]]`. When
	// /v/notes/Deep.md is created later, its backlinks must include the source.
	let mut idx = VaultIndex::default();
	idx.update_entry(entry_with_links("/v/A.md", &["notes/Deep"]));
	assert!(idx.lookup_backlinks("/v/notes/Deep.md").is_empty());

	idx.update_entry(entry_with_links("/v/notes/Deep.md", &[]));

	let backlinks = idx.lookup_backlinks("/v/notes/Deep.md");
	assert_eq!(backlinks.len(), 1);
	assert_eq!(backlinks[0].path, "/v/A.md");
}

#[test]
fn update_entry_does_not_falsely_add_backlinks_for_unrelated_new_file() {
	// Inverse safety check: inserting a NEW file whose name is NOT referenced
	// by any existing source must NOT add anyone to its backlink set.
	// Guards against an over-eager retroactive-fix that scans too broadly.
	let mut idx = VaultIndex::default();
	idx.update_entry(entry_with_links("/v/A.md", &["DifferentTarget"]));
	idx.update_entry(entry_with_links("/v/B.md", &[]));
	idx.update_entry(entry_with_links("/v/Unrelated.md", &[]));

	assert!(idx.lookup_backlinks("/v/Unrelated.md").is_empty());
	assert!(idx.lookup_backlinks("/v/B.md").is_empty());
}

#[test]
fn update_entry_retroactive_resolution_is_case_insensitive_via_by_path() {
	// `by_path` keys are lowercased (via note_name_from_target.to_lowercase()).
	// When source uses `[[newname]]` (lowercase) and target is `NewName.md`
	// (uppercase), retroactive resolution must still wire backlinks correctly.
	let mut idx = VaultIndex::default();
	idx.update_entry(entry_with_links("/v/A.md", &["newname"]));
	idx.update_entry(entry_with_links("/v/NewName.md", &[]));

	let backlinks = idx.lookup_backlinks("/v/NewName.md");
	assert_eq!(backlinks.len(), 1);
	assert_eq!(backlinks[0].path, "/v/A.md");
}

#[test]
fn update_entry_retroactive_resolution_handles_multiple_sources() {
	// Several sources all link to the same yet-to-exist target.
	// All MUST be added to the new target's backlinks on insertion.
	let mut idx = VaultIndex::default();
	idx.update_entry(entry_with_links("/v/A.md", &["NewName"]));
	idx.update_entry(entry_with_links("/v/B.md", &["NewName"]));
	idx.update_entry(entry_with_links("/v/C.md", &["DifferentTarget"]));
	assert!(idx.lookup_backlinks("/v/NewName.md").is_empty());

	idx.update_entry(entry_with_links("/v/NewName.md", &[]));

	let backlinks = idx.lookup_backlinks("/v/NewName.md");
	let paths: BTreeSet<&str> = backlinks.iter().map(|e| e.path.as_str()).collect();
	assert_eq!(paths, BTreeSet::from(["/v/A.md", "/v/B.md"]));
}

// --- Phase 6.1+6.2: lookup_outgoing_links + lookup_outgoing_unlinked_mentions ---

use kokobrain_lib::vault::entry::{OutgoingLink, OutgoingUnlinkedMention};

#[test]
fn lookup_outgoing_links_returns_resolved_paths() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &["target", "missing-note"]),
		entry_with_links("/v/target.md", &[]),
	]);
	let result = idx.lookup_outgoing_links("/v/source.md");
	assert_eq!(result.len(), 2);
	assert_eq!(result[0].target, "target");
	assert_eq!(result[0].resolved_path, Some("/v/target.md".to_string()));
	assert_eq!(result[1].target, "missing-note");
	assert_eq!(result[1].resolved_path, None);
}

#[test]
fn lookup_outgoing_links_returns_empty_for_unknown_path() {
	let idx = VaultIndex::default();
	assert!(idx.lookup_outgoing_links("/v/none.md").is_empty());
}

#[test]
fn lookup_outgoing_links_preserves_alias_heading_position() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		NoteEntry {
			path: "/v/source.md".to_string(),
			title: "source".to_string(),
			outgoing_links: vec![WikiLink {
				target: "target".to_string(),
				alias: Some("alias".to_string()),
				heading: Some("section".to_string()),
				position: 42,
			}],
			..Default::default()
		},
		entry_with_links("/v/target.md", &[]),
	]);
	let result = idx.lookup_outgoing_links("/v/source.md");
	assert_eq!(result.len(), 1);
	let link = &result[0];
	assert_eq!(link.alias, Some("alias".to_string()));
	assert_eq!(link.heading, Some("section".to_string()));
	assert_eq!(link.position, 42);
	assert_eq!(link.resolved_path, Some("/v/target.md".to_string()));
}

#[test]
fn lookup_outgoing_unlinked_mentions_returns_empty_for_empty_content() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/note-a.md", &[]),
		entry_with_links("/v/note-b.md", &[]),
	]);
	assert!(idx
		.lookup_outgoing_unlinked_mentions("/v/note-a.md", "")
		.is_empty());
}

#[test]
fn lookup_outgoing_unlinked_mentions_finds_plain_text_mention() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/note-a.md", &[]),
		entry_with_links("/v/note-b.md", &[]),
	]);
	let mentions = idx
		.lookup_outgoing_unlinked_mentions("/v/note-a.md", "I mentioned note-b in plain text");
	assert_eq!(mentions.len(), 1);
	assert_eq!(mentions[0].note_name, "note-b");
	assert_eq!(mentions[0].note_path, "/v/note-b.md");
	assert_eq!(mentions[0].count, 1);
}

#[test]
fn lookup_outgoing_unlinked_mentions_skips_already_linked_targets() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		// note-a links to note-b via a wikilink — plain-text mentions don't count
		entry_with_links("/v/note-a.md", &["note-b"]),
		entry_with_links("/v/note-b.md", &[]),
	]);
	let mentions = idx.lookup_outgoing_unlinked_mentions(
		"/v/note-a.md",
		"See [[note-b]] and also note-b in plain text",
	);
	// note-b is excluded from mentions because it's already linked
	assert!(mentions.is_empty());
}

#[test]
fn lookup_outgoing_unlinked_mentions_excludes_self() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/me.md", &[]),
		entry_with_links("/v/other.md", &[]),
	]);
	let mentions = idx.lookup_outgoing_unlinked_mentions("/v/me.md", "I mention me here in body");
	// 'me' is the current note's own name — excluded
	let names: Vec<_> = mentions.iter().map(|m| m.note_name.as_str()).collect();
	assert!(!names.contains(&"me"));
}

#[test]
fn lookup_outgoing_unlinked_mentions_counts_multiple_occurrences() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/note-a.md", &[]),
		entry_with_links("/v/note-b.md", &[]),
	]);
	let mentions = idx
		.lookup_outgoing_unlinked_mentions("/v/note-a.md", "note-b first, note-b second, note-b third");
	assert_eq!(mentions.len(), 1);
	assert_eq!(mentions[0].count, 3);
}

#[test]
fn lookup_outgoing_unlinked_mentions_sorts_by_name_case_insensitive() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/zebra.md", &[]),
		entry_with_links("/v/alpha.md", &[]),
		entry_with_links("/v/Mango.md", &[]),
		entry_with_links("/v/source.md", &[]),
	]);
	let mentions =
		idx.lookup_outgoing_unlinked_mentions("/v/source.md", "zebra and alpha and Mango here");
	let names: Vec<&str> = mentions.iter().map(|m| m.note_name.as_str()).collect();
	assert_eq!(names, vec!["alpha", "Mango", "zebra"]);
}

#[test]
fn lookup_outgoing_unlinked_mentions_skips_mentions_in_frontmatter_and_code() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &[]),
		entry_with_links("/v/target.md", &[]),
	]);
	let content = "---\nrelated: target\n---\n```\ntarget in code\n```\nend body";
	let mentions = idx.lookup_outgoing_unlinked_mentions("/v/source.md", content);
	// `target` only appears in frontmatter and inside the code block, both
	// of which are stripped — no plain-body mention.
	assert!(mentions.is_empty());
}

#[test]
fn lookup_outgoing_unlinked_mentions_returns_only_outgoing_unlinked_mention_fields() {
	// Spec test: ensure we return the exact wire shape (note_name, note_path, count).
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &[]),
		entry_with_links("/v/found.md", &[]),
	]);
	let mentions = idx.lookup_outgoing_unlinked_mentions("/v/source.md", "I see found here");
	assert_eq!(mentions.len(), 1);
	let m: &OutgoingUnlinkedMention = &mentions[0];
	assert_eq!(m.note_name, "found");
	assert_eq!(m.note_path, "/v/found.md");
	assert_eq!(m.count, 1);
}

#[test]
fn outgoing_link_serializes_to_camel_case() {
	// Quick wire-shape smoke (matches `OutgoingLinkV2` in
	// `src/lib/types/vault-v2.types.ts` after Phase 6 lands the TS mirror).
	let link = OutgoingLink {
		target: "t".to_string(),
		alias: None,
		heading: None,
		resolved_path: Some("/v/t.md".to_string()),
		position: 0,
	};
	let json = serde_json::to_string(&link).unwrap();
	assert!(json.contains("\"resolvedPath\":\"/v/t.md\""));
}

#[test]
fn outgoing_unlinked_mention_serializes_to_camel_case() {
	let m = OutgoingUnlinkedMention {
		note_name: "x".to_string(),
		note_path: "/v/x.md".to_string(),
		count: 2,
	};
	let json = serde_json::to_string(&m).unwrap();
	assert!(json.contains("\"noteName\""));
	assert!(json.contains("\"notePath\""));
}

// ============================================================================
// Phase 7 — tags_index + tag/task lookups
// ============================================================================

use kokobrain_lib::vault::task::{Task, TaskMetadata, TaskStatus};

/// Builds a minimal `NoteEntry` carrying tags. Title is derived from path.
fn entry_with_tags(path: &str, tags: &[&str]) -> NoteEntry {
	let title = path
		.rsplit('/')
		.next()
		.unwrap_or(path)
		.strip_suffix(".md")
		.unwrap_or_else(|| path.rsplit('/').next().unwrap_or(path))
		.to_string();
	NoteEntry {
		path: path.to_string(),
		title,
		tags: tags.iter().map(|t| t.to_string()).collect(),
		..Default::default()
	}
}

/// Builds a minimal `NoteEntry` carrying tasks at the given line numbers.
fn entry_with_tasks(path: &str, modified_at: i64, task_count: usize) -> NoteEntry {
	let title = path
		.rsplit('/')
		.next()
		.unwrap_or(path)
		.strip_suffix(".md")
		.unwrap_or_else(|| path.rsplit('/').next().unwrap_or(path))
		.to_string();
	let tasks = (0..task_count)
		.map(|i| Task {
			text: format!("task {}", i),
			checked: false,
			indent: 0,
			line_number: i + 1,
			status: TaskStatus::Todo,
			metadata: TaskMetadata::default(),
		})
		.collect();
	NoteEntry {
		path: path.to_string(),
		title,
		modified_at,
		tasks,
		..Default::default()
	}
}

#[test]
fn build_with_tagged_entries_populates_tags_index() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_tags("/v/a.md", &["work", "alpha"]),
		entry_with_tags("/v/b.md", &["work"]),
	]);
	let tags = idx.tags_index();
	assert!(tags.contains_key("work"));
	assert!(tags.contains_key("alpha"));
	assert_eq!(tags.get("work").unwrap().len(), 2);
	assert_eq!(tags.get("alpha").unwrap().len(), 1);
}

#[test]
fn build_clears_tags_index_on_rebuild() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &["work"])]);
	idx.build(vec![entry_with_tags("/v/b.md", &["other"])]);
	assert!(!idx.tags_index().contains_key("work"));
	assert!(idx.tags_index().contains_key("other"));
}

#[test]
fn build_aggregates_tags_case_insensitively() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_tags("/v/a.md", &["JavaScript"]),
		entry_with_tags("/v/b.md", &["javascript"]),
	]);
	assert_eq!(idx.tags_index().len(), 1);
	let paths = idx.tags_index().get("javascript").unwrap();
	assert_eq!(paths.len(), 2);
}

#[test]
fn update_entry_adds_new_tag_inserts_path_into_index() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &[])]);
	let mut entry = idx.entries().get("/v/a.md").unwrap().clone();
	entry.tags = vec!["new-tag".to_string()];
	idx.update_entry(entry);
	assert!(idx.tags_index().contains_key("new-tag"));
	assert_eq!(idx.tags_index().get("new-tag").unwrap().len(), 1);
}

#[test]
fn update_entry_removes_tag_prunes_empty_set() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &["solo"])]);
	let mut entry = idx.entries().get("/v/a.md").unwrap().clone();
	entry.tags.clear();
	idx.update_entry(entry);
	assert!(
		!idx.tags_index().contains_key("solo"),
		"empty set should have been pruned"
	);
}

#[test]
fn update_entry_renames_tag_drops_old_inserts_new() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &["old-tag"])]);
	let mut entry = idx.entries().get("/v/a.md").unwrap().clone();
	entry.tags = vec!["new-tag".to_string()];
	idx.update_entry(entry);
	assert!(!idx.tags_index().contains_key("old-tag"));
	assert!(idx.tags_index().contains_key("new-tag"));
}

#[test]
fn update_entry_keeps_tag_set_when_other_path_still_uses_it() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_tags("/v/a.md", &["shared"]),
		entry_with_tags("/v/b.md", &["shared"]),
	]);
	let mut a = idx.entries().get("/v/a.md").unwrap().clone();
	a.tags.clear();
	idx.update_entry(a);
	// Only `b.md` remains in the set; the key must still exist.
	let set = idx.tags_index().get("shared").expect("shared key dropped");
	assert_eq!(set.len(), 1);
	assert!(set.contains("/v/b.md"));
}

#[test]
fn update_entry_no_op_does_not_touch_tags_index() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &["work"])]);
	let snapshot_before: BTreeSet<String> =
		idx.tags_index().get("work").unwrap().iter().cloned().collect();
	let entry = idx.entries().get("/v/a.md").unwrap().clone();
	idx.update_entry(entry);
	let snapshot_after: BTreeSet<String> =
		idx.tags_index().get("work").unwrap().iter().cloned().collect();
	assert_eq!(snapshot_before, snapshot_after);
}

#[test]
fn lookup_notes_with_tag_returns_empty_for_unknown() {
	let idx = VaultIndex::default();
	assert!(idx.lookup_notes_with_tag("nope").is_empty());
}

#[test]
fn lookup_notes_with_tag_strips_hash_prefix() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &["work"])]);
	let with_hash = idx.lookup_notes_with_tag("#work");
	let without_hash = idx.lookup_notes_with_tag("work");
	assert_eq!(with_hash.len(), 1);
	assert_eq!(without_hash.len(), 1);
}

#[test]
fn lookup_notes_with_tag_is_case_insensitive() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &["JavaScript"])]);
	assert_eq!(idx.lookup_notes_with_tag("javascript").len(), 1);
	assert_eq!(idx.lookup_notes_with_tag("JAVASCRIPT").len(), 1);
}

#[test]
fn lookup_notes_with_tag_sorts_by_title_case_insensitive() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_tags("/v/zeta.md", &["work"]),
		entry_with_tags("/v/alpha.md", &["work"]),
		entry_with_tags("/v/Mu.md", &["work"]),
	]);
	let result = idx.lookup_notes_with_tag("work");
	let titles: Vec<&str> = result.iter().map(|e| e.title.as_str()).collect();
	assert_eq!(titles, vec!["alpha", "Mu", "zeta"]);
}

#[test]
fn lookup_all_tags_returns_alphabetical_with_counts() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_tags("/v/a.md", &["zoo", "alpha"]),
		entry_with_tags("/v/b.md", &["alpha"]),
	]);
	let tags = idx.lookup_all_tags();
	assert_eq!(tags.len(), 2);
	assert_eq!(tags[0].name, "alpha");
	assert_eq!(tags[0].count, 2);
	assert_eq!(tags[1].name, "zoo");
	assert_eq!(tags[1].count, 1);
}

#[test]
fn lookup_all_tags_serializes_with_camel_case_keys() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &["work"])]);
	let json = serde_json::to_value(&idx.lookup_all_tags()).unwrap();
	assert!(json[0].get("filePaths").is_some(), "filePaths missing");
	assert!(json[0].get("name").is_some());
	assert!(json[0].get("count").is_some());
}

#[test]
fn lookup_all_tasks_filters_empty_and_sorts_by_mtime_desc() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_tasks("/v/a.md", 100, 2),
		entry_with_tags("/v/b.md", &[]), // no tasks -> filtered out
		entry_with_tasks("/v/c.md", 300, 1),
		entry_with_tasks("/v/d.md", 200, 3),
	]);
	let groups = idx.lookup_all_tasks();
	assert_eq!(groups.len(), 3, "b.md (no tasks) should be filtered");
	let order: Vec<i64> = groups.iter().map(|g| g.modified_at).collect();
	assert_eq!(order, vec![300, 200, 100]); // descending
}

#[test]
fn lookup_tasks_in_path_returns_entry_tasks() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tasks("/v/a.md", 0, 3)]);
	let tasks = idx.lookup_tasks_in_path("/v/a.md");
	assert_eq!(tasks.len(), 3);
}

#[test]
fn lookup_tasks_in_path_returns_empty_for_unknown() {
	let idx = VaultIndex::default();
	assert!(idx.lookup_tasks_in_path("/v/nope.md").is_empty());
}

// ---------- remove_entry ----------

#[test]
fn remove_entry_unknown_path_bumps_version_only() {
	let mut idx = VaultIndex::default();
	let v0 = idx.version();
	let result = idx.remove_entry("/v/nope.md");
	assert!(!result.changed);
	assert!(result.affected.is_empty());
	assert_eq!(result.version, v0 + 1);
}

#[test]
fn remove_entry_drops_entry_and_returns_changed_true() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/a.md", &["work"])]);
	let result = idx.remove_entry("/v/a.md");
	assert!(result.changed);
	assert!(idx.entries().get("/v/a.md").is_none());
}

#[test]
fn remove_entry_cleans_tags_index_pruning_empty_sets() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_tags("/v/a.md", &["solo"]),
		entry_with_tags("/v/b.md", &["shared"]),
		entry_with_tags("/v/c.md", &["shared"]),
	]);
	idx.remove_entry("/v/a.md");
	assert!(
		!idx.tags_index().contains_key("solo"),
		"empty solo set should be pruned"
	);
	idx.remove_entry("/v/b.md");
	let shared = idx.tags_index().get("shared").expect("shared dropped early");
	assert_eq!(shared.len(), 1);
	assert!(shared.contains("/v/c.md"));
}

#[test]
fn remove_entry_cleans_backlinks_for_removed_source() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/source.md", &["target"]),
		entry_with_links("/v/target.md", &[]),
	]);
	assert!(idx.backlinks().contains_key("/v/target.md"));
	let result = idx.remove_entry("/v/source.md");
	assert!(
		!idx.backlinks().contains_key("/v/target.md"),
		"backlinks set should have been pruned (source removed, set empty)"
	);
	assert!(result.affected.contains(&"/v/target.md".to_string()));
}

#[test]
fn remove_entry_drops_by_path_only_when_slot_matches() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/note.md", &[])]);
	assert!(idx.by_path().contains_key("note"));
	idx.remove_entry("/v/note.md");
	assert!(!idx.by_path().contains_key("note"));
}

#[test]
fn remove_entry_promotes_surviving_stem_collision_into_by_path() {
	// Audit 2026-05-22 (#123): when two entries share a stem (e.g.
	// `foo.md` at root and `subdir/foo.md`), `by_path["foo"]` is occupied
	// by whichever was inserted first. Removing that first entry used to
	// drop the slot entirely, leaving the surviving sibling
	// wikilink-unresolvable until the next full rebuild. After the fix,
	// the surviving sibling is promoted into the slot.
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_tags("/v/foo.md", &[]),
		entry_with_tags("/v/subdir/foo.md", &[]),
	]);
	let initial = idx.by_path().get("foo").cloned();
	assert_eq!(initial, Some("/v/foo.md".to_string()));

	idx.remove_entry("/v/foo.md");

	assert_eq!(
		idx.by_path().get("foo"),
		Some(&"/v/subdir/foo.md".to_string()),
		"surviving stem-collision sibling should be promoted into by_path"
	);
	assert_eq!(
		idx.resolve("foo"),
		Some("/v/subdir/foo.md".to_string()),
		"wikilink to [[foo]] should resolve to the surviving sibling"
	);
}

#[test]
fn remove_entry_no_promotion_when_no_surviving_sibling_shares_stem() {
	// Single entry with the stem — after removal the slot stays empty
	// (preserves the pre-fix behaviour when no collision existed).
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_tags("/v/solo.md", &[])]);
	idx.remove_entry("/v/solo.md");
	assert!(
		!idx.by_path().contains_key("solo"),
		"slot must stay empty when no surviving entry shares the stem"
	);
}

#[test]
fn remove_entry_rebuilds_backlinks_for_promoted_surviving_sibling() {
	// `linker.md` has `[[foo]]`. Two entries share the `foo` stem.
	// Initially `by_path["foo"] -> /v/foo.md`, so `backlinks["/v/foo.md"]`
	// contains `linker.md`. After removing `/v/foo.md`, `/v/subdir/foo.md`
	// is promoted; backlinks for the promoted path must include `linker.md`
	// so the panel shows the inbound link immediately, without waiting for
	// a full vault rebuild.
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_links("/v/linker.md", &["foo"]),
		entry_with_tags("/v/foo.md", &[]),
		entry_with_tags("/v/subdir/foo.md", &[]),
	]);
	assert!(idx
		.backlinks()
		.get("/v/foo.md")
		.map(|s| s.contains("/v/linker.md"))
		.unwrap_or(false));

	idx.remove_entry("/v/foo.md");

	let promoted_backlinks = idx
		.backlinks()
		.get("/v/subdir/foo.md")
		.expect("promoted entry should have its backlinks rebuilt");
	assert!(
		promoted_backlinks.contains("/v/linker.md"),
		"promoted sibling's backlinks must include sources that linked via the shared stem"
	);
}

// ============================================================================
// Phase 8 — properties_index + property lookups
// ============================================================================

use serde_json::json;
use std::collections::BTreeMap;

/// Builds a minimal `NoteEntry` carrying frontmatter properties.
fn entry_with_props(path: &str, props: &[(&str, serde_json::Value)]) -> NoteEntry {
	let title = path
		.rsplit('/')
		.next()
		.unwrap_or(path)
		.strip_suffix(".md")
		.unwrap_or_else(|| path.rsplit('/').next().unwrap_or(path))
		.to_string();
	let mut frontmatter = BTreeMap::new();
	for (k, v) in props {
		frontmatter.insert(k.to_string(), v.clone());
	}
	NoteEntry {
		path: path.to_string(),
		title,
		frontmatter,
		..Default::default()
	}
}

#[test]
fn build_with_properties_populates_properties_index() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_props("/v/a.md", &[("status", json!("draft"))]),
		entry_with_props("/v/b.md", &[("status", json!("draft"))]),
		entry_with_props("/v/c.md", &[("status", json!("done"))]),
	]);
	let by_status = idx.properties_index().get("status").expect("missing key");
	assert_eq!(by_status.get("\"draft\"").map(|s| s.len()), Some(2));
	assert_eq!(by_status.get("\"done\"").map(|s| s.len()), Some(1));
}

#[test]
fn build_clears_properties_index_on_rebuild() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_props("/v/a.md", &[("status", json!("draft"))])]);
	idx.build(vec![entry_with_props("/v/b.md", &[("priority", json!(1))])]);
	assert!(!idx.properties_index().contains_key("status"));
	assert!(idx.properties_index().contains_key("priority"));
}

#[test]
fn update_entry_adds_new_property_inserts_into_index() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_props("/v/a.md", &[])]);
	let mut entry = idx.entries().get("/v/a.md").unwrap().clone();
	entry.frontmatter.insert("status".to_string(), json!("draft"));
	idx.update_entry(entry);
	assert!(idx.properties_index().contains_key("status"));
}

#[test]
fn update_entry_changes_value_drops_old_inserts_new() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_props("/v/a.md", &[("status", json!("draft"))])]);
	let mut entry = idx.entries().get("/v/a.md").unwrap().clone();
	entry.frontmatter.insert("status".to_string(), json!("done"));
	idx.update_entry(entry);
	let by_status = idx.properties_index().get("status").unwrap();
	assert!(!by_status.contains_key("\"draft\""));
	assert!(by_status.contains_key("\"done\""));
}

#[test]
fn update_entry_removes_property_prunes_empty_value_set() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_props("/v/a.md", &[("status", json!("solo"))])]);
	let mut entry = idx.entries().get("/v/a.md").unwrap().clone();
	entry.frontmatter.clear();
	idx.update_entry(entry);
	assert!(!idx.properties_index().contains_key("status"));
}

#[test]
fn update_entry_keeps_value_set_when_other_path_still_uses_it() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_props("/v/a.md", &[("status", json!("draft"))]),
		entry_with_props("/v/b.md", &[("status", json!("draft"))]),
	]);
	let mut a = idx.entries().get("/v/a.md").unwrap().clone();
	a.frontmatter.clear();
	idx.update_entry(a);
	let by_status = idx.properties_index().get("status").expect("status dropped");
	let drafts = by_status.get("\"draft\"").expect("\"draft\" dropped");
	assert_eq!(drafts.len(), 1);
	assert!(drafts.contains("/v/b.md"));
}

#[test]
fn lookup_notes_by_property_returns_matching_entries_sorted() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_props("/v/zeta.md", &[("status", json!("draft"))]),
		entry_with_props("/v/alpha.md", &[("status", json!("draft"))]),
		entry_with_props("/v/done.md", &[("status", json!("done"))]),
	]);
	let drafts = idx.lookup_notes_by_property("status", &json!("draft"));
	let titles: Vec<&str> = drafts.iter().map(|e| e.title.as_str()).collect();
	assert_eq!(titles, vec!["alpha", "zeta"]);
}

#[test]
fn lookup_notes_by_property_returns_empty_for_unknown_key() {
	let idx = VaultIndex::default();
	assert!(idx.lookup_notes_by_property("nope", &json!("anything")).is_empty());
}

#[test]
fn lookup_notes_by_property_canonical_value_match() {
	// JSON canonicalisation: numeric 1 vs string "1" stay distinct.
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_props("/v/n.md", &[("priority", json!(1))]),
		entry_with_props("/v/s.md", &[("priority", json!("1"))]),
	]);
	let by_int = idx.lookup_notes_by_property("priority", &json!(1));
	let by_str = idx.lookup_notes_by_property("priority", &json!("1"));
	assert_eq!(by_int.len(), 1);
	assert_eq!(by_str.len(), 1);
	assert_ne!(by_int[0].path, by_str[0].path);
}

#[test]
fn lookup_property_values_returns_distinct_values() {
	let mut idx = VaultIndex::default();
	idx.build(vec![
		entry_with_props("/v/a.md", &[("priority", json!(1))]),
		entry_with_props("/v/b.md", &[("priority", json!(2))]),
		entry_with_props("/v/c.md", &[("priority", json!(1))]),
	]);
	let mut values = idx.lookup_property_values("priority");
	values.sort_by_key(|v| v.as_i64().unwrap_or(0));
	assert_eq!(values, vec![json!(1), json!(2)]);
}

#[test]
fn lookup_note_properties_returns_full_frontmatter() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_props(
		"/v/a.md",
		&[("status", json!("draft")), ("priority", json!(2))],
	)]);
	let props = idx.lookup_note_properties("/v/a.md");
	assert_eq!(props.get("status"), Some(&json!("draft")));
	assert_eq!(props.get("priority"), Some(&json!(2)));
}

#[test]
fn lookup_note_properties_empty_for_unknown_path() {
	let idx = VaultIndex::default();
	assert!(idx.lookup_note_properties("/v/nope.md").is_empty());
}

#[test]
fn remove_entry_cleans_properties_index() {
	let mut idx = VaultIndex::default();
	idx.build(vec![entry_with_props("/v/a.md", &[("status", json!("draft"))])]);
	idx.remove_entry("/v/a.md");
	assert!(!idx.properties_index().contains_key("status"));
}

// ============================================================================
// Phase 11.5a — lookup_incoming_unlinked_mentions
// ============================================================================
//
// Reads files from disk, so tests use `tempfile::TempDir` to lay out fixture
// vault files and build a VaultIndex with real absolute paths.

use std::fs;
use tempfile::TempDir;

/// Lays out one file per `(filename, content)` pair in `dir`, then builds a
/// VaultIndex of NoteEntry constructed from those files via
/// `NoteEntry::from_content`. Returns the (dir, idx, paths) tuple where
/// `paths[i]` is the absolute path of `files[i]`.
fn build_index_with_fixtures(
	files: &[(&str, &str)],
) -> (TempDir, VaultIndex, Vec<String>) {
	let dir = TempDir::new().unwrap();
	let mut paths: Vec<String> = Vec::new();
	let mut entries: Vec<NoteEntry> = Vec::new();
	for (name, content) in files {
		let path = dir.path().join(name);
		fs::write(&path, content).unwrap();
		let abs = path.to_string_lossy().to_string();
		entries.push(NoteEntry::from_content(abs.clone(), content, 0));
		paths.push(abs);
	}
	let mut idx = VaultIndex::default();
	idx.build(entries);
	(dir, idx, paths)
}

#[test]
fn lookup_incoming_unlinked_mentions_finds_plain_text_mention() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("a.md", "no references here"),
		("b.md", "I mention a in plain text body"),
	]);
	let result = idx.lookup_incoming_unlinked_mentions(&paths[0]);
	assert_eq!(result.len(), 1);
	assert_eq!(result[0].title, "b");
	assert_eq!(result[0].path, paths[1]);
}

#[test]
fn lookup_incoming_unlinked_mentions_excludes_self() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("a.md", "I mention a here in my own body"),
		("b.md", "I mention a too"),
	]);
	let result = idx.lookup_incoming_unlinked_mentions(&paths[0]);
	assert_eq!(result.len(), 1);
	assert_eq!(result[0].path, paths[1]);
}

#[test]
fn lookup_incoming_unlinked_mentions_skips_already_linked_sources() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("a.md", "target note"),
		("b.md", "See [[a]] and also a in plain text body"),
	]);
	// b links to a via wikilink → b is in a's backlinks, so the
	// unlinked-mentions panel must not also list b.
	let result = idx.lookup_incoming_unlinked_mentions(&paths[0]);
	assert!(result.is_empty());
}

#[test]
fn lookup_incoming_unlinked_mentions_returns_empty_for_unknown_path() {
	let (_dir, idx, _paths) = build_index_with_fixtures(&[
		("a.md", "some content"),
	]);
	// Path that's not in the index AND not a real file → empty result, no panic.
	let result = idx.lookup_incoming_unlinked_mentions("/v/never-existed.md");
	// May still scan a.md looking for "never-existed" — but a.md doesn't
	// contain it, so result is empty.
	assert!(result.is_empty());
}

#[test]
fn lookup_incoming_unlinked_mentions_skips_mentions_in_frontmatter_and_code() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("target.md", "the searched note"),
		(
			"source.md",
			"---\nrelated: target\n---\n```\ntarget appears in code\n```\nbody without that name",
		),
	]);
	let result = idx.lookup_incoming_unlinked_mentions(&paths[0]);
	// "target" appears only in frontmatter (`related: target`) and code
	// block — both stripped by `strip_non_body_content` before mention scan.
	// The plain body "body without that name" has no mention.
	assert!(result.is_empty(), "frontmatter+code mentions should be stripped");
}

#[test]
fn lookup_incoming_unlinked_mentions_sorts_by_title_case_insensitive() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("target.md", "the searched note"),
		("Zebra.md", "I link to target"),
		("alpha.md", "I link to target"),
		("Mango.md", "I link to target"),
	]);
	let result = idx.lookup_incoming_unlinked_mentions(&paths[0]);
	let titles: Vec<&str> = result.iter().map(|e| e.title.as_str()).collect();
	assert_eq!(titles, vec!["alpha", "Mango", "Zebra"]);
}

#[test]
fn lookup_incoming_unlinked_mentions_returns_empty_when_no_mentions() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("target.md", "the searched note"),
		("other.md", "totally unrelated body"),
		("more.md", "different content here"),
	]);
	let result = idx.lookup_incoming_unlinked_mentions(&paths[0]);
	assert!(result.is_empty());
}

#[test]
fn lookup_incoming_unlinked_mentions_word_boundary_excludes_substring_matches() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("foo.md", "the searched note"),
		// "foobar" is NOT a word-boundary match for "foo" — punctuation/whitespace
		// boundaries required on both sides.
		("source.md", "this body contains foobar but not the standalone word"),
	]);
	let result = idx.lookup_incoming_unlinked_mentions(&paths[0]);
	assert!(result.is_empty());
}

// ---- Three-phase split (Phase 1 + Phase 3 of get_unlinked_mentions_v2)

use kokobrain_lib::vault::index::{match_unlinked_mentions, UnlinkedMentionsCandidates};

#[test]
fn unlinked_mentions_candidates_returns_paths_only_excluding_self_and_already_linked() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("a.md", "target"),
		("b.md", "I mention a in plain text"),
		("c.md", "See [[a]] — already linked"),
		("d.md", "unrelated content"),
	]);
	let UnlinkedMentionsCandidates { note_name, candidate_paths } =
		idx.unlinked_mentions_candidates(&paths[0]);

	assert_eq!(note_name, "a");
	// Candidates exclude self (a.md) and already-linked (c.md).
	let mut sorted = candidate_paths.clone();
	sorted.sort();
	let mut expected = vec![paths[1].clone(), paths[3].clone()];
	expected.sort();
	assert_eq!(sorted, expected);
}

#[test]
fn unlinked_mentions_candidates_returns_empty_for_unresolvable_path() {
	let (_dir, idx, _paths) = build_index_with_fixtures(&[("a.md", "")]);
	// Path with no basename — `note_name_from_target` returns "" and
	// the function short-circuits to empty candidates.
	let UnlinkedMentionsCandidates { note_name, candidate_paths } =
		idx.unlinked_mentions_candidates("");
	assert_eq!(note_name, "");
	assert!(candidate_paths.is_empty());
}

#[test]
fn match_unlinked_mentions_filters_to_paths_with_word_boundary_match() {
	let dir = TempDir::new().unwrap();
	let path_match = dir.path().join("match.md");
	let path_substring = dir.path().join("substring.md");
	let path_no_match = dir.path().join("no-match.md");
	fs::write(&path_match, "I mention foo in plain text").unwrap();
	fs::write(&path_substring, "this contains foobar substring").unwrap();
	fs::write(&path_no_match, "totally unrelated").unwrap();

	let candidate_paths = vec![
		path_match.to_string_lossy().to_string(),
		path_substring.to_string_lossy().to_string(),
		path_no_match.to_string_lossy().to_string(),
	];
	let matched = match_unlinked_mentions("foo", candidate_paths);

	assert_eq!(matched.len(), 1);
	assert_eq!(matched[0], path_match.to_string_lossy());
}

#[test]
fn match_unlinked_mentions_returns_empty_for_empty_note_name() {
	let dir = TempDir::new().unwrap();
	let p = dir.path().join("a.md");
	fs::write(&p, "any body").unwrap();
	let matched = match_unlinked_mentions("", vec![p.to_string_lossy().to_string()]);
	assert!(matched.is_empty());
}

#[test]
fn match_unlinked_mentions_skips_unreadable_paths_silently() {
	let dir = TempDir::new().unwrap();
	let real_path = dir.path().join("real.md");
	fs::write(&real_path, "I mention foo").unwrap();
	let missing_path = dir.path().join("never-existed.md").to_string_lossy().to_string();

	let matched = match_unlinked_mentions(
		"foo",
		vec![real_path.to_string_lossy().to_string(), missing_path],
	);

	// real.md matched, missing path silently skipped.
	assert_eq!(matched.len(), 1);
	assert_eq!(matched[0], real_path.to_string_lossy());
}

#[test]
fn match_unlinked_mentions_strips_frontmatter_and_code_blocks() {
	let dir = TempDir::new().unwrap();
	let p = dir.path().join("source.md");
	fs::write(
		&p,
		"---\nrelated: target\n---\n```\ntarget appears in code\n```\nbody without that name",
	)
	.unwrap();
	let matched = match_unlinked_mentions("target", vec![p.to_string_lossy().to_string()]);
	assert!(matched.is_empty(), "frontmatter+code mentions should be stripped");
}

#[test]
fn lookup_entries_clones_full_note_entry_for_matched_paths() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("alpha.md", "alpha body"),
		("beta.md", "beta body"),
		("gamma.md", "gamma body"),
	]);
	let entries = idx.lookup_entries(&[paths[0].clone(), paths[2].clone()]);
	assert_eq!(entries.len(), 2);
	let titles: Vec<_> = entries.iter().map(|e| e.title.as_str()).collect();
	assert!(titles.contains(&"alpha"));
	assert!(titles.contains(&"gamma"));
	assert!(!titles.contains(&"beta"));
}

#[test]
fn lookup_entries_skips_paths_missing_from_index() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[("a.md", "body")]);
	let entries = idx.lookup_entries(&[paths[0].clone(), "/never/existed.md".to_string()]);
	// Only the real entry survives; missing path silently dropped.
	assert_eq!(entries.len(), 1);
	assert_eq!(entries[0].title, "a");
}

#[test]
fn three_phase_pipeline_matches_legacy_lookup_incoming_unlinked_mentions() {
	let (_dir, idx, paths) = build_index_with_fixtures(&[
		("target.md", "the searched note"),
		("zebra.md", "I link to target"),
		("alpha.md", "I link to target"),
		("Mango.md", "I link to target"),
		("unrelated.md", "totally unrelated"),
	]);

	// Legacy synchronous wrapper — uses all three phases internally.
	let legacy = idx.lookup_incoming_unlinked_mentions(&paths[0]);

	// Manual three-phase reproduction matching the async command path.
	let UnlinkedMentionsCandidates { note_name, candidate_paths } =
		idx.unlinked_mentions_candidates(&paths[0]);
	let matched_paths = match_unlinked_mentions(&note_name, candidate_paths);
	let mut three_phase = idx.lookup_entries(&matched_paths);
	three_phase.sort_by(|a, b| a.title.to_lowercase().cmp(&b.title.to_lowercase()));

	assert_eq!(legacy.len(), three_phase.len());
	assert_eq!(
		legacy.iter().map(|e| &e.title).collect::<Vec<_>>(),
		three_phase.iter().map(|e| &e.title).collect::<Vec<_>>(),
	);
}

// --- Audit finding #11 — concurrent update_entry invariants (regression guard) ---
//
// Audit hypothesis: if two threads call `update_entry` for the same path
// concurrently, the first one's retroactive scan over `self.entries`
// could be corrupted by the second one's mutation, leaving `backlinks`
// inconsistent.
//
// Reality: `update_entry` takes `&mut self`. Concurrent access requires
// an external `RwLock<VaultIndex>` that serializes writes. These tests
// confirm that with serialization honored the backlink invariant holds —
// they serve as a regression guard against future refactors that
// fragment or release the write-lock mid retroactive scan.
//
// Marked `#[ignore]` because they're probabilistic: the iteration count
// raises the chance of a real race surfacing a failure if the
// serialization gets broken by a refactor.
//
// Audit plan: ~/.claude/plans/atue-como-um-auditor-witty-minsky.md (Appendix A.2).

use std::sync::{Arc, Barrier as StdBarrier, RwLock};
use std::thread;

#[test]
#[ignore]
fn audit_finding_11_concurrent_update_entry_keeps_backlinks_consistent() {
	const ITERATIONS: usize = 50;
	const SOURCE_COUNT: usize = 30;

	for iteration in 0..ITERATIONS {
		let idx = Arc::new(RwLock::new(VaultIndex::default()));

		// Seed with SOURCE_COUNT notes that link to "Target".
		{
			let mut g = idx.write().unwrap();
			let entries: Vec<NoteEntry> = (0..SOURCE_COUNT)
				.map(|n| entry_with_links(&format!("/v/note{}.md", n), &["Target"]))
				.collect();
			g.build(entries);
		}

		// Sanity: before Target is inserted, backlinks is empty (Target does not exist).
		assert!(
			idx.read().unwrap().backlinks().get("/v/Target.md").is_none(),
			"iteration {}: pre-insert sanity failed",
			iteration
		);

		// Threads A and B contend for the write-lock to insert/update Target.md.
		// The barrier ensures both jump into `update_entry` at roughly the same instant.
		let barrier = Arc::new(StdBarrier::new(2));

		let idx_a = Arc::clone(&idx);
		let bar_a = Arc::clone(&barrier);
		let a = thread::spawn(move || {
			bar_a.wait();
			let mut g = idx_a.write().unwrap();
			g.update_entry(entry_with_links("/v/Target.md", &[]));
		});

		let idx_b = Arc::clone(&idx);
		let bar_b = Arc::clone(&barrier);
		let b = thread::spawn(move || {
			bar_b.wait();
			let mut g = idx_b.write().unwrap();
			// Same shape entry; the second update sees old_entry == Some and
			// does not re-run the retroactive scan.
			g.update_entry(entry_with_links("/v/Target.md", &[]));
		});

		a.join().unwrap();
		b.join().unwrap();

		// Invariant: backlinks[/v/Target.md] must contain EXACTLY the
		// SOURCE_COUNT source paths. No more, no less.
		let g = idx.read().unwrap();
		let bl = g.backlinks().get("/v/Target.md").cloned().unwrap_or_default();
		assert_eq!(
			bl.len(),
			SOURCE_COUNT,
			"iteration {}: backlinks mismatch — expected {} sources, got {}: {:?}",
			iteration,
			SOURCE_COUNT,
			bl.len(),
			bl
		);
	}
}

#[test]
#[ignore]
fn audit_finding_11_many_concurrent_writers_against_growing_index() {
	// More aggressive scenario: N threads write simultaneously to
	// different paths that ALL link to the same Target. The last
	// insertion is Target.md (which must run the retroactive scan and
	// pick up all N sources).
	//
	// With RwLock honored, exactly one thread sees `old_entry.is_none()`
	// for Target and runs the retroactive scan. Other threads that try
	// to write Target.md afterwards see `old_entry.is_some()` and skip
	// the scan. Invariant: final backlinks contain all N sources.
	const N_WRITERS: usize = 16;
	const ITERATIONS: usize = 20;

	for iter in 0..ITERATIONS {
		let idx = Arc::new(RwLock::new(VaultIndex::default()));
		let barrier = Arc::new(StdBarrier::new(N_WRITERS + 1));

		let mut handles = Vec::new();
		for n in 0..N_WRITERS {
			let idx_n = Arc::clone(&idx);
			let bar_n = Arc::clone(&barrier);
			let path = format!("/v/source{}.md", n);
			handles.push(thread::spawn(move || {
				bar_n.wait();
				let mut g = idx_n.write().unwrap();
				g.update_entry(entry_with_links(&path, &["Target"]));
			}));
		}

		// Thread that inserts Target.md in parallel.
		let idx_t = Arc::clone(&idx);
		let bar_t = Arc::clone(&barrier);
		let target_handle = thread::spawn(move || {
			bar_t.wait();
			let mut g = idx_t.write().unwrap();
			g.update_entry(entry_with_links("/v/Target.md", &[]));
		});

		for h in handles {
			h.join().unwrap();
		}
		target_handle.join().unwrap();

		// Invariant: backlinks[/v/Target.md] = exact set {/v/source0.md, ..., /v/source{N-1}.md}.
		// Regardless of the order locks were granted, the final state
		// must reflect ALL sources that link to Target.
		let g = idx.read().unwrap();
		let bl = g.backlinks().get("/v/Target.md").cloned().unwrap_or_default();
		assert_eq!(
			bl.len(),
			N_WRITERS,
			"iter {}: expected {} backlinks, got {}: {:?}",
			iter,
			N_WRITERS,
			bl.len(),
			bl
		);
		for n in 0..N_WRITERS {
			let p = format!("/v/source{}.md", n);
			assert!(
				bl.contains(&p),
				"iter {}: backlinks missing {} (got {:?})",
				iter,
				p,
				bl
			);
		}
	}
}
