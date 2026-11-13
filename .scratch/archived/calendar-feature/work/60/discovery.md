# 60 discovery: collection calendar views and time of day

## Files that change

- `src/lib/features/collection/calendar.logic.ts:120-130` (`groupRecordsByDate`): the multi-day loop starts at the start timestamp and stops at `current.getTime() <= endTime`. A 10:00 start never reaches an end day whose time is before 10:00, so day 1 10:00 -> day 3 09:00 lands on days 1-2 only.
- `src/lib/features/collection/linear-calendar.logic.ts:146-148` (`extractEventsForYear`): `yearEnd` is Dec 31 00:00, so a record starting Dec 31 10:00 is skipped.
- `src/lib/features/collection/linear-calendar.logic.ts:174-180` (`layoutEventsInMonth`): `lastDay` is the month's last day at 00:00, so a record starting that day after midnight is filtered out of the month.
- Tests: `src/tests/lib/features/collection/calendar-logic.test.ts` (`groupRecordsByDate` block), `src/tests/lib/features/collection/linear-calendar-logic.test.ts` (`extractEventsForYear`, `layoutEventsInMonth` blocks).

## Plan (smallest change)

1. Failing tests first, one per anchor, using ISO datetime strings (`2026-03-10T10:00`) that `extractDateFromRecord` parses as local time.
2. Compare day keys (`formatDateKey`, YYYY-MM-DD sorts lexicographically) instead of timestamps:
   - `groupRecordsByDate`: multi-day when `endKey > startKey`; loop a day cursor built from the start's Y/M/D while `formatDateKey(cursor) <= endKey`. Same-day start/end with a later end time stays a single-day placement (unchanged).
   - `extractEventsForYear`: skip when `endKey < "<year>-01-01"` or `startKey > "<year>-12-31"`.
   - `layoutEventsInMonth`: overlap filter on keys of the month's first and last day.
3. `clampDateToMonth` is left as is: it already clamps by timestamp to a 00:00 boundary on the same day, and the layout only reads `getDate()` from the result.

## Prior-art tests

Existing `groupRecordsByDate` / `extractEventsForYear` / `layoutEventsInMonth` cases with `makeRecord` and `makeRawEvent`; new cases copy them with time components.

## Risks

- `extractEventsForYear` keeps `endDate = startDate` when the end parses before the start (timestamp check, unchanged).
- A start Dec 31 10:00 kept in the year now reaches `layoutEventsInMonth` for December, which must also include it (covered by the layout fix and a `buildLinearYearLayout` assertion).

## Defaults taken

- No new shared date helper: the two files already share `formatDateKey`.
