VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | major | A null list item crashes `parseFilterToGroups` | resolved | e9b67073 adds `isFilterObject` (`typeof item === 'object' && item !== null`) in `filter.logic.ts`. `itemToRow` sends a non-object item to the JSON-text raw row, as on main, and `filterToExpression`'s `wrap` writes a deeper null as `null`. The new test 'loads a null list item (an empty YAML `-` entry) without throwing' covers `{ and: ['x == 1', null] }` (rows `[undefined, 'null']`, written back as `{ and: ['x == 1', 'null'] }`, the same as main) and `{ and: [{ or: [null] }] }` (row text `(null)`, while the object itself is kept through `item`). I put the pre-fix `filter.logic.ts` (71a513d4) in place and the test failed with `TypeError: Cannot read properties of null (reading 'and')`. Then I restored HEAD. The parse crash is gone. A deep null still throws at query time, which is new finding 1 (minor). |
| 2 | nit | The joined expression fails as a whole, while the evaluator catches errors per item | resolved | e9b67073 documents it in the `filterToExpression` JSDoc with the `{ or: ['nope(', 'true'] }` example. Behavior is unchanged, which matches what the finding asked for. |
| 3 | nit | Nothing checked that the intermediate filter edit reached the YAML | resolved | 600a3a1a adds `expect(api?.getYaml()).toContain('opened')` after the first edit in `CollectionView.test.ts`. The fixture only has `'open'`, so the assertion fails if the edit never reaches the YAML. |

## Acceptance criteria re-checked

- [met] Failing test first: `filterGroupsToFilter(parseFilterToGroups(f))` is deep-equal to `f` for a nested object inside `and:`, inside `or:` and inside `not:`, for a nested object two levels deep, and for a nested object that is the only item of its group (`and: [ { or: [...] } ]`, which must not take the single-row string shortcut at `filter.logic.ts:151-152`) (logic test, `filter-logic.test.ts`) — the fixes only add the null guard. For any non-null object, `isFilterObject` keeps the earlier nested path, and the round-trip tests in `filter-logic.test.ts` still pass (96 tests in the file, exit 0).
- [met] The nested row shows a raw expression, not JSON text, and that expression run as a string filter through `executeQuery` returns the same records as the nested object (logic test, real parser and evaluator; the fixtures of `collection-logic.test.ts` 'filters with nested and/or/not' and 'evaluates nested and/or/not combinations' are the oracle) — the `wrap` change only affects non-object, non-string items. The expression tests and `collection-logic.test.ts` pass.
- [met] `CollectionView` with a nested object in the global `filters:` and one in a view's `filters:` renders the same rows as `executeQuery` on the raw definition (fixture well under the table's 200-row cap); after a sort change, a filter edit on another row and a column change, the YAML the harness holds (`getYaml()`) parses back to `filters:` and `views[0].filters:` deep-equal to the originals (component test, `CollectionView.test.ts`, real stores) — 600a3a1a makes this test stronger (the intermediate edit is now asserted) and does not weaken it. `CollectionView.test.ts` passes.

## Findings

1. **minor**, `src/lib/features/collection/toolbar/filter.logic.ts:282-288` / `src/lib/features/collection/collection.logic.ts:243-254`: a null two levels down no longer crashes the parse, but it now crashes the query. On main, `CollectionView` did not throw here.
   - **Why:** for `{ and: ['x == 1', { or: [null] }] }`, the nested row keeps `item = { or: [null] }`, so `filterGroupsToFilter` passes the object, null included, to `executeQuery`. `evaluateFilterCached` then reads `.and` on the null.
   - **Probe** (a temporary test, now deleted): the round-tripped filter is `{ and: ['x == 1', { or: [null] }] }`, and `executeQuery` on it with one record throws `TypeError: Cannot read properties of null (reading 'and')`. This happens inside the `queryResult` `$derived` (`CollectionView.svelte:207`), which has no boundary.
   - **On main:** the round-trip turned the object into JSON text, so `CollectionView` matched nothing and never threw. The raw definition throws on main too, so this is the same behavior as `executeQuery` on the raw definition, which is what the Issue asks for.
   - **Likelihood:** low. It needs a half-typed `-` inside a nested object, and the common top-level case is fixed and tested.
   - **Fix, either of:**
     - make `evaluateFilter` / `evaluateFilterCached` return `false` for an item that is neither a string nor a non-null object (a 2-line guard in `collection.logic.ts`, outside the Touches list);
     - or have `itemToRow` keep `item` only when no item inside it, at any depth, is null.

     Add a test where `executeQuery` on the round-trip of `{ and: ['x == 1', { or: [null] }] }` does not throw.

## Checks run by this review

- `pnpm check`: exit 0, 213 files, 0 errors, 0 warnings.
- `pnpm vitest run` on 6 files: exit 0, 387 of 387 passed. The files were `filter-logic.test.ts`, `CollectionView.test.ts`, `rail-shell/lens.logic.test.ts`, `type-definitions/type-note-list.logic.test.ts`, `help/examples-scoping.test.ts` and `collection/collection-logic.test.ts`.
- Pre-fix probe: with `filter.logic.ts` from 71a513d4, the null-item test failed with the TypeError. I restored HEAD afterwards and the worktree is clean.
- Scope: the fixes change only `filter.logic.ts`, two test files and the review file. No test was deleted or weakened, and `layer-baseline.json` and `BASELINE_SIZE` were not touched.
- The full `pnpm vitest run && pnpm build` is deliver's to run.
- I confirmed with a probe that `evaluateFilter` reads `.and` on a null at query time (finding 1).

## Resolution

1. Fixed, the second option. `itemToRow` (`filter.logic.ts`) keeps `item` only when `holdsNull` finds no non-string, non-object item at any depth. Otherwise the row keeps only the expression text, so `{ and: ['x == 1', { or: [null] }] }` round-trips to `{ and: ['x == 1', '(null)'] }`. The test 'writes a nested object holding a null back as its text, so executeQuery does not throw' failed before the fix (the object came back with the null) and passes after it. `executeQuery` on the round-trip returns no records and does not throw.
