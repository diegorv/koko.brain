VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: for each consumer, a tree replacement that does not change the data it uses does not recompute it. Assert through the consumer, not by spying on `.logic.ts` (CLAUDE.md rule 1): a recompute counter in `$effect.root` over the derived, or the derived value keeping identity across such a `setFileTree` — There is one test per consumer, each mounting the real component over real stores and counting reads of the store's `entries` getter with a spy that calls through to the real getter (the same approach RailNoteList.test.ts already used). No `.logic.ts` is spied on. The tests: `src/tests/lib/app/AppShell.test.ts:85` ("does not rebuild the rows when the tree is replaced with the same view files"), `RailNoteList.test.ts:177`, `CalendarNavigator.test.ts:131`. I checked by putting each regression back by hand and then restoring the files (`git checkout`). (1) `fileTree: fsStore.fileTree` back in the AppShell `typeNavigatorRows` context fails the AppShell test with "Number of calls: 2". (2) Tracking the tree in `viewRows`, which changes `typeRows` identity, fails it as well. So the test also guards the identity that the Types navigator's view recount depends on. (3) A plain `fileTree:` property in place of the RailNoteList getter fails its test. (4) `fileTree` back in the CalendarNavigator context fails its test.
- [met] Each consumer still updates when a relevant change happens (new file in a type folder, new dated note) — AppShell.test.ts:97 (a new `.view` file in a subfolder shows up) and :104 (a new note of a type raises the Project count to 2). RailNoteList.test.ts:189 (a new entry shows in the Inbox list after the tree replacement). CalendarNavigator.test.ts:142 (a new dated note adds the 2026-11-09 dot). The folder lens still follows the tree through the getter: RailNoteList.test.ts:812 ("hides New here once the picked folder is gone") and the "creates the New here note" test, both green.
- [met] `fileCount` removal: grep shows no reader; the tree tests stay green — `grep -rn "attachFileCounts\|fileCount"` over src/lib, src/tests, docs, e2e and src-tauri/src finds only the unrelated Tasks `fileCount` stat. The fs.logic.test.ts diff removes only the `describe('attachFileCounts')` block and its import. fs.logic, fs.service, fs.watcher, fs.store, fs.store.client, fs.service.race-audit and app-lifecycle.service tests pass.

## Findings

1. nit, src/lib/app/AppShell.svelte:112 — `viewRows` is the only one of the new deriveds without a JSDoc line, against the CLAUDE.md convention for state variables. Fix: add one, e.g. "The Views rows, rebuilt from the tree (untracked) only when its `.view` paths or the entries change".
2. nit, src/tests/lib/app/AppShell.test.ts:85 — The "no recompute" assertion counts every `typeDefinitionsStore.entries` read in the whole mounted shell (RailNoteList and TypesNavigator included), not just `typeRows`. The probes show it catches each regression in this Issue. The catch: a later, unrelated consumer that reads entries on a tree change would fail this test even though `typeRows` is fine. Fix (optional): also assert that the rendered row elements are the same DOM nodes before and after the `setFileTree`.
3. nit, src/lib/features/rail-shell/RailNoteList.svelte:231 — `allPaths` still flattens the whole tree on every replacement, whatever the lens. It really does depend on the tree and the Issue does not list it, so it is out of scope here. It is noted only as a candidate if Issue 05's timers show the per-replacement walks still matter. The same goes for the build report's own note that `viewFilesKey` walks the tree once per replacement, which is no worse than before (the old `viewNavigatorRows` walked it too).

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Test files, run with `./node_modules/.bin/vitest run`, all passing. My test verdict rests on these:
  - src/tests/lib/app/AppShell.test.ts
  - src/tests/lib/features/rail-shell/RailNoteList.test.ts
  - src/tests/lib/features/rail-shell/RailNoteList.view.test.ts
  - src/tests/lib/features/rail-shell/TypesNavigator.test.ts
  - src/tests/lib/features/rail-shell/lens.logic.test.ts
  - src/tests/lib/plugins/calendar/CalendarNavigator.test.ts
  - src/tests/lib/plugins/calendar/day-lens.logic.test.ts
  - src/tests/lib/core/filesystem/fs.logic.test.ts, fs.service.test.ts, fs.watcher.test.ts, fs.store.test.ts, fs.store.client.test.ts, fs.service.race-audit.test.ts (with the 7 above: 13 files, 574 tests)
  - src/tests/lib/app/lifecycle/ and src/tests/lib/architecture/ (11 files, 188 tests)
- The four regression probes above (each one fails the targeted test). After them the worktree was restored to clean.
- Not run here: the full suite and `pnpm build`, which are deliver's to run. No layer-baseline or composition-root change in the diff.

## Correctness notes (no finding)

- `viewFilesKey` holds paths only. `ViewFileEntry.name` comes from the path's basename and the label from `entriesByPath`, which is still tracked, so a key on paths loses nothing.
- The pick-check `$effect` no longer re-runs on a tree replacement. `stepTypesPickCheck` depends only on vaultPath, indexReady and entriesVersion, and its folder fix reads the tree untracked, so when it runs is unchanged.
- The RailNoteList getter is read lazily by `resolveViewLens` calls in the async view effect. `resolveViewLens` never reads `fileTree`, and nothing spreads or clones the context.

## Resolution

1. Fixed: `viewRows` in src/lib/app/AppShell.svelte has the suggested JSDoc line.
2. Rejected: a DOM-node identity check would not prove the rows were not recomputed. Svelte's `{#each}` keeps the existing row elements when a rebuild yields equal rows (keyed by the same key, or reused by index), so the nodes are the same before and after `setFileTree` whether or not `typeRows` re-ran. It adds no signal and does not remove the brittleness the finding names; the `entries` getter spy stays the check.
3. Rejected as out of scope, as the review says: `allPaths` truly depends on the tree and the Issue does not list it. A candidate only if Issue 05's timers show the per-replacement walks matter.
