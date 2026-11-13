---
summary: "Vault SQLite database: connections, schema with migrations, and per-domain SQL repositories."
---

## Responsibility

Owns the vault's SQLite database at .kokobrain/kokobrain.db: opening and closing it, the two process-wide connections (a general one and a dedicated FTS one), the schema and its migrations, and the transaction helpers. Each repository file holds the SQL for one domain (history snapshots, semantic chunks and metadata, the FTS5 note index, Todoist sync state and log) as plain functions over a &rusqlite::Connection. It does not own the feature logic (indexing, embedding, diffing, sync), which lives in commands, search and semantic. It emits no events and exposes no Tauri commands.

## Key files

- `src-tauri/src/db/mod.rs`: open_database, close_database, is_open, the two static connection slots, the with_db, with_fts_db and transaction accessors including the vault-checked variants, and checkpoint_fts_wal.
- `src-tauri/src/db/schema.rs`: create_tables: all table and index statements, the in-place column migrations and the versioned FTS5 rebuild keyed in app_meta.
- `src-tauri/src/db/fts_repo.rs`: notes_content and notes_fts operations: insert, delete, rename, match query, entry mtimes, counts and vocabulary expansion.
- `src-tauri/src/db/semantic_repo.rs`: chunks table and semantic metadata: chunk insert and delete per source, embedding loads, mtime bookkeeping, path rename and orphan cleanup, model meta.
- `src-tauri/src/db/history_repo.rs`: snapshots table: latest hash lookup for dedupe, insert, list, fetch content and retention deletes.
- `src-tauri/src/db/todoist_repo.rs`: Todoist key-value, task link, section link and sync log tables, including apply_commit and the bounded log append.

## State

- SQLite file <vault>/.kokobrain/kokobrain.db in WAL mode with a 5000 ms busy_timeout; the FTS connection also sets synchronous NORMAL (mod.rs).
- Process-wide static slots DB and FTS_DB, each a Mutex<Option<Connection>> (mod.rs).
- Tables snapshots, app_meta, chunks, semantic_meta, todoist_kv, todoist_task_link, todoist_section_link and todoist_sync_log, plus notes_content with the FTS5 virtual tables notes_fts and notes_fts_vocab (schema.rs).

## Collaborators

- `src-tauri/src/commands`: db.rs opens and closes the database; history.rs, todoist.rs, search_index.rs and semantic.rs call the accessors and repositories.
- `src-tauri/src/search`: search/fuzzy.rs calls fts_repo::expand_vocab_terms; search_index.rs passes search::fts_logic::extract_title into fts_repo::rename_entries as a callback.
- `src-tauri/src/utils`: db/mod.rs, fts_repo.rs and semantic_repo.rs write through utils::logger::debug_log.
- `src-tauri/src`: lib.rs calls db::is_open to gate the quick-capture hotkeys.
- `src-tauri/tests`: Database, FTS, history, Todoist and concurrency tests open real databases through kokobrain_lib::db.

## Gotchas

- Two connections point at the same file: DB (history, semantic, Todoist) and FTS_DB (search_index, fuzzy expansion and the rename re-key, which also touches the chunks table). They have separate Mutexes so a long FTS rebuild does not block the others. SQLite serializes writers and busy_timeout is 5000 ms.
- A closure passed to with_db, with_fts_db or a transaction helper holds that connection's Mutex for its whole duration, so long batches block other callers of the same connection.
- Only the Todoist commands use the vault-checked variants with_vault_db and with_vault_db_transaction, which compare the canonical database path of the open connection with <vault_path>/.kokobrain/kokobrain.db and refuse a mismatch. History, semantic and search commands do not check which vault is open.
- Changing FTS_SCHEMA_VERSION in schema.rs drops and recreates notes_content, notes_fts and notes_fts_vocab, so indexed rows are lost until the next search index build repopulates them. Plain column additions use ALTER TABLE and swallow only the duplicate-column error.
- Repository functions return Result<_, String> with messages built by format!. Transaction helpers run BEGIN IMMEDIATE and roll back on any closure error.
- Accessors return 'Database not open' (or 'FTS database not open' on the FTS connection) when no vault database is loaded; is_open() lets callers such as lib.rs test for that state without an error.
- The Todoist sync log is bounded by SYNC_LOG_LIMIT: append_log prunes older rows after inserting, and an entry whose replace_id names the newest row rewrites it instead of adding one.
