VERDICT: CHANGES_REQUESTED

# 67 review: Calendar focus and accessibility polish

Reviewed `git diff main...HEAD` (28854aa1..ad0ef6c3) in the worktree.

## Checks run by the reviewer

- `pnpm check`: 211 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: 24 files, 957/957 passed.
- The test verdict rests on these files: `EventPopover.test.ts`, `event-calendar.service.test.ts`,
  `EventTimeGrid.test.ts`, `event-calendar-view.logic.test.ts`, `EventMonthGrid.test.ts`,
  `EventAllDayLane.test.ts` (all under `src/tests/lib/features/event-calendar/`).
- Red check: with main's `EventPopover.svelte`, `event-calendar.service.ts` and
  `event-calendar-day-drag.svelte.ts` swapped in, the 7 new component/service tests fail (restored after).
- Probe A (temporary test, deleted): popover open, slow click on a `tabindex="-1"` surface outside the
  Calendar root. Passes on main, fails on this branch (finding 1).
- Probe B (temporary test, deleted): drag, `pointercancel`, a stray `pointerup` with no click, then a
  `detail: 1` click on a chip. The popover does not open (finding 2).

## Acceptance criteria

- [ ] **Ticket 26: `FOCUSABLE` must not let a `tabindex="-1"` wrapper take focus after an outside click.**
  Met for this view's root (`EventPopover.svelte:32`, test `EventPopover.test.ts:313`), but the
  selector also skips every other `tabindex="-1"` surface the user clicks, so it regresses focus
  outside the Calendar. Not met as shipped. See finding 1.
- [x] **Ticket 29: the delete toast Undo focuses the issuing view, not the first root in the DOM.**
  `liveRoot` (`event-calendar.service.ts:1272`) is used by the delete Undo (`:1310`) and by the
  undo/redo toast's reverse action (`:1399`), which had the same defect. Tests
  `event-calendar.service.test.ts:2449` and `:2665` use two connected roots, and both fail on main.
  The remount fallback tests still pass.
- [x] **Ticket 41: a span segment block's aria-label reads the full event range.**
  `eventRangeLabel` (`event-calendar-view.logic.ts:350`) and `EventBlock.svelte:41-43` (label from
  `whole` when the segment is a span). `EventTimeGrid.svelte:68,330` passes the unclipped store event.
  The visible time text stays clipped. Tests: `event-calendar-view.logic.test.ts:299-309` and
  `EventTimeGrid.test.ts:107`, which checks all three segments' labels and the middle segment's
  `00:00 – 24:00` text.
- [x] **Ticket 59: an AT click (`detail >= 1`, no press) is not eaten after a drop outside the area
  or after Escape/pointercancel.** `#arm` / `#disarm` / `#clickOutside`
  (`event-calendar-day-drag.svelte.ts:129-145`), with arming at release (`:162`, `:120`). Tests
  `EventMonthGrid.test.ts:640-683` and `EventAllDayLane.test.ts:124` all fail on main. The
  pointercancel path still leaves a listener that can arm later (finding 2, Low).
- [x] **Ticket 59: reword the "next press in the area resets the flag" comment.** The JSDoc at
  `event-calendar-day-drag.svelte.ts:32-35, 61-65, 104-109, 121-126` now describes release-bound
  arming and disarming on any press. One sentence is inaccurate (finding 2).

Layer rules: all changes stay in `features/event-calendar` and the logic file has no framework
imports. Every changed source file has its test file changed (EventBlock is covered through
`EventTimeGrid.test.ts`). Scope: the undo/redo toast fix is the same expression as the named defect,
so it is in scope.

## Findings

1. **Medium: `src/lib/features/event-calendar/EventPopover.svelte:32` (`:103`).**
   `[tabindex]:not([tabindex="-1"])` is global, so it also skips `tabindex="-1"` surfaces outside this
   Calendar: the Kanban board root (`plugins/kanban/KanbanView.svelte:459`), a second Calendar view's
   root (`EventCalendarView.svelte:230`), and the `role="link"` pills in
   `features/type-definitions/TypeNoteList.svelte:601`.
   Scenario: a popover is open in one pane and the user clicks empty board space in another pane.
   The browser focuses that surface. `handleCloseAutoFocus` then finds no match and sends focus back
   to the Calendar block in the first pane, and a Backspace or Delete there deletes that event
   (`resolveCalendarKey` reads `focusedEventPath`). Probe A confirms this: it passes on main and fails
   here.
   The new test (`EventPopover.test.ts:313`) codifies the regression, because its wrapper is a div
   appended to `<body>`, outside the Calendar root, and the test expects focus to come back to the
   block.
   **Fix:** restore the old selector. A `closest(FOCUSABLE)` match should fall through to the block
   only when it carries `tabindex="-1"` and sits inside `root` (the root itself or the header
   tablist wrapper). Change the test so it slow-clicks non-focusable space inside `root` (for example
   a day column) and expects the block. Add a test where an outside `tabindex="-1"` surface the user
   clicked keeps focus (probe A).

2. **Low: `src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:110-120` (`#discard`, reached from `#pointercancel` at `:173`).**
   On `pointercancel`, `#discard` still registers the window `pointerup` listener
   `#releaseAfterDiscard`. No `pointerup` follows a cancel, so the listener waits for the next
   unrelated `pointerup` anywhere and arms the swallow then. If that release produces no click, or the
   click lands inside the area, the next `detail: 1` click on a chip is eaten. That is the same AT-click
   defect ticket 59 describes (probe B confirms it). A press inside the area clears it first. The
   JSDoc at `:104-109` says "a cancelled pointer sends no `pointerup`, so nothing is armed", which is
   not what the code does.
   **Fix:** register `#releaseAfterDiscard` only for the Escape discard, for example with
   `#discard(armOnRelease: boolean)`, `true` from `#keydown` and `false` from `#pointercancel`. Add
   probe B as a test in `EventMonthGrid.test.ts`.

3. **Info (out of scope, no change requested): `src/lib/features/event-calendar/EventTimeGrid.svelte:114,236-240`.**
   The time grid's own `swallowClick` is armed by `discardGesture` on `pointercancel` with no click
   to follow. `handleClickCapture` has no `detail === 0` exemption, and only a press in the grid
   resets the flag. This is the same class of bug as ticket 59, and wider, because a keyboard
   `click()` would also be eaten. The Issue names only the day drag. File a follow-up Issue.
