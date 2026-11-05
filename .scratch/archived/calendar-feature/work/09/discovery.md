# 09 discovery: pointer drag logic

## Files that change

- `src/lib/features/event-calendar/event-calendar-drag.logic.ts` (new): port of `calender-app-design/src/components/calendar/time-grid.tsx:225-380` (`pointToSlot`, `startDrag`, `onPointerDown/Move/Up`, `createGhost`) without the touch branches (D17). Imports only `event-calendar-layout.logic.ts` and `import type` from the types file.
- `src/tests/lib/features/event-calendar/event-calendar-drag.logic.test.ts` (new).
- `src/lib/features/event-calendar/event-calendar.types.ts:186-206` (`DragState`): not in the ticket's Touches. The ticket-04 placeholder stores `originDate` / `currentDate` keys, but `slotFromPoint` only knows `dayCount` and `resolveDrag` takes `days`, so the drag must carry day indices. Reshaped to `originDay`, `day`, `anchorMinutes`, `originStart`, `originEnd`, `start`, `end`, `moved`. No consumer yet (grep: only the types file).

## Plan (template: work/06, one feat commit, test-first)

- `DRAG_THRESHOLD_PX = 4`; `Slot { dayIndex; minutes }`; `EventTiming { date; start; end }` (payload and move timing share it); `GridRect = Pick<DOMRect, 'left' | 'top' | 'width'>`.
- `slotFromPoint(rect, x, y, dayCount)`: day index clamped to `[0, dayCount - 1]`, minutes = `pxToMinutes(y - top)` clamped to `[0, 1440]`. Rect is an argument (Risks 6).
- `beginCreate(slot, defaultDurationMinutes)`: anchor = `min(floorToSnap(m), 1440 - MIN_EVENT_MINUTES)`; start/end hold the click range `[anchor, min(anchor + duration, 1440)]`.
- `beginMove(event, slot)` / `beginResize(event, slot)`: origin = event timing, `anchorMinutes` = raw pointer minutes (grab offset = anchor - originStart).
- `updateDrag(drag, slot, distancePx)`: returns `drag` unchanged until `moved || distancePx > 4`. Create: `cur = snap(m)`, `[min(a, cur), min(max(a, cur, lo + 15), 1440)]`, day fixed. Move: `start = clampMinutes(snap(m - grab), 0, 1440 - len)`, day = slot day. Resize: `end = clampMinutes(snap(m), start + 15, 1440)`, day fixed.
- `resolveDrag(drag, events, days)`: create -> `{ create, payload }`; move/resize with no event -> `none`; not moved or `readOnly` -> `popover`; unchanged date/start/end -> `none`; else `{ move, path, timing }` (resize also resolves to `move`; the caller picks `resizeEvent` from `drag.kind`).
- `createGhost(drag)`: `{ dayIndex, start, end }` for a create drag, else `null`.

## Prior-art tests

`event-calendar-layout.logic.test.ts` (`ev()` builder, describe per export).

## Risks

- Reshaping `DragState` touches a ticket-04 file; no reader exists, `pnpm check` confirms.
- Prototype `snap(minutes - 7.5)` on pointerdown is replaced by `floorToSnap` (same result except on exact halves).

## Defaults for open questions

- A readOnly event resolves to `popover` even if moved (prototype `locked`); ticket 30 also skips `data-readonly` at pointerdown.
- Move/resize preview of the live layout is ticket 30's concern (`drag.start/end/day` are exposed for it).
