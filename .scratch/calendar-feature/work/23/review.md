VERDICT: APPROVED

# 23 review: month view

Reviewed `git diff main...HEAD` (0fe4b371, 4ac46fb3, da18ee43) against the Issue, plan Task 22 (`plan-2026-10-28.md:526-537`), the prototype `calender-app-design/src/components/calendar/month-view.tsx` and CLAUDE.md.

## Checks I ran (worktree, HEAD da18ee43)

- `pnpm check`: 0 errors, 0 warnings (200 files).
- `vitest run src/tests/lib/features/event-calendar/`: 14 files, 499/499 passed. The test verdict rests on `EventMonthGrid.test.ts` (new), `EventCalendarView.test.ts` (changed), `event-calendar-view.logic.test.ts` (changed, covers the generic `itemsForDay`), and the rest of the folder as the tests of the code the diff touches.
- `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`: 10/10 passed, the new `Event calendar month view` test included.
- Full gate not run (deliver owns it).

## Acceptance criteria

- [x] **Cells from `buildMonthCells`; headers follow `weekStartsOn`; out-of-month dimmed; today from the clock.** `EventMonthGrid.svelte:10-12` reads `eventCalendarViewStore.monthCells` (the getter calls `buildMonthCells`) and derives headers from the first row (`cells.slice(0, cols)`). `:54` gives out-of-month cells `bg-muted/40` and `:68` a muted day number. `:48` compares against `todayKey` (from `nowMs`). Tests: `EventMonthGrid.test.ts:72-112` (Monday-first, Sunday-first, `data-in-month`, today follows `setNow`).
- [x] **Up to `MONTH_MAX_CHIPS` chips from `itemsForDay`, plus "+N more" that opens day view.** `EventMonthGrid.svelte:45,77,90-100`. Tests: `:138-160` (3 chips, `+2 more`, opens day view on that date; no button at 3).
- [x] **Cell click sets the date; a day-number click on the selected day opens day view.** `handleCellClick` (`:30-32`, target check as at `month-view.tsx:78-81`) and `handleDayClick` (`:24-27`, as at `:93-97`). Bubbling from the day button, chips and "+N more" is filtered by the `target === currentTarget` check, which matches the prototype's `stopPropagation`. Tests: `:192-216`.
- [x] **Chips are buttons with `data-event-path` and `data-pending`.** `:77-89`, dashed border while pending as on `EventBlock.svelte:60`. Tests: `:115-128` (tagName BUTTON, path), `:171-189` (`putPending` turns on `data-pending` and `border-dashed`).
- [x] **Mobile dot branch dropped (D17).** No dot markup, no `isMobile` branch. The mobile tap shortcut is gone too.
- [x] **`EventMonthGrid.test.ts` covers chip text, the "+N more" count and the weekend filter, and passes.** Chip text `:115-136` (24h and 12h), count `:138-152`, weekend filter `:91-100` (30 cells, 5 headers, a Saturday event not rendered). Passes (run above).
- [x] **E2E switches to Month and asserts the chip is visible.** `e2e/specs/event-calendar.spec.ts:234-249`: clicks the Month tab, checks the Standup chip is visible with text `09:00 Standup`, the all-day Holiday chip, and `data-today` on 2026-11-10. Passes.
- [ ] **Gate green; one commit in the full format.** One feat commit (4ac46fb3) with Context, Problem, Solution, Behavior and Files with line ranges; the line ranges match the diff. The gate is pending deliver.

## Scope

- `itemsForDay` / `DayItem` in `event-calendar-view.logic.ts` became generic (`<T extends EventNote>`). This file is not in the Touches list, but the change is needed so `pending` reaches the chip without a cast, it is type-only, the default type parameter leaves existing callers unchanged, and it has its own test (`event-calendar-view.logic.test.ts:328-333`). Accepted.
- Not ported (stated in discovery and the commit): holidays, double-click create (ticket 29), `opacity-60` on out-of-month chips. Leaving the chips at full opacity keeps their contrast and still meets "out-of-month cells are dimmed".
- Layer rules: the component imports only `core/` stores/services and its own feature files. No new state, service or error path.

## Findings

1. **Low (performance)**, `EventMonthGrid.svelte:45`. `itemsForDay(events, cell.day, timeFormat)` runs once per cell. Each call filters and sorts the whole vault's event list (42 x N), where the prototype built one `byDay` map per change (`month-view.tsx:38-49`). `monthCells` returns new cell objects on every read, so every `setDate` (a cell click, a step) also recomputes all 42 cells. This is cheap at current vault sizes and does not block. Fix (optional): build one `$derived` day-to-items map in a single pass over `events` (or call `itemsForDay` once on events already narrowed to the visible range) and look cells up in it.
2. **Low (test gap)**, `EventMonthGrid.test.ts:72-112, 192-199`. Dimming and the today highlight are checked only through `data-in-month` and `data-today`. The class branches at `EventMonthGrid.svelte:54,62-68` (`bg-muted/40`, `text-muted-foreground`, and `text-primary` on a today that is not selected) are not asserted, so a broken branch still passes. Also missing: a cell-body click on the day that is already selected should stay in month view, unlike a click on the day number. Fix: put a non-selected today in a test (`setDate` to another day) and assert `text-primary`; assert `bg-muted/40` on an out-of-month cell; click `cell(focusedDate)` and expect `view === 'month'`.
3. **Nit (UX, same as the prototype)**, `EventMonthGrid.svelte:43,52`. Rows are `minmax(0, 1fr)` and cells are `overflow-hidden`. In a short pane the "+N more" button can be clipped, and then the hidden events cannot be reached from month view. The discovery records this risk. No change needed now; revisit if it gets reported.
