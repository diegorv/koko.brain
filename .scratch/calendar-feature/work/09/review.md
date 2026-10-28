VERDICT: APPROVED

# 09 review: pointer drag logic

Reviewed `git diff main...HEAD` (a4863fab, 99647b0a, 5d3435d6) against Issue 09, plan Task 8 (`plan-2026-10-28.md:219-237`), the prototype (`calender-app-design/src/components/calendar/time-grid.tsx:225-380`) and CLAUDE.md.

## Checks run by the reviewer

- `pnpm vitest run src/tests/lib/features/event-calendar/`: 3 files, 95/95 pass. The test verdict rests on `src/tests/lib/features/event-calendar/event-calendar-drag.logic.test.ts` (new, 34 tests) plus `event-calendar-layout.logic.test.ts` and the third file in that folder, which cover the helpers the new module imports (`floorToSnap`, `snap`, `clampMinutes`, `pxToMinutes`).
- `pnpm check`: 0 errors, 0 warnings.
- A throwaway probe test (deleted, not committed) for the edge cases in findings 1-3.
- `grep DragState|originDate|currentDate` over `src/`: the only users of `DragState` are the types file and the new module, so the reshape breaks no reader.
- Full gate not run (deliver runs it).

## Acceptance criteria

- [x] Exports `slotFromPoint(rect, clientX, clientY, dayCount)`, `beginCreate`, `beginMove`, `beginResize`, `updateDrag(drag, slot, distancePx)`, `resolveDrag(drag, events, days)`, `createGhost(drag)`. Met: `event-calendar-drag.logic.ts:84, 98, 132, 137, 152, 186, 203`. Imports are only `./event-calendar-layout.logic` and `import type` from `./event-calendar.types` (`:11-12`), with no touch branch. Every export has JSDoc, and so do the private `beginOnEvent` and the `DragResult` / `Slot` / `EventTiming` / `CreateGhost` fields. `rect` is a parameter (`:84`), and the scrolled-rect test is at `test.ts:58-61`.
- [x] 4 px threshold in `updateDrag`, under test. Met: `:153` (`!drag.moved && distancePx <= 4` returns the same object, matching the prototype's `dist > DRAG_THRESHOLD`). Tests: `test.ts:69-86` (exactly 4 px and 0 px return the same reference, 4.5 px moves, and tracking continues once moved).
- [x] Create rule. Met: anchor = `min(floorToSnap(m), 1440 - MIN_EVENT_MINUTES)` and click end = `min(anchor + duration, 1440)` (`:99-100`). Drag = `[min(a, cur), min(max(a, cur, start + 15), 1440)]` (`:155-158`). The create stays on its origin day (`:188`), as in the prototype.
- [x] Click and drag create tests, including anchors 1425 and 1440. Met: `test.ts:90-165`. Clicks at 1425 and 1440 (`:100-112`); drags from 1425 and 1440 down, up and in place (`:138-160`); the 15-minute minimum (`:130`).
- [x] Move keeps the duration, clamps to `[0, 1440 - length]` and may change day; resize clamps the end to `[start + 15, 1440]` with max-wins `clampMinutes`; both clamps tested. Met: `:162-170`. Tests: move clamps at `test.ts:202-212`; resize clamps at `:254-270`, including 1430 to 1440, not 1445.
- [x] `beginMove` on day 1, `updateDrag` to day 3, resolves to `{ kind: 'move', timing: { date: days[3], ... } }` with the duration kept. Met: `test.ts:185-193` (540-630 becomes 660-750 on `days[3]`).
- [x] `resolveDrag` union, with `none` for an unchanged date/start/end and `popover` for an unmoved block click, both tested. Met: the type is at `:42-66` and the logic at `:186-200`. `none` is tested at `test.ts:214-220` (dragged away and back, `moved` true) and `:272-276` (an unchanged resize). `popover` is tested at `:222-226` and `:275`.
- [ ] Gate green; one commit in the full format. Partly checked. 99647b0a is the one feat commit, and it has Context, Problem, Solution, Behavior, Files with line ranges and the Co-Authored-By line. The gate is the deliver step's job and is not verified here.

## Scope

`DragState` (`event-calendar.types.ts:186-215`) is outside the Touches list. The change is justified: `slotFromPoint` only knows `dayCount` and `resolveDrag` takes `days`, so the drag has to carry indices. It is recorded in discovery and in the commit, and nothing read the old shape. Accepted.

## Findings

1. **Low**, `src/lib/features/event-calendar/event-calendar-drag.logic.ts:120-121, 195`. A resize takes its date from the press slot's column, not from the event. `beginOnEvent` sets `day = slot.dayIndex`. For a resize, `updateDrag` never changes `day`, and `resolveDrag` writes `days[drag.day]`. The prototype used `days.indexOf(ev.date)` (`time-grid.tsx:240`). Probe: a resize of a day-1 event begun with a slot on day 2 resolved to `{ kind: 'move', timing: { date: '2026-11-11', ... } }`, so the resize also moved the event to another day. Ticket 30's hit test makes this unlikely, because the handle lies inside the event's column, but the logic's own contract ("keeps start and day", `test.ts:243`) depends on the caller. Fix: in `resolveDrag`, use `event.date` when `drag.kind === 'resize'`, and add a test that begins a resize on another column and expects the event's own date.
2. **Low**, `event-calendar-drag.logic.ts:188, 195`. `days[index]` is not guarded. If `days` at resolve time is shorter than at begin time (a view switch mid-drag, such as week to day through a ticket 31 shortcut), `resolveDrag` returns `create` or `move` with `date: undefined`, typed as `string`. Probe: `{ kind: 'move', path: 'a', timing: { date: undefined, start: 675, end: 735 } }`. Fix: return `{ kind: 'none' }` when the looked-up day key is `undefined`, and add a test. Alternatively, record in ticket 30 / 31 that a view change cancels the drag. If the deliver step does neither, leave a follow-up note for ticket 30.
3. **Info**, `event-calendar-drag.logic.ts:165, 169`. Moving or resizing an unsnapped event (for example 545-605) just past the 4 px threshold re-snaps it. Probe: a 4-minute wiggle on a move resolved to 555-615, and a 3-minute wiggle on a resize resolved to end 600. This matches the prototype's behavior and needs no change. Ticket 30's E2E should use events on the 15-minute grid, or expect the snap.

## Resolution

1. Fixed. `resolveDrag` takes a resize's date from `event.date`, not from `days[drag.day]`. New test: a resize pressed in another column keeps the event's own date.
2. Fixed. `resolveDrag` returns `{ kind: 'none' }` when the create or move day key is `undefined` (the visible days shrank mid-drag). New tests for both a create and a move.
3. No change (info). Matches the prototype; ticket 30's E2E should use events on the 15-minute grid.
