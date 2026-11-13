VERDICT: APPROVED

# Issue 04 review: the sidebar calendar starts the week on the configured day

## Acceptance criteria

- [met] With `weekStartsOn: Sunday` the weekday header and grid start on Sunday; with Monday, unchanged — `calendar.logic.ts:60-62` backs up `(day() - weekStartsOn + 7) % 7` days, the same formula as the Calendar tab's `startOfWeek` (`event-calendar-dates.logic.ts:125-126`); headers come from `dayHeaders` (`calendar.logic.ts:88-91`) rendered in `CalendarGrid.svelte:45-52`. Tests: `calendar.logic.test.ts` "starts on the Sunday on or before the 1st", "keeps 6 weeks of 7 days..." (every 2026 month, row 0 is a Sunday), "puts Sunday first in the headers..."; Monday default is pinned by "defaults to a Monday-first grid..." (`buildMonthGrid(2026, 1, 1)` deep-equals the default) and `CalendarGrid.test.ts` "renders Monday-first headers..."; the pre-existing Monday tests are untouched and pass.
- [met] ISO week numbers in the week column stay correct for both settings — `calendar.logic.ts:63,70-71` takes `isoWeek()` of each row's Monday (offset 0 for Monday start, so Monday rows are unchanged; offset 1 for Sunday rows). This matches the Calendar tab, which labels a Sunday-first week by its Monday (`event-calendar-view.logic.ts:173-175`). Tests cover year boundaries: 2024-01 Sunday row -> W1, 2027-01 Sunday row (Mon Dec 28 2026) -> W53, Feb 2026 -> [6..11]; `CalendarGrid.test.ts` checks W45 is shown and its click opens Monday `2026-11-02` (`weekKeys`, `CalendarGrid.svelte:34`), so the weekly note matches the number.
- [met] Changing the setting updates the open sidebar without a restart — `CalendarPanel.svelte:22-24` reads `settingsStore.eventCalendar.weekStartsOn` inside the `$derived`. `CalendarPanel.test.ts` "rebuilds the open grid when the setting changes" mounts with Monday, calls `settingsStore.updateEventCalendar({ weekStartsOn: 0 })`, and asserts the rendered first header and first day key flip to SUN / 2026-11-01 and back to MON / 2026-10-26, using the real settings store.
- [met] Logic test first for the grid with each week start — `calendar.logic.test.ts` adds a Monday-default block and a "buildMonthGrid with a Sunday week start" block (5 tests). They were committed in the same commit as the logic (81663be8), so the red phase cannot be seen in history; by inspection every new Sunday test fails against main's `buildMonthGrid`, which ignores the third argument and has no `dayHeaders` / `weekKeys` / `isWeekend`.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings (212 files).
- `pnpm vitest run src/tests/lib/plugins/calendar/`: exit 0, 5 files, 94 tests passed. The test verdict rests on these files: `calendar.logic.test.ts`, `CalendarGrid.test.ts`, `CalendarPanel.test.ts` (added/changed), plus the other two files in that folder.
- Searched `src` and `e2e` for other users of `buildMonthGrid`, `MonthGrid`, `weekNumbers`: none outside the calendar plugin and its tests. `EventMonthGrid.test.ts` asserts `'MON'` headers for a different component and is unaffected.
- Full suite and `pnpm build` not run (deliver's).

## Findings

1. nit — `src/lib/plugins/calendar/CalendarGrid.svelte:60` — `(day.isWeekend ?'text-file-explorer-primary' : ...)` is missing the space after `?`; write `day.isWeekend ? 'text-file-explorer-primary'` to match the surrounding ternaries.
2. nit — process, commit 81663be8 — the logic tests and the implementation land in one commit, so "test first" rests on the build report's claim rather than history. No change needed for this branch; a separate red-test commit would make it checkable next time.

## Resolution

1. Fixed: added the missing space after `?` in `CalendarGrid.svelte:60`.
2. Not changed: rewriting history to split the test commit adds no value now; the reviewer confirmed by inspection that the new Sunday tests fail against main's `buildMonthGrid`.
