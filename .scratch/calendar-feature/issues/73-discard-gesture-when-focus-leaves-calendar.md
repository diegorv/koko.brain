# 73: Discard a live Calendar gesture when focus leaves the calendar

**What to build:** while a pointer gesture (time-grid move/resize/create, or a `DayDrag` in the month grid or all-day lane) is held, opening an overlay such as the command palette (Cmd+P) or the quick switcher (Cmd+O) discards the gesture, so the overlay's first Escape closes the overlay and releasing the pointer does not open the create dialog or a popover behind it.

**Blocked by:** 67 (both touch `event-calendar-day-drag.svelte.ts`)

**Status:** ready-for-agent

- Found by the review of issue 62 (`.scratch/calendar-feature/work/62/review.md`, finding 1). Since 62, every key except Escape reaches the app mid-gesture, so Cmd+P / Cmd+O can open an overlay while the press is held.
- Today the gesture's capture listeners (`EventTimeGrid.svelte:121-126`, `event-calendar-day-drag.svelte.ts:143-148`) keep Escape: the first Escape discards the drag and does not reach the overlay. Under the time grid's pointer capture (or `DayDrag`'s window listeners) the release can still open the create dialog or the popover behind the overlay.
- Suggested fix from the review: discard the gesture on `focusout` from the calendar root when the new focus target is outside it. Both controllers must go through their existing discard path (`discardGesture` / `#discard` -> `endGesture`) so `gestureLive` clears.

- [ ] A test that opens an overlay (or moves focus outside the calendar root) mid-gesture fails today: the gesture stays live
- [ ] After the fix the gesture is discarded, nothing is written, `gestureLive` is false, and releasing the pointer opens no dialog or popover
- [ ] Covered for the time grid and for `DayDrag` (month grid and all-day lane)
- [ ] Focus moving within the calendar root (e.g. to a block) does not discard the gesture
