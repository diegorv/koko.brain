# 59 discovery: drag in the month view and the all-day lane

## Files that change

- `src/lib/features/event-calendar/event-calendar-drag.logic.ts:242` (append): pure day-drag logic: `cellFromPoint(rect, x, y, cols, rows)`, `beginDayDrag`, `updateDayDrag` (same 4 px threshold), `resolveDayDrag` (`move {path, date}` or `none`), `previewDayMove(events, drag, days)` (the dragged event re-dated to the target day).
- `src/lib/features/event-calendar/event-calendar.types.ts:197`: `DayDragState { path, originDay, day, moved }` beside `DragState`.
- `src/lib/features/event-calendar/event-calendar.service.ts:515`: `moveEventToDay(path, date)` = `updateEventFields(path, { date }, { label: 'Move event' })`. `moveEvent` cannot be reused: passing `start`/`end` makes `applyEventFields` (`event-calendar-event.logic.ts:283-291`) drop `all_day`. A date-only patch keeps `start`/`end` and `all_day` untouched, and the existing read-only refusal and undo history apply.
- `src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts` (new): one gesture controller shared by both surfaces (pointerdown on a chip, window pointermove/pointerup, Escape and key shielding as in `EventTimeGrid.svelte:115-129`, popover close on the first real move, click swallow after a drop, preview held until the write settles, toast on failure).
- `EventMonthGrid.svelte:59-121`: wire the controller on the cells grid (6 rows), chips get `data-readonly`, chips built from `previewDayMove(...)`, `select-none`, discard on a cells change.
- `EventAllDayLane.svelte:44-78`: wrap the cells in `[data-all-day-cells]` (the rect the hit test reads, 1 row), same wiring.

## Plan

- Task 1: logic + service + their tests (`event-calendar-drag.logic.test.ts`, `event-calendar.service.test.ts`).
- Task 2: controller + both components + component tests (`EventMonthGrid.test.ts`, new `EventAllDayLane.test.ts`, pointer events through jsdom with a stubbed rect, service mocked as the side-effect layer) + `e2e/specs/event-calendar-day-drag.spec.ts` (month move + undo, lane move + undo, span does not drag in either surface).
- No pointer capture: with capture the click after a plain press would retarget to the container and the chip's own `onclick` (popover) would not fire. A plain press stays a click.

## Prior art

- Template: work/30 (time-grid gesture). Differs: cells instead of slots, no create/resize, no capture, date-only write.
- E2E: `seedEvents` + `openCalendar` + `drag` + `readNote` + Meta+Z pattern from `e2e/specs/event-calendar.spec.ts:80-105, 539-549, 716-731`, copied into the new spec.

## Risks

- A day move of a timed event in the lane cannot happen (lane only shows all-day events); month moves both kinds.
- Day view lane has one cell: any drag resolves to `none`.

## Defaults for open questions

- Read-only chips get `data-readonly` and never start a gesture; `resolveDayDrag` also returns `none` for them.
- Pending chips are draggable (the write queue serializes per path), as in ticket 30.
