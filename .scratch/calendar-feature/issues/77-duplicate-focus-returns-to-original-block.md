# 77: Focus returns to the original block a frame after "Duplicate"

**What to build:** after "Duplicate" in the event popover, focus should stay on the view root until the copy's block renders and takes it. Today it lands on the original block one animation frame later.

**Blocked by:** None

**Status:** needs-triage

## Evidence

- `EventPopover.svelte` `duplicateNote()` sets `focusCopy`, and `handleCloseAutoFocus` then only parks focus on the root.
- `EventPopover.test.ts` "\"Duplicate\" closes the popover, duplicates the event and parks focus on the view root" passes with `settle()` (a `setTimeout` tick). Waiting one more `requestAnimationFrame` makes it fail: `document.activeElement` is the original `Standup` block, not the root.
- Same result on bits-ui 2.19.5 and 2.20.0, so it predates the bits-ui bump (`3b272292`). Found while adapting the Calendar tests to 2.20.0, which unmounts closed content a frame later.

## To find out

- Which code moves focus to the original block after the close: bits-ui's FocusScope restore, or a Calendar effect tied to `selectedEventPath`.
- Whether the user-visible flow is affected: in the real flow `duplicateEventFromUi` focuses the copy once it renders, which may win anyway.

## Acceptance

- A test that waits for the animation frame asserts focus on the root (or on the copy, once rendered), and passes.
