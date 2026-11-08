# Issue 05 discovery

No `spec.md` in the feature folder; plan from the Issue and `research/99-synthesis.md` section 5.

## Files and plan (one commit per item)

1. Native heartbeat: new `src-tauri/src/utils/main_heartbeat.rs`, a pure loop `run_heartbeat(post, interval, threshold, stop, log)`: post a closure, wait for it to run, log the lateness when it is over 50 ms, sleep 250 ms. Waiting for each closure means one stall line per block, not one per queued tick. Command `set_main_thread_heartbeat(app, enabled)` in `commands/debug.rs` (poster = `AppHandle::run_on_main_thread`, tauri 2.12.5 `app.rs:496`), registered in `lib.rs:374`, plus `commands.ts:150,246`. `log.service.ts:96,123` `startHeartbeat`/`stopHeartbeat` call it, so the existing Heartbeat setting gates it. Lines go through `debug_log("MAIN-HB", "stall Nms")`.
2. Rust timestamp: `DebugLogPayload` (`logger.rs:18-23`) gains `ts_ms` (epoch ms, camelCase `tsMs`); `LogSink` takes it (`lib.rs:287`). `debug.ts:123-127` prints `rust=HH:mm:ss.SSS` before the message; `appendLog` keeps the receipt stamp.
3. Queue wait: `ipc.ts` `call()` records `Date.now()` per command while tracking is on (capped queue per command); `takeQueueWait(cmd, enterMs)` pops the oldest. The debug listener turns tracking on/off and, on a `VAULT-CMD` `enter <cmd>` line, logs `[IPC-QUEUE] <cmd> invoke=.. enter=.. queue=Nms`. Only `CmdTrace` commands (`commands/vault.rs:27-48`) emit `enter`.
4. Buffered writer: `log.service.ts:61-82,175` buffers lines, flushes at 50 lines or 250 ms, `flushLog()` and `teardownLogSession()` flush the buffer first.
5. Session facts: `initLogSession` logs `[SESSION] build dev=..`; Rust `VaultIndex::shape()` (`vault/index.rs:191`) counts notes, notes with tasks, tag roots/pairs (same meaning as `tagTreeShape`, over lowercase keys), dirs holding notes; logged with the Rust profile once per vault path after the build in `scan_vault_v2_inner` / `scan_vault_v2_cached_inner` (`commands/vault.rs:1160,1220`).
6. Watcher: `fs.watcher.ts:143` logs the batch paths, capped at 10 plus `+N more`.
7. Per-step timers: `buildTagIndex` already splits IPC/map/build/sort/set (`tags.service.ts:26-55`), no change. `loadDirectoryTree` (`fs.service.ts:74`) and `handleChangedPaths` get `ipc` / `post-IPC` timers.
8. queryjs: `kb-api.ts:373` `ensureCache` logs `QJS-PROFILE ensureCache N=.. ms`; `queryjs-block-widget.ts:165` `execute` logs `ipc` and `body` ms; `renderRunPrompt` logs a line with the policy, no script text.

## Prior-art tests

- `src/tests/lib/utils/log.service.test.ts`, `log.service.stall-probe.test.ts` (fake timers, plugin-fs mock).
- `src/tests/lib/utils/debug.test.ts` (listener via mocked `listen`), `src/tests/lib/contracts/ipc.test.ts`.
- `queryjs-block-widget.test.ts` (real stores, invoke mocked); new case mocks plugin-fs and opens a real log session.
- Rust: `logger.rs` tests; heartbeat test injects a poster that runs the closure late from another thread.

## Risks and defaults

- MAIN-HB and the queue line need Tauri debug mode and "Save Tauri log to file"; the setting copy says so.
- Lines buffered at app quit (up to 250 ms) can be lost; teardown flushes.
- Queue pairing is FIFO per command; a tracking toggle mid-call can mis-pair one line.
- Old `QJS-PROFILE` lines log `jsContent.substring(0, 50)` (script text, may carry note text): left as is, flagged for the owner.
