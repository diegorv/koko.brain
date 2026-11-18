# 15: Filter and Sort panels: visible conjunction and named remove buttons

**Origin:** design review 2026-11-17, proposals P139, P22 (FilterRow and FormulaRow names), prototype `.scratch/design-review/prototypes/collection-queryjs.html`, research `.scratch/ux-quick-wins/research/verdict-collection.md` (ticket T5, conjunction half), `verdict-feedback-a.md` (ticket Q7) and `breakdown.md` (old ticket 24, first half). The keyboard sort order (P140) is ticket 44.

**What to build:** presentation and accessible names only. No write to the `.view` file and no logic change.

1. **Visible conjunction.** The two conjunction triggers (`src/lib/features/collection/toolbar/FilterPanel.svelte:113-115` in the global group and `:175-177` in the view group) take the FilterRow selector classes (`FilterRow.svelte:114-121`: border, `h-7`, `rounded-md`, `px-2`, `hover:bg-accent`; drop the fixed `min-w-[80px]`, the labels are long) and a trailing `ChevronDown` (`size-3 shrink-0 opacity-50`, imported as `FilterRow.svelte:12` does). The labels stay `CONJUNCTION_LABELS` (`toolbar.types.ts:59-63`, "All the following are true" and the two others); choosing "Any" still emits `or`.
2. **Named remove buttons.** The four icon-only removes get `aria-label` and a matching `title`, with no class change: `FilterRow.svelte:101` (raw mode) and `:184` (visual mode), "Remove filter on <property>" or "Remove filter" when the row has no property; `FormulaRow.svelte:57` (editing mode) and `:87` (view mode), "Remove formula <name>" or "Remove formula" when unnamed (the view-mode edit button at `:84` is already named).

Not in this ticket: `SortPanel.svelte` (its remove name "Remove sort by <label>", the list role, Alt+Arrow reorder and the drag insertion line travel with ticket 44), the dropdown trigger nesting (`DropdownMenuTrigger` around a `<button>`, the same pattern as FilterRow, belongs to the nested-button slice), an IconButton and Tooltip primitive (open-itens 207), `onClear` and the filter count in `FilterPanel.svelte` (shell-sidebars-ux 16).

**Size:** S

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run (no E2E surface changes: the tests that find the conjunction trigger read its `textContent`, which an extra SVG does not change).

- [x] Failing test first (`src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts`): both conjunction triggers contain a chevron and the bordered classes; the text is still "All the following are true"; choosing "Any" still emits `or`.
- [x] Failing test first (`FilterRow.svelte.test.ts`): `getByRole('button', { name: 'Remove filter on status' })` finds the visual-mode remove; the raw-mode remove is found by name; a row with no property is named "Remove filter".
- [x] Failing test first (`FormulaRow.svelte.test.ts`): both removes are found by "Remove formula <name>"; an unnamed entry gives "Remove formula".
- [x] The four consumers' tests pass unchanged: `ViewDialog.svelte.test.ts`, `AutoOrganizeRuleRow.test.ts` (`:132-136` find the trigger by `textContent?.trim()`), `RailNoteList.view.test.ts`, `RailNoteList.toolbar.test.ts`.
- [x] No `.view`, settings or rules file is written by any new code path; the existing `onFiltersChange` calls are unchanged.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P139.** "Style it like the FilterRow selectors (border plus chevron) and keep the existing labels." Validation: revise.
- **P22.** "Remove buttons name their target." Only the FilterRow and FormulaRow removes are taken here: `AutoOrganizeRuleRow` names are the rule-row ticket (32), the SortPanel name is ticket 44, and the IconButton and Tooltip primitive is deferred.

## Problem

The conjunction selector (and, or, not) is a borderless text button, so nothing says it can be clicked. The remove buttons in a filter row and a formula row are icon-only with no accessible name, and a native title never shows on keyboard focus.

## Evidence

Checked at 085b23c5d.

- `FilterPanel.svelte:113` and `:175` `<button class="text-xs text-muted-foreground hover:text-foreground">`; the file does not import `ChevronDown` yet (it has `ChevronRight`, `:15`).
- `FilterRow.svelte:101,184` and `FormulaRow.svelte:57,87` removes with no label; the property trigger classes to copy are at `FilterRow.svelte:114-121,161`.
- Four `FilterPanel` consumers: `CollectionView.svelte:26`, `RailNoteList.svelte:29`, `ViewDialog.svelte:8`, `AutoOrganizeRuleRow.svelte:23`. No write and no logic is involved.

## Why blocked


## Sequence with

- 34 (the rule filter reads "When" with one "Add condition") edits the same `FilterPanel.svelte` labels and structure; it is blocked by this ticket and runs after it.
- 32 (Auto Organize rule row) is blocked by this ticket; its `AutoOrganizeRuleRow.test.ts` finds the trigger by text, so it stays green.
- 44 (sort order from the keyboard) is blocked by this ticket and by 34; it owns `SortPanel.svelte`.
- shell-sidebars-ux 16 (filters count, clear, view triggers; ready-for-agent) adds `onClear` to `FilterPanel.svelte` on different lines and edits `CollectionView.svelte`; do not run in parallel, rebase over it.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, and the split of the keyboard sort order into ticket 44. No owner questions on this ticket.
- 2026-11-18, deliver (branch issue/15-filter-sort-conjunction-names): conjunction triggers in the Filter and Sort panels are bordered with a chevron; filter and formula remove buttons carry names ("Remove filter on <prop>", "Remove formula <name>"). Fix round after review 1: remove `Button` attributes split one per line; the styling test asserts the chevron is the trigger's last child. Tests: pnpm check 0 errors; FilterPanel/FilterRow/FormulaRow 23/23; full suite at a28c16033 exit 0, 17600 passed, 0 failed. Reviews: round 1 APPROVED (nits), round 2 APPROVED (no findings).
