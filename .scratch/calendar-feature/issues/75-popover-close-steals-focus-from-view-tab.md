# 75: Closing the event popover by clicking a header view tab pulls focus off the tab

**What to build:** with the event popover open, clicking an unselected Calendar header tab (e.g. "M" for Month) leaves focus on that tab, as it did before issue 67.

**Blocked by:** None

**Status:** ready-for-agent

- Regression from 699269c2 (issue 67 review fix), found by its post-merge review.
- `EventPopover.svelte:106`: `ownWrapper` is `getAttribute('tabindex') === '-1' && root.contains(...)` on whatever `closest(FOCUSABLE)` returns. Unselected view tabs are `<button role="tab" tabindex={selected ? 0 : -1}>` (`EventCalendarHeader.svelte:107-114`), so a click on one counts as an "own wrapper" and focus is sent back to the event block or the root. The view switch can then unmount that block, leaving focus on `<body>`.
- Any roving-tabindex control inside the view hits the same path.
- Suggested fix: count a match as a wrapper only when it is not natively focusable, e.g. add `&& !f.matches('button, a[href], input, select, textarea, [contenteditable="true"]')`.

- [ ] A test that opens the popover, clicks an unselected header tab and expects focus on that tab fails today
- [ ] After the fix it passes, and the existing tests (click on the Calendar's own empty tabindex="-1" surface returns focus to the block; an outside pane's tabindex="-1" surface keeps focus) still pass

## Comments

- 2026-10-28 21:43 — discovery — plan in work/75/discovery.md: exclude natively focusable matches from ownWrapper — 0c25cfd7
