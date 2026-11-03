# 05: Instrumentation sees native main-thread stalls, IPC queue wait and Rust-side times

**Status:** resolved

Priority: P2 (measurement; lands before 08, 11 and 13 so their gains can be measured; 06 and 07 use it for their device checks)

**What to build:** The current instrumentation cannot see the biggest cost found. `[HB]` runs in the WebContent process, so it stayed green through a 1.8 s sync command on the app main thread. Add:

1. **Native main-thread heartbeat:** a Rust background thread posts `run_on_main_thread` every 250 ms and logs `[MAIN-HB] stall Nms` when the closure runs late. Gated by the existing Heartbeat setting.
2. **Rust-side timestamps:** `[TAURI:RUST:*]` lines are stamped when the webview receives them (`src/lib/utils/debug.ts:124-127`, `log.service.ts:66`), so during a JS block they arrive late in a burst. Add a Rust wall-clock or monotonic timestamp to the `debug_log` payload (`src-tauri/src/utils/logger.rs:47-58`) and print both.
3. **IPC queue wait:** log the JS `invoke` start next to the Rust `enter` and report `queue = enter - invoke` per command in `src/lib/contracts/ipc.ts`.
4. **Buffered log writer:** each `appendLog` line is its own `writeTextFile` IPC (`log.service.ts:67-69`); with LP-TRACE on that is about 40 IPCs per decoration pass, which inflates every gap. Buffer and flush every N ms or N lines, and flush on teardown.
5. **Session facts, once:** build flavour (`import.meta.env.DEV`, Rust profile), and vault shape from the `VaultIndex`: notes, notes with tasks (K), tag roots and pairs, directory count.
6. **Watcher batch paths:** log the paths of each batch in `fs.watcher.ts` (capped).
7. **Per-step timers** (pre-IPC, IPC, post-IPC) inside `buildTagIndex`, `loadDirectoryTree` and `handleChangedPaths`: `timeAsync` (`debug.ts:41-51`) mixes IPC wait, JS and the Svelte flush.
8. **queryjs phase timers** (`QJS-PROFILE`): around `ensureCache` (N, ms) and the post-IPC body, plus a log line in `renderRunPrompt`. This proves or refutes that `ensureCache` is the queryjs cost before Issue 13 is built.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend)

**Source:** src/lib/utils/log.service.ts:60-110, src/lib/utils/debug.ts:41-58,124-127,144, src-tauri/src/utils/logger.rs:47-58, src/lib/contracts/ipc.ts:21-26, src/lib/core/filesystem/fs.watcher.ts:122-187, src/lib/plugins/queryjs/kb-api.ts:373-402, src/lib/plugins/queryjs/queryjs-block-widget.ts

- [x] Rust test: the main-thread heartbeat reports a stall when the main closure is delayed past the threshold (inject the clock or the poster)
- [x] The `debug_log` payload carries a Rust timestamp, and the frontend prints it next to the receipt time
- [x] Failing first: N `appendLog` calls inside the flush window produce one write, and teardown flushes the rest
- [x] The queue-wait line appears for a mocked `invoke` with a known enter time
- [x] Widget test: under `first-open`, a second block in the same file logs the run-prompt line
- [x] No new log line carries note text (same rule as the `[NAV]` label, `log.service.ts:155-158`). The existing `QJS-PROFILE` lines log `jsContent.substring(0, 50)` (`queryjs-block-widget.ts:100,112`); the new run-prompt line must not copy that, and whether to trim the old ones is noted for the owner

## Notes

- Periodic RSS sampling and `phys_footprint` belong to the embedder work (Issue 07).
- Research: `.scratch/ui-responsiveness/research/99-synthesis.md` section 5, `A-verify.md` correction 2, `C-verify.md` correction 1, `E-verify.md` (log writer inflation).

## Comments

- 2026-11-02, branch `issue/05-native-main-thread-heartbeat-and-log-fidelity`: native main-thread heartbeat (`main_heartbeat.rs`), Rust timestamp on `debug_log`, buffered `appendLog` flush, IPC queue-wait line, queryjs run-prompt line. Review round 1 APPROVED, fixes: test poster runs zero-delay closures inline, `takeQueueWait` JSDoc names the FIFO drift bound, e2e mock for `set_main_thread_heartbeat`. Review round 2 APPROVED (one doc nit). Tests: vitest 440 files / 10160 passed + build exit=0; cargo test 1229 passed; bindings unchanged.
