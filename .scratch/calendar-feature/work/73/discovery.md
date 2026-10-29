# 73 discovery: discard a live gesture when focus leaves the calendar

## Files that change
- `src/lib/features/event-calendar/EventTimeGrid.svelte:97-159`: `endGesture` / `handlePointerDown` add and remove a window `focusin` capture listener next to the gesture `keydown` one; the handler calls `discardGesture()`.
- `src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:44-59,98-105`: same in `DayDrag` (`pointerdown` adds, `#endGesture` removes); the handler calls `#discard(true)` (the button is still down, so the release must arm the click swallow, as Escape does).
- Tests: `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts` ("keys during a gesture" block, 432-540), `EventMonthGrid.test.ts` ("drag to another day", 463+), `EventAllDayLane.test.ts` ("drag to another day", 75+).

## Plan
- The calendar root is `closest('[data-event-calendar]')` (the `<section>` in `EventCalendarView.svelte:228-234`) of the grid body / drag area, falling back to that element when mounted standalone (unit tests).
- Listen to `focusin` on `window` (capture) for the gesture's lifetime, not `focusout` on the root: focus may sit outside the root when the press starts (e.g. on `<body>` or in a portaled popover), and then no `focusout` from the root ever fires. `focusin` whose target is outside the root means focus left the calendar; one inside (a block, the root) is ignored.
- Discard goes through the existing paths (`discardGesture` -> `endGesture`, `#discard` -> `#endGesture`), so `gestureLive` clears, the preview drops, and the Escape listener goes with it: the overlay's first Escape reaches the overlay.

## Tests (copy the existing Escape / pointercancel tests)
- Time grid: press on empty space, focus an `<input>` outside the target -> `gestureLive` false, Escape reaches the document, `pointerup` opens no create dialog. Press a block, drag, focus outside -> release writes nothing, no popover. Focus a block inside -> gesture stays live.
- Month grid and all-day lane: drag a chip, focus outside -> `gestureLive` false, release writes nothing, the click after release opens no popover; focus a chip inside -> still live.

## Risks / defaults
- A popover closing mid-gesture (first move past the threshold calls `closePopover`) restores focus to the block or the root (`EventPopover.svelte:86-114`), both inside the root, so it does not discard. Not touching EventPopover (issue 75 runs in parallel).
- Window blur (Cmd+Tab) is out of scope: no `focusin` fires; the issue asks only for focus moving to another element.
- No E2E spec: the unit tests drive the real components and stores; jsdom fires `focusin` on `.focus()`.
- Issue 74 (time-grid click swallow persisting after a cancel) is separate; `discardGesture` keeps setting `swallowClick` as it does for Escape.
