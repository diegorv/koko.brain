# file card src-tauri/src/db/fts_repo.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/db/fts_repo.rs ' codemap/files
file src-tauri/src/db/fts_repo.rs rust L274 module src-tauri/src/db in2 t3
## imports
imp src-tauri/src/db/fts_repo.rs:1 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
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
imp src-tauri/src/commands/search_index.rs:287 -> src-tauri/src/db/fts_repo.rs rename_entries
imp src-tauri/src/commands/search_index.rs:314 -> src-tauri/src/db/fts_repo.rs insert_entry
imp src-tauri/src/search/fuzzy.rs:58 -> src-tauri/src/db/fts_repo.rs expand_vocab_terms
## reach
in2 src-tauri/src/db/fts_repo.rs 2 files in 2 modules: src-tauri/src(1) src-tauri/src/commands(1)
out2 src-tauri/src/db/fts_repo.rs 0 files in 0 modules: -
## tests
test src-tauri/examples/retrieval_eval.rs example src-tauri/src/db/fts_repo.rs
test src-tauri/tests/fts_repo_test.rs imports src-tauri/src/db/fts_repo.rs
test src-tauri/tests/search_fts_test.rs imports src-tauri/src/db/fts_repo.rs
test src-tauri/tests/search_rekey_test.rs imports src-tauri/src/db/fts_repo.rs
## symbols
sym src-tauri/src/db/fts_repo.rs:9 struct FtsSearchResult L14 dto:FtsSearchResult | A single FTS5 search result with BM25 score and snippet.
by src-tauri/src/db/fts_repo.rs:FtsSearchResult <- src-tauri/src/commands/search_index.rs:157 in search_fts ref +1
sym src-tauri/src/db/fts_repo.rs:33 fn clear_index(conn: &Connection) -> Result<(), String> L7 | Deletes all entries from both the content table and the FTS5 index.
by src-tauri/src/db/fts_repo.rs:clear_index <- src-tauri/src/commands/search_index.rs:97 in build_search_index_inner lexical
sym src-tauri/src/db/fts_repo.rs:48 fn insert_entry(conn: &Connection, path: &str, title: &str, content: &str, headings: &str, tags: &str, mtime: i64,) -> Result<(), Stri… L25 | Inserts a single entry into the content table and the FTS5 index.
by src-tauri/src/db/fts_repo.rs:insert_entry <- src-tauri/src/commands/search_index.rs:314 in index_entry lexical
sym src-tauri/src/db/fts_repo.rs:75 fn search_match(conn: &Connection, fts_query: &str, limit: usize,) -> Result<Vec<FtsSearchResult>, String> L40 | Searches the FTS5 index using BM25 ranking with the given MATCH query.
by src-tauri/src/db/fts_repo.rs:search_match <- src-tauri/src/commands/search_index.rs:186 in search_fts_inner lexical
sym src-tauri/src/db/fts_repo.rs:122 fn delete_entry(conn: &Connection, path: &str) -> Result<(), String> L23 | Deletes a single entry from the FTS5 index by path.
by src-tauri/src/db/fts_repo.rs:delete_entry <- src-tauri/src/commands/search_index.rs:101 in build_search_index_inner lexical +4
sym src-tauri/src/db/fts_repo.rs:161 fn rename_entries(conn: &Connection, from: &str, to: &str, title_of: impl Fn(&str) -> String,) -> Result<usize, String> L57 | Re-keys the row at `from` and every row under `from + '/'` to the same place under `to`, keeping rowid, content and mtime.
by src-tauri/src/db/fts_repo.rs:rename_entries <- src-tauri/src/commands/search_index.rs:287 in rename_in_search_index_inner lexical
sym src-tauri/src/db/fts_repo.rs:223 fn get_entry_mtimes(conn: &Connection) -> Result<HashMap<String, i64>, String> L20 | Reads every indexed `path -> mtime` pair out of the content table.
by src-tauri/src/db/fts_repo.rs:get_entry_mtimes <- src-tauri/src/commands/search_index.rs:71 in build_search_index_inner ref
sym src-tauri/src/db/fts_repo.rs:245 fn count_entries(conn: &Connection) -> Result<u64, String> L4 | Counts the total number of documents in the content table.
by src-tauri/src/db/fts_repo.rs:count_entries <- src-tauri/src/commands/search_index.rs:115 in build_search_index_inner lexical
sym src-tauri/src/db/fts_repo.rs:252 fn expand_vocab_terms(conn: &Connection, like_pattern: &str, limit: usize,) -> Result<Vec<String>, String> L23 | Queries the FTS5 vocabulary table for terms matching the given LIKE pattern.
by src-tauri/src/db/fts_repo.rs:expand_vocab_terms <- src-tauri/src/search/fuzzy.rs:58 in expand_fuzzy_terms lexical
## calls
call src-tauri/src/db/fts_repo.rs:107 in search_match -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/db/fts_repo.rs:238 in get_entry_mtimes -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/db/fts_repo.rs:267 in expand_vocab_terms -> src-tauri/src/utils/logger.rs:debug_log lexical
## effects
fx src-tauri/src/db/fts_repo.rs:34 rust-db.execute in clear_index
fx src-tauri/src/db/fts_repo.rs:36 rust-db.execute in clear_index
fx src-tauri/src/db/fts_repo.rs:57 rust-db.execute in insert_entry
fx src-tauri/src/db/fts_repo.rs:65 rust-db.execute in insert_entry
fx src-tauri/src/db/fts_repo.rs:133 rust-db.execute in delete_entry
fx src-tauri/src/db/fts_repo.rs:139 rust-db.execute in delete_entry
fx src-tauri/src/db/fts_repo.rs:193 rust-db.execute in rename_entries
fx src-tauri/src/db/fts_repo.rs:199 rust-db.execute in rename_entries
fx src-tauri/src/db/fts_repo.rs:204 rust-db.execute in rename_entries
fx src-tauri/src/db/fts_repo.rs:209 rust-db.execute in rename_entries
