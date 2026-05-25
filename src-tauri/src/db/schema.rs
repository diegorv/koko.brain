use rusqlite::{Connection, OptionalExtension};

/// Bumping this constant triggers a one-shot rebuild of the FTS5 virtual
/// table on the next `open_database` call: the old table + vocab get dropped
/// and a fresh one is created with the matching `tokenize=` clause, then the
/// `build_search_index` flow on app startup repopulates from disk.
///
/// `v2-unicode61`: `tokenize='unicode61 remove_diacritics 2'` — folds
/// "ação" / "acao", "ñ" / "n", etc. for PT-BR retrieval.
const FTS_SCHEMA_VERSION: &str = "v2-unicode61";

/// FTS5 `tokenize=` clause used when (re)creating the virtual table.
const FTS_TOKENIZE: &str = "unicode61 remove_diacritics 2";

/// Creates all application tables if they don't exist.
/// Called once during `open_database()`.
pub fn create_tables(conn: &Connection) -> Result<(), String> {
	conn.execute_batch(
		"
		-- File History: snapshots
		CREATE TABLE IF NOT EXISTS snapshots (
			id          INTEGER PRIMARY KEY AUTOINCREMENT,
			file_path   TEXT NOT NULL,
			content     TEXT NOT NULL,
			hash        TEXT NOT NULL,
			size        INTEGER NOT NULL,
			created_at  INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_snapshots_path
			ON snapshots(file_path, created_at DESC);
		CREATE INDEX IF NOT EXISTS idx_snapshots_dedup
			ON snapshots(file_path, hash);

		-- App-wide metadata (schema versions, feature flags, ...)
		CREATE TABLE IF NOT EXISTS app_meta (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);

		-- Semantic Search: embedding chunks
		CREATE TABLE IF NOT EXISTS chunks (
			key             TEXT PRIMARY KEY,
			source_path     TEXT NOT NULL,
			content         TEXT NOT NULL,
			heading         TEXT,
			parent_headings TEXT NOT NULL DEFAULT '[]',
			line_start      INTEGER NOT NULL,
			line_end        INTEGER NOT NULL,
			content_hash    TEXT NOT NULL,
			embedding       BLOB NOT NULL,
			embedded_at     INTEGER NOT NULL
		);
		CREATE INDEX IF NOT EXISTS idx_chunks_source ON chunks(source_path);
		CREATE INDEX IF NOT EXISTS idx_chunks_hash ON chunks(content_hash);

		-- Semantic Search: metadata (model version tracking)
		CREATE TABLE IF NOT EXISTS semantic_meta (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		);
	",
	)
	.map_err(|e| format!("Failed to create tables: {e}"))?;

	// Migration: add `parent_headings` column to pre-existing `chunks` tables.
	// SQLite has no `IF NOT EXISTS` on `ADD COLUMN`, so we attempt the ALTER and
	// swallow the "duplicate column" error. Any other error is propagated.
	if let Err(e) = conn.execute(
		"ALTER TABLE chunks ADD COLUMN parent_headings TEXT NOT NULL DEFAULT '[]'",
		[],
	) {
		let msg = e.to_string();
		if !msg.contains("duplicate column name") {
			return Err(format!("Failed to add parent_headings column: {msg}"));
		}
	}

	// FTS5 schema migration. `tokenize=` is fixed at table creation, so when
	// the stored version doesn't match the current one we drop + recreate.
	// The FTS rebuild path in `commands/search_index::build_search_index`
	// runs on app startup and refills the table from disk.
	let stored = get_app_meta(conn, "fts_schema_version")?;
	if stored.as_deref() != Some(FTS_SCHEMA_VERSION) {
		conn.execute_batch(&format!(
			"DROP TABLE IF EXISTS notes_fts_vocab;
			 DROP TABLE IF EXISTS notes_fts;
			 CREATE VIRTUAL TABLE notes_fts USING fts5(
				path,
				title,
				content,
				headings,
				tags,
				tokenize='{tok}'
			 );
			 CREATE VIRTUAL TABLE notes_fts_vocab USING fts5vocab(notes_fts, instance);",
			tok = FTS_TOKENIZE
		))
		.map_err(|e| format!("Failed to migrate FTS5 schema: {e}"))?;
		set_app_meta(conn, "fts_schema_version", FTS_SCHEMA_VERSION)?;
	}

	Ok(())
}

/// Reads a value from the `app_meta` table.
fn get_app_meta(conn: &Connection, key: &str) -> Result<Option<String>, String> {
	conn.query_row("SELECT value FROM app_meta WHERE key = ?1", [key], |row| {
		row.get::<_, String>(0)
	})
	.optional()
	.map_err(|e| format!("Failed to read app_meta: {e}"))
}

/// Upserts a value in the `app_meta` table.
fn set_app_meta(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
	conn.execute(
		"INSERT INTO app_meta (key, value) VALUES (?1, ?2)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
		rusqlite::params![key, value],
	)
	.map_err(|e| format!("Failed to write app_meta: {e}"))?;
	Ok(())
}

#[cfg(test)]
mod tests {
	use super::create_tables;
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
		assert_eq!(count, 1, "expected diacritic-free query to match 'acao'");
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
}
