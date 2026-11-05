# 67 discovery: Calendar focus and accessibility polish

Anchors on main (47b8e4f2). Four independent items, one commit each.

## 1. Popover close: `tabindex="-1"` wrapper takes focus (ticket 26)

`EventPopover.svelte:32` `FOCUSABLE` matches `[tabindex]`; `handleCloseAutoFocus` (`:103`) focuses
`outside.closest(FOCUSABLE)`, so a click on empty space in a `tabindex="-1"` wrapper (the view root
`section[data-event-calendar]` itself, `EventCalendarView.svelte:229`) focuses the wrapper instead of
returning focus to the clicked block. Fix: `[tabindex]:not([tabindex="-1"])`.
Test (`EventPopover.test.ts`, next to "leaves focus on an outside button"): slow click on a span inside
an outside `tabindex="-1"` div; focus returns to the Standup block, not the div.

## 2. Delete-toast Undo focuses the first Calendar root (ticket 29)

`event-calendar.service.ts:1299` and `:1389` (the undo/redo toast's reverse action, same defect) call
`focusRoot(document.querySelector('[data-event-calendar]') ?? root)`: the first root in the DOM wins
over the view that issued the action. Fix: a `liveRoot(root)` helper, the passed root while connected,
else the first live `[data-event-calendar]` (the remount case the existing tests cover).
Tests (`event-calendar.service.test.ts` ~2433 and ~2636): two connected `data-event-calendar` roots,
action issued from the second; focus lands on the second.

## 3. Span segment aria-label reads the clipped range (ticket 41)

`segmentOnDay` (`event-calendar-view.logic.ts:187`) copies a timed span with `start`/`end` clipped to
the day (keeps `date`/`endDate`). `EventBlock.svelte:36` builds the label from those, e.g. `00:00 – 24:00`.
Fix: pure `eventRangeLabel(event, timeFormat)` in `event-calendar-view.logic.ts`: same-day ->
`formatTimeRange`; span -> `Nov 10 22:00 – Nov 11 02:00`. `EventBlock` gets an optional `whole` prop
(the unclipped event); `EventTimeGrid.svelte:323` passes the store event by path. The visible time
text stays the clipped segment. Tests: logic cases in `event-calendar-view.logic.test.ts`; a span in
`EventTimeGrid.test.ts` whose middle and last segment labels carry the full range.

## 4. Day-drag click swallow eats a later AT click (ticket 59)

`event-calendar-day-drag.svelte.ts:66-70`: `#swallowClick` stays armed when the release click lands
outside the area, or after pointercancel (no click follows), until the next press in the area, so an
AT click with `detail >= 1` is eaten. Fix: while armed, window capture listeners disarm it on any
`pointerdown` anywhere and on a `click` whose target is outside the area. Escape/pointercancel arm only
once a `pointerup` arrives (window capture, one-shot): no release, no click to swallow. Removed on
disarm and `reset`. Reword the JSDoc at `:60-65`.
Tests (`EventMonthGrid.test.ts` ~581-640, `EventAllDayLane.test.ts:108`): `detail: 1` click on a chip
after (a) a drop whose click lands outside the area, (b) pointercancel, opens the popover; the existing
Escape-then-release swallow test still passes.

## Risks / defaults

- `EventTimeGrid.svelte` has its own `swallowClick`; the Issue names only the day drag, left alone.
- Item 2 also fixes the undo/redo toast action (same expression); one helper covers both.
- Pointer Events spec read (w3.org/TR/pointerevents3) does not list `click` after `pointercancel`;
  the release-gated arming makes that question moot.
