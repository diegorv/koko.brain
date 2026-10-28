VERDICT: CHANGES_REQUESTED

# Review: Issue 59, drag in the month view and the all-day lane

Scope: `git diff main...HEAD` on `issue/calendar-feature-59-month-and-all-day-drag` (a78425ca..b3b06ddb).

## Checks run by the reviewer

- `pnpm check`: 205 files, 0 errors, 0 warnings.
- `vitest run src/tests/lib/features/event-calendar`: 19 files, 759/759 passed.
- The test verdict rests on these files: `src/tests/lib/features/event-calendar/event-calendar-drag.logic.test.ts`, `event-calendar.service.test.ts` (`moveEventToDay` block, :1024), `EventMonthGrid.test.ts` (drag suite, :315), `EventAllDayLane.test.ts` (new), plus the rest of the event-calendar suite for regressions (`EventTimeGrid.test.ts` included, since the lane markup changed).
- Probe (temporary test, deleted, not committed): drag a lane chip, release with no click on the cells (as when the release lands outside `[data-all-day-cells]`), then `click()` another chip with no pointerdown (keyboard activation). The popover did not open, because the click was swallowed. This confirms finding 1.
- E2E `e2e/specs/event-calendar-day-drag.spec.ts` was read, not run (per the process rules, the orchestrator runs it on main).

## Acceptance criteria

- [x] **Drag to another day in month view and in the all-day lane moves the event, with undo**: met.
  - Write: `moveEventToDay` (`event-calendar.service.ts:527`) patches `date` only through `updateEventFields` with label `Move event`. Undo goes through `patchBetween`, which diffs and writes only `date`, so `start`/`end`/`all_day` survive both ways.
  - Wiring: `DayDrag` in `EventMonthGrid.svelte:19,73` and `EventAllDayLane.svelte:27,62`.
  - Tests: service tests cover a timed and an all-day move plus undo. The component suites cover the move, the threshold click, a same-day drop, Escape, a month step mid-drag, unmount mid-drag and a failed write. The E2E covers a month move with Meta+Z and a lane move with Meta+Z.
- [x] **Read-only events (multi-day, ticket 41) do not drag**: met.
  - Guards: `data-readonly` on chips (`EventMonthGrid.svelte:119`, `EventAllDayLane.svelte:82`), the guard in `DayDrag.pointerdown` (`event-calendar-day-drag.svelte.ts:47-50`), `resolveDayDrag` returning `none` (`event-calendar-drag.logic.ts:301`), and the service's `read-only` refusal (`event-calendar.service.ts:418`).
  - Tests: each layer has one (logic, service "refuses a span before writing", both component suites, and a span test per surface in the E2E).
- [x] **Logic tests and an E2E per surface**: met. The tests in `event-calendar-drag.logic.test.ts` cover `cellFromPoint`, `begin/updateDayDrag`, `resolveDayDrag` and `previewDayMove`. The E2E spec has a month describe and an all-day lane describe (not executed in this review).

## Other review points

- Layer rules: the pure functions stay in `.logic.ts` (no framework imports). The controller (`.svelte.ts`) calls the service and the view store. There is one precedent for a non-store `.svelte.ts` (`core/settings/settings-persistence.svelte.ts`).
- The decision not to use pointer capture, so that a plain press still opens the popover through the chip's own `onclick`, is sound and tested.
- Scope: no creep. `EventDayHeaders.svelte`, the shortcut table and `e2e/specs/event-calendar.spec.ts` are untouched.
- Commits follow docs/COMMITS.md.

## Findings

1. **Medium: the click swallow stays armed after a drop whose click never reaches the cells, and it eats the next keyboard activation.** `src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:119` (and `:101` for discard). `#swallowClick` is armed at pointerup and disarmed only by `clickcapture` on the area (`:61-65`) or by the next `pointerdown` inside the area (`:44`). Without pointer capture, the browser sends the click to the common ancestor of the press and release targets. When the release lands outside `[data-all-day-cells]` / `[data-month-cells]`, that click never passes through the area's capture listener. The release still drops, because `cellFromPoint` clamps to the nearest cell. Releasing a lane drag a little below the 40 px lane, into the time grid, is an easy way to get there. After that, the next Enter or Space on a chip, a day-number button or the "+N more" button inside the area is silently swallowed (confirmed by the probe above). The time grid does not have this problem, because pointer capture routes its click to `bodyEl`.
   - **Fix:** in `clickcapture`, swallow only pointer-generated clicks (`if (!this.#swallowClick || e.detail === 0) return;`). Every pointer click inside the area starts with a `pointerdown` there, and that resets the flag. Another option is to disarm the flag on a window capture `click` listener or with a `setTimeout(0)` after pointerup, keeping it armed after Escape until the release. The existing tests that call `.click()` after a drop would then dispatch `new MouseEvent('click', { bubbles: true, detail: 1 })`.
   - **Test to add:** the probe as a regression test in `EventAllDayLane.test.ts` (or `EventMonthGrid.test.ts`): drop with no click, then a `detail: 0` click on another chip opens its popover.
2. **Low: the gesture key shield copies the open Issue 62 defect into two more surfaces.** `src/lib/features/event-calendar/event-calendar-day-drag.svelte.ts:137-142`. A `window` capture listener calls `stopPropagation()` on every non-modifier key while a gesture is live, plain presses on a chip included. That blocks Cmd+S, Cmd+P, Cmd+W and the Calendar toggle, exactly as `.scratch/calendar-feature/issues/62-gesture-keydown-blocks-app-shortcuts.md` describes for `EventTimeGrid.svelte`. Parity with the time grid is the right call for this Issue. Issue 62 still names only the time grid, so its fix would leave the month grid and the lane broken.
   - **Fix:** add a line to Issue 62 naming `event-calendar-day-drag.svelte.ts` (`#keydown`) and the month grid test `EventMonthGrid.test.ts:428`, which asserts that a document listener does not see keys mid-drag. Issue 62's fix and its test should then cover both controllers. No source change is needed here.
3. **Low: some controller behavior the build report claims has no test.** The tests are `EventMonthGrid.test.ts:315` and later, and `EventAllDayLane.test.ts`.
   - Not covered: `pointercancel` discarding the gesture with no write (`event-calendar-day-drag.svelte.ts:127-129`), and an open popover closing on the first move past the threshold (`:109`).
   - Also not covered: the click after an Escape-discarded drag being swallowed (`:101`).
   - **Fix:** add three short cases to `EventMonthGrid.test.ts`:
     - `pointercancel` mid-drag: the chip goes back and `moveEventToDay` is not called.
     - With the popover open on the chip, a move past 4 px sets `eventCalendarViewStore.popover` to `null`.
     - Escape, then release, then a click on the chip: the popover stays closed.
4. **Nit: the module header of `event-calendar-drag.logic.ts` is stale after the edit.** `src/lib/features/event-calendar/event-calendar-drag.logic.ts:1-8`. The wrap breaks mid-sentence (`A` / `desktop-only` / `port of ...`). The text still says that the whole module is a port of `time-grid.tsx` and that it "maps a point to a slot". The day-cell functions are not a port and map a point to a cell.
   - **Fix:** rewrap the paragraph and say that the time-grid part is the port and that the day-cell part maps a point to a cell.
5. **Nit: `cellFromPoint` clamps a row and column index with `clampMinutes`.** `src/lib/features/event-calendar/event-calendar-drag.logic.ts:273`. It works, but the name suggests a minutes value.
   - **Fix:** clamp with `Math.min(Math.max(...))`, or with a small local `clampIndex`. Optional.
6. **Nit, no change required: in the month grid, a chip dragged into a full cell can vanish behind "+N more" mid-drag.** `src/lib/features/event-calendar/EventMonthGrid.svelte:110`. The preview re-dates the event and `itemsForDay` sorts it, so a timed chip dropped onto a cell that already has 3 all-day chips renders past `MONTH_MAX_CHIPS`. The only feedback is the count. The drop itself is correct. Mention this as a follow-up if the fixer agrees; it is not needed for this Issue.

## Resolution

1. Fixed. `DayDrag.clickcapture` swallows only pointer clicks (`e.detail === 0` passes through), so a keyboard Enter or Space after a drop whose click landed outside the area still acts. Regression test in `EventAllDayLane.test.ts` (fails without the fix). The drop tests that expect the swallow now dispatch a `detail: 1` click.
2. Accepted with no source change: Issue 62 now names `DayDrag.#keydown` and the month grid Escape test, so its fix covers both controllers.
3. Fixed. `EventMonthGrid.test.ts` covers pointercancel mid-drag, the popover closing past the threshold and the click after an Escape-discarded drag.
4. Fixed. The module header is rewrapped and separates the time-grid port (point to slot) from the day-cell part (point to cell).
5. Fixed. `cellFromPoint` clamps with a local `clampIndex`.
6. Not changed, as the reviewer allows: the drop is correct, the hidden chip mid-drag in a full cell is cosmetic. Left as a possible follow-up.
