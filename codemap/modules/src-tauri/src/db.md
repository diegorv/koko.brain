# module card src-tauri/src/db
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src-tauri/src/db ' codemap/modules
module src-tauri/src/db rust files 6 in-modules 3 out-modules 1 pub 57/59 ipc 0/0 card ~4.3k
## neighbors
dep src-tauri/src -> src-tauri/src/db 1
dep src-tauri/src/commands -> src-tauri/src/db 10
dep src-tauri/src/search -> src-tauri/src/db 1
dep src-tauri/src/db -> src-tauri/src/utils 3
in2 src-tauri/src/db 0 modules: -
out2 src-tauri/src/db 0 modules: -
## entry files
entry src-tauri/src/db/mod.rs ext-in6 src-tauri/src/commands/db.rs src-tauri/src/commands/history.rs src-tauri/src/commands/search_index.rs src-tauri/src/commands/semantic.rs src-tauri/src/commands/todoist.rs more importers 1 not shown: src-tauri/src(1): q importers src-tauri/src/db/mod.rs
entry src-tauri/src/db/fts_repo.rs ext-in2 src-tauri/src/commands/search_index.rs src-tauri/src/search/fuzzy.rs
entry src-tauri/src/db/semantic_repo.rs ext-in2 src-tauri/src/commands/search_index.rs src-tauri/src/commands/semantic.rs
entry src-tauri/src/db/history_repo.rs ext-in1 src-tauri/src/commands/history.rs
entry src-tauri/src/db/todoist_repo.rs ext-in1 src-tauri/src/commands/todoist.rs
## files
file src-tauri/src/db/fts_repo.rs rust L274 module src-tauri/src/db in2 t3
file src-tauri/src/db/history_repo.rs rust L234 module src-tauri/src/db in1 t0 t:inline
file src-tauri/src/db/mod.rs rust L252 module src-tauri/src/db in6 t8
file src-tauri/src/db/schema.rs rust L446 module src-tauri/src/db in0 t1 t:inline
file src-tauri/src/db/semantic_repo.rs rust L842 module src-tauri/src/db in2 t2 t:inline
file src-tauri/src/db/todoist_repo.rs rust L266 module src-tauri/src/db in1 t0 | SQL over the Todoist sync tables (`todoist_kv`, `todoist_task_link`, `todoist_section_link`, `todoist_sync_log`), created in `schema::create_tables`.
## public
sym src-tauri/src/db/fts_repo.rs:9 struct FtsSearchResult L14 dto:FtsSearchResult | A single FTS5 search result with BM25 score and snippet.
sym src-tauri/src/db/fts_repo.rs:33 fn clear_index(conn: &Connection) -> Result<(), String> L7 | Deletes all entries from both the content table and the FTS5 index.
sym src-tauri/src/db/fts_repo.rs:48 fn insert_entry(conn: &Connection, path: &str, title: &str, content: &str, headings: &str, tags: &str, mtime: i64,) -> Result<(), Stri… L25 | Inserts a single entry into the content table and the FTS5 index.
sym src-tauri/src/db/fts_repo.rs:75 fn search_match(conn: &Connection, fts_query: &str, limit: usize,) -> Result<Vec<FtsSearchResult>, String> L40 | Searches the FTS5 index using BM25 ranking with the given MATCH query.
sym src-tauri/src/db/fts_repo.rs:122 fn delete_entry(conn: &Connection, path: &str) -> Result<(), String> L23 | Deletes a single entry from the FTS5 index by path.
sym src-tauri/src/db/fts_repo.rs:161 fn rename_entries(conn: &Connection, from: &str, to: &str, title_of: impl Fn(&str) -> String,) -> Result<usize, String> L57 | Re-keys the row at `from` and every row under `from + '/'` to the same place under `to`, keeping rowid, content and mtime.
sym src-tauri/src/db/fts_repo.rs:223 fn get_entry_mtimes(conn: &Connection) -> Result<HashMap<String, i64>, String> L20 | Reads every indexed `path -> mtime` pair out of the content table.
sym src-tauri/src/db/fts_repo.rs:245 fn count_entries(conn: &Connection) -> Result<u64, String> L4 | Counts the total number of documents in the content table.
sym src-tauri/src/db/fts_repo.rs:252 fn expand_vocab_terms(conn: &Connection, like_pattern: &str, limit: usize,) -> Result<Vec<String>, String> L23 | Queries the FTS5 vocabulary table for terms matching the given LIKE pattern.
sym src-tauri/src/db/history_repo.rs:7 struct SnapshotInfo L8 dto:SnapshotInfo | Metadata for a single snapshot (without content, for listing).
sym src-tauri/src/db/history_repo.rs:18 fn find_latest_hash(conn: &Connection, file_path: &str) -> Result<Option<String>, String> L9 | Returns the hash of the most recent snapshot for a given file, if any.
sym src-tauri/src/db/history_repo.rs:29 fn insert_snapshot(conn: &Connection, file_path: &str, content: &str, hash: &str, size: i64, created_at: i64,) -> Result<(), String> L15 | Inserts a new snapshot row.
sym src-tauri/src/db/history_repo.rs:46 fn list_snapshots(conn: &Connection, file_path: &str) -> Result<Vec<SnapshotInfo>, String> L23 | Lists all snapshots for a file, newest first.
sym src-tauri/src/db/history_repo.rs:71 fn get_snapshot_by_id(conn: &Connection, snapshot_id: i64) -> Result<String, String> L8 | Reads the full content of a specific snapshot by ID.
sym src-tauri/src/db/history_repo.rs:82 fn delete_old_snapshots(conn: &Connection, cutoff_ms: i64) -> Result<u32, String> L8 | Deletes all snapshots older than `cutoff_ms` (milliseconds since epoch).
sym src-tauri/src/db/history_repo.rs:93 fn delete_medium_duplicates(conn: &Connection, cutoff_daily: i64, cutoff_recent: i64,) -> Result<u32, String> L17 | In the medium range (cutoff_daily..cutoff_recent), keeps only the latest snapshot per day per file.
sym src-tauri/src/db/mod.rs:37 fn open_database(vault_path: &Path) -> Result<(), String> L53 | Opens (or creates) the SQLite database at `{vault_path}/.kokobrain/kokobrain.db`.
sym src-tauri/src/db/mod.rs:92 fn close_database() -> Result<(), String> L9 | Closes both database connections and releases resources.
sym src-tauri/src/db/mod.rs:105 fn is_open() -> bool L3 | Returns true when a vault database connection is currently open.
sym src-tauri/src/db/mod.rs:111 fn with_db(f: F) -> Result<T, String> L8 | Runs a closure with a reference to the open database connection.
sym src-tauri/src/db/mod.rs:122 fn with_db_transaction(label: &str, f: F) -> Result<T, String> L8 | Runs a closure inside a SQL transaction (BEGIN/COMMIT/ROLLBACK).
sym src-tauri/src/db/mod.rs:135 fn with_vault_db(vault_path: &str, f: F) -> Result<T, String> L9 | [`with_db`] for a caller that names the vault it believes is open: refuses with an error when `vault_path` is not the vault whose database is open, so a backgr…
sym src-tauri/src/db/mod.rs:146 fn with_vault_db_transaction(vault_path: &str, label: &str, f: F) -> Result<T, String> L9 | [`with_db_transaction`] with the open-vault check of [`with_vault_db`].
sym src-tauri/src/db/mod.rs:206 fn with_fts_db(f: F) -> Result<T, String> L8 | Runs a closure with a reference to the open FTS database connection.
sym src-tauri/src/db/mod.rs:216 fn with_fts_db_transaction(label: &str, f: F) -> Result<T, String> L25 | FTS-connection counterpart of [`with_db_transaction`].
sym src-tauri/src/db/mod.rs:245 fn checkpoint_fts_wal() -> Result<(), String> L8 | Runs a WAL checkpoint on the FTS connection.
sym src-tauri/src/db/semantic_repo.rs:29 fn clear_all_chunks(conn: &Connection) -> Result<(), String> L5 | Deletes all chunks from the index.
sym src-tauri/src/db/semantic_repo.rs:37 fn get_stored_mtimes(conn: &Connection) -> Result<HashMap<String, i64>, String> L28 | Loads all stored mtimes from the semantic_meta table.
sym src-tauri/src/db/semantic_repo.rs:67 fn upsert_mtimes(conn: &Connection, entries: &[(String, i64)]) -> Result<(), String> L10 | Stores mtimes for a batch of files.
sym src-tauri/src/db/semantic_repo.rs:79 fn delete_chunk_by_key(conn: &Connection, key: &str) -> Result<(), String> L5 | Deletes a single chunk by its unique key.
sym src-tauri/src/db/semantic_repo.rs:88 fn delete_chunks_for_path(conn: &Connection, source_path: &str) -> Result<usize, String> L7 | Deletes all chunks for a given source file path.
sym src-tauri/src/db/semantic_repo.rs:99 fn insert_chunk(conn: &Connection, key: &str, source_path: &str, content: &str, heading: Option<&str>, parent_headings: &[String], lin… L33 | Inserts (or replaces) a single chunk with its embedding.
sym src-tauri/src/db/semantic_repo.rs:136 fn get_chunk_hashes_for_path(conn: &Connection, source_path: &str) -> Result<HashMap<String, String>, String> L19 | Returns content hashes for all chunks of a given source file.
sym src-tauri/src/db/semantic_repo.rs:161 fn get_chunk_embedding(conn: &Connection, key: &str, content_hash: &str) -> Result<Option<(Vec<u8>, i64)>, String> L9 | Returns the raw embedding bytes and `embedded_at` of the chunk stored under `key` with `content_hash`, or `None` when no such row exists.
sym src-tauri/src/db/semantic_repo.rs:173 fn load_all_embeddings(conn: &Connection) -> Result<Vec<ChunkRow>, String> L33 | Loads all chunk rows with their raw embedding bytes.
sym src-tauri/src/db/semantic_repo.rs:208 fn get_distinct_sources(conn: &Connection) -> Result<Vec<String>, String> L17 | Returns all distinct source paths currently indexed.
sym src-tauri/src/db/semantic_repo.rs:228 fn get_meta(conn: &Connection, key: &str) -> Result<Option<String>, String> L9 | Gets a value from the semantic_meta table by key.
sym src-tauri/src/db/semantic_repo.rs:239 fn upsert_meta(conn: &Connection, key: &str, value: &str) -> Result<(), String> L8 | Inserts or replaces a value in the semantic_meta table.
sym src-tauri/src/db/semantic_repo.rs:255 fn delete_mtime(conn: &Connection, rel_path: &str) -> Result<usize, String> L7 | Deletes the stored mtime for a single file (the `mtime:<rel_path>` key).
sym src-tauri/src/db/semantic_repo.rs:277 fn rename_paths(conn: &Connection, from: &str, to: &str) -> Result<usize, String> L37 | Re-keys the chunks and the `mtime:` key of the file at `from` and of every file under `from + '/'` to the same place under `to`.
sym src-tauri/src/db/semantic_repo.rs:317 fn delete_orphaned_mtimes(conn: &Connection, existing_paths: &HashSet<&str>,) -> Result<u32, String> L31 | Deletes mtime entries from semantic_meta for files no longer in the vault.
sym src-tauri/src/db/semantic_repo.rs:350 fn count_chunks(conn: &Connection) -> Result<u64, String> L4 | Counts total chunks in the index.
sym src-tauri/src/db/semantic_repo.rs:356 fn count_sources(conn: &Connection) -> Result<u64, String> L8 | Counts distinct source files in the index.
sym src-tauri/src/db/semantic_repo.rs:368 fn get_file_index_info(conn: &Connection, source_path: &str,) -> Result<(u64, Option<i64>), String> L15 | Returns indexing info for a single source file: number of chunks and the most recent `embedded_at` timestamp (None if the file has no chunks).
sym src-tauri/src/db/todoist_repo.rs:8 const SYNC_LOG_LIMIT L1 | Rows `todoist_sync_log` keeps; older rows are dropped on append.
sym src-tauri/src/db/todoist_repo.rs:14 struct TodoistKvEntry L6 dto:TodoistKvEntry | One `todoist_kv` row: a scalar of the sync state (`sync_token`, `user_id`, ...).
sym src-tauri/src/db/todoist_repo.rs:25 struct TodoistTaskLink L20 dto:TodoistTaskLink | One `todoist_task_link` row: the link between an anchored task line and its Todoist item.
sym src-tauri/src/db/todoist_repo.rs:51 struct TodoistSectionLink L8 dto:TodoistSectionLink | One `todoist_section_link` row: a Todoist section and the `##` heading of its project note.
sym src-tauri/src/db/todoist_repo.rs:65 struct TodoistStateCommit L16 dto:TodoistStateCommit | One state commit applied in a single transaction: kv rows (the `sync_token` among them), link upserts and deletes, section link upserts and deletes.
sym src-tauri/src/db/todoist_repo.rs:86 struct TodoistSyncLogInput L14 dto:TodoistSyncLogInput | A sync log entry to append; the time is set when it is stored.
sym src-tauri/src/db/todoist_repo.rs:105 struct TodoistSyncLogEntry L12 dto:TodoistSyncLogEntry | One stored `todoist_sync_log` row.
sym src-tauri/src/db/todoist_repo.rs:119 fn read_kv(conn: &Connection) -> Result<Vec<TodoistKvEntry>, String> L9 | Every kv row, sorted by key.
sym src-tauri/src/db/todoist_repo.rs:130 fn read_links(conn: &Connection) -> Result<Vec<TodoistTaskLink>, String> L24 | Every link, sorted by anchor.
sym src-tauri/src/db/todoist_repo.rs:157 fn apply_commit(conn: &Connection, commit: &TodoistStateCommit) -> Result<(), String> L47 | Applies `commit` on `conn`.
sym src-tauri/src/db/todoist_repo.rs:206 fn read_sections(conn: &Connection) -> Result<Vec<TodoistSectionLink>, String> L11 | Every section link, sorted by section id.
sym src-tauri/src/db/todoist_repo.rs:221 fn append_log(conn: &Connection, entries: &[TodoistSyncLogInput], created_at: i64) -> Result<(), String> L27 | Appends `entries` stamped with `created_at`, then drops every row older than the newest [`SYNC_LOG_LIMIT`].
sym src-tauri/src/db/todoist_repo.rs:250 fn read_log(conn: &Connection, limit: i64) -> Result<Vec<TodoistSyncLogEntry>, String> L17 | The newest `limit` log rows, newest first.
## effects
fx-count rust-db.execute 45
fx-count rust-fs.create_dir_all 1
## debt
-
