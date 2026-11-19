# Issue 34 discovery

## Files that change

- `src/lib/features/collection/toolbar/filter.logic.ts:278-297` (next to `createEmptyFilterRow`): new pure `addFilter(groups, availableProperties, propertyIndex)`, body moved from `FilterPanel.svelte:74-86`.
- `src/lib/features/collection/toolbar/FilterPanel.svelte`
  - `:74-86` local `addFilter` removed; `:150`, `:215` call the logic export with `availableProperties, propertyIndex`.
  - `:24-49` one optional prop `embedded` (default `false`). When set, the "This view" section renders only its groups: no collapsible header (`:163-172`) and no "Add filter" button (`:211-219`), each behind `{#if !embedded}`; the content's `mt-2` drops too.
- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`
  - `:461` label "Filter" -> "When"; `:464` passes `embedded`.
  - `:475-483` "Add expression" button -> one "Add condition" `DropdownMenu` (trigger keeps `ml-[6.5rem]`: the grid is out of scope) with items "Property filter" (`addFilter` from logic over `groups`) and "Expression" (existing `addExpression`). Both go through `focusAdded(filterBox, ...)`.
  - Focus: no `onCloseAutoFocus` handler needed. bits-ui's FocusScope is `enabled={open}`, so it unmounts and returns focus to the trigger in the same effect flush that `focusAdded` awaits with `tick()`; `focusAdded` then focuses the new input last (checked in `node_modules/bits-ui/dist/bits/utilities/focus-scope/focus-scope.svelte.js`, and with a `toBeFocused` assertion in the E2E spec).
- `e2e/specs/auto-organize-flows.spec.ts:29`: open "Add condition", pick menuitem "Expression".
- `help/documentation/22-auto-organize.md:82,109`: name "Add condition" > "Property filter" / "Expression".

## Tests

- `src/tests/lib/features/collection/toolbar/filter-logic.test.ts`: new `describe('addFilter')`: `[]` -> one `and` group with one row (first available property, else `file.name`, operator from the inferred type); existing groups -> appended to the first only, others identical (`toBe`).
- `FilterPanel.svelte.test.ts`: `embedded` hides "This view" and "Add filter", rows and conjunction still render and report; existing `:70-84` tests keep "This view".
- `AutoOrganizeRuleRow.test.ts` "filter builder": a row shows "When", no "This view", "Add filter", "Add expression"; the menu adds a filter row / expression row, `onupdate` not called until typed, new input focused. Existing `button('Add filter')` / `button('Add expression')` calls move to the `pickMenuItem(button('Add condition'), ...)` helper already in the file (`:165-173`).
- `AutoOrganizeSection.test.ts:350-361` focus test: goes through the menu.

## Risks

- bits-ui close autofocus order versus `focusAdded`'s `tick()`: relies on the scope unmounting on `open` false, not after the exit animation. Covered in jsdom and in the real browser (E2E `toBeFocused`).
- `FilterPanel` is shared by four consumers; only the rule row sets `embedded`, so `CollectionView`, `RailNoteList`, `ViewDialog` render as before.

## Defaults taken

- Prop name `embedded`.
- Shell-sidebars-ux 16 and 24 (which the Issue says should land first on `FilterPanel.svelte`) are still `todo` in that ledger; this run was launched anyway, so they will rebase on this change. Flagged in the report.
