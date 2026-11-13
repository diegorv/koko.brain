VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a new `describe` in `src/tests/routes/composer-page.test.ts` makes the mocked `call` reject for `submit_composer_capture`, sets the textarea value (input event), dispatches a `keydown` with `metaKey: true, key: 'Enter'` on `window`, and asserts the textarea still holds the text, `call` was never called with `dismiss_composer`, and the hint row shows the error. It fails on the current code (dismiss is called) — `describe('composer save')` test "keeps the text and shows an error when the save fails" (composer-page.test.ts:157-168) rejects via `mockSubmit('fail')`, types through an `input` event, dispatches the Cmd+Enter keydown on `window`, and asserts the text, `commands()` equal to `['submit_composer_capture']` only (so no `dismiss_composer`) and the `role="alert"` text. Probe: I put main's `+page.svelte` back in the worktree and ran the file: 4 failed, 7 passed, this test among the failures. Then I restored HEAD's version, so the worktree is clean.
- [met] Success path: with `call` resolving, Cmd+Enter calls `dismiss_composer` once after the flash (fake timers or `vi.waitFor`), and invoking the `QC_OPEN_COMPOSER` callback captured from the mocked `on` empties the textarea — test "dismisses once after the save flash when the save succeeds" (:170-186) waits for `.saved`, asserts that only `submit_composer_capture` has run at that point, then `vi.waitFor` sees exactly `['submit_composer_capture', 'dismiss_composer']`. It calls `on.mock.calls[0][1]` and asserts the textarea is `''`. `on` is cleared in both describes' `afterEach`, so `calls[0]` belongs to this test's mount.
- [met] Retry: a first rejected save then a resolved one dismisses on the second Cmd+Enter, and the error text is gone — test "dismisses on a retry that succeeds and clears the error" (:188-201) with `mockSubmit('fail', 'ok')` asserts the three-call sequence, no `[role="alert"]` and the normal hint text. This also covers the `saveError = false` at the start of `handleSave` (+page.svelte:32): without that line the alert would still be there after the successful retry.
- [met] An empty body still dismisses without calling `submit_composer_capture` (test added; the behavior exists today at about line 31) — test "dismisses an empty composer without saving" (:203-209) types whitespace and asserts `commands()` equal to `['dismiss_composer']`. It passed on the old code too, as expected.
- [met] The `#lib/contracts/ipc.js` mock stays the only mock in the file; the existing theme tests stay green — `vi.mock` appears only at :5-8. The new code adds a `vi.spyOn(console, 'error')` spy, which is not a module mock. The five theme tests are unchanged and pass (11/11 in the file).

## Checks run by the reviewer

- `taskpolicy -c background pnpm vitest run src/tests/routes/composer-page.test.ts`: exit 0, 11 passed. My test verdict rests on this file only. The diff touches only `src/routes/composer/+page.svelte`, and the only test that references that route or its hint text is this file (searched `src/` and `e2e/`).
- Same file against main's `+page.svelte` (probe, reverted): 4 failed (failure, retry, Esc after failure, next summon), 7 passed.
- `taskpolicy -c background pnpm check`: exit 0, 0 errors, 0 warnings.
- The full suite and `pnpm build` (the Issue's Gate) were not run; deliver runs them.

## Code review

- `handleSave` (+page.svelte:30-57): on rejection it logs, sets `saveError`, and `return`s from inside `catch`. `finally` still runs `saving = false`, so a retry is not blocked. On success it falls through to `dismiss()` after the 180 ms flash, as before. `saved` is never set on the failure path, so no flash.
- `resetForShow` clears `saveError` (:70). Esc goes through `dismiss()`, which is unchanged and does not depend on `saveError`, so cancelling after a failure still works.
- `--destructive` is defined in `src/app.css` (:145, :203), which the root `+layout.svelte` imports, so the composer window has the token.
- Scope: only the route, its test and the workflow's discovery file changed. No Rust change and no change to the hint copy outside the error state, matching the Issue's out-of-scope list.

## Findings

1. nit, src/routes/composer/+page.svelte:66-71: `resetForShow()` empties `text` on every `qc:open-composer`, and `show_composer` (src-tauri/src/quick_capture/commands.rs:390-405) emits it even when the window is already visible. If the user leaves the composer open in the error state, clicks into another app and presses the global shortcut again, the kept text is still wiped. This happens on main too with any typed text, and the Issue explicitly specifies the reset, so this is not a blocker. Fix (optional, a separate Issue if the owner wants it): skip the `text` reset in `resetForShow` while `saveError` is set.
2. nit, src/tests/routes/composer-page.test.ts:157-168: on the old code the failure test fails on the `vi.waitFor` for the alert (1 s timeout), not on the "dismiss was called" assertion the Issue names. The `commands()` equality would also fail, so the test still guards the bug. No change needed.

## Resolution

1. Not fixed here (no change). The Issue specifies that `resetForShow()` empties the text on every `qc:open-composer`, and the same wipe happens on main with any typed text. Skipping the reset while `saveError` is set changes the summon behavior beyond this Issue's scope; it belongs in a separate Issue if the owner wants it.
2. No change. The reviewer notes the `commands()` equality still fails on the old code, so the test guards the bug.
