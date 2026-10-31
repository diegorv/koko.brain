# Issue 05 discovery: sidebar today follows the clock, month label double-click

## Re-verified on main

- F10: `calendar.logic.ts:58` reads `toDateKey(new Date())` inside
  `buildMonthGrid`; `CalendarPanel.svelte:22-24` `$derived` depends only on
  year, month and `weekStartsOn`, so `isToday` never moves at midnight.
- The tab's live clock is `acquireCalendarClock()`
  (`features/event-calendar/event-calendar.service.ts:302`, ref-counted, 30 s
  tick + focus/visibilitychange) feeding `eventCalendarViewStore.todayKey`
  (`event-calendar-view.store.svelte.ts:83`). Held by `EventCalendarView.svelte:219`.
- F3: `CalendarPanel.svelte:81-88` month label has `onclick={handleMonthClick}`
  and `ondblclick={goToToday}`. A double-click dispatches click(detail=1),
  click(detail=2), dblclick, so the monthly note opens/creates twice.

## Plan

1. `buildMonthGrid(year, month, weekStartsOn = 1, todayKey = toDateKey(new Date()))`:
   today comes in as a parameter (logic stays pure, existing callers unchanged).
2. `CalendarPanel.svelte`: hold the shared clock while mounted
   (`$effect(() => untrack(() => acquireCalendarClock()))`, same as the tab)
   and pass `eventCalendarViewStore.todayKey` into the `$derived`.
3. `handleMonthClick(e)`: return when `e.detail > 1`, so only the first click
   of a multi-click opens the note; `ondblclick` still goes to today. Keyboard
   activation (detail 0) still opens.

## Tests (prior art)

- `calendar.logic.test.ts`: `buildMonthGrid` with an explicit `todayKey`.
- `CalendarPanel.test.ts`: fake timers at 23:59:50, mount, advance 30 s,
  today cell (`[data-date]` with `ring-1`) moves, month unchanged. Month label:
  dispatch click(detail 1), click(detail 2), dblclick and assert
  `openOrCreateNote` (already mocked) called once and the grid is on today's
  month; single click opens once.

## Risks / defaults

- The sidebar panel keeps the 30 s interval alive while mounted (cheap; the
  tab already does the same).
- At most once means the first click still opens the monthly note on a
  double-click; no click-delay timer (would slow every single click).
