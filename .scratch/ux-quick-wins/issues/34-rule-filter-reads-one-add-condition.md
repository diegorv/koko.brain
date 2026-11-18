# 34: The rule filter reads "When" with one "Add condition"

**Origin:** design review 2026-11-17, proposal P146 (part), prototype `.scratch/design-review/prototypes/settings-auto-organize.html` (the "When" label at `:711`), research `.scratch/ux-quick-wins/research/verdict-settings-b.md` (Q4) and `breakdown.md` (old ticket 33).

**What to build:**

1. **Pure `addFilter`.** `addFilter` (`src/lib/features/collection/toolbar/FilterPanel.svelte:73-85`) moves to `src/lib/features/collection/toolbar/filter.logic.ts` as a pure export taking the groups, the available properties and the property index; `FilterPanel` calls it unchanged, so all four consumers (`AutoOrganizeRuleRow`, `CollectionView`, `RailNoteList`, `ViewDialog`) stay on one implementation. On `[]` it makes one `and` group; on existing groups it appends to the first only.
2. **One optional prop.** `FilterPanel` gets one optional prop (default off) that hides its "This view" section header (`:158-162`) and its own "Add filter" button (`:202-211`). Only the rule row sets it. No other consumer changes.
3. **"When" and "Add condition".** In `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte` the label column (`:329`, today "Filter") reads "When", and one "Add condition" dropdown offers "Property filter" and "Expression", replacing the "Add filter" and "Add expression" buttons (`:343-351`, which also use an `ml-[6.5rem]` margin hack). "Property filter" adds a filter row, "Expression" an expression row. A blank row is still not saved (`rule.expression` unchanged until a value is typed). The focus move to the new row's first input from ticket 32 keeps working through the menu items.
4. **E2E and help.** `e2e/specs/auto-organize-flows.spec.ts:29` clicked "Add expression"; it now opens "Add condition" and picks "Expression" (two steps). Help `help/documentation/22-auto-organize.md:82` ("Click Add filter") and `:109` ("click Add expression below the builder") name the new control.

Not in this ticket: the shared two-column label grid that replaces `ml-[6.5rem]` (cosmetic, with the deferred rule-card rework), the conjunction trigger styling (ticket 15), the `onClear` prop and view triggers (shell-sidebars-ux 16), any change to what a view's own panel shows.

**Size:** S.

**Blocked by:** 15, 33

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh auto-organize-flows.spec.ts rail-shell.spec.ts rail-list-toolbar.spec.ts (a selector and a shared panel change).

- [ ] Failing test first, `src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts` and `AutoOrganizeRuleRow.test.ts`: a rule row renders "When" and none of "This view", "Add filter", "Add expression"; `FilterPanel.svelte.test.ts:73,81` and the ViewDialog tests still find "This view".
- [ ] "Add condition" > "Property filter" adds a filter row, "Expression" an expression row; `rule.expression` is unchanged until a value is typed; the new row's first input has focus.
- [ ] Failing test first, `src/tests/lib/features/collection/toolbar/filter-logic.test.ts` (the existing file, not `filter.logic.test.ts`): `addFilter` on `[]` makes one `and` group; on existing groups it appends to the first only and leaves the others untouched.
- [ ] `auto-organize-flows.spec.ts:29` opens "Add condition" and picks "Expression"; it passes, as do `rail-shell.spec.ts:661-712` and `rail-list-toolbar.spec.ts:237`.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass; the three E2E specs above pass.

## Original proposal

- **P146 (part).** The rule filter borrows collection-view wording and has two add buttons. Label the block "When", merge the two buttons into one "Add condition" dropdown, and use a shared two-column grid. Validation: revise. The grid is not shipped.

## Problem

A rule shows "This view" over its conditions, as if it were a collection view, and two add buttons sit side by side with a margin hack offsetting them. A rule should read as a sentence: "When" followed by conditions.

## Evidence

Checked at 085b23c5d.

- `FilterPanel.svelte:149,158-162` "This view" header, `:202-211` "Add filter", `:73-85` `addFilter`; `AutoOrganizeRuleRow.svelte:329` label "Filter", `:332-355` builder and "Add expression" with `ml-[6.5rem]`.
- Consumers: `AutoOrganizeRuleRow`, `CollectionView`, `RailNoteList`, `ViewDialog` (grep `src/lib`).
- `e2e/specs/auto-organize-flows.spec.ts:29` clicks `getByRole('button', { name: 'Add expression' })`. Help `22-auto-organize.md:82,109` name both buttons.
- Prototype: "When" in the row's label column, no "This view" header (`settings-auto-organize.html:711`).

## Why blocked

- 15: it edits the conjunction triggers (`FilterPanel.svelte:113-115,175-177`) and the `FilterRow` and `FormulaRow` names in the same files this ticket edits on other lines.
- 33: it edits `AutoOrganizeRuleRow.svelte` (and its test) around the property rows and the icon button; this ticket then edits the filter label column of the same file.

## External dependency

Shell-sidebars-ux 16 (`issues/16-filters-count-clear-view-triggers.md`, ready-for-agent) adds an `onClear` prop to `FilterPanel.svelte`, and shell-sidebars-ux 24 (`issues/24-breadcrumb-reveal-in-note-list.md`, ready-for-agent) also touches `FilterPanel.svelte`. Do not run this ticket before both are done: the new prop and the extracted `addFilter` must land on top of their changes, not beside them.

## Sequence with

Ticket 44 (keyboard sort order) is blocked by this ticket and edits the sort panel in the same toolbar folder. Ticket 32 added the focus after "Add expression" that this ticket must preserve. Ticket 47 edits `CollectionView.svelte` and does not touch `FilterPanel`. The collection slice's conjunction ticket is ticket 15.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping.
