# 06: Time-grid layout helpers with overlap columns

**What to build:** `event-calendar-layout.logic.ts` gives the coming time grid its geometry: the grid constants, minute/pixel conversion, 15-minute snapping, and `layoutDay`. `layoutDay` places a day's overlapping events in first-fit columns, with one width per cluster. The file also adds `floorToSnap`, and a max-wins `clampMinutes` so that a resize from start 1430 ends at 1440 instead of 1445. It is pure logic ported from the prototype's `layout.ts`, typed on the `EventNote` and `PositionedEvent` shapes from ticket 05. No UI changes.

**Plan reference:** Task 5 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 128-135). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 05

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-layout.logic.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar-layout.logic.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] `event-calendar-layout.logic.ts` ports `calender-app-design/src/components/calendar/layout.ts:4-48` with no framework imports and JSDoc on every export; it exports `HOUR_HEIGHT` (64), `SNAP_MINUTES` (15), `MIN_EVENT_MINUTES` (15), `MIN_COLUMN_PX` (96, from `time-grid.tsx:32`), `minutesToPx`, `pxToMinutes`, `snap` and `layoutDay`
- [ ] `layoutDay` assigns first-fit columns and gives all events of one cluster one shared width
- [ ] `floorToSnap` and `clampMinutes(n, min, max)` are defined and exported in this file (the Task 8 drag logic calls both)
- [ ] `clampMinutes` lets max win, and the file does not use `$lib/utils/clamp` (`src/lib/utils/clamp.ts:7-9`, where min wins)
- [ ] A test proves that a resize from start 1430 clamps to end 1440, not 1445
- [ ] The test ports the 3 prototype cases from `layout.test.ts:16-33`
- [ ] The test covers empty input, touching events (end equals the next start, so no overlap), 3 or more columns, a chained cluster that shares one width, and zero-length and inverted input
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments
- 2026-10-28 12:31 — discovery — straight port of layout.ts:4-48 plus floorToSnap and max-wins clampMinutes; zero-length/inverted input kept as the prototype handles it — 2ece78fc
- 2026-10-28 12:33 — implement — layout logic + 24 tests green (event-calendar dir 59/59), pnpm check 0 errors; full gate left to deliver — 38cfb70b
- 2026-10-28 12:34 — review — CHANGES_REQUESTED: touching-events test is vacuous (boundary mutations survive), plus a misnamed inverted test; see work/06/review.md — 0980e35e
