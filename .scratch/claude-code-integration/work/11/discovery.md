# Issue 11 discovery: quitting the app cancels running turns

## Files that change

- `src-tauri/src/commands/claude/turn.rs:151-176` (`ClaudeRuns::cancel`): the per-run kill (flag, `kill_group`, second-kill thread) moves into a helper that `cancel` and a new `cancel_all` share.
- `src-tauri/src/lib.rs:406-410` (`.run` closure): `RunEvent::Exit` calls `ClaudeRuns::cancel_all()`.
- `src-tauri/tests/commands/claude_turn_test.rs`: new tests next to `sleeping_run_cancelled_mid_run_ends_in_done` (:326).

## Which RunEvents each exit path raises (Tauri 2.12.5, tauri-runtime-wry 2.12.3, tao 0.37.2, tauri-plugin-process 2.4.0)

Every path ends in tao `Event::LoopDestroyed`, which runtime-wry turns into `RunEvent::Exit` (tauri-runtime-wry lib.rs:4131-4132); tauri's run loop passes it to our callback before cleanup and before a restart (tauri app.rs:1449-1455). Hooking `RunEvent::Exit` alone covers all of them:

- Cmd+Q / menu Quit: `app.exit(0)` (lib.rs:307) -> `Message::RequestExit` -> `ExitRequested` (runtime-wry :4300-4314), prevented once for `prepareForExit`, then `confirm_exit` -> `app.exit(0)` again, not prevented -> `ControlFlow::ExitWithCode` -> `NSApp stop` (tao app_state.rs:403-408) -> `run` returns and calls `AppState::exit()` (tao event_loop.rs:234-240) -> `LoopDestroyed` (app_state.rs:271-273) -> `Exit`.
- Dock Quit, logout: `applicationWillTerminate` -> `AppState::exit()` (tao app_delegate.rs:130-133) -> `LoopDestroyed` -> `Exit`, no `ExitRequested`.
- Last window closed: `Destroyed` with no windows left -> `ExitRequested { code: None }` (runtime-wry :4256-4268) -> `ControlFlow::Exit` -> same as Cmd+Q from there.
- Restart to update: `relaunch()` -> plugin-process `restart` command -> `app.request_restart()` (plugin commands.rs:12-15) -> `request_exit(RESTART_EXIT_CODE)` (tauri app.rs:633-642) -> `ExitRequested` -> `Exit`, then `process::restart` (app.rs:1453-1454). `AppHandle::restart` on the main thread skips both events (app.rs:606-610), but nothing in `src-tauri/src` or the frontend calls it.

## Plan

1. Failing test `cancel_all_kills_every_run_and_its_process_group`: two vaults, fake `claude` `sleep 30 &` + Init whose `session_id` is `$$` (the pid, = group id, since the child leads its group) + `wait`. `cancel_all`, assert both end in `[Done { exit_code: None }]` within 5 s, `runs.is_empty()`, and `killpg(pgid, 0)` reaches `ESRCH` for each (polled briefly: the orphaned `sleep` is reaped by launchd, not by us). Plus `cancel_all` on no runs is a no-op.
2. `ClaudeRuns::cancel_all`: under the lock, run the shared per-run kill for every listed run; returns at once (the second kill runs on its own thread, as in `cancel`).
3. `lib.rs`: `RunEvent::Exit => cancel_all()`, with the source lines above in a comment.

## Prior art

- `sleeping_run_cancelled_mid_run_ends_in_done`, helpers `start`, `script`, `collect_until_done` (claude_turn_test.rs); `libc::kill(pid, 0)` probe in claude_shell_env_test.rs:57. Issue 07 (work/07) for the second kill.

## Defaults taken

- Only `RunEvent::Exit` is hooked, not `ExitRequested`: an `ExitRequested` can still be prevented (the first Cmd+Q one always is), and `Exit` follows every path that does exit.
- No frontend change: `Exit` fires only after the exit went through, so `prepareForExit` still runs first on Cmd+Q.

## Risks

- After `Exit` the process ends within the same callback stack (tao `process::exit`, or `process::restart`), so Issue 07's second-kill thread may not get to run: a child forked during the exit's `killpg` can survive. Waiting for it would hold up quit; not done.
- The lib.rs wiring needs a running app and is checked by hand (same as `app_exit_test.rs` notes).
