# Refute: Issue 003 (closing the main window leaves a windowless app)

Checked at HEAD `318b6e9b5` (main, 2026-11-12). Read-only. Inputs: `.scratch/open-itens/issues/003-closing-main-window-never-leaves-windowless-app.md` and `dossier-003.md` in this folder.

## Verdict

- **Bug still present: yes.** Nothing on the close path has changed since the audit. Verified in code:
  - `src/lib/app/tauri-listeners.service.ts:51-54`: `preventDefault`, then `await prepareForExit()`, then `getCurrentWindow().destroy()`. Its only caller is `src/routes/(app)/+layout.svelte:50-52`. `git log -3` on the file: last touched by `020af809e` (Issue 01), which kept the destroy.
  - `src-tauri/src/lib.rs:401-405`: the `.run` closure matches only `RunEvent::ExitRequested`. A search for `Reopen` in `src-tauri/src` finds nothing.
  - The composer is built hidden at setup (`lib.rs:297`) and turns its own close into a hide (`lib.rs:95-103`), so the process stays alive. `app_exit.rs:47-48` documents this state.
  - `dispatch_shortcut` gates only on `crate::db::is_open()` (`lib.rs:45-47`). It then emits `qc:capture-detected` (`lib.rs:81`). The only listener is in the main webview (`+layout.svelte:62-64`, `quick-capture.service.ts:62-76`). ADR 0028:47 confirms that the main-window listener does the write.
  - The composer emits the same event (`quick_capture/commands.rs:484`) and waits 3 s for a result (`src/routes/composer/+page.svelte:10,61,216`).
  - `capabilities/default.json:9-14` has `core:default`, `allow-destroy` and `allow-close`, but no `allow-hide`. `core:window:default` does not include `allow-hide` either: `src-tauri/gen/schemas/acl-manifests.json` (key `core:window`, `default_permission`) and `desktop-schema.json:3486-3490`. Only `composer.json:8` grants it.
- **Impact: high.** Quick Capture is daily for this owner, no external writer is needed, and the owner picked this Issue for the first wave. When the bug hits, the clipboard capture is dropped silently and the dedupe anchor has already moved, so a retry is skipped too. The Dock does nothing. Likelihood depends on whether the owner closes with the red button, which is unverified. The first-wave pick suggests they do.
- **Complexity: S.** Production changes: one line in the close handler, one capability, one Rust match arm plus a helper, one doc comment, and (new, see Must-fix 1) one window config key.
- **Risk:**
  - **Medium as the Issue is written.** It asserts "a hidden webview still runs", and Tauri's own docs contradict that (Must-fix 1). If WebKit suspends the hidden main webview, three things go wrong: captures after a close stay queued until the window is shown again, the composer reports 'Save not confirmed', and Cmd+Q holds the exit and waits for a `confirm_exit` that never arrives.
  - **Low after the edits below.**
- **Implementable by a fresh relay-lite agent from the text alone: not yet.** Criteria 4-6 need the app running, which the build/review roles cannot do. The agent would either stop or claim checks it never ran. Criterion 3 points the agent at `has_visible_windows`, which gives the wrong answer while the composer is shown.
- **Recommendation: run-after-edits.** No open owner decision: the 2026-11-06 decision (hide plus Reopen) stands, and Must-fix 1 only makes that decision work.

## Must-fix edits to the Issue text

### 1. The hidden main webview must not be suspended (new requirement)

**Evidence (verified in library source; the runtime effect is inference, not run):**
- `tauri-2.12.5/src/webview/webview_window.rs:1254-1267` documents `background_throttling`: "By default, browsers use a suspend policy that will throttle timers and even unload the whole tab (view) to free resources after roughly 5 minutes when a view became minimized or hidden. This will pause all tasks until the documents visibility state changes back from hidden to visible." It is supported on macOS 14+. The owner's machine runs Darwin 25.
- `tauri-utils-2.10.2/src/config.rs:1855-1866` and `:2240-2254`: `backgroundThrottling` is a `WindowConfig` key with the values `disabled`, `suspend` and `throttle`. The comment says "Suspend ... is usually the default behavior in case no policy is set".
- `wry-0.57.1/src/wkwebview/mod.rs:515-533`: the key maps to `WKPreferences.inactiveSchedulingPolicy`.
- `tao-0.37.2/src/platform_impl/macos/window.rs:643-647`: `hide()` is `orderOut`, so the window really leaves the screen.
- `src-tauri/tauri.conf.json:14-27`: the main window sets no `backgroundThrottling`.

Where it matters: every path the Issue wants to keep working runs JS in the hidden main webview. That covers the capture queue (`quick-capture.service.ts:62-69`), the composer answer (`report_composer_capture_result`, `:95-97`) and the Cmd+Q flush (`lib.rs:163-170` emits to "main", then `tauri-listeners.service.ts:81-86` runs `prepareForExit` and `confirm_exit`).

**Replace in "What to build"** the sentence

> Cmd+Q with a hidden main window must still flush and exit (exit_decision already asks the frontend while the window exists; a hidden webview still runs).

**with:**

> Cmd+Q with a hidden main window must still flush and exit. exit_decision already asks the frontend while the window exists (has_main_window stays true). A hidden webview keeps running only if WebKit does not suspend it: by default WebKit suspends a hidden or minimized view's tasks after about 5 minutes (tauri webview_window.rs:1254-1267, macOS 14+). Set `"backgroundThrottling": "disabled"` on the main window in src-tauri/tauri.conf.json (app.windows[0]). Without it, captures wait until the window is shown again, the composer reports 'Save not confirmed', and Cmd+Q waits for a confirm_exit that never comes. The composer window needs no change, because it is shown before it runs any capture code.

**Add a criterion** after the first one:

> - [ ] Failing test first, as a sibling of src/tests/lib/architecture/fs-capabilities.test.ts (which already reads both files): src-tauri/capabilities/default.json grants "core:window:allow-hide", and the first entry of app.windows in src-tauri/tauri.conf.json has backgroundThrottling "disabled". Both assertions fail today.

### 2. Criteria 4-6 are owner checks in the app, not agent criteria

Evidence: vitest mocks `@tauri-apps/api/window` (`src/tests/lib/app/tauri-listeners.service.test.ts:34-40`). The Rust tests cover only the pure `exit_decision` (`src-tauri/tests/commands/app_exit_test.rs:1-5`, "The event loop wiring in `lib.rs` ... needs a running app and is checked by hand"). The E2E script runs the web build without Tauri windows. A relay-lite agent has no way to tick these criteria.

**Replace criteria 4, 5 and 6** with:

> - [ ] Owner check in the app after delivery (not run by the agent; list the steps in the commit message and do not claim them as tested). Close the main window with the red button, wait at least 6 minutes, then: (a) Ctrl+Alt+Cmd+C on copied text creates its note in the vault; (b) Ctrl+Alt+Cmd+Space, type, Cmd+Enter: the composer flashes saved and hides, with no 'Save not confirmed'; (c) Cmd+Q runs the exit flush and quits; (d) after another close, a Dock click shows the main window with the vault still open and its tabs intact.

The 6-minute wait is there because the suspension described in Must-fix 1 starts after about 5 minutes. A check run right after the close proves nothing about it.

### 3. Line references that moved

**Replace** "Update the existing 'destroys the window ...' cases (:224-300)" **with:**

> Update every registerCloseHandler case that asserts on mockDestroy (:224, :238, :267, :279, :291, :311, :332, :359, :372; they run to :385) to the new contract: hide called once and destroy never called on success; neither called on a cancel. Add `hide` to the getCurrentWindow mock (:34-40). Say so in the commit message.

**Also replace these references:**
- `lib.rs:391-395` -> `lib.rs:401-405`
- `tauri-listeners.service.ts:48-55` -> `:48-65` (destroy at `:54`)
- `help/documentation/09-quick-notes-and-templates.md:79` -> `:88`

## Should-fix edits

1. **Criterion 3 (Rust test for the Reopen decision).** The example "no visible window -> show 'main'" reads `has_visible_windows`. tao passes that flag straight from AppKit (`tao-0.37.2/src/platform_impl/macos/app_delegate.rs:205-215`), and it is true whenever the composer is on screen, so a Dock click during a composer summon would do nothing. Extracting a pure function only to test one boolean is also an abstraction for single-use code. **Replace criterion 3 with:**
   > - [ ] The Reopen arm unminimizes, shows and focuses 'main' whenever that window exists, without reading has_visible_windows (a shown composer counts as visible). The arm is wiring that needs a running app, like the exit wiring (app_exit_test.rs:1-5), so it has no Rust test of its own and is covered by the owner check. Reviewers: do not ask for one.

   **Alternative, if the owner wants a Rust test:** `pub fn reopen_shows_main(main_exists: bool) -> bool`. It is trivial, which is why it is not the recommendation.

2. **The macOS-only arm and clippy on Linux.**
   - `RunEvent::Reopen` is `#[cfg(target_os = "macos")]` and `#[non_exhaustive]` (`tauri-2.12.5/src/app.rs:275-282`).
   - The Rust CI job and its clippy run (`-D warnings`) run on ubuntu-24.04 (`.github/workflows/ci.yml:90,116`).
   - A private helper that only a macOS arm calls is dead code on Linux and fails clippy.

   **Add to "What to build":**
   > Match it as `#[cfg(target_os = "macos")] RunEvent::Reopen { .. }` (turn the if-let into a match with a `_ => {}` arm), and give any helper it calls the same cfg, or clippy fails on the Linux CI job.

3. **Criterion 2 (cancel).** The existing case `:279-289` asserts only that `mockDestroy` was not called. **Replace with:**
   > - [ ] When the user cancels at the discard prompt the window stays shown: neither hide nor destroy is called (update the case at :279).

4. **Doc comments that go stale.** Update the `exit_decision` doc (`app_exit.rs:47-48`) and the comment in `app_exit_test.rs:35-37`: after the fix, the "main window closed" state is no longer the normal path. Keep the `has_main_window` branch and its test. Also update the `registerCloseHandler` JSDoc (`tauri-listeners.service.ts:42-47`) to say the window is hidden, not destroyed. **Add as a criterion:**
   > - [ ] The registerCloseHandler JSDoc and the exit_decision doc describe the hidden main window.

5. **Deep-link scope.**
   - The title says "deep links keep working". A capture link (`kokobrain://capture`) writes in the hidden window. `open`, `new`, `search` and `daily` (`deep-link.service.ts:185-206`) act on the hidden window and show nothing. A URL open does not send Reopen.
   - This is no regression: today the same links do nothing at all.

   **Add to Notes:**
   > Out of scope: a non-capture deep link while the main window is hidden acts on the hidden window and does not show it.

   This keeps the agent from adding `show()` plus a new `allow-show` permission on its own.

6. **Known limit, state it once.**
   - The discard prompt uses `ask()`, and tauri-plugin-dialog 2.8.4 parents it to the calling window (`commands.rs:280-283`), which is the hidden main.
   - Scenario: the user chose "Close Anyway" at the close prompt. The tab stays dirty (`prepareForExit` does not clear it, `exit.service.ts:15-23`). Its save still fails at Cmd+Q.
   - Inference, not verified: the prompt may then be invisible, and `exitInFlight` (`tauri-listeners.service.ts:82-91`) blocks every later Cmd+Q until the window is shown from the Dock.
   - Rare; per the owner's no-core-changes-for-corner-cases rule, do not handle it. **Add to Notes:**
     > Known limit: if a save that failed at close still fails at Cmd+Q, the discard prompt belongs to the hidden window; click the Dock icon to see it.

7. **Fullscreen.** The Window menu offers fullscreen (`lib.rs:236-241`). Hiding a fullscreen macOS window may leave an empty Space. This is inference from macOS behavior and was not checked in source. **Add as owner check step (e):**
   > (e) the same close from fullscreen.

   Do not add a pre-hide exit from fullscreen unless that check fails.

8. **"Reports Saved" wording.** The composer flashes `saved` for 180 ms and hides (`composer/+page.svelte:8,123`). It shows no "Saved" text. The owner-check wording in Must-fix 2 already reflects this.

9. **Stale bookkeeping.** "Bare Issue numbers ... use that feature's numbering" and the '108' remark in the owner decision are noise for an implementer. They are harmless, so leave them or trim them.

## Dossier errors

1. **The main risk is missing (major).**
   - What it says: "The capture path is IPC plus promises ... which should keep running", and it treats the hidden-webview question as a timer-throttling detail.
   - What the code says: Tauri documents that a hidden view's tasks are suspended by default after about 5 minutes (`webview_window.rs:1254-1267`).
   - Effect: its plan, its manual check (no wait) and its risk rating miss this. The same suspension also breaks its own Cmd+Q scenario: `emit_to("main")` reaches a webview that does not run, so Quit holds forever.
2. **Line refs.**
   - Run closure: it says `lib.rs:402-406`; it is `:401-405`, and `:406` is the closing brace of `fn run`.
   - Quit item: it says `lib.rs:~300`; `app.exit(0)` is at `:306-307`.
3. **"core:default does not include hide (per the Issue; I did not open the generated schema)":** correct, now verified (`acl-manifests.json` `core:window` default set; `desktop-schema.json:3486-3490`).
4. **Proposed `reopen_should_show_main(main_exists, main_visible)`.** Better than the Issue's `has_visible_windows` example, but still an extracted single-use function. The minimized case also depends on `is_visible()` for a miniaturized NSWindow, which it did not check. Calling unminimize, show and focus unconditionally is simpler and needs no decision.
5. **No mention of the Linux clippy gate** (`ci.yml:90,116`) for the macOS-only arm and helper.
6. **Missed the precedent test** (`src/tests/lib/architecture/fs-capabilities.test.ts`, which reads `default.json` and `tauri.conf.json`). The dossier says nothing could assert the capability. It can, cheaply, and it fails today.
7. **Fullscreen note.** It says the window "is configured maximized, not fullscreen" (`tauri.conf.json:25`). True, but the Window menu offers fullscreen (`lib.rs:240`), so the case is reachable whatever the config says.

## Not verified

- No build, test or app run. Whether WebKit actually suspends an ordered-out (hidden) window's view within the owner's session length, and whether `"disabled"` fully prevents that, rests on Tauri's and wry's docs and code, not on observation.
- How the dialog plugin's parented NSAlert behaves on a hidden window (Should-fix 6).
- The fullscreen behavior (Should-fix 7).
- Whether the owner closes with the red button or with Cmd+Q.
