# 01 Cmd+Q, Dock Quit and logout skip the save-on-close handler

Status: needs-triage
Priority: P0
Severity: data-loss
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
