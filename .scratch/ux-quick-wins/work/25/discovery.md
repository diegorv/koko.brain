# 25 discovery: calendar time grid shows now and hidden tasks

No `spec.md` exists for ux-quick-wins; the Issue is the spec.

## Files that change

- `src/lib/features/event-calendar/event-calendar-tasks.logic.ts:66-84`: add `TaskLaneCell` and `taskLaneCells(tasks, days)` beside `tasksByDay` (kept: `EventMonthGrid.svelte:28` uses it). Copies `buildAllDayChips` (`event-calendar-view.logic.ts:364-371`): cap only when `days.length > 1` and a day has more than `ALL_DAY_MAX_ROWS` tasks, then `slice(0, ALL_DAY_MAX_ROWS - 1)`.
- `src/lib/features/event-calendar/EventTaskLane.svelte:22-43`: render `taskLaneCells`; rows = `min(ALL_DAY_MAX_ROWS, max(chips + overflow))` (week: 2 chips + "+N" = 3 rows; day: 3 rows with inner scroll). "+N" button `h-6`, `data-task-lane-more`, `aria-label="{n} more tasks, open day view"`, opens the day like `EventAllDayLane.svelte:42-46`. Label reads "Tasks N" when one day is visible. Comment at `:27` updated.
- `src/lib/features/event-calendar/event-calendar-layout.logic.ts`: add `mountScrollTop({ nowMs, days, viewportHeight, headerHeight, dayStartHour })`. Imports `toKey` from `event-calendar-dates.logic` (not `nowOffsetMinutes` from view.logic: view.logic imports layout.logic, that would be a cycle).
- `src/lib/features/event-calendar/EventTimeGrid.svelte:98-101`: onMount passes `Date.now()`, `scroller.clientHeight`, the `[data-time-grid-header]` `offsetHeight` and `dayStartHour`.
- `help/documentation/27-calendar.md:35,41`.

## Rule (mountScrollTop)

start = dayStartHour * HOUR_HEIGHT; body = max(0, viewport - header). If today is in `days` and the line px > start + body, return line - body / 3; else start. Issue example: 600/90/8, 17:40 -> 1130.67 - 170 = 960.67; 09:30 (608) and 15:40 (1002.67) stay at 512.

## Tests (prior art)

- `event-calendar-tasks.logic.test.ts` `describe('tasksByDay')` style for `taskLaneCells`.
- `EventTaskLane.test.ts`: mount pattern there; store checks via real `eventCalendarViewStore` (reset in beforeEach).
- `EventTimeGrid.test.ts:309` mount scroll; new case fakes only `Date` (`vi.useFakeTimers({ toFake: ['Date'] })`), store clock at 08:00 via `setNow`, stubs `clientHeight`/`offsetHeight` on the prototype for 600/90 (jsdom has no layout), restores both. The `:309` test gets a morning system time so it no longer depends on the real date.

## Risks / defaults

- jsdom stores `scrollTop` unclamped; a real browser clamps at the bottom (fine, line still on screen).
- Week label stays "Tasks" (count only in day view, per the Issue).
- The focus-request effect (`EventCalendarView.svelte:156-185`) runs after `tick()`, after the child's onMount, so its `scrollIntoView` still wins. Untouched.
