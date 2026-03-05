use kokobrain_lib::commands::search_index;
use kokobrain_lib::db;
use kokobrain_lib::search::fuzzy;
use std::fs;
use std::sync::Mutex;
use tempfile::TempDir;

/// Tests share the global DB static, so they must run serially.
static TEST_LOCK: Mutex<()> = Mutex::new(());

/// Creates a temp vault with sample markdown files and opens the DB.
fn setup_vault() -> TempDir {
	let tmp = TempDir::new().unwrap();

	// Create markdown files
	fs::write(
		tmp.path().join("hello.md"),
		"---\ntags:\n  - greeting\n  - english\n---\n# Hello World\n\nThis is a test document about greetings.\n\n## Sub heading\n\nMore content here with #inline-tag.\n",
	)
	.unwrap();

	fs::write(
		tmp.path().join("rust.md"),
		"# Rust Programming\n\nRust is a systems programming language focused on safety.\n\n## Memory Safety\n\nRust prevents null pointer dereferences and data races.\n",
	)
	.unwrap();

	fs::create_dir_all(tmp.path().join("subfolder")).unwrap();
	fs::write(
		tmp.path().join("subfolder").join("nested.md"),
		"# Nested Note\n\nThis is a nested note in a subfolder.\n\n#project #important\n",
	)
	.unwrap();

	fs::write(
		tmp.path().join("javascript.md"),
		"# JavaScript Guide\n\nJavaScript is a dynamic programming language.\n\n## Functions\n\nArrow functions are concise.\n",
	)
	.unwrap();

	// Hidden files should be skipped
	fs::create_dir_all(tmp.path().join(".kokobrain")).unwrap();
	fs::write(
		tmp.path().join(".kokobrain").join("internal.md"),
		"Internal note — should not be indexed.\n",
	)
	.unwrap();

	db::open_database(tmp.path()).unwrap();
	tmp
}

fn teardown() {
	let _ = db::close_database();
}

// --- FTS5 Index Tests ---

#[test]
fn build_search_index_indexes_markdown_files() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();

	let stats =
		search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();
	assert_eq!(stats.total_documents, 4, "should index 4 markdown files");

	teardown();
}

#[test]
fn build_search_index_skips_hidden_directories() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();

	let stats =
		search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	// Search for content from the hidden file
	let results = search_index::search_fts("Internal".to_string(), Some(10), Some(false)).unwrap();
	assert!(
		results.is_empty(),
		"hidden directory files should not be indexed"
	);
	assert_eq!(stats.total_documents, 4);

	teardown();
}

#[test]
fn search_fts_finds_matching_content() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	let results = search_index::search_fts("programming".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "should find documents with 'programming'");

	// Both rust.md and javascript.md mention "programming"
	let paths: Vec<&str> = results.iter().map(|r| r.path.as_str()).collect();
	assert!(paths.contains(&"rust.md"), "should find rust.md");
	assert!(paths.contains(&"javascript.md"), "should find javascript.md");

	teardown();
}

#[test]
fn search_fts_returns_empty_for_no_match() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	let results =
		search_index::search_fts("xyznonexistent".to_string(), Some(10), Some(false)).unwrap();
	assert!(results.is_empty(), "should return empty for no match");

	teardown();
}

#[test]
fn search_fts_returns_empty_for_empty_query() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	let results = search_index::search_fts("".to_string(), Some(10), Some(false)).unwrap();
	assert!(results.is_empty(), "should return empty for empty query");

	let results = search_index::search_fts("   ".to_string(), Some(10), Some(false)).unwrap();
	assert!(
		results.is_empty(),
		"should return empty for whitespace query"
	);

	teardown();
}

#[test]
fn search_fts_bm25_ranks_title_matches_higher() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	// "rust" appears in title of rust.md but only in content of others (if at all)
	let results = search_index::search_fts("rust".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "should find rust.md");
	assert_eq!(
		results[0].path, "rust.md",
		"title match should rank first"
	);

	teardown();
}

#[test]
fn search_fts_snippet_contains_mark_tags() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	let results = search_index::search_fts("safety".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "should find 'safety'");

	let has_mark = results.iter().any(|r| r.snippet.contains("<mark>"));
	assert!(has_mark, "snippet should contain <mark> tags");

	teardown();
}

#[test]
fn update_search_index_file_updates_content() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	// Original content should be findable
	let results = search_index::search_fts("greetings".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "should find 'greetings' in hello.md");

	// Update the file content in the index
	search_index::update_search_index_file(
		"hello.md".to_string(),
		"# Updated Hello\n\nThis is brand new updated content about elephants.\n".to_string(),
	)
	.unwrap();

	// Old content should not be found
	let results = search_index::search_fts("greetings".to_string(), Some(10), Some(false)).unwrap();
	assert!(
		results.is_empty(),
		"old content should not be found after update"
	);

	// New content should be found
	let results = search_index::search_fts("elephants".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "new content should be found");

	teardown();
}

#[test]
fn remove_from_search_index_removes_file() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	// Verify file is indexed
	let results = search_index::search_fts("rust".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "should find rust.md");

	// Remove file from index
	search_index::remove_from_search_index("rust.md".to_string()).unwrap();

	// File should no longer be found
	let results = search_index::search_fts("rust".to_string(), Some(10), Some(false)).unwrap();
	let has_rust = results.iter().any(|r| r.path == "rust.md");
	assert!(!has_rust, "rust.md should be removed from index");

	teardown();
}

#[test]
fn get_search_index_stats_returns_correct_count() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	let stats = search_index::get_search_index_stats().unwrap();
	assert_eq!(
		stats.total_documents, 4,
		"should report 4 indexed documents"
	);

	teardown();
}

#[test]
fn search_fts_handles_special_characters() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	// Should not crash on special characters
	let results =
		search_index::search_fts("hello \"world\"".to_string(), Some(10), Some(false)).unwrap();
	// Just verify it doesn't crash — results may or may not exist
	let _ = results;

	let results =
		search_index::search_fts("test's".to_string(), Some(10), Some(false)).unwrap();
	let _ = results;

	teardown();
}

#[test]
fn search_fts_quotes_only_query_returns_empty() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	// Query with only double quotes — sanitize_fts_term strips them all,
	// leaving an empty FTS query that would cause a MATCH syntax error
	let results =
		search_index::search_fts("\"\"\"".to_string(), Some(10), Some(false)).unwrap();
	assert!(results.is_empty());

	teardown();
}

// --- Fuzzy Search Tests ---

#[test]
fn levenshtein_identical_strings() {
	assert_eq!(fuzzy::levenshtein("test", "test"), 0);
	assert_eq!(fuzzy::levenshtein("hello", "hello"), 0);
}

#[test]
fn levenshtein_single_edit() {
	// Transposition
	assert_eq!(fuzzy::levenshtein("test", "tset"), 2); // t-s swap = 2 single-char edits
	// Substitution
	assert_eq!(fuzzy::levenshtein("test", "tast"), 1);
	// Insertion
	assert_eq!(fuzzy::levenshtein("test", "tests"), 1);
	// Deletion
	assert_eq!(fuzzy::levenshtein("test", "tes"), 1);
}

#[test]
fn levenshtein_two_edits() {
	assert_eq!(fuzzy::levenshtein("test", "toast"), 2);
	assert_eq!(fuzzy::levenshtein("kitten", "sitting"), 3);
}

#[test]
fn levenshtein_case_insensitive() {
	assert_eq!(fuzzy::levenshtein("Test", "test"), 0);
	assert_eq!(fuzzy::levenshtein("HELLO", "hello"), 0);
}

#[test]
fn auto_distance_by_length() {
	assert_eq!(fuzzy::auto_distance(""), 0);
	assert_eq!(fuzzy::auto_distance("ab"), 0);
	assert_eq!(fuzzy::auto_distance("abc"), 1);
	assert_eq!(fuzzy::auto_distance("abcde"), 1);
	assert_eq!(fuzzy::auto_distance("abcdef"), 2);
	assert_eq!(fuzzy::auto_distance("javascript"), 2);
}

#[test]
fn expand_fuzzy_terms_finds_similar_terms() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	db::with_db(|conn| {
		// "javascript" is in the vocabulary (from javascript.md content)
		// "javscript" has 1 edit distance — should be found
		let terms = fuzzy::expand_fuzzy_terms(conn, "javscript")?;
		assert!(
			terms.len() > 1,
			"should find fuzzy matches for 'javscript': {:?}",
			terms
		);
		assert!(
			terms.contains(&"javascript".to_string()),
			"should include 'javascript' as fuzzy match: {:?}",
			terms
		);
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_fuzzy_terms_returns_only_original_for_short_terms() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	db::with_db(|conn| {
		let terms = fuzzy::expand_fuzzy_terms(conn, "ab")?;
		assert_eq!(terms.len(), 1, "short terms should not be expanded");
		assert_eq!(terms[0], "ab");
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn search_fts_with_fuzzy_finds_typo_tolerant_matches() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	// "programing" (one 'm') is a typo for "programming"
	let results =
		search_index::search_fts("programing".to_string(), Some(10), Some(true)).unwrap();
	assert!(
		!results.is_empty(),
		"fuzzy search should find 'programming' from typo 'programing'"
	);

	teardown();
}

#[test]
fn search_fts_indexes_nested_files_with_relative_paths() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index(tmp.path().to_string_lossy().to_string()).unwrap();

	let results = search_index::search_fts("nested".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "should find nested note");
	assert!(
		results[0].path.contains("subfolder/"),
		"path should be relative with subfolder: {}",
		results[0].path
	);

	teardown();
}

#[test]
fn build_search_index_rejects_non_existent_path() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();

	let result =
		search_index::build_search_index("/non/existent/vault/path".to_string());
	assert!(result.is_err());
	assert!(result
		.unwrap_err()
		.contains("Failed to resolve vault path"));

	teardown();
}

#[test]
fn build_search_index_rejects_file_as_vault() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();

	let tmp = TempDir::new().unwrap();
	let file_path = tmp.path().join("not-a-dir.md");
	fs::write(&file_path, "content").unwrap();

	let result =
		search_index::build_search_index(file_path.to_string_lossy().to_string());
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("not a directory"));

	teardown();
}
