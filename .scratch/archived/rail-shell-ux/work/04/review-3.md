VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | A null two levels down crashes `executeQuery` through the kept nested object | resolved | f7bd69ee: `itemToRow` (`filter.logic.ts:285-291`) drops `item` when `holdsNull` (`filter.logic.ts:299-304`) finds, at any depth of `and` / `or` / `not`, an item that is neither a string nor a non-null object. The row keeps `filterToExpression(item)` as its text, so `rowToItem` writes the string and `evaluateFilterCached` never reaches the null. The test 'writes a nested object holding a null back as its text, so executeQuery does not throw' asserts the round-trip `{ and: ['x == 1', '(null)'] }` and runs `executeQuery` on it. I put the pre-fix `filter.logic.ts` (c18305b1) in place: the test failed (`expected { and: [ 'x == 1', { or: [ null ] } ] } to deeply equal { and: [ 'x == 1', '(null)' ] }`); I restored HEAD and the worktree is clean. |

## Acceptance criteria re-checked

- [met] Failing test first: `filterGroupsToFilter(parseFilterToGroups(f))` is deep-equal to `f` for a nested object inside `and:`, inside `or:` and inside `not:`, for a nested object two levels deep, and for a nested object that is the only item of its group (`and: [ { or: [...] } ]`, which must not take the single-row string shortcut at `filter.logic.ts:151-152`) (logic test, `filter-logic.test.ts`) — the fix only changes objects holding a non-string, non-object item; every valid nested object still keeps `item`, and the round-trip tests in `filter-logic.test.ts` pass (97 tests in the file, exit 0 in the targeted run).
- [met] The nested row shows a raw expression, not JSON text, and that expression run as a string filter through `executeQuery` returns the same records as the nested object (logic test, real parser and evaluator; the fixtures of `collection-logic.test.ts` 'filters with nested and/or/not' and 'evaluates nested and/or/not combinations' are the oracle) — `raw` is still `filterToExpression(item)` in both branches; the expression tests and `collection-logic.test.ts` pass.
- [met] `CollectionView` with a nested object in the global `filters:` and one in a view's `filters:` renders the same rows as `executeQuery` on the raw definition (fixture well under the table's 200-row cap); after a sort change, a filter edit on another row and a column change, the YAML the harness holds (`getYaml()`) parses back to `filters:` and `views[0].filters:` deep-equal to the originals (component test, `CollectionView.test.ts`, real stores) — the fixture holds no null, so its path is unchanged; `CollectionView.test.ts` passes.

## Findings

1. **nit**, `src/lib/features/collection/toolbar/filter.logic.ts:299`: `holdsNull` also matches a number or boolean item (anything not a string and not an object), which its JSDoc says but its name does not. Such an object now round-trips to text instead of the object; for a number the text evaluates the same (`(5)` is truthy, and `evaluateFilter(5)` returns true), for `false` it differs (`(false)` is false, the object form returns true). Not a valid filter item, so no behavior a user relies on. Fix (optional): rename to something like `holdsNonFilterItem`.

## Checks run by this review

- `pnpm check`: exit 0, 213 files, 0 errors, 0 warnings.
- `pnpm vitest run` on `filter-logic.test.ts`, `CollectionView.test.ts`, `rail-shell/lens.logic.test.ts`, `type-definitions/type-note-list.logic.test.ts`, `help/examples-scoping.test.ts`, `collection/collection-logic.test.ts`: exit 0, 388 of 388 passed.
- Pre-fix probe: the new test fails against c18305b1's `filter.logic.ts`; HEAD restored, worktree clean.
- Scope: f7bd69ee touches only `filter.logic.ts`, `filter-logic.test.ts` and `review-2.md`. No test deleted or weakened; `layer-baseline.json` and `BASELINE_SIZE` untouched.
- The full `pnpm vitest run && pnpm build` is deliver's to run.
