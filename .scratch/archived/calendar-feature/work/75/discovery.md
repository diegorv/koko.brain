# 75 discovery: closing the event popover by clicking a header view tab pulls focus off the tab

Anchors on main (0c25cfd7). Template: the issue 67 review fix 699269c2 (same function, same test block).

## Files that change

1. `src/lib/features/event-calendar/EventPopover.svelte:103-107` (`handleCloseAutoFocus`): `ownWrapper`
   becomes true only when the `closest(FOCUSABLE)` match carries `tabindex="-1"`, sits inside `root`, AND is
   not natively focusable (`button, a[href], input, select, textarea, [contenteditable="true"]`). The
   unselected header tabs (`EventCalendarHeader.svelte:107-114`, `<button role="tab" tabindex={selected ? 0 : -1}>`)
   and any other roving-tabindex control then keep focus; the root and the tablist `<div tabindex="-1">`
   still fall through to the block. The native-control selector is pulled into a `NATIVE_FOCUSABLE` const
   and `FOCUSABLE` is built from it, so the two lists cannot drift.
2. Comment at :104-105 updated to name the native-control exception.

## Tests (prior art)

- `src/tests/lib/features/event-calendar/EventPopover.test.ts` "closing" describe, next to the two cases
  699269c2 added (:313-341): new case mounts a `<button role="tab" tabindex="-1">` inside `root`, opens the
  popover, `slowClick`s the tab and expects `document.activeElement` to be the tab. Fails on main (focus goes
  back to the Standup block). The two existing cases (empty span inside root -> block; outside
  `tabindex="-1"` surface -> surface) stay unchanged and must still pass.

## Risks / defaults

- The test uses a stand-in tab rather than mounting `EventCalendarHeader`: the popover only sees
  `closest(FOCUSABLE)` of the click target, and the header's own tests already cover its tab markup.
  The view-switch unmount that leaves focus on `<body>` is not modelled; keeping focus on the tab is
  enough, since the tab survives the switch.
- No E2E spec added (the Issue's criteria are unit-level).
