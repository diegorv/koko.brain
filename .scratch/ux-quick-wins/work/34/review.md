VERDICT: APPROVED

Reviewed `git diff main...HEAD` (e13cfa081..187c27522) in the worktree.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts` and `AutoOrganizeRuleRow.test.ts`: a rule row renders "When" and none of "This view", "Add filter", "Add expression"; `FilterPanel.svelte.test.ts:73,81` and the ViewDialog tests still find "This view". — `AutoOrganizeRuleRow.test.ts` "reads \"When\" with one \"Add condition\"..." and `FilterPanel.svelte.test.ts` `describe('embedded')`; with the three `src/lib` files reverted to `main` they fail (probe: 15 failed, including both embedded tests and the "When" test), and pass on HEAD. `FilterPanel.svelte.test.ts:72-86` are unchanged and still assert "This view"; `ViewDialog.svelte.test.ts:377,649,692` pass unchanged.
- [met] "Add condition" > "Property filter" adds a filter row, "Expression" an expression row; `rule.expression` is unchanged until a value is typed; the new row's first input has focus. — `AutoOrganizeRuleRow.svelte:483-497` (one `DropdownMenu`, both items through `focusAdded`); tests "\"Property filter\" adds a filter row, saves nothing yet and focuses its input" and "\"Expression\" adds an expression row..." assert row, `onupdate` not called, and `document.activeElement`. Mutation probe (Property filter item without `focusAdded`) fails the focus test. Real-browser focus confirmed by the E2E `toBeFocused` at `auto-organize-flows.spec.ts:34`. The new path writes `groups` without `handleFiltersChange`; the old path's `commitFilter` was a no-op for a blank row anyway, and the default property is `file.name` (FILE_PROPERTIES lead `getAllKnownProperties`), a text type with a blank value, so nothing that used to save now stays unsaved.
- [met] Failing test first, `src/tests/lib/features/collection/toolbar/filter-logic.test.ts` (the existing file, not `filter.logic.test.ts`): `addFilter` on `[]` makes one `and` group; on existing groups it appends to the first only and leaves the others untouched. — `filter-logic.test.ts:951-976`, three tests (including `toBe` identity on the untouched group and no mutation of the input rows); all three fail against `main` (`addFilter` not exported) and pass on HEAD. `filter.logic.ts:292-306` body matches the removed `FilterPanel` function.
- [met] `auto-organize-flows.spec.ts:29` opens "Add condition" and picks "Expression"; it passes, as do `rail-shell.spec.ts:661-712` and `rail-list-toolbar.spec.ts:237`. — `auto-organize-flows.spec.ts:29-34`; I ran `bash scripts/e2e.sh e2e/specs/auto-organize-flows.spec.ts e2e/specs/rail-shell.spec.ts e2e/specs/rail-list-toolbar.spec.ts`: 51 passed, exit 0.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass; the three E2E specs above pass. — `pnpm check`: 0 errors, 0 warnings (exit 0). Targeted vitest (below) passes; the full suite is deliver's to run. E2E as above.

## Checks I ran

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `filter-logic.test.ts`, `FilterPanel.svelte.test.ts`, `AutoOrganizeRuleRow.test.ts`, `AutoOrganizeSection.test.ts`, `ViewDialog.svelte.test.ts`, `RailNoteList.toolbar.test.ts`, `CollectionView.test.ts`: 7 files, 373 tests passed, exit 0. My test verdict rests on these files.
- Red probe: the four changed test files against `main`'s `AutoOrganizeRuleRow.svelte`, `FilterPanel.svelte`, `filter.logic.ts`: 15 failed (all new or rerouted tests), sources restored after.
- E2E: the three specs above, 51 passed.
- Scope: only the four files the Issue names in `src/lib`, their tests, the E2E spec and the help page. `CollectionView`, `RailNoteList` and `ViewDialog` do not set `embedded` (default `false`), so their panels render as before. No layer-baseline change.

## Findings

1. minor, `src/lib/features/collection/toolbar/FilterPanel.svelte:39-44` (process, not code): the Issue's "External dependency" says not to run this ticket before shell-sidebars-ux 16 and 24 land on `FilterPanel.svelte`; both are still `todo` in `.scratch/shell-sidebars-ux/ledger.md:53,61`. Fix: none in this diff; the main session should note on those two Issues that they now rebase onto the `embedded` prop and the extracted `addFilter(groups, availableProperties, propertyIndex)` signature.
2. nit, `help/documentation/22-auto-organize.md:82`: "Click **Add condition** and pick **Property filter** to add a condition, pick a property..." says "pick" twice in one sentence. Fix: e.g. "Click **Add condition** > **Property filter**, then choose a property and an operator, and type a value."

## Resolution

1. Not a code change: the dependency on shell-sidebars-ux 16 and 24 is the main session's to record on those Issues (rebase onto the `embedded` prop and `addFilter(groups, availableProperties, propertyIndex)`). Left as a note for the main session.
2. Fixed: `help/documentation/22-auto-organize.md:82` now reads "Click **Add condition** > **Property filter**, then choose a property and an operator, and type a value."
