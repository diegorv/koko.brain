VERDICT: CHANGES_REQUESTED

# 75 review: closing the event popover by clicking a header view tab pulls focus off the tab

Reviewed `git diff main...HEAD` (8f8ec6e6, 22478edf, 31bdd2e4) in the worktree.

## What I ran

- `./node_modules/.bin/vitest run src/tests/lib/features/event-calendar/`: 24/24 files, 962/962 tests pass on HEAD.
- `pnpm check`: 211 files, 0 errors, 0 warnings.
- Red probe: with main's `EventPopover.svelte` swapped in (then restored with `git checkout HEAD --`), the new
  test in `EventPopover.test.ts` fails (focus lands on the Standup block); 23 other tests pass.
- Integration probe (temporary file, deleted afterwards, worktree clean): mounted the full `EventCalendarView`
  with the real `EventCalendarHeader`, opened the Standup popover, slow-clicked the real "Month" and "Day" tabs.
  On HEAD focus stays on the clicked tab, its `tabIndex` becomes 0 and the view switches. On main both cases end
  with focus on `<body>`, the exact failure the Issue describes. A slow click on the tablist gap
  (`div[role=tablist][tabindex=-1]`) still returns focus to the block on HEAD.

Test verdict rests on: `src/tests/lib/features/event-calendar/EventPopover.test.ts`, the whole
`src/tests/lib/features/event-calendar/` directory (incl. `EventCalendarView.test.ts`), and the integration probe above.

## Acceptance criteria

- [x] A test that opens the popover, clicks an unselected header tab and expects focus on that tab fails today:
  met with a caveat. `EventPopover.test.ts:327-340` fails on main (red probe above), but it clicks a
  hand-made `<button role="tab">` appended to the root, not a header tab. See finding 1.
- [x] After the fix it passes, and the existing tests still pass: met. The new test passes; "returns focus to the
  block ... after a click on empty space in the view" (`EventPopover.test.ts:313-325`) and "leaves focus on a
  tabindex=-1 surface outside the view" (`:342-355`) pass, as does the rest of the event-calendar suite.

## Correctness

- `EventPopover.svelte:109-112`: `closest(FOCUSABLE)` returns the tab button itself (nearest match), so the
  tablist wrapper is never consulted for a tab click; the root and the tablist `div` (no native match) still
  count as own wrappers. Confirmed by both probes.
- `FOCUSABLE` built from `NATIVE_FOCUSABLE` (`:31-34`) is the same selector set as before, so outside-click
  matching is unchanged.
- No other `tabindex="-1"` native control lives inside the view root: `EventColorSwatches` is rendered by
  `EventForm` (dialog) and `EventCalendarSection`, and no disabled native control with `tabindex="-1"` sits in
  the view (a disabled match would now take a no-op `focus()` instead of the block fallback; not reachable today).
- Layer rules, error handling, performance guidelines: not affected (one component, no IPC, no stores written).
- Comments and JSDoc are accurate; tabs used; commit 22478edf follows docs/COMMITS.md and its line ranges match.
- No scope creep.

## Findings

1. Medium, `src/tests/lib/features/event-calendar/EventPopover.test.ts:327-340` (test fidelity). The regression
   test uses a stand-in `<button role="tab">` appended directly to the root, so it never clicks a real header
   tab (AC 1 wording), never models the tablist `div[tabindex=-1]` wrapper around it, and never reaches the
   failure mode the Issue reports (the view switch unmounting the block and leaving focus on `<body>`). The
   integration probe shows the real-header case is cheap to test and fails on main. Fix: add a case to the
   `EventCalendarView: popover` describe in `src/tests/lib/features/event-calendar/EventCalendarView.test.ts`
   (after the "drops an open popover on unmount" case, ~line 620): open the Standup popover, slow-click the real
   `[role="tab"][aria-label="Month"]` (pointerdown at (-1,-1), `focus()`, wait 30 ms past the bits-ui dismiss,
   `click()`), then expect `eventCalendarViewStore.popover` null, view `month`, `document.activeElement` to be
   that tab and its `tabIndex` 0. Optionally a second case slow-clicking the tablist `div` itself that expects
   focus back on the Standup block, which guards the other side of `ownWrapper`. Keep the unit test as is.

## Resolution

1. Accepted. Added two cases to the `EventCalendarView: popover` describe in
   `src/tests/lib/features/event-calendar/EventCalendarView.test.ts` (621-660): a slow click on the real
   header `[role="tab"][aria-label="Month"]` closes the popover, switches to month and leaves focus on that tab
   with `tabIndex` 0; a slow click on the tablist `div` closes the popover, keeps week and returns focus to the
   Standup block. Red probe: with main's `EventPopover.svelte` the tab case fails (focus on `<body>`); on the
   branch the file passes 65/65. The unit test in `EventPopover.test.ts` stays as is.
