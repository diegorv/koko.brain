use kokobrain_lib::commands::search::search_vault;
use std::fs;
#[cfg(unix)]
use std::os::unix::fs::symlink;
use tempfile::TempDir;

fn setup_vault() -> TempDir {
    let dir = TempDir::new().unwrap();
    fs::write(
        dir.path().join("note1.md"),
        "Hello world\nThis is a test\nHello again",
    )
    .unwrap();
    fs::write(
        dir.path().join("note2.md"),
        "Another file\nWith different content",
    )
    .unwrap();
    dir
}

#[test]
fn basic_substring_match() {
    let dir = setup_vault();
    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "Hello".into()).unwrap();

    assert_eq!(results.len(), 2); // "Hello world" and "Hello again"

    // Both matches should be in note1
    assert!(results.iter().all(|r| r.file_name == "note1"));
}

#[test]
fn case_insensitive_matching() {
    let dir = setup_vault();
    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "hello".into()).unwrap();

    assert_eq!(results.len(), 2);
}

#[test]
fn empty_query_returns_empty() {
    let dir = setup_vault();
    let results = search_vault(dir.path().to_string_lossy().to_string(), "".into()).unwrap();
    assert!(results.is_empty());
}

#[test]
fn no_matches_returns_empty() {
    let dir = setup_vault();
    let results = search_vault(
        dir.path().to_string_lossy().to_string(),
        "nonexistent".into(),
    )
    .unwrap();
    assert!(results.is_empty());
}

#[test]
fn correct_line_numbers() {
    let dir = setup_vault();
    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "test".into()).unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].line_number, 2); // "This is a test" is line 2
    assert_eq!(results[0].line_content, "This is a test");
}

#[test]
fn correct_match_positions() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("pos.md"), "abc target def").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "target".into()).unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].match_start, 4);
    assert_eq!(results[0].match_end, 10);
}

#[test]
fn only_md_files_searched() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("note.md"), "findme").unwrap();
    fs::write(dir.path().join("note.txt"), "findme").unwrap();
    fs::write(dir.path().join("note.markdown"), "findme").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "findme".into()).unwrap();

    // Should find in .md and .markdown, but not .txt
    assert_eq!(results.len(), 2);
    let file_names: Vec<&str> = results.iter().map(|r| r.file_name.as_str()).collect();
    assert!(file_names.contains(&"note"));
    // .markdown also strips to "note"
}

#[test]
fn hidden_files_excluded() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join(".hidden.md"), "findme").unwrap();
    fs::write(dir.path().join("visible.md"), "findme").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "findme".into()).unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].file_name, "visible");
}

#[test]
fn kokobrain_folder_excluded_from_search() {
    let dir = TempDir::new().unwrap();
    fs::create_dir(dir.path().join(".kokobrain")).unwrap();
    fs::write(dir.path().join(".kokobrain/config.md"), "findme").unwrap();
    fs::write(dir.path().join("visible.md"), "findme").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "findme".into()).unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].file_name, "visible");
}

#[test]
fn searches_recursively_in_subdirs() {
    let dir = TempDir::new().unwrap();
    fs::create_dir(dir.path().join("sub")).unwrap();
    fs::write(dir.path().join("sub/deep.md"), "findme deep").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "findme".into()).unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].file_name, "deep");
}

#[test]
fn multiple_matches_in_same_file() {
    let dir = TempDir::new().unwrap();
    fs::write(
        dir.path().join("multi.md"),
        "apple banana\napple cherry\nbanana apple",
    )
    .unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "apple".into()).unwrap();

    assert_eq!(results.len(), 3);
    assert_eq!(results[0].line_number, 1);
    assert_eq!(results[1].line_number, 2);
    assert_eq!(results[2].line_number, 3);
}

#[test]
fn special_characters_in_query() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("special.md"), "price is $100 (USD)").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "$100".into()).unwrap();
    assert_eq!(results.len(), 1);

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "(USD)".into()).unwrap();
    assert_eq!(results.len(), 1);
}

#[test]
fn non_existent_vault_returns_error() {
    let result = search_vault("/non/existent/vault".into(), "query".into());
    assert!(result.is_err());
}

#[test]
fn file_name_strips_md_extension() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("my-note.md"), "content").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "content".into()).unwrap();

    assert_eq!(results[0].file_name, "my-note");
}

#[test]
fn file_name_strips_markdown_extension() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("my-note.markdown"), "content").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "content".into()).unwrap();

    assert_eq!(results[0].file_name, "my-note");
}

#[test]
fn unicode_content_match_positions_are_char_based() {
    let dir = TempDir::new().unwrap();
    // "café target" — 'é' is multi-byte in UTF-8
    fs::write(dir.path().join("uni.md"), "café target").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "target".into()).unwrap();

    assert_eq!(results.len(), 1);
    // "café " = 5 chars, so "target" starts at char index 5
    assert_eq!(results[0].match_start, 5);
    assert_eq!(results[0].match_end, 11);
}

#[test]
fn emoji_content_match_positions_are_char_based() {
    let dir = TempDir::new().unwrap();
    // '👋' is 4 bytes in UTF-8 but 1 char
    fs::write(dir.path().join("emoji.md"), "Hi 👋 world").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "world".into()).unwrap();

    assert_eq!(results.len(), 1);
    // "Hi 👋 " = 5 chars
    assert_eq!(results[0].match_start, 5);
    assert_eq!(results[0].match_end, 10);
}

#[test]
fn case_insensitive_unicode_search() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("upper.md"), "ÜBER cool").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "über".into()).unwrap();

    assert_eq!(results.len(), 1);
    assert_eq!(results[0].match_start, 0);
    assert_eq!(results[0].match_end, 4);
}

#[test]
fn depth_limit_prevents_deep_recursion() {
    let dir = TempDir::new().unwrap();
    // Create a directory nested 70 levels deep (beyond MAX_DEPTH of 64)
    let mut path = dir.path().to_path_buf();
    for i in 0..70 {
        path = path.join(format!("d{}", i));
        fs::create_dir(&path).unwrap();
    }
    fs::write(path.join("deep.md"), "findme").unwrap();

    let results =
        search_vault(dir.path().to_string_lossy().to_string(), "findme".into()).unwrap();

    // The file should NOT be found because it's beyond the depth limit
    assert!(results.is_empty());
}

#[test]
fn rejects_non_existent_vault_path() {
    let result = search_vault("/non/existent/vault/path".into(), "query".into());
    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("Failed to resolve vault path"));
}

#[test]
fn rejects_file_as_vault_path() {
    let dir = TempDir::new().unwrap();
    let file_path = dir.path().join("not-a-dir.md");
    fs::write(&file_path, "content").unwrap();

    let result = search_vault(file_path.to_string_lossy().to_string(), "content".into());
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not a directory"));
}

#[cfg(unix)]
#[test]
fn canonicalizes_symlinked_vault_path() {
    let real_dir = TempDir::new().unwrap();
    fs::write(real_dir.path().join("note.md"), "findme").unwrap();

    let link_dir = TempDir::new().unwrap();
    let link_path = link_dir.path().join("vault-link");
    symlink(real_dir.path(), &link_path).unwrap();

    let results = search_vault(link_path.to_string_lossy().to_string(), "findme".into()).unwrap();
    assert_eq!(results.len(), 1);
}
