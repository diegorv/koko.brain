# file card src-tauri/src/db/mod.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/db/mod.rs ' codemap/files
file src-tauri/src/db/mod.rs rust L252 module src-tauri/src/db in6 t8
## imports
imp src-tauri/src/db/mod.rs:7 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/commands/db.rs:1 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/history.rs:1 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/search_index.rs:1 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/semantic.rs:1 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/todoist.rs:9 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/lib.rs:45 -> src-tauri/src/db/mod.rs is_open
## reach
in2 src-tauri/src/db/mod.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/db/mod.rs 0 files in 0 modules: -
## tests
test src-tauri/examples/retrieval_eval.rs example src-tauri/src/db/mod.rs
test src-tauri/tests/db_poisoned_lock_test.rs imports src-tauri/src/db/mod.rs
test src-tauri/tests/db_test.rs imports src-tauri/src/db/mod.rs
test src-tauri/tests/history_test.rs imports src-tauri/src/db/mod.rs
test src-tauri/tests/search_fts_test.rs imports src-tauri/src/db/mod.rs
test src-tauri/tests/search_fuzzy_test.rs imports src-tauri/src/db/mod.rs
test src-tauri/tests/search_rekey_test.rs imports src-tauri/src/db/mod.rs
test src-tauri/tests/semantic_commands_test.rs imports src-tauri/src/db/mod.rs
test src-tauri/tests/todoist_state_test.rs imports src-tauri/src/db/mod.rs
## symbols
sym src-tauri/src/db/mod.rs:37 fn open_database(vault_path: &Path) -> Result<(), String> L53 | Opens (or creates) the SQLite database at `{vault_path}/.kokobrain/kokobrain.db`.
by src-tauri/src/db/mod.rs:open_database <- src-tauri/src/commands/db.rs:10 in open_vault_db lexical
sym src-tauri/src/db/mod.rs:92 fn close_database() -> Result<(), String> L9 | Closes both database connections and releases resources.
by src-tauri/src/db/mod.rs:close_database <- src-tauri/src/commands/db.rs:17 in close_vault_db lexical
sym src-tauri/src/db/mod.rs:105 fn is_open() -> bool L3 | Returns true when a vault database connection is currently open.
by src-tauri/src/db/mod.rs:is_open <- src-tauri/src/lib.rs:45 in dispatch_shortcut lexical
sym src-tauri/src/db/mod.rs:111 fn with_db(f: F) -> Result<T, String> L8 | Runs a closure with a reference to the open database connection.
by src-tauri/src/db/mod.rs:with_db <- src-tauri/src/commands/history.rs:76 in save_snapshot_blocking lexical +2
by src-tauri/src/db/mod.rs:with_db <- src-tauri/src/commands/semantic.rs:166 in get_or_load_cache lexical +9
sym src-tauri/src/db/mod.rs:122 fn with_db_transaction(label: &str, f: F) -> Result<T, String> L8 | Runs a closure inside a SQL transaction (BEGIN/COMMIT/ROLLBACK).
by src-tauri/src/db/mod.rs:with_db_transaction <- src-tauri/src/commands/history.rs:160 in cleanup_history lexical
by src-tauri/src/db/mod.rs:with_db_transaction <- src-tauri/src/commands/semantic.rs:730 in build_semantic_index_inner lexical +5
sym src-tauri/src/db/mod.rs:135 fn with_vault_db(vault_path: &str, f: F) -> Result<T, String> L9 | [`with_db`] for a caller that names the vault it believes is open: refuses with an error when `vault_path` is not the vault whose database is open, so a backgr…
by src-tauri/src/db/mod.rs:with_vault_db <- src-tauri/src/commands/todoist.rs:29 in todoist_read_kv lexical +3
sym src-tauri/src/db/mod.rs:146 fn with_vault_db_transaction(vault_path: &str, label: &str, f: F) -> Result<T, String> L9 | [`with_db_transaction`] with the open-vault check of [`with_vault_db`].
by src-tauri/src/db/mod.rs:with_vault_db_transaction <- src-tauri/src/commands/todoist.rs:49 in todoist_commit_state lexical +1
sym src-tauri/src/db/mod.rs:206 fn with_fts_db(f: F) -> Result<T, String> L8 | Runs a closure with a reference to the open FTS database connection.
by src-tauri/src/db/mod.rs:with_fts_db <- src-tauri/src/commands/search_index.rs:71 in build_search_index_inner lexical +2
sym src-tauri/src/db/mod.rs:216 fn with_fts_db_transaction(label: &str, f: F) -> Result<T, String> L25 | FTS-connection counterpart of [`with_db_transaction`].
by src-tauri/src/db/mod.rs:with_fts_db_transaction <- src-tauri/src/commands/search_index.rs:92 in build_search_index_inner lexical +2
sym src-tauri/src/db/mod.rs:245 fn checkpoint_fts_wal() -> Result<(), String> L8 | Runs a WAL checkpoint on the FTS connection.
by src-tauri/src/db/mod.rs:checkpoint_fts_wal <- src-tauri/src/commands/search_index.rs:139 in build_search_index_inner lexical
## locals
local src-tauri/src/db/mod.rs:159 fn ensure_open_vault(conn: &Connection, vault_path: &str) -> Result<(), String> L16
local src-tauri/src/db/mod.rs:177 fn run_transaction(conn: &Connection, label: &str, f: F) -> Result<T, String> L23
## calls
call src-tauri/src/db/mod.rs:62 in open_database -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/db/mod.rs:128 in with_db_transaction -> src-tauri/src/db/mod.rs:run_transaction call
call src-tauri/src/db/mod.rs:141 in with_vault_db -> src-tauri/src/db/mod.rs:ensure_open_vault call
call src-tauri/src/db/mod.rs:152 in with_vault_db_transaction -> src-tauri/src/db/mod.rs:ensure_open_vault call
call src-tauri/src/db/mod.rs:153 in with_vault_db_transaction -> src-tauri/src/db/mod.rs:run_transaction call
call src-tauri/src/db/mod.rs:181 in run_transaction -> src-tauri/src/utils/logger.rs:debug_log lexical +3
call src-tauri/src/db/mod.rs:222 in with_fts_db_transaction -> src-tauri/src/utils/logger.rs:debug_log lexical +3
call src-tauri/src/db/mod.rs:250 in checkpoint_fts_wal -> src-tauri/src/utils/logger.rs:debug_log lexical
## effects
fx src-tauri/src/db/mod.rs:42 rust-fs.create_dir_all in open_database
fx src-tauri/src/db/mod.rs:182 rust-db.execute in run_transaction
fx src-tauri/src/db/mod.rs:186 rust-db.execute in run_transaction
fx src-tauri/src/db/mod.rs:192 rust-db.execute in run_transaction
fx src-tauri/src/db/mod.rs:223 rust-db.execute in with_fts_db_transaction
fx src-tauri/src/db/mod.rs:227 rust-db.execute in with_fts_db_transaction
fx src-tauri/src/db/mod.rs:233 rust-db.execute in with_fts_db_transaction
fx src-tauri/src/db/mod.rs:248 rust-db.execute in checkpoint_fts_wal
