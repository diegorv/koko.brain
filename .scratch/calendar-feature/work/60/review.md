VERDICT: CHANGES_REQUESTED

# 60 review: collection calendar views and time of day

Reviewed `git diff main...HEAD` (base 65f96aea, head 1aa6677f): `calendar.logic.ts`, `linear-calendar.logic.ts` and their two test files, plus the discovery and Issue docs.

## Test evidence (run by the reviewer)

- `src/tests/lib/features/collection/calendar-logic.test.ts` and `src/tests/lib/features/collection/linear-calendar-logic.test.ts`: 91/91 pass on the branch.
- Red-first check: with main's `calendar.logic.ts` and `linear-calendar.logic.ts` put back temporarily (restored afterwards), the same two files give 5 failed and 86 passed. The 5 failures are the two timed multi-day `groupRecordsByDate` cases, the Dec 31 `extractEventsForYear` case, the last-day-of-month `layoutEventsInMonth` case and the December `buildLinearYearLayout` case. The 3 other new tests pass on main too. They guard behavior that must not change: same-day timed record, previous-year Dec 31 23:00, previous-month late event.
- `vitest run collection-block`: 3 files, 28/28 pass. This is the live-preview widget that calls both `groupRecordsByDate` and `buildLinearYearLayout`.
- `pnpm check`: 0 errors, 0 warnings.
- I also ran a throwaway probe (since deleted) in TZ=UTC, America/Sao_Paulo and Asia/Tokyo:
  - 22:00 to 02:00 of the next day lands on both days.
  - 2018-11-03 10:00 to 2018-11-06 09:00 in Sao Paulo, across the DST gap at midnight, lands on Nov 3-6.
  - Feb 28 23:30 to Mar 1 01:00 appears in February on day 28 and in March on day 1.
  - `2026-12-31T23:30:00Z` shows in December in UTC and Sao Paulo and is correctly left out of 2026 in Tokyo, where it is already 2027-01-01.

## Acceptance criteria

- [x] **Timed events go on the right days, with no day missed or added because of the time of day.** Met. All three anchors are fixed (`calendar.logic.ts:119-131`, `linear-calendar.logic.ts:130-131,148-149,175-182`), and the timezone probes above pass.
- [x] **Failing tests first for each of the three cases.** Met. Each anchor has at least one test that fails on main: grouping (2 tests), year end (1, plus 1 through `buildLinearYearLayout`) and month end (1). See the red-first check above.
- [x] **Day-granular comparisons; tests green.** Met. The comparisons now use `formatDateKey` YYYY-MM-DD keys, and the tests are green as listed above. Finding 1 below is about what these comparisons cost, not whether they are correct.

## CLAUDE.md checks

- Layers: pure `.logic.ts` changes only, with no framework imports added. `linear-calendar.logic.ts` imports `formatDateKey` from `calendar.logic.ts`, which it already imported from.
- Tests: both changed source files have test changes. No store or logic file is mocked.
- Tabs, English, and comments explain why without narrating the change.
- Scope: no scope creep. Leaving `clampDateToMonth` unchanged is correct, because the only callers (`CollectionLinearCalendarView.svelte:196-197`, `collection-block-widget.ts:307-308`) read `getDate()` and nothing else.
- Commits follow docs/COMMITS.md.
- Performance: see Finding 1.

## Findings

1. **Medium: `src/lib/features/collection/linear-calendar.logic.ts:180-182` (and `:148-149`), performance regression on a render path.** The month overlap filter now calls `formatDateKey` (a dayjs `format`) twice per event for every month, which is 24 dayjs formats per event per layout. Before, it did two numeric comparisons. Measured with `buildLinearYearLayout` on 5000 timed records: 4.5 ms per run on main against 144 ms on the branch, about 32x slower. The function runs in the `$derived` in `CollectionLinearCalendarView.svelte:42` and on each `toDOM()` of the collection block widget (`collection-block-widget.ts:239`). CLAUDE.md's live-preview rules say `toDOM()` must not repeat expensive work.
   - **Fix:** keep the day-granular meaning but compare numbers against exclusive local-midnight bounds:
     - month: `e.endDate.getTime() >= new Date(year, month, 1).getTime() && e.startDate.getTime() < new Date(year, month + 1, 1).getTime()`
     - year: skip when `endDate < new Date(year, 0, 1)` or `startDate >= new Date(year + 1, 0, 1)`

     In local time this is exactly the key comparison, because start-key <= last-day-key holds exactly when start < the next period's first midnight. Update the two comments to describe the exclusive next-period bound.
   - **Alternative:** compute the start and end keys once per event in `extractEventsForYear` and keep them on `RawEvent`.
   - The existing tests already pin the behavior. No new test is needed.
2. **Low: `src/lib/features/collection/calendar.logic.ts:125-126`, extra work in the loop.** The multi-day loop formats the same `current` date twice per iteration: once in the `while` condition and once for `key`. Measured with 5000 two-day timed records: 17 ms on main against 51 ms on the branch. Part of that increase is the correct extra placement on the second day.
   - **Fix:** format once per iteration, for example `for (let key = formatDateKey(current); key <= endKey; key = formatDateKey(current)) { ...; current.setDate(current.getDate() + 1); }`. Another option is a numeric exclusive bound `new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1)`.
3. **Low, no change required: `src/lib/features/collection/calendar.logic.ts:119-122`, timed end at exactly midnight.** A timed end at exactly `T00:00`, as in `start: 2026-03-10T22:00, end: 2026-03-11T00:00`, now also places the record on Mar 11. On main the grid placed it on Mar 10 only.
   - This is the inclusive day-key reading the Issue asks for. It matches how date-only ends work (`2026-03-11` parses to 00:00 and is inclusive), and the linear view already showed such a record through day 11 on main.
   - **Optional:** add a `groupRecordsByDate` test that pins this, so that changing it later is a deliberate choice.
