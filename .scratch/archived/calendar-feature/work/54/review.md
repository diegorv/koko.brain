VERDICT: CHANGES_REQUESTED

# 54 review: Day headers open the periodic daily note

Reviewed `git diff main...HEAD` (merge base cdad575f; commits 441b1b93, 3949a3ae, d3c59287, 0b5b2a7b).

## Checks run by the reviewer

- `pnpm check`: 207 files, 0 errors, 0 warnings.
- `vitest run` on the files the diff adds or changes plus the tests of the changed code: `src/tests/lib/features/event-calendar/event-calendar-daily-note.store.test.ts`, `src/tests/lib/features/event-calendar/EventMonthGrid.test.ts`, `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts`, `src/tests/lib/plugins/periodic-notes/` (all files), `src/tests/lib/core/app-lifecycle/` (all files): 8 files, 249 tests, all pass. The test verdict rests on these files.
- Mutation probe: changing the registered opener to `dayjs()` (ignore the day) makes `registerCalendarDailyNoteOpener > opens the daily note of the day the Calendar hands it, not today` fail. Reverted.
- `git merge-tree main HEAD`: merges cleanly with main, which has moved since the merge base (Issue 58 week strip).
- E2E spec not run, per instructions. I read it against the fixtures: `clockTime`/`timezoneId` options, `openCommandPalette` and the `create_note` mock handler all exist.

## Acceptance criteria

- [x] **With periodic notes enabled, a header action opens the daily note for that date.** Met. `periodic-notes.service.ts:72-74` registers `day => openOrCreatePeriodicNoteForDate('daily', dayjs(day, 'YYYY-MM-DD'))`, the same parse as the existing `plugins/calendar/calendar.service.ts:146-148`. `EventDayHeaders.svelte:26-47` (week and day views) and `EventMonthGrid.svelte:77-98` (day number) render `EventDailyNoteButton` beside the date. Evidence: `EventTimeGrid.test.ts` "opens the daily note of its day without selecting it", `EventMonthGrid.test.ts` "puts the action beside each day number...", `periodic-notes.service.test.ts` "opens the daily note of the day the Calendar hands it, not today" (asserts `openOrCreateNote` gets that day's path, title and variables). No periodic-notes enable setting exists (`PeriodicNotesSettings` in `settings.types.ts:15-35` has none), so "enabled" = "the plugin registered its opener" is a fair reading.
- [x] **Without the plugin the header has no such action.** Met. `EventDailyNoteButton.svelte:27` renders only while `eventCalendarDailyNoteStore.available`. Evidence: "has no daily note action when no plugin registered an opener" in both grid tests, and "drops the action when the opener is unregistered" in `EventTimeGrid.test.ts`.
- [x] **Tests for the bridge registration and an E2E click.** Met. Store tests (`event-calendar-daily-note.store.test.ts`: unavailable, pass-through, error propagation, unregister, stale unregister after replacement), plugin registration tests, lifecycle wiring test (`app-lifecycle.service.test.ts` "registers the Calendar daily note opener during initializeVault and unregisters it on teardown"), and a new `e2e/specs/event-calendar-daily-note.spec.ts` with a header click and a month click (not run here).

## Rules

- Layer rules: `features/` imports nothing from `plugins/`; the plugin imports the feature store (the allowed direction); `core/app-lifecycle` already imported the periodic-notes service. OK.
- Error handling: `openOrCreateNote` logs and re-throws (`note-creator.service.ts:118-121`); the store propagates; the button shows a toast. No silent swallow. OK.
- Store pattern: getter `available`, no `$derived`, getter tested, JSDoc on exports. OK.
- Tests per changed source file: store, plugin service, lifecycle, both grids (the header and the button are covered through `EventTimeGrid.test.ts` and `EventMonthGrid.test.ts`). OK.
- Scope: the edit to `EventMonthGrid.svelte` is limited to the day-number element, as asked. The help doc line is in scope. Tabs throughout. OK.

## Findings

1. **Medium: a double-click on the action, when the note does not exist yet, opens the note AND shows an error toast.** `src/lib/features/event-calendar/EventDailyNoteButton.svelte:17-23`. Each click calls `eventCalendarDailyNoteStore.open(day)` with no in-flight guard. Two clicks in quick succession run two `openOrCreateNote` calls. Both await `exists()` (IPC) and see `false`. The first `create_note` succeeds and opens the note. The second fails with `File already exists: ...` (`src-tauri/src/commands/vault.rs:837-838`), so the user gets "Could not open the daily note" on top of a note that opened fine. Double-click is a habit in this grid: a double-click on the month cell creates an event (`EventMonthGrid.svelte:46-49`). The race itself is older than this Issue (`openOrCreateNote` has no dedupe, and the sidebar calendar's button has the same race), but this Issue adds 42 to 49 new entry points for it. Fix: keep a local `pending` flag in `EventDailyNoteButton.svelte`. Ignore clicks while `open(day)` is pending and clear the flag in `.finally`. Add an `EventMonthGrid.test.ts` (or `EventTimeGrid.test.ts`) case: with an opener that returns a promise still pending, two `click()`s call the opener once, and a click after it resolves calls it again. Do not change `openOrCreateNote` in this Issue.
2. **Low (optional): the clicks in the month row gap that fall through to the cell are not covered by any test.** `src/lib/features/event-calendar/EventMonthGrid.svelte:77-78`. The `pointer-events-none ... *:pointer-events-auto` row is what keeps a click between the day number and the action selecting the day. jsdom does no hit-testing, and the E2E clicks only the button, so a regression in that class pair would go unnoticed. Fix (optional): in `e2e/specs/event-calendar-daily-note.spec.ts`, click the row at a position between the two buttons (for example `page.locator('[data-month-cell="2026-11-20"] [data-month-day]').locator('..').click({ position: ... })`) and assert that `[data-month-cell="2026-11-20"] [data-month-day]` has `aria-pressed="true"`.
3. **Info (no change): rebase.** Main moved (Issue 58 merged) and `git merge-tree` reports a clean merge. The month day-number re-indent (`EventMonthGrid.svelte:77-98`) is still the overlap to watch with Issue 59.

## Resolution

1. Fixed. `EventDailyNoteButton.svelte` keeps a local `pending` flag: clicks are ignored while `open(day)` is in flight and the flag clears in `.finally`. `openOrCreateNote` is unchanged. New `EventMonthGrid.test.ts` case "ignores clicks while an open is in flight and accepts one after it settles" (two clicks against a pending opener call it once; a click after it resolves calls it again). Mutation probe: removing the guard makes that case fail.
2. Fixed. `e2e/specs/event-calendar-daily-note.spec.ts` gains "a click in the gap between the day number and the action selects the day": a mouse click at the centre of the day-number row lands on the cell and the day number turns `aria-pressed="true"`. It uses `page.mouse.click` because a locator click on the `pointer-events-none` row would fail Playwright's hit-target check. Not run here (E2E runs on main after merge).
3. No change (info).
