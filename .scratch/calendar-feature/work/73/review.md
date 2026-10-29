VERDICT: CHANGES_REQUESTED

# 73 review: Discard a live Calendar gesture when focus leaves the calendar

Reviewed `git diff main...HEAD` (0c25cfd7..1d3cdcfc) in the worktree. The source change is correct and small. One acceptance criterion has no test evidence for the time grid.

## What I ran

- `pnpm check`: 0 errors, 0 warnings (211 files).
- `pnpm vitest run src/tests/lib/features/event-calendar/`: 24 files, 968/968 passed.
- Fail-before probe: I restored `EventTimeGrid.svelte` and `event-calendar-day-drag.svelte.ts` from `main`, then ran `EventTimeGrid.test.ts`, `EventMonthGrid.test.ts` and `EventAllDayLane.test.ts`. 4 tests failed: the 2 time-grid discard tests, the month-grid discard test and the all-day-lane discard test. The 3 "focus within the root" tests passed. The build report says 5 discard tests failed, but the diff only has 4. I then restored the branch's source; `git status` was clean.
- Time-grid write probe: a temporary test file, now deleted. It mocked `moveEvent` / `resizeEvent` in `event-calendar.service` and used the real stores and component. It moved a block 1 column and about 110 px, and in another case resized it by its `[data-resize]` handle. Focus then went to an `<input>` outside the root, and the pointer was released and clicked. Result: 0 writes, `gestureLive` false, no popover, no dialog. A control run without the focus change wrote once. The behavior is right, but no committed test covers it (finding 1).

My test verdict rests on these files:
- `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts` (new describe at lines 542-620)
- `src/tests/lib/features/event-calendar/EventMonthGrid.test.ts` (742-786)
- `src/tests/lib/features/event-calendar/EventAllDayLane.test.ts` (202-237)
- the rest of `src/tests/lib/features/event-calendar/` as regression
- the probe above

## Acceptance criteria

- [x] **A test that moves focus outside the calendar root mid-gesture fails today.** Met. The 4 discard tests fail against main's source (probe above). The failures come from the live flag staying true, Escape being swallowed, and a dialog or popover opening on release.
- [ ] **After the fix the gesture is discarded, nothing is written, `gestureLive` is false, and the release opens no dialog or popover.** Partly met. Code: `EventTimeGrid.svelte:139-142` calls `discardGesture()` (`endGesture` clears `gestureLive` and removes both listeners, `clearPreview`, `swallowClick`, pointer capture released). `event-calendar-day-drag.svelte.ts:199-203` calls `#discard(true)` (`#endGesture`, preview cleared, swallow armed on the release). DayDrag tests assert no write (`moveEventToDay` not called, chip still in its source cell), `gestureLive` false and no popover. In the time grid, the tests assert `gestureLive` false, no create dialog, and no popover after a plain press on a block. No time-grid test moves or resizes a block before the focus change and checks that nothing is written. See finding 1.
- [ ] **Covered for the time grid and for `DayDrag` (month grid and all-day lane).** Partly met. Month grid and all-day lane are covered in full. The time grid covers create and a plain press, but no moved drag or resize (finding 1).
- [x] **Focus moving within the calendar root (e.g. to a block) does not discard the gesture.** Met. `EventTimeGrid.test.ts:605` focuses a block, then a button inside the root, and the release still opens the create dialog. `EventMonthGrid.test.ts:769` and `EventAllDayLane.test.ts:222` show the drop still writes `moveEventToDay(..., '2026-11-12')`. All 3 pass before and after the change.

## Correctness checks (no finding)

- **The press's own focus change does not discard.** The listener is added inside `pointerdown`, before the compatibility `mousedown` moves focus. That focus always lands inside the root: a block or chip has `tabindex="0"`, and the root `<section>` has `tabindex="-1"` (`EventCalendarView.svelte:228-234`), so every grid element has a focusable ancestor inside it. Clicking a non-focusable spot with no such ancestor clears focus without a `focusin`.
- **EventPopover stays inside the root.** `Popover.Content` has no `Popover.Portal` (`EventPopover.svelte:154-167`), so its DOM is inside the root. `handleCloseAutoFocus` sends focus to the block or the root, except for an outside target the press itself chose. A gesture that starts or continues with the popover open is not discarded.
- **The real overlays move focus outside the root.** The command palette and the quick switcher are `Command.Dialog` (`CommandPalette.svelte:37`, `QuickSwitcher.svelte:57`), which goes through the portaled `dialog-content.svelte`, and their input takes focus. That focus change fires `focusin` with a target outside the root.
- **The overlay gets the first Escape.** Discarding removes the capture `keydown` listener on both paths, so the overlay's Escape is not swallowed (`EventTimeGrid.test.ts:574`, `EventMonthGrid.test.ts:742`).
- **The click after release is swallowed.** Time grid: `swallowClick` is set in `discardGesture`. DayDrag: `#releaseAfterDiscard` arms it on the release. A release click that lands outside the area (on the overlay) is disarmed by `#clickOutside`. Issue 74 (the time-grid swallow persisting) is untouched and out of scope.
- **No listener leaks.** Both `endGesture` paths remove `focusin`. Unmount goes through `onMount`'s cleanup (`endGesture`) and through `DayDrag.reset`.
- **Scope.** The diff touches only the two controllers and their 3 test files. EventPopover.svelte is not touched (issue 75). There is no E2E spec, which is acceptable: the unit tests drive the real components and stores.
- **CLAUDE.md rules.** Tabs and JSDoc on the new handlers are in place, and no stores or `.logic.ts` files are mocked. Layer rules hold: event-calendar is a feature. Window blur (Cmd+Tab) not discarding the gesture is a documented, out-of-scope limit.

## Findings

1. **Minor (blocks the AC evidence): no time-grid test proves that a moved or resized block writes nothing when focus leaves.** `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts:589-603`
   - "discards a press on a block" never moves the pointer. Its release would open a popover, not write. Discovery's own test plan said "Press a block, drag, focus outside -> release writes nothing", and the AC asks for "nothing is written" for the time grid.
   - The probe shows the behavior is right today. Without a test, a later change to `discardGesture` / `handlePointerUp` could commit a drop after the focus left, and nothing would catch it.
   - **Fix:** in the "focus leaving the calendar mid-gesture" describe, add a test that does:
     1. Press a block.
     2. Send a `pointermove` past the threshold to another slot (pass `clientX` / `clientY`; `mountSized()` already stubs the rect).
     3. Focus `outside` and release.
     4. Assert that `moveEvent` / `resizeEvent` were not called, the block is still in its source column, `gestureLive` is false and `popover` is null.
   - Mock only `moveEvent` / `resizeEvent` via a partial `vi.mock('$lib/features/event-calendar/event-calendar.service', ...)` (a side-effect service, allowed by docs/TESTING.md), or assert through the view test's `invoke` mock.
   - Covering a `[data-resize]` grab too (`it.each(['move', 'resize'])`) closes the resize case at almost no cost.
