# Dossier: Issue 003 (closing the main window leaves a windowless app)

Checked against HEAD `afc0a9df8` (main, 2026-11-12). Issue file: `.scratch/open-itens/issues/003-closing-main-window-never-leaves-windowless-app.md`. Read-only research; nothing else was edited.

## 1. Still present?

Verdict: present exactly. No commit touching the close path since the audit; `git log -S"destroy()"` on the listener file only reaches the composition-root move (`e83855bab`), and `git log -S"Reopen" -- src-tauri/src` returns nothing. Commit `020af809e` (Issue 01) kept the destroy deliberately.

Facts verified in code at HEAD (line numbers moved from the Issue text where noted):

- `src/lib/app/tauri-listeners.service.ts:48-59`: `onCloseRequested` -> `preventDefault()` -> `await prepareForExit()` (return on false) -> `getCurrentWindow().destroy()` at :54. Registered from `src/routes/(app)/+layout.svelte:50-52` (main webview only).
- `src-tauri/src/lib.rs:402-406`: the run closure matches only `RunEvent::ExitRequested` (Issue said :391-395 / :392-396; it moved). `Reopen` appears nowhere in `src-tauri/src` (grep). `RunEvent::Reopen { has_visible_windows }` exists in tauri 2.12.5 (`tauri-2.12.5/src/app.rs:275-282`, macOS only) and is mapped from tao in `tauri-runtime-wry-2.12.3/src/lib.rs:4337`. The lockfile pins tauri 2.12.5 (`src-tauri/Cargo.lock:5372-5373`).
- `src-tauri/src/lib.rs:297` builds the composer at setup, `:95-103` (`intercept_close_as_hide`) turns its close into hide, so it keeps the process alive. `app_exit.rs:46-48` documents it ("Without a main window (closed, the hidden composer keeps the app alive)").
- `src-tauri/src/lib.rs:40-47`: `dispatch_shortcut` gates only on `crate::db::is_open()`. The clipboard branch (:51-82) reads the clipboard, advances `LastCaptureSignature` and `app.emit(QC_CAPTURE_DETECTED_EVENT, ...)`. The only listener is `registerQuickCaptureListener` (`src/lib/plugins/quick-capture/quick-capture.service.ts:53-75`), registered in the main webview (`+layout.svelte:62-64`). With the main webview destroyed the event goes nowhere, the signature has already advanced (so a second press on the same clipboard is skipped), and a staged image stays in temp.
- Composer path: `submit_composer_capture` also goes through `app.emit(QC_CAPTURE_DETECTED_EVENT)` (Issue cites `quick_capture/commands.rs:484`), so no main listener means the composer's 3 s timeout and 'Save not confirmed' (`src/routes/composer/+page.svelte`). Text stays in the composer, so only the clipboard and deep-link paths drop silently.
- `src-tauri/capabilities/default.json` (main window): has `core:window:allow-destroy` and `allow-close` but no `core:window:allow-hide`. `composer.json` has `allow-hide`. `core:default` does not include hide (per the Issue; I did not open the generated schema to re-verify).
- `Cmd+Q` menu item calls `app.exit(0)` (`lib.rs:~300`, `QUIT_MENU_ID`), which raises `ExitRequested`; `on_exit_requested` (`lib.rs:163-170`) asks the frontend only if `get_webview_window("main")` exists.
- Tests that pin `destroy()`: `src/tests/lib/app/tauri-listeners.service.test.ts` mocks `getCurrentWindow()` with `destroy` only (:36-40, no `hide`); cases using `mockDestroy` at :224, :238, :267, :279 (not-destroy), :291, :311 (call order, :326-329), :332, :359, :372. Rust: `src-tauri/tests/commands/app_exit_test.rs:35-39` `quit_with_the_main_window_closed_goes_on`.

Inference: the Dock click doing nothing follows from no Reopen handler plus no window (the app never creates another `main`). Not run in the app.

## 2. Impact for this owner

- Trigger: red close button instead of Cmd+Q (common macOS habit), then Dock click, `Ctrl+Alt+Cmd+C` clipboard capture, or a `kokobrain://` link. Quick Capture is a daily feature for the owner; no external writer is involved, so nothing here depends on sync.
- Severity: wrong/lost data for captures (silent drop, anchor already advanced) and a broken-looking app (Dock click does nothing, must Cmd+Q and relaunch). Notes already on disk are safe because the flush runs before destroy. Composer path shows an error, no silent loss.
- Likelihood: moderate to high for anyone who closes with the red dot and keeps using the hotkeys; the owner uses Quick Capture daily. Ranks as a real, repeating workflow hit with a cheap fix.

## 3. Complexity and risk

Size: S to M (about 25 lines of production code across 4 files, 2 test files, one manual check). The Issue's "M" is driven by the manual verification and the macOS window behavior, not code volume.

Files and functions:
- `src/lib/app/tauri-listeners.service.ts` `registerCloseHandler` (:48-59): `destroy()` -> `hide()`; update the JSDoc.
- `src-tauri/capabilities/default.json`: add `core:window:allow-hide`.
- `src-tauri/src/lib.rs` run closure (:402-406): add a `RunEvent::Reopen` arm (macOS-only cfg, as the variant is `#[cfg(target_os = "macos")]`; keep the file compiling on Linux CI). Imports at :14.
- `src-tauri/src/commands/app_exit.rs`: add the pure decision (below) and fix the `exit_decision` doc (:43-48), which describes a case (main window closed) that normal use no longer reaches. Keep the `has_main_window` branch and its test: it is harmless and still correct if the window is gone for another reason.
- Tests: `src/tests/lib/app/tauri-listeners.service.test.ts`, `src-tauri/tests/commands/app_exit_test.rs`.

Centrality and readers: the close handler is the single window-close path; `prepareForExit` (`src/lib/core/vault/exit.service.ts:15-23`) is unchanged. `lib.rs` run closure is shared with Issues 090 and 097 (priority file: "`lib.rs` run handler: 003, 090, 097"). No store or CodeMirror code is touched.

What could regress (inference, needs the manual check):
- Hidden webview behavior: macOS WKWebView may throttle timers or `requestAnimationFrame` in a hidden window. The capture path is IPC plus promises (queue in `quick-capture.service.ts:~60`), which should keep running; verify with the clipboard capture after close. I did not find `requestAnimationFrame` in `src/lib/features/deep-link` or `src/lib/plugins/quick-capture` (grep).
- Cmd+Q with a hidden main: `has_main_window` stays true so `AskFrontend` runs, `emit_to("main")` reaches the hidden webview, which runs `prepareForExit` then `confirm_exit`. If that flush fails or hits the discard prompt, the toast/dialog may be hidden behind a hidden window and Quit appears to do nothing. Rare; state the limit, do not add core behavior for it (owner rule).
- Dirty tabs the user chose to discard at close stay dirty in the hidden window; a later Quit asks again. Acceptable.
- Fullscreen: hiding a macOS fullscreen window can leave an empty Space. The main window is configured `maximized`, not fullscreen; only matters if the owner uses fullscreen (unknown). Cheap guard if wanted: leave fullscreen before hide. Not in the Issue; mention to owner only.
- Dock Quit/logout still bypass the flush (Issue 090); unchanged by this work, and nothing new is dirty after the close flush.
- Deep links that open a note while main is hidden run but show nothing; capture-type links work. Not a regression (it was a no-op before); out of scope.

## 4. Implementation plan (test-first, one context)

Assumptions (state before changing): owner decision recorded 2026-11-06, hide plus Reopen; the Issue text confirms it. Gate: Both (cargo test, pnpm check, pnpm vitest run). Cargo is limited to one build at a time. Commit format per `docs/COMMITS.md`; as a `fix:` commit it needs source tests (provided below).

Step 1, failing frontend test (`src/tests/lib/app/tauri-listeners.service.test.ts`):
- Add `const mockHide = vi.fn();` and `hide: (...args) => mockHide(...args)` to the `getCurrentWindow` mock (:36-40).
- New case in `describe('registerCloseHandler')`: all saves succeed, fire the close handler, assert `mockHide` called once and `mockDestroy` not called. It fails today (destroy is called, hide is not).
- Convert the existing destroy cases to the new contract: :224 (name and assertion), :238, :267, :291, :311 (rename "before destroying", use `mockHide.mock.invocationCallOrder`, :326-329), :332, :359, :372 (the cancel cases assert neither hide nor destroy). Keep :279 (cancel keeps window shown) as `mockHide` not called and `mockDestroy` not called. Say in the commit message that the destroy cases were rewritten for the new contract.
- Run: `pnpm vitest run src/tests/lib/app/tauri-listeners.service.test.ts` and confirm red, then implement `hide()`, confirm green.

Step 2, failing Rust test (`src-tauri/tests/commands/app_exit_test.rs`):
- Add a pure fn in `app_exit.rs`, for example `pub fn reopen_should_show_main(main_exists: bool, main_visible: bool) -> bool` (true only when main exists and is not visible). Write tests first: main hidden -> true, main visible -> false, no main -> false. Using the window's own visibility is better than `has_visible_windows`, because a visible composer would make `has_visible_windows` true and the Dock click would then show nothing. This refines the Issue's example ("no visible window -> show main"), and the owner's intent is unchanged.
- Test will not compile until the fn exists; that is the red state.

Step 3, implement:
- `tauri-listeners.service.ts`: `getCurrentWindow().hide()` in place of `.destroy()`; JSDoc: window is hidden, not destroyed, so Quick Capture and deep links keep a frontend. Consider `await` and the existing error style: a rejected hide (missing permission) would be an unhandled rejection; the permission is the real guard, so no extra handling.
- `default.json`: add `"core:window:allow-hide"` next to `allow-destroy`. Leave `allow-destroy`/`allow-close` (cleanup is out of scope; flag only).
- `lib.rs`: add the arm, macOS only, for example
  `#[cfg(target_os = "macos")] if let RunEvent::Reopen { .. } = event { show_main_window(app) }`, where the helper gets `app.get_webview_window(MAIN_WINDOW_LABEL)`, evaluates `reopen_should_show_main(true, win.is_visible().unwrap_or(false))`, then `show()`, `unminimize()`, `set_focus()`. Pass `has_visible_windows` through `..` only if used. Keep the closure's existing `ExitRequested` branch intact (convert to `match`). Verify the exact `Reopen` pattern compiles with `#[non_exhaustive]` (use `..`).
- Doc fix in `app_exit.rs`.

Step 4, gate: `pnpm check`, `pnpm vitest run`, `cargo test --manifest-path src-tauri/Cargo.toml` (serially; ts-rs bindings are unaffected since no `#[ts(export)]` DTO changes).

Step 5, manual check in `pnpm tauri dev` (cannot be automated; vitest does not exercise Tauri windows):
1. Close with the red dot, press `Ctrl+Alt+Cmd+C` on text: a note appears in the vault.
2. Close, open the composer, Cmd+Enter: it reports Saved.
3. Close, click the Dock icon: main shows with the vault open and the focus refresh runs.
4. Close, Cmd+Q: quits after the flush.
5. Optional: minimize then Dock click; close while composer visible then Dock click.

Acceptance criteria review:
- Criterion 1 (hide not destroy): testable; keep. Also assert the other converted cases (listed above).
- Criterion 2 (cancel keeps shown): fine, existing :279.
- Criterion 3 (Rust test for the Reopen decision): the Issue says "for example no visible window -> show main"; prefer the main-window-visibility signature above, since `has_visible_windows` is also true when the hidden composer is shown.
- Criteria 4-6 (capture after close, Dock click, Cmd+Q): untestable in vitest or cargo. They are manual-only; do not claim automated coverage. The E2E script (`bash scripts/e2e.sh`) runs the web build without Tauri windows, so it cannot cover these either.
- Missing: nothing to assert that the capability exists. A permission typo would only show at runtime as a failing `hide()` and the window staying open. Add a one-line check in manual step 1 (the window must actually vanish).
- Missing: a note that the `exit_decision` doc/comment is updated.

## 5. Run order and conflicts

- Blockers: none (Issue says none; Issue 090 is a sibling, not a blocker).
- Hot-code series group: `lib.rs` run handler: 003, 090, 097 (`priority-2026-11-08.md:62`). Run 003 first (smallest, owner-picked first wave), then 090/097 only when they are un-deferred; 097 is deferred. 003 does not conflict with 004, 015, 062, 009, 070, 067, 068, 028, 010, 012 or 002: no shared files except possibly `+layout.svelte` (read only here, not edited).
- Queue position (proposed 004 -> 015, 062, 009, 070, 067 -> 068, 028, 003, ...): no technical dependence on earlier items; it can move up or down freely. Given a daily-use trigger and a small, mostly mechanical change, it is a cheap win and arguably deserves a place earlier than 028 (028 sits in the `editor.service.ts` series, so keeping 003 outside that series lets it run in parallel with the editor chain, one worktree each, serial cargo).
- Owner-decision Issues block rule (memory): the Issue records an owner decision as superseding its old text, so no decision pause is needed; launch with the explicit number only.
- Post-delivery review applies (non-docs fix touching `lib.rs`).

Not verified: runtime behavior of a hidden WKWebView, the exact `Reopen` arm compile shape, whether `core:default` truly omits hide (taken from the Issue), and nothing was built or run.
