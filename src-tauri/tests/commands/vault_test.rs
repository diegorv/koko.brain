use kokobrain_lib::commands::vault::{scan_vault, scan_vault_v2};
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

// --- scan_vault_v2 (Phase 1.5) ----------------------------------------------
//
// scan_vault_v2 returns a flat Vec<NoteEntry> for every markdown file under
// the vault, populated by NoteEntry::from_content. The original scan_vault
// is unaffected — these tests live alongside it because they share the
// TempDir + write fixtures.

#[test]
fn v2_empty_vault_returns_empty_vec() {
    let dir = TempDir::new().unwrap();
    let result = scan_vault_v2(dir.path().to_string_lossy().to_string()).unwrap();
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

    let entries = scan_vault_v2(dir.path().to_string_lossy().to_string()).unwrap();
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

    let entries = scan_vault_v2(dir.path().to_string_lossy().to_string()).unwrap();
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

    let entries = scan_vault_v2(dir.path().to_string_lossy().to_string()).unwrap();
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

    let entries = scan_vault_v2(dir.path().to_string_lossy().to_string()).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].title, "public");
}

#[test]
fn v2_invalid_vault_path_returns_error() {
    let result = scan_vault_v2("/nonexistent/vault/path/does/not/exist".to_string());
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

    let result = scan_vault_v2(file.to_string_lossy().to_string());
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

    let entries = scan_vault_v2(dir.path().to_string_lossy().to_string()).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].word_count, 3); // "body one two"
}

#[test]
fn v2_modified_at_is_seconds_since_epoch_and_recent() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("n.md"), "x").unwrap();

    let entries = scan_vault_v2(dir.path().to_string_lossy().to_string()).unwrap();
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

    let entries = scan_vault_v2(dir.path().to_string_lossy().to_string()).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].title, "real");
}
