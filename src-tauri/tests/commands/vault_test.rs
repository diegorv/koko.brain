use kokobrain_lib::commands::vault::scan_vault;
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
