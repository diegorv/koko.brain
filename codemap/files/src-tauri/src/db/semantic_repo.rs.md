# file card src-tauri/src/db/semantic_repo.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/db/semantic_repo.rs ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src-tauri/src/db/semantic_repo.rs rust L842 module src-tauri/src/db in2 t2 t:inline
## imports
imp src-tauri/src/db/semantic_repo.rs:1 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/commands/search_index.rs:284 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/search_index.rs:285 -> src-tauri/src/db/semantic_repo.rs delete_mtime
imp src-tauri/src/commands/search_index.rs:288 -> src-tauri/src/db/semantic_repo.rs rename_paths
imp src-tauri/src/commands/semantic.rs:167 -> src-tauri/src/db/semantic_repo.rs load_all_embeddings
imp src-tauri/src/commands/semantic.rs:522 -> src-tauri/src/db/semantic_repo.rs clear_all_chunks
imp src-tauri/src/commands/semantic.rs:526 -> src-tauri/src/db/semantic_repo.rs get_stored_mtimes
imp src-tauri/src/commands/semantic.rs:732 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:741 -> src-tauri/src/db/semantic_repo.rs insert_chunk
imp src-tauri/src/commands/semantic.rs:758 -> src-tauri/src/db/semantic_repo.rs upsert_mtimes
imp src-tauri/src/commands/semantic.rs:1239 -> src-tauri/src/db/semantic_repo.rs get_file_index_info
imp src-tauri/src/commands/semantic.rs:1285 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:1286 -> src-tauri/src/db/semantic_repo.rs delete_mtime
imp src-tauri/src/commands/semantic.rs:1317 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:1329 -> src-tauri/src/db/semantic_repo.rs get_chunk_hashes_for_path
imp src-tauri/src/commands/semantic.rs:1351 -> src-tauri/src/db/semantic_repo.rs get_chunk_embedding
imp src-tauri/src/commands/semantic.rs:1416 -> src-tauri/src/db/semantic_repo.rs delete_chunk_by_key
imp src-tauri/src/commands/semantic.rs:1422 -> src-tauri/src/db/semantic_repo.rs insert_chunk
imp src-tauri/src/commands/semantic.rs:1448 -> src-tauri/src/db/semantic_repo.rs insert_chunk
imp src-tauri/src/commands/semantic.rs:1505 -> src-tauri/src/db/semantic_repo.rs upsert_mtimes
imp src-tauri/src/commands/semantic.rs:1514 -> src-tauri/src/db/semantic_repo.rs count_chunks
imp src-tauri/src/commands/semantic.rs:1515 -> src-tauri/src/db/semantic_repo.rs count_sources
imp src-tauri/src/commands/semantic.rs:1534 -> src-tauri/src/db/semantic_repo.rs get_distinct_sources
imp src-tauri/src/commands/semantic.rs:1539 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:1549 -> src-tauri/src/db/semantic_repo.rs delete_orphaned_mtimes
imp src-tauri/src/commands/semantic.rs:1588 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/semantic.rs:1590 -> src-tauri/src/db/semantic_repo.rs upsert_mtimes
imp src-tauri/src/commands/semantic.rs:1635 -> src-tauri/src/db/semantic_repo.rs get_meta
imp src-tauri/src/commands/semantic.rs:1640 -> src-tauri/src/db/semantic_repo.rs upsert_meta
## reach
in2 src-tauri/src/db/semantic_repo.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/db/semantic_repo.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/search_rekey_test.rs imports src-tauri/src/db/semantic_repo.rs
test src-tauri/tests/semantic_commands_test.rs imports src-tauri/src/db/semantic_repo.rs
## symbols
sym src-tauri/src/db/semantic_repo.rs:6 struct ChunkRow L10 | Raw chunk data loaded from DB (before embedding deserialization).
sym src-tauri/src/db/semantic_repo.rs:29 fn clear_all_chunks(conn: &Connection) -> Result<(), String> L5 | Deletes all chunks from the index.
by src-tauri/src/db/semantic_repo.rs:clear_all_chunks <- src-tauri/src/commands/semantic.rs:522 in build_semantic_index_inner ref
sym src-tauri/src/db/semantic_repo.rs:37 fn get_stored_mtimes(conn: &Connection) -> Result<HashMap<String, i64>, String> L28 | Loads all stored mtimes from the semantic_meta table.
by src-tauri/src/db/semantic_repo.rs:get_stored_mtimes <- src-tauri/src/commands/semantic.rs:526 in build_semantic_index_inner ref
sym src-tauri/src/db/semantic_repo.rs:67 fn upsert_mtimes(conn: &Connection, entries: &[(String, i64)]) -> Result<(), String> L10 | Stores mtimes for a batch of files.
by src-tauri/src/db/semantic_repo.rs:upsert_mtimes <- src-tauri/src/commands/semantic.rs:758 in build_semantic_index_inner lexical +2
sym src-tauri/src/db/semantic_repo.rs:79 fn delete_chunk_by_key(conn: &Connection, key: &str) -> Result<(), String> L5 | Deletes a single chunk by its unique key.
by src-tauri/src/db/semantic_repo.rs:delete_chunk_by_key <- src-tauri/src/commands/semantic.rs:1416 in update_semantic_file lexical
sym src-tauri/src/db/semantic_repo.rs:88 fn delete_chunks_for_path(conn: &Connection, source_path: &str) -> Result<usize, String> L7 | Deletes all chunks for a given source file path.
by src-tauri/src/db/semantic_repo.rs:delete_chunks_for_path <- src-tauri/src/commands/search_index.rs:284 in rename_in_search_index_inner lexical
by src-tauri/src/db/semantic_repo.rs:delete_chunks_for_path <- src-tauri/src/commands/semantic.rs:732 in build_semantic_index_inner lexical +4
sym src-tauri/src/db/semantic_repo.rs:99 fn insert_chunk(conn: &Connection, key: &str, source_path: &str, content: &str, heading: Option<&str>, parent_headings: &[String], lin… L33 | Inserts (or replaces) a single chunk with its embedding.
by src-tauri/src/db/semantic_repo.rs:insert_chunk <- src-tauri/src/commands/semantic.rs:741 in build_semantic_index_inner lexical +2
sym src-tauri/src/db/semantic_repo.rs:136 fn get_chunk_hashes_for_path(conn: &Connection, source_path: &str) -> Result<HashMap<String, String>, String> L19 | Returns content hashes for all chunks of a given source file.
by src-tauri/src/db/semantic_repo.rs:get_chunk_hashes_for_path <- src-tauri/src/commands/semantic.rs:1329 in update_semantic_file lexical
sym src-tauri/src/db/semantic_repo.rs:161 fn get_chunk_embedding(conn: &Connection, key: &str, content_hash: &str) -> Result<Option<(Vec<u8>, i64)>, String> L9 | Returns the raw embedding bytes and `embedded_at` of the chunk stored under `key` with `content_hash`, or `None` when no such row exists.
by src-tauri/src/db/semantic_repo.rs:get_chunk_embedding <- src-tauri/src/commands/semantic.rs:1351 in update_semantic_file lexical
sym src-tauri/src/db/semantic_repo.rs:173 fn load_all_embeddings(conn: &Connection) -> Result<Vec<ChunkRow>, String> L33 | Loads all chunk rows with their raw embedding bytes.
by src-tauri/src/db/semantic_repo.rs:load_all_embeddings <- src-tauri/src/commands/semantic.rs:167 in get_or_load_cache lexical
sym src-tauri/src/db/semantic_repo.rs:208 fn get_distinct_sources(conn: &Connection) -> Result<Vec<String>, String> L17 | Returns all distinct source paths currently indexed.
by src-tauri/src/db/semantic_repo.rs:get_distinct_sources <- src-tauri/src/commands/semantic.rs:1534 in cleanup_orphaned_chunks lexical
sym src-tauri/src/db/semantic_repo.rs:228 fn get_meta(conn: &Connection, key: &str) -> Result<Option<String>, String> L9 | Gets a value from the semantic_meta table by key.
by src-tauri/src/db/semantic_repo.rs:get_meta <- src-tauri/src/commands/semantic.rs:1635 in check_and_update_model_hash lexical
sym src-tauri/src/db/semantic_repo.rs:239 fn upsert_meta(conn: &Connection, key: &str, value: &str) -> Result<(), String> L8 | Inserts or replaces a value in the semantic_meta table.
by src-tauri/src/db/semantic_repo.rs:upsert_meta <- src-tauri/src/commands/semantic.rs:1640 in check_and_update_model_hash lexical
sym src-tauri/src/db/semantic_repo.rs:255 fn delete_mtime(conn: &Connection, rel_path: &str) -> Result<usize, String> L7 | Deletes the stored mtime for a single file (the `mtime:<rel_path>` key).
by src-tauri/src/db/semantic_repo.rs:delete_mtime <- src-tauri/src/commands/search_index.rs:285 in rename_in_search_index_inner lexical
by src-tauri/src/db/semantic_repo.rs:delete_mtime <- src-tauri/src/commands/semantic.rs:1286 in remove_semantic_file lexical
sym src-tauri/src/db/semantic_repo.rs:277 fn rename_paths(conn: &Connection, from: &str, to: &str) -> Result<usize, String> L37 | Re-keys the chunks and the `mtime:` key of the file at `from` and of every file under `from + '/'` to the same place under `to`.
by src-tauri/src/db/semantic_repo.rs:rename_paths <- src-tauri/src/commands/search_index.rs:288 in rename_in_search_index_inner lexical
sym src-tauri/src/db/semantic_repo.rs:317 fn delete_orphaned_mtimes(conn: &Connection, existing_paths: &HashSet<&str>,) -> Result<u32, String> L31 | Deletes mtime entries from semantic_meta for files no longer in the vault.
by src-tauri/src/db/semantic_repo.rs:delete_orphaned_mtimes <- src-tauri/src/commands/semantic.rs:1549 in cleanup_orphaned_chunks lexical
sym src-tauri/src/db/semantic_repo.rs:350 fn count_chunks(conn: &Connection) -> Result<u64, String> L4 | Counts total chunks in the index.
by src-tauri/src/db/semantic_repo.rs:count_chunks <- src-tauri/src/commands/semantic.rs:1514 in get_semantic_stats_inner lexical
sym src-tauri/src/db/semantic_repo.rs:356 fn count_sources(conn: &Connection) -> Result<u64, String> L8 | Counts distinct source files in the index.
by src-tauri/src/db/semantic_repo.rs:count_sources <- src-tauri/src/commands/semantic.rs:1515 in get_semantic_stats_inner lexical
sym src-tauri/src/db/semantic_repo.rs:368 fn get_file_index_info(conn: &Connection, source_path: &str,) -> Result<(u64, Option<i64>), String> L15 | Returns indexing info for a single source file: number of chunks and the most recent `embedded_at` timestamp (None if the file has no chunks).
by src-tauri/src/db/semantic_repo.rs:get_file_index_info <- src-tauri/src/commands/semantic.rs:1239 in get_semantic_file_status lexical
## locals
local src-tauri/src/db/semantic_repo.rs:21 fn parse_parent_headings(raw: &str) -> Vec<String> L6
## calls
call src-tauri/src/db/semantic_repo.rs:59 in get_stored_mtimes -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/db/semantic_repo.rs:148 in get_chunk_hashes_for_path -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/db/semantic_repo.rs:188 in load_all_embeddings -> src-tauri/src/db/semantic_repo.rs:parse_parent_headings call
call src-tauri/src/db/semantic_repo.rs:198 in load_all_embeddings -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/db/semantic_repo.rs:218 in get_distinct_sources -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/db/semantic_repo.rs:330 in delete_orphaned_mtimes -> src-tauri/src/utils/logger.rs:debug_log lexical
## effects
fx src-tauri/src/db/semantic_repo.rs:30 rust-db.execute in clear_all_chunks
fx src-tauri/src/db/semantic_repo.rs:69 rust-db.execute in upsert_mtimes
fx src-tauri/src/db/semantic_repo.rs:80 rust-db.execute in delete_chunk_by_key
fx src-tauri/src/db/semantic_repo.rs:89 rust-db.execute in delete_chunks_for_path
fx src-tauri/src/db/semantic_repo.rs:114 rust-db.execute in insert_chunk
fx src-tauri/src/db/semantic_repo.rs:240 rust-db.execute in upsert_meta
fx src-tauri/src/db/semantic_repo.rs:256 rust-db.execute in delete_mtime
fx src-tauri/src/db/semantic_repo.rs:281 rust-db.execute in rename_paths
fx src-tauri/src/db/semantic_repo.rs:289 rust-db.execute in rename_paths
fx src-tauri/src/db/semantic_repo.rs:298 rust-db.execute in rename_paths
fx src-tauri/src/db/semantic_repo.rs:305 rust-db.execute in rename_paths
fx src-tauri/src/db/semantic_repo.rs:340 rust-db.execute in delete_orphaned_mtimes
