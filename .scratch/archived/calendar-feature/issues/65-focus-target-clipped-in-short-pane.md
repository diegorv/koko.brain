# 65: "Show in Calendar" can focus a block clipped out of sight

**What to build:** when "Show in Calendar" (ticket 56) targets an event whose month chip or all-day chip is clipped by the cell height, the Calendar shows it anyway: it falls back to the day view (or the "+N" control) based on what is actually visible, not on the chip count.

**Blocked by:** None

**Status:** needs-triage

- Found by the post-merge adversarial review of 0e187396 (ticket 56 fix); reasoned from the code, not reproduced.
- `focusViewFor` (`event-calendar-view.logic.ts`) treats chip index < `MONTH_MAX_CHIPS` as visible. Month cells in `EventMonthGrid.svelte:84-88` are `flex-col min-h-0 overflow-hidden` with `shrink-0` chips, so in a short pane with six week rows chip 3 or the "+N more" button can be clipped. The view then focuses and pulses an element the user cannot see; `scrollIntoView` may also scroll the overflow-hidden cell and hide its day number. The all-day lane may behave the same.

- [ ] E2E first: a short window (six-row month), an event as the third chip of a day; "Show in Calendar" must leave the pulsing target visible (`toBeInViewport` and not clipped by its cell)
- [ ] Fix the visibility decision (measure, or fall back to day view when the cell overflows); the cell's day number stays visible
