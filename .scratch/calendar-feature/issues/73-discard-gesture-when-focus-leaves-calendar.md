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

## Comments

- 2026-10-28 21:44 — discovery — focusin (window, capture) outside the [data-event-calendar] root discards via the existing paths; plan in work/73/discovery.md — 0c25cfd7
- 2026-10-28 21:47 — implement — time grid (d17ffba8) and DayDrag discard on focusin outside the calendar root; pnpm check 0 errors, event-calendar vitest 968/968 — 7f325aaa
- 2026-10-28 21:51 — review — CHANGES_REQUESTED: source correct (4 discard tests fail on main, pass on branch; check 0 errors; event-calendar vitest 968/968); 1 minor finding: no time-grid test for a moved/resized block writing nothing after focus leaves — 1d3cdcfc
