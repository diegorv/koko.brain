# 01: Quick Capture keeps the typed text when the save fails

**What to build:** When Cmd+Enter in the Quick Capture composer cannot hand the text to Rust (`submit_composer_capture` rejects), the composer stays open, keeps the text and says so. Today the catch in `handleSave` (`src/routes/composer/+page.svelte`, about line 45) only logs, `dismiss()` (about line 50) still hides the window, and `resetForShow()` (about line 61) empties `text` on the next summon, so the capture is lost without a message. Change `handleSave` so `dismiss()` runs only after a successful `submit_composer_capture` (after the save flash, as today). On failure: keep `text`, skip the `saved` flash, and set a new `saveError` state. The hint row (about line 109) renders the error instead of "ESC cancels · ⌘↩ saves" while `saveError` is set, with `role="alert"`, for example "Could not save. ⌘↩ retries, ESC cancels." Clear `saveError` at the start of each `handleSave` and in `resetForShow()`. Keep the `console.error`. Esc after a failure still dismisses: that is an explicit cancel, the same as Esc with typed text today.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first: a new `describe` in `src/tests/routes/composer-page.test.ts` makes the mocked `call` reject for `submit_composer_capture`, sets the textarea value (input event), dispatches a `keydown` with `metaKey: true, key: 'Enter'` on `window`, and asserts the textarea still holds the text, `call` was never called with `dismiss_composer`, and the hint row shows the error. It fails on the current code (dismiss is called)
- [x] Success path: with `call` resolving, Cmd+Enter calls `dismiss_composer` once after the flash (fake timers or `vi.waitFor`), and invoking the `QC_OPEN_COMPOSER` callback captured from the mocked `on` empties the textarea
- [x] Retry: a first rejected save then a resolved one dismisses on the second Cmd+Enter, and the error text is gone
- [x] An empty body still dismisses without calling `submit_composer_capture` (test added; the behavior exists today at about line 31)
- [x] The `#lib/contracts/ipc.js` mock stays the only mock in the file; the existing theme tests stay green

## Notes

- **Source:** review section 1 ("Outside the polish ranking, one correctness bug must ship first") and section 4 Issue 0; `work/views.md` "Data loss".
- **What this covers:** `submit_composer_capture` (`src-tauri/src/quick_capture/commands.rs`, about lines 459-472) returns `Err` only when `app.emit` fails. A failure while the main window writes the note (`handleDetectedCapture` in `plugins/quick-capture/quick-capture.service.ts`, then `executeAction`, which toasts at `features/deep-link/deep-link.service.ts` about line 210) happens after the composer is hidden and is out of scope (owner decision, recommendation: not now).
- **Out of scope:** the composer styling, the hint copy outside the error state, any Rust change.
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/01-quick-capture-keeps-text-on-failed-save`: `src/routes/composer/+page.svelte` no longer dismisses the composer when `submit_composer_capture` rejects; it keeps the text and shows an error in the hint row, and a successful retry clears it. Four tests added in `src/tests/routes/composer-page.test.ts` (failure, success, retry, empty body). Full suite: 493 files, 11716 passed, 1 skipped, 1 todo; `pnpm build` green. Review round 1: APPROVED with two nits, both left as is (see `work/01/review.md` Resolution).
