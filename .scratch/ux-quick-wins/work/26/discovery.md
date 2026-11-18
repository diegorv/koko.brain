# Issue 26 discovery: Calendar month grid reads at a glance

No `spec.md` in `.scratch/ux-quick-wins/`. Checked at `0bcd5294c` (24 and 25 merged).

## Files that change

- `src/lib/features/event-calendar/event-calendar-tasks.logic.ts:115-125`: add `MonthChipCapacity`, `monthChipCapacity(rowHeightPx)`; `monthCellSlots(eventCount, taskCount, capacity?)`.
- `src/lib/features/event-calendar/EventMonthGrid.svelte:22,76,87,95,121`: `bind:clientHeight` on `cellsEl`, capacity from height / 6 (undefined while 0), drop `bg-muted/40`, `group/day` on the cell, own `Tooltip.Provider`.
- `src/lib/features/event-calendar/event-calendar-view.logic.ts:50,165,229-254`: title without comma, JSDoc; comment on `focusViewFor` (code unchanged).
- `src/lib/features/event-calendar/EventDailyNoteButton.svelte`: `calendar-plus`, `Tooltip.Root/Trigger/Content` in place of `title`; `opacity-0 group-hover/day:opacity-100 focus-visible:opacity-100` unless `day === todayKey`.
- `src/lib/features/event-calendar/EventDayHeaders.svelte:26,47`: `group/day` on the header wrapper, own `Tooltip.Provider`.
- `help/documentation/27-calendar.md:31`.
- Tests: `event-calendar-tasks.logic.test.ts:144-158`, `EventMonthGrid.test.ts:102-110` + new capacity and daily-note cases, `event-calendar-view.logic.test.ts:164-232`, `event-calendar-view.store.test.ts:119-133`, `EventCalendarView.test.ts:117`, `EventTimeGrid.test.ts` (header button classes), E2E `event-calendar.spec.ts:110` + new case, `event-calendar-focus.spec.ts:34`, `calendar-plugin.spec.ts:66`.

## Plan

1. Capacity math (border-box cell): content = row - 12 (`p-1.5`) - 1 (`border-b`) - 24 (`h-6` day row). Each chip costs 26 (`gap-1` + 22). Footer costs 28 (`gap-1` + `py-1` + 16 px `text-xs` line). `all = floor(c / 26)`, `withFooter = floor((c - 28) / 26)`, both clamped to >= 1. 125 -> 88 -> {3, 2}; 40 -> {1, 1}.
2. `monthCellSlots`: total <= `all` shows everything; else events then tasks fill `withFooter`, rest hidden. No capacity = `{ all: MONTH_MAX_CHIPS, withFooter: MONTH_MAX_CHIPS }` (today's behavior, existing cases stay green).
3. Title, cell fill, daily-note button, providers, doc, E2E pins.

## Prior art

- `clientHeight` stub on `Element.prototype`: `EventTimeGrid.test.ts:331`.
- `ResizeObserver` stub (jsdom lacks it; Svelte's `bind:clientHeight` observes through one): `EditorTabs.test.ts:25-31`. Needed in `EventMonthGrid.test.ts` and `EventCalendarView.test.ts`, which mount the month grid.
- Tooltip pattern: `EventCalendarHeader.svelte:45-60`. The Trigger renders the `<button>` itself and merges our `onclick` with its own (`mergeProps`), so no wrapper element: `EventMonthGrid.test.ts:364` (`button.parentElement`) still holds.

## Risks and defaults

- Capacity is not capped at `MONTH_MAX_CHIPS`: a tall window shows more chips. `focusViewFor` still uses 3, so it sends a 4th-or-later event to day view even when month would show it (same as today).
- Unmeasured (height 0, jsdom without a stub, before layout) keeps 3 chips + footer.
- Today's daily-note button is fully visible (was `opacity-60`): "always on today".
- Named group `group/day` so the header button's own `group` (`EventDayHeaders.svelte:29`) is not affected.
- E2E: `seedEvents` gets an optional `files` argument so the new case seeds five events on 2026-11-18 through the same helper.
