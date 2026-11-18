# 28: The Days mini month works narrow and by screen reader

**Origin:** design review 2026-11-17, proposals P32 (part), P131 (part), P132 (part) and P20 (weekend part), prototypes `.scratch/design-review/prototypes/calendar-tasks.html` (sections `P32`, `P131`, `P132`) and `.scratch/design-review/prototypes/color-contrast-theming.html` (section `P20`), research `.scratch/ux-quick-wins/research/verdict-calendar-tasks.md`, `verdict-color.md` and `breakdown.md` (old ticket 44).

**What to build:**

1. **Narrow layout.** `@container` on the navigator body (`src/lib/plugins/calendar/CalendarNavigator.svelte:94`, none today). Below about 190 px: one-letter weekday headers, the week-number column hidden, a short month label ("Nov 2026"), chevrons `shrink-0`. `buildMonthGrid` (`calendar.logic.ts:58-103`) exposes `shortLabel` beside `label` (and the grid's header labels carry a one-letter form). `data-calendar-month-label` wraps only the full label: Playwright `toHaveText` reads hidden text too, so a dual-rendered label inside it would break `calendar-plugin.spec.ts:25,28-41` and `rail-shell.spec.ts:975-1000`. The short form is a sibling, shown only when the full one is hidden, so a screen reader meets exactly one.
2. **Day semantics.** Each day button gets a full-date name with its note count: "Tuesday, November 10, 2026, 2 notes", "1 note", nothing for none (a pure `dayAriaLabel(dateKey, count)` in `calendar.logic.ts`, so the plugin does not import event-calendar code). `aria-current="date"` on today, `aria-pressed` on the picked day. Week buttons get `aria-label` "Open weekly note, week N" and keep their `title` (the tests find them by `title^="Open weekly note"`, `CalendarGrid.test.ts:46,73`).
3. **Today as a fill.** Today is a soft fill with a bold number instead of `ring-1` (`CalendarGrid.svelte:59`), with a class token other than the exact `bg-file-explorer-primary` that "selected" uses (for example `bg-file-explorer-primary/15`): the unit helper `selectedKeys` and `rail-shell.spec.ts:1000` read that exact token as "picked day". A picked day that is also today shows the picked style.
4. **Weekly note failures toast.** `openWeeklyNote` (`CalendarNavigator.svelte:80-82`) only `console.error`s; it toasts "Could not open the weekly note", as `openPeriodicEntry` does at `:68-73`.
5. **Today button.** A named "Today" button beside the four chevrons, calling the existing `goToToday` (`:62-66`: current month and `railDay: null`, so the pick follows the clock). Keep Previous and Next year (E2E uses "Next year") and both month chevrons. The month label becomes plain text, not a button. Under 190 px the row may wrap; the by-eye check decides.
6. **Weekend marks.** Weekend headers and weekend day numbers use `text-file-explorer-muted-fg` (`CalendarGrid.svelte:46,58`) instead of the accent. Weekend headers then look like weekday headers; weekend day numbers stay distinct, muted against the normal text colour. See 28.1.

Not in this ticket: roving tabindex and arrow keys in the grid; a per-navigator pixel `minWidth` (pane and layout code); the header band at `CalendarNavigator.svelte:86-92` (`bg-tab-bar`, `pl-[var(--rail-header-pad)]`), which shell-sidebars-ux 34 edits; the month grid of the Calendar tab (tickets 24 to 26).

**Size:** M (a container-query layout, a11y names, the today style, week buttons, a toast, a new Today button, weekend colours, E2E edits). Split point: item 1 (narrow layout and the label split, with its test and E2E pins) first; items 2 to 6 (semantics, today fill, toast, Today button, weekend colours) second.

**Blocked by:** 26

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh calendar-plugin.spec.ts` and `bash scripts/e2e.sh rail-shell.spec.ts`

- [ ] Failing test first, `CalendarNavigator.test.ts`: a week-number click whose `openOrCreatePeriodicNoteForDate` rejects calls `toast.error('Could not open the weekly note')`.
- [ ] `calendar.logic.test.ts`: `buildMonthGrid(...)` exposes `shortLabel` ("Nov 2026") beside `label`; `dayAriaLabel` gives weekday, full date and "2 notes" for 2, "1 note" for 1 and no count for 0.
- [ ] `CalendarGrid.test.ts`: today has `aria-current="date"` and no `ring-1`; the picked day has `aria-pressed="true"` and the exact `bg-file-explorer-primary` class; today's fill uses another class token. The helpers `todayCellKeys` and `selectedKeys` (`CalendarNavigator.test.ts:44-50`) move on purpose.
- [ ] A named Today button returns to today's month and clears `railDay` after a month step; Previous year, Next year and both month buttons stay. The test at `CalendarNavigator.test.ts:207` ("the month label goes to today") is rewritten to click the button, and `[data-calendar-month-label]` holds only the full label and is not a button.
- [ ] Weekend headers and weekend days carry `text-file-explorer-muted-fg` and never `text-file-explorer-primary`; `CalendarGrid.test.ts:61,69,71,72` move on purpose (no header is accent; `2026-11-01` is not accent). The header label helpers (`CalendarNavigator.test.ts:41,114,119`, `CalendarGrid.test.ts:22`) read the full-label element.
- [ ] `calendar-plugin.spec.ts:25` and `:36-40` pass with only "the month label goes back to today" (`:30-41`) rewritten to the Today button; `rail-shell.spec.ts:975-1000` passes unchanged.
- [ ] Tests use the real `calendarStore` and `settingsStore`; only `periodic-notes` service and `svelte-sonner` are mocked. By-eye check at 140, 163, 200 and 260 px is recorded in the commit (jsdom has no container queries).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P32 (part).** Panes have no real minimum width, and the Calendar navigator renders broken at about 163 px. Quick part: a container-aware grid and header.
- **P131 (part).** The rail periodic-notes list: silent weekly errors and a hidden "Go to today". Quick part: the toast and an explicit Today button. The prototype's header drops the previous and next year buttons; this ticket does not.
- **P132 (part).** The rail mini month has no grid semantics. Quick part: names, `aria-current`, `aria-pressed`, today as a fill.
- **P20 (weekend part).** One accent colour does seven jobs: weekend headers and days use the primary accent. Weekends move to muted text.

## Problem

At about 163 px the weekday letters, week column, month label and five buttons do not fit and the header breaks. A screen reader hears bare day numbers, today is marked by a ring that doubles as the focus ring, a failed weekly note opens nothing and says nothing, and the only way back to today is to know the month label is a button.

## Evidence

Checked at `085b23c5d`.

- `CalendarGrid.svelte:22-38` (week buttons, `title` only at `:33`), `:42-51` (header cells, weekend accent at `:46`), `:53-76` (day buttons: weekend at `:58`, `ring-1` today at `:59`, no `aria-*`).
- `CalendarNavigator.svelte:62-66` (`goToToday`), `:80-82` (`openWeeklyNote`), `:94` (body, no `@container`), `:96-137` (four chevrons and the month label button `data-calendar-month-label` at `:117`).
- `calendar.logic.ts:32-49,98-103`: `MonthGrid` and `label` (`MMMM YYYY`).
- `CalendarNavigator.test.ts:44-50` (`todayCellKeys` filters `ring-1`; `selectedKeys` filters the exact selected token), `:207`; `CalendarGrid.test.ts:58-72`.
- `e2e/specs/calendar-plugin.spec.ts:25,28-41`; `e2e/specs/rail-shell.spec.ts:975-1000` (the selected-day regex at `:1000`).
- `src/app.css:162,174` and `:223,235`: `--ring` equals `--primary`, which is why today must not be a ring.

## Why blocked

- Ticket 26 edits `e2e/specs/calendar-plugin.spec.ts` (`:66`, the title comma) and this ticket edits the same file (`:25,28-41`). Ticket 26 also defers the month grid's today mark (ring or fill) to the owner, with the soft fill recommended to match the one this ticket gives the mini month.

## Sequence with

Shell-sidebars-ux 34 (`pane-band`, ready-for-agent) edits `CalendarNavigator.svelte:88` (the header band): this ticket stays out of `:86-92`, so it is a rebase only. Shell-sidebars-ux 29 (the Days rename) is resolved.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): 28.1 (old 44.1) weekend headers in the mini month stop being highlighted (P20); default: accept, weekend day numbers stay distinct.
