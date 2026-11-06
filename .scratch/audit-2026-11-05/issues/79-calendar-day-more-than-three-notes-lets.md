# 79: A calendar day with more than three notes lets the user reach every note

**What to build:** CollectionCalendarView renders only the first MAX_EVENTS_PER_CELL (3) events of a day as buttons (src/lib/features/collection/CollectionCalendarView.svelte:36, :130-160). The rest become a plain `<span>+N more</span>` (:161-165) with no handler, and the day number is not interactive, so the fourth and later notes of that day cannot be opened from the calendar. Make '+N more' a control that shows all of that day's notes, each opening through onClickRecord, for example a popover listing them, or a cell that expands.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/collection/CollectionCalendarView.svelte.test.ts (new, next to CollectionTableView.svelte.test.ts): render the view with five records dated the same day of the shown month. Activate '+2 more', then click the fifth note's entry. onClickRecord is called with that record. It fails today.
- [ ] Days with three or fewer notes render as they do now.
- [ ] The control is keyboard reachable (a button).
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** polish (bucket 3-polish). Polish/low. It needs a calendar view with a busy day.
- **Trigger:** A calendar-type .view on a date property where one day has four or more notes, e.g. a calendar over file.mtime or over meeting notes.
- **Evidence (verified by reading code at `5f8003d67`):** CollectionCalendarView.svelte:36 MAX_EVENTS_PER_CELL = 3. :130-131 visibleEvents = events.slice(0, 3) and overflowCount = events.length - 3. :152-160 only visibleEvents get a button with onClickRecord. :161-165 the overflow is a bare span with no onclick, popover or title. :142-149 the day number is a plain span.
- **Source:** audit 2026-11-05, domain `views`, finding `N-views-05` (from views-ux-5). Size S.

## Comments
