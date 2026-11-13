# file card src-tauri/src/commands/debug.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/commands/debug.rs ' codemap/files
file src-tauri/src/commands/debug.rs rust L54 module src-tauri/src/commands in1 t1 t:inline
## imports
imp src-tauri/src/commands/debug.rs:1 -> src-tauri/src/utils/logger.rs self
imp src-tauri/src/commands/debug.rs:1 -> src-tauri/src/utils/main_heartbeat.rs self
imp src-tauri/src/commands/debug.rs:1 -> src-tauri/src/utils/resource_usage.rs self
## imported-by
imp src-tauri/src/lib.rs:385 -> src-tauri/src/commands/debug.rs set_tauri_debug_mode
imp src-tauri/src/lib.rs:386 -> src-tauri/src/commands/debug.rs set_main_thread_heartbeat
imp src-tauri/src/lib.rs:387 -> src-tauri/src/commands/debug.rs get_process_memory
## reach
in2 src-tauri/src/commands/debug.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/commands/debug.rs 0 files in 0 modules: -
## tests
test src-tauri/tests/commands/debug_test.rs imports src-tauri/src/commands/debug.rs
## symbols
sym src-tauri/src/commands/debug.rs:12 cmd set_tauri_debug_mode(enabled: bool) -> Result<(), String> L7 | Enables or disables Rust-side debug logging to the frontend.
by src-tauri/src/commands/debug.rs:set_tauri_debug_mode <- src-tauri/src/lib.rs:385 in run import
sym src-tauri/src/commands/debug.rs:23 cmd set_main_thread_heartbeat(app: tauri::AppHandle, enabled: bool) -> Result<(), String> L4 | Starts or stops the native main-thread heartbeat (`[MAIN-HB] stall Nms` lines through `debug_log`).
by src-tauri/src/commands/debug.rs:set_main_thread_heartbeat <- src-tauri/src/lib.rs:386 in run import
sym src-tauri/src/commands/debug.rs:30 cmd get_process_memory() -> Result<u64, String> L14 | Returns the current process's resident set size (RSS) in bytes.
by src-tauri/src/commands/debug.rs:get_process_memory <- src-tauri/src/lib.rs:387 in run import
## calls
call src-tauri/src/commands/debug.rs:13 in set_tauri_debug_mode -> src-tauri/src/utils/logger.rs:set_debug_mode lexical
call src-tauri/src/commands/debug.rs:15 in set_tauri_debug_mode -> src-tauri/src/utils/resource_usage.rs:ensure_periodic_sampler lexical
call src-tauri/src/commands/debug.rs:24 in set_main_thread_heartbeat -> src-tauri/src/utils/main_heartbeat.rs:set_enabled lexical
## ipc-in
ipc-call src/lib/utils/debug.ts:107 in setTauriDebugMode -> ipc:set_tauri_debug_mode -> src-tauri/src/commands/debug.rs:12
ipc-call src/lib/utils/log.service.ts:176 in setNativeHeartbeat -> ipc:set_main_thread_heartbeat -> src-tauri/src/commands/debug.rs:23
ipc-call src/lib/utils/debug.ts:161 in logProcessMemory -> ipc:get_process_memory -> src-tauri/src/commands/debug.rs:30
