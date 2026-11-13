# h10-debounce: raw deep-dive report

Worktree read: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro
Claim file: .scratch/file-io-audit/deep/items/h10-debounce.md (one id: save-pipeline-10)

## Bug 1: body auto-save is trailing-only and nothing saves on Cmd+Q or crash (covers save-pipeline-10)

Verdict: CONFIRMED_BY_TEST for the timer behavior. The quit path is CONFIRMED_BY_TRACE with one gap noted below.
Priority: P0 for the "type, then Cmd+Q within 2 s" path. Lower (P1) for the long-run-then-crash variant.

### Code trace

- `src/lib/utils/debounce.ts:9-17`: every call clears the timer and re-arms it for `delay`. There is no maxWait. During continuous typing the function never runs.
- `src/lib/core/editor/editor.service.ts:197`: `debouncedSave = debounce(saveDirtyTabs, 2000)`.
- `src/lib/core/editor/editor.service.ts:213-227`: `scheduleAutoSave` arms it per keystroke through `onContentChange`. There is no other arming path.
- `src/lib/core/editor/editor.service.ts:183-193`: `saveDirtyTabs` writes only when the timer fires.
- Quit and close paths:
  - `src/lib/app/tauri-listeners.service.ts:53-70`: `registerCloseHandler` runs `saveAllDirtyTabs()` on `onCloseRequested`. This covers the red window button only.
  - `src/routes/(app)/+layout.svelte:44-46` wires it.
  - `src-tauri/src/lib.rs:184-196`: the app menu uses predefined `.quit()`. There is no custom Quit item and no RunEvent handler in src-tauri (grep for `RunEvent`, `ExitRequested`, `on_exit` returns nothing).
- No blur, `beforeunload`, `pagehide` or `visibilitychange` save exists in src/lib. `visibilitychange` is used only in `utils/log.service.ts:110` and `features/event-calendar/event-calendar.service.ts:309`. The claim's grep is correct.
- No dirty-buffer persistence: no localStorage or sessionStorage draft of tab content, and no crash-recovery file.

### Third-party behavior (fetched, not from ~/.cargo)

- tao v0.37.2 `src/platform_impl/macos/app_delegate.rs` (fetched from `raw.githubusercontent.com/tauri-apps/tao/tao-v0.37.2/...`): the delegate does not implement `applicationShouldTerminate:`. `applicationWillTerminate:` only calls `AppState::exit()`. Per-window `WindowEvent::CloseRequested` is emitted only from `on_close_requested`, which is reached from `TaoWindowEvent::CloseRequested` and `WindowMessage::Close`. Native Quit therefore does not send per-window close events.
- tauri-runtime-wry v2.12.3 (`crates/tauri-runtime-wry/src/lib.rs` at tauri-v2.12.5, fetched): `RunEvent::ExitRequested` is emitted on last-window destroy or on `RequestExit`. Nothing in the fetched portion maps Quit to `CloseRequested`.
- Gap: I did not read `AppState::exit()` (tao `app_state.rs`) or the tail of the tauri file past offset 100000 in full. I did not confirm empirically that Cmd+Q skips `onCloseRequested`. This is an inference from source. Treat it as CONFIRMED_BY_TRACE, not a runtime fact.

### Repro

File: `src/tests/repro/h10-debounce/continuous-typing-no-save.test.ts`
Uses the real `debounce` and the real `editor.service` (only Tauri APIs mocked), fake timers. It types 15 keystrokes 1 s apart (no 2 s gap) and asserts `writeTextFile` was called.

Command: `./node_modules/.bin/vitest run src/tests/repro/h10-debounce/continuous-typing-no-save.test.ts`

Result: FAILED. `AssertionError: expected "vi.fn()" to be called at least once` at line 74. Output shows 1 failed test, 0 passed.

### Reachability

- Typing, then Cmd+Q (or force quit, or crash, or power loss) within 2 s of the last keystroke: the whole run since the last 2 s pause is in memory only. Nothing else holds it, so it is lost. This matches a common sequence and default settings. Window-close via the red button is saved by `registerCloseHandler`, so that path is safe.
- Long continuous run (no 2 s pause for minutes) then crash: the same loss, larger. Less common.
- Recoverable: no. The disk file is stale, file history snapshots only on save (not checked in depth), and the undo stack lives in the dead process.

### What the claim gets wrong or overstates

- "Loses the entire run": the loss is bounded by the typing since the last 2 s pause, not necessarily the whole session.
- "Switching to another app does not save": correct, but that alone loses nothing. Loss needs a crash or quit.
- Line anchors (debounce.ts:9, editor.service.ts:224-227) are accurate.

### Fix sketch (not applied)

- Add a maxWait to the body debounce (for example, force a save if dirty for more than 5 s), and add a test like the repro.
- Handle Cmd+Q: either override the Quit menu item with a custom item that runs `saveAllDirtyTabs()` before `app.exit`, or listen for the app exit request on the Rust side and wait for JS to flush. Verify on macOS with a real Cmd+Q.
- Consider a blur or hidden-window save. Cheap and covers app switching before a crash.

### Not checked

- No runtime Cmd+Q test on macOS. The Cmd+Q conclusion rests on tao source.
- File-history snapshot coverage of unsaved text was not traced.
- The frontmatter 500 ms timer shares the same trailing-only shape but is a shorter window. Not separately assessed.
