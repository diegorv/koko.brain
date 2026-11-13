# file card src-tauri/src/commands/history.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/history.rs ' codemap/files
file src-tauri/src/commands/history.rs rust L168 module src-tauri/src/commands in1 t2
## imports
imp src-tauri/src/commands/history.rs:1 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/history.rs:2 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/commands/history.rs:8 -> src-tauri/src/db/history_repo.rs SnapshotInfo
imp src-tauri/src/commands/history.rs:77 -> src-tauri/src/db/history_repo.rs find_latest_hash
imp src-tauri/src/commands/history.rs:84 -> src-tauri/src/db/history_repo.rs insert_snapshot
imp src-tauri/src/commands/history.rs:93 -> src-tauri/src/db/history_repo.rs list_snapshots
imp src-tauri/src/commands/history.rs:99 -> src-tauri/src/db/history_repo.rs get_snapshot_by_id
imp src-tauri/src/commands/history.rs:161 -> src-tauri/src/db/history_repo.rs delete_old_snapshots
imp src-tauri/src/commands/history.rs:163 -> src-tauri/src/db/history_repo.rs delete_medium_duplicates
## imported-by
imp src-tauri/src/lib.rs:328 -> src-tauri/src/commands/history.rs save_snapshot
imp src-tauri/src/lib.rs:329 -> src-tauri/src/commands/history.rs get_file_history
imp src-tauri/src/lib.rs:330 -> src-tauri/src/commands/history.rs get_snapshot_content
imp src-tauri/src/lib.rs:331 -> src-tauri/src/commands/history.rs compute_diff
imp src-tauri/src/lib.rs:332 -> src-tauri/src/commands/history.rs cleanup_history
## reach
in2 src-tauri/src/commands/history.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/history.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/history_test.rs imports src-tauri/src/commands/history.rs
test src-tauri/tests/ipc_contracts_test.rs imports src-tauri/src/commands/history.rs
## symbols
sym src-tauri/src/commands/history.rs:14 struct DiffLine L15 dto:DiffLine | A single line in a unified diff.
sym src-tauri/src/commands/history.rs:35 enum DiffLineType L8 dto:DiffLineType | Kind of a `DiffLine`.
sym src-tauri/src/commands/history.rs:61 cmd save_snapshot(file_path: String, content: String) -> Result<bool, String> L5 | Saves a snapshot of file content if its hash differs from the last snapshot.
by src-tauri/src/commands/history.rs:save_snapshot <- src-tauri/src/lib.rs:328 in run import
sym src-tauri/src/commands/history.rs:92 cmd get_file_history(file_path: String) -> Result<Vec<SnapshotInfo>, String> L3 | Lists all snapshots for a file, newest first.
by src-tauri/src/commands/history.rs:get_file_history <- src-tauri/src/lib.rs:329 in run import
sym src-tauri/src/commands/history.rs:98 cmd get_snapshot_content(snapshot_id: i64) -> Result<String, String> L3 | Reads the full content of a specific snapshot.
by src-tauri/src/commands/history.rs:get_snapshot_content <- src-tauri/src/lib.rs:330 in run import
sym src-tauri/src/commands/history.rs:105 cmd compute_diff(old_content: String, new_content: String) -> Result<Vec<DiffLine>, String> L41 | Computes a line-by-line diff between two strings.
by src-tauri/src/commands/history.rs:compute_diff <- src-tauri/src/lib.rs:331 in run import
sym src-tauri/src/commands/history.rs:153 cmd cleanup_history(retention_days: u32) -> Result<u32, String> L16 | Deletes old snapshots by retention policy. - Recent (within retention_days): keep all - Medium (retention_days..retention_days+30): keep 1 per day per file (la…
by src-tauri/src/commands/history.rs:cleanup_history <- src-tauri/src/lib.rs:332 in run import
## locals
local src-tauri/src/commands/history.rs:45 fn now_ms() -> u64 L8
local src-tauri/src/commands/history.rs:67 fn save_snapshot_blocking(file_path: &str, content: &str) -> Result<bool, String> L22
## calls
call src-tauri/src/commands/history.rs:62 in save_snapshot -> src-tauri/src/commands/history.rs:save_snapshot_blocking call
call src-tauri/src/commands/history.rs:68 in save_snapshot_blocking -> src-tauri/src/utils/logger.rs:debug_log lexical +2
call src-tauri/src/commands/history.rs:74 in save_snapshot_blocking -> src-tauri/src/commands/history.rs:now_ms call
call src-tauri/src/commands/history.rs:76 in save_snapshot_blocking -> src-tauri/src/db/mod.rs:with_db lexical
call src-tauri/src/commands/history.rs:77 in save_snapshot_blocking -> src-tauri/src/db/history_repo.rs:find_latest_hash lexical
call src-tauri/src/commands/history.rs:84 in save_snapshot_blocking -> src-tauri/src/db/history_repo.rs:insert_snapshot lexical
call src-tauri/src/commands/history.rs:93 in get_file_history -> src-tauri/src/db/history_repo.rs:list_snapshots lexical
call src-tauri/src/commands/history.rs:93 in get_file_history -> src-tauri/src/db/mod.rs:with_db lexical
call src-tauri/src/commands/history.rs:99 in get_snapshot_content -> src-tauri/src/db/history_repo.rs:get_snapshot_by_id lexical
call src-tauri/src/commands/history.rs:99 in get_snapshot_content -> src-tauri/src/db/mod.rs:with_db lexical
call src-tauri/src/commands/history.rs:154 in cleanup_history -> src-tauri/src/commands/history.rs:now_ms call
call src-tauri/src/commands/history.rs:160 in cleanup_history -> src-tauri/src/db/mod.rs:with_db_transaction lexical
call src-tauri/src/commands/history.rs:161 in cleanup_history -> src-tauri/src/db/history_repo.rs:delete_old_snapshots lexical
call src-tauri/src/commands/history.rs:163 in cleanup_history -> src-tauri/src/db/history_repo.rs:delete_medium_duplicates lexical
call src-tauri/src/commands/history.rs:165 in cleanup_history -> src-tauri/src/utils/logger.rs:debug_log lexical
## ipc-in
ipc-call src/lib/features/file-history/file-history.service.ts:117 in saveSnapshotForFile -> ipc:save_snapshot -> src-tauri/src/commands/history.rs:61
ipc-call src/lib/features/file-history/file-history.service.ts:31 in openFileHistory -> ipc:get_file_history -> src-tauri/src/commands/history.rs:92
ipc-call src/lib/features/file-history/file-history.service.ts:62 in selectSnapshot -> ipc:get_snapshot_content -> src-tauri/src/commands/history.rs:98
ipc-call src/lib/features/file-history/file-history.service.ts:85 in restoreSnapshot -> ipc:get_snapshot_content -> src-tauri/src/commands/history.rs:98
ipc-call src/lib/features/file-history/file-history.service.ts:65 in selectSnapshot -> ipc:compute_diff -> src-tauri/src/commands/history.rs:105
ipc-call src/lib/app/lifecycle/app-lifecycle.service.ts:298 in initializeVault -> ipc:cleanup_history -> src-tauri/src/commands/history.rs:153
