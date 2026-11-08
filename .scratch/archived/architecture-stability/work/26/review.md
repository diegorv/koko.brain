VERDICT: APPROVED

Review of `git diff main...HEAD` (4787936a..6f503c85) against Issue 26. No `spec.md` exists in the feature folder; ADR-0031 was read for the watcher decisions.

## Acceptance criteria

- [met] `grep -rnE 'tauri::|use tauri|AppHandle|Emitter' src-tauri/src/{vault,db,search,semantic,utils}` returns nothing — ran it in the worktree: no output, grep exit 1. `utils/logger.rs` dropped `use tauri::{AppHandle, Emitter}` and `vault/watcher.rs` dropped `use tauri::Emitter`; both commands moved to `src-tauri/src/commands/watcher.rs`.
- [met] New test: with a sink installed and debug on, `debug_log("T","m")` delivers a message containing ("T","m") to the sink; with debug off, the sink is not called. One `#[test]` runs on, then off, in its own test binary (or behind the existing self-exec pattern): `DEBUG_ENABLED` and the sink are process globals that the inline logger tests toggle in parallel — `src-tauri/tests/utils_logger_sink_test.rs` holds one `#[test]` (`debug_log_reaches_sink_only_when_debug_enabled`) in its own binary; it asserts the sink got exactly `[("T","m")]` with debug on and still has 1 entry after a debug-off call. Ran it: 1 passed.
- [met] A replace-semantics test calls `replace_watcher` and asserts that after it returns, no old-vault path reaches the shared callback, and the new watcher emits. `stop_watcher` on an empty state returns Ok. (`vault_watcher_test.rs:187` already covers replacement at the `start_watcher_inner` level; this test covers the lock path and the join.) — `replace_watcher_joins_old_bridge_before_returning` (old change left in the debounce window, slow callback, asserts no old-vault prefix after return and the new path arrives), `stop_watcher_on_empty_state_is_ok`, plus `stop_watcher_joins_bridge_before_returning`. Mutation probe: I replaced `bridge.join()` with a no-op and both join tests FAILED (8 passed, 2 failed); restored, 10/10 pass.
- [met] The "cannot test without AppHandle" comments in both test files are removed or rewritten — `utils_logger_test.rs:1-17` header now points at `utils_logger_sink_test.rs`; the `vault_watcher_test.rs` section comment (old :177-184) now describes the `replace_watcher` / `stop_watcher` tests. Neither file mentions `AppHandle` any more (grep).
- [met] Event names and payload shapes are unchanged — `lib.rs` sink emits the literal `"tauri-debug-log"` with `DebugLogPayload { tag, message }` (struct untouched); `commands/watcher.rs` emits `VAULT_FILES_CHANGED_EVENT` (`"vault-files-changed"`, `watcher.rs:35`, untouched) with `VaultFilesChangedPayload { paths }`. Command names `start_vault_watcher` / `stop_vault_watcher` are the same (`generate_handler!` now `commands::watcher::*`). No change under `src/lib/contracts/generated`; `fs.watcher.test.ts` + `debug.test.ts` pass (65 tests).
- [met] A ratchet test (or CI grep) keeps `{vault,db,search,semantic,utils}` free of tauri imports, which gives the core-crate guarantee without the crate split — `src-tauri/tests/core_tauri_free_test.rs` walks the five dirs recursively with the Issue's regex, asserts it found files, and reports `file:line` hits. Ran it: 1 passed. All five are directories (`ls src-tauri/src`), so no top-level `vault.rs`-style file escapes the walk.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_watcher_test --test utils_logger_sink_test --test utils_logger_test --test core_tauri_free_test`: exit 0 (10, 1, 4, 1 passed).
- `cargo test --manifest-path src-tauri/Cargo.toml --lib -- logger watcher`: exit 0, 34 passed (inline logger + watcher tests; compiles the changed `lib.rs` setup).
- `pnpm vitest run src/tests/lib/core/filesystem/fs.watcher.test.ts src/tests/lib/utils/debug.test.ts`: exit 0, 65 passed (these assert the command and event names).
- Mutation probe on `VaultWatcher::shutdown` (join removed): the two join tests fail; reverted, worktree clean.
- Test verdict rests on: `src-tauri/tests/vault_watcher_test.rs`, `src-tauri/tests/utils_logger_sink_test.rs`, `src-tauri/tests/utils_logger_test.rs`, `src-tauri/tests/core_tauri_free_test.rs`, the inline `#[cfg(test)]` modules of `utils/logger.rs` and `vault/watcher.rs`, `src/tests/lib/core/filesystem/fs.watcher.test.ts`, `src/tests/lib/utils/debug.test.ts`. The full `cargo test` and the full vitest + build suite are deliver's to run.
- No layer-baseline, `BASELINE_SIZE` or composition-root change; the diff adds tests, so no `Test-Exempt` trailer is needed.

## Correctness notes (no finding)

- Deadlock: `shutdown` joins the bridge thread while holding the `VaultWatcherState` lock. The bridge only calls the emit closure (`app.emit`) and `debug_log`, neither of which takes that lock, so the join cannot deadlock.
- The join is bounded: notify 8.2.1's `FsEventWatcher::drop` stops and joins its runloop thread, which drops the closure holding `event_tx`, so the bridge sees `Disconnected` right away. If a backend kept the closure alive, the bridge would exit at its next stop check, within one 500 ms window.
- `shutdown` sends stop before it drops the watcher, as the old code did. If an event wakes the loop between the two, the loop returns without its final flush and the buffered old-vault change is dropped. That happened before this change too and is harmless (that vault is being left).

## Findings

1. minor: `docs/adr/0031-native-rust-vault-watcher.md:28`: this line is now wrong: it still places the commands at `watcher.rs:280-332` / `lib.rs:313-314` and says start "drops the old watcher inside the lock". The commands now live in `src-tauri/src/commands/watcher.rs`, and `replace_watcher` / `stop_watcher` join the bridge thread. Fix: add a dated amendment (or update the line refs) that names `commands/watcher.rs`, `replace_watcher` / `stop_watcher` and the join. The build report already flags this as left undone; it is outside the acceptance criteria, so it does not block.
2. nit: `src-tauri/tests/core_tauri_free_test.rs:24`: the regex is the Issue's and passes, but it misses an inline fully qualified plugin path with no `use` (for example `tauri_plugin_store::StoreExt` written in a function body). Fix (optional): widen it to `\btauri(_\w+)?::|use tauri|AppHandle|Emitter` so any `tauri*` crate counts. It still finds nothing today: `grep -rn 'tauri_' src-tauri/src/{vault,db,search,semantic,utils}` is empty.
3. nit: `src-tauri/src/commands/watcher.rs:11-12,26`: both commands are sync `#[tauri::command]`s, which Tauri 2 runs on the main thread, so the new join holds the UI thread while the old watcher's final flush emits. That is milliseconds in practice (the emit just posts to the event loop), and before this change the notify drop already joined its runloop thread on that same thread. No change needed; `#[tauri::command(async)]` is an option if a slow flush ever shows up.

## Resolution

1. Fixed: added a dated amendment (2026-11-01) at the top of `docs/adr/0031-native-rust-vault-watcher.md` naming `src-tauri/src/commands/watcher.rs`, `replace_watcher` / `stop_watcher` and the bridge-thread join. The ADR body is left as written, per the ADR rule against rewriting active ADRs.
2. Fixed: the ratchet regex in `src-tauri/tests/core_tauri_free_test.rs` is now `\btauri(_\w+)?::|use tauri|AppHandle|Emitter`, so an inline `tauri_plugin_*::` path counts. It still finds nothing in the core modules.
3. No change, as the review says: the join blocks for milliseconds, and the notify drop already joined on that thread before this change.
