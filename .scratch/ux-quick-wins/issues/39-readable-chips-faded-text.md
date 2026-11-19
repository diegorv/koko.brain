# 39: Readable text on coloured fills: kanban tag chips, linear-calendar bars, the rail badge

**Origin:** design review 2026-11-17, proposal P19 (part; P25 moved to Issue 52), prototype `.scratch/design-review/prototypes/color-contrast-theming.html`, research `.scratch/ux-quick-wins/research/verdict-color.md` (Q1 and Q5) and `breakdown.md` (old tickets 26 and 40, merged here by the owner on 2026-11-18).

**What to build:**

1. **Kanban tag chips.** Chip text (board and table) becomes `color-mix(in oklab, <preset rgb> 30%, var(--editor-fg))` (70% toward the editor foreground; 60% leaves 4.00:1 on Lavender Haze, 65% leaves 4.46) from a new `COLOR_PRESET_CHIP_TEXT` map in `src/lib/utils/color-presets.ts`. Used at `src/lib/plugins/kanban/KanbanCardText.svelte:38,76` and `KanbanTableView.svelte:60`. The chip background and the swatches (`KanbanCard.svelte:244`, `KanbanCardText.svelte:55`) keep `COLOR_PRESET_BG` / `COLOR_PRESET_TEXT`; `board.settings.tagColors` keys are untouched. Display only, no write.
2. **Linear-calendar bars.** `text-white` goes from the bar button (`src/lib/features/collection/CollectionLinearCalendarView.svelte:199`) and its `style` gains `color: barTextColor(getBarColor(event.colorValue))`. `barTextColor` already exists (`linear-calendar.logic.ts:302-306`) and the inline block already uses it (`collection-block-widget.ts:380`).
3. **Rail badge.** A pure `railBadgeTextColor(color)` in `src/lib/features/rail-shell/rail-items.logic.ts` returns `#000000` or `#ffffff` by contrast with the item colour, and `var(--primary-foreground)` for a value it cannot parse. `Rail.svelte:396` drops `text-white` and sets the colour from it. Only Inbox passes a count (`:169`; `:182,:195` pass 0), so Inbox becomes black on blue (5.71 against 3.68 for white).

Not in this ticket: the note list chips, archived rows and search snippet (Issue 52, which waits on shell-sidebars-ux 15 and 19); QueryJS and collection chips (`evaluator.ts:447-462`, the CodeMirror block widget); moving kanban tag colours onto `tag-colors.ts` (it changes the `tagColors` keys in the `.kanban` file); the selected-row subtitle and chips, `--faint-fg` and property value alphas (new tokens, shell-sidebars-ux 04, 10, 11); the shared state-token and destructive-label passes (P85, P26, P27 are deferred).

**Size:** S.

**Blocked by:** 12

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [ ] Failing test first, `src/tests/lib/utils/color-presets.test.ts` (real `contrastRatio`, `flatten`, `mixColors` from `utils/color.ts`): for every tag preset on both built-in themes, chip text against the flattened real stack is at least 4.5:1. The stack is the tag tint at 15% over (a) `--background` (an uncoloured card) and (b) each card preset at 15% over `muted` at 30% over `editorBg` (a coloured card on its lane). It fails today (yellow on Lavender Haze 1.57) and would also fail at a 60% share (4.00), which proves the stack is the real one.
- [ ] `railBadgeTextColor('#3b82f6')` is `#000000`, a dark navy gives `#ffffff`, an unparseable value gives `var(--primary-foreground)`. `Rail.test.ts:451-457` moves on purpose: the pill has no `text-white` and its colour is black.
- [ ] A linear-calendar render test (new `src/tests/lib/features/collection/CollectionLinearCalendarView.svelte.test.ts`): a bar's `style` has `color: #000000` for a light `COLOR_PALETTE` hue and `var(--primary-foreground)` for the `var(--primary)` fallback.
- [ ] `KanbanView.test.ts`: a `#tag` chip's `style` contains `color-mix` and `--editor-fg`; the colour swatches still use the full preset.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass. jsdom was not checked for `color-mix` in inline styles: the tests read the `style` attribute. The by-eye check on both themes is recorded in the commit.

## Original proposal

- **P19 (part).** On light themes kanban chips measure 1.7 to 3.1:1 and rail badges fail; the linear calendar forces white text. Proposal: kanban chips derive their text by mixing the preset toward `--editor-fg` with a contrast test, the linear calendar uses `barTextColor`, and the rail badge text picks black or white by contrast. Validation: revise, the rail icon palette stays fixed (ADR-0033); the QueryJS chip half and moving tag colours onto `tag-colors.ts` are not built here.

## Problem

Yellow chip text on a Lavender Haze card measures 1.57:1, the Inbox count is hard to read on blue and calendar bars with light hues carry white text.

## Evidence

Checked at `085b23c5d`.

- `KanbanCardText.svelte:38,76` and `KanbanTableView.svelte:60` set `background: COLOR_PRESET_BG[...]; color: COLOR_PRESET_TEXT[...]`. An uncoloured card is `bg-background` (`KanbanCard.svelte:159` styles the coloured card inline); a coloured card is the 15% preset over the lane, and the lane is `bg-muted/30` (`KanbanLane.svelte:215`).
- `CollectionLinearCalendarView.svelte:198-205`: `text-white` in the class list and no `color` in the `style`. `linear-calendar.logic.ts:302-306` `barTextColor`.
- `Rail.svelte:396`: `text-white` on `var(--rail-c)`; `rail-items.logic.ts:207` `railItemColor`.
- Contrast figures are the verdict's own WCAG arithmetic on the theme hex values of `src/tests/lib/core/settings/__snapshots__/theme-snapshot.test.ts.snap`.

## Why blocked

- 12: it edits `KanbanTableView.svelte` (the card cell now renders through `KanbanCardText` with `hideTags`) and `KanbanListView.svelte`; this ticket edits the chip line of the same two files. Its blockers 05 (`KanbanCardText.svelte`, the tag-colour popover moves out) and 11 are covered through it.

## Sequence with

- shell-sidebars-ux 34 (`Rail.svelte:270` band) and 30 (rail hints, a helper in `rail-items.logic.ts`, needs-info): same files on other lines; rebase, never in parallel.
Ticket 40 runs after this one and shares `src/tests/lib/core/settings/theme-builder.logic.test.ts` (new `BUILTIN_THEMES` cases) and `Rail.svelte` (this ticket the badge at `:396`, 40's darker strip at `:283` by token only). Open-itens 230 (ready) rewrites the same bar `style=` block in `CollectionLinearCalendarView.svelte:198-205`: rebase over whichever lands first. Ticket 05 moves the tag-colour popover out of `KanbanCardText.svelte` and 12 rewrites the table card cell; both land first.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, and the merge of old tickets 26 and 40 into this one. Defaults (not individually answered): none in the old tickets; the 70% chip share is the verdict's measured value, not a question.
- 2026-11-18, split by the owner after the first run blocked: this Issue keeps items 1 to 3 (the old 39a, already built in `issue/39-readable-chips-faded-text`). Items 4 and 5 (note list chips, archived rows, search snippet) and their theme-builder and NoteRow/SearchResult criteria moved to Issue 52, which waits on shell-sidebars-ux 15 and 19.
