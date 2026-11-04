# Issue 06 discovery: filter parse errors are visible

No `spec.md` for rail-shell-ux; the Issue Notes carry the decisions.

## Files that change
- `features/collection/expression/evaluator.ts:290-406`: export `PLAIN_FUNCTIONS` (the `evaluateCall` switch labels) next to the switch, and `validateExpression(expr)`: parse plus an AST walk for `call` nodes with a dot-free callee not in the list. Returns the reason or undefined.
- `features/collection/collection.logic.ts:114-148`: before the record loop, `findFilterError` walks global then view filters (string, `and`/`or`/`not` recursively); first failure returns `{ records: [], columns, filterError }`. A non-list `and`/`or`/`not` value and a non-string, non-object item are errors naming the key / item. Per-record catch stays.
- `collection.types.ts` `QueryResult`: `filterError?: string`.
- `rail-shell/lens.logic.ts:537-562`: `ViewQueryResult.filterError` passed through.
- `toolbar/filter.logic.ts`: `isFilterObject` false when `and`/`or`/`not` holds a non-array (so `itemToRow` gives a JSON-text row, `holdsNull` / `filterToExpression` never `.map` a scalar); `parseFilterToGroups` gives the raw JSON fallback for a malformed top level; `filterGroupsToFilter` drops blank raw rows.
- `CollectionView.svelte:565`: error block in place of the view body when `queryResult.filterError` (toolbar stays).
- `collection-block-widget.ts:125`: `renderView` shows the error in place of rows/calendar.
- `toolbar/FilterRow.svelte:84-96`: raw input `aria-invalid` + message from `validateExpression`, not for blank text.
- `toolbar/FormulaRow.svelte`: Check disabled on `nameError`, blank or `validateFormulaExpression` error; error derived from `entry.expression`.
- `yaml-parser.ts:47-49,235`: `VIEW_TYPES` constant, `ViewType` derived; unknown type is a parse error listing the three.
- `help/documentation/12-collection.md:31-35`: `type` required, no default.

## Plan (test-first per step, one commit each)
1. Validator + executeQuery `filterError` (collection-logic.test.ts, plus a drift test that reads the `evaluateCall` case labels from evaluator.ts source).
2. filter.logic malformed shapes + blank raw rows (filter-logic.test.ts) + executeQuery non-list cases.
3. `queryViewLens` passthrough (lens.logic.test.ts).
4. CollectionView + block widget rendering (CollectionView.test.ts via harness, collection-block-widget.test.ts).
5. FilterRow / FormulaRow (new `.svelte.test.ts` files, mount + `$state` props like `CollectionTableView.svelte.test.ts`).
6. View type constant + help line (yaml-parser.test.ts).

## Defaults taken
- Message: `Invalid filter "<expr>": <reason>`; non-list: `Invalid filter: "<key>" must be a list`.
- A null/number item inside a list is reported (today `executeQuery` throws on null).
- Top-level `filters` null / '' stays "no filter" (unchanged `definition.filters &&` guard).
- Formula Check uses parse-only `validateFormulaExpression` (Issue scope); unknown functions in formulas not checked.
- `entry.error` stays set by `updateFormulaEntry` (its tests), just no longer rendered.

## Risks
- Unknown-function check is static: `if(true, 1, foo())` now errors though `foo` never runs. Intended by "calls an unknown function".
- A malformed object written back through the toolbar becomes its JSON text (pre-existing fallback behavior).
- `TypesNavigator.test.ts:436` uses `type: board`; it only checks the tab opens, re-run it.
