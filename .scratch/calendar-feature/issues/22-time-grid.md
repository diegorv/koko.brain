# 22: Read-only week/day time grid, all-day lane, now-line and theme-following colors

**What to build:** the Calendar tab's week and day views render a read-only time grid: one scroller for both axes with sticky day headers and all-day lane at the top and a sticky time axis at the left, per-day columns laid out with overlap columns, event blocks showing title, time and the snippet's first line, an all-day lane capped at 3 rows, and a now-line in today's column that stays correct on DST days. The prototype's narrow-pane behaviour is ported (96 px minimum columns with sideways scroll, the selected day scrolled into view, a title-only block under 84 px; D23). Event colors come from 12 `--event-*` tokens in `src/app.css` that mix six hues with the active theme's `--editor-bg` / `--editor-fg`, so they follow every preset, light ones included, with at least 4.5:1 contrast on KokoBrain Default and Sakura (D22). In this slice a click on a block or a lane chip opens the note; the popover arrives in ticket 26.

**Plan reference:** Task 21 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 488-525). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** 21

**Status:** ready-for-agent

**Touches:**
- `src/lib/features/event-calendar/EventTimeGrid.svelte` (new)
- `src/lib/features/event-calendar/EventDayHeaders.svelte` (new)
- `src/lib/features/event-calendar/EventBlock.svelte` (new)
- `src/lib/features/event-calendar/EventAllDayLane.svelte` (new)
- `src/lib/features/event-calendar/EventCalendarView.svelte` (modify)
- `src/app.css` (modify)
- `src/tests/lib/features/event-calendar/EventTimeGrid.test.ts` (new)
- `src/tests/lib/features/event-calendar/event-color-tokens.test.ts` (new)
- `e2e/specs/event-calendar.spec.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/event-calendar.spec.ts`

- [ ] `EventTimeGrid.svelte` (ported from prototype `time-grid.tsx:385-420`) uses one scroller for both axes, with a sticky header block (`EventDayHeaders` plus the all-day lane) and a sticky time axis; the columns container has `min-width: calc(var(--axis) + <days> * 96px)` (`MIN_COLUMN_PX`), so the week scrolls sideways and columns stay equal-width (so `slotFromPoint` still works), and a `$effect` scrolls the selected day into view when `scrollWidth > clientWidth`
- [ ] Axis and hour lines 1..23 sit at `HOUR_HEIGHT` with labels from `formatTime` and the `timeFormat` setting (12h labels drop `:00`, "9 AM"); the grid always has 24 rows, also on a 23 h or 25 h DST day; each day column is a component `$derived(layoutDay(...))` rendered as `role="group"` with `aria-label="<formatLong(day)> schedule"`; on mount the grid scrolls to `dayStartHour * HOUR_HEIGHT` and it is remounted with `{#key view}`
- [ ] `EventDayHeaders.svelte`: a click selects the day and a click on the already selected day opens day view; each header button carries `aria-pressed` for the selected day and an `aria-label` that adds ", selected, open day view"
- [ ] `EventBlock.svelte` has `role="button"`, `tabindex="0"`, `data-event-path`, `data-pending` (from the merged event) and `data-readonly`, an `aria-label` of "title, time range, first line of the snippet", and an inline `style` from `eventColorStyle`; it shows title and time, plus the snippet's first line as a third line when the height allows, with CSS `line-clamp` instead of `two-line-title.tsx`, and a title-only, wrap-anywhere variant under 84 px through a Tailwind 4 container query (`@container`, `@max-[84px]:`)
- [ ] `EventAllDayLane.svelte` renders per-day cells as `role="group"` with `aria-label="All-day events"`, chips from `buildAllDayChips` capped at 3 rows as buttons with `data-event-path`, and a "+N" that opens day view; a block or lane-chip click opens the note
- [ ] The now-line shows only in today's column, is `aria-hidden`, and is positioned by `nowOffsetMinutes`
- [ ] `src/app.css` declares the 12 variables `--event-{green,purple,cyan,orange,pink,blue}-{bg,fg}` once, in a `:root` block after `.dark`, each as `color-mix(in oklab, <hue> N%, var(--editor-bg))` (bg) or `color-mix(in oklab, <hue> M%, var(--editor-fg))` (fg) with the hues `#10b981`, `#8b5cf6`, `#06b6d4`, `#f97316`, `#ec4899` and `#3b82f6`; N and M are tuned until every pair reaches at least 4.5:1 on KokoBrain Default and on Sakura, and the values are recorded in the commit
- [ ] `EventTimeGrid.test.ts` (mount) passes: seeded titles render in the right day column with their time text and snippet line; the 7-day container has the 96 px min-width style; an all-day chip renders in the lane as a button with `data-event-path`; day columns and lane cells carry `role="group"` with the labels above and the selected day header has `aria-pressed="true"`; the now-line exists only when today is visible; a read-only block carries `data-readonly`
- [ ] `event-color-tokens.test.ts` reads `src/app.css` as text and asserts the 12 tokens are declared once, as `color-mix` of `var(--editor-bg)` / `var(--editor-fg)`, and outside `.dark`
- [ ] `e2e/specs/event-calendar.spec.ts` (fixed clock from ticket 21) asserts: seeded timed and all-day event notes for the week of 2026-11-09 render with title and time; with Sakura's `--editor-bg` / `--editor-fg` applied inline as `applyTheme` does, `getComputedStyle` gives a light block background and a contrast of at least 4.5:1; at a 900 px viewport with both sidebars open the grid scrolls sideways and the day headers stay visible while scrolling vertically
- [ ] A separate `test.describe` with `test.use({ clockTime: '2026-10-25T10:00:00+01:00', timezoneId: 'Europe/Berlin' })` (the fall-back day) asserts the now-line's `top` is `640px` (600 minutes x 64 px / 60), not the prototype's 704 px
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 13:37 — discovery — plan in work/22/discovery.md: color tokens (25% / 30% oklab mixes, min contrast 6.64) then grid components + view wiring + tests in one feat commit — pending
