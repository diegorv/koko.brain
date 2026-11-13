VERDICT: CHANGES_REQUESTED

# 26 review: read-only event popover and selected-event ring

Reviewed `git diff main...HEAD` (9cfa6601, f7ac87e4, 2fa1a2b5) against Issue 26, plan Task 25 (`plan-2026-10-28.md:585-602`) and CLAUDE.md.

## What I ran
- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/event-calendar/`: 15 files, 517/517 pass. My test verdict rests on `EventPopover.test.ts` (new), `EventTimeGrid.test.ts` and `EventMonthGrid.test.ts` (changed), and `EventCalendarView.test.ts` (unchanged, still green).
- `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts -g popover --retries=0 --workers=1`: 1/1 pass.
- Throwaway probes, deleted afterwards, nothing committed:
  - A temporary Playwright spec built on the spec's own `seedEvents` / `openCalendar` helpers, with an extra timed event `Review.md` on 2026-11-11 10:00-11:00.
  - A temporary vitest file built on `EventPopover.test.ts`'s setup.
  - Results are quoted in the findings.

## Acceptance criteria

| # | Criterion | Status | Evidence |
|---|-----------|--------|----------|
| 1 | bits-ui re-check | met | `pnpm-lock.yaml:1270` is still `bits-ui@2.19.5`, the Task 1 (g) baseline (`plan-2026-10-28.md:1352`). The Pre-flight log is correctly left alone. |
| 2 | `Popover.Root`/`Popover.Content` from `ui/popover`, anchor through `restProps`, Portal only if clipping, `ui/` unedited | met | `EventPopover.svelte:73-84` uses `customAnchor`. No `ui/` file is in the diff stat. Probe: `elementFromPoint` at the card centre lands inside the card (1280x720), so there is no clipping without a Portal. |
| 3 | Controlled by the store, `onOpenAutoFocus` prevented, `side="right" align="start" sideOffset={8}` | met | `EventPopover.svelte:22-24, 73-82`. |
| 4 | `onCloseAutoFocus` prevented, focus to the block or the root, never left on `<body>` | **not met** | Escape works (test "closes on Escape and returns focus"). An outside click leaves focus on `<body>` or takes it away from the control the user clicked. See finding 2. |
| 5 | Closes on scroller scroll, window resize, view/date change, Escape | met | `EventPopover.svelte:36-45, 71`. The store closes on view and date change (`event-calendar-view.store.svelte.ts:84-106`). Tests are in `EventPopover.test.ts` "closing". |
| 6 | Color dot, title, `formatTimeRange` + `formatDuration` / "All day", location, snippet, "Open note" | met | `EventPopover.svelte:86-111`. Test "shows the time range with its duration..." checks `09:00 – 10:30 · 1h 30m`. |
| 7 | Blocks, month chips and lane chips open it; Enter/Space on a block | partially met | The first open works on all three, plus Enter and Space (tests). With a popover already open, a quick click on another event closes the popover and opens nothing. See finding 1. |
| 8 | `ring-2 ring-primary/70` only on the selected event | met, with a defect | `EventBlock.svelte:36,66`, `EventMonthGrid.svelte:21,89`, `EventAllDayLane.svelte:25,50`. Tests check the clicked element and its siblings. The ring and the popover come back for a note that left and re-entered the snapshot. See finding 3. |
| 9 | `EventPopover.test.ts` cases (lane-chip open, ring only on clicked, Escape restores focus to block) | met | All three are present and pass. |
| 10 | E2E: block click shows title, "Open note" opens tab, Calendar tab shows no popover | met | `event-calendar.spec.ts:251-286` passes. |
| 11 | Gate green, one commit in full format | pending | There is one feat commit (f7ac87e4) with Context, Problem, Solution, Behavior and Files. The gate is the deliver step's job. |

## Findings

1. **High**: `src/lib/features/event-calendar/EventPopover.svelte:47-49, 73`. With a popover open, a quick click on another event opens nothing.
   - **Cause:** bits-ui debounces its outside-pointer dismiss by 10 ms after `pointerdown` (`use-dismissable-layer.svelte.js:110, 173`). When `pointerdown` and `click` land within 10 ms, the sequence is: the click handler's `openPopover(B)` replaces the target, then the late dismiss calls `onOpenChange(false)`, then `closePopover()` clears it. Playwright's default click and macOS trackpad tap-to-click both land that fast.
   - **Probe, block to block:** Standup open, then a default `click()` on Review leaves no popover (`titles: []`). With `click({ delay: 80 })` it works.
   - **Probe, block to lane chip:** Standup open, then a click on the Holiday lane chip gives `titles: [], ringed: []`.
   - **Discovery is wrong here:** discovery.md says "first closes, then opens the new target". That holds only for slow clicks.
   - **Fix:** pass `onInteractOutside` to `Popover.Content` and call `e.preventDefault()` when the target is an event element inside `root` (`root.contains(t) && t.closest('[data-event-path]')`). The click handler then just retargets the open popover, with no close and no close-autofocus.
   - **Tests:** add a mount test in `EventPopover.test.ts` that opens Standup, dispatches `pointerdown` and `click` on the Review block back to back, and settles. Expect the card title to be Review and the ring only on Review. Also add a second-event click (default Playwright click) to the E2E test.

2. **High**: `src/lib/features/event-calendar/EventPopover.svelte:55-61`. An outside click either leaves focus on `<body>` or takes it from the clicked control.
   - **Cause:** `handleCloseAutoFocus` always focuses the last block, including when an outside pointer interaction closed the popover. That runs about 10 ms after `pointerdown`, before the `click`.
   - **Probe, header "Next week":** with `click({ delay: 80 })` while the popover is open, `document.activeElement` ends as `BODY`. Focus moved to the Standup block, then the click navigated weeks and unmounted it. This is the exact state the Issue says must not happen.
   - **Probe, button outside the calendar:** clicking it while the popover is open leaves focus on the calendar's Standup block, not on the button the user clicked. A click into another pane's editor would lose focus the same way.
   - **Discovery is wrong again:** discovery.md says "a mouse click on a header button still ends on that button". It does not.
   - **Trap behaviour:** with `trapFocus` on, `mousedown` on the outside control is first pulled into the card. So the fix cannot just skip the redirect; it has to name the new focus target.
   - **Fix:** record the outside target in `onInteractOutside` (see finding 1 for the event-element case). In `handleCloseAutoFocus`, when the close came from that interaction and the target is still connected and focusable (for example `target.closest('button, [tabindex], input, textarea, [contenteditable="true"]')`), focus it. Otherwise keep the block-then-root rule. Escape, "Open note", scroll, resize and store-driven closes keep today's behaviour.
   - **Tests:** a mount test where an outside `<button>` gets `pointerdown` and `click` while the popover is open. Expect `document.activeElement` to be that button. A second test clicks a control that changes the date (or uses `setDate` to a week without the event). Expect `activeElement` not to be `document.body`.

3. **Medium**: `src/lib/features/event-calendar/EventPopover.svelte:22-24`. A vanished event leaves a stale store target, and the popover reopens by itself.
   - **Cause:** when the target note leaves `eventCalendarStore.events`, `open` turns false, but nothing clears `eventCalendarViewStore.popover`. bits-ui does not call `onOpenChange` for a controlled prop change. So `selectedEventPath` stays set.
   - **Effect:** when the note comes back, the card pops open on its own at the old click-time rect, with the ring. This happens, for example, after a frontmatter edit that briefly makes it invalid, an undo, or an external restore.
   - **Probe (vitest):** after the vanish, `popover.path` and `selectedEventPath` are both `/vault/Events/Review.md`. After the event comes back, `reopened: true, ring: true`.
   - **Fix:** clear the target when it no longer resolves, for example `$effect(() => { if (target && !event) eventCalendarViewStore.closePopover(); })`. Focus still goes to the root through `onCloseAutoFocus`.
   - **Test:** extend "focuses the root when the clicked event is gone on close". Assert `eventCalendarViewStore.popover` is null, then re-add the event and assert `popover()` stays null and no element carries the ring.

4. **Low**: `src/lib/features/event-calendar/EventCalendarView.svelte:24-25, 67, 86`. Changed source with no test change (CLAUDE.md Quick Reference 11).
   - `EventCalendarView.test.ts` is untouched. `EventPopover.test.ts` mounts `EventTimeGrid` + `EventPopover` into a synthetic `<div>`, so no unit test covers the real wiring:
     - the `bind:this` root reaching the popover;
     - the scroll listener on the actual `<section>`;
     - the root-focus fallback landing on the `section[tabindex=-1]`;
     - `closeTransient()` on unmount while a popover is open.
   - **Fix:** add a case in `EventCalendarView.test.ts`. Mount the view, click a block, and expect `[data-event-popover]` with the title. Press Escape and expect focus on the block. Unmount while open and expect `eventCalendarViewStore.popover` to be null.

## Scope and rules
- There is no scope creep. The date line and `collisionPadding={12}` are small additions inside the popover.
- Layer rules hold: everything lives in `features/event-calendar/`, and `ui/` is untouched.
- Stores are real in tests. The only mock is `openFileInEditor`, which is allowed.
- Tabs are used throughout.

## Resolution

All four findings accepted and fixed; none rejected.

1. `EventPopover.svelte` passes `onInteractOutside`; a pointerdown on a `[data-event-path]` element inside the root calls `preventDefault()`, so the click retargets the open popover. Mount tests cover block-to-block and block-to-lane-chip quick clicks (pointerdown + click back to back); the E2E test now clicks the Holiday lane chip and then the Standup block with default Playwright clicks.
2. Any other outside target is recorded and, on close, focus goes to its nearest focusable ancestor when it is still connected; otherwise the block-then-root rule holds. Tests: an outside button keeps focus; an outside control that moves the date leaves focus on that control, not on `<body>`.
3. An `$effect` closes the store popover when the target no longer resolves to an event. The "event is gone" test now asserts the store is null and that re-adding the event shows no card and no ring.
4. `EventCalendarView.test.ts` gains a popover block: a block click shows the card and Escape returns focus to the block; a time-grid scroll closes it; a vanished event focuses the `section`; unmounting while open nulls the store popover.

Every new `EventPopover.test.ts` case fails with the source fix reverted and passes with it.
