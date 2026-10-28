# 08: View logic: visible days, range labels, month cells, chips and now offset

**What to build:** the pure view math the Calendar tab renders from, in `src/lib/features/event-calendar/event-calendar-view.logic.ts`: the days the day, week and month views show for a date and the week settings, prev/next stepping, the header title and week-number subtitle, events grouped by day, month cells and per-day chip lists, an all-day lane capped at 3 rows with an overflow count, a now-line offset that stays correct on DST days, and the default slot for a new event. It fixes three prototype defects: the anchor-month header title, the unbounded all-day lane, and the elapsed-milliseconds now-line, which is 60 minutes off on DST transition days. `defaultCreateSlot` uses the same cap as the Task 8 create rule; the cap is written here with ticket 06's `MIN_EVENT_MINUTES`, so this ticket does not depend on ticket 09.

**Plan reference:** Task 7 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 197-218). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 06, 38

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-view.logic.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar-view.logic.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] `event-calendar-view.logic.ts` has no framework import (CLAUDE.md `.logic.ts` rule) and JSDoc on every export.
- [ ] `visibleDays(view, date, weekStartsOn, showWeekends)` and `stepDate(view, date, dir)` are exported. Day view always shows its date (prototype `calendar.tsx:41`). Tests cover each combination of view x `weekStartsOn` x `showWeekends`, plus month and year boundaries.
- [ ] `rangeLabel(view, date, days)` returns `{ title; subtitle }`:
  - The title is `"<Month>, <year>"` of the first visible day, not of the anchor month (prototype `calendar-header.tsx:35`).
  - Week subtitle: `Week <isoWeek of the visible week's Monday> · <formatRange(first, last)>`. Sunday-first weeks also use the Monday.
  - Day subtitle: `Week <isoWeek(date)> · <formatWeekday>, <formatShort>`.
  - Month subtitle: `formatRange` of the month.
- [ ] `rangeLabel` tests:
  - a Sunday-first week;
  - the year boundary 2026-12-28..2027-01-03, which reads "Week 53" (ISO 2026 has 53 weeks).
- [ ] Day and month helpers:
  - `groupEventsByDay(events, days)` returns `{ timed; allDay }`.
  - `buildMonthCells(date, weekStartsOn, showWeekends)` builds the month cells.
  - `itemsForDay(events, day, timeFormat)` orders all-day before timed, then by start, then by title. Chip ordering is under test.
  - `MONTH_MAX_CHIPS = 3` is exported.
- [ ] All-day lane: `buildAllDayChips(days, events)` and `laneRows(maxChips)` cap the lane at 3 rows with an overflow count, which fixes the unbounded lane at prototype `all-day-row.tsx:35-36`. Overflow counts are under test.
- [ ] `nowOffsetMinutes(nowMs, dayKey)` returns `d.getHours() * 60 + d.getMinutes()` (with `d = new Date(nowMs)`) when `toKey(new Date(nowMs)) === dayKey`, else `null`. It never uses elapsed milliseconds since midnight (prototype `time-grid.tsx:369`).
- [ ] `nowOffsetMinutes` tests:
  - `null` for another day;
  - a DST block under `describe.runIf(runtimeTimeZoneSwitchWorks())` with `withTimeZone('America/New_York', ...)` from `src/tests/fixtures/timezone.fixture.ts` (ticket 05): 10:00 local on 2026-03-08 and on 2026-11-01 both give 600.
- [ ] `defaultCreateSlot(date, todayKey, nowMinutes, dayStartHour, duration)` applies the Task 8 create cap:
  - start is at most `1440 - MIN_EVENT_MINUTES`;
  - end is `min(start + duration, 1440)`;
  - `MIN_EVENT_MINUTES` is imported from `event-calendar-layout.logic.ts` (ticket 06), and nothing is imported from `event-calendar-drag.logic.ts`.
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments
- 2026-10-28 12:41 — discovery — pure port of calendar/header/month/all-day/now-line view math; defaults: month visibleDays = month days, lane 3 rows incl. "+N", today slot floors now to 15 min — 2b52521e
- 2026-10-28 12:44 — implement — view logic + 46 tests green (event-calendar dir 107/107, DST block ran), pnpm check 0 errors; full gate left to deliver — ca7e6216
