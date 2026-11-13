# file card src-tauri/src/commands/watcher.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/watcher.rs ' codemap/files
file src-tauri/src/commands/watcher.rs rust L29 module src-tauri/src/commands in1 t0
## imports
imp src-tauri/src/commands/watcher.rs:1 -> src-tauri/src/events.rs VAULT_FILES_CHANGED_EVENT
imp src-tauri/src/commands/watcher.rs:2 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/commands/watcher.rs:3 -> src-tauri/src/vault/watcher.rs replace_watcher,stop_watcher,VaultFilesChangedPayload,VaultWatcherState
## imported-by
imp src-tauri/src/lib.rs:364 -> src-tauri/src/commands/watcher.rs start_vault_watcher
imp src-tauri/src/lib.rs:365 -> src-tauri/src/commands/watcher.rs stop_vault_watcher
## reach
in2 src-tauri/src/commands/watcher.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/watcher.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/commands/watcher.rs:12 cmd start_vault_watcher(app: tauri::AppHandle, state: tauri::State<'_, VaultWatcherState>, path: String,) -> Result<(), String> L12 | Starts (or replaces) the vault watcher.
by src-tauri/src/commands/watcher.rs:start_vault_watcher <- src-tauri/src/lib.rs:364 in run import
sym src-tauri/src/commands/watcher.rs:27 cmd stop_vault_watcher(state: tauri::State<'_, VaultWatcherState>) -> Result<(), String> L3 | Stops the vault watcher (if any).
by src-tauri/src/commands/watcher.rs:stop_vault_watcher <- src-tauri/src/lib.rs:365 in run import
## calls
call src-tauri/src/commands/watcher.rs:17 in start_vault_watcher -> src-tauri/src/vault/watcher.rs:replace_watcher lexical
call src-tauri/src/commands/watcher.rs:20 in start_vault_watcher -> src-tauri/src/utils/logger.rs:debug_log lexical
call src-tauri/src/commands/watcher.rs:28 in stop_vault_watcher -> src-tauri/src/vault/watcher.rs:stop_watcher lexical
## ipc-in
ipc-call src/lib/core/filesystem/fs.watcher.ts:279 in startWatching -> ipc:start_vault_watcher -> src-tauri/src/commands/watcher.rs:12
ipc-call src/lib/core/filesystem/fs.watcher.ts:298 in stopWatching -> ipc:stop_vault_watcher -> src-tauri/src/commands/watcher.rs:27
## effects
ev src-tauri/src/commands/watcher.rs:19 in start_vault_watcher -> event:vault-files-changed -> src/lib/core/filesystem/fs.watcher.ts:276 in startWatching
