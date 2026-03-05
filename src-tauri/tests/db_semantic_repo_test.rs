use kokobrain_lib::db::{schema, semantic_repo};
use rusqlite::Connection;
use std::collections::HashSet;

fn setup() -> Connection {
	let conn = Connection::open_in_memory().unwrap();
	schema::create_tables(&conn).unwrap();
	conn
}

// --- clear_all_chunks ---

#[test]
fn clear_all_chunks_empties_table() {
	let conn = setup();
	semantic_repo::insert_chunk(
		&conn, "k1", "a.md", "text", None, 1, 5, "h1", b"emb", 1000,
	)
	.unwrap();
	assert_eq!(semantic_repo::count_chunks(&conn).unwrap(), 1);

	semantic_repo::clear_all_chunks(&conn).unwrap();
	assert_eq!(semantic_repo::count_chunks(&conn).unwrap(), 0);
}

#[test]
fn clear_all_chunks_on_empty_table_is_ok() {
	let conn = setup();
	semantic_repo::clear_all_chunks(&conn).unwrap();
	assert_eq!(semantic_repo::count_chunks(&conn).unwrap(), 0);
}

// --- get_stored_mtimes / upsert_mtimes ---

#[test]
fn upsert_and_get_mtimes() {
	let conn = setup();
	let entries = vec![
		("notes/a.md".to_string(), 100i64),
		("notes/b.md".to_string(), 200),
	];
	semantic_repo::upsert_mtimes(&conn, &entries).unwrap();

	let map = semantic_repo::get_stored_mtimes(&conn).unwrap();
	assert_eq!(map.len(), 2);
	assert_eq!(map["notes/a.md"], 100);
	assert_eq!(map["notes/b.md"], 200);
}

#[test]
fn upsert_mtimes_overwrites_existing() {
	let conn = setup();
	semantic_repo::upsert_mtimes(&conn, &[("a.md".to_string(), 100)]).unwrap();
	semantic_repo::upsert_mtimes(&conn, &[("a.md".to_string(), 999)]).unwrap();

	let map = semantic_repo::get_stored_mtimes(&conn).unwrap();
	assert_eq!(map["a.md"], 999);
}

#[test]
fn get_stored_mtimes_empty() {
	let conn = setup();
	let map = semantic_repo::get_stored_mtimes(&conn).unwrap();
	assert!(map.is_empty());
}

// --- delete_chunks_for_path / delete_chunks_for_paths ---

#[test]
fn delete_chunks_for_path_removes_matching() {
	let conn = setup();
	semantic_repo::insert_chunk(&conn, "k1", "a.md", "t1", None, 1, 5, "h1", b"e", 1000)
		.unwrap();
	semantic_repo::insert_chunk(&conn, "k2", "b.md", "t2", None, 1, 5, "h2", b"e", 1000)
		.unwrap();

	semantic_repo::delete_chunks_for_path(&conn, "a.md").unwrap();
	assert_eq!(semantic_repo::count_chunks(&conn).unwrap(), 1);

	let sources = semantic_repo::get_distinct_sources(&conn).unwrap();
	assert_eq!(sources, vec!["b.md"]);
}

// --- insert_chunk ---

#[test]
fn insert_chunk_stores_all_fields() {
	let conn = setup();
	semantic_repo::insert_chunk(
		&conn,
		"notes/a.md#0",
		"notes/a.md",
		"Hello world",
		Some("Introduction"),
		1,
		10,
		"abc123",
		b"\x01\x02\x03",
		5000,
	)
	.unwrap();

	let rows = semantic_repo::load_all_embeddings(&conn).unwrap();
	assert_eq!(rows.len(), 1);
	assert_eq!(rows[0].key, "notes/a.md#0");
	assert_eq!(rows[0].source_path, "notes/a.md");
	assert_eq!(rows[0].content, "Hello world");
	assert_eq!(rows[0].heading.as_deref(), Some("Introduction"));
	assert_eq!(rows[0].line_start, 1);
	assert_eq!(rows[0].line_end, 10);
	assert_eq!(rows[0].embedding_bytes, b"\x01\x02\x03");
}

#[test]
fn insert_chunk_replaces_on_same_key() {
	let conn = setup();
	semantic_repo::insert_chunk(&conn, "k1", "a.md", "old", None, 1, 5, "h1", b"e1", 1000)
		.unwrap();
	semantic_repo::insert_chunk(
		&conn,
		"k1",
		"a.md",
		"updated",
		Some("New heading"),
		2,
		8,
		"h2",
		b"e2",
		2000,
	)
	.unwrap();

	assert_eq!(semantic_repo::count_chunks(&conn).unwrap(), 1);
	let rows = semantic_repo::load_all_embeddings(&conn).unwrap();
	assert_eq!(rows[0].content, "updated");
	assert_eq!(rows[0].heading.as_deref(), Some("New heading"));
}

// --- load_all_embeddings ---

#[test]
fn load_all_embeddings_empty() {
	let conn = setup();
	let rows = semantic_repo::load_all_embeddings(&conn).unwrap();
	assert!(rows.is_empty());
}

// --- get_distinct_sources ---

#[test]
fn get_distinct_sources_deduplicates() {
	let conn = setup();
	semantic_repo::insert_chunk(&conn, "k1", "a.md", "t1", None, 1, 5, "h1", b"e", 1000)
		.unwrap();
	semantic_repo::insert_chunk(&conn, "k2", "a.md", "t2", None, 6, 10, "h2", b"e", 1000)
		.unwrap();
	semantic_repo::insert_chunk(&conn, "k3", "b.md", "t3", None, 1, 5, "h3", b"e", 1000)
		.unwrap();

	let sources = semantic_repo::get_distinct_sources(&conn).unwrap();
	assert_eq!(sources.len(), 2);
	assert!(sources.contains(&"a.md".to_string()));
	assert!(sources.contains(&"b.md".to_string()));
}

// --- get_meta / upsert_meta ---

#[test]
fn upsert_and_get_meta() {
	let conn = setup();
	semantic_repo::upsert_meta(&conn, "model_hash", "abc123").unwrap();

	let val = semantic_repo::get_meta(&conn, "model_hash").unwrap();
	assert_eq!(val.as_deref(), Some("abc123"));
}

#[test]
fn get_meta_returns_none_for_missing_key() {
	let conn = setup();
	let val = semantic_repo::get_meta(&conn, "nonexistent").unwrap();
	assert!(val.is_none());
}

#[test]
fn upsert_meta_overwrites() {
	let conn = setup();
	semantic_repo::upsert_meta(&conn, "key1", "old").unwrap();
	semantic_repo::upsert_meta(&conn, "key1", "new").unwrap();

	let val = semantic_repo::get_meta(&conn, "key1").unwrap();
	assert_eq!(val.as_deref(), Some("new"));
}

// --- count_chunks / count_sources ---

#[test]
fn count_chunks_and_sources() {
	let conn = setup();
	assert_eq!(semantic_repo::count_chunks(&conn).unwrap(), 0);
	assert_eq!(semantic_repo::count_sources(&conn).unwrap(), 0);

	semantic_repo::insert_chunk(&conn, "k1", "a.md", "t1", None, 1, 5, "h1", b"e", 1000)
		.unwrap();
	semantic_repo::insert_chunk(&conn, "k2", "a.md", "t2", None, 6, 10, "h2", b"e", 1000)
		.unwrap();
	semantic_repo::insert_chunk(&conn, "k3", "b.md", "t3", None, 1, 5, "h3", b"e", 1000)
		.unwrap();

	assert_eq!(semantic_repo::count_chunks(&conn).unwrap(), 3);
	assert_eq!(semantic_repo::count_sources(&conn).unwrap(), 2);
}

// --- get_sample_chunks ---

#[test]
fn get_sample_chunks_returns_limited_results() {
	let conn = setup();
	semantic_repo::insert_chunk(
		&conn, "k1", "a.md", "t1", Some("H1"), 1, 5, "h1", b"embed", 1000,
	)
	.unwrap();
	semantic_repo::insert_chunk(&conn, "k2", "b.md", "t2", None, 1, 5, "h2", b"embed", 1000)
		.unwrap();
	semantic_repo::insert_chunk(&conn, "k3", "c.md", "t3", None, 1, 5, "h3", b"embed", 1000)
		.unwrap();

	let samples = semantic_repo::get_sample_chunks(&conn, 2).unwrap();
	assert_eq!(samples.len(), 2);
	assert_eq!(samples[0].source_path, "a.md");
	assert_eq!(samples[0].heading.as_deref(), Some("H1"));
	assert_eq!(samples[0].embedding_bytes_len, 5); // b"embed" = 5 bytes
}

#[test]
fn get_sample_chunks_empty() {
	let conn = setup();
	let samples = semantic_repo::get_sample_chunks(&conn, 10).unwrap();
	assert!(samples.is_empty());
}

// --- delete_orphaned_mtimes ---

#[test]
fn delete_orphaned_mtimes_removes_stale_entries() {
	let conn = setup();
	semantic_repo::upsert_mtimes(
		&conn,
		&[
			("a.md".to_string(), 100),
			("b.md".to_string(), 200),
			("deleted.md".to_string(), 300),
		],
	)
	.unwrap();

	let existing: HashSet<&str> = ["a.md", "b.md"].iter().copied().collect();
	let deleted = semantic_repo::delete_orphaned_mtimes(&conn, &existing).unwrap();
	assert_eq!(deleted, 1);

	let map = semantic_repo::get_stored_mtimes(&conn).unwrap();
	assert_eq!(map.len(), 2);
	assert!(map.contains_key("a.md"));
	assert!(map.contains_key("b.md"));
	assert!(!map.contains_key("deleted.md"));
}

#[test]
fn delete_orphaned_mtimes_no_orphans() {
	let conn = setup();
	semantic_repo::upsert_mtimes(
		&conn,
		&[("a.md".to_string(), 100), ("b.md".to_string(), 200)],
	)
	.unwrap();

	let existing: HashSet<&str> = ["a.md", "b.md"].iter().copied().collect();
	let deleted = semantic_repo::delete_orphaned_mtimes(&conn, &existing).unwrap();
	assert_eq!(deleted, 0);

	let map = semantic_repo::get_stored_mtimes(&conn).unwrap();
	assert_eq!(map.len(), 2);
}

#[test]
fn delete_orphaned_mtimes_empty_table() {
	let conn = setup();
	let existing: HashSet<&str> = ["a.md"].iter().copied().collect();
	let deleted = semantic_repo::delete_orphaned_mtimes(&conn, &existing).unwrap();
	assert_eq!(deleted, 0);
}

#[test]
fn delete_orphaned_mtimes_preserves_non_mtime_meta() {
	let conn = setup();
	semantic_repo::upsert_meta(&conn, "model_hash", "abc123").unwrap();
	semantic_repo::upsert_mtimes(&conn, &[("orphan.md".to_string(), 100)]).unwrap();

	let existing: HashSet<&str> = HashSet::new();
	let deleted = semantic_repo::delete_orphaned_mtimes(&conn, &existing).unwrap();
	assert_eq!(deleted, 1);

	// model_hash should still exist
	let val = semantic_repo::get_meta(&conn, "model_hash").unwrap();
	assert_eq!(val.as_deref(), Some("abc123"));
}
