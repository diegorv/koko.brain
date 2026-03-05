use rusqlite::Connection;

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

		-- Full-Text Search: FTS5 with BM25 (content-storing for snippet() support)
		CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
			path,
			title,
			content,
			headings,
			tags
		);

		-- FTS5 vocabulary table (for fuzzy search term expansion)
		CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts_vocab
			USING fts5vocab(notes_fts, instance);

		-- Semantic Search: embedding chunks
		CREATE TABLE IF NOT EXISTS chunks (
			key          TEXT PRIMARY KEY,
			source_path  TEXT NOT NULL,
			content      TEXT NOT NULL,
			heading      TEXT,
			line_start   INTEGER NOT NULL,
			line_end     INTEGER NOT NULL,
			content_hash TEXT NOT NULL,
			embedding    BLOB NOT NULL,
			embedded_at  INTEGER NOT NULL
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

	Ok(())
}
