# 08: The rail and the editor run the file's filter; bad shapes are errors

**What to build:** the rail runs `filterGroupsToFilter(parseFilterToGroups(...))` of the file's filters even with no toolbar override (`seedToolbarStateFromDefinition`, `src/lib/features/type-definitions/type-note-list.logic.ts:44-52`; `lens.logic.ts:792-797`), and so does the `.view` tab (`CollectionView.svelte:157-161`, `:258-259`). Inline blocks run the raw value (`collection-block-widget.ts:110`, `:123`). The round trip (`src/lib/features/collection/toolbar/filter.logic.ts`) is not an identity:
- `x != true` becomes `x == false` (`:404-406`), so notes without `x` drop out in the rail and the tab but stay in inline blocks. Same for `x != false`.
- `x == date('X')` becomes `x == 'X'` (`:390-397`); `<`, `>`, `<=`, `>=` keep `date(...)`.
- `x > '5'` becomes `x > 5` for `>`, `<`, `>=`, `<=` (`:521-524`); `==` and `!=` keep the quotes.
- `{and: []}` becomes JSON text, an error in the rail; an empty `or: []` is dropped.

Shapes under `filters:` that are neither an expression nor an `and`/`or`/`not` map behave differently per surface (`collection.logic.ts:232-250`, `:361-374`; `filter.logic.ts:133-137`):
- A YAML list of strings matches every note everywhere: its JSON text parses as a truthy array literal.
- A map without `and`/`or`/`not` (an Obsidian `{property, operator, value}` map), or a list holding a map, is a filter error in the rail and the tab (`Unexpected character: '{'`) and matches every note in inline blocks.

- With no toolbar override, the rail and the editor run the definition's raw filters.
- A list or an unknown shape under `filters:` (root or view) is a `filterError`: `filters must be an expression or an and/or/not map`.
- A table test of documented filter shapes through the round trip, each marked identity or lossy.

**Blocked by:** 04, 07

**Status:** needs-info

**Needs human:** a `filters:` list of strings now shows an error where today it lists every note, on every surface, and a map shape now errors in inline blocks too. Existing hand-written views with those shapes break visibly. The owner confirms before this starts.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/rail-shell/lens.logic.test.ts`: `{and: ['x'], or: []}` and `done != true` give the rows an inline block gives over the same records (a note without `done` included).
  - `src/tests/lib/features/collection/collection-logic.test.ts`: `filters: ['a']` reports a `filterError`.
  - The filter-logic test file: the shape table.

## Notes

- **Run after (other feature):** view-editor 03 (`lens.logic.ts`). relay-lite does not enforce this.
- **Size:** M.
