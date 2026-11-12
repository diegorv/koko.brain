use kokobrain_lib::commands::search_index::IndexStats;
use kokobrain_lib::commands::vault::{
	collect_v2_entries, ensure_safe_write_path, project_note_record, scan_vault, scan_vault_inner,
	scan_vault_v2_cached_inner, scan_vault_v2_inner, section_task_candidates, tasks_in_section,
	toggle_task_status_inner, update_note_in_index_inner, CachedScanResult, ScanSource,
};
use kokobrain_lib::vault::parsing::extract_tasks_from_section;
use kokobrain_lib::vault::task::{FileTaskGroup, TaskStatus};
use kokobrain_lib::vault::entry::{NoteEntry, RelationshipBacklink, WikiLink};
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::index_cache::{
	cache_file_path, read_snapshot, serialize_snapshot, write_snapshot, write_snapshot_atomic,
	IndexSnapshot, INDEX_SCHEMA_VERSION,
};
use kokobrain_lib::events::VAULT_INDEX_UPDATED_EVENT;
use kokobrain_lib::vault::VaultIndexState;
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::symlink;
use tempfile::TempDir;

#[test]
fn empty_directory_returns_empty_vec() {
    let dir = TempDir::new().unwrap();
    let result = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into());
    assert!(result.is_ok());
    assert!(result.unwrap().is_empty());
}

#[test]
fn single_file_returns_one_node() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "hello").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "note.md");
    assert!(!nodes[0].is_directory);
    assert!(nodes[0].children.is_none());
    assert!(nodes[0].modified_at.is_some());
}

#[tokio::test]
async fn scan_vault_command_returns_tree_from_blocking_worker() {
    let dir = TempDir::new().unwrap();
    fs::create_dir(dir.path().join("sub")).unwrap();
    fs::write(dir.path().join("sub/nested.md"), "nested").unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).await.unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "sub");
    assert_eq!(nodes[0].children.as_ref().unwrap()[0].name, "nested.md");

    let err = scan_vault("/non/existent/path".into(), "name".into()).await;
    assert!(err.is_err());
}

#[test]
fn nested_directories_return_correct_tree() {
    let dir = TempDir::new().unwrap();
    fs::create_dir(dir.path().join("subfolder")).unwrap();
    fs::write(dir.path().join("subfolder/nested.md"), "nested").unwrap();
    fs::write(dir.path().join("root.md"), "root").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();

    // subfolder should come first (directories before files)
    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[0].name, "subfolder");
    assert!(nodes[0].is_directory);

    let children = nodes[0].children.as_ref().unwrap();
    assert_eq!(children.len(), 1);
    assert_eq!(children[0].name, "nested.md");

    assert_eq!(nodes[1].name, "root.md");
    assert!(!nodes[1].is_directory);
}

#[test]
fn hidden_files_are_filtered() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join(".hidden"), "secret").unwrap();
    fs::write(dir.path().join(".DS_Store"), "").unwrap();
    fs::write(dir.path().join("visible.md"), "hello").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "visible.md");
}

#[test]
fn kokobrain_folder_is_excluded() {
    let dir = TempDir::new().unwrap();
    fs::create_dir(dir.path().join(".kokobrain")).unwrap();
    fs::write(dir.path().join(".kokobrain/config.json"), "{}").unwrap();
    fs::write(dir.path().join("note.md"), "hello").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "note.md");
}

#[test]
fn directories_sort_before_files() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a-file.md"), "").unwrap();
    fs::create_dir(dir.path().join("z-folder")).unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 2);
    assert!(nodes[0].is_directory);
    assert_eq!(nodes[0].name, "z-folder");
    assert!(!nodes[1].is_directory);
    assert_eq!(nodes[1].name, "a-file.md");
}

#[test]
fn alphabetical_sort_is_case_insensitive() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("Banana.md"), "").unwrap();
    fs::write(dir.path().join("apple.md"), "").unwrap();
    fs::write(dir.path().join("Cherry.md"), "").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes[0].name, "apple.md");
    assert_eq!(nodes[1].name, "Banana.md");
    assert_eq!(nodes[2].name, "Cherry.md");
}

#[test]
fn name_sort_is_natural_and_case_insensitive() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("Note 10.md"), "").unwrap();
    fs::write(dir.path().join("Note 2.md"), "").unwrap();
    fs::write(dir.path().join("note 1.md"), "").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();
    assert_eq!(names, vec!["note 1.md", "Note 2.md", "Note 10.md"]);
}

#[test]
fn natural_sort_keeps_directories_first() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("Day 1.md"), "").unwrap();
    fs::create_dir(dir.path().join("Day 10")).unwrap();
    fs::create_dir(dir.path().join("Day 9")).unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();
    assert_eq!(names, vec!["Day 9", "Day 10", "Day 1.md"]);
}

#[test]
fn natural_sort_orders_leading_zeros_and_long_numbers() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("v010.md"), "").unwrap();
    fs::write(dir.path().join("v9.md"), "").unwrap();
    fs::write(dir.path().join("v09.md"), "").unwrap();
    fs::write(dir.path().join("v99999999999999999999999.md"), "").unwrap();
    fs::write(dir.path().join("v100000000000000000000000.md"), "").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();
    assert_eq!(
        names,
        vec![
            "v09.md",
            "v9.md",
            "v010.md",
            "v99999999999999999999999.md",
            "v100000000000000000000000.md",
        ]
    );
}

#[test]
fn sort_by_modified_puts_newest_first() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("old.md"), "old").unwrap();
    // small delay to ensure different timestamps
    std::thread::sleep(std::time::Duration::from_millis(50));
    fs::write(dir.path().join("new.md"), "new").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "modified".into()).unwrap();
    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[0].name, "new.md");
    assert_eq!(nodes[1].name, "old.md");
}

#[test]
fn modified_at_is_populated() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "content").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert!(nodes[0].modified_at.is_some());
    assert!(nodes[0].modified_at.unwrap() > 0);
}

#[test]
fn created_at_is_populated() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "content").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert!(nodes[0].created_at.is_some());
    assert!(nodes[0].created_at.unwrap() > 0);
}

#[test]
fn non_existent_path_returns_error() {
    let result = scan_vault_inner("/non/existent/path".into(), "name".into());
    assert!(result.is_err());
}

#[test]
fn deeply_nested_structure() {
    let dir = TempDir::new().unwrap();
    fs::create_dir_all(dir.path().join("a/b/c")).unwrap();
    fs::write(dir.path().join("a/b/c/deep.md"), "deep").unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    let a = &nodes[0];
    assert_eq!(a.name, "a");
    let b = &a.children.as_ref().unwrap()[0];
    assert_eq!(b.name, "b");
    let c = &b.children.as_ref().unwrap()[0];
    assert_eq!(c.name, "c");
    let deep = &c.children.as_ref().unwrap()[0];
    assert_eq!(deep.name, "deep.md");
}

#[test]
fn empty_subdirectories_have_empty_children() {
    let dir = TempDir::new().unwrap();
    fs::create_dir(dir.path().join("empty-folder")).unwrap();

    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert!(nodes[0].is_directory);
    assert!(nodes[0].children.as_ref().unwrap().is_empty());
}

#[test]
fn depth_limit_stops_deep_recursion() {
    let dir = TempDir::new().unwrap();
    // Create 70 levels of nesting (beyond MAX_DEPTH of 64)
    let mut path = dir.path().to_path_buf();
    for i in 0..70 {
        path = path.join(format!("level{}", i));
        fs::create_dir(&path).unwrap();
    }
    fs::write(path.join("deep.md"), "deep content").unwrap();

    // Should not panic (previously would stack overflow on symlink loops)
    let nodes = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();

    // Verify the tree stops at some point — the deepest file shouldn't be reachable
    fn count_max_depth(nodes: &[kokobrain_lib::commands::vault::FileNode], depth: usize) -> usize {
        let mut max = depth;
        for node in nodes {
            if let Some(children) = &node.children {
                max = max.max(count_max_depth(children, depth + 1));
            }
        }
        max
    }
    let max_depth = count_max_depth(&nodes, 0);
    assert!(max_depth <= 64);
}

#[test]
fn rejects_non_existent_path() {
    let result = scan_vault_inner("/non/existent/vault/path".into(), "name".into());
    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Failed to resolve vault path"));
}

#[test]
fn rejects_file_path_as_vault() {
    let dir = TempDir::new().unwrap();
    let file_path = dir.path().join("not-a-dir.md");
    fs::write(&file_path, "content").unwrap();

    let result = scan_vault_inner(file_path.to_string_lossy().to_string(), "name".into());
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not a directory"));
}

#[cfg(unix)]
#[test]
fn canonicalizes_symlinked_vault_path() {
    let real_dir = TempDir::new().unwrap();
    fs::write(real_dir.path().join("note.md"), "hello").unwrap();

    let link_dir = TempDir::new().unwrap();
    let link_path = link_dir.path().join("vault-link");
    symlink(real_dir.path(), &link_path).unwrap();

    // Scanning via symlink should work (canonicalized to real path)
    let nodes = scan_vault_inner(link_path.to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "note.md");
}

#[cfg(unix)]
#[test]
fn scan_vault_skips_unreadable_entry_instead_of_aborting() {
    // Regression (deep-pass #5): a per-entry symlink_metadata failure must
    // skip that entry, not abort the WHOLE tree (mirrors the Err(_) => continue
    // in utils::fs::walk_dir). Pre-fix, scan_dir propagated the error via `?`
    // so one un-stat-able file (e.g. deleted mid-scan) wiped the file explorer.
    //
    // Deterministic repro of a stat failure: a directory with read but NO
    // execute permission — read_dir lists its entries, yet symlink_metadata
    // on each child fails with EACCES (no search permission). Under root the
    // x check is bypassed, so this only exercises the bug as a non-root user
    // (the case CI and dev machines run as); it still asserts Ok either way.
    use std::os::unix::fs::PermissionsExt;
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("visible.md"), "ok").unwrap();
    let locked = dir.path().join("locked");
    fs::create_dir(&locked).unwrap();
    fs::write(locked.join("inner.md"), "hidden").unwrap();
    // r--: read_dir(locked) still lists "inner.md", but stat-ing it fails.
    fs::set_permissions(&locked, fs::Permissions::from_mode(0o400)).unwrap();

    let result = scan_vault_inner(dir.path().to_string_lossy().to_string(), "name".into());

    // Restore perms BEFORE asserting so TempDir's recursive cleanup succeeds
    // even if an assertion below panics.
    fs::set_permissions(&locked, fs::Permissions::from_mode(0o700)).unwrap();

    let nodes = result.expect("one unreadable entry must not abort the whole scan");
    // The valid sibling survives; the unreadable dir yields empty children.
    assert!(nodes.iter().any(|n| n.name == "visible.md"));
}

// --- collect_v2_entries (Phase 1.5 + 2.3) -----------------------------------
//
// `collect_v2_entries` is the pure I/O + parsing path used by both the
// Tauri command `scan_vault_v2` and these tests. It returns a flat
// Vec<NoteEntry> for every markdown file under the vault (populated via
// NoteEntry::from_content). The Tauri command wraps this with a
// VaultIndex.build call against the managed VaultIndexState; that
// integration is exercised through the index's own tests in
// vault_index_test.rs (Phases 2.1-2.5).

#[test]
fn v2_empty_vault_returns_empty_vec() {
    let dir = TempDir::new().unwrap();
    let result = collect_v2_entries(&dir.path().to_string_lossy()).unwrap();
    assert!(result.is_empty());
}

#[test]
fn v2_single_file_populates_entry_fields() {
    let dir = TempDir::new().unwrap();
    let note = dir.path().join("welcome.md");
    fs::write(
        &note,
        "---\ntitle: Welcome\ntags: [intro]\n---\nFirst paragraph with a [[Linked Note]] and #onboarding tag.\n",
    )
    .unwrap();

    let entries = collect_v2_entries(&dir.path().to_string_lossy()).unwrap();
    assert_eq!(entries.len(), 1);

    let e = &entries[0];
    assert_eq!(e.title, "welcome");
    // Path returned is absolute (canonicalized vault root + file).
    assert!(e.path.ends_with("welcome.md"));
    assert!(std::path::Path::new(&e.path).is_absolute());
    assert!(e.modified_at > 0);

    // Frontmatter: title + tags.
    assert_eq!(
        e.frontmatter.get("title"),
        Some(&serde_json::Value::String("Welcome".to_string())),
    );
    assert_eq!(
        e.frontmatter.get("tags"),
        Some(&serde_json::json!(["intro"])),
    );

    // Outgoing links: the wikilink in the body.
    assert_eq!(e.outgoing_links.len(), 1);
    assert_eq!(e.outgoing_links[0].target, "Linked Note");

    // Tags: intro (frontmatter) + onboarding (inline) merged.
    assert_eq!(e.tags, vec!["intro", "onboarding"]);

    // Snippet picks up the lead paragraph.
    assert!(e.snippet.starts_with("First paragraph"));
    assert!(e.snippet.contains("[[Linked Note]]"));
}

#[test]
fn v2_collects_multiple_files_across_subdirectories() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "Alpha").unwrap();
    let sub = dir.path().join("folder/sub");
    fs::create_dir_all(&sub).unwrap();
    fs::write(sub.join("b.md"), "Beta body").unwrap();
    fs::write(dir.path().join("c.markdown"), "Gamma").unwrap();

    let entries = collect_v2_entries(&dir.path().to_string_lossy()).unwrap();
    assert_eq!(entries.len(), 3);

    let titles: Vec<_> = entries.iter().map(|e| e.title.clone()).collect();
    assert!(titles.iter().any(|t| t == "a"));
    assert!(titles.iter().any(|t| t == "b"));
    assert!(titles.iter().any(|t| t == "c"));
}

#[test]
fn v2_skips_non_markdown_files() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "real").unwrap();
    fs::write(dir.path().join("readme.txt"), "ignored").unwrap();
    fs::write(dir.path().join("image.png"), "ignored").unwrap();

    let entries = collect_v2_entries(&dir.path().to_string_lossy()).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].title, "note");
}

#[test]
fn v2_skips_hidden_directories_and_their_contents() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("public.md"), "visible").unwrap();
    let hidden = dir.path().join(".kokobrain");
    fs::create_dir_all(&hidden).unwrap();
    fs::write(hidden.join("internal.md"), "hidden").unwrap();
    let git = dir.path().join(".git/info");
    fs::create_dir_all(&git).unwrap();
    fs::write(git.join("inside-git.md"), "vcs").unwrap();

    let entries = collect_v2_entries(&dir.path().to_string_lossy()).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].title, "public");
}

#[test]
fn v2_invalid_vault_path_returns_error() {
    let result = collect_v2_entries("/nonexistent/vault/path/does/not/exist");
    assert!(result.is_err());
    let err = result.unwrap_err();
    assert!(
        err.contains("Failed to resolve vault path") || err.contains("not a directory"),
        "unexpected error message: {}",
        err,
    );
}

#[test]
fn v2_path_to_a_file_not_a_directory_returns_error() {
    let dir = TempDir::new().unwrap();
    let file = dir.path().join("not-a-vault.md");
    fs::write(&file, "x").unwrap();

    let result = collect_v2_entries(&file.to_string_lossy());
    assert!(result.is_err());
}

#[test]
fn v2_word_count_is_body_scoped() {
    let dir = TempDir::new().unwrap();
    fs::write(
        dir.path().join("n.md"),
        "---\ntitle: heavy\ndescription: lots of frontmatter words here\n---\nbody one two\n",
    )
    .unwrap();

    let entries = collect_v2_entries(&dir.path().to_string_lossy()).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].word_count, 3); // "body one two"
}

#[test]
fn v2_modified_at_is_seconds_since_epoch_and_recent() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("n.md"), "x").unwrap();

    let entries = collect_v2_entries(&dir.path().to_string_lossy()).unwrap();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let mtime = entries[0].modified_at;
    assert!(mtime > 0);
    // Allow a 60s skew to keep the test robust on slow CI.
    assert!((now - mtime).abs() < 60, "mtime drift: now={} mtime={}", now, mtime);
}

#[cfg(unix)]
#[test]
fn v2_skips_symlinked_files_and_dirs() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("real.md"), "real").unwrap();

    let other = TempDir::new().unwrap();
    fs::write(other.path().join("outside.md"), "outside").unwrap();
    symlink(other.path(), dir.path().join("symlink-dir")).unwrap();
    symlink(other.path().join("outside.md"), dir.path().join("symlink-file.md")).unwrap();

    let entries = collect_v2_entries(&dir.path().to_string_lossy()).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].title, "real");
}

// --- update_note_in_index_inner (Phase 2.6) ---------------------------------
//
// `update_note_in_index_inner` is the pure-logic core of the
// `update_note_in_index` Tauri command. The thin Tauri wrapper around it
// reads mtime from disk and emits `vault-index-updated`; both behaviors
// are tested separately here without needing a Tauri AppHandle.

#[test]
fn vault_index_updated_event_constant_matches_frontend_listener_name() {
    // The frontend listens via `listen('vault-index-updated', ...)`. A
    // rename of the constant without the matching frontend update would
    // silently break Phase 3+ panel invalidation, so we lock the literal.
    assert_eq!(VAULT_INDEX_UPDATED_EVENT, "vault-index-updated");
}

#[test]
fn update_inner_inserts_a_new_note_into_the_managed_index() {
    let mut idx = VaultIndex::default();
    let result = update_note_in_index_inner(
        &mut idx,
        "/v/note.md".to_string(),
        "# Heading\n\nSome body content.",
        1714305600,
    );
    assert!(result.changed);
    assert!(result.affected.is_empty());
    assert_eq!(result.version, 1);
    assert_eq!(idx.len(), 1);
    let stored = idx.entries().get("/v/note.md").unwrap();
    assert_eq!(stored.title, "note");
    assert_eq!(stored.modified_at, 1714305600);
}

#[test]
fn update_inner_records_backlink_when_target_is_already_indexed() {
    let mut idx = VaultIndex::default();
    update_note_in_index_inner(&mut idx, "/v/target.md".to_string(), "body", 0);
    let result = update_note_in_index_inner(
        &mut idx,
        "/v/source.md".to_string(),
        "Body with [[target]] link.",
        0,
    );
    assert!(result.changed);
    assert_eq!(result.affected, vec!["/v/target.md".to_string()]);
    let backlinks = idx.backlinks().get("/v/target.md").unwrap();
    assert!(backlinks.contains("/v/source.md"));
}

#[test]
fn update_inner_called_twice_with_same_content_reports_unchanged_second_time() {
    let mut idx = VaultIndex::default();
    let content = "Hello [[target]]";
    update_note_in_index_inner(&mut idx, "/v/target.md".to_string(), "", 0);
    let r1 = update_note_in_index_inner(&mut idx, "/v/source.md".to_string(), content, 0);
    let r2 = update_note_in_index_inner(&mut idx, "/v/source.md".to_string(), content, 0);
    assert!(r1.changed);
    assert!(!r2.changed);
    assert!(r2.affected.is_empty());
    // Versions are still monotonic across both calls.
    assert!(r2.version > r1.version);
}

#[test]
fn update_inner_round_trip_through_save_event_pattern() {
    // Simulates the editor.hooks.ts::notifyAfterSave flow: each save
    // calls update with the post-save content; backlinks shift as the
    // user adds/removes wikilinks across save events.
    let mut idx = VaultIndex::default();
    update_note_in_index_inner(&mut idx, "/v/a.md".to_string(), "", 0);
    update_note_in_index_inner(&mut idx, "/v/b.md".to_string(), "", 0);

    // Save 1: source -> a
    let r1 = update_note_in_index_inner(&mut idx, "/v/source.md".to_string(), "[[a]]", 0);
    assert_eq!(r1.affected, vec!["/v/a.md".to_string()]);

    // Save 2: source switches link to b
    let r2 = update_note_in_index_inner(&mut idx, "/v/source.md".to_string(), "[[b]]", 0);
    assert!(r2.changed);
    assert_eq!(
        r2.affected,
        vec!["/v/a.md".to_string(), "/v/b.md".to_string()],
    );
    // a's backlink set is pruned because no source remains.
    assert!(!idx.backlinks().contains_key("/v/a.md"));
    // b gains the source.
    assert!(idx.backlinks().get("/v/b.md").unwrap().contains("/v/source.md"));
}

#[test]
fn update_inner_indexes_the_new_table_body_with_both_view_keys() {
    // The body the Files navigator's New table writes (`createCollectionFile`):
    // a `.view` is parsed as bare YAML, so both keys reach the frontmatter the
    // Views list and the click rule read.
    let mut idx = VaultIndex::default();
    let body = "_visible: false\n_open_in_editor: true\nviews:\n  - type: table\n    name: All\n";
    let result = update_note_in_index_inner(&mut idx, "/v/Untitled.view".to_string(), body, 0);
    assert!(result.changed);
    let stored = idx.entries().get("/v/Untitled.view").unwrap();
    assert_eq!(stored.frontmatter.get("_visible"), Some(&serde_json::json!(false)));
    assert_eq!(stored.frontmatter.get("_open_in_editor"), Some(&serde_json::json!(true)));
    assert_eq!(stored.title, "Untitled");
    assert!(stored.is_a.is_none());
}

// --- ensure_safe_write_path (path-traversal guard for create_note/folder) ---

#[test]
fn ensure_safe_write_path_rejects_parent_dir_escape() {
    // The audit vector: a `[[../../x]]` wikilink makes the FE build
    // `{vault}/../../x.md`, which would plant a file outside the vault.
    let err = ensure_safe_write_path("/vault/notes/../../../tmp/evil.md").unwrap_err();
    assert!(err.contains(".."), "should reject `..` traversal: {err}");
}

#[test]
fn ensure_safe_write_path_rejects_non_absolute() {
    let err = ensure_safe_write_path("relative/note.md").unwrap_err();
    assert!(err.contains("non-absolute"), "should reject relative paths: {err}");
}

#[test]
fn ensure_safe_write_path_allows_normal_absolute_path() {
    assert!(ensure_safe_write_path("/vault/notes/sub/foo.md").is_ok());
}

#[test]
fn ensure_safe_write_path_allows_literal_dots_in_filename() {
    // `a..b.md` is a single `Normal` component, not a `..` segment — allowed.
    assert!(ensure_safe_write_path("/vault/a..b.md").is_ok());
    assert!(ensure_safe_write_path("/vault/..hidden.md").is_ok());
}

// --- IPC wire-shape contract tests -------------------------------------------
//
// Several registered *_v2 commands have no TS-side consumer test, so a silent
// serde rename would drift the wire shape without any Rust OR TS test failing
// (the audit's "dead-but-registered commands" finding). These tests lock the
// JSON key casing for the return types that lacked a serialization contract
// elsewhere. Already locked elsewhere: NoteEntry + WikiLink (entry.rs inline),
// UpdateResult / OutgoingLink / OutgoingUnlinkedMention / TagAggregate
// (vault_index_test.rs), TaskStatus / TaskPriority / TaskMetadata (task.rs
// inline).

#[test]
fn task_wire_shape_uses_camel_case_line_number() {
    // Realistic Task: parsed from note content through the same path the
    // *_v2 commands use, then serialized as it would cross the IPC boundary.
    let mut idx = VaultIndex::default();
    update_note_in_index_inner(
        &mut idx,
        "/v/tasks.md".to_string(),
        "# T\n\n- [ ] Buy milk #home\n",
        0,
    );
    let task = &idx.entries().get("/v/tasks.md").unwrap().tasks[0];

    let value = serde_json::to_value(task).unwrap();
    assert!(value["text"].as_str().unwrap().contains("Buy milk"));
    assert_eq!(value["checked"], false);
    assert_eq!(value["indent"], 0);
    assert_eq!(value["lineNumber"], 3, "1-based line of the checkbox");
    assert_eq!(value["status"], "todo");
    assert!(value["metadata"].is_object());
    assert!(value.get("line_number").is_none(), "snake_case must not leak");
}

#[test]
fn file_task_group_wire_shape_matches_ts_interface() {
    // get_all_tasks_v2 returns Vec<FileTaskGroup> built by lookup_all_tasks.
    let mut idx = VaultIndex::default();
    update_note_in_index_inner(
        &mut idx,
        "/v/todo.md".to_string(),
        "- [ ] One thing\n",
        1714305600,
    );
    let groups = idx.lookup_all_tasks();
    assert_eq!(groups.len(), 1);

    let value = serde_json::to_value(&groups[0]).unwrap();
    assert_eq!(value["filePath"], "/v/todo.md");
    assert_eq!(value["fileName"], "todo");
    assert_eq!(value["modifiedAt"], 1714305600);
    assert!(value["tasks"].is_array());
    assert_eq!(value["tasks"].as_array().unwrap().len(), 1);
    assert!(value.get("file_path").is_none(), "snake_case must not leak");
}

#[test]
fn toggle_task_result_wire_shape_matches_ts_interface() {
    let tmp = TempDir::new().unwrap();
    let path = tmp.path().join("t.md");
    fs::write(&path, "- [ ] Flip me\n").unwrap();
    let path_str = path.to_string_lossy().to_string();

    let mut idx = VaultIndex::default();
    let result = toggle_task_status_inner(
        &mut idx,
        &path_str,
        1,
        "Flip me",
        TaskStatus::Todo,
        TaskStatus::Done,
    )
    .unwrap();

    let value = serde_json::to_value(&result).unwrap();
    assert_eq!(value["updatedContent"], "- [x] Flip me\n");
    assert_eq!(value["stale"], false);
    let update = &value["updateResult"];
    assert_eq!(update["changed"], true);
    assert!(update["affected"].is_array());
    assert!(update["version"].is_u64());
    assert!(
        value.get("updated_content").is_none(),
        "snake_case must not leak"
    );
}

#[test]
fn note_record_wire_shape_matches_collection_service_contract() {
    // get_all_property_records returns Vec<NoteRecord> via project_note_record.
    let entry = NoteEntry {
        path: "/v/sub/rec.md".to_string(),
        modified_at: 10,
        created_at: 5,
        size: 42,
        ..Default::default()
    };
    let rec = project_note_record(&entry);

    let value = serde_json::to_value(&rec).unwrap();
    for key in [
        "path", "name", "basename", "folder", "ext", "mtime", "ctime", "size", "properties",
    ] {
        assert!(
            value.get(key).is_some(),
            "NoteRecord must expose `{key}` over IPC"
        );
    }
    assert_eq!(value["basename"], "rec");
    assert_eq!(value["ext"], ".md");
    assert_eq!(value["folder"], "/v/sub");
}

#[test]
fn relationship_backlink_wire_shape_matches_ts_interface() {
    let bl = RelationshipBacklink {
        source_path: "/v/a.md".to_string(),
        source_name: "a".to_string(),
        relationship_type: "belongs_to".to_string(),
    };

    let value = serde_json::to_value(&bl).unwrap();
    assert_eq!(value["sourcePath"], "/v/a.md");
    assert_eq!(value["sourceName"], "a");
    assert_eq!(value["relationshipType"], "belongs_to");
    assert!(value.get("source_path").is_none(), "snake_case must not leak");
}

#[test]
fn cached_scan_result_wire_shape_matches_ts_interface() {
    let res = CachedScanResult {
        source: ScanSource::CacheReconciled,
        entry_count: 12,
        load_ms: 34,
        files_reread: 2,
    };

    let value = serde_json::to_value(&res).unwrap();
    assert_eq!(value["source"], "cache_reconciled");
    assert_eq!(value["entryCount"], 12);
    assert_eq!(value["loadMs"], 34);
    assert_eq!(value["filesReread"], 2);
    assert!(value.get("entry_count").is_none(), "snake_case must not leak");
}

#[test]
fn index_stats_wire_shape_matches_ts_interface() {
    let stats = IndexStats {
        total_documents: 3,
        added: 1,
        updated: 2,
        removed: 4,
        unchanged: 5,
    };
    let value = serde_json::to_value(&stats).unwrap();
    assert_eq!(value["totalDocuments"], 3);
    assert_eq!(value["added"], 1);
    assert_eq!(value["updated"], 2);
    assert_eq!(value["removed"], 4);
    assert_eq!(value["unchanged"], 5);
    assert!(
        value.get("total_documents").is_none(),
        "snake_case must not leak"
    );
}

// ---------------------------------------------------------------------------
// scan_vault_v2_inner / scan_vault_v2_cached_inner (audit round 2, Task 1)
// ---------------------------------------------------------------------------
// The Tauri commands are async wrappers that offload to spawn_blocking so
// full-vault scans never run on the IPC thread (same rationale as
// build_search_index in commands/search_index.rs). These tests cover the
// synchronous inner functions against a plain RwLock<VaultIndex>, so no
// tauri::State construction is needed.

#[test]
fn scan_v2_inner_returns_entries_and_builds_index() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "Alpha links [[b]]").unwrap();
    fs::write(dir.path().join("b.md"), "Beta").unwrap();

    let state = VaultIndexState::default();
    let (notes, version) =
        scan_vault_v2_inner(&dir.path().to_string_lossy(), &state).unwrap();

    assert_eq!(notes.len(), 2);
    assert!(version > 0);

    let idx = state.read().unwrap();
    assert_eq!(idx.version(), version);
    let b_path = notes.iter().find(|n| n.title == "b").unwrap().path.clone();
    let backlinks = idx.lookup_backlinks(&b_path);
    assert_eq!(backlinks.len(), 1);
    assert_eq!(backlinks[0].title, "a");
}

/// A vault with `b/foo.md` and same-named decoys under `<dir>/b/`, plus a
/// note linking `[[b/foo.md]]`. Returns the vault path and the linking note.
fn vault_with_path_style_link() -> (TempDir, String) {
    let dir = TempDir::new().unwrap();
    for decoy in ["a", "c", "x", "y", "z"] {
        fs::create_dir_all(dir.path().join(decoy).join("b")).unwrap();
        fs::write(dir.path().join(decoy).join("b").join("foo.md"), "Decoy").unwrap();
    }
    fs::create_dir_all(dir.path().join("b")).unwrap();
    fs::write(dir.path().join("b").join("foo.md"), "Foo").unwrap();
    fs::write(dir.path().join("source.md"), "See [[b/foo.md]]").unwrap();
    let vault = dir.path().to_string_lossy().to_string();
    (dir, vault)
}

/// The resolved target of `source.md`'s only link, relative to the vault.
fn source_link_target(state: &VaultIndexState) -> String {
    let idx = state.read().unwrap();
    let source = idx.entries().keys().find(|p| p.ends_with("/source.md")).unwrap().clone();
    let resolved = idx.lookup_outgoing_links(&source)[0].resolved_path.clone().unwrap();
    let root = source.strip_suffix("/source.md").unwrap();
    resolved.strip_prefix(root).unwrap().to_string()
}

#[test]
fn scans_resolve_a_path_style_link_at_its_vault_relative_path() {
    let (_dir, vault) = vault_with_path_style_link();

    let state = VaultIndexState::default();
    scan_vault_v2_inner(&vault, &state).unwrap();
    assert_eq!(source_link_target(&state), "/b/foo.md");

    let state = VaultIndexState::default();
    let (result, _) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::FullScan);
    assert_eq!(source_link_target(&state), "/b/foo.md");

    let state = VaultIndexState::default();
    let (result, _) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::Cache);
    assert_eq!(source_link_target(&state), "/b/foo.md");
}

#[test]
fn cached_inner_full_scan_on_missing_cache_writes_cache() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "Alpha").unwrap();
    fs::write(dir.path().join("b.md"), "Beta").unwrap();
    let vault = dir.path().to_string_lossy().to_string();

    let state = VaultIndexState::default();
    let (result, version) = scan_vault_v2_cached_inner(&vault, &state).unwrap();

    assert_eq!(result.source, ScanSource::FullScan);
    assert_eq!(result.entry_count, 2);
    assert!(version > 0);
    assert!(
        cache_file_path(&vault).exists(),
        "full scan must write the cache for the next boot"
    );
}

#[test]
fn cached_inner_pure_cache_hit_skips_rereads() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "Alpha").unwrap();
    let vault = dir.path().to_string_lossy().to_string();

    let state = VaultIndexState::default();
    scan_vault_v2_cached_inner(&vault, &state).unwrap(); // full scan, seeds cache

    let (result, version) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::Cache);
    assert_eq!(result.files_reread, 0);
    assert_eq!(result.entry_count, 1);
    assert_eq!(state.read().unwrap().version(), version);
}

#[test]
fn cached_inner_rereads_entries_with_stale_mtime() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "Alpha").unwrap();
    fs::write(dir.path().join("b.md"), "Beta").unwrap();
    let vault = dir.path().to_string_lossy().to_string();

    let state = VaultIndexState::default();
    let (notes, _) = scan_vault_v2_inner(&vault, &state).unwrap();

    // Rewrite the cache with a corrupted mtime + title for a.md so the
    // reconcile pass detects the mismatch and re-reads it from disk.
    let mut stale = notes.clone();
    for e in &mut stale {
        if e.title == "a" {
            e.modified_at = 1;
            e.title = "stale".to_string();
        }
    }
    write_snapshot(&vault, &stale).unwrap();

    let (result, _) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::CacheReconciled);
    assert_eq!(result.files_reread, 1);
    assert_eq!(result.entry_count, 2);

    // The refreshed cache must reflect disk content, not the stale entry.
    let snap = read_snapshot(&vault).unwrap().unwrap();
    let a = snap
        .entries
        .iter()
        .find(|e| e.path.ends_with("/a.md"))
        .unwrap();
    assert_eq!(a.title, "a");
}

/// Writes a snapshot of `entries` with `schema_version` to the vault cache.
fn write_snapshot_with_version(vault: &str, schema_version: u32, entries: Vec<NoteEntry>) {
    let snapshot = IndexSnapshot {
        schema_version,
        vault_path_hash: vault.to_string(),
        written_at_secs: 0,
        entries,
    };
    write_snapshot_atomic(&cache_file_path(vault), &serialize_snapshot(&snapshot).unwrap())
        .unwrap();
}

/// Scans the vault, then replaces a.md's parsed `notes` with the value the
/// subset parser produced (`"|-"`), keeping the real mtime.
fn entries_with_subset_parsed_notes(vault: &str) -> Vec<NoteEntry> {
    let (mut notes, _) = scan_vault_v2_inner(vault, &VaultIndexState::default()).unwrap();
    for e in &mut notes {
        e.frontmatter.insert("notes".to_string(), serde_json::json!("|-"));
    }
    notes
}

#[test]
fn cached_inner_discards_a_schema_3_snapshot_and_reparses() {
    assert_eq!(INDEX_SCHEMA_VERSION, 6);
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "---\nnotes: |-\n  one\n  two\n---\nBody").unwrap();
    let vault = dir.path().to_string_lossy().to_string();
    write_snapshot_with_version(&vault, 3, entries_with_subset_parsed_notes(&vault));

    let state = VaultIndexState::default();
    let (result, _) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::FullScan);

    let snap = read_snapshot(&vault).unwrap().unwrap();
    assert_eq!(snap.schema_version, 6);
    assert_eq!(
        snap.entries[0].frontmatter.get("notes"),
        Some(&serde_json::json!("one\ntwo"))
    );
}

#[test]
fn cached_inner_drops_the_links_a_schema_4_snapshot_kept_for_a_view() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("Foo.md"), "# Foo").unwrap();
    fs::write(dir.path().join("Board.view"), "source: \"[[Foo]]\"\n").unwrap();
    let vault = dir.path().to_string_lossy().to_string();
    // A schema-4 parse gave the view its YAML's links; the mtime still matches.
    let (mut notes, _) = scan_vault_v2_inner(&vault, &VaultIndexState::default()).unwrap();
    for e in notes.iter_mut().filter(|e| e.path.ends_with("Board.view")) {
        e.outgoing_links = vec![WikiLink { target: "Foo".to_string(), ..Default::default() }];
    }
    write_snapshot_with_version(&vault, 4, notes);

    let state = VaultIndexState::default();
    let (result, _) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::FullScan);

    let idx = state.read().unwrap();
    let view = idx
        .entries()
        .values()
        .find(|e| e.path.ends_with("Board.view"))
        .expect("view indexed");
    assert!(view.outgoing_links.is_empty(), "stale links: {:?}", view.outgoing_links);
}

#[test]
fn cached_inner_records_task_headings_a_schema_5_snapshot_lacked() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "## A\n- [ ] t\n").unwrap();
    let vault = dir.path().to_string_lossy().to_string();
    // A schema-5 parse had no headings; the mtime still matches.
    let (mut notes, _) = scan_vault_v2_inner(&vault, &VaultIndexState::default()).unwrap();
    for e in &mut notes {
        e.task_headings.clear();
        for t in &mut e.tasks {
            t.heading = None;
        }
    }
    write_snapshot_with_version(&vault, 5, notes);

    let state = VaultIndexState::default();
    let (result, _) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::FullScan);

    let idx = state.read().unwrap();
    let a = idx.entries().values().next().expect("a.md indexed");
    assert_eq!(a.task_headings.len(), 1);
    assert_eq!(a.tasks[0].heading, Some(0));
}

#[test]
fn cached_inner_reuses_a_current_schema_snapshot_without_reparsing() {
    // Why the version bump matters: at the current version an entry with a
    // matching mtime is served from the cache as-is, never parsed again.
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "---\nnotes: |-\n  one\n  two\n---\nBody").unwrap();
    let vault = dir.path().to_string_lossy().to_string();
    write_snapshot_with_version(&vault, INDEX_SCHEMA_VERSION, entries_with_subset_parsed_notes(&vault));

    let state = VaultIndexState::default();
    let (result, _) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::Cache);
    assert_eq!(result.files_reread, 0);
}

#[test]
fn cached_inner_drops_deleted_files() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "Alpha").unwrap();
    fs::write(dir.path().join("b.md"), "Beta").unwrap();
    let vault = dir.path().to_string_lossy().to_string();

    let state = VaultIndexState::default();
    scan_vault_v2_cached_inner(&vault, &state).unwrap(); // seeds cache with both
    fs::remove_file(dir.path().join("b.md")).unwrap();

    let (result, _) = scan_vault_v2_cached_inner(&vault, &state).unwrap();
    assert_eq!(result.source, ScanSource::CacheReconciled);
    assert_eq!(result.entry_count, 1);
}

/// Writes `content` to `dir/name` and indexes it with `modified_at`.
fn index_note(idx: &mut VaultIndex, dir: &TempDir, name: &str, content: &str, modified_at: i64) -> String {
	let path = dir.path().join(name).to_string_lossy().to_string();
	fs::write(&path, content).unwrap();
	idx.update_entry(NoteEntry::from_content(path.clone(), content, modified_at));
	path
}

#[test]
fn tasks_in_section_reads_only_notes_with_tasks() {
	let dir = TempDir::new().unwrap();
	let mut idx = VaultIndex::default();
	let a = index_note(&mut idx, &dir, "a.md", "## Todo #to-list\n- [ ] buy milk\n", 2);
	index_note(&mut idx, &dir, "b.md", "## Todo #to-list\nno tasks here\n", 1);

	let mut reads: Vec<String> = Vec::new();
	let candidates = section_task_candidates(idx.entries().values());
	let groups = tasks_in_section(candidates, &["#to-list".to_string()], |p| {
		reads.push(p.to_string());
		fs::read_to_string(p)
	});

	assert_eq!(reads, vec![a.clone()]);
	assert_eq!(groups.len(), 1);
	assert_eq!(groups[0].file_path, a);
	assert_eq!(groups[0].tasks[0].text, "buy milk");
}

#[test]
fn tasks_in_section_lists_tasks_under_any_of_several_tags() {
	let dir = TempDir::new().unwrap();
	let mut idx = VaultIndex::default();
	let a = index_note(
		&mut idx,
		&dir,
		"a.md",
		"## A #to-list\n- [ ] a1\n- [ ] a2\n## B #work\n- [ ] b1\n## C\n- [ ] c1\n",
		2,
	);
	let nested = index_note(
		&mut idx,
		&dir,
		"nested.md",
		"# A #to-list\n## B #work\n- [ ] t1\n## C\n- [ ] t2\n## Both #to-list #work\n- [ ] both\n",
		1,
	);

	let mut reads: Vec<String> = Vec::new();
	let section_tags = ["#to-list".to_string(), "#work".to_string()];
	let groups = tasks_in_section(section_task_candidates(idx.entries().values()), &section_tags, |p| {
		reads.push(p.to_string());
		fs::read_to_string(p)
	});

	reads.sort();
	let mut expected_reads = vec![a.clone(), nested.clone()];
	expected_reads.sort();
	assert_eq!(reads, expected_reads);
	let listed: Vec<(String, Vec<String>)> = groups
		.iter()
		.map(|g| (g.file_path.clone(), g.tasks.iter().map(|t| t.text.clone()).collect()))
		.collect();
	assert_eq!(
		listed,
		vec![
			(a, vec!["a1".to_string(), "a2".to_string(), "b1".to_string()]),
			(nested, vec!["t1".to_string(), "t2".to_string(), "both".to_string()]),
		]
	);
}

#[test]
fn tasks_in_section_skips_unreadable_notes() {
	let dir = TempDir::new().unwrap();
	let mut idx = VaultIndex::default();
	let a = index_note(&mut idx, &dir, "a.md", "## Todo #to-list\n- [ ] one\n", 2);
	index_note(&mut idx, &dir, "gone.md", "## Todo #to-list\n- [ ] two\n", 1);
	fs::remove_file(dir.path().join("gone.md")).unwrap();

	let groups = tasks_in_section(section_task_candidates(idx.entries().values()), &["#to-list".to_string()], |p| fs::read_to_string(p));

	assert_eq!(groups.iter().map(|g| g.file_path.clone()).collect::<Vec<_>>(), vec![a]);
}

#[test]
fn tasks_in_section_on_empty_index_returns_empty() {
	let idx = VaultIndex::default();
	let groups = tasks_in_section(section_task_candidates(idx.entries().values()), &["#to-list".to_string()], |p| fs::read_to_string(p));
	assert!(groups.is_empty());
}

#[test]
fn tasks_in_section_matches_the_unfiltered_loop() {
	let dir = TempDir::new().unwrap();
	let mut idx = VaultIndex::default();
	index_note(&mut idx, &dir, "in-section.md", "# Day\n## Todo #to-list\n- [ ] a\n- [x] b\n## Other\n- [ ] c\n", 6);
	index_note(&mut idx, &dir, "outside.md", "## Notes\n- [ ] not listed\n", 5);
	index_note(&mut idx, &dir, "no-tasks.md", "## Todo #to-list\njust text\n", 4);
	index_note(&mut idx, &dir, "fenced.md", "## Todo #to-list\n```\n- [ ] in code\n```\n- [ ] real\n", 3);
	index_note(&mut idx, &dir, "nested.md", "## Todo #to-list\n### Sub\n- [ ] nested\n# Top\n- [ ] after\n", 2);
	index_note(&mut idx, &dir, "bare-tag.md", "## Inbox #to-list-later\n- [ ] prefix match\n", 1);

	for tag in ["#to-list", "to-list", "#missing"] {
		let mut expected: Vec<FileTaskGroup> = Vec::new();
		for entry in idx.entries().values() {
			let content = fs::read_to_string(&entry.path).unwrap();
			let tasks = extract_tasks_from_section(&content, tag);
			if !tasks.is_empty() {
				expected.push(FileTaskGroup {
					file_path: entry.path.clone(),
					file_name: kokobrain_lib::vault::task::display_name(&entry.path),
					modified_at: entry.modified_at,
					tasks,
				});
			}
		}
		expected.sort_by_key(|g| std::cmp::Reverse(g.modified_at));

		let actual = tasks_in_section(section_task_candidates(idx.entries().values()), &[tag.to_string()], |p| fs::read_to_string(p));
		assert_eq!(actual, expected, "tag {tag}");
	}
}
