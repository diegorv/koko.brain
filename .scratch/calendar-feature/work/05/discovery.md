# 05 discovery: event-calendar types and native date helpers

## Files that change (all new)

- `src/lib/features/event-calendar/event-calendar.types.ts`: types only; `EventColor` / `CalendarViewMode` re-exported with `import type` from `$lib/core/settings/settings.types` (`EventCalendarColor`, `EventCalendarViewMode`, `settings.types.ts:1-2`).
- `src/lib/features/event-calendar/event-calendar-dates.logic.ts`: native, dependency-free date helpers on `YYYY-MM-DD` keys.
- `src/tests/fixtures/timezone.fixture.ts`: `withTimeZone(tz, fn)` and `runtimeTimeZoneSwitchWorks()`.
- `src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts`.

## Plan

One feat commit (the ticket asks for one): types, dates logic, fixture, test. Test-first: write the test, see it fail on the missing module, then the logic.

## Prior art

- Fixture style: `src/tests/fixtures/localStorage.fixture.ts`. Parity target: `toDateKey` (`src/lib/plugins/calendar/calendar.logic.ts:75`, dayjs `YYYY-MM-DD`).
- Pre-flight log (f): runtime `process.env.TZ` switching works under vitest 4.1.12, so the DST block runs.

## Risks

- The prototype (`/home/user/calender-app-design`) is not on this machine and sits outside the working directory, so `dates.ts:24-163` and `dates.test.ts:15-59` cannot be read. The port follows the ticket's export list and behaviours; the "6 prototype cases" are rewritten as equivalent cases over the same functions (addDays, addMonths, diffDays, formatRange, formatTime, isoWeek, monthGrid, startOfWeek, weekDays, parseTimeStrict). Review should compare against the prototype if it is available.
- `process.env.TZ` is process-global; `withTimeZone` restores it in `finally` (delete when it was unset).

## Defaults taken for open questions (signatures the later tickets build on)

- Every helper takes and returns day keys, except `toKey(Date)` / `fromKey(key): Date` (local midnight).
- `addMonths` clamps the day to the target month's end (`2026-01-31` + 1 = `2026-02-28`).
- `dayOfWeek`: 0 = Sunday. `startOfWeek(key, weekStartsOn: 0 | 1)`, `weekDays` gives 7 keys, `monthGrid(key, weekStartsOn)` gives 42 keys (6 full weeks) starting at `startOfWeek(startOfMonth(key))`.
- `diffDays(a, b)` = a minus b in whole days (date-fns `differenceInCalendarDays` order), via `Math.round` of the millisecond difference.
- `rangeKeys(from, to)` is inclusive and ascending; a reversed range returns `[]`.
- Names are fixed English arrays (no `Intl`, so output does not depend on the host locale): `monthName(key)` "November", `formatWeekday` "Tue", `formatShort` "Nov 10", `formatLong` "Tuesday, November 10, 2026".
- `formatRange(a, b)`: "Nov 9 – 15, 2026" / "Nov 30 – Dec 6, 2026" / "Dec 28, 2026 – Jan 3, 2027" / one day gives `formatShort, year`.
- `formatTime(minutes, format = '24h')`: "09:30" / "9:30 AM"; 1440 is "24:00" / "12:00 AM". `formatTimeRange` joins with " – ". `formatDuration`: "45m", "1h", "1h 30m".
- `parseTimeStrict` trims whitespace first; `timeInputValue` rounds and clamps to 0..1439 (`<input type="time">` cannot show 24:00).
- `DragState`, `PositionedEvent`, `DialogState` get minimal shapes (documented); tickets 06, 09, 10 may refine them.
