# file card src-tauri/src/vault/watcher.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/vault/watcher.rs ' codemap/files
file src-tauri/src/vault/watcher.rs rust L800 module src-tauri/src/vault in2 t1 t:inline | Native Rust file watcher (Phase 9).
## imports
imp src-tauri/src/vault/watcher.rs:22 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/commands/watcher.rs:3 -> src-tauri/src/vault/watcher.rs replace_watcher,stop_watcher,VaultFilesChangedPayload,VaultWatcherState
imp src-tauri/src/lib.rs:32 -> src-tauri/src/vault/watcher.rs VaultWatcherState
## reach
in2 src-tauri/src/vault/watcher.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/vault/watcher.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/vault_watcher_test.rs imports src-tauri/src/vault/watcher.rs
## symbols
sym src-tauri/src/vault/watcher.rs:41 struct VaultFilesChangedPayload L3 dto:VaultFilesChangedPayload | Payload emitted with `vault-files-changed`.
by src-tauri/src/vault/watcher.rs:VaultFilesChangedPayload <- src-tauri/src/commands/watcher.rs:18 in start_vault_watcher ref
sym src-tauri/src/vault/watcher.rs:71 fn is_inside_hidden_dir(path: &str, vault_prefix: &str) -> bool L9 | Returns `true` when any segment of `path` relative to `vault_prefix` starts with `.`.
sym src-tauri/src/vault/watcher.rs:85 fn is_write_atomic_temp(path: &str) -> bool L11 | Returns `true` when the last segment of `path` is a `write_atomic` temp file: `<name>.tmp-<pid>-<seq>` (see `utils::fs::write_atomic`).
sym src-tauri/src/vault/watcher.rs:104 fn filter_ancestor_paths(paths: &[String]) -> Vec<String> L12 | Returns the input minus paths that are ancestors of other paths in the same set. macOS FSEvents reports parent directories on child changes (metadata propagati…
sym src-tauri/src/vault/watcher.rs:130 struct VaultWatcher L5 | Inner watcher handle.
sym src-tauri/src/vault/watcher.rs:159 type VaultWatcherState L1 | App-managed watcher state: `Option<VaultWatcher>` behind a `Mutex`.
by src-tauri/src/vault/watcher.rs:VaultWatcherState <- src-tauri/src/commands/watcher.rs:14 in start_vault_watcher ref +1
by src-tauri/src/vault/watcher.rs:VaultWatcherState <- src-tauri/src/lib.rs:320 in run lexical
sym src-tauri/src/vault/watcher.rs:168 fn run_debounce_loop(event_rx: mpsc::Receiver<String>, stop_rx: mpsc::Receiver<()>, vault_prefix: String, on_emit: F,) L79 | Pure-logic version of the bridge thread's event loop, exposed for tests.
sym src-tauri/src/vault/watcher.rs:257 fn start_watcher_inner(vault_path: &str, on_change: F) -> Result<VaultWatcher, String> L44 | Starts a native file watcher rooted at `vault_path`.
sym src-tauri/src/vault/watcher.rs:318 fn replace_watcher(state: &VaultWatcherState, path: &str, on_change: F) -> Result<(), String> L15 | Starts (or replaces) the watcher held in `state`, rooted at `path`.
by src-tauri/src/vault/watcher.rs:replace_watcher <- src-tauri/src/commands/watcher.rs:17 in start_vault_watcher lexical
sym src-tauri/src/vault/watcher.rs:337 fn stop_watcher(state: &VaultWatcherState) -> Result<(), String> L9 | Stops the watcher held in `state` (if any) and joins its bridge thread, so no emit reaches the callback after this returns.
by src-tauri/src/vault/watcher.rs:stop_watcher <- src-tauri/src/commands/watcher.rs:28 in stop_vault_watcher lexical
## locals
local src-tauri/src/vault/watcher.rs:141 fn VaultWatcher::shutdown(self) L12
## calls
call src-tauri/src/vault/watcher.rs:211 in run_debounce_loop -> src-tauri/src/vault/watcher.rs:is_inside_hidden_dir call
call src-tauri/src/vault/watcher.rs:211 in run_debounce_loop -> src-tauri/src/vault/watcher.rs:is_write_atomic_temp call
call src-tauri/src/vault/watcher.rs:221 in run_debounce_loop -> src-tauri/src/vault/watcher.rs:filter_ancestor_paths call +1
call src-tauri/src/vault/watcher.rs:279 in start_watcher_inner -> src-tauri/src/utils/logger.rs:debug_log lexical +1
call src-tauri/src/vault/watcher.rs:289 in start_watcher_inner -> src-tauri/src/vault/watcher.rs:run_debounce_loop call
call src-tauri/src/vault/watcher.rs:329 in replace_watcher -> src-tauri/src/vault/watcher.rs:start_watcher_inner call
## effects
fx src-tauri/src/vault/watcher.rs:287 rust-spawn.spawn in start_watcher_inner
