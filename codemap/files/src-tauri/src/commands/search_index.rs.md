# file card src-tauri/src/commands/search_index.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/search_index.rs ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, ipc-in
file src-tauri/src/commands/search_index.rs rust L406 module src-tauri/src/commands in2 t3
## imports
imp src-tauri/src/commands/search_index.rs:1 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/search_index.rs:2 -> src-tauri/src/search/fts_logic.rs extract_headings,extract_tags,extract_title,plan_reconcile,sanitize_fts_term
imp src-tauri/src/commands/search_index.rs:5 -> src-tauri/src/search/fuzzy.rs self
imp src-tauri/src/commands/search_index.rs:6 -> src-tauri/src/utils/fs.rs self
imp src-tauri/src/commands/search_index.rs:7 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/commands/search_index.rs:12 -> src-tauri/src/db/fts_repo.rs FtsSearchResult
imp src-tauri/src/commands/search_index.rs:71 -> src-tauri/src/db/fts_repo.rs get_entry_mtimes
imp src-tauri/src/commands/search_index.rs:97 -> src-tauri/src/db/fts_repo.rs clear_index
imp src-tauri/src/commands/search_index.rs:101 -> src-tauri/src/db/fts_repo.rs delete_entry
imp src-tauri/src/commands/search_index.rs:110 -> src-tauri/src/db/fts_repo.rs delete_entry
imp src-tauri/src/commands/search_index.rs:115 -> src-tauri/src/db/fts_repo.rs count_entries
imp src-tauri/src/commands/search_index.rs:186 -> src-tauri/src/db/fts_repo.rs search_match
imp src-tauri/src/commands/search_index.rs:229 -> src-tauri/src/db/fts_repo.rs delete_entry
imp src-tauri/src/commands/search_index.rs:248 -> src-tauri/src/db/fts_repo.rs delete_entry
imp src-tauri/src/commands/search_index.rs:283 -> src-tauri/src/db/fts_repo.rs delete_entry
imp src-tauri/src/commands/search_index.rs:284 -> src-tauri/src/db/semantic_repo.rs delete_chunks_for_path
imp src-tauri/src/commands/search_index.rs:285 -> src-tauri/src/db/semantic_repo.rs delete_mtime
imp src-tauri/src/commands/search_index.rs:287 -> src-tauri/src/db/fts_repo.rs rename_entries
imp src-tauri/src/commands/search_index.rs:288 -> src-tauri/src/db/semantic_repo.rs rename_paths
imp src-tauri/src/commands/search_index.rs:297 -> src-tauri/src/commands/semantic.rs invalidate_search_cache
imp src-tauri/src/commands/search_index.rs:314 -> src-tauri/src/db/fts_repo.rs insert_entry
## imported-by
imp src-tauri/src/commands/semantic.rs:1003 -> src-tauri/src/commands/search_index.rs search_fts_inner
imp src-tauri/src/lib.rs:367 -> src-tauri/src/commands/search_index.rs build_search_index
imp src-tauri/src/lib.rs:368 -> src-tauri/src/commands/search_index.rs search_fts
imp src-tauri/src/lib.rs:369 -> src-tauri/src/commands/search_index.rs update_search_index_file
imp src-tauri/src/lib.rs:370 -> src-tauri/src/commands/search_index.rs remove_from_search_index
imp src-tauri/src/lib.rs:371 -> src-tauri/src/commands/search_index.rs rename_in_search_index
## reach
in2 src-tauri/src/commands/search_index.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/search_index.rs 15 files in 4 modules: src-tauri/src/semantic(11) src-tauri/src/search(2) src-tauri/src(1) src-tauri/src/utils(1)
## tests
test src-tauri/examples/retrieval_eval.rs example src-tauri/src/commands/search_index.rs
test src-tauri/tests/commands/vault_test.rs imports src-tauri/src/commands/search_index.rs
test src-tauri/tests/search_fts_test.rs imports src-tauri/src/commands/search_index.rs
test src-tauri/tests/search_rekey_test.rs imports src-tauri/src/commands/search_index.rs
## symbols
sym src-tauri/src/commands/search_index.rs:18 struct IndexStats L12 dto:IndexStats | Statistics about the FTS5 search index, reported by one reconcile pass.
sym src-tauri/src/commands/search_index.rs:39 cmd build_search_index(vault_path: String) -> Result<IndexStats, String> L5 | Reconciles the FTS5 search index with what is on disk.
by src-tauri/src/commands/search_index.rs:build_search_index <- src-tauri/src/lib.rs:367 in run import
sym src-tauri/src/commands/search_index.rs:57 fn build_search_index_inner(vault_path: String) -> Result<IndexStats, String> L89 | Synchronous implementation of the FTS5 reconcile.
sym src-tauri/src/commands/search_index.rs:153 cmd search_fts(query: String, max_results: Option<usize>, fuzzy: Option<bool>,) -> Result<Vec<FtsSearchResult>, String> L17 | Searches the FTS5 index using BM25 ranking with optional fuzzy matching.
by src-tauri/src/commands/search_index.rs:search_fts <- src-tauri/src/lib.rs:368 in run import
sym src-tauri/src/commands/search_index.rs:172 fn search_fts_inner(query: &str, limit: usize, use_fuzzy: bool,) -> Result<Vec<FtsSearchResult>, String> L19 | Synchronous FTS search shared by the public command and the hybrid pipeline.
by src-tauri/src/commands/search_index.rs:search_fts_inner <- src-tauri/src/commands/semantic.rs:1003 in search_hybrid lexical
sym src-tauri/src/commands/search_index.rs:203 cmd update_search_index_file(file_path: String, content: String, vault_path: String,) -> Result<(), String> L11 | Updates the FTS5 index for a single file (called on save).
by src-tauri/src/commands/search_index.rs:update_search_index_file <- src-tauri/src/lib.rs:369 in run import
sym src-tauri/src/commands/search_index.rs:216 fn update_search_index_file_inner(file_path: String, content: String, vault_path: String,) -> Result<(), String> L17 | Synchronous implementation used by the async command and by tests.
sym src-tauri/src/commands/search_index.rs:239 cmd remove_from_search_index(file_path: String) -> Result<(), String> L5 | Removes a file from the FTS5 index (called on file delete).
by src-tauri/src/commands/search_index.rs:remove_from_search_index <- src-tauri/src/lib.rs:370 in run import
sym src-tauri/src/commands/search_index.rs:246 fn remove_from_search_index_inner(file_path: String) -> Result<(), String> L4 | Synchronous implementation used by the async command and by tests.
sym src-tauri/src/commands/search_index.rs:265 cmd rename_in_search_index(from: String, to: String) -> Result<(), String> L5 | Moves the text and semantic search rows of a renamed or moved note, or of every note under a renamed or moved folder, from `from` to `to`.
by src-tauri/src/commands/search_index.rs:rename_in_search_index <- src-tauri/src/lib.rs:371 in run import
sym src-tauri/src/commands/search_index.rs:272 fn rename_in_search_index_inner(from: String, to: String) -> Result<(), String> L29 | Synchronous implementation used by the async command and by tests.
## locals
local src-tauri/src/commands/search_index.rs:305 fn index_entry(conn: &rusqlite::Connection, rel_path: &str, content: &str, mtime: i64,) -> Result<(), String> L11
local src-tauri/src/commands/search_index.rs:320 fn read_files(paths: &[String], abs_paths: &HashMap<String, PathBuf>, disk: &HashMap<String, i64>, skipped: &mut u64,) -> Vec<(Strin… L23
local src-tauri/src/commands/search_index.rs:350 fn file_mtime_secs(vault_path: &str, file_path: &str) -> Result<i64, String> L18
local src-tauri/src/commands/search_index.rs:371 fn build_fts_query(conn: &rusqlite::Connection, query: &str, use_fuzzy: bool,) -> Result<String, String> L35
## calls
call src-tauri/src/commands/search_index.rs:40 in build_search_index -> src-tauri/src/commands/search_index.rs:build_search_index_inner call
call src-tauri/src/commands/search_index.rs:59 in build_search_index_inner -> src-tauri/src/utils/fs.rs:validate_vault_path lexical
call src-tauri/src/commands/search_index.rs:62 in build_search_index_inner -> src-tauri/src/utils/fs.rs:collect_markdown_paths_with_mtime lexical
call src-tauri/src/commands/search_index.rs:71 in build_search_index_inner -> src-tauri/src/db/fts_repo.rs:get_entry_mtimes ref
call src-tauri/src/commands/search_index.rs:71 in build_search_index_inner -> src-tauri/src/db/mod.rs:with_fts_db lexical
call src-tauri/src/commands/search_index.rs:72 in build_search_index_inner -> src-tauri/src/search/fts_logic.rs:plan_reconcile lexical
call src-tauri/src/commands/search_index.rs:75 in build_search_index_inner -> src-tauri/src/commands/search_index.rs:read_files call +1
call src-tauri/src/commands/search_index.rs:78 in build_search_index_inner -> src-tauri/src/utils/logger.rs:debug_log lexical +2
call src-tauri/src/commands/search_index.rs:92 in build_search_index_inner -> src-tauri/src/db/mod.rs:with_fts_db_transaction lexical
call src-tauri/src/commands/search_index.rs:97 in build_search_index_inner -> src-tauri/src/db/fts_repo.rs:clear_index lexical
call src-tauri/src/commands/search_index.rs:101 in build_search_index_inner -> src-tauri/src/db/fts_repo.rs:delete_entry lexical +1
call src-tauri/src/commands/search_index.rs:111 in build_search_index_inner -> src-tauri/src/commands/search_index.rs:index_entry call
call src-tauri/src/commands/search_index.rs:115 in build_search_index_inner -> src-tauri/src/db/fts_repo.rs:count_entries lexical
call src-tauri/src/commands/search_index.rs:139 in build_search_index_inner -> src-tauri/src/db/mod.rs:checkpoint_fts_wal lexical
call src-tauri/src/commands/search_index.rs:165 in search_fts -> src-tauri/src/commands/search_index.rs:search_fts_inner call
call src-tauri/src/commands/search_index.rs:178 in search_fts_inner -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/commands/search_index.rs:180 in search_fts_inner -> src-tauri/src/db/mod.rs:with_fts_db lexical
call src-tauri/src/commands/search_index.rs:181 in search_fts_inner -> src-tauri/src/commands/search_index.rs:build_fts_query call
call src-tauri/src/commands/search_index.rs:186 in search_fts_inner -> src-tauri/src/db/fts_repo.rs:search_match lexical
call src-tauri/src/commands/search_index.rs:209 in update_search_index_file -> src-tauri/src/commands/search_index.rs:update_search_index_file_inner call
call src-tauri/src/commands/search_index.rs:221 in update_search_index_file_inner -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/commands/search_index.rs:222 in update_search_index_file_inner -> src-tauri/src/commands/search_index.rs:file_mtime_secs call
call src-tauri/src/commands/search_index.rs:228 in update_search_index_file_inner -> src-tauri/src/db/mod.rs:with_fts_db_transaction lexical
call src-tauri/src/commands/search_index.rs:229 in update_search_index_file_inner -> src-tauri/src/db/fts_repo.rs:delete_entry lexical
call src-tauri/src/commands/search_index.rs:230 in update_search_index_file_inner -> src-tauri/src/commands/search_index.rs:index_entry call
call src-tauri/src/commands/search_index.rs:240 in remove_from_search_index -> src-tauri/src/commands/search_index.rs:remove_from_search_index_inner call
call src-tauri/src/commands/search_index.rs:247 in remove_from_search_index_inner -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/search_index.rs:248 in remove_from_search_index_inner -> src-tauri/src/db/fts_repo.rs:delete_entry lexical
call src-tauri/src/commands/search_index.rs:248 in remove_from_search_index_inner -> src-tauri/src/db/mod.rs:with_fts_db lexical
call src-tauri/src/commands/search_index.rs:266 in rename_in_search_index -> src-tauri/src/commands/search_index.rs:rename_in_search_index_inner call
call src-tauri/src/commands/search_index.rs:276 in rename_in_search_index_inner -> src-tauri/src/db/mod.rs:with_fts_db_transaction lexical
call src-tauri/src/commands/search_index.rs:282 in rename_in_search_index_inner -> src-tauri/src/utils/fs.rs:is_search_indexed_filename lexical
call src-tauri/src/commands/search_index.rs:283 in rename_in_search_index_inner -> src-tauri/src/db/fts_repo.rs:delete_entry lexical
call src-tauri/src/commands/search_index.rs:284 in rename_in_search_index_inner -> src-tauri/src/db/semantic_repo.rs:delete_chunks_for_path lexical
call src-tauri/src/commands/search_index.rs:285 in rename_in_search_index_inner -> src-tauri/src/db/semantic_repo.rs:delete_mtime lexical
call src-tauri/src/commands/search_index.rs:287 in rename_in_search_index_inner -> src-tauri/src/db/fts_repo.rs:rename_entries lexical
call src-tauri/src/commands/search_index.rs:287 in rename_in_search_index_inner -> src-tauri/src/search/fts_logic.rs:extract_title ref
call src-tauri/src/commands/search_index.rs:288 in rename_in_search_index_inner -> src-tauri/src/db/semantic_repo.rs:rename_paths lexical
call src-tauri/src/commands/search_index.rs:291 in rename_in_search_index_inner -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/search_index.rs:297 in rename_in_search_index_inner -> src-tauri/src/commands/semantic.rs:invalidate_search_cache lexical
call src-tauri/src/commands/search_index.rs:311 in index_entry -> src-tauri/src/search/fts_logic.rs:extract_title lexical
call src-tauri/src/commands/search_index.rs:312 in index_entry -> src-tauri/src/search/fts_logic.rs:extract_headings lexical
call src-tauri/src/commands/search_index.rs:313 in index_entry -> src-tauri/src/search/fts_logic.rs:extract_tags lexical
call src-tauri/src/commands/search_index.rs:314 in index_entry -> src-tauri/src/db/fts_repo.rs:insert_entry lexical
call src-tauri/src/commands/search_index.rs:336 in read_files -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/search_index.rs:383 in build_fts_query -> src-tauri/src/search/fts_logic.rs:sanitize_fts_term lexical
call src-tauri/src/commands/search_index.rs:389 in build_fts_query -> src-tauri/src/search/fuzzy.rs:expand_fuzzy_terms lexical
## ipc-in
ipc-call src/lib/features/search/search.service.ts:286 in buildSearchIndex -> ipc:build_search_index -> src-tauri/src/commands/search_index.rs:39
ipc-call src/lib/features/rail-shell/list-fulltext.service.ts:24 in searchListFullText -> ipc:search_fts -> src-tauri/src/commands/search_index.rs:153
ipc-call src/lib/features/search/search.service.ts:199 in performSearch -> ipc:search_fts -> src-tauri/src/commands/search_index.rs:153
ipc-call src/lib/core/filesystem/note-change.service.ts:252 in applyNoteChange -> ipc:update_search_index_file -> src-tauri/src/commands/search_index.rs:203
ipc-call src/lib/features/search/search.service.ts:320 in registerSearchIndexHook -> ipc:update_search_index_file -> src-tauri/src/commands/search_index.rs:203
ipc-call src/lib/core/filesystem/note-change.service.ts:214 in applyNoteChange -> ipc:remove_from_search_index -> src-tauri/src/commands/search_index.rs:239
ipc-call src/lib/core/filesystem/path-change.service.ts:234 in applyPathChange -> ipc:rename_in_search_index -> src-tauri/src/commands/search_index.rs:265
