# 59: Drag in the month view and the all-day lane

**What to build:** events can be dragged between days in the month grid and in the all-day lane, as they can in the time grid.

**Blocked by:** None

**Status:** ready-for-agent

- Drag today is time-grid only (ticket 30, `src/lib/features/event-calendar/event-calendar-drag.logic.ts`, `EventTimeGrid.svelte`). Month grid: `EventMonthGrid.svelte`; lane: `EventAllDayLane.svelte`.
- A day move changes `date` only and keeps `start`/`end`; reuse the write service and undo history.

- [ ] Drag to another day in month view and in the all-day lane moves the event, with undo
- [ ] Read-only events (multi-day, ticket 41) do not drag
- [ ] Logic tests and an E2E per surface

## Comments

- 2026-10-28 17:49 — discovery — plan in work/59/discovery.md: pure day-drag logic, date-only moveEventToDay, one shared gesture controller for month grid and all-day lane — e1233aed
