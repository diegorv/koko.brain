# 11: A restored table does not show a false "0 results"

**What to build:** `CollectionView` gates only on `collectionStore.isIndexReady` (`CollectionView.svelte:217`). `buildPropertyIndex()` and `getVaultEntries().then(setEntries)` are separate async reads (`tauri-listeners.service.ts:207-216`), and `viewRowSet` drops any record with no entry (`lens.logic.ts:669-687`). So a `.view` tab restored at startup may report "0 results" until entries land. Tables become `.view` files in Issue 22, so this matters more then.

The owner accepted the 2 to 10 s lag before a new note appears in a table. A misleading empty result is not accepted: while entries have not loaded, show the loading state, as the rail does (`RailNoteList.svelte:200`).

**Reproduce first.** This race was traced, not observed, and the order at runtime was not established. If the test cannot produce the false state through the real store order, write that in Comments and close this Issue with no code.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, with the mounted component and real stores: index ready, entries still empty. No "0 results" text shows, and rows render once entries land.
- [ ] A view that truly matches nothing, with entries loaded, still says so.

## Notes

- A vault with no notes must not stay in the loading state. Use a signal for "entries loaded", not "entries non-empty".
- **Size:** S.
