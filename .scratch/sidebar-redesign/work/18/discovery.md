# Issue 18 discovery: periodic notes and Open Calendar tab

No `spec.md`; the source is `PRD.md` (Navigators: Calendar, Q24) and the prototype's `VariantA.svelte:155-159`
(a "Periodic notes" heading, one row per period, then an "Open Calendar tab" button). Builds on `work/17`
(Calendar navigator, `layout.railDay`, `pickedDayLens`); only the differences are listed.

## Files that change
- `plugins/calendar/calendar.logic.ts` (after `buildMonthGrid`, ~line 100): NEW pure `periodicNoteEntries(year,
  month, pickedDay, weekStartsOn)` returning `{ period, label, dateKey }[]`:
  - week: the picked day's grid row, numbered and keyed by that row's Monday (same rule as `weekNumbers` /
    `weekKeys`, so the entry and the grid's week button open the same note), label `Week 44`;
  - month / quarter / year: the shown month's 1st, labels `October 2026`, `Q4 2026`, `2026`;
  - no picked day (null or not a date key): the week entry is left out.
- `plugins/calendar/CalendarNavigator.svelte:62-124`: under `CalendarGrid`, a "Periodic notes" heading and one
  button per entry (`data-periodic-note={period}`) calling `openOrCreatePeriodicNoteForDate(period, dateKey)`
  (calendar.service -> periodic-notes.service, which creates from the period's template); then an "Open
  Calendar tab" button calling `openEventCalendarTab({ date: pickedDay })`. Failures toast
  `Could not open the <label> note` (CLAUDE.md: user-facing errors are toasts), replacing nothing else.
  Region tokens only (`text-file-explorer-*`, `hover:bg-file-explorer-accent`, `border-divider`).
- `e2e/specs/rail-shell.spec.ts`: a Calendar test with `periodicNotes.yearly.format` set to a custom format.

## Plan (test-first)
1. `calendar.logic.test.ts`: entries for a Monday- and a Sunday-first week, week across a year boundary
   (ISO week of the Monday), shown month other than the picked day's, null / bad picked day drops the week.
2. `CalendarNavigator.test.ts`: rendered labels follow next/prev month and a picked day; clicking yearly
   creates `<vault>/<folder>/<yearly format>.md` through the real periodic service (only `openOrCreateNote`
   mocked, as the existing week-button test does) and passes the yearly template; a rejected open toasts;
   Open Calendar tab adds the Calendar tab with `eventCalendarViewStore.focusedDate` = the picked day (today
   when none picked); theme-token assertion extended to the new section.
3. E2E: open the yearly note from the navigator, assert the file exists at the configured format and its tab
   is active; next year entry follows the shown year.

## Prior art
- `CalendarNavigator.test.ts` (mount, `showMonth`, fake clock), `CalendarPanel.test.ts:81-109` (Calendar tab
  assertions), `RailNoteList.test.ts:44,285` (`svelte-sonner` mock + toast assertion), the Issue 17 E2E test.

## Defaults taken
- The picked day is the Day lens pick (saved day, else today), as in the grid highlight.
- No store getter is added (the entries are a `$derived` over the pure function), so no new getter test.
- Open Calendar tab keeps the tab's current view (as `OpenCalendarButton`); only the date is set.
- Entries do not show whether the note exists (the prototype only differs in click behavior).

## Risks
- `periodicNotes.yearly` is absent from the E2E fixture's settings; the test sets it explicitly.
