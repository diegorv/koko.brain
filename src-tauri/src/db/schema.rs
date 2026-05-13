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
