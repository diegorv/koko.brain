# 08 discovery: view logic

Template: work/06 (new pure `.logic.ts` + test, local `ev()` builder over `EventNote`, one feat commit). What differs is listed below.

## Files that change (both new)

- `src/lib/features/event-calendar/event-calendar-view.logic.ts`. Imports only `event-calendar-dates.logic.ts` (`addDays`, `addMonths`, `weekDays`, `monthGrid`, `isWeekend`, `isoWeek`, `dayOfWeek`, `formatRange`, `formatShort`, `formatWeekday`, `formatTime`, `monthName`, `startOfMonth`, `daysInMonth`, `toKey`, `fromKey`), `MIN_EVENT_MINUTES` / `floorToSnap` from `event-calendar-layout.logic.ts:17, :32`, and `import type` from `event-calendar.types.ts`. Nothing from a drag file.
- `src/tests/lib/features/event-calendar/event-calendar-view.logic.test.ts`.

## Sources ported

- `visibleDays`: prototype `calendar.tsx:35-43` minus the compact 3-day branch (D17). `stepDate`: `calendar-store.ts:47-51` minus compact.
- `rangeLabel`: `calendar-header.tsx:30-52` minus compact. `buildMonthCells` / `itemsForDay` / `MONTH_MAX_CHIPS`: `month-view.tsx:13, 31-49`. `buildAllDayChips` / `laneRows`: `all-day-row.tsx:22-36`. Now-line: `time-grid.tsx:369`.
- Holidays are out of scope (people-ops), so chips are events only.

## Plan (one feat commit, test-first)

Shapes: `visibleDays(...) -> string[]`; `stepDate(view, date, dir: 1 | -1) -> string`; `rangeLabel -> { title; subtitle }`; `groupEventsByDay -> { timed: Map<day, EventNote[]>; allDay: Map<day, EventNote[]> }` (every visible day present, other days dropped, input order kept); `buildMonthCells -> { day; inMonth }[]`; `itemsForDay -> { event; label }[]` (label `"<time> <title>"` for timed, title for all-day); `buildAllDayChips -> { day; chips; overflow }[]`; `laneRows(maxChips) -> 1..3`; `nowOffsetMinutes -> number | null`; `defaultCreateSlot -> { date; start; end }`.

## Defaults taken for open questions

- Month `visibleDays` = the days of the month (1st..last, weekends removed when hidden), not the 42-cell grid. That keeps the one title rule ("month of the first visible day") correct for month view too; the grid is `buildMonthCells`.
- Week subtitle range = `formatRange(days[0], days[last])` of the visible days (the prototype used the full week `days[0..6]`; with weekends hidden ours reads Mon-Fri). The week's Monday is the first Monday on or after `days[0]`, so `weekStartsOn` is not a parameter.
- All-day lane: at most `ALL_DAY_MAX_ROWS = 3` rows including the overflow row. A day with up to 3 chips shows them all; with more it shows 2 chips and `overflow = n - 2` ("+N" takes the third row). `laneRows(maxChips) = min(3, max(1, maxChips))`. Chips sort by title.
- Ordering ties use plain string comparison (`<`), not `localeCompare`, so output does not depend on the host locale (as in the dates file).
- `defaultCreateSlot`: start = `floorToSnap(nowMinutes)` when `date === todayKey`, else `dayStartHour * 60`; then `start = min(start, 1440 - MIN_EVENT_MINUTES)` and `end = min(start + duration, 1440)` (Task 8 rule: anchor = floorToSnap of the pointer).

## Prior-art tests

- `event-calendar-layout.logic.test.ts:1-30` (`ev()` builder); DST block style from `event-calendar-dates.logic.test.ts:333-360`.

## Risks

- No consumers yet (view store ticket 18, time grid ticket 22, month view ticket 23). The shapes above are what those tickets will read; a mismatch is cheap to change now.
