# 26: The rail does not show a false empty list before the entries land

**What to build:** At vault open the property index is ready long before the entries: step 5b reads the records right after the scan, and `typeDefinitionsStore.entries` is first written by the `vault-index-updated` refresh, at least 2 s later (`tauri-listeners.service.ts:106,207-216`). `RailNoteList` gates a view lens only on `collectionStore.isIndexReady` (`RailNoteList.svelte:221`) and a built-in lens on nothing, so in that window the list says "No notes here" (`:843`) for a vault full of notes.

While entries have not loaded, show the list's existing Loading state (`data-note-list-loading`, `:808-812`). Issue 11 fixed the same false state in `CollectionView`.

**Reproduced with a mounted `RailNoteList` and real stores**, entries reset and the index set:

- View lens on `PROJECTS_UNSORTED`: `[data-note-list-empty]` reads "No notes here", and no Loading. After `setEntries` the list has 3 rows.
- `{ kind: 'favorites' }`: the same "No notes here".

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, mounted with real stores, for a view lens and a built-in lens: index ready, entries not loaded. Loading shows, `[data-note-list-empty]` does not, and rows render once entries land.
- [ ] A view that truly matches nothing, and a lens with no notes, still say so once entries loaded.
- [ ] A vault with no notes leaves Loading. Use a signal for "entries loaded", not "entries non-empty".
- [ ] After a vault switch, a refresh pending from the previous vault does not count as entries landing for a view lens. `CollectionView.restored-view.test.ts` has this case for the table: the signal is `entriesLoaded` in `app/boot.ts`, which needs the entries to share a path with the property index.
- [ ] The view count in `TypesNavigator` shows its empty pending slot, not `0`, while entries have not loaded.

## Notes

- **Do not reuse the `boot.ts` signal as is for a built-in lens.** It reads the property index, and a built-in lens lists entries only. If the whole read fails, the index never turns ready and Inbox would stay on Loading where today it works. A built-in lens needs `entriesVersion > 0`.
- Share the view-lens rule with the `boot.ts` port rather than copying it. `entriesLoaded` lives inline there, and `lens.logic.ts` is the natural home.
- In `loadView`, gate next to the `!indexReady` branch (`:221`), before `stepSeed`, so a load that only waits does not seed the toolbar. Sort, Filter and New here stay hidden while Loading, as they do for that branch.
- `RailNoteList.svelte:187` already tracks `entriesVersion`, so the view reloads when entries land.
- Which lens kinds read entries was not listed. Check Folder, Today's My people section, the neighbourhood lens and the calendar's provider lenses. A lens that reads only the file tree must not wait.
- The `TypesNavigator` count was traced, not run (`TypesNavigator.svelte:105-110`): `ready` is the index only, and the recount is debounced 1 s against a 2 s window.
- **Known and not in scope:** a failed entries read stays on Loading until the next index event, the same trade-off as Issue 11.
- Found by the review of Issues 06, 17 and 11 on 2026-11-05.
- **Size:** S.
