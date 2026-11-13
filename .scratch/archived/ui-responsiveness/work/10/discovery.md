# Issue 10 discovery

No `spec.md` in the feature folder. No ADR changes needed.

## Files that change

- `src/lib/app/AppShell.svelte:107-121` `typeRows`: reads `fsStore.fileTree` twice, once for
  `viewNavigatorRows` (real use: `.view` files live in the tree) and once in the
  `typeNavigatorRows` context (unused). Split into `viewRows` (tree-bound) and
  `entryTypeRows` (entries-bound, no tree); `typeRows` concatenates them.
- `src/lib/features/rail-shell/lens.logic.ts:360` `typeNavigatorRows(ctx)` and
  `src/lib/plugins/calendar/day-lens.logic.ts:45` `noteDateCounts(ctx)`: narrow the parameter
  to `Omit<LensContext, 'fileTree'>` so callers do not pass (and track) the tree.
- `src/lib/plugins/calendar/CalendarNavigator.svelte:50-58`: drop `fileTree` (and the
  `fsStore` import) from the `noteDateCounts` context.
- `src/lib/features/rail-shell/RailNoteList.svelte:94-102` `lensContext()`: `fileTree` becomes a
  getter, so only a resolver that reads it (the folder lens, `lens.logic.ts:702-706`) tracks the
  tree; every other lens (and providers like the day lens) stops re-running on tree replacement.
- `fileCount` removal: `fs.logic.ts:194-210` `attachFileCounts`, its three callers
  (`fs.service.ts:92`, `fs.watcher.ts:218`, `app-lifecycle.service.ts:366`), the field and doc in
  `fs.types.ts:5-15`, the store comment `fs.store.svelte.ts:6-8`, and its tests in
  `fs.logic.test.ts:511-588`. No reader of `node.fileCount` exists (grep; `tasks.logic` has an
  unrelated `fileCount` stat).

## Tests (failing first)

Prior art: `RailNoteList.test.ts:405-420` counts `typeDefinitionsStore.entries` getter reads with a
pass-through `vi.spyOn(..., 'get')` (real store, not a mock) to prove a lens did not re-resolve.

- RailNoteList: Inbox lens, `setFileTree` with a new tree -> no `entries` read; a new entry still
  shows. Folder lens still follows the tree (existing tests at :707-800).
- CalendarNavigator: `setFileTree` -> no `entries` read; a new dated entry adds a dot.
- AppShell (new `src/tests/lib/app/AppShell.test.ts`, vault open on the Types rail item, Tauri
  `invoke`/window mocked): a tree replacement with the same `.view` files reads no `entries`; a new
  `.view` file and a new typed note still show in the Types navigator.

## Built (differs from the plan above)

- `typeRows` identity must hold too: it is the Types navigator's `rows` prop, and its view-count
  effect re-reads every `.view` on a new identity. So `viewRows` keys on the tree's `.view` paths
  (`viewFilesKey`, a string) and reads the tree untracked.

## Risks / defaults

- `countFiles` (`fs.logic.ts:180`) is pre-existing dead code with tests; left alone (mention only).
- `viewFilesKey` still walks the tree per replacement (`collectViewFiles`); everything after it stops.
