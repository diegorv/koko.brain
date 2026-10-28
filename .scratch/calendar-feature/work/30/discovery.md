# 30 discovery: pointer create, move and resize in the time grid

## Files that change

- `src/lib/features/event-calendar/EventTimeGrid.svelte:26-31, 101-131`: bind `bodyEl` to the day-columns body (`:101`), add the five pointer handlers, a capture-phase click guard, the create ghost and a preview-aware `columns` derived.
- `src/lib/features/event-calendar/event-calendar-drag.logic.ts`: new pure `previewDayEvents(drag, dragged, dayIndex, dayKey, dayEvents)` (`null` for an untouched column), so only the source and target columns are re-laid out.
- `src/lib/features/event-calendar/EventBlock.svelte:62-106`: not in Touches, but the `[data-resize]` handle the hit-test reads does not exist yet. Adds a bottom `data-resize` strip on writable blocks only.
- Tests: `event-calendar-drag.logic.test.ts` (`previewDayEvents`, plus edge cases), `EventTimeGrid.test.ts` (resize handle present / absent on read-only; no pointer test, per ticket 01 (f)), `e2e/specs/event-calendar.spec.ts` (four `page.mouse` cases).

## Plan

- `gesture` (plain let: pointerId, press x/y, block element, dragged event) vs `preview` (`$state.raw<DragState | null>`). pointerdown: mouse/pen, button 0; `closest('[data-event-path]')`, skip `data-readonly`; `[data-resize]` -> `beginResize`, block -> `beginMove`, else `beginCreate(slot, defaultDurationMinutes)`; `bodyEl.setPointerCapture?.(e.pointerId)`; window `keydown` Escape listener while the gesture is live.
- pointermove: `updateDrag(preview, slotFromPoint(bodyEl rect read live, ...), hypot)`. First move past the threshold closes the popover.
- pointerup: `resolveDrag(preview, events, days)`. create -> `openDialog({ mode: 'create', ...payload })`; popover -> `openPopover(path, block rect)`; none -> clear; move -> `moveEvent` or (`drag.kind === 'resize'`) `resizeEvent(path, end)`; the preview is held until the promise settles (cleared only if it is still the same object), failure -> `toastEventError(err, path)`.
- pointercancel / lostpointercapture / Escape -> discard (no-op once pointerup cleared the gesture, since lostpointercapture follows pointerup).
- After a mouse/pen gesture the following `click` is swallowed in the capture phase on `bodyEl` (without capture the click would reach the block's `onclick` after a move). The block `onclick` stays for touch and synthetic clicks.

## Prior art

- Template: work/09 (the logic), `EventTimeGrid.test.ts` harness. E2E: the `openSeededCalendar` + scroll-clear pattern; events on the 15-minute grid (ticket 09 comment).

## Risks

- bits-ui dismisses mouse layers on pointerdown (10 ms debounce); the popover already prevents it for `[data-event-path]` targets, and the dialog opens at pointerup, after that pointerdown.
- Click retargeting under pointer capture differs between engines; the click guard makes both outcomes equivalent.

## Defaults for open questions

- Pending blocks are draggable (the write queue serializes per path).
- Escape is a window listener only while a gesture is live; ticket 31 owns the view keyboard.
