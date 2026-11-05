# Discovery: Issue 58, WeekStrip above the day view

## Prototype
`calender-app-design/src/components/calendar/time-grid.tsx:97-130` (`WeekStrip`): a row of seven
buttons (short weekday over the day number), selected day as the accent badge, today in the
primary color, click calls `setDate(d)`. The prototype uses `role="tab"`/`aria-selected` and
shows it on narrow screens only; the Issue overrides both: `aria-pressed` like the day headers,
and it renders in day view at every width.

## Files that change
- NEW `src/lib/features/event-calendar/EventWeekStrip.svelte`: days = `weekDays(focusedDate,
  weekStartsOn)` (`event-calendar-dates.logic.ts:136`), always seven (the Issue says "seven days",
  so `showWeekends` is not applied). `role="group"`, `aria-label="Days of the week"`,
  `data-week-strip`; each day a `<button type="button" aria-pressed>` with `data-week-strip-day`
  and the day headers' label (`EventDayHeaders.svelte:28`, minus the "open day view" tail).
  Click calls `eventCalendarViewStore.setDate(day)` (already in day view, so no `setView`).
- `src/lib/features/event-calendar/EventCalendarView.svelte:209-213`: the time-grid branch gets a
  flex column wrapper; the strip renders above the grid only when `view === 'day'`.

## Keyboard
Native buttons: Tab reaches them, Enter/Space activate (`resolveCalendarKey` does not claim
Enter or Space, `event-calendar-keys.logic.ts`). ArrowLeft/Right already step one day in day view.

## Tests (prior art)
- NEW `src/tests/lib/features/event-calendar/EventWeekStrip.test.ts`, copy the mount/flush setup
  of `EventMonthGrid.test.ts:1-66` and the header ARIA asserts of `EventTimeGrid.test.ts:277-300`:
  seven days Monday-first and Sunday-first, `aria-pressed`, labels, click selects, today marker,
  hidden weekends still listed.
- `EventCalendarView.test.ts:193`: strip present in day view only; Enter-key path is native.
- NEW E2E `e2e/specs/event-calendar-week-strip.spec.ts` (Playwright `testDir` is `e2e/specs`, so
  the orchestrator's `e2e/event-calendar-week-strip.spec.ts` would never run): press D, click a
  strip day, assert the day column and header move; focus a strip day and press Enter. Setup
  copied from `e2e/specs/event-calendar.spec.ts:76-104`. Not run here (port 1421 is shared).

## Risks
- The grid is `h-full`; the wrapper must be `flex h-full flex-col` with a `min-h-0 flex-1` slot or
  the grid overflows below the strip.
- `{#key view}` remount of the grid stays as is.
