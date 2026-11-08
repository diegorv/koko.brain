# 065: A calendar day with more than three notes lets the user reach every note

**Origin:** `audit-2026-11-05` Issue 79, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

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

**Second opinion (audit 2026-11-05, round 2):** upheld (polish, low). Confirmed. MAX_EVENTS_PER_CELL = 3 (CollectionCalendarView.svelte:36). Only the sliced visibleEvents get buttons (:152-160). '+N more' is a bare span with no handler (:161-165), and the day number is a plain span (:142-149). No other path inside the calendar reaches the 4th or later note. No CollectionCalendarView component test exists yet, so the file the Issue names is new, as it says.

## Comments
