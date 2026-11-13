# Issue 04 discovery: nested filter objects

## Files that change
- `src/lib/features/collection/toolbar/toolbar.types.ts:64-75` - `FilterRow` gains `item?: CollectionFilter` (the nested object the row was loaded from).
- `src/lib/features/collection/toolbar/filter.logic.ts`
  - `itemToRow` (273-280): a nested object becomes `{ raw: filterToExpression(item), item }` instead of JSON text.
  - new internal `filterToExpression(filter)`: `and` -> `(a) && (b)`, `or` -> `(a) || (b)`, `not` -> `!(a) && !(b)`; several keys of one object are each wrapped and joined with `&&`. Empty lists follow the evaluator (`collection.logic.ts:199-221`): empty `and`/`not` -> `true`, empty `or` -> `false`; an object with no key -> `true`.
  - new internal `rowToItem(row)`: the row's `item` while `raw === filterToExpression(item)`, else `filterRowToExpression(row)`.
  - `filterGroupsToFilter` (142-169): maps rows through `rowToItem`; the single-row string shortcut (151-152) is skipped when that row yields an object.
- `FilterRow.svelte`: unchanged (mechanism = compare `raw` with the built expression, chosen over clearing in `handleRawChange` because it is pure and covered by logic tests).
- Tests: `filter-logic.test.ts`, `CollectionView.test.ts`, `lens.logic.test.ts`, `type-note-list.logic.test.ts`, `src/tests/help/examples-scoping.test.ts`.

## Plan (test-first)
1. Logic tests (round-trip in and/or/not, two levels, single-item group; expression vs object through `executeQuery` with the `collection-logic.test.ts` 'filters with nested and/or/not' records; editing the text writes the string) -> fail -> implement types + filter.logic -> pass. Commit.
2. `CollectionView.test.ts`: nested object in global `filters:` and in `views[0].filters:` (single-item `and: [ { not: [...] } ]`), rows equal `executeQuery` on the raw definition; then a header click (sort), a value edit on the other global row (edit and edit back), a column checkbox in PropertiesPanel; `getYaml()` parses back to the original filters. Commit.
3. `lens.logic.test.ts` (`queryViewLens` paths == `executeQuery` paths) and `type-note-list.logic.test.ts` (`buildViewYamlUpdates` of the seed keeps the object). Commit.
4. `examples-scoping.test.ts`: `nestedCollectionFilters` becomes a round-trip check, same commit as its test rewrite. Commit.

## Prior-art tests
- Round-trip block in `filter-logic.test.ts:412-531`; executeQuery fixtures in `collection-logic.test.ts:123-189`.
- Component: the `CollectionView — first render` describe (index via `collectionStore.setPropertyIndex`, harness `getYaml`).

## Defaults taken
- Field name `item`. `filterToExpression` stays internal (tests reach it through `row.raw`).
- Guard scope: every object filter (global and per view) that is not flat (a key other than `and`/`or`/`not`, or an object item in a list) must round-trip deep-equal. This covers "nests an object in a filter list" and also flags the top-level unknown-key object the Issue names as the counter-example. Flat filters are skipped, since a visual row re-serializes its text (`"x"` -> `'x'`).
- Edit-then-revert of a nested row's text writes the object again (text equals the built expression); the Issue only requires the edited text to be written.

## Risks
- The evaluator catches a throwing string item per item; the combined expression throws as a whole. Only the row text differs; the query runs on the object while the row is unedited.
- In `CollectionView` the rows live in `$state`, so `item` reaches `updateCollectionYaml` as a Svelte proxy; the component test covers the YAML it writes.
- Round-trip keeps the object, but string items inside it are left as written (no re-serialization), which is what keeps the YAML deep-equal.
