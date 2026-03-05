use kokobrain_lib::db::schema::create_tables;
use rusqlite::Connection;

fn open_memory_db() -> Connection {
	let conn = Connection::open_in_memory().unwrap();
	create_tables(&conn).unwrap();
	conn
}

#[test]
fn create_tables_succeeds() {
	let conn = Connection::open_in_memory().unwrap();
	let result = create_tables(&conn);
	assert!(result.is_ok());
}

#[test]
fn create_tables_idempotent() {
	let conn = Connection::open_in_memory().unwrap();
	create_tables(&conn).unwrap();
	let result = create_tables(&conn);
	assert!(result.is_ok(), "calling create_tables twice should not fail");
}

#[test]
fn snapshots_table_exists() {
	let conn = open_memory_db();
	let count: i64 = conn
		.query_row(
			"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='snapshots'",
			[],
			|row| row.get(0),
		)
		.unwrap();
	assert_eq!(count, 1);
}

#[test]
fn notes_fts_table_exists() {
	let conn = open_memory_db();
	let count: i64 = conn
		.query_row(
			"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notes_fts'",
			[],
			|row| row.get(0),
		)
		.unwrap();
	assert_eq!(count, 1);
}

#[test]
fn notes_fts_vocab_table_exists() {
	let conn = open_memory_db();
	let count: i64 = conn
		.query_row(
			"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='notes_fts_vocab'",
			[],
			|row| row.get(0),
		)
		.unwrap();
	assert_eq!(count, 1);
}

#[test]
fn chunks_table_exists() {
	let conn = open_memory_db();
	let count: i64 = conn
		.query_row(
			"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='chunks'",
			[],
			|row| row.get(0),
		)
		.unwrap();
	assert_eq!(count, 1);
}

#[test]
fn semantic_meta_table_exists() {
	let conn = open_memory_db();
	let count: i64 = conn
		.query_row(
			"SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='semantic_meta'",
			[],
			|row| row.get(0),
		)
		.unwrap();
	assert_eq!(count, 1);
}

#[test]
fn snapshots_indices_exist() {
	let conn = open_memory_db();
	let indices: Vec<String> = conn
		.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='snapshots'")
		.unwrap()
		.query_map([], |row| row.get(0))
		.unwrap()
		.filter_map(|r| r.ok())
		.collect();
	assert!(indices.contains(&"idx_snapshots_path".to_string()));
	assert!(indices.contains(&"idx_snapshots_dedup".to_string()));
}

#[test]
fn chunks_indices_exist() {
	let conn = open_memory_db();
	let indices: Vec<String> = conn
		.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='chunks'")
		.unwrap()
		.query_map([], |row| row.get(0))
		.unwrap()
		.filter_map(|r| r.ok())
		.collect();
	assert!(indices.contains(&"idx_chunks_source".to_string()));
	assert!(indices.contains(&"idx_chunks_hash".to_string()));
}
