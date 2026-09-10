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

/// Current wall clock in seconds since the UNIX epoch.
fn now_secs() -> i64 {
	std::time::SystemTime::now()
		.duration_since(std::time::UNIX_EPOCH)
		.unwrap()
		.as_secs() as i64
}

/// Forces a file's mtime, so "edited externally" does not depend on the test
/// running slower than the filesystem's timestamp resolution.
fn set_mtime_secs(path: &std::path::Path, secs: i64) {
	let file = fs::OpenOptions::new().write(true).open(path).unwrap();
	file.set_modified(std::time::UNIX_EPOCH + std::time::Duration::from_secs(secs as u64))
		.unwrap();
}

// --- FTS5 Index Tests ---

#[test]
fn build_search_index_indexes_markdown_files() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();

	let stats =
		search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();
	assert_eq!(stats.total_documents, 4, "should index 4 markdown files");

	teardown();
}

#[test]
fn build_search_index_skips_hidden_directories() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();

	let stats =
		search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

	// Original content should be findable
	let results = search_index::search_fts("greetings".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "should find 'greetings' in hello.md");

	// Update the file content in the index
	search_index::update_search_index_file_inner(
		"hello.md".to_string(),
		"# Updated Hello\n\nThis is brand new updated content about elephants.\n".to_string(),
		tmp.path().to_string_lossy().to_string(),
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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

	// Verify file is indexed
	let results = search_index::search_fts("rust".to_string(), Some(10), Some(false)).unwrap();
	assert!(!results.is_empty(), "should find rust.md");

	// Remove file from index
	search_index::remove_from_search_index_inner("rust.md".to_string()).unwrap();

	// File should no longer be found
	let results = search_index::search_fts("rust".to_string(), Some(10), Some(false)).unwrap();
	let has_rust = results.iter().any(|r| r.path == "rust.md");
	assert!(!has_rust, "rust.md should be removed from index");

	teardown();
}

#[test]
fn search_fts_handles_special_characters() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
fn expand_fuzzy_terms_empty_input_returns_only_empty_original() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

	db::with_db(|conn| {
		// auto_distance("") is 0 -> no expansion; the (empty) original is
		// returned as-is without consulting the vocabulary.
		let terms = fuzzy::expand_fuzzy_terms(conn, "")?;
		assert_eq!(terms, vec![String::new()], "empty term must not expand");
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_fuzzy_terms_long_term_does_not_match_distant_vocab() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

	db::with_db(|conn| {
		// 20-char term sharing the "j" prefix with "javascript" in the
		// vocabulary. Max distance caps at 2 regardless of length, and the
		// distance to "javascript" is 10 -> only the original survives.
		let terms = fuzzy::expand_fuzzy_terms(conn, "javascriptframeworks")?;
		assert_eq!(
			terms,
			vec!["javascriptframeworks".to_string()],
			"vocab terms beyond the distance threshold must be excluded"
		);
		Ok(())
	})
	.unwrap();

	teardown();
}

#[test]
fn expand_fuzzy_terms_lowercases_original_and_still_matches() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

	db::with_db(|conn| {
		let terms = fuzzy::expand_fuzzy_terms(conn, "JavScript")?;
		assert_eq!(
			terms[0], "javscript",
			"original term must come back lowercased and first"
		);
		assert!(
			terms.contains(&"javascript".to_string()),
			"case-insensitive fuzzy match missing: {:?}",
			terms
		);
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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

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
		search_index::build_search_index_inner("/non/existent/vault/path".to_string());
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
		search_index::build_search_index_inner(file_path.to_string_lossy().to_string());
	assert!(result.is_err());
	assert!(result.unwrap_err().contains("not a directory"));

	teardown();
}

#[test]
fn build_search_index_leaves_an_unchanged_vault_untouched() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	// First build: everything is new.
	let stats1 = search_index::build_search_index_inner(vault.clone()).unwrap();
	assert_eq!(stats1.total_documents, 4);
	assert_eq!(stats1.added, 4);
	assert_eq!(stats1.unchanged, 0);

	// Second build over the same untouched files: nothing is read again.
	let stats2 = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats2.total_documents, 4);
	assert_eq!(stats2.added, 0);
	assert_eq!(stats2.updated, 0);
	assert_eq!(stats2.removed, 0);
	assert_eq!(stats2.unchanged, 4);

	teardown();
}

#[test]
fn build_search_index_indexes_files_added_while_closed() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	let stats1 = search_index::build_search_index_inner(vault.clone()).unwrap();
	assert_eq!(stats1.total_documents, 4);

	// A single external add used to move `diff` by 1, well under the old
	// 5%-or-at-least-5 threshold, so it was never picked up.
	fs::write(tmp.path().join("synced.md"), "# Synced\n\nArrived via a sync client.\n").unwrap();

	let stats2 = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats2.added, 1);
	assert_eq!(stats2.unchanged, 4);
	assert_eq!(stats2.total_documents, 5);

	let results = search_index::search_fts("sync client".to_string(), Some(10), Some(false)).unwrap();
	assert_eq!(results.len(), 1, "externally added file must be searchable");
	assert_eq!(results[0].path, "synced.md");

	teardown();
}

#[test]
fn build_search_index_reconciles_an_add_delete_pair_that_cancels_out_in_the_count() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	search_index::build_search_index_inner(vault.clone()).unwrap();

	// One in, one out: the row count is identical before and after, which is
	// precisely the case the old cardinality check read as "in sync".
	fs::remove_file(tmp.path().join("rust.md")).unwrap();
	fs::write(tmp.path().join("elephants.md"), "# Elephants\n\nA brand new note.\n").unwrap();

	let stats = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats.added, 1);
	assert_eq!(stats.removed, 1);
	assert_eq!(stats.updated, 0);
	assert_eq!(stats.total_documents, 4);

	let gone = search_index::search_fts("dereferences".to_string(), Some(10), Some(false)).unwrap();
	assert!(gone.is_empty(), "deleted file must not answer searches: {gone:?}");
	let added = search_index::search_fts("elephants".to_string(), Some(10), Some(false)).unwrap();
	assert_eq!(added.len(), 1, "added file must be searchable");

	teardown();
}

#[test]
fn build_search_index_reindexes_an_edited_file_and_leaves_its_neighbours_unread() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	search_index::build_search_index_inner(vault.clone()).unwrap();

	// Stale marker: rewrite the row of an untouched file with content that is
	// NOT on disk. Only a re-read would overwrite it, so its survival proves
	// the reconcile never opened that file.
	db::with_fts_db(|conn| {
		conn.execute(
			"UPDATE notes_content SET content = 'sentinel-untouched' WHERE path = 'javascript.md'",
			[],
		)
		.map_err(|e| e.to_string())?;
		Ok(())
	})
	.unwrap();

	// An external edit keeps the path and the row count identical - the old
	// heuristic could not see it at all. Bump the mtime past the stored one.
	let edited = tmp.path().join("rust.md");
	fs::write(&edited, "# Rust\n\nRewritten externally to mention aardvarks.\n").unwrap();
	set_mtime_secs(&edited, now_secs() + 60);

	let stats = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats.updated, 1);
	assert_eq!(stats.added, 0);
	assert_eq!(stats.removed, 0);
	assert_eq!(stats.unchanged, 3);

	let content: String = db::with_fts_db(|conn| {
		conn.query_row(
			"SELECT content FROM notes_content WHERE path = 'javascript.md'",
			[],
			|row| row.get(0),
		)
		.map_err(|e| e.to_string())
	})
	.unwrap();
	assert_eq!(
		content, "sentinel-untouched",
		"an unchanged file must not be re-read"
	);

	let results = search_index::search_fts("aardvarks".to_string(), Some(10), Some(false)).unwrap();
	assert_eq!(results.len(), 1, "edited content must be searchable");

	teardown();
}

#[test]
fn build_search_index_reindexes_a_file_restored_with_an_older_mtime() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	search_index::build_search_index_inner(vault.clone()).unwrap();

	// A restore from backup, `cp -p`, `rsync -t`, an unzip or a sync client's
	// conflict copy all land content stamped OLDER than the row. A
	// strictly-newer test would leave these stale forever.
	let restored = tmp.path().join("rust.md");
	fs::write(&restored, "# Rust\n\nRestored from a backup, mentions aardvarks.\n").unwrap();
	set_mtime_secs(&restored, now_secs() - 3600);

	let stats = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats.updated, 1, "an older mtime is still a difference");
	assert_eq!(stats.unchanged, 3);

	let results = search_index::search_fts("aardvarks".to_string(), Some(10), Some(false)).unwrap();
	assert_eq!(results.len(), 1, "restored content must be searchable");

	teardown();
}

#[test]
fn build_search_index_full_rebuild_when_no_row_survives_the_pass() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	search_index::build_search_index_inner(vault.clone()).unwrap();

	// The state the `mtime` column migration leaves behind: every pre-existing
	// row defaults to 0, so all of them are stale at once. The pass takes the
	// single `clear_index` + insert path instead of one FTS5 `'delete'` per row,
	// and the end state has to be identical either way.
	db::with_fts_db(|conn| {
		conn.execute("UPDATE notes_content SET mtime = 0", [])
			.map_err(|e| e.to_string())?;
		Ok(())
	})
	.unwrap();

	let stats = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats.updated, 4);
	assert_eq!(stats.unchanged, 0);
	assert_eq!(stats.total_documents, 4, "no row may be lost by the shortcut");

	let results = search_index::search_fts("dereferences".to_string(), Some(10), Some(false)).unwrap();
	assert_eq!(results.len(), 1, "the re-indexed rows must still be searchable");

	teardown();
}

#[test]
fn build_search_index_full_rebuild_when_table_is_empty() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	search_index::build_search_index_inner(vault.clone()).unwrap();

	// An FTS5 schema migration drops and recreates both tables; emulate the
	// state it leaves behind.
	db::with_fts_db(db::fts_repo::clear_index).unwrap();

	let stats = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats.added, 4, "an empty table means everything is added");
	assert_eq!(stats.unchanged, 0);
	assert_eq!(stats.total_documents, 4);

	teardown();
}

#[test]
fn update_search_index_file_stores_the_mtime_so_the_next_open_skips_it() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	search_index::build_search_index_inner(vault.clone()).unwrap();

	// A save: the file on disk and the FTS row are written together.
	let saved = "# Hello\n\nSaved content about walruses.\n";
	fs::write(tmp.path().join("hello.md"), saved).unwrap();
	set_mtime_secs(&tmp.path().join("hello.md"), now_secs() + 60);
	search_index::update_search_index_file_inner(
		"hello.md".to_string(),
		saved.to_string(),
		vault.clone(),
	)
	.unwrap();

	// The stored mtime is the file's own, so the next open re-reads nothing.
	let stats = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats.updated, 0, "the saved file must not be re-read");
	assert_eq!(stats.unchanged, 4);

	teardown();
}

#[test]
fn update_search_index_file_indexes_content_even_when_the_vault_path_is_bogus() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	search_index::build_search_index_inner(tmp.path().to_string_lossy().to_string()).unwrap();

	// mtime resolution fails, the content still has to land (stored mtime 0,
	// so the next open re-reads the file once).
	search_index::update_search_index_file_inner(
		"hello.md".to_string(),
		"# Hello\n\nContent about walruses.\n".to_string(),
		"/non/existent/vault/path".to_string(),
	)
	.unwrap();

	let results = search_index::search_fts("walruses".to_string(), Some(10), Some(false)).unwrap();
	assert_eq!(results.len(), 1, "content must be indexed regardless of mtime");

	teardown();
}

#[test]
fn build_search_index_rebuilds_when_vault_emptied() {
	let _guard = TEST_LOCK.lock().unwrap();
	teardown();
	let tmp = setup_vault();
	let vault = tmp.path().to_string_lossy().to_string();

	let stats1 = search_index::build_search_index_inner(vault.clone()).unwrap();
	assert_eq!(stats1.total_documents, 4);

	// Remove all markdown files
	for entry in fs::read_dir(tmp.path()).unwrap() {
		let path = entry.unwrap().path();
		if path.extension().map_or(false, |e| e == "md") {
			fs::remove_file(path).unwrap();
		}
	}
	fs::remove_dir_all(tmp.path().join("subfolder")).unwrap();

	// Every row's file is gone, so every row is removed.
	let stats2 = search_index::build_search_index_inner(vault).unwrap();
	assert_eq!(stats2.total_documents, 0);
	assert_eq!(stats2.removed, 4);
	assert_eq!(stats2.unchanged, 0);

	teardown();
}
