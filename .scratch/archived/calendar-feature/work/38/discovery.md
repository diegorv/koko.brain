# Issue 38 discovery: date helpers match the prototype

Prototype: `/Users/diegorv/Dev/pet-projects/koko/calender-app-design/src/lib/dates.ts` (commit b4a9e8b).

## Files that change
- `src/lib/features/event-calendar/event-calendar-dates.logic.ts`
  - :17-31 private `MONTH_NAMES` / `WEEKDAY_NAMES` become exported `MONTHS`, `MONTHS_SHORT`, `WEEKDAYS`, `WEEKDAYS_SHORT` (prototype :4-20), JSDoc each.
  - :178-187 `diffDays(a, b)` returns `b - a` (prototype :90), keeps `Math.round`.
  - :195-199 `rangeKeys` calls `diffDays(from, to)` (prototype :95) so its output is unchanged.
  - :220-228 `formatLong` drops the weekday (prototype :109).
  - :240-247 `formatWeekday` returns the long name (prototype :119).
  - :249-267 `formatRange`: same month and year gives `Nov 8 – 14`, otherwise `formatShort – formatShort` (prototype :123-130).
  - `formatShort` / `monthName` read the new constants; output unchanged.
- `src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts`
  - "prototype cases" block (:33-105) replaced by the six cases of `dates.test.ts:15-59`, verbatim except `parseTime` -> `parseTimeStrict` (plan line 121) and the explicit `weekStartsOn` argument the port requires.
  - Old diffDays / formatRange / formatWeekday / formatLong assertions (:47-59, :199-207, DST :268-269, :288-289) flipped to the prototype's direction and output.
  - New test for the four constants.

## Callers
None outside the logic file and its test (`grep` over `src/` and `e2e/`). No other test asserts these strings.

## Defaults taken
- `formatRange` follows the prototype in every branch, including the ones the Issue does not list: a single day gives `Nov 10 – 10` and a cross-year span gives `Dec 28 – Jan 3`. The Issue says the year lives in the header title; matching the prototype literally is what tickets 22/23/26 rely on.
- Constants are typed `readonly string[]` (prototype: mutable `string[]`), so callers cannot mutate shared arrays. Values identical.
- The extra prototype-case assertions ticket 05 invented (e.g. ISO week 2021-01-01, 12h edge cases) move to the per-area describe blocks instead of being dropped.

## Risks
- Low: no production callers yet. Only risk is a missed `diffDays` direction inside `rangeKeys`; covered by the existing rangeKeys and DST tests.

## Prior art
Ticket 05 work folder (`work/05/`) and the existing test file structure.
