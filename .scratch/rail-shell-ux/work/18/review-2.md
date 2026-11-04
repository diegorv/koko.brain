VERDICT: APPROVED

Re-review of commit 7006096a3 ("refactor: one unary-operator check for the filter row and the New view dialog"), the only change after the review file was added (093a0d7e2).

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit: unary operator list duplicated in `ViewDialog.svelte` and twice in `FilterRow.svelte` | resolved | `filter.logic.ts:196-204` holds the one set and exports `isUnaryOperator`. `FilterRow.svelte:51` (derived `unary`, used at `:174`) and `:77` (operator change) and `ViewDialog.svelte:41` (`blankValue`) call it. A search of `src` finds no other copy of the list outside the test. `filter-logic.test.ts:794-813` covers the four unary operators, seven value-taking ones, and checks `isUnaryOperator(op) === (blank expression === filled expression)` for every operator `getOperatorsForType` returns, so a new value-less operator that only `filterRowToExpression` learns fails the test. |
| 2 | nit: failed-create alert sat below the filter panel, away from the name input | resolved | `ViewDialog.svelte:109-111` puts the `role="alert"` paragraph in the name block, under the name error. `ViewDialog.svelte.test.ts:245-248` asserts the alert's parent contains the name input; before the fix the alert's parent was the filter block, so this assertion would have failed. The text and other assertions in that test are unchanged. |

## Acceptance criteria re-checked

- [met] Dialog: starts with no rows, and after adding rows and cancelling, reopening shows no rows; the field list is exactly `getAllKnownProperties(collectionStore.propertyIndex)` (the `file.*` fields, then the index keys), with the index seeded through the real collection store; a row's operators follow the field's inferred type; in jsdom, clicking the field, operator or conjunction trigger neither calls `createView` nor unmounts the dialog (component test). Whether the portaled menus work inside the real focus trap is proven by the E2E — the fix only swaps the blank-value check to the shared helper and moves the alert; the `filters` block of `ViewDialog.svelte.test.ts` (no rows, cancel/reopen, field list, operators per type, menu clicks keep the dialog open) passes unchanged.
- [met] Dialog: Create is disabled, with a message, while any row whose operator takes a value has a blank value (empty after trim); unary rows (`is_empty`, `is_not_empty`, `is_true`, `is_false`) never block it; Enter on the name input does not create while Create is disabled (component test against the real filter logic) — `blankValue` (`ViewDialog.svelte:40-42`) now calls `isUnaryOperator`, whose set is the same four operators; the blank, whitespace-only, re-block and unary-row tests in `ViewDialog.svelte.test.ts` pass, and `FilterRow.svelte.test.ts` (hidden value input for unary operators, value cleared on switch to one) passes.

## Findings

None open or new. The fix commit touches only the two components, `filter.logic.ts` and their tests: no test was weakened or removed, no scope creep, no change to `layer-baseline.json`, `BASELINE_SIZE` or composition roots.

## Checks run

- `pnpm check`: exit 0, 214 files, 0 errors, 0 warnings.
- `./node_modules/.bin/vitest run` on `filter-logic.test.ts`, `FilterRow.svelte.test.ts`, `FilterPanel.svelte.test.ts`, `ViewDialog.svelte.test.ts`: 4 files, 156 tests passed (exit 0).
- Not run: the full suite and `pnpm build` (deliver runs them), and the E2E (the fix changes no behavior the E2E asserts; the alert move is covered by the component test).
