# 26: Calendar month grid reads at a glance

**Origin:** design review 2026-11-17, proposals P64 (part), P183 (part) and P130, prototype `.scratch/design-review/prototypes/calendar-tasks.html` (sections `P64`, `P183`, `P130`), research `.scratch/ux-quick-wins/research/verdict-calendar-tasks.md` and `breakdown.md` (old ticket 41).

**What to build:**

1. **Chip slots from the measured row height.** Month cells size their chip slots from the measured height of a row, with the "+N more" footer reserved; unmeasured keeps today's 3. A pure `monthChipCapacity(rowHeightPx)` in `src/lib/features/event-calendar/event-calendar-tasks.logic.ts` returns `{ all, withFooter }` from the cell's real parts (padding `p-1.5`, the `h-6` day row, `gap-1`, 22 px chips `EventMonthGrid.svelte:125`, the footer `py-1 text-xs` at `:142-151`): 125 px gives `{ 3, 2 }`, 40 px gives at least 1. `monthCellSlots` (`:92-96`) takes the capacity as an optional third argument and falls back to `MONTH_MAX_CHIPS` without it. `EventMonthGrid.svelte` binds the height of its cells element (`cellsEl`, `:21,75`, six `minmax(0, 1fr)` rows, so content cannot change the measured height) and divides by 6.
2. **`focusViewFor` stays as it is** (`src/lib/features/event-calendar/event-calendar-view.logic.ts:242-254`, it cannot know the measured height). It gets a comment that when the measured capacity is smaller than `MONTH_MAX_CHIPS`, "Show in calendar" still lands on the month and the `[data-month-more]` focus fallback (`EventCalendarView.svelte:160-182`) focuses "+N more".
3. **Title without the comma.** `rangeLabel` (`event-calendar-view.logic.ts:165`) gives "November 2026" for month, week and day. The only UI reader is `EventCalendarHeader.svelte:38`.
4. **Out-of-month cells.** Drop `bg-muted/40` (`EventMonthGrid.svelte:94`); the day numbers keep `text-muted-foreground` (`:111`).
5. **Daily-note button, quieter.** `EventDailyNoteButton.svelte` shows on hover of its cell or header, on focus and always on today, with a `calendar-plus` glyph and the shared Tooltip in place of the native `title`. Hide it with `opacity-0`, never `invisible` or `hidden`: `e2e/specs/event-calendar-daily-note.spec.ts:20-36` clicks it in a non-today header and cell, and opacity keeps it a Tab stop. The bits-ui Tooltip throws without a `Tooltip.Provider` (`tooltip.svelte.js:192` reads the provider context), and the grids are mounted bare in six test sites, so `EventMonthGrid` and `EventDayHeaders` each own one provider (nesting under `EventCalendarView.svelte:237` is fine). `aria-label` and `data-daily-note` stay. The Day lens header action keeps its `NotebookPen` glyph (`calendar-rail.service.ts:40`); the mismatch is accepted.
6. **Doc.** `help/documentation/27-calendar.md:31` describes the glyph and the reveal rule.

Not in this ticket: the permanent today mark in the month grid (a primary ring equals the focus ring, `--ring` and `--primary` share a value at `src/app.css:162,174` and `:223,235`; deferred owner pick, recommended: the soft fill and bold number that ticket 28 gives the Days mini month); 5-row months; "+N" in the day row.

**Size:** M (nine source files, three existing E2E specs plus a new case, a doc, a new Tooltip pattern across two grids). Split point: items 1 to 4 (layout, title, cell fill) first; items 5 and 6 (daily-note button, Tooltip providers, doc) second.

**Blocked by:** 24, 25

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh event-calendar.spec.ts`, `bash scripts/e2e.sh event-calendar-focus.spec.ts`, `bash scripts/e2e.sh calendar-plugin.spec.ts` and `bash scripts/e2e.sh event-calendar-daily-note.spec.ts`

- [ ] Failing test first, `event-calendar-tasks.logic.test.ts`: `monthCellSlots` with capacity `{ all: 3, withFooter: 2 }` and 4 items shows 2 and hides 2; 3 items shows 3 and hides 0; no capacity with 5 items shows 3 and hides 2 (the existing cases at `:100-115` stay green). `monthChipCapacity(125)` is `{ 3, 2 }`; `monthChipCapacity(40)` gives at least 1 and never 0 or negative.
- [ ] `EventMonthGrid.test.ts`: with the cells element's `clientHeight` stubbed to 750 (125 per row), a day with 4 events shows 2 chips and "+2 more".
- [ ] New E2E case in `e2e/specs/event-calendar.spec.ts` at the default viewport (seed with the `seedEvents` helper at `:78-84`): a day with 5 events has its `[data-month-more]` bottom at or above its `[data-month-cell]` bottom (jsdom cannot prove the clip is gone).
- [ ] `focusViewFor` is unchanged; `event-calendar-view.logic.test.ts:434` and `:675` stay green.
- [ ] `rangeLabel(...).title` is `November 2026` for month, week and day. Pins updated on purpose: `event-calendar-view.logic.test.ts:164-232`, `event-calendar-view.store.test.ts:119-133`, `EventCalendarView.test.ts:117`, `e2e/specs/event-calendar.spec.ts:110`, `e2e/specs/event-calendar-focus.spec.ts:34` and `e2e/specs/calendar-plugin.spec.ts:66`.
- [ ] Out-of-month cells have no `bg-muted/40`, their numbers keep `text-muted-foreground`; `EventMonthGrid.test.ts:101-109` changes on purpose.
- [ ] A non-today daily-note button has `opacity-0` plus hover and `focus-visible` reveal classes, today's does not; `aria-label` and `data-daily-note` are kept and no `title` remains. The six bare-mount sites (`EventMonthGrid.test.ts:62`, `EventTimeGrid.test.ts:62,811`, `EventPopover.test.ts:65`, `EventDialog.test.ts:87`, `event-calendar-gestures.characterization.test.ts:89`) and `event-calendar-daily-note.spec.ts` pass unchanged.
- [ ] Tests use the real stores; nothing mocks `event-calendar-*.logic.ts`. Hover visuals and the light and dark look are checked by eye.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P64.** Month cells clip the "+N more" button on busy days: a cell holds 142 px of content in 125 px. Size the slots from the measured height. Validation: quick part only (the capacity); `focusViewFor` must be left alone and say why.
- **P183.** Today versus selected, and out-of-month cells, in the month grid. Quick part: the title comma and the out-of-month fill. The today ring waits for the owner (it equals the focus ring).
- **P130.** The daily-note icon repeats in every cell and header. Show it on hover, focus and today.

## Problem

On a busy day the "+N more" button is clipped by the 125 px cell, so the person cannot reach the rest of the day from the month. Every cell and header carries a permanent notebook icon, and the title reads "November, 2026".

## Evidence

Checked at `085b23c5d`.

- `EventMonthGrid.svelte:90-97` (cell `p-1.5 overflow-hidden`, `bg-muted/40` at `:94`), `:125` (22 px chips), `:140` (task chips), `:142-151` (footer); 12 + 24 + 3 x 26 + 28 = 142 px against a 125 px cell. `monthCellSlots` at `event-calendar-tasks.logic.ts:92-96`; `MONTH_MAX_CHIPS = 3` at `event-calendar-view.logic.ts:43`.
- `event-calendar-view.logic.ts:165` (`title` with the comma) and `:253` (`focusViewFor`); `EventCalendarView.svelte:160-182` (the `[data-month-more]` fallback).
- `EventDailyNoteButton.svelte:30,32`: `opacity-60` and a native `title`; used by `EventMonthGrid.svelte:120` and `EventDayHeaders.svelte:47` only.
- `EventCalendarView.svelte:12,237`: the existing `Tooltip.Provider`.
- Pins: `event-calendar-view.logic.test.ts:164-232`, `event-calendar-view.store.test.ts:119-133`, `EventCalendarView.test.ts:117`, three E2E title assertions, `EventMonthGrid.test.ts:101-109`.

## Why blocked

- Ticket 24 edits `EventMonthGrid.svelte` (the read-only chip name and lock), `EventMonthGrid.test.ts` and `help/documentation/27-calendar.md`; this ticket edits the same files.
- Ticket 25 edits `event-calendar-tasks.logic.ts` and its test, `event-calendar-view.logic.ts` and doc 27, which this ticket edits too.

## Sequence with

Ticket 28 edits `e2e/specs/calendar-plugin.spec.ts` on other lines (`:25,28-41`; this ticket touches `:66`) and is blocked by this ticket. Shell-sidebars-ux 05 edits `e2e/specs/event-calendar-focus.spec.ts:73`; this ticket edits `:34`: rebase only. Open-itens 065 (Collection calendar, not these files) and 006 (archived overlay) do not overlap.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): this ticket had no owner question in the old breakdown; the deferred today-mark decision (ring or fill) is not blocking.
