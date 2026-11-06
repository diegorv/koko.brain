# 13: Properties panel matches the table's columns

**What to build:** without an `order`, the table infers its columns from the matched records (`src/lib/features/collection/collection.logic.ts:459-477`), but the Properties panel shows every vault property as visible (`visibleColumns = localColumns ?? allColumns`, `CollectionView.svelte:672`). The panel then disagrees with the table, and the first toggle writes every vault property into `order`.

- Seed the panel's visible columns from the columns the table renders (`queryResult.columns`).
- The first toggle writes `order` equal to the rendered columns with that one change.

**Blocked by:** 06, 11

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, `src/tests/lib/features/collection/CollectionView.test.ts` (or a new `PropertiesPanel` render test): without `order`, the panel lists as visible only the rendered headers; hiding one writes an `order` equal to the shown columns minus that one.

## Notes

- Likely to hit: New table writes no `order` (`collection.service.ts:18-22`), so the first column toggle of every new table writes the whole vault into `order`. Blocked by 11 only because both edit `CollectionView.svelte`.
- `toggleColumn` was not read by the sweep (`research/validated/A09.md`): read it first and report in the Comments if the behavior differs.
- **Size:** M.
