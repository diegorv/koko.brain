VERDICT: CHANGES_REQUESTED

# 08 review: view logic (visible days, range labels, month cells, chips, now offset)

Reviewed `git diff main...HEAD` at e92cde6b (commits 2b52521e, ca7e6216, e92cde6b). The diff adds two source-side files (`event-calendar-view.logic.ts`, its test) plus scratch docs. Nothing existing is modified.

The logic is correct against the Issue, the plan (Task 7, `plan-2026-10-28.md:197-217`) and the prototype (`calendar.tsx:35-43`, `calendar-header.tsx:30-52`, `month-view.tsx:13-49`, `all-day-row.tsx:22-36`). I found no correctness bug. The one blocking gap is a test that cannot fail on the property it names: the "today starts at the current 15-minute slot" test passes when `floorToSnap` is replaced by rounding (finding 1). The other two findings are low.

## Test verdict rests on

- `src/tests/lib/features/event-calendar/event-calendar-view.logic.test.ts` (new, 46 tests)
- `src/tests/lib/features/event-calendar/event-calendar-dates.logic.test.ts` and `event-calendar-layout.logic.test.ts` (unchanged; the code the new module imports)
- Run by me in the worktree:
  - `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar/ --reporter=verbose`: 3 files, 107/107 passed. Both `nowOffsetMinutes across DST (America/New_York)` tests ran (not skipped).
  - The new test file under `TZ=America/New_York`, `Pacific/Kiritimati`, `America/Santiago` and `Asia/Tokyo`: 46/46 each, so nothing depends on the host zone.
  - `pnpm check`: 192 files, 0 errors, 0 warnings.
- Mutation probe (scratchpad copies only, no worktree file touched). Each mutant is run against the 46 tests:
  - M1, the Monday shift in `rangeLabel` dropped (`:161`): 2 fail.
  - M2, the title tie-break in `itemsForDay` dropped (`:211`): 2 fail.
  - M3, 3 chips plus "+N" instead of 2 plus "+N" (`:231`): 2 fail.
  - M4, the prototype's elapsed-milliseconds now-line (`:256`): 2 fail (the DST block).
  - **M5, `floorToSnap(nowMinutes)` replaced by `Math.round(nowMinutes / 15) * 15` (`:279`): 0 fail.** See finding 1.
  - M6, the `1440 - MIN_EVENT_MINUTES` start cap dropped (`:280`): 1 fails.
  - M7, the title taken from `date` (the prototype's anchor-month bug, `:153`): 3 fail.
  - M8, the all-day lane sort dropped (`:230`): 2 fail.
  - M9, the all-day-first rule dropped (`:209`): 2 fail.

## Acceptance criteria

- [x] No framework import and JSDoc on every export. Met. Imports are `./event-calendar-dates.logic`, `./event-calendar-layout.logic` and `import type` from `./event-calendar.types` (`event-calendar-view.logic.ts:13-34`). Every exported constant, interface (and each field), and function has a JSDoc block, and so does the private `compareText` (`:96`). Tabs throughout.
- [x] `visibleDays` and `stepDate` are exported, and day view always shows its date. Met (`:112-124`, `:134-138`).
  - Day view returns `[date]` even on a hidden weekend (`:118`; test `test.ts:51-53`).
  - The tests cover every view x `weekStartsOn` x `showWeekends` combination: day in a 2x2 loop (`:43-49`); week at (1,true), (0,true), and both starts with weekends hidden (`:55-83`); month for both starts, with and without weekends (`:116-133`).
  - Month and year boundaries are covered for week view (`:85-114`), for `stepDate` (`:136-153`, including the Jan 31 to Feb 28 clamp) and for the month grid (`:296-300`).
- [x] `rangeLabel(view, date, days)` returns `{ title; subtitle }`. Met (`:151-164`).
  - The title comes from `days[0]`, not the anchor (`:152-153`). A Dec 3 anchor gives "November, 2026" (`test.ts:173-179`), and M7 proves the test fails on the prototype rule.
  - The week number is the ISO week of the first Monday on or after `days[0]` (`:161`). That equals the prototype's `weekStartsOn === 0 ? days[1] : days[0]` (`calendar-header.tsx:43-44`) for every possible first day (Sunday, or Monday), and stays correct when weekends are hidden.
  - Day subtitle (`:159`) and month subtitle (`:155-156`) match the Issue text.
- [x] The `rangeLabel` tests cover a Sunday-first week (`test.ts:164-171`, and `:191-197` at the year boundary) and the 2026-12-28..2027-01-03 week, which reads "Week 53" (`:181-189`). Met.
- [x] Day and month helpers. Met.
  - `groupEventsByDay` returns `{ timed; allDay }`. It has an entry for every visible day and drops other days (`:173-180`; tests `:233-266`).
  - `buildMonthCells` gives 42 cells, or 30 without weekends, with `inMonth` set (`:190-195`; tests `:268-301`).
  - `itemsForDay` orders all-day first, then by start, then by title (`:204-217`). The ordering test (`:314-316`) is killed by M2 and M9.
  - `MONTH_MAX_CHIPS = 3` is exported (`:39`; `test.ts:328-330`).
- [x] All-day lane capped at 3 rows with an overflow count. Met (`:227-243`). More than 3 events give 2 chips plus `overflow = n - 2`, so the "+N" takes the third row. `laneRows` clamps to 1..3. Overflow counts are tested (`test.ts:353-371`) and killed by M3. See findings 2 and 3 for the test name and the `laneRows` input.
- [x] `nowOffsetMinutes` is exactly the plan's formula (`:254-257`), with no elapsed milliseconds. Met.
- [x] `nowOffsetMinutes` tests: `null` for another day (`test.ts:399-403`), and the DST block under `describe.runIf(runtimeTimeZoneSwitchWorks())` with `withTimeZone('America/New_York', ...)` (`:406-424`). 10:00 local on 2026-03-08 and on 2026-11-01 both give 600. The block ran in my run and is killed by M4. Met.
- [x] `defaultCreateSlot` applies the Task 8 cap. Met, though the floor half of the anchor rule is not pinned (finding 1).
  - Start is at most `1440 - MIN_EVENT_MINUTES` (`:280`; tests `:448-457`).
  - End is `min(start + duration, 1440)` (`:281`; tests `:459-470`).
  - `MIN_EVENT_MINUTES` comes from `./event-calendar-layout.logic` (`:33`), and nothing is imported from a drag file (none exists yet).
- [ ] Gate green, one commit in the full format. Pending: the deliver step runs the gate. Commit ca7e6216 already has Context, Problem, Solution, Behavior, Files with line ranges (1-282, 1-471, which match the file lengths) and the Co-Authored-By trailer.

## Plan and PRD decisions

- D17 (desktop only): the compact 3-day branch is dropped from `visibleDays`, `stepDate` and `rangeLabel`. Correct.
- D13 (now-line from local hours and minutes): followed.
- The open choices recorded in `discovery.md` are all defensible, and each is pinned by a test:
  - Month `visibleDays` is the month's own days. The prototype passed the week to the header in month view (`calendar.tsx:40-43`), but it titled from the anchor date. Ticket 18's `rangeLabel` getter feeds `visibleDays`, so the title is always the displayed month.
  - With weekends hidden, the week subtitle spans the visible days. This matches the Issue's literal `formatRange(first, last)`.
  - 2 chips plus "+N" is the only reading of "capped at 3 rows with an overflow count" that keeps the "+N" inside the cap.
- Scope: no extra exports beyond `ALL_DAY_MAX_ROWS` and the result interfaces, which the lane cap and the typed returns need. No callers were added. There is no scope creep.

## Findings

1. **Medium. `test.ts:435-446` (code at `event-calendar-view.logic.ts:279`): the floor of today's slot is untested.** The JSDoc (`:268`), the discovery note and the commit message all say today starts at `floorToSnap(now)`, the Task 8 anchor rule (`plan-2026-10-28.md:226-227`). The test uses `nowMinutes` 607 and 600, and both round and floor give 600 for them, so mutant M5 (round to nearest) passes all 46 tests. Fix: add a case with a minute past the half slot that floor and round split, for example `defaultCreateSlot('2026-11-10', '2026-11-10', 614, 7, 60)` gives `{ start: 600, end: 660 }` (round would give 615). Then confirm the test fails against the round mutant.
2. **Low. `test.ts:366`: the test name contradicts its assertion.** It reads "overflows by 1 when a day holds 4 all-day events", but the test asserts `overflow` 2, with chips `['w', 'x']`. That is the correct value under the 3-row cap (2 chips plus "+2"). Fix: rename it to "shows 2 chips and an overflow of 2 when a day holds 4 all-day events".
3. **Low. `event-calendar-view.logic.ts:236-243`: the `laneRows(maxChips)` parameter name invites an undercount.** The JSDoc says the input is the largest number of all-day *events* on a visible day. A caller in ticket 22 that holds `buildAllDayChips` output will naturally pass `Math.max(...cells.map((c) => c.chips.length))`. For a day with 5 events that is 2, so `laneRows` returns 2 while the cell needs 3 rows (2 chips plus "+N"), and the overflow row gets clipped. No test ties `laneRows` to `buildAllDayChips` output. Fix (no API change): rename the parameter to `maxEvents`, or state in the JSDoc that it is `chips.length + overflow`. Then add one test that derives `laneRows` from `buildAllDayChips(days, events)` for the 5-event day in the existing fixture and expects 3.

Informational, no change requested: `itemsForDay` filters the full event list once per month cell (42 x N). That is fine at vault scale, and it matches the per-cell call shape in ticket 23.

## Resolution

All three findings accepted and fixed; none rejected.

1. Added `floors, not rounds, now to the slot start today`: `defaultCreateSlot('2026-11-10', '2026-11-10', 614, 7, 60)` gives `{ start: 600, end: 660 }`. Against the round mutant (M5) it fails (1 failed, 47 passed); with `floorToSnap` restored it passes.
2. Renamed the 4-event test to `shows 2 chips and an overflow of 2 when a day holds 4 all-day events`.
3. Renamed `laneRows(maxChips)` to `laneRows(maxEvents)` and documented that from `buildAllDayChips` output the input is `chips.length + overflow`. Added `sizes the lane from chips plus overflow, giving 3 rows for the 5-event day`, which derives 5 from `buildAllDayChips(['2026-11-11'], events)`, expects `laneRows` 3, and shows `chips.length` alone gives 2.

Targeted checks after the fixes: `vitest run src/tests/lib/features/event-calendar/` 3 files, 109/109; `pnpm check` 0 errors, 0 warnings.
