# Issue 26 discovery: Tauri-free logger and watcher

No `spec.md` in the feature folder; ADR-0031 (watcher) read for context.

## Files that change

- `src-tauri/src/utils/logger.rs:6,11-26,52-60`: drop `tauri` import, `APP_HANDLE`, `init_logger`. Add `LOG_SINK: OnceLock<Box<dyn Fn(&str,&str)+Send+Sync>>` and `set_log_sink`; `debug_log` calls the sink after stderr. `DebugLogPayload` stays here (ts-rs binding unchanged).
- `src-tauri/src/vault/watcher.rs:29,108-122,264-332`: drop `tauri::Emitter`; `VaultWatcher` stores the bridge `JoinHandle`; add `replace_watcher(state, path, on_change)` and `stop_watcher(state)` that signal stop, drop the notify watcher and `join()` the bridge thread inside the lock. Remove both `#[tauri::command]`s. Module doc line 17-18 updated.
- `src-tauri/src/commands/watcher.rs` (new) + `commands/mod.rs`: thin `start_vault_watcher(app, state, path)` / `stop_vault_watcher(state)` wrappers; the emit closure builds `VaultFilesChangedPayload` and emits `VAULT_FILES_CHANGED_EVENT`.
- `src-tauri/src/lib.rs:27,257,312-313`: import `set_log_sink` + `DebugLogPayload`; setup installs a closure emitting `tauri-debug-log`; handler paths become `commands::watcher::*`.
- Tests: `tests/utils_logger_sink_test.rs` (new, one `#[test]`, own binary), `tests/vault_watcher_test.rs` (replace/stop tests via the lock path; rewrite the "cannot run in a test process" comment at :177-184), `tests/utils_logger_test.rs:1-17` header rewritten, `tests/core_tauri_free_test.rs` (new ratchet). Inline test `logger.rs:84-88` renamed (it mentions `APP_HANDLE`).

## Plan

1. Logger sink: test first (sink test fails to compile), then implement, then lib.rs.
2. Watcher: replace/stop tests first, then `replace_watcher`/`stop_watcher` + join, then `commands/watcher.rs` + lib.rs.
3. Ratchet test: walk `src/{vault,db,search,semantic,utils}` (CARGO_MANIFEST_DIR) and fail on any line matching the Issue's regex `tauri::|use tauri|AppHandle|Emitter`.

## Prior art

- Self-exec / own-binary pattern: `tests/utils_logger_test.rs`. Watcher harness (tempdir, `canon`, `recv_emit`): `tests/vault_watcher_test.rs`.

## Defaults taken

- `set_log_sink` uses `OnceLock`: first call wins, later calls ignored (same as `init_logger` today). Only `lib.rs` setup calls it.
- Sink signature is `(tag, message)`; the closure in lib.rs builds `DebugLogPayload`.
- `Drop` of a bare `VaultWatcher` does not join (existing drop tests keep their semantics); only `replace_watcher` / `stop_watcher` join.
- The old-vault final flush still runs (Disconnected arm), but now completes before `replace_watcher` returns. The join can block up to one debounce window (500 ms) when the notify closure outlives the drop.
- Ratchet scans comments too, matching the acceptance grep.
- ADR-0031 line refs (`watcher.rs:280-332`) go stale; not amended here (out of the Issue's criteria).

## Risks

- Joining under the lock: the callback must never take `VaultWatcherState` (it only emits), so no deadlock.
- Replace test is timing-based (notify + 500 ms debounce), like the existing watcher tests.
