# file card src-tauri/src/utils/main_heartbeat.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/utils/main_heartbeat.rs ' codemap/files
file src-tauri/src/utils/main_heartbeat.rs rust L151 module src-tauri/src/utils in1 t0 t:inline | Native main-thread heartbeat.
## imports
imp src-tauri/src/utils/main_heartbeat.rs:12 -> src-tauri/src/utils/logger.rs debug_log
## imported-by
imp src-tauri/src/commands/debug.rs:1 -> src-tauri/src/utils/main_heartbeat.rs self
## reach
in2 src-tauri/src/utils/main_heartbeat.rs 1 files in 1 modules: src-tauri/src(1)
out2 src-tauri/src/utils/main_heartbeat.rs 0 files in 0 modules: -
## symbols
sym src-tauri/src/utils/main_heartbeat.rs:15 type MainTask L1 | A closure handed to the main thread.
sym src-tauri/src/utils/main_heartbeat.rs:18 const INTERVAL L1 | Gap between ticks, the same as the JS heartbeat.
sym src-tauri/src/utils/main_heartbeat.rs:21 const STALL_THRESHOLD L1 | A closure that runs later than this after it was posted counts as a stall.
sym src-tauri/src/utils/main_heartbeat.rs:28 fn run_heartbeat(post: impl Fn(MainTask) -> bool, interval: Duration, threshold: Duration, stop: &AtomicBool, report: impl Fn(u64),) L22 | Runs the heartbeat until `stop` is set.
sym src-tauri/src/utils/main_heartbeat.rs:57 fn set_enabled(enabled: bool, post: impl Fn(MainTask) -> bool + Send + 'static) L24 | Starts the heartbeat thread with `post` as the main-thread poster, or stops it.
by src-tauri/src/utils/main_heartbeat.rs:set_enabled <- src-tauri/src/commands/debug.rs:24 in set_main_thread_heartbeat lexical
## calls
call src-tauri/src/utils/main_heartbeat.rs:73 in set_enabled -> src-tauri/src/utils/main_heartbeat.rs:run_heartbeat call
call src-tauri/src/utils/main_heartbeat.rs:74 in set_enabled -> src-tauri/src/utils/logger.rs:debug_log lexical
## effects
fx src-tauri/src/utils/main_heartbeat.rs:47 rust-timer.sleep in run_heartbeat
