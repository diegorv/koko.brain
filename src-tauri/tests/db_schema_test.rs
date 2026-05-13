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
fn fts_tokenize_clause_uses_unicode61_remove_diacritics_2() {
	// The migration in create_tables rebuilds the FTS table with the
	// unicode61 remove_diacritics 2 tokenizer. Verify against sqlite_master.
	let conn = open_memory_db();
	let sql: String = conn
		.query_row(
			"SELECT sql FROM sqlite_master WHERE type='table' AND name='notes_fts'",
			[],
			|row| row.get(0),
		)
		.expect("notes_fts table missing");
	assert!(
		sql.contains("unicode61 remove_diacritics 2"),
		"FTS table tokenize clause not migrated, got: {sql}"
	);
}

#[test]
fn fts_diacritic_match_folds_pt_br_terms() {
	// End-to-end: insert a row containing the unfolded PT-BR word and confirm
	// the FTS index matches the diacritic-free query, which is the whole point
	// of the v2-unicode61 migration.
	let conn = open_memory_db();
	conn.execute(
		"INSERT INTO notes_fts(path, title, content, headings, tags)
		 VALUES (?1, ?2, ?3, ?4, ?5)",
		rusqlite::params!["a.md", "Ação", "Texto sobre ação coletiva.", "", ""],
	)
	.unwrap();
	let count: i64 = conn
		.query_row(
			"SELECT COUNT(*) FROM notes_fts WHERE notes_fts MATCH 'acao'",
			[],
			|row| row.get(0),
		)
		.unwrap();
	assert_eq!(count, 1, "expected diacritic-free query to match 'ação'");
}

#[test]
fn fts_schema_version_persisted_in_app_meta() {
	let conn = open_memory_db();
	let val: String = conn
		.query_row(
			"SELECT value FROM app_meta WHERE key = 'fts_schema_version'",
			[],
			|row| row.get(0),
		)
		.expect("fts_schema_version not stored");
	assert!(val.starts_with("v"), "unexpected version value: {val}");
}

#[test]
fn create_tables_skips_fts_rebuild_on_second_call() {
	// Insert a row, call create_tables again — version matches, table is
	// preserved, row survives. Guards against a regression where the migration
	// runs unconditionally and wipes a populated index on every app launch.
	let conn = open_memory_db();
	conn.execute(
		"INSERT INTO notes_fts(path, title, content, headings, tags)
		 VALUES ('a.md', 't', 'c', '', '')",
		[],
	)
	.unwrap();
	create_tables(&conn).unwrap();
	let count: i64 = conn
		.query_row("SELECT COUNT(*) FROM notes_fts", [], |row| row.get(0))
		.unwrap();
	assert_eq!(count, 1, "second create_tables call wiped the FTS table");
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
