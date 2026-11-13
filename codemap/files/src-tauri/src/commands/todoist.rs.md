# file card src-tauri/src/commands/todoist.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/todoist.rs ' codemap/files
file src-tauri/src/commands/todoist.rs rust L76 module src-tauri/src/commands in1 t1 | IPC over the Todoist sync state in `kokobrain.db`.
## imports
imp src-tauri/src/commands/todoist.rs:9 -> src-tauri/src/db/mod.rs self
imp src-tauri/src/commands/todoist.rs:10 -> src-tauri/src/db/todoist_repo.rs self,SYNC_LOG_LIMIT
imp src-tauri/src/commands/todoist.rs:13 -> src-tauri/src/db/todoist_repo.rs TodoistKvEntry,TodoistSectionLink,TodoistStateCommit,TodoistSyncLogEntry,TodoistSyncLogInput,TodoistTaskLink
## imported-by
imp src-tauri/src/lib.rs:333 -> src-tauri/src/commands/todoist.rs todoist_read_kv
imp src-tauri/src/lib.rs:334 -> src-tauri/src/commands/todoist.rs todoist_read_links
imp src-tauri/src/lib.rs:335 -> src-tauri/src/commands/todoist.rs todoist_read_sections
imp src-tauri/src/lib.rs:336 -> src-tauri/src/commands/todoist.rs todoist_commit_state
imp src-tauri/src/lib.rs:337 -> src-tauri/src/commands/todoist.rs todoist_append_log
imp src-tauri/src/lib.rs:338 -> src-tauri/src/commands/todoist.rs todoist_read_log
## reach
in2 src-tauri/src/commands/todoist.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/todoist.rs 1 files in 1 modules: src-tauri/src/utils(1)
## tests
test src-tauri/tests/todoist_state_test.rs imports src-tauri/src/commands/todoist.rs
## symbols
sym src-tauri/src/commands/todoist.rs:28 cmd todoist_read_kv(vault_path: String) -> Result<Vec<TodoistKvEntry>, String> L3 | Every `todoist_kv` row, sorted by key.
by src-tauri/src/commands/todoist.rs:todoist_read_kv <- src-tauri/src/lib.rs:333 in run import
sym src-tauri/src/commands/todoist.rs:34 cmd todoist_read_links(vault_path: String) -> Result<Vec<TodoistTaskLink>, String> L3 | Every `todoist_task_link` row, sorted by anchor.
by src-tauri/src/commands/todoist.rs:todoist_read_links <- src-tauri/src/lib.rs:334 in run import
sym src-tauri/src/commands/todoist.rs:40 cmd todoist_read_sections(vault_path: String) -> Result<Vec<TodoistSectionLink>, String> L3 | Every `todoist_section_link` row, sorted by section id.
by src-tauri/src/commands/todoist.rs:todoist_read_sections <- src-tauri/src/lib.rs:335 in run import
sym src-tauri/src/commands/todoist.rs:47 cmd todoist_commit_state(vault_path: String, commit: TodoistStateCommit) -> Result<(), String> L8 | Writes kv rows (the `sync_token` among them), link and section link upserts and deletes in one transaction: all of it lands, or none of it.
by src-tauri/src/commands/todoist.rs:todoist_commit_state <- src-tauri/src/lib.rs:336 in run import
sym src-tauri/src/commands/todoist.rs:58 cmd todoist_append_log(vault_path: String, entries: Vec<TodoistSyncLogInput>) -> Result<(), String> L12 | Appends sync log entries and keeps only the newest 1000 rows.
by src-tauri/src/commands/todoist.rs:todoist_append_log <- src-tauri/src/lib.rs:337 in run import
sym src-tauri/src/commands/todoist.rs:73 cmd todoist_read_log(vault_path: String, limit: Option<u32>) -> Result<Vec<TodoistSyncLogEntry>, String> L4 | The newest `limit` sync log rows (default: all kept rows), newest first.
by src-tauri/src/commands/todoist.rs:todoist_read_log <- src-tauri/src/lib.rs:338 in run import
## locals
local src-tauri/src/commands/todoist.rs:18 fn blocking(f: F) -> Result<T, String> L7
## calls
call src-tauri/src/commands/todoist.rs:29 in todoist_read_kv -> src-tauri/src/commands/todoist.rs:blocking call
call src-tauri/src/commands/todoist.rs:29 in todoist_read_kv -> src-tauri/src/db/mod.rs:with_vault_db lexical
call src-tauri/src/commands/todoist.rs:29 in todoist_read_kv -> src-tauri/src/db/todoist_repo.rs:read_kv ref
call src-tauri/src/commands/todoist.rs:35 in todoist_read_links -> src-tauri/src/commands/todoist.rs:blocking call
call src-tauri/src/commands/todoist.rs:35 in todoist_read_links -> src-tauri/src/db/mod.rs:with_vault_db lexical
call src-tauri/src/commands/todoist.rs:35 in todoist_read_links -> src-tauri/src/db/todoist_repo.rs:read_links ref
call src-tauri/src/commands/todoist.rs:41 in todoist_read_sections -> src-tauri/src/commands/todoist.rs:blocking call
call src-tauri/src/commands/todoist.rs:41 in todoist_read_sections -> src-tauri/src/db/mod.rs:with_vault_db lexical
call src-tauri/src/commands/todoist.rs:41 in todoist_read_sections -> src-tauri/src/db/todoist_repo.rs:read_sections ref
call src-tauri/src/commands/todoist.rs:48 in todoist_commit_state -> src-tauri/src/commands/todoist.rs:blocking call
call src-tauri/src/commands/todoist.rs:49 in todoist_commit_state -> src-tauri/src/db/mod.rs:with_vault_db_transaction lexical
call src-tauri/src/commands/todoist.rs:50 in todoist_commit_state -> src-tauri/src/db/todoist_repo.rs:apply_commit lexical
call src-tauri/src/commands/todoist.rs:63 in todoist_append_log -> src-tauri/src/commands/todoist.rs:blocking call
call src-tauri/src/commands/todoist.rs:64 in todoist_append_log -> src-tauri/src/db/mod.rs:with_vault_db_transaction lexical
call src-tauri/src/commands/todoist.rs:65 in todoist_append_log -> src-tauri/src/db/todoist_repo.rs:append_log lexical
call src-tauri/src/commands/todoist.rs:75 in todoist_read_log -> src-tauri/src/commands/todoist.rs:blocking call
call src-tauri/src/commands/todoist.rs:75 in todoist_read_log -> src-tauri/src/db/mod.rs:with_vault_db lexical
call src-tauri/src/commands/todoist.rs:75 in todoist_read_log -> src-tauri/src/db/todoist_repo.rs:read_log lexical
## ipc-in
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:316 in cycle -> ipc:todoist_read_kv -> src-tauri/src/commands/todoist.rs:28
ipc-call src/lib/features/todoist-sync/sync-scheduler.service.ts:238 in firstRunDone -> ipc:todoist_read_kv -> src-tauri/src/commands/todoist.rs:28
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:335 in cycle -> ipc:todoist_read_links -> src-tauri/src/commands/todoist.rs:34
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:336 in cycle -> ipc:todoist_read_sections -> src-tauri/src/commands/todoist.rs:40
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:573 in cycle -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:605 in cycle -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:679 in pushCompletions -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:721 in pushFields -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:807 in pushCreates -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:846 in pushSections -> ipc:todoist_commit_state -> src-tauri/src/commands/todoist.rs:47
ipc-call src/lib/features/todoist-sync/sync-log.service.ts:39 in logCycle -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:578 in cycle -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:683 in pushCompletions -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:722 in pushFields -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:811 in pushCreates -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:848 in pushSections -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:944 in pushProjectUpdates -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-now.service.ts:971 in renameProjectNotes -> ipc:todoist_append_log -> src-tauri/src/commands/todoist.rs:58
ipc-call src/lib/features/todoist-sync/sync-log.service.ts:24 in showSyncLog -> ipc:todoist_read_log -> src-tauri/src/commands/todoist.rs:73
ipc-call src/lib/features/todoist-sync/sync-log.service.ts:38 in logCycle -> ipc:todoist_read_log -> src-tauri/src/commands/todoist.rs:73
