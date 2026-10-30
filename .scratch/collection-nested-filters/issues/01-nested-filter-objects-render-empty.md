# 01: Nested filter objects make CollectionView render zero rows

**What to build:** Make `CollectionView` run a collection whose `filters:` (global or per view) nests a filter object in a filter list, such as `and: [ 'expr', { or: [...] } ]`, with the same result as `executeQuery` on the raw definition. Either evaluate nested objects through the toolbar round-trip, or keep them as structured raw items that `filterGroupsToFilter` turns back into the original object. A toolbar change must not write the nested object back to the YAML as a JSON-text expression.

**Context:** Found while scoping `help/examples/collection-features` (`.scratch/help-examples` issue 04, review finding 3). `CollectionView.svelte` seeds the toolbar with `parseFilterToGroups(definition.filters)` and queries with `filterGroupsToFilter(...)` of that state, not with the YAML filter. For a nested object, `itemToRow` in `src/lib/features/collection/toolbar/filter.logic.ts` returns a raw row whose text is `JSON.stringify(item)`; that text parses as an expression that never matches, so the whole `and:` is false for every note. The review probe measured 3, 27 and 2 rows on the raw path against 0, 0 and 0 rendered. `persistState` then writes the round-tripped filter into the file on any sort, filter or column change. The help examples avoid the shape (sibling `and:` / `or:` / `not:` keys) and `src/tests/help/examples-scoping.test.ts` flags it there, but any user collection with the shape still breaks.

**Status:** needs-triage

**Touches:**
- `src/lib/features/collection/toolbar/filter.logic.ts` (modify)
- `src/tests/` tests for the filter round-trip (modify or create)

- [ ] A nested `and`/`or`/`not` object renders the same rows in `CollectionView` as `executeQuery` on the raw definition
- [ ] A toolbar change keeps the nested object in the YAML instead of a JSON-text expression

## Comments
