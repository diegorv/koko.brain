# 01: Quit, Dock Quit, logout and Restart to update run the same save flush as closing the window

**Status:** resolved

Priority: P0 (data loss in normal use, nothing to recover from)

**What to build:** Today only the window close (red button, Cmd+W on the last window) saves. `registerCloseHandler` (src/lib/app/tauri-listeners.service.ts:50-82) saves dirty tabs, asks before discarding failed saves, drains calendar writes and flushes settings. The app menu uses the predefined `.quit()` (src-tauri/src/lib.rs:195), and `.run(generate_context!())` (lib.rs:353) has no `RunEvent` callback. So Cmd+Q, the app-menu Quit, Dock Quit and logout end the process without that flush, and so does Restart to update (UpdateSection.svelte:208-210 calls `relaunch()` directly). Everything typed since the last 2 s pause is lost. The body autosave is a trailing-only `debounce(saveDirtyTabs, 2000)` (editor.service.ts:197) with no max wait, so continuous typing never saves at all.

Fix, in this order:
1. Extract the body of the close handler into one exported `prepareForExit(): Promise<boolean>` (true = go on, false = the user cancelled at the discard prompt). Have `registerCloseHandler` call it.
2. Replace the predefined `.quit()` with a custom Quit menu item on Cmd+Q. On click, route through `prepareForExit` (for example, close the main window so the existing CloseRequested path runs, or emit an event the frontend answers), then exit.
3. Build with `.build(...).run(|app, event| ...)` and handle `RunEvent::ExitRequested`: unless the frontend has already flushed, `api.prevent_exit()`, ask the frontend to run `prepareForExit`, then exit.
4. `restartApp()` in UpdateSection.svelte calls `prepareForExit()` before `relaunch()` and returns if it is false. This absorbs former issue 21.
5. Give the body autosave a max wait (10 s) so a long typing burst still reaches disk. Keep the 500 ms frontmatter timer as it is.

Dock Quit and logout go through `applicationWillTerminate` in tao, which cannot be cancelled. Check whether `ExitRequested` fires for them. If it does not and the fix would need a tao patch, record that in the Notes and file a follow-up. Do not patch tao in this Issue. Step 5 limits the loss in that case.

**Blocked by:** none

**Gate:** `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build` (Rust and frontend)

**Source:** src-tauri/src/lib.rs:195, src-tauri/src/lib.rs:353, src/lib/app/tauri-listeners.service.ts:50-82, src/lib/core/settings/sections/UpdateSection.svelte:208-210, src/lib/core/editor/editor.service.ts:197, src/lib/utils/debounce.ts

- [x] Failing tests come first, with real stores and only Tauri APIs mocked. Start from `.scratch/file-io-audit/repro/h10-debounce/continuous-typing-no-save.test.ts` and `.scratch/file-io-audit/repro/o01-quit-and-switch/restart-to-update-unsaved.test.ts`, and move them under `src/tests/`
- [x] `prepareForExit` has its own test: it saves dirty tabs, asks before discarding a failed save, returns false on cancel, and drains calendar writes and flushes settings only when it goes on
- [x] Typing one keystroke per second writes the note within 10 s
- [x] Restart to update saves a dirty tab before `relaunch`, and does not relaunch when the user cancels the discard prompt
- [x] Cmd+Q and the app-menu Quit run `prepareForExit` (Rust side tested where possible; record in the commit message what can only be checked by hand)
- [x] Notes record whether Dock Quit and logout are covered, and a follow-up Issue exists if they are not
- [ ] Not verified in the app by the agent: the owner checks Cmd+Q right after typing

## Notes

- Dock Quit and logout are NOT covered. They send `terminate:`, which tao
  0.37.2 handles in `applicationWillTerminate` -> `AppState::exit()` ->
  `Event::LoopDestroyed`, mapped by tauri-runtime-wry 2.12.3 to
  `RunEvent::Exit`; `ExitRequested` never fires for them and tao has no
  `applicationShouldTerminate:`. Follow-up: Issue 44
  (`44-dock-quit-logout-skip-save.md`). The 10 s autosave max wait bounds
  the loss meanwhile.
- `prepareForExit` lives in `src/lib/core/vault/exit.service.ts`, not in
  `app/`: `UpdateSection.svelte` (core) calls it and only routes may import
  `app/`. It drains calendar writes through the write barrier the app
  registers at boot.
- If the main webview never answers `app:exit-requested` (hung, crashed, or
  before the layout mounted), Cmd+Q does nothing; Dock Quit still ends the app.
  No timeout, on purpose: it would end the app while the discard prompt is
  open. The owner's manual check covers Cmd+Q right after typing AND Cmd+Q
  right after launch (before the vault layout mounts); see Issue 44.
- A failed exit flush keeps the app open and shows an error toast; a second
  Quit while a flush or the discard prompt is pending is ignored.

## Audit evidence

Source: file I/O audit, deep-dive group(s) h10-debounce, o01-quit-and-switch (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

Reviewer note: read src-tauri/src/lib.rs: the app menu uses the predefined .quit() and .run(generate_context!()) has no RunEvent closure; the only flush is the window CloseRequested handler. Native path, so no vitest repro; the trace relies on the fetched tao/muda/tauri-runtime-wry source cited below.

## Cmd+Q / app-menu Quit / Dock Quit / logout bypass the JS save-on-close handler; unsaved edits (last <=2 s of typing, or failing saves) are lost with no prompt

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P0, severity data-loss)
- Claims covered: save-pipeline-1, cross-cutting-1, vault-lifecycle-1

**How a user hits it.** Default settings, very common: finish typing and press Cmd+Q right away. The trailing 2 s debounce has no maxWait (src/lib/utils/debounce.ts), so everything typed since the last >=2 s pause is lost. Dock Quit and logout/shutdown take the same terminate: path. A tab whose save keeps failing is also dropped, with no 'Close anyway?' prompt.

**Recoverable from.** none. The process is gone, there is no draft or journal, and File History only snapshots successful saves, so it holds the old bytes.

**Root cause.** src-tauri/src/lib.rs:195 (predefined .quit() -> NSApp terminate:) with lib.rs:353 .run() and no RunEvent/terminate hook; the only flush is the window-CloseRequested handler in src/lib/app/tauri-listeners.service.ts:51-82

**Evidence.** lib.rs:195 .quit(); lib.rs:353 .run(generate_context!()) with no closure; lib.rs:94-99 on_window_event only on the composer window; no beforeunload/pagehide in src/. Fetched muda-v0.20.0 macos/mod.rs:944 Quit => sel!(terminate:), predefined.rs:669 Cmd+Q accelerator. Fetched tao-v0.37.2 app_delegate.rs:46-88 registers no applicationShouldTerminate:; :130-134 applicationWillTerminate -> AppState::exit(); app_state.rs:271-281 emits only Event::LoopDestroyed. Fetched tauri-runtime-wry-v2.12.3 lib.rs:4131 LoopDestroyed => RunEvent::Exit; on_close_requested is only reached from TaoWindowEvent::CloseRequested / WindowMessage::Close. JS flush registerCloseHandler (tauri-listeners.service.ts:51-82), registered at +layout.svelte:45. Autosave is debounce(saveDirtyTabs, 2000) at editor.service.ts:197, fired from every doc change (MarkdownEditor.svelte:124). The <500 ms settings flush and drainEventCalendarWrites are skipped too.

**Fix sketch.** Replace predefined .quit() with a custom Quit MenuItem (Cmd+Q) whose on_menu_event closes the main window so the JS close handler runs, then app.exit(0) after destroy(). Handle RunEvent::ExitRequested via build().run(closure). For Dock Quit/logout add an applicationShouldTerminate: hook returning NSTerminateLater and reply after the JS flush (tao lacks it: needs a patch or an objc method add).

## Body auto-save is trailing-only (no maxWait) and no quit path saves on Cmd+Q, so typed text since the last 2 s pause is lost on quit or crash

- Verdict: CONFIRMED_BY_TEST (deep dive priority P0, severity data-loss)
- Claims covered: save-pipeline-10

**How a user hits it.** Type, then Cmd+Q, force quit, crash or power loss within 2 s of the last keystroke (common sequence, default settings). The lost span is all text typed since the last 2 s pause, so a long continuous run is lost in full. Closing via the red window button is NOT affected because registerCloseHandler saves dirty tabs there. Cmd+Q is inferred from tao source, not run on a device.

**Recoverable from.** none. The disk file stays at the last save, no dirty-buffer persistence or crash-recovery file exists, and undo state dies with the process.

**Root cause.** src/lib/utils/debounce.ts:9-17 (trailing-only timer, no maxWait); src/lib/core/editor/editor.service.ts:197 and 213-227 (only arming path is per-keystroke onContentChange). Quit gap: src/lib/app/tauri-listeners.service.ts:53-70 saves only on onCloseRequested; src-tauri/src/lib.rs:195 uses predefined .quit() with no custom handler.

**Evidence.** Repro src/tests/repro/h10-debounce/continuous-typing-no-save.test.ts (real debounce and editor.service, fake timers, 15 keystrokes 1 s apart) FAILS: AssertionError expected vi.fn() to be called at least once at line 74. Claim's grep is accurate: no blur, beforeunload, pagehide or visibilitychange save in src/lib. Fetched tao v0.37.2 src/platform_impl/macos/app_delegate.rs: no applicationShouldTerminate; applicationWillTerminate only calls AppState::exit(). Per-window CloseRequested is emitted only via on_close_requested, reached from TaoWindowEvent::CloseRequested and WindowMessage::Close. Fetched tauri-runtime-wry lib.rs at tauri-v2.12.5 (first 100000 chars): ExitRequested on last-window destroy or RequestExit. Gap: AppState::exit() and the tail of the tauri file were not read.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h10-debounce/continuous-typing-no-save.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL src/tests/repro/h10-debounce/continuous-typing-no-save.test.ts > body auto-save during a continuous typing run (real debounce) > writes to disk within 10 s of typing 1 keystroke per second, with no 2 s pause. AssertionError: expected "vi.fn()" to be called at least once. Tests: 1 failed.
```

## Audit evidence from former issue 21 (Restart to update)

Source: file I/O audit, deep-dive group(s) o01-quit-and-switch (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity data-loss)
- Claims covered: save-pipeline-2

**How a user hits it.** Narrow. The user must open Settings > Update, click Check, wait for the download, then click Restart. The 2 s body autosave and 500 ms settings debounce normally fire long before that. Loss needs a save that keeps failing (5 s retry loop with repeated toasts) or an unusually fast path. Then the buffer is dropped with no prompt.

**Recoverable from.** none for the unsaved text. File History holds the last successful save only.

**Root cause.** src/lib/core/settings/sections/UpdateSection.svelte:208-210 restartApp() only awaits relaunch()

**Evidence.** UpdateSection.svelte:208-210 and button :292-295. Fetched plugins-workspace process-v2.4.0 commands.rs:13-15 restart -> app.request_restart(). Fetched tauri-v2.12.5 app.rs:633-641 request_restart -> request_exit(RESTART_EXIT_CODE). Fetched tauri-runtime-wry-v2.12.3 lib.rs:4300-4312 RequestExit -> RunEvent::ExitRequested -> ControlFlow::ExitWithCode, with no CloseRequested, so registerCloseHandler never runs. The app has no RunEvent callback.

**Limits found while trying to refute.** Downgraded from data-loss P0/P1 to P2. In normal use the autosave fires during the update download, so loss needs an ongoing save failure or an unusually fast click.

**Repro test.** `.scratch/file-io-audit/repro/o01-quit-and-switch/restart-to-update-unsaved.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL > saves the dirty tab before relaunching: AssertionError: expected 'old' to be 'typed just before clicking Restart' (restart-to-update-unsaved.test.ts:103 expect(savedAtRelaunch).toBe(EDIT)). relaunch was called once, with the real editorStore tab still unsaved.
```

**Fix sketch.** In restartApp: const failed = await saveAllDirtyTabs(); if failed, ask like the close handler and return on cancel; then await drainEventCalendarWrites(); await flushSettingsPersistence(); await relaunch(). Ideally share one prepareForExit() with registerCloseHandler.

## Comments

- 2026-11-02, branch `issue/01-quit-skips-save-on-close`: body autosave gets a 10 s max wait; the close-handler flush is extracted into `prepareForExit`; Restart to update runs it before `relaunch`; Cmd+Q and the app-menu Quit are a custom menu item routed through `RunEvent::ExitRequested` -> `app:exit-requested` -> `prepareForExit` -> `confirm_exit`. Fix round: a failed exit flush now shows a toast, and a repeated Quit during a running flush is ignored. Dock Quit / logout are not covered (Issue 44). Tests: full suite at d5f84421 exit=0 (420 files, 9856 passed, 1 skipped, 1 todo, build OK); cargo test exit=0 (1212 passed). Reviews: round 1 APPROVED (3 findings fixed or recorded), round 2 APPROVED (no findings). `relay review-ticks` refused the file (no `**Status:**` line), so no criteria were ticked and the status line is unchanged.
