# file card src-tauri/src/db/history_repo.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/db/history_repo.rs ' codemap/files
file src-tauri/src/db/history_repo.rs rust L234 module src-tauri/src/db in1 t0 t:inline
## imported-by
imp src-tauri/src/commands/history.rs:8 -> src-tauri/src/db/history_repo.rs SnapshotInfo
imp src-tauri/src/commands/history.rs:77 -> src-tauri/src/db/history_repo.rs find_latest_hash
imp src-tauri/src/commands/history.rs:84 -> src-tauri/src/db/history_repo.rs insert_snapshot
imp src-tauri/src/commands/history.rs:93 -> src-tauri/src/db/history_repo.rs list_snapshots
imp src-tauri/src/commands/history.rs:99 -> src-tauri/src/db/history_repo.rs get_snapshot_by_id
imp src-tauri/src/commands/history.rs:161 -> src-tauri/src/db/history_repo.rs delete_old_snapshots
imp src-tauri/src/commands/history.rs:163 -> src-tauri/src/db/history_repo.rs delete_medium_duplicates
## reach
in2 src-tauri/src/db/history_repo.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/db/history_repo.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/db/history_repo.rs:7 struct SnapshotInfo L8 dto:SnapshotInfo | Metadata for a single snapshot (without content, for listing).
by src-tauri/src/db/history_repo.rs:SnapshotInfo <- src-tauri/src/commands/history.rs:92 in get_file_history ref
sym src-tauri/src/db/history_repo.rs:18 fn find_latest_hash(conn: &Connection, file_path: &str) -> Result<Option<String>, String> L9 | Returns the hash of the most recent snapshot for a given file, if any.
by src-tauri/src/db/history_repo.rs:find_latest_hash <- src-tauri/src/commands/history.rs:77 in save_snapshot_blocking lexical
sym src-tauri/src/db/history_repo.rs:29 fn insert_snapshot(conn: &Connection, file_path: &str, content: &str, hash: &str, size: i64, created_at: i64,) -> Result<(), String> L15 | Inserts a new snapshot row.
by src-tauri/src/db/history_repo.rs:insert_snapshot <- src-tauri/src/commands/history.rs:84 in save_snapshot_blocking lexical
sym src-tauri/src/db/history_repo.rs:46 fn list_snapshots(conn: &Connection, file_path: &str) -> Result<Vec<SnapshotInfo>, String> L23 | Lists all snapshots for a file, newest first.
by src-tauri/src/db/history_repo.rs:list_snapshots <- src-tauri/src/commands/history.rs:93 in get_file_history lexical
sym src-tauri/src/db/history_repo.rs:71 fn get_snapshot_by_id(conn: &Connection, snapshot_id: i64) -> Result<String, String> L8 | Reads the full content of a specific snapshot by ID.
by src-tauri/src/db/history_repo.rs:get_snapshot_by_id <- src-tauri/src/commands/history.rs:99 in get_snapshot_content lexical
sym src-tauri/src/db/history_repo.rs:82 fn delete_old_snapshots(conn: &Connection, cutoff_ms: i64) -> Result<u32, String> L8 | Deletes all snapshots older than `cutoff_ms` (milliseconds since epoch).
by src-tauri/src/db/history_repo.rs:delete_old_snapshots <- src-tauri/src/commands/history.rs:161 in cleanup_history lexical
sym src-tauri/src/db/history_repo.rs:93 fn delete_medium_duplicates(conn: &Connection, cutoff_daily: i64, cutoff_recent: i64,) -> Result<u32, String> L17 | In the medium range (cutoff_daily..cutoff_recent), keeps only the latest snapshot per day per file.
by src-tauri/src/db/history_repo.rs:delete_medium_duplicates <- src-tauri/src/commands/history.rs:163 in cleanup_history lexical
## effects
fx src-tauri/src/db/history_repo.rs:37 rust-db.execute in insert_snapshot
fx src-tauri/src/db/history_repo.rs:83 rust-db.execute in delete_old_snapshots
fx src-tauri/src/db/history_repo.rs:98 rust-db.execute in delete_medium_duplicates
