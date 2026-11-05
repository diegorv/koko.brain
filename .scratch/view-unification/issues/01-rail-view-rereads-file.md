# 01: The rail's view list and toolbar read the file on every load

**What to build:** `RailNoteList.loadView` reads `getCachedViewDefinition` (`RailNoteList.svelte:209`, `view-parse-cache.ts:58-61`), which returns any cached entry with no disk read. Only `ViewDialog`, `type-definitions.service.ts:347,364` and `view-lens.service.ts:27` refresh the cache, and nothing evicts it on a content change. So after a `.view` changes in an editor tab or outside the app, the list and toolbar keep the old filters.

Traced stale cases:

1. A pinned view: the Types navigator is unmounted, so nothing refreshes the cache.
2. A visible view with the navigator mounted: the list reads the old parse, the recount refreshes the cache 1 s later (`TypesNavigator.svelte:86-92`), and nothing re-runs the list, so the badge and the list disagree.
3. A hidden view picked from Files: `viewNavigatorRows` drops it (`lens.logic.ts:614`), so no recount reads it.
4. A view deleted outside the app and re-created at the same path: the entry survives, because only app path changes evict it (`boot.ts:43-47`).

Fix in `RailNoteList.svelte:209`:

```ts
await refreshViewDefinition(path);
const parsed = await getCachedViewDefinition(path);
```

Definition and hash then come from one cache entry, so a late read returning its own older parse (`view-parse-cache.ts:47`) cannot pair old content with a new hash. The cost is one small file read per load; `countViewNotes` already reads every view on the same triggers. The tree check at `:203` stays first.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, `RailNoteList.view.test.ts`: change `files[VIEW]`, call `setEntries`, do no manual refresh, and assert on `rowTitles()` and the Filter popover. The existing test at `:448` hides the bug by refreshing first.
- [ ] A tab or external change shows in the list and popovers at the next index bump, in all four cases above.
- [ ] The comment at `RailNoteList.svelte:153-156` ("the parse cache serves a deleted file") is corrected, since it stops being true on this path.

## Notes

- **Tests likely to need load-ordering changes:** `RailNoteList.view.test.ts:413,472,541` hold or sequence reads. Run them first.
- **Known effects:** an external delete before the tree refresh shows a brief read error, then "missing". `FilterPanel` re-seeds sooner and regenerates row ids.
- **Residual, accepted:** an external edit within 15 s of our own write gets no list trigger (`editor.hooks.ts:24`, `watcher-handler.service.ts:41`). A later toolbar write is safe once Issue 04 ships.
- **Residual, accepted:** the Issue 14 entry shape can make a same-second, same-size edit inside `views:` produce no index event, so no list trigger. It is rare and recoverable.
- **Also noticed:** the `yaml` field of `ParseCacheEntry` is written and has no reader. Mention it, do not remove it here.
- **Size:** S.
