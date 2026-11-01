# Issue 09 discovery: Favorites and Archive lenses

No `spec.md`; source is `PRD.md` (Rail, Lenses table, Q8) and ADR 0033. Builds on `work/07` (rail,
`lens.logic.ts`, `RailNoteList.svelte`) and `work/08` (`newNoteRule`, New here); only differences listed.

## Files that change
- `features/rail-shell/lens.logic.ts`: `FAVORITES_LENS` / `ARCHIVE_LENS` built in next to `INBOX_LENS`
  (features layer, no provider). One `listLens(label, rule, predicate, ctx)` helper behind all three:
  system folder excluded, modified desc. Favorites: `favorite && !archived`, rule "favorite, not
  archived". Archive: `archived`, rule "archived". `newNoteRule`: Favorites -> Cmd+N folder +
  `{ _favorite: true }`; Archive -> null (no button).
- `features/rail-shell/Rail.svelte`: items Inbox, Favorites (Star); Archive (Archive icon) in a
  `mt-auto` group at the bottom. Same token classes as the Inbox item.
- No AppShell change: `onSelect(item, lens)` already swaps the lens.

## Live update
The action bar's toggles write frontmatter -> `vault-index-updated` -> `tauri-listeners.service.ts:141-149`
`typeDefinitionsStore.setEntries` -> `RailNoteList`'s `$derived` re-resolves. Nothing new to wire;
tests pin it with `setEntries` after a flag flip, the E2E pins the real chain.

## Plan (test-first)
1. `lens.logic.test.ts`: both rules, labels, system folder, sort, empty; Favorites new-note rule (Cmd+N
   folder + `_favorite: true`, no vault -> null); Archive -> null.
2. `Rail.test.ts`: order Inbox, Favorites, Archive; Archive in the bottom group; click hands each lens.
3. `RailNoteList.test.ts`: Favorites/Archive lists; favoriting / restoring via `setEntries` updates;
   Archive has no New here, Favorites' New here writes `_favorite: true`. The existing "no creation
   rule" test used kind `archive` for a provider; it moves to a non-built-in kind.
4. E2E `rail-shell.spec.ts`: favorite from the action bar -> row in Favorites; archive then Restore
   from the action bar -> row leaves Archive.

## Defaults taken
- Type definitions are not excluded from Favorites/Archive (rules say only favorite/archived).
- Rows keep the shared style (italic when not organized) in every lens.
- No badge on Favorites or Archive.

## Risks
- E2E list updates wait for the throttled index refresh (~2 s); same 15 s timeout as Issue 08.
