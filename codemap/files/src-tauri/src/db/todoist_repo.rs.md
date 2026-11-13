# file card src-tauri/src/db/todoist_repo.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/db/todoist_repo.rs ' codemap/files
file src-tauri/src/db/todoist_repo.rs rust L266 module src-tauri/src/db in1 t0 | SQL over the Todoist sync tables (`todoist_kv`, `todoist_task_link`, `todoist_section_link`, `todoist_sync_log`), created in `schema::create_tables`.
## imported-by
imp src-tauri/src/commands/todoist.rs:10 -> src-tauri/src/db/todoist_repo.rs self,SYNC_LOG_LIMIT
imp src-tauri/src/commands/todoist.rs:13 -> src-tauri/src/db/todoist_repo.rs TodoistKvEntry,TodoistSectionLink,TodoistStateCommit,TodoistSyncLogEntry,TodoistSyncLogInput,TodoistTaskLink
## reach
in2 src-tauri/src/db/todoist_repo.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/db/todoist_repo.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/db/todoist_repo.rs:8 const SYNC_LOG_LIMIT L1 | Rows `todoist_sync_log` keeps; older rows are dropped on append.
by src-tauri/src/db/todoist_repo.rs:SYNC_LOG_LIMIT <- src-tauri/src/commands/todoist.rs:74 in todoist_read_log ref
sym src-tauri/src/db/todoist_repo.rs:14 struct TodoistKvEntry L6 dto:TodoistKvEntry | One `todoist_kv` row: a scalar of the sync state (`sync_token`, `user_id`, ...).
by src-tauri/src/db/todoist_repo.rs:TodoistKvEntry <- src-tauri/src/commands/todoist.rs:28 in todoist_read_kv ref
sym src-tauri/src/db/todoist_repo.rs:25 struct TodoistTaskLink L20 dto:TodoistTaskLink | One `todoist_task_link` row: the link between an anchored task line and its Todoist item.
by src-tauri/src/db/todoist_repo.rs:TodoistTaskLink <- src-tauri/src/commands/todoist.rs:34 in todoist_read_links ref
sym src-tauri/src/db/todoist_repo.rs:51 struct TodoistSectionLink L8 dto:TodoistSectionLink | One `todoist_section_link` row: a Todoist section and the `##` heading of its project note.
by src-tauri/src/db/todoist_repo.rs:TodoistSectionLink <- src-tauri/src/commands/todoist.rs:40 in todoist_read_sections ref
sym src-tauri/src/db/todoist_repo.rs:65 struct TodoistStateCommit L16 dto:TodoistStateCommit | One state commit applied in a single transaction: kv rows (the `sync_token` among them), link upserts and deletes, section link upserts and deletes.
by src-tauri/src/db/todoist_repo.rs:TodoistStateCommit <- src-tauri/src/commands/todoist.rs:47 in todoist_commit_state ref
sym src-tauri/src/db/todoist_repo.rs:86 struct TodoistSyncLogInput L14 dto:TodoistSyncLogInput | A sync log entry to append; the time is set when it is stored.
by src-tauri/src/db/todoist_repo.rs:TodoistSyncLogInput <- src-tauri/src/commands/todoist.rs:58 in todoist_append_log ref
sym src-tauri/src/db/todoist_repo.rs:105 struct TodoistSyncLogEntry L12 dto:TodoistSyncLogEntry | One stored `todoist_sync_log` row.
by src-tauri/src/db/todoist_repo.rs:TodoistSyncLogEntry <- src-tauri/src/commands/todoist.rs:73 in todoist_read_log ref
sym src-tauri/src/db/todoist_repo.rs:119 fn read_kv(conn: &Connection) -> Result<Vec<TodoistKvEntry>, String> L9 | Every kv row, sorted by key.
by src-tauri/src/db/todoist_repo.rs:read_kv <- src-tauri/src/commands/todoist.rs:29 in todoist_read_kv ref
sym src-tauri/src/db/todoist_repo.rs:130 fn read_links(conn: &Connection) -> Result<Vec<TodoistTaskLink>, String> L24 | Every link, sorted by anchor.
by src-tauri/src/db/todoist_repo.rs:read_links <- src-tauri/src/commands/todoist.rs:35 in todoist_read_links ref
sym src-tauri/src/db/todoist_repo.rs:157 fn apply_commit(conn: &Connection, commit: &TodoistStateCommit) -> Result<(), String> L47 | Applies `commit` on `conn`.
by src-tauri/src/db/todoist_repo.rs:apply_commit <- src-tauri/src/commands/todoist.rs:50 in todoist_commit_state lexical
sym src-tauri/src/db/todoist_repo.rs:206 fn read_sections(conn: &Connection) -> Result<Vec<TodoistSectionLink>, String> L11 | Every section link, sorted by section id.
by src-tauri/src/db/todoist_repo.rs:read_sections <- src-tauri/src/commands/todoist.rs:41 in todoist_read_sections ref
sym src-tauri/src/db/todoist_repo.rs:221 fn append_log(conn: &Connection, entries: &[TodoistSyncLogInput], created_at: i64) -> Result<(), String> L27 | Appends `entries` stamped with `created_at`, then drops every row older than the newest [`SYNC_LOG_LIMIT`].
by src-tauri/src/db/todoist_repo.rs:append_log <- src-tauri/src/commands/todoist.rs:65 in todoist_append_log lexical
sym src-tauri/src/db/todoist_repo.rs:250 fn read_log(conn: &Connection, limit: i64) -> Result<Vec<TodoistSyncLogEntry>, String> L17 | The newest `limit` log rows, newest first.
by src-tauri/src/db/todoist_repo.rs:read_log <- src-tauri/src/commands/todoist.rs:75 in todoist_read_log lexical
## effects
fx src-tauri/src/db/todoist_repo.rs:159 rust-db.execute in apply_commit
fx src-tauri/src/db/todoist_repo.rs:169 rust-db.execute in apply_commit
fx src-tauri/src/db/todoist_repo.rs:188 rust-db.execute in apply_commit
fx src-tauri/src/db/todoist_repo.rs:192 rust-db.execute in apply_commit
fx src-tauri/src/db/todoist_repo.rs:199 rust-db.execute in apply_commit
fx src-tauri/src/db/todoist_repo.rs:225 rust-db.execute in append_log
fx src-tauri/src/db/todoist_repo.rs:235 rust-db.execute in append_log
fx src-tauri/src/db/todoist_repo.rs:241 rust-db.execute in append_log
