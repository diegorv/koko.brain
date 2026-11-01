# 26: Make logger and watcher Tauri-free (single crate)

**What to build:**
- **Logger.** Replace the global `APP_HANDLE` with a sink. Core keeps `DEBUG_ENABLED`, `debug_log` and stderr, and exposes `set_log_sink(Box<dyn Fn(&str, &str) + Send + Sync>)`. The `lib.rs` setup installs a closure that emits `tauri-debug-log` with `DebugLogPayload`.
- **Watcher.** In `vault/watcher.rs`, add `replace_watcher(&VaultWatcherState, &str, F)` and `stop_watcher(&VaultWatcherState)`. Move both `#[tauri::command]`s to a new `commands/watcher.rs` as thin wrappers, and update `generate_handler!` and the `init_logger` import at `lib.rs:27`.
- **Watcher race (behaviour change, likely, not run).** `VaultWatcher` stores no `JoinHandle`, so dropping the old watcher inside the lock does not wait for its bridge thread. The thread's final flush in the `Disconnected` arm can fire after the new watcher is installed, which is what the Audit Tier 2 #7 comment (`watcher.rs:268-276`) says cannot happen. Store the handle and join the bridge thread in `replace_watcher` / `stop_watcher`.

**Blocked by:** none

**Status:** resolved

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml`

**Source:** src-tauri/src/utils/logger.rs, src-tauri/src/vault/watcher.rs:105-332, src-tauri/src/lib.rs:257,313-314, tests/utils_logger_test.rs, tests/vault_watcher_test.rs, ADR-0031

- [x] `grep -rnE 'tauri::|use tauri|AppHandle|Emitter' src-tauri/src/{vault,db,search,semantic,utils}` returns nothing
- [x] New test: with a sink installed and debug on, `debug_log("T","m")` delivers a message containing ("T","m") to the sink; with debug off, the sink is not called. One `#[test]` runs on, then off, in its own test binary (or behind the existing self-exec pattern): `DEBUG_ENABLED` and the sink are process globals that the inline logger tests toggle in parallel
- [x] A replace-semantics test calls `replace_watcher` and asserts that after it returns, no old-vault path reaches the shared callback, and the new watcher emits. `stop_watcher` on an empty state returns Ok. (`vault_watcher_test.rs:187` already covers replacement at the `start_watcher_inner` level; this test covers the lock path and the join.)
- [x] The "cannot test without AppHandle" comments in both test files are removed or rewritten
- [x] Event names and payload shapes are unchanged
- [x] A ratchet test (or CI grep) keeps `{vault,db,search,semantic,utils}` free of tauri imports, which gives the core-crate guarantee without the crate split

## Notes

- **Why Rust first:** the crate split (issue 29) needs this, and it also makes the logger's event path testable.
- **Order with Tauri v3:** do this before the Tauri v3 migration lands; issues 27-30 are independent of v3 (only 29's `Cargo.toml` would conflict). Do not rebase `update-tauri-to-v3` (8 ahead, 341 behind). When upstream beta ships, branch fresh from main, cherry-pick the docs/workflow commits (868617c1, 3306f8a9, 88521dba) and c097d01d (frontend code: build-info and `vite.config.js`, so it needs the frontend gate), re-apply by hand the Rust changes (`lib.rs` 6 lines including `.runtime(tauri_runtime_wry::Wry::default())`, `Cargo.toml` ~36 lines, ad03712f's `tests/lib_test.rs`, 01f022bd's e2e mock and race-audit test), and regenerate Cargo.lock by bumping all tauri crates together.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/26-rust-logger-and-watcher-tauri-free`: `debug_log` routes through an installable sink (lib.rs installs the Tauri emitter); the watcher core takes an `on_change` callback, with `replace_watcher` / `stop_watcher` joining the old bridge thread, and the commands moved to `commands/watcher.rs`; a ratchet test keeps `vault/db/search/semantic/utils` Tauri-free. Deliver fixes: ADR 0031 amendment for the moved commands and the join, ratchet regex widened to any `tauri*::` path. Tests: vitest 397 files / 9528 passed, `pnpm build` ok, cargo test 1195 passed / 0 failed. Review round 1: APPROVED (1 minor, 2 nits; 2 fixed, 1 needed no change).
