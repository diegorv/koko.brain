# 090: Dock Quit, logout and shutdown run the exit flush before the app ends

**Origin:** `audit-2026-11-05` Issue 106, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/archived/file-io-audit/issues/44-dock-quit-logout-skip-save.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). The loss is at most the last 2 s of typing, and only when quitting right after typing. The owner checks the result in the app.

**Audit check at `5f8003d67`:** still_present (content, low). src-tauri/src/lib.rs:392-396 handles only RunEvent::ExitRequested; rg finds no applicationShouldTerminate or NSTerminateLater in src-tauri; src-tauri/src/commands/app_exit.rs:7-9 documents that Dock Quit and logout bypass the flush. Loss is bounded by the 2 s debounce / 10 s maxWait (editor.service.ts:227), so only text typed seconds before a logout or Dock Quit is lost.

**Status:** ready-for-agent

**First wave:** no. Moved out by the owner on 2026-11-06 after the challenge review (`raw/first-wave-challenge.json`): Rust and Objective-C in the tao delegate, no automated test, a risk of blocking logout, for at most 2 to 10 s of typing; 04 runs alone.

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: follow-up of Issue 01 (quit skips save on close)

## Details

Issue 01 routes Cmd+Q, the app-menu Quit, the window close and Restart to
update through `prepareForExit` (`src/lib/core/vault/exit.service.ts`). Dock
Quit, logout and shutdown do not reach it: macOS sends `terminate:`, tao
0.37.2 handles it in `applicationWillTerminate`
(`src/platform_impl/macos/app_delegate.rs`), which calls `AppState::exit()`
and emits `Event::LoopDestroyed`; tauri-runtime-wry 2.12.3 maps that to
`RunEvent::Exit` (lib.rs:4131), never `ExitRequested`. tao implements no
`applicationShouldTerminate:`, so the terminate cannot be deferred while the
webview saves.

Loss today: what was typed since the last body autosave, at most 10 s of a
continuous typing run (Issue 01 added the 10 s max wait) or any span after
the last 2 s pause; a tab whose save keeps failing is dropped without the
discard prompt.

## What to build

Defer `terminate:` until the frontend ran `prepareForExit`: add
`applicationShouldTerminate:` returning `NSTerminateLater` to the app
delegate (a tao patch, or an objc method added to tao's delegate class at
startup), emit `app:exit-requested`, and answer with
`replyToApplicationShouldTerminate:` from `confirm_exit` (and with `NO` when
the user cancels). Decide whether a patched tao is acceptable or the method
is added at runtime.

## Acceptance criteria

- [ ] Dock Quit with a dirty tab writes it before the process ends
- [ ] Logout and shutdown do the same, or the Notes record what macOS allows
- [ ] Cancelling the discard prompt cancels the Dock Quit

## Notes

- From Issue 01's review: Cmd+Q waits for the main webview to answer
  `app:exit-requested` (`src-tauri/src/lib.rs`, `on_exit_requested`). If the
  webview never answers (the layout is not mounted yet, the webview hung, or
  a flush never settles), Quit does nothing; Dock Quit and Force Quit still
  end the app. No timeout was added, since it would end the app while the
  discard prompt is open. The `NSTerminateLater` path built here has the same
  dependency. Manual check for the owner: press Cmd+Q right after launch,
  before the vault layout mounts, and confirm the app still quits (or record
  that it does not).

## Comments

- 2026-11-06: migrated from `.scratch/archived/file-io-audit/issues/44-dock-quit-logout-skip-save.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: moved out of the first wave by the owner after the challenge review.
