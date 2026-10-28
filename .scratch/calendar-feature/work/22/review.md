VERDICT: CHANGES_REQUESTED

# 22 review: read-only week/day time grid, all-day lane, now-line, color tokens

Reviewed `git diff main...HEAD` (e97fcc9b, d33f1b1c, 1cbe52c3) against the Issue, plan Task 21, D22/D23 and CLAUDE.md.

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings (199 files).
- `pnpm vitest run src/tests/lib/features/event-calendar/`: 13 files, 446 tests passed.
- The test verdict rests on `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts`, `src/tests/lib/features/event-calendar/event-color-tokens.test.ts` and `src/tests/lib/features/event-calendar/EventCalendarView.test.ts`, plus a reading of the `e2e/specs/event-calendar.spec.ts` diff. I did not run the E2E (deliver runs the gate) and did not take its result from the build report.
- Chromium probes (Playwright from the worktree's node_modules, scratchpad HTML only, no source change):
  - Sticky probe: the grid's structure with a scroller 400 px wide, `scrollLeft = 200`. The header corner and the time axis stay at the scroller's left edge (left = 8). The all-day lane corner moves to left = -192, so it scrolls away. With `overflow: clip` on the lane it stays at 8.
  - Contrast probe: the real `color-mix` values, computed by Chromium for the four presets. Token pairs: Default 6.66-6.79, Sakura 6.71-7.21, Lavender 6.17-6.69, Twilight 5.87-5.94, which matches the commit's claim. Text drawn at `opacity-80` on the block (time and snippet lines): Default 4.90-4.99, Sakura 4.21-4.52, Lavender 3.97-4.28, Twilight 4.35-4.40. A pending block (`opacity-80` over `--editor-bg`): title 4.12-4.38 and time 2.92-3.09 on Sakura.

## Acceptance criteria

- [x] One scroller, sticky header block (day headers + lane), sticky time axis, `min-width: calc(var(--axis) + <days> * 96px)`, `$effect` that scrolls the selected day into view when `scrollWidth > clientWidth`. Met in `EventTimeGrid.svelte:64-78,87,43-60`; the scroll math matches prototype `time-grid.tsx:177-192`. One gap: the lane's axis cell does not stick sideways (finding 1). The effect is untested (finding 5).
- [x] Hour lines and labels 1..23 at `HOUR_HEIGHT`, 12h drops `:00`, always 24 rows, `$derived(layoutDay(...))` columns as `role="group"` with `"<formatLong> schedule"`, mount scroll to `dayStartHour * HOUR_HEIGHT`, `{#key view}`. Evidence: `EventTimeGrid.svelte:24,31,34-36,39-41,80,99-104`, `EventCalendarView.svelte:72-77`; tests "draws 23 hour labels", "drops :00", "scrolls to dayStartHour", "labels day columns".
- [x] `EventDayHeaders`: select, then open day view on the second click; `aria-pressed`; the ", selected, open day view" suffix. `EventDayHeaders.svelte:13-17,28-29`; two tests cover it.
- [x] `EventBlock`: role, tabindex, `data-event-path` / `data-pending` / `data-readonly`, aria-label, `eventColorStyle`, title/time/snippet line, `line-clamp`, `@container` + `@max-[84px]:` title-only wrap-anywhere variant. `EventBlock.svelte:35-97`. The narrow variant is untested (finding 5). The secondary-line contrast misses D22 (finding 2).
- [x] `EventAllDayLane`: `role="group"` cells labelled "All-day events", chips from `buildAllDayChips` as buttons with `data-event-path`, capped at 3 rows, "+N" opens day view, a chip click opens the note. `EventAllDayLane.svelte:24-69`; tests "renders an all-day chip" and "caps the lane at 3 rows".
- [x] Now-line only in today's column, `aria-hidden`, top from `nowOffsetMinutes`. `EventTimeGrid.svelte:98,113-123`; now-line tests (640px for 10:00). The clock ticks through the existing `acquireCalendarClock`.
- [x] 12 tokens in one `:root` block after `.dark`, `color-mix(in oklab, <hue> 25%, var(--editor-bg))` / `30%, var(--editor-fg)`, hues as specified, values recorded in the commit. `src/app.css:284-305`. The pairs reach at least 4.5:1 (reviewer probe above).
- [x] `EventTimeGrid.test.ts` covers every listed case (17 tests, run green).
- [x] `event-color-tokens.test.ts` asserts declared once, color-mix of the editor variables, outside `.dark` (15 tests, run green).
- [x] E2E: timed and all-day render with title and time; Sakura applied inline, light bg and contrast at least 4.5:1; 900 px sideways scroll with headers on top. `event-calendar.spec.ts:116-168`. Not run by me.
- [x] Separate DST `test.describe` (2026-10-25 Europe/Berlin) asserts `top` is `640px`. `event-calendar.spec.ts:170-180`.
- [ ] Gate green: not run here (deliver step). Commit format: met (Context, Problem, Solution, Behavior, Files with line ranges, Co-Authored-By).

Layer rules: only `core/editor` and `core/settings` are imported from `features/`, which is allowed. No logic file was added, and no store or `.logic.ts` is mocked. `openFileInEditor` handles its own errors with a toast (`editor.service.ts`), so the bare `onclick` calls do not leak rejections. No scope creep: no drag, popover or create.

## Findings

1. **Medium**: `src/lib/features/event-calendar/EventAllDayLane.svelte:35`. `overflow-hidden` on the lane row makes it a scroll container, so the `sticky left-0` "All day" corner at `:36` sticks to the lane, not to the grid scroller. When a narrow pane scrolls sideways (the D23 case the slice ports), the corner scrolls off (probe: left -192 against 8 for the header corner and the axis), and lane chips of off-screen days show in the gutter above the sticky time axis. The prototype has the same bug (`all-day-row.tsx:39`); the port should not copy it. **Fix:** use `overflow-clip` (probe confirms it keeps the corner at the scroller edge) or drop the overflow on the row. In the 900 px E2E test, assert after the sideways scroll that the lane's "All day" cell keeps its left edge at the grid's left edge.

2. **Medium**: `src/lib/features/event-calendar/EventBlock.svelte:87,89` (and `:72`). The time line and the snippet line render at `opacity-80`, which drops their effective contrast on Sakura to 4.21 (cyan), 4.25 (green), 4.32 (orange), 4.44 (blue) and 4.46 (pink). That is below the 4.5:1 that D22 and the Issue require on Sakura, for 11 px text. Lavender Haze drops to 3.97. The prototype draws these lines without opacity (`time-grid.tsx:576-577`, `t-12 salt`). The E2E contrast test reads only the block's own `color`, so it cannot catch this. **Fix:** remove `opacity-80` from `[data-event-time]` / `[data-event-snippet]` and the compact start time, or raise M until the 80% lines also clear 4.5:1 on both presets. Make the E2E measure `[data-event-time]` with its opacity composited over the block background, not only the block's `color`.

3. **Minor**: `src/lib/features/event-calendar/EventBlock.svelte:58`. A pending block is drawn at `opacity-80` over the grid, which lowers its title to 4.12-4.38:1 and its time to about 2.9-3.1:1 on Sakura. The state is short-lived and not in the prototype, but it is the state a user sees right after every calendar write (tickets 24-30). **Fix:** mark pending without dimming the text, for example with a dashed outline or a `data-pending` style that leaves `color` and `background` alone, or dim only the background.

4. **Minor**: `src/lib/features/event-calendar/EventTimeGrid.svelte:75-78`. The prototype's mask under the sticky header was not ported (`time-grid.tsx:403-407`). Plan Task 21 points at `:385-420`, which includes it. After the mount scroll to `dayStartHour * HOUR_HEIGHT`, the hour line sits exactly on the header's bottom edge, and that hour's label (`top: h * 64 - 7`) is half hidden under the header, so every open shows a clipped "08:00". **Fix:** port the mask: an `aria-hidden` `absolute inset-x-0 top-full h-2` strip with a `bg-editor-bg` hairline cover and a `sticky left-0 w-(--axis) h-2 bg-editor-bg` cell.

5. **Minor (test gap)**: `src/lib/features/event-calendar/EventTimeGrid.svelte:44-60` and `src/lib/features/event-calendar/EventBlock.svelte:92`. No test at any level exercises two D23 behaviours: scrolling the selected day into view, and the title-only variant under 84 px. jsdom cannot run them. In the 900 px E2E the focused Tuesday is already in view, so the effect never scrolls, and blocks are about 91 px wide, above the 84 px threshold. **Fix:** add E2E cases at 900 px: (a) a selected day at the end of the week (for example a Saturday `clockTime` in its own describe) opens with `scrollLeft > 0` and that day's header in the viewport; (b) two overlapping seeded events in one column show `[data-event-narrow-title]` and hide `[data-event-time]`.

6. **Nit**: `src/lib/features/event-calendar/EventBlock.svelte:42`. `z-index: 10 + column` passes the now-line (`z-20`) from 11 overlap columns and the sticky axis (`z-30`) from 21, so blocks would paint over the axis when scrolled sideways. This is unlikely in practice. **Fix:** clamp, for example `10 + Math.min(column, 9)`.
