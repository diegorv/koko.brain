# 22 discovery: read-only week/day time grid, all-day lane, now-line, color tokens

## Files that change
- New: `src/lib/features/event-calendar/EventTimeGrid.svelte`, `EventDayHeaders.svelte`, `EventBlock.svelte`, `EventAllDayLane.svelte`.
- `EventCalendarView.svelte:69-71`: the placeholder becomes `{#key view}<EventTimeGrid days={visibleDays} />{/key}` for week/day; month keeps `data-calendar-grid-placeholder` until ticket 23.
- `src/app.css:282` (after `.dark`): a `:root` block with the 12 `--event-*` tokens.
- Tests: new `EventTimeGrid.test.ts`, `event-color-tokens.test.ts`; `EventCalendarView.test.ts:178-185` (placeholder test now asserts the grid in week, placeholder in month); `e2e/specs/event-calendar.spec.ts`.

## Plan
1. Color tokens + text test (own commit).
2. Grid components + view wiring + mount test + e2e (one feat commit, the ticket asks for one).
- Inputs: `eventCalendarStore.events`, `eventCalendarViewStore.{focusedDate,nowMs,todayKey}`, `settingsStore.eventCalendar.{timeFormat,dayStartHour}`. Logic reused as-is: `groupEventsByDay`, `layoutDay`, `buildAllDayChips`, `nowOffsetMinutes`, `formatTime`, `formatTimeRange`, `formatLong`, `eventColorStyle`, `minutesToPx`, `HOUR_HEIGHT`, `MIN_COLUMN_PX`. No new logic file.
- `--axis: 56px` on the scroller; columns container `min-width: calc(var(--axis) + <n> * 96px)`.
- Block / chip click and Enter/Space call `openFileInEditor(path)` (same as Needs attention); "+N" and a click on the selected day header call `setDate(day)` + `setView('day')`.
- Now-line `top` is exactly `minutesToPx(nowOffsetMinutes(nowMs, day))` (the dot is centred with a transform), so the E2E reads `640px`.
- Block: height `minutesToPx(end-start) - 2` (min 14); under 44 px one truncated row; else title (`line-clamp-2` from 60 px), time, and the snippet's first line from 56 px. `@container` + `@max-[84px]:` swaps to a title-only, wrap-anywhere `line-clamp-(--lines)` paragraph.
- Sticky parts use `bg-editor-bg` (the tab sits on `bg-editor-bg`, `EditorView.svelte:50`), so the tokens mix with the surface they sit on.

## Color values (tuned offline in oklab, sRGB WCAG contrast)
- bg `color-mix(in oklab, <hue> 25%, var(--editor-bg))`, fg `color-mix(in oklab, <hue> 30%, var(--editor-fg))`.
- Min contrast: KokoBrain Default 6.64 (green/cyan), Sakura 6.75 (cyan); also Lavender Haze 6.21, Twilight Violet 5.88.

## Prior art
- `EventCalendarView.test.ts` setup (ResizeObserver stub, real stores, `invoke` mock, `eventEntry`).
- Prototype `time-grid.tsx:47-94, 177-192, 385-500, 502-591`, `all-day-row.tsx`.

## Risks / defaults
- jsdom reports `scrollWidth == clientWidth == 0`, so the selected-day scroll effect is a no-op in units; E2E covers the sideways scroll.
- jsdom may drop `calc(var(...))` from `style`; the test reads `getAttribute('style')`.
- Lane chips are not width-split per day count: the lane has `laneRows(max)` rows of 28 px.
- No drag, popover or create in this slice (tickets 26-30).
