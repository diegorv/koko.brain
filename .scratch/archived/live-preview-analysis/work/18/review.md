VERDICT: APPROVED

# Issue 18 review: linear-calendar lane cap

Reviewed `git diff main...HEAD` at e83c39d5 (commits b3ef9203, 14a89ddb, e83c39d5). Source change: `src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts` only. No PRD exists for this feature; the Issue and `work/18/discovery.md` are the spec.

## Test verdict rests on
- `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.test.ts` (21 tests, all pass)
- `src/tests/lib/features/collection/linear-calendar-logic.test.ts` (lane layout the widget consumes, unchanged, all pass; 72 tests across both files)
- Red probe: with `main`'s widget plus only the exported constant (so the import resolves), 2 of the 5 new tests fail ("renders at most the lane cap..." and "sizes a capped month row..."). The other 3 (exactly at cap, under cap, click) pass on both sides, as expected for boundary and regression guards. Worktree restored afterwards (`git status` clean).
- `pnpm check`: 0 errors, 0 warnings.

## Acceptance criteria
- [x] Test written and seen failing first: many records on the same day render at most the lane cap of bars per month row plus "+N". Met: test at test.ts:333-343 (20 same-day records: 3 bars, "+17", header "Year (20)"); fails on `main` per the probe above.
- [x] Test: a result under the cap renders every bar and no marker. Met: test.ts:364-373 (2 records), plus the exactly-at-cap boundary at test.ts:355-362, which catches a `>=` / `>` slip in the marker.
- [x] The cap is one named constant with a JSDoc saying why it exists. Met: `LINEAR_CALENDAR_LANE_CAP` at collection-block-widget.ts:53-61; the JSDoc states the unbounded-lanes and synchronous `toDOM()` reasons and what stays whole.

## Correctness checks
- Output is bounded: lanes 0..2 per row, and bars in one lane never share a day (greedy assignment in `linear-calendar.logic.ts:211-225`), so at most 3 x 31 bars per month row and 1116 per widget.
- Hidden events are never hidden behind empty space at their start day: greedy assignment puts an event in lane >= 3 only when lanes 0..2 are busy on its start day, so every hidden bar overlaps three visible ones there.
- Row height uses `min(maxLane + 1, cap)` (widget.ts:319-320); a row with no events still gets 20px (`maxLane = -1` gives `visibleLanes = 0`).
- `QueryResult`, cache entry and header count are untouched; `CollectionLinearCalendarView.svelte` and `linear-calendar.logic.ts` are unchanged (no scope creep).
- Layer rules: change stays in `core/`'s widget, which already imported the `features/collection` logic before this diff. No new imports.
- Commit 14a89ddb follows docs/COMMITS.md (Context, Problem, Solution, Behavior, Files with line ranges, trailer).

## Findings
1. Low, `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.test.ts:381`: the click test's only assertion is `expect(openFileInEditor).toHaveBeenCalledTimes(1)`, which docs/TESTING.md and CLAUDE.md disallow as a sole assertion. Fix: assert the record that opened, `expect(openFileInEditor).toHaveBeenCalledWith('/vault/e0.md')` (lane 0 holds e0: same start day and duration, stable sort).
2. Low, same test file:304 (and widget's `new Date()`): the tests compute the year from the wall clock in two places, so a run that crosses midnight on Dec 31 can put the records in a different year than the widget renders. Fix: `vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(2026, 5, 15))` in the describe's `beforeEach` and `vi.useRealTimers()` in `afterEach`, then use the fixed year in `setSameDayIndex`.
3. Info, no change for this Issue: `layoutEventsInMonth` (`linear-calendar.logic.ts:211-225`) still lays out every record on every `toDOM()`, O(events x lanes) per month, so n same-day events cost O(n^2) before the cap applies. Pre-existing and outside the Issue's DOM scope; open a follow-up only if profiling shows it.

## Resolution
1. Fixed: the click test also asserts `toHaveBeenCalledWith('/vault/e0.md')`.
2. Fixed: the describe pins `Date` with `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(new Date(YEAR, 5, 15))` and restores real timers in `afterEach`; `setSameDayIndex` uses the fixed `YEAR`. Probe: with `YEAR = 2031` all 21 tests still pass, so the widget reads the pinned clock.
3. No change (info, pre-existing, outside the Issue's scope), as the review states.
