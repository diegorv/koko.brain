# 17: Suggestions, graph, people rows and Favorites drop views

**What to build:** Small filters in a few readers that still treat a view as a note and do not follow from Issue 14. Make one commit per area.

**1. Filter, sort and column suggestions.** Every `.view` has a record in the property index, so `views`, `_rail` and `_sidebar_label` are suggested as if they were note properties. The surfaces are all fed by `collectionStore.propertyIndex`: `getAllKnownProperties` (`toolbar/filter.logic.ts:221`), `inferPropertyType` (`:241`) and the columns at `CollectionView.svelte:184,198`. The Properties panel has no key suggester (`PropertiesView.svelte:135`).

The owner chose to keep `kb.page("x.view")` working (`help/documentation/13-queryjs.md:80`, `kb-api.ts:113`), so view records stay in the index; removing them would be a major contract change. Skip view records in those readers instead, with `isViewFile`.

**2. Graph.** Every `.view` is a node (`graph-view.logic.ts:25,53`). In `buildGraphData`, filter `entries` first, so the cache and the node loop see notes only.

**3. People.** A view in the people folder becomes a person row (`one-on-one.logic.ts:155`, `buildMyPeople`).

**4. Favorites.** `lens.logic.ts:308` does not apply `isListableNote`, so a view with a hand-written `_favorite: true` is listed. The owner decided views leave. Favorited type definitions stay, so filter `isViewFile` only, not `isListableNote`.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] **Suggestions**, failing tests first, on the real store with a real view record: a key only a view has (`_rail`, `views`) is not suggested by the filter, sort or column pickers. A key a note also has is still suggested, and its inferred type comes from notes only.
- [ ] `kb.page("x.view")` still returns a page, through the real index path. `kb-api.test.ts:351` injects its own records, so it does not prove this.
- [ ] **Graph**, failing test first: no node and no edge for a view, including when a link names it.
- [ ] **People**, failing test first: `buildMyPeople` gives no row for a view in the people folder.
- [ ] **Favorites**, failing test first: a favorited view is absent, and a favorited type definition stays. `help/documentation/25-types-and-relationships.md` line 144 no longer says a favorited `.view` stays in Favorites.

## Notes

- **Known cost, accepted:** a new `propertyIndex` reader sees views by default. The JSDoc on `propertyIndex` should say so, to warn the next reader.
- `getAllAvailableColumns` was not read. Confirm it is covered.
- Rows of views are handled by the existing rule, and of inline blocks by Issue 20.
- Commit `8e2cb8608` introduced "except Favorites" and states no reason. The owner reviewed this and chose removal.
- **Size:** S.
