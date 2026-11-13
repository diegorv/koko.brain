# Issue 01 discovery

## Files that change

- `src/lib/utils/debounce.ts:2-38`: optional `{ maxWait }` (second timer armed at burst start, cleared on fire/cancel/flush).
- `src/lib/core/editor/editor.service.ts:197`: body autosave `debounce(saveDirtyTabs, 2000, { maxWait: 10_000 })`; frontmatter 500 ms untouched.
- New `src/lib/core/vault/exit.service.ts`: `prepareForExit(): Promise<boolean>` = the close-handler body (save dirty tabs, discard prompt, drain, flush settings).
- `src/lib/app/tauri-listeners.service.ts:50-82`: close handler calls `prepareForExit`; new `registerExitRequestListener()` answers the Rust `app:exit-requested` event with `prepareForExit` then `call('confirm_exit')`.
- `src/routes/(app)/+layout.svelte:44`: register the exit listener next to the close handler.
- `src/lib/core/settings/sections/UpdateSection.svelte:208`: `restartApp` returns when `prepareForExit()` is false, else `relaunch()`.
- `src-tauri/src/events.rs` + `src/lib/contracts/events.ts`: `APP_EXIT_REQUESTED_EVENT = "app:exit-requested"`.
- New `src-tauri/src/commands/app_exit.rs`: `ExitFlushState`, pure `exit_decision(code, flushed, has_main_window)`, command `confirm_exit`. `commands/mod.rs`, `contracts/commands.ts` (CommandMap + COMMAND_ARGS).
- `src-tauri/src/lib.rs:195,353`: custom Quit item (`quit`, CmdOrCtrl+Q) that calls `app.exit(0)`; `.build(...).run(|app, event| ...)` handling `RunEvent::ExitRequested`.

## Plan

1. debounce maxWait + autosave max wait (red: repro h10 moved to `src/tests/lib/core/editor/continuous-typing-autosave.test.ts`).
2. `prepareForExit` in core with its own test; close handler delegates.
3. Restart to update (red: repro o01 moved to `src/tests/lib/core/settings/UpdateSection.restart.test.ts`).
4. Rust: event, state, `exit_decision`, `confirm_exit`, Quit item, RunEvent handler; Rust test of `exit_decision` in `src-tauri/tests/commands/app_exit_test.rs`; frontend listener test.

## Why core, not app

`UpdateSection.svelte` is `core/`, and only routes may import `app/` (ADR-0003, `scripts/import-graph.mjs`). So `prepareForExit` lives in `core/vault/` and drains through `drainPendingWrites()` (write-barrier.service.ts:37) instead of importing `features/event-calendar`. Proof of same effect: `registerAppPorts()` (app/boot.ts:37) registers `drainEventCalendarWrites` as the `event-calendar` barrier, called synchronously at `(app)/+layout.svelte:26`, before the close-handler effect at :44, and it is never unregistered outside HMR dispose.

## Rust exit rules (tauri 2.12.5 / runtime-wry 2.12.3 / tao 0.37.2, read from source)

- `app.exit(code)` -> `RequestExit(code)` -> `ExitRequested { code: Some(code) }`, preventable.
- `request_restart` uses `RESTART_EXIT_CODE`; `prevent_exit` is ignored for it, so allow (frontend flushed before `relaunch`).
- `code: None` = last window destroyed: no frontend left to ask, allow.
- No `main` window (closed, app kept alive by the hidden composer): allow, or Quit would hang.
- Already flushed (`confirm_exit` set the flag): allow. Otherwise `prevent_exit` and emit to `main`.

## Dock Quit / logout

tao `applicationWillTerminate` -> `AppState::exit()` -> `Event::LoopDestroyed` -> `RunEvent::Exit`, never `ExitRequested`; not cancellable and no `applicationShouldTerminate`. Not covered; needs a tao patch or an objc delegate method. Follow-up Issue filed; the 10 s max wait bounds the loss.

## Risks / defaults taken

- If the main webview never registers the listener (hung or crashed), Cmd+Q does nothing; Dock Quit still terminates. No timeout added (a timeout would kill the app under an open discard prompt).
- Quit item text "Quit KokoBrain", accelerator CmdOrCtrl+Q, exit code 0.
- Prior-art tests: `src/tests/lib/app/tauri-listeners.service.test.ts` (close handler), `src/tests/lib/utils/debounce.test.ts`.
