# Issue 32 discovery

Built in one run (no split): the six behaviours are small and share the same two files.

## Files that change

- `src/lib/features/auto-organize/auto-organize.logic.ts:953-987` (`resolveDestination` neighbourhood): add `TEMPLATE_VARIABLES` and `unknownTemplateVariables(template)` (same `/\{(\w+)\}/g`, `includes`, deduped). `resolveDestination` untouched.
- `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte`
  - `:427`, `:468` `(i)` keys: replaced by `propertyIds` / `createPropertyIds` (`$state` number arrays, per-instance counter). Push on add, splice on remove, untouched on edit. A `$effect.pre` per array rebuilds it when the rule's array length differs (reload, or `createNote` removed). Nothing is written to the rule.
  - `:400-407` Move to folder: `aria-label`, variables line (`data-template-variables`) or one warning per unknown variable (`data-template-warning`). Same warning under Create note path (`:445-455`) and Rename in Name mode (`:384-395`).
  - `:285` card: `border-dashed` when off, `focus-within:border-ring` always; `:294-297` "Off" pill `data-rule-off`.
  - `:288-323` names: Rule name, Enable rule, Move rule up, Move rule down, Delete rule; `:408-414` icon button `aria-label` = its title.
  - Focus: new prop `focusName` (name input focused in `onMount`); a `focusAdded(box, add)` helper snapshots the inputs under a container, runs the add, `await tick()`, focuses the first new input. Used by Add property, Add note property and Add expression (box = `[data-rule-filter]` div, so no FilterRow edit).
- `src/lib/features/auto-organize/AutoOrganizeSection.svelte:70-81,209-219`: `newRuleId` `$state`, set in `addRule`, passed as `focusName={rule.id === newRuleId}`.
- Tests: `auto-organize.logic.test.ts` (new describe), `AutoOrganizeRuleRow.test.ts` (additive describes), `AutoOrganizeSection.test.ts` (focus tests), new fixture `src/tests/fixtures/AutoOrganizeStoreRuleRowHarness.svelte` (rows rendered from `autoOrganizeStore.rules`, updates through `autoOrganizeStore.updateRule`, so the deep-`$state` proxy path is the one tested).

## Prior-art tests

- `AutoOrganizeRuleRow.test.ts` "computed values" (`commit`, `choose`, `field`, `propertyRows`, `exprError`) and `loaded()`.
- `AutoOrganizeSection.test.ts` `render`, `button`, `byName`.

## Risks

- `$effect.pre` must run before the keyed each in the same flush or Svelte throws `each_key_duplicate`; covered by a reload test that grows the array while mounted.
- e2e `auto-organize-flows.spec.ts` uses `getByPlaceholder('Rule name')`, `getByRole('switch').nth(1)`: placeholders are kept and the pill is a `span`, so it still holds.

## Defaults taken

- One warning line per unknown variable (as the prototype), deduped.
- Wording: Move to folder and Create note path use the Issue's text; Rename says "{yaer} is not a variable, so the new name would contain {yaer}", since a rename creates no folder.
- Variables line: "Variables: {folder} {parent} {basename} {type} {status} {year} {month}", always shown under Move to folder when no unknown variable.
- Create note path warning reads the saved path (the field saves on change).
