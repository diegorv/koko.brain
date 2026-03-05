use kokobrain_lib::commands::files::read_files_batch;
use std::fs;
use tempfile::TempDir;

#[test]
fn reads_multiple_files_successfully() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("a.md"), "content a").unwrap();
    fs::write(dir.path().join("b.md"), "content b").unwrap();

    let vault = dir.path().to_string_lossy().to_string();
    let paths = vec![
        dir.path().join("a.md").to_string_lossy().to_string(),
        dir.path().join("b.md").to_string_lossy().to_string(),
    ];

    let results = read_files_batch(vault, paths).unwrap();
    assert_eq!(results.len(), 2);
    assert_eq!(results[0].content.as_deref(), Some("content a"));
    assert!(results[0].error.is_none());
    assert_eq!(results[1].content.as_deref(), Some("content b"));
    assert!(results[1].error.is_none());
}

#[test]
fn missing_file_returns_per_result_error() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("exists.md"), "hello").unwrap();

    let vault = dir.path().to_string_lossy().to_string();
    let paths = vec![
        dir.path().join("exists.md").to_string_lossy().to_string(),
        dir.path().join("missing.md").to_string_lossy().to_string(),
    ];

    let results = read_files_batch(vault, paths).unwrap();
    assert_eq!(results.len(), 2);

    // First file succeeds
    assert_eq!(results[0].content.as_deref(), Some("hello"));
    assert!(results[0].error.is_none());

    // Second file has error
    assert!(results[1].content.is_none());
    assert!(results[1].error.is_some());
}

#[test]
fn empty_paths_returns_empty_results() {
    let dir = TempDir::new().unwrap();
    let vault = dir.path().to_string_lossy().to_string();
    let results = read_files_batch(vault, vec![]).unwrap();
    assert!(results.is_empty());
}

#[test]
fn reads_empty_file() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("empty.md"), "").unwrap();

    let vault = dir.path().to_string_lossy().to_string();
    let paths = vec![dir.path().join("empty.md").to_string_lossy().to_string()];
    let results = read_files_batch(vault, paths).unwrap();
    assert_eq!(results[0].content.as_deref(), Some(""));
    assert!(results[0].error.is_none());
}

#[test]
fn reads_file_with_unicode_content() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("unicode.md"), "日本語テスト 🎉").unwrap();

    let vault = dir.path().to_string_lossy().to_string();
    let paths = vec![dir.path().join("unicode.md").to_string_lossy().to_string()];
    let results = read_files_batch(vault, paths).unwrap();
    assert_eq!(results[0].content.as_deref(), Some("日本語テスト 🎉"));
}

#[test]
fn non_utf8_file_returns_error() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("binary.bin"), &[0xFF, 0xFE, 0x00, 0x01]).unwrap();

    let vault = dir.path().to_string_lossy().to_string();
    let paths = vec![dir.path().join("binary.bin").to_string_lossy().to_string()];
    let results = read_files_batch(vault, paths).unwrap();
    assert!(results[0].content.is_none());
    assert!(results[0].error.is_some());
}

#[test]
fn result_paths_match_input_paths() {
    let dir = TempDir::new().unwrap();
    fs::write(dir.path().join("test.md"), "content").unwrap();

    let vault = dir.path().to_string_lossy().to_string();
    let input_path = dir.path().join("test.md").to_string_lossy().to_string();
    let paths = vec![input_path.clone()];
    let results = read_files_batch(vault, paths).unwrap();
    assert_eq!(results[0].path, input_path);
}

#[test]
fn rejects_path_outside_vault() {
    let vault_dir = TempDir::new().unwrap();
    let outside_dir = TempDir::new().unwrap();
    fs::write(outside_dir.path().join("secret.md"), "secret").unwrap();

    let vault = vault_dir.path().to_string_lossy().to_string();
    let paths = vec![outside_dir.path().join("secret.md").to_string_lossy().to_string()];
    let results = read_files_batch(vault, paths).unwrap();
    assert!(results[0].content.is_none());
    assert!(results[0].error.as_deref().unwrap().contains("outside vault"));
}
