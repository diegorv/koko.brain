# 23 discovery: month view

Template: issue 22 (`work/22/discovery.md`): same store inputs, test setup and click semantics. Only the differences are listed.

## Files that change
- New `src/lib/features/event-calendar/EventMonthGrid.svelte` (no props; reads the stores).
- `EventCalendarView.svelte:73-74`: the month placeholder becomes `<EventMonthGrid />`.
- New `src/tests/lib/features/event-calendar/EventMonthGrid.test.ts`.
- `src/tests/lib/features/event-calendar/EventCalendarView.test.ts:185-198`: month now asserts `[data-month-grid]`, not the placeholder.
- `e2e/specs/event-calendar.spec.ts`: a test that clicks the Month tab and asserts the Standup chip.

## Plan (one feat commit, the ticket asks for one)
- Cells: `eventCalendarViewStore.monthCells` (already `buildMonthCells(focusedDate, weekStartsOn, showWeekends)`); columns `showWeekends ? 7 : 5`, 6 rows. Weekday headers are `WEEKDAYS_SHORT[dayOfWeek(d)]` of the first row's cells, so they follow `weekStartsOn` and the weekend filter.
- Chips: `itemsForDay(eventCalendarStore.events, day, timeFormat).slice(0, MONTH_MAX_CHIPS)`; `+{n - MONTH_MAX_CHIPS} more` button calls `setDate` + `setView('day')`.
- Chip: `<button>` with `style={eventColorStyle(color)}`, `data-event-path`, `data-pending={pending || undefined}`, dashed border when pending (as `EventBlock.svelte:60`); click opens the note (popover is ticket 26).
- Cell `<div>` click with `e.target === e.currentTarget` sets the date (`month-view.tsx:78-81`); the day-number button sets the date, or opens day view when already selected (`:93-97`), with the `EventDayHeaders` aria-label pattern and `aria-pressed`.
- Today: `day === eventCalendarViewStore.todayKey` (clock-driven) gives `text-primary` and `data-today`; selected gives `bg-primary`.
- Out-of-month cells: `data-in-month="false"`, a muted background and muted day number.
- Dropped: mobile dots, the mobile tap branch, holidays, double-click create (create is ticket 29).

## Prior art
- `EventTimeGrid.test.ts` setup (real stores, `openFileInEditor` mock, `event()` / `seed()` helpers, `putPending` for pending).
- E2E: `event-calendar.spec.ts` `seedEvents` + `openCalendar`.

## Defaults / risks
- Out-of-month chips are not faded (the prototype's `opacity-60`, `:128`): ticket 22 review removed opacity from chips for contrast; only the cell and its day number are dimmed.
- The cell `<div>` click handler needs `svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions`; keyboard users reach the same action through the day-number button.
- Rows use `minmax(0, 1fr)`; cells clip overflow, so a short pane cuts chips rather than growing.
