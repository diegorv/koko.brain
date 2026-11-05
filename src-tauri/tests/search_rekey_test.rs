//! `rename_in_search_index`: a rename or move re-keys the FTS5 rows, the
//! semantic chunks and the semantic `mtime:` keys of a note or of every note
//! under a folder, against the real schema behind the global DB statics.

use kokobrain_lib::commands::search_index::{rename_in_search_index_inner, search_fts_inner};
use kokobrain_lib::db;
use kokobrain_lib::db::{fts_repo, semantic_repo};
use std::sync::Mutex;
use tempfile::TempDir;

/// Tests share the global DB statics, so they must run serially.
static TEST_LOCK: Mutex<()> = Mutex::new(());

fn setup() -> TempDir {
	let tmp = TempDir::new().unwrap();
	let _ = db::close_database();
	db::open_database(tmp.path()).unwrap();
	tmp
}

/// Seeds one note in both search tables: an FTS row whose content carries
/// `term`, one chunk keyed the way the chunker keys it, and its mtime key.
fn seed_note(path: &str, term: &str) {
	let title = path.rsplit('/').next().unwrap().trim_end_matches(".md").to_string();
	db::with_fts_db(|conn| {
		fts_repo::insert_entry(conn, path, &title, &format!("body with {term}"), "", "", 42)
	})
	.unwrap();
	db::with_db(|conn| {
		let key = format!("{path}#intro-3");
		semantic_repo::insert_chunk(conn, &key, path, "text", Some("Intro"), &[], 3, 5, "h", b"emb", 1)?;
		semantic_repo::upsert_mtimes(conn, &[(path.to_string(), 42)])
	})
	.unwrap();
}

fn content_paths() -> Vec<String> {
	db::with_fts_db(|conn| {
		let mut stmt = conn.prepare("SELECT path FROM notes_content ORDER BY path").unwrap();
		let rows = stmt.query_map([], |r| r.get::<_, String>(0)).unwrap();
		Ok(rows.map(Result::unwrap).collect())
	})
	.unwrap()
}

fn chunk_rows() -> Vec<(String, String)> {
	db::with_db(|conn| {
		let mut stmt = conn.prepare("SELECT key, source_path FROM chunks ORDER BY key").unwrap();
		let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))).unwrap();
		Ok(rows.map(Result::unwrap).collect())
	})
	.unwrap()
}

fn mtime_keys() -> Vec<String> {
	let mut keys: Vec<String> = db::with_db(semantic_repo::get_stored_mtimes)
		.unwrap()
		.into_keys()
		.collect();
	keys.sort();
	keys
}

fn match_paths(query: &str) -> Vec<String> {
	let mut paths: Vec<String> = search_fts_inner(query, 50, false)
		.unwrap()
		.into_iter()
		.map(|r| r.path)
		.collect();
	paths.sort();
	paths
}

/// FTS5's own consistency check of the index against `notes_content`.
fn assert_fts_integrity() {
	db::with_fts_db(|conn| {
		conn.execute("INSERT INTO notes_fts(notes_fts) VALUES('integrity-check')", [])
			.map_err(|e| e.to_string())
	})
	.expect("notes_fts index out of sync with notes_content");
}

#[test]
fn folder_rename_moves_every_child_and_leaves_the_sibling_prefix_alone() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("dir/a.md", "walrus");
	seed_note("dir/b.md", "walrus");
	seed_note("dirx/c.md", "walrus");

	rename_in_search_index_inner("dir".into(), "renamed".into()).unwrap();

	assert_eq!(match_paths("walrus"), vec!["dirx/c.md", "renamed/a.md", "renamed/b.md"]);
	assert_eq!(content_paths(), vec!["dirx/c.md", "renamed/a.md", "renamed/b.md"]);
	assert_eq!(
		chunk_rows(),
		vec![
			("dirx/c.md#intro-3".to_string(), "dirx/c.md".to_string()),
			("renamed/a.md#intro-3".to_string(), "renamed/a.md".to_string()),
			("renamed/b.md#intro-3".to_string(), "renamed/b.md".to_string()),
		]
	);
	assert_eq!(mtime_keys(), vec!["dirx/c.md", "renamed/a.md", "renamed/b.md"]);
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn folder_rename_drops_the_old_path_terms_from_the_fts_index() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("oldfolder/a.md", "walrus");

	rename_in_search_index_inner("oldfolder".into(), "newfolder".into()).unwrap();

	// `path` is an indexed FTS column: the old folder name must stop matching.
	assert!(match_paths("oldfolder").is_empty());
	assert_eq!(match_paths("newfolder"), vec!["newfolder/a.md"]);
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn single_note_rename_moves_its_rows_and_updates_the_title() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("notes/old.md", "walrus");
	seed_note("notes/old.md.bak/x.md", "walrus");

	rename_in_search_index_inner("notes/old.md".into(), "notes/new.md".into()).unwrap();

	let hits = search_fts_inner("walrus", 50, false).unwrap();
	let renamed = hits.iter().find(|r| r.path == "notes/new.md").expect("renamed note not found");
	assert_eq!(renamed.title, "new");
	assert_eq!(content_paths(), vec!["notes/new.md", "notes/old.md.bak/x.md"]);
	assert_eq!(mtime_keys(), vec!["notes/new.md", "notes/old.md.bak/x.md"]);
	assert_eq!(chunk_rows()[0], ("notes/new.md#intro-3".to_string(), "notes/new.md".to_string()));
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn a_row_already_at_the_destination_wins_and_the_other_children_still_move() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("dir/a.md", "walrus");
	seed_note("dir/b.md", "walrus");
	// An autosave or watcher upsert that landed at the new path first.
	seed_note("renamed/a.md", "narwhal");

	rename_in_search_index_inner("dir".into(), "renamed".into()).unwrap();

	assert_eq!(content_paths(), vec!["renamed/a.md", "renamed/b.md"]);
	assert_eq!(match_paths("narwhal"), vec!["renamed/a.md"]);
	assert_eq!(match_paths("walrus"), vec!["renamed/b.md"]);
	assert_eq!(
		chunk_rows(),
		vec![
			("renamed/a.md#intro-3".to_string(), "renamed/a.md".to_string()),
			("renamed/b.md#intro-3".to_string(), "renamed/b.md".to_string()),
		]
	);
	assert_eq!(mtime_keys(), vec!["renamed/a.md", "renamed/b.md"]);
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn rename_onto_itself_keeps_every_row() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("dir/a.md", "walrus");

	rename_in_search_index_inner("dir".into(), "dir".into()).unwrap();

	assert_eq!(content_paths(), vec!["dir/a.md"]);
	assert_eq!(chunk_rows(), vec![("dir/a.md#intro-3".to_string(), "dir/a.md".to_string())]);
	assert_eq!(mtime_keys(), vec!["dir/a.md"]);
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn rename_of_an_unindexed_path_is_a_noop() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("a.md", "walrus");

	rename_in_search_index_inner("missing".into(), "elsewhere".into()).unwrap();

	assert_eq!(content_paths(), vec!["a.md"]);
	assert_eq!(mtime_keys(), vec!["a.md"]);
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn rename_to_a_view_drops_the_rows_instead_of_moving_them() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("Foo.md", "walrus");
	seed_note("Bar.md", "narwhal");

	rename_in_search_index_inner("Foo.md".into(), "Foo.view".into()).unwrap();

	assert!(match_paths("walrus").is_empty());
	assert_eq!(content_paths(), vec!["Bar.md"]);
	assert_eq!(chunk_rows(), vec![("Bar.md#intro-3".to_string(), "Bar.md".to_string())]);
	assert_eq!(mtime_keys(), vec!["Bar.md"]);
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn rename_to_a_non_markdown_extension_drops_the_rows() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("Foo.md", "walrus");

	rename_in_search_index_inner("Foo.md".into(), "Foo.kanban".into()).unwrap();

	assert!(content_paths().is_empty());
	assert!(chunk_rows().is_empty());
	assert!(mtime_keys().is_empty());
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn folder_renamed_to_a_view_name_still_moves_its_notes() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("dir/a.md", "walrus");

	rename_in_search_index_inner("dir".into(), "dir.view".into()).unwrap();

	assert_eq!(match_paths("walrus"), vec!["dir.view/a.md"]);
	assert_eq!(content_paths(), vec!["dir.view/a.md"]);
	assert_eq!(chunk_rows(), vec![("dir.view/a.md#intro-3".to_string(), "dir.view/a.md".to_string())]);
	assert_eq!(mtime_keys(), vec!["dir.view/a.md"]);
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn view_renamed_to_markdown_with_no_rows_is_ok() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _tmp = setup();
	seed_note("a.md", "walrus");

	rename_in_search_index_inner("Foo.view".into(), "Foo.md".into()).unwrap();

	assert_eq!(content_paths(), vec!["a.md"]);
	assert_eq!(mtime_keys(), vec!["a.md"]);
	assert_fts_integrity();

	db::close_database().unwrap();
}

#[test]
fn rename_without_an_open_database_errors() {
	let _guard = TEST_LOCK.lock().unwrap();
	let _ = db::close_database();

	assert!(rename_in_search_index_inner("a".into(), "b".into()).is_err());
}
