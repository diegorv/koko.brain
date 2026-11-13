# file card src-tauri/src/utils/logger.rs
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src-tauri/src/utils/logger.rs ' codemap/files
file src-tauri/src/utils/logger.rs rust L111 module src-tauri/src/utils in20 t4 t:inline
## imported-by
imp src-tauri/src/commands/db.rs:3 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/commands/debug.rs:1 -> src-tauri/src/utils/logger.rs self
imp src-tauri/src/commands/files.rs:2 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/commands/history.rs:2 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/commands/search_index.rs:7 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/commands/semantic.rs:17 -> src-tauri/src/utils/logger.rs debug_log,is_debug_enabled
imp src-tauri/src/commands/vault.rs:3 -> src-tauri/src/utils/logger.rs debug_log,is_debug_enabled
imp src-tauri/src/commands/watcher.rs:2 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/db/fts_repo.rs:1 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/db/mod.rs:7 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/db/semantic_repo.rs:1 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/lib.rs:31 -> src-tauri/src/utils/logger.rs set_log_sink,DebugLogPayload
imp src-tauri/src/quick_capture/commands.rs:248 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/semantic/embedder.rs:1 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/semantic/qos.rs:23 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/semantic/reranker.rs:1 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/utils/main_heartbeat.rs:12 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/utils/resource_usage.rs:16 -> src-tauri/src/utils/logger.rs debug_log,is_debug_enabled
imp src-tauri/src/vault/parsing.rs:15 -> src-tauri/src/utils/logger.rs debug_log
imp src-tauri/src/vault/watcher.rs:22 -> src-tauri/src/utils/logger.rs debug_log
## reach
in2 src-tauri/src/utils/logger.rs 6 files in 4 modules: src-tauri/src/vault(3) src-tauri/src(1) src-tauri/src/commands(1) src-tauri/src/search(1)
out2 src-tauri/src/utils/logger.rs 0 files in 0 modules: -
## tests
test src-tauri/examples/retrieval_eval.rs example src-tauri/src/utils/logger.rs
test src-tauri/tests/commands/debug_test.rs imports src-tauri/src/utils/logger.rs
test src-tauri/tests/utils_logger_sink_test.rs imports src-tauri/src/utils/logger.rs
test src-tauri/tests/utils_logger_test.rs imports src-tauri/src/utils/logger.rs
test src-tauri/tests/vault_frontmatter_parity_test.rs imports src-tauri/src/utils/logger.rs
## symbols
sym src-tauri/src/utils/logger.rs:10 type LogSink L1 | Receives `(tag, message, ts_ms)` for every enabled `debug_log` call; `ts_ms` is the wall-clock time of the call in ms since the Unix epoch.
sym src-tauri/src/utils/logger.rs:23 struct DebugLogPayload L8 dto:DebugLogPayload | Payload emitted to the frontend for each debug log event.
by src-tauri/src/utils/logger.rs:DebugLogPayload <- src-tauri/src/lib.rs:290 in run ref
sym src-tauri/src/utils/logger.rs:35 fn set_log_sink(sink: LogSink) L3 | Installs the sink that `debug_log` forwards to after writing stderr.
by src-tauri/src/utils/logger.rs:set_log_sink <- src-tauri/src/lib.rs:287 in run lexical
sym src-tauri/src/utils/logger.rs:40 fn set_debug_mode(enabled: bool) L3 | Sets whether debug logging is enabled.
by src-tauri/src/utils/logger.rs:set_debug_mode <- src-tauri/src/commands/debug.rs:13 in set_tauri_debug_mode lexical
sym src-tauri/src/utils/logger.rs:45 fn is_debug_enabled() -> bool L3 | Returns whether debug logging is currently enabled.
by src-tauri/src/utils/logger.rs:is_debug_enabled <- src-tauri/src/commands/semantic.rs:672 in build_semantic_index_inner lexical +1
by src-tauri/src/utils/logger.rs:is_debug_enabled <- src-tauri/src/commands/vault.rs:65 in log_vault_shape_once lexical
by src-tauri/src/utils/logger.rs:is_debug_enabled <- src-tauri/src/utils/resource_usage.rs:173 in ensure_periodic_sampler lexical
sym src-tauri/src/utils/logger.rs:54 fn debug_log(tag: &str, msg: impl Display) L14 | Logs a debug message.
by src-tauri/src/utils/logger.rs:debug_log <- src-tauri/src/commands/db.rs:8 in open_vault_db lexical +1
by src-tauri/src/utils/logger.rs:debug_log <- src-tauri/src/commands/files.rs:29 in read_files_batch lexical +2
by src-tauri/src/utils/logger.rs:debug_log <- src-tauri/src/commands/history.rs:68 in save_snapshot_blocking lexical +3
by src-tauri/src/utils/logger.rs:debug_log <- src-tauri/src/commands/search_index.rs:78 in build_search_index_inner lexical +9
by src-tauri/src/utils/logger.rs:debug_log <- src-tauri/src/commands/semantic.rs:151 in invalidate_search_cache lexical +34
by src-tauri/src/utils/logger.rs:debug_log <- src-tauri/src/commands/vault.rs:40 in CmdTrace::new lexical +33
by src-tauri/src/utils/logger.rs:debug_log <- src-tauri/src/commands/watcher.rs:20 in start_vault_watcher lexical
by src-tauri/src/utils/logger.rs:debug_log <- src-tauri/src/db/fts_repo.rs:107 in search_match lexical +2
more by 10 not shown: src-tauri/src/semantic(3) src-tauri/src/db(2) src-tauri/src/utils(2) src-tauri/src/vault(2) src-tauri/src/quick_capture(1): q importers src-tauri/src/utils/logger.rs:debug_log
## locals
local src-tauri/src/utils/logger.rs:70 fn now_ms() -> u64 L6
## calls
call src-tauri/src/utils/logger.rs:60 in debug_log -> src-tauri/src/utils/logger.rs:now_ms call
