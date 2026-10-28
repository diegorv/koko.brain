# 09: Pure pointer drag logic for create, move and resize

**What to build:** `src/lib/features/event-calendar/event-calendar-drag.logic.ts`, a pure, desktop-only port of the prototype's time-grid gesture logic (`calender-app-design/src/components/calendar/time-grid.tsx:250-380`) with the touch branches dropped (D17). It maps a pointer position to a day and minute slot, tracks a create, move or resize drag once it passes a 4 px threshold, and resolves the drag to a create payload, a move with new timing, a popover open, or nothing. One create rule replaces the prototype's 30-minute click floor clamped to 1380, so a click or drag near midnight still stays inside the day. An unchanged move resolves to nothing instead of being recorded. The time grid's pointer wiring comes in ticket 30 (Task 29).

**Plan reference:** Task 8 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 219-237). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 06

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/event-calendar-drag.logic.ts` (new)
- `src/tests/lib/features/event-calendar/event-calendar-drag.logic.test.ts` (new)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] The module exports `slotFromPoint(rect, clientX, clientY, dayCount)`, `beginCreate`, `beginMove`, `beginResize`, `updateDrag(drag, slot, distancePx)`, `resolveDrag(drag, events, days)` and `createGhost(drag)`.
  - It has no framework import, no touch branch, and JSDoc on every export.
  - `slotFromPoint` takes the rect as an argument, so the caller can pass the live rect each time (Notes > Risks 6).
- [ ] `updateDrag` applies a 4 px threshold, and the threshold is under test.
- [ ] Create rule, using `floorToSnap` and `MIN_EVENT_MINUTES` from ticket 06:
  - anchor = `floorToSnap(pointer)`, and `start = min(anchor, 1440 - MIN_EVENT_MINUTES)`;
  - a click gives `end = min(start + defaultDurationMinutes, 1440)`;
  - a drag gives `[min(anchor, current), max(anchor, current, min + 15)]`, capped at 1440.
- [ ] Tests cover click create and drag create, including anchors 1425 and 1440.
- [ ] Move keeps the duration, clamps to `[0, 1440 - length]` and may change day. Resize clamps the end to `[start + 15, 1440]` with ticket 06's max-wins `clampMinutes`. Both clamps are under test.
- [ ] A test does `beginMove` on day 1, then `updateDrag` to a slot on day 3. It resolves to `{ kind: 'move', timing: { date: days[3], ... } }` with the duration kept.
- [ ] `resolveDrag` returns `{ kind: 'create'; payload } | { kind: 'move'; path; timing } | { kind: 'popover'; path } | { kind: 'none' }`:
  - `none` when date, start and end are unchanged (the prototype recorded no-op moves, `app-store.ts:223-231`);
  - `popover` for a click on a block that did not move.

  Both cases are under test.
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:41 — discovery — plan, risks and defaults in work/09/discovery.md (DragState reshaped to day indices) — bf0fbbbc
- 2026-10-28 12:44 — implement — drag logic + 34 tests; event-calendar tests 95/95, pnpm check 0 errors; full gate not run (deliver runs it) — 99647b0a
- 2026-10-28 12:47 — review — VERDICT: APPROVED; 2 low findings (resize date from press slot, unguarded days[index]) + 1 info in work/09/review.md — 5d3435d6
