use kokobrain_lib::commands::vault::{
	check_content_size_with_limit, collect_v2_entries, scan_vault, update_note_in_index_inner,
	MAX_NOTE_SIZE_BYTES,
};
use kokobrain_lib::vault::index::VaultIndex;
use kokobrain_lib::vault::VAULT_INDEX_UPDATED_EVENT;
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::symlink;
use tempfile::TempDir;

#[test]
fn empty_directory_returns_empty_vec() {
    let dir = TempDir::new().unwrap();
    let result = scan_vault(dir.path().to_string_lossy().to_string(), "name".into());
    assert!(result.is_ok());
    assert!(result.unwrap().is_empty());
}

#[test]
fn single_file_returns_one_node() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "hello").unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "note.md");
    assert!(!nodes[0].is_directory);
    assert!(nodes[0].children.is_none());
    assert!(nodes[0].modified_at.is_some());
}

#[test]
fn nested_directories_return_correct_tree() {
    let dir = TempDir::new().unwrap();
    fs::create_dir(dir.path().join("subfolder")).unwrap();
    fs::write(dir.path().join("subfolder/nested.md"), "nested").unwrap();
    fs::write(dir.path().join("root.md"), "root").unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();

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

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "visible.md");
}

#[test]
fn kokobrain_folder_is_excluded() {
    let dir = TempDir::new().unwrap();
    fs::create_dir(dir.path().join(".kokobrain")).unwrap();
    fs::write(dir.path().join(".kokobrain/config.json"), "{}").unwrap();
    fs::write(dir.path().join("note.md"), "hello").unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "note.md");
}

#[test]
fn directories_sort_before_files() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a-file.md"), "").unwrap();
    fs::create_dir(dir.path().join("z-folder")).unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
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

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes[0].name, "apple.md");
    assert_eq!(nodes[1].name, "Banana.md");
    assert_eq!(nodes[2].name, "Cherry.md");
}

#[test]
fn sort_by_modified_puts_newest_first() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("old.md"), "old").unwrap();
    // small delay to ensure different timestamps
    std::thread::sleep(std::time::Duration::from_millis(50));
    fs::write(dir.path().join("new.md"), "new").unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "modified".into()).unwrap();
    assert_eq!(nodes.len(), 2);
    assert_eq!(nodes[0].name, "new.md");
    assert_eq!(nodes[1].name, "old.md");
}

#[test]
fn modified_at_is_populated() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "content").unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert!(nodes[0].modified_at.is_some());
    assert!(nodes[0].modified_at.unwrap() > 0);
}

#[test]
fn created_at_is_populated() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "content").unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
    assert!(nodes[0].created_at.is_some());
    assert!(nodes[0].created_at.unwrap() > 0);
}

#[test]
fn non_existent_path_returns_error() {
    let result = scan_vault("/non/existent/path".into(), "name".into());
    assert!(result.is_err());
}

#[test]
fn deeply_nested_structure() {
    let dir = TempDir::new().unwrap();
    fs::create_dir_all(dir.path().join("a/b/c")).unwrap();
    fs::write(dir.path().join("a/b/c/deep.md"), "deep").unwrap();

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
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

    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();
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
    let nodes = scan_vault(dir.path().to_string_lossy().to_string(), "name".into()).unwrap();

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
    let result = scan_vault("/non/existent/vault/path".into(), "name".into());
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

    let result = scan_vault(file_path.to_string_lossy().to_string(), "name".into());
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
    let nodes = scan_vault(link_path.to_string_lossy().to_string(), "name".into()).unwrap();
    assert_eq!(nodes.len(), 1);
    assert_eq!(nodes[0].name, "note.md");
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

// --- Audit Tier 1 #4: MAX_NOTE_SIZE bound on update_note_in_index ---

#[test]
fn check_content_size_accepts_normal_content() {
	assert!(check_content_size_with_limit(0, 1024).is_ok());
	assert!(check_content_size_with_limit(1, 1024).is_ok());
	assert!(check_content_size_with_limit(512, 1024).is_ok());
	assert!(check_content_size_with_limit(1024, 1024).is_ok());
}

#[test]
fn check_content_size_rejects_oversized() {
	let err = check_content_size_with_limit(1025, 1024).unwrap_err();
	assert!(err.contains("too large"));
	assert!(err.contains("1025"));
	assert!(err.contains("1024"));
}

#[test]
fn check_content_size_at_zero_limit_rejects_any_nonempty() {
	assert!(check_content_size_with_limit(0, 0).is_ok());
	assert!(check_content_size_with_limit(1, 0).is_err());
}

#[test]
fn check_content_size_far_above_threshold_includes_actual_size_in_message() {
	// Sanity-check: error message surfaces both the actual size and the
	// limit so the TS callsite or a user can debug.
	let err = check_content_size_with_limit(2_000_000, 1_000).unwrap_err();
	assert!(err.contains("2000000"));
	assert!(err.contains("1000"));
}

#[test]
fn max_note_size_constant_is_100_mb() {
	// Lock the constant so future changes are intentional. 100 MB matches
	// the documented design ceiling — typical notes are 1-10 KB; we want
	// to reject buggy/malicious 1 GB payloads, not legitimate ones.
	assert_eq!(MAX_NOTE_SIZE_BYTES, 100 * 1024 * 1024);
}
