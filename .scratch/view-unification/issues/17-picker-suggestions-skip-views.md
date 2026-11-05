# 17: View keys leave the filter, sort and column suggestions

**What to build:** Every `.view` has a record in the property index, so `views`, `_rail` and `_sidebar_label` are suggested as if they were note properties. The suggestion surfaces are all fed by `collectionStore.propertyIndex`: `getAllKnownProperties` (`toolbar/filter.logic.ts:221`), `inferPropertyType` (`:241`) and the columns at `CollectionView.svelte:184,198`. The Properties panel has no key suggester (`PropertiesView.svelte:135`).

The owner chose to keep `kb.page("x.view")` working (`help/documentation/13-queryjs.md:80`, `kb-api.ts:113`), so view records stay in the index, and removing them would be a major contract change. Skip view records in those readers instead, with `isViewFile`.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing tests first, on the real store with a real view record:
  - A key only a view has (`_rail`, `views`) is not suggested by the filter, sort or column pickers.
  - A key a note also has is still suggested, and its inferred type comes from notes only.
- [ ] `kb.page("x.view")` still returns a page, through the real index path. `kb-api.test.ts:351` injects its own records, so it does not prove this.

## Notes

- **Known cost, accepted:** a new `propertyIndex` reader sees views by default. The JSDoc on `propertyIndex` should say so, to warn the next reader.
- `getAllAvailableColumns` was not read. Confirm it is covered.
- Rows of views are handled by the existing rule, and of inline blocks by Issue 20.
- **Size:** S.
