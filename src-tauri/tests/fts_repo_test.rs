//! Direct tests for `db::fts_repo` — the FTS5 repository layer.
//!
//! These exercise insert_entry / delete_entry / search_match /
//! expand_vocab_terms / clear_index / count_entries against an in-memory
//! SQLite connection with the real schema (no global DB statics involved),
//! complementing the indirect coverage in `search_fts_test.rs` which only
//! goes through the `search_index` command wrappers.

use kokobrain_lib::db::fts_repo;
use kokobrain_lib::db::schema;
use rusqlite::Connection;

/// Opens an in-memory database with the full application schema.
fn open_memory_db() -> Connection {
	let conn = Connection::open_in_memory().unwrap();
	schema::create_tables(&conn).unwrap();
	conn
}

/// Inserts a small fixture corpus used by the search/vocab tests.
fn insert_fixture_corpus(conn: &Connection) {
	fts_repo::insert_entry(
		conn,
		"rust.md",
		"Rust Programming",
		"Rust is a systems programming language focused on safety.",
		"Memory Safety",
		"#programming #systems",
	)
	.unwrap();
	fts_repo::insert_entry(
		conn,
		"javascript.md",
		"JavaScript Guide",
		"JavaScript is a dynamic programming language. Java is different.",
		"Functions",
		"#programming",
	)
	.unwrap();
	fts_repo::insert_entry(
		conn,
		"cooking.md",
		"Pasta Recipes",
		"Boil water, add salt, cook the pasta until al dente.",
		"Italian",
		"#food",
	)
	.unwrap();
}

// --- insert_entry ---

#[test]
fn insert_entry_makes_document_searchable() {
	let conn = open_memory_db();

	fts_repo::insert_entry(
		&conn,
		"note.md",
		"Hello Title",
		"Some unique elephant content.",
		"A Heading",
		"#tag-one",
	)
	.unwrap();

	assert_eq!(fts_repo::count_entries(&conn).unwrap(), 1);

	let results = fts_repo::search_match(&conn, "elephant", 10).unwrap();
	assert_eq!(results.len(), 1);
	assert_eq!(results[0].path, "note.md");
	assert_eq!(results[0].title, "Hello Title");
	assert_eq!(results[0].tags, "#tag-one");
}

#[test]
fn insert_entry_rejects_duplicate_path() {
	let conn = open_memory_db();

	fts_repo::insert_entry(&conn, "dup.md", "First", "content", "", "").unwrap();
	let result = fts_repo::insert_entry(&conn, "dup.md", "Second", "content", "", "");

	assert!(result.is_err(), "duplicate path must violate UNIQUE constraint");
	assert!(
		result.unwrap_err().contains("Failed to insert content entry"),
		"error should come from the content table insert"
	);
	// The failed insert must not have corrupted the index.
	assert_eq!(fts_repo::count_entries(&conn).unwrap(), 1);
}

// --- search_match ---

#[test]
fn search_match_ranks_title_matches_first() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	// "rust" appears in the title of rust.md only; bm25 weights title 2.0
	// vs content 1.0, and results are ordered by ascending bm25 score
	// (more negative = better match).
	let results = fts_repo::search_match(&conn, "rust", 10).unwrap();
	assert!(!results.is_empty());
	assert_eq!(results[0].path, "rust.md", "title match should rank first");

	// "programming" hits rust.md and javascript.md but not cooking.md.
	let results = fts_repo::search_match(&conn, "programming", 10).unwrap();
	let paths: Vec<&str> = results.iter().map(|r| r.path.as_str()).collect();
	assert!(paths.contains(&"rust.md"));
	assert!(paths.contains(&"javascript.md"));
	assert!(!paths.contains(&"cooking.md"));
}

#[test]
fn search_match_respects_limit() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	let unlimited = fts_repo::search_match(&conn, "programming", 10).unwrap();
	assert!(unlimited.len() >= 2, "fixture should have 2+ matches");

	let limited = fts_repo::search_match(&conn, "programming", 1).unwrap();
	assert_eq!(limited.len(), 1, "limit must cap the result count");
}

#[test]
fn search_match_snippet_contains_mark_tags() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	let results = fts_repo::search_match(&conn, "safety", 10).unwrap();
	assert!(!results.is_empty());
	assert!(
		results[0].snippet.contains("<mark>"),
		"snippet should highlight the match: {}",
		results[0].snippet
	);
}

#[test]
fn search_match_returns_empty_when_no_match() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	let results = fts_repo::search_match(&conn, "xyznonexistent", 10).unwrap();
	assert!(results.is_empty());
}

#[test]
fn search_match_on_empty_index_returns_empty() {
	let conn = open_memory_db();

	let results = fts_repo::search_match(&conn, "anything", 10).unwrap();
	assert!(results.is_empty());
}

#[test]
fn search_match_skips_malformed_match_query() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	// A bare unbalanced quote is an FTS5 MATCH syntax error. The error
	// surfaces at row-step time and the repo's filter_map logs + skips it,
	// so the call returns Ok with no rows instead of Err. Callers
	// (search_index::search_fts) sanitize queries before reaching here.
	let results = fts_repo::search_match(&conn, "\"", 10).unwrap();
	assert!(results.is_empty());
}

// --- delete_entry ---

#[test]
fn delete_entry_removes_document_from_index() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);
	assert_eq!(fts_repo::count_entries(&conn).unwrap(), 3);

	fts_repo::delete_entry(&conn, "rust.md").unwrap();

	assert_eq!(fts_repo::count_entries(&conn).unwrap(), 2);
	let results = fts_repo::search_match(&conn, "rust", 10).unwrap();
	assert!(
		results.iter().all(|r| r.path != "rust.md"),
		"deleted document must not be searchable"
	);

	// Other documents stay searchable through the external-content index.
	let results = fts_repo::search_match(&conn, "pasta", 10).unwrap();
	assert_eq!(results.len(), 1);
	assert_eq!(results[0].path, "cooking.md");
}

#[test]
fn delete_entry_missing_path_is_noop() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	fts_repo::delete_entry(&conn, "does-not-exist.md").unwrap();

	assert_eq!(fts_repo::count_entries(&conn).unwrap(), 3, "no entry should be removed");
}

#[test]
fn delete_then_reinsert_same_path_is_searchable() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	fts_repo::delete_entry(&conn, "rust.md").unwrap();
	fts_repo::insert_entry(
		&conn,
		"rust.md",
		"Rust Reborn",
		"Completely new content about ownership.",
		"",
		"",
	)
	.unwrap();

	// Old content must be gone, new content findable under the same path.
	let old = fts_repo::search_match(&conn, "safety", 10).unwrap();
	assert!(old.iter().all(|r| r.path != "rust.md"));

	let results = fts_repo::search_match(&conn, "ownership", 10).unwrap();
	assert_eq!(results.len(), 1);
	assert_eq!(results[0].path, "rust.md");
	assert_eq!(results[0].title, "Rust Reborn");
}

// --- clear_index / count_entries ---

#[test]
fn clear_index_removes_all_entries() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);
	assert_eq!(fts_repo::count_entries(&conn).unwrap(), 3);

	fts_repo::clear_index(&conn).unwrap();

	assert_eq!(fts_repo::count_entries(&conn).unwrap(), 0);
	let results = fts_repo::search_match(&conn, "programming", 10).unwrap();
	assert!(results.is_empty(), "FTS index must be empty after clear");
}

#[test]
fn count_entries_zero_on_empty_index() {
	let conn = open_memory_db();
	assert_eq!(fts_repo::count_entries(&conn).unwrap(), 0);
}

// --- expand_vocab_terms ---

#[test]
fn expand_vocab_terms_returns_matching_terms() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	// unicode61 tokenizer lowercases terms; both "java" and "javascript"
	// exist in the fixture corpus vocabulary.
	let terms = fts_repo::expand_vocab_terms(&conn, "java%", 20).unwrap();
	assert!(terms.contains(&"java".to_string()), "got: {terms:?}");
	assert!(terms.contains(&"javascript".to_string()), "got: {terms:?}");
}

#[test]
fn expand_vocab_terms_respects_limit() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	let terms = fts_repo::expand_vocab_terms(&conn, "java%", 1).unwrap();
	assert_eq!(terms.len(), 1, "limit must cap vocab expansion");
}

#[test]
fn expand_vocab_terms_no_match_returns_empty() {
	let conn = open_memory_db();
	insert_fixture_corpus(&conn);

	let terms = fts_repo::expand_vocab_terms(&conn, "zzzz%", 20).unwrap();
	assert!(terms.is_empty());

	// Empty LIKE pattern matches nothing.
	let terms = fts_repo::expand_vocab_terms(&conn, "", 20).unwrap();
	assert!(terms.is_empty());
}

// --- error paths: schema missing ---

#[test]
fn repo_functions_error_without_schema() {
	// Bare connection: none of the FTS tables exist.
	let conn = Connection::open_in_memory().unwrap();

	let err = fts_repo::insert_entry(&conn, "a.md", "t", "c", "", "").unwrap_err();
	assert!(err.contains("Failed to insert content entry"), "got: {err}");

	let err = fts_repo::search_match(&conn, "q", 10).unwrap_err();
	assert!(err.contains("FTS5 query failed"), "got: {err}");

	let err = fts_repo::delete_entry(&conn, "a.md").unwrap_err();
	assert!(err.contains("Failed to read content for FTS delete"), "got: {err}");

	let err = fts_repo::count_entries(&conn).unwrap_err();
	assert!(err.contains("Failed to count entries"), "got: {err}");

	let err = fts_repo::clear_index(&conn).unwrap_err();
	assert!(err.contains("Failed to clear content table"), "got: {err}");

	let err = fts_repo::expand_vocab_terms(&conn, "a%", 10).unwrap_err();
	assert!(err.contains("notes_fts_vocab"), "got: {err}");
}
