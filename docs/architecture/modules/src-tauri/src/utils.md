---
summary: "Shared backend helpers: atomic and vault-aware file operations, debug logging, main-thread heartbeat and process resource sampling."
---

## Responsibility

Owns Rust utilities that other backend modules call: vault filesystem helpers in fs.rs (atomic writes, vault path validation, markdown file collectors and filename classification), the debug logger in logger.rs (gated stderr output and a frontend event sink), the native main-thread stall detector in main_heartbeat.rs, and process CPU and memory sampling in resource_usage.rs. It owns no Tauri command: the commands that switch the logger, sampler and heartbeat on and off are in commands/debug.rs. Its only state is a few process-wide statics.

## Key files

- `src-tauri/src/utils/fs.rs`: write_atomic, validate_vault_path, the three markdown collectors and the filename predicates.
- `src-tauri/src/utils/logger.rs`: debug_log, set_debug_mode, is_debug_enabled, set_log_sink and DebugLogPayload.
- `src-tauri/src/utils/main_heartbeat.rs`: run_heartbeat and set_enabled: posts a closure to the app main thread each interval and logs stalls.
- `src-tauri/src/utils/resource_usage.rs`: cpu_usage, memory_usage, describe_memory, EmbedPass timing and ensure_periodic_sampler.
- `src-tauri/src/commands/debug.rs`: The Tauri commands that enable the logger, the sampler and the heartbeat.
- `src-tauri/src/lib.rs`: Installs the log sink that emits tauri-debug-log.

## State

- Process-wide statics: the debug-enabled flag and the log sink (logger.rs), the running heartbeat's stop flag (main_heartbeat.rs), the sampler-started flag (resource_usage.rs) and the write sequence counter (fs.rs).
- Temp files named <target>.tmp-<pid>-<seq> created next to the target during write_atomic and renamed over it or removed on failure.
- No database or persistent file of its own.

## Collaborators

- `src-tauri/src/commands`: debug.rs drives logger, resource_usage and main_heartbeat; vault.rs, files.rs, db.rs, search_index.rs and semantic.rs use fs helpers and debug_log; history.rs and watcher.rs use debug_log.
- `src-tauri/src/vault`: entry.rs and index.rs use fs::is_view_filename; parsing.rs and watcher.rs use debug_log; watcher.rs matches the write_atomic temp file naming to ignore those files.
- `src-tauri/src/db`: db/mod.rs, fts_repo.rs and semantic_repo.rs use debug_log.
- `src-tauri/src/semantic`: embedder.rs, reranker.rs and qos.rs use debug_log.
- `src-tauri/src/quick_capture`: commands.rs uses fs::validate_vault_path and debug_log.
- `src-tauri/src`: lib.rs installs the log sink with set_log_sink and emits tauri-debug-log from it.
- `src-tauri/tests`: utils_fs_test.rs, utils_logger_test.rs, utils_logger_sink_test.rs and utils_resource_usage_test.rs import this module through kokobrain_lib.
- `IPC:set_tauri_debug_mode`: Implemented in commands/debug.rs; calls logger::set_debug_mode and, when enabling, resource_usage::ensure_periodic_sampler.
- `IPC:set_main_thread_heartbeat`: Implemented in commands/debug.rs; calls main_heartbeat::set_enabled with a main-thread poster.
- `event:tauri-debug-log`: Emitted by the sink installed from lib.rs; the payload type DebugLogPayload is defined in logger.rs.

## Gotchas

- write_atomic refuses a read-only target with an error, because a rename would otherwise replace it silently.
- write_atomic creates <target>.tmp-<pid>-<seq> in the same directory, and vault/watcher.rs relies on this naming to ignore those temp files.
- keep_created_time copies the creation time to the new file on macOS only; other platforms keep the rename's creation time.
- The three collectors return different file sets: collect_markdown_paths and collect_markdown_paths_with_metadata include .view files, while collect_markdown_paths_with_mtime keeps only is_search_indexed_filename files and drops them. Callers must pick the one that matches their index.
- The directory walkers skip dot-prefixed names, symlinks and excluded folders, and stop descending at a fixed depth limit.
- validate_vault_path returns the canonical path and errors when it is not a directory; callers should keep using that value rather than the raw input.
- debug_log is a no-op unless set_debug_mode(true) was called. The sink is installed once and only the first set_log_sink call takes effect.
- DebugLogPayload has #[ts(export)], so changing it requires regenerating the bindings in src/lib/contracts/generated.
- The heartbeat reports one stall per late closure and then sleeps for the interval. It ends when the post to the main thread fails, the closure is dropped unrun, or set_enabled(false) sets the stop flag; starting it twice is a no-op.
- resource_usage reads CPU time with getrusage because proc_pid_rusage time fields can be Mach ticks on Apple silicon. memory_usage is macOS-specific.
- ensure_periodic_sampler starts one thread for the life of the process and is only started by enabling debug mode; the thread's output is gated by debug logging.
