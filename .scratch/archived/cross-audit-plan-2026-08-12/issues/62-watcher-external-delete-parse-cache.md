# Issue 62: The watcher never evicts a `.view` parse-cache entry, so an external delete leaves a stale definition resident

Status: ready-for-agent
Phase: follow-up (post cross-audit)
Source: reviewer follow-up surfaced during the cross-audit run, verified 2026-08-19 by triage.
Blocked by: none

## What

### The cache

"The view parse cache" is `features/type-definitions/view-parse-cache.ts`. It is a **module-level**
`const parseCache = new Map<string, ParseCacheEntry>()` keyed by absolute path, holding
`{ contentHash, yaml, definition }`. It is **not** per-`EditorView` and it does not die with a view,
an editor tab, or a component unmount. That refutes the "it is per-view so the claim is moot"
hypothesis outright. It is also unrelated to the live-preview widget caches (mermaid, math,
collection-block, queryjs session) despite sitting next to them in `teardownVault`.

Cross-cutting note for issue 53 (shared-parse-cache non-determinism): the map is process-shared, so
the concern is legitimate in shape. It is however **not** a cross-test-file leak source here:
`vitest.config.ts` overrides neither `pool` nor `isolate`, so vitest's default per-file module
registry gives every test file a fresh `parseCache`. Within a file it can leak, which is why
`view-parse-cache.test.ts` and `fs.service.test.ts` call `clearAllViewParseCache()` in `beforeEach`;
the only other suite touching the real module, `app-lifecycle.service.test.ts`, seeds and asserts
inside the same `it`, so it is not order-dependent. Do not attribute issue 53's non-determinism to
this map without new evidence.

### The defect

`applyPathChange` (`core/filesystem/path-change.service.ts`) evicts the entry for every path it
retires: it calls `forgetNote(path)` and then `clearViewParseCache(path)` for `from` plus the
snapshotted child paths. That is the in-app delete / rename / move path, wired by 68e313fb
(`fix(type-definitions): clear the view parse cache on delete and teardown`) and moved into the
path-change owner by bb2d1f91.

The watcher does not reach that owner. `core/filesystem/note-change.service.ts::applyNoteChange`,
which the watcher does call, has **no** `clearViewParseCache` in its `kind: 'delete'` branch: that
branch does `clearIndexedEntry`, `fanOut('remove', ...)`, `remove_note_from_index` and the FTS5
removal, nothing more. `clearViewParseCache` has exactly two production call sites in the whole
tree (`git grep` confirms): `path-change.service.ts` and, as `clearAllViewParseCache`,
`app-lifecycle.service.ts::teardownVault`.

**The claim's stated mechanism is wrong and is refuted here.** The defect is not in "the watcher's
deletion branch". A `.view` path never reaches that branch at all:
`core/app-lifecycle/watcher-handler.service.ts::rebuildAllIndexes` narrows to
`mdPaths = filePaths.filter((p) => p.endsWith('.md') || p.endsWith('.markdown'))` before calling
`incrementalUpdateFiles`, and only `incrementalUpdateFiles` ever constructs the
`{ kind: 'delete', source: 'watcher' }` change. A `.view` is filtered out one step earlier. So:

- Putting the clear in `applyNoteChange`'s delete branch would **not** fix this.
- Registering a `NoteChangeConsumer` (the ADR-0003 registration idiom) would **not** fix this either,
  for the same reason: the consumer would never be invoked for a `.view` path.

The only frontend symbol that still sees the `.view` path is `rebuildAllIndexes` itself, whose
`filePaths` filter keeps any basename containing a dot. Both of its branches are blind to the cache:
the incremental branch returns early after `incrementalUpdateFiles`, and the full branch runs
`rebuildIndex` / `buildPropertyIndex` / `buildFrontmatterIconIndex` / `scanFilesForCalendar` /
`markUnlinkedDirty` / `invalidateQueryjsCache` / `clearLinkedContentCache`, none of which touches
`parseCache`. That is where the fix belongs.

### Causal chain, by file:symbol

1. External `rm` of `/vault/Projects.view` (git checkout, git stash pop, a restore, a sync client,
   Finder).
2. `src-tauri/src/vault/watcher.rs` emits `vault-files-changed`.
3. `core/filesystem/fs.watcher.ts::handleChangedPaths` rescans the parent subtree (or `refreshTree`),
   calls `fsStore.setFileTree`, then `notifyListeners(changedPaths)`.
4. `core/app-lifecycle/watcher-handler.service.ts::rebuildAllIndexes` runs. `mdPaths` is empty, so
   the full branch runs. `parseCache` still holds `/vault/Projects.view`.
5. `features/type-definitions/TypeSidebar.svelte` recomputes
   `sortedViewFiles = $derived(sortViewFiles(collectViewFiles(fsStore.fileTree), ...))`; the deleted
   path is gone from that list, so the debounced `updateViewCounts` never calls
   `refreshViewDefinition` for it again. **The only self-healing path in the app cannot reach a
   deleted view.** Nothing else evicts it before `teardownVault`.
6. `typeDefinitionsStore.selectedTypeOrNav` is still `{ kind: 'view', path: '/vault/Projects.view' }`.
   No caller of `setSelection` clears a selection whose file vanished, in-app or externally.
7. On the next re-run of the `TypeNoteList.svelte` effect (any `entriesVersion` bump from
   `core/layout/tauri-listeners.service.ts::registerVaultIndexUpdatedListener`, any
   `collectionStore.propertyIndex` republish, or a remount when the user toggles the sidebar),
   `loadViewNotes` calls `getCachedViewDefinition(viewPath)`, which returns the **stale cached
   definition without disk I/O** and never falls through to `refreshViewDefinition`.

### Repro path, user-visible

Repro A, the divergence that proves causality. Sidebar mode `types`, a `.view` selected and rendered
in the middle panel. Delete the file **from the app** (`deleteItem` -> `applyPathChange` ->
`clearViewParseCache`): the next `loadViewNotes` misses the cache, `refreshViewDefinition`'s
`readTextFile` rejects, `loadViewNotes`'s `catch` sets `notes = []` and the panel empties. Delete the
**same file from outside the app**: the panel keeps listing the deleted view's matches indefinitely.
Same user action, two outcomes, and the parse-cache entry is the only difference between the two
paths.

Repro B, the case 68e313fb already fixed for the in-app path, still open for the external one.
Externally replace a `.view` at the same path with different content (`git checkout <branch>`,
`git stash pop`, a Dropbox/iCloud resync). `rebuildAllIndexes` does not evict, so whichever runs
first wins: `TypeNoteList::loadViewNotes` fires on the effect re-trigger with no debounce and serves
the OLD definition, while `TypeSidebar::updateViewCounts` is debounced 1000 ms before its
`refreshViewDefinition` re-reads disk. The middle panel renders the old query's rows and seeds
`seededViewHash` from the old `getViewContentHash`. The sidebar sweep then fixes the cache but does
not re-run `loadViewNotes`, so the stale rows and the stale toolbar seed survive until an unrelated
`entriesVersion` bump.

Repro B has a write-side tail worth naming: while the stale seed is live, a toolbar edit runs
`persistViewState` -> `type-definitions.service.ts::updateViewQuery`, which reads the NEW file from
disk and patches it with `buildViewYamlUpdates(localGlobalFilters, localViewFilters, localSort)`
seeded from the OLD definition, writing the old filters into the re-created file. The window is
narrow (it closes on the next `loadViewNotes`) and needs a user interaction inside it, which is why
this is filed low and not medium.

Secondary, non-user-visible: every externally deleted `.view` leaks one `ParseCacheEntry` (its raw
YAML plus parsed definition) until `teardownVault`.

### Already fixed?

No. `git log -S"clearViewParseCache" -- src/` returns five commits, the newest being bb2d1f91
(`refactor(filesystem): applyPathChange as the one owner of a note's path changing`); none of them
touches `watcher-handler.service.ts`, which does not import the module at all. Verified against the
current worktree HEAD.

### Existing coverage

None. `src/tests/lib/core/app-lifecycle/watcher-handler.service.test.ts` exercises `rebuildAllIndexes`
across both branches and never imports `view-parse-cache`. The three suites that do assert on the
real cache cover only the paths that already work: `fs.service.test.ts` (in-app `deleteItem`),
`app-lifecycle.service.test.ts` (`teardownVault`), `view-parse-cache.test.ts` (unit behaviour of the
module). A red test is straightforwardly writable at the service level, no component mount required.

## How

### Change

One symbol: `core/app-lifecycle/watcher-handler.service.ts::rebuildAllIndexes`.

Import `clearViewParseCache` from `$lib/features/type-definitions/view-parse-cache` and, after the
self-save / directory-only early return and **before** the incremental-vs-full branch, evict every
changed `.view` path:

```typescript
	// A `.view` never reaches `applyNoteChange` (the mdPaths filter below drops
	// it), so the note-change owner's delete branch cannot evict its parsed
	// definition the way `applyPathChange` does for an in-app delete. Evict here,
	// the only place that still sees the path. Eviction is idempotent and costs
	// at most one re-read, so it is safe for modifies as well as deletes.
	for (const path of filePaths) {
		if (isViewFile(path.split('/').pop() ?? '')) clearViewParseCache(path);
	}
```

Placement is load-bearing: above the `if (mdPaths.length > 0 && ...)` block, because that block
`return`s and would skip the eviction whenever a markdown file changed in the same batch. Do not
duplicate the loop into both branches the way `invalidateQueryjsCache` / `clearLinkedContentCache`
are duplicated.

Reuse `isViewFile` from `$lib/core/filesystem/fs.logic` rather than an inline `endsWith('.view')`;
pass it the **basename**, matching the existing `p.split('/').pop()` idiom in the same function,
because `getFileExtension` is a bare `lastIndexOf('.')` and misreads a path whose directory carries
a dot.

The inward `features/` import is consistent with this file, which already imports `rebuildIndex`,
`buildPropertyIndex`, `buildFrontmatterIconIndex`, `scanFilesForCalendar` and
`clearLinkedContentCache` from `features/` and `plugins/`, and with `path-change.service.ts`, which
imports this exact symbol. Do not build a registration API for this: see `## What`, a
`NoteChangeConsumer` would never fire for a `.view` path.

### Red-first test strategy

Add to `src/tests/lib/core/app-lifecycle/watcher-handler.service.test.ts`:

1. `vi.mock('@tauri-apps/plugin-fs', ...)` with a `readTextFile` mock. The suite does not mock it
   today, and `view-parse-cache.ts` reads through it. Copy the shape used in
   `app-lifecycle.service.test.ts`.
2. Import the **real** `refreshViewDefinition` / `getViewContentHash` / `clearAllViewParseCache`.
3. `clearAllViewParseCache()` in the suite's `beforeEach`, matching `fs.service.test.ts`.
4. Test one: seed with `await refreshViewDefinition('/vault/Projects.view')`, assert
   `getViewContentHash('/vault/Projects.view')` is defined, run
   `await rebuildAllIndexes(['/vault/Projects.view'])`, assert `getViewContentHash(...)` is now
   `undefined`. Red today.
5. Test two, pinning the placement: seed the same entry, run
   `await rebuildAllIndexes(['/vault/Projects.view', '/vault/Note.md'])` so the incremental branch is
   taken, and assert the entry is gone anyway. This is the test that fails if the loop is written
   inside the full-rebuild branch. Set `vaultStore.path` and stub `read_files_batch` on the existing
   `invoke` mock the way the suite's incremental tests already do.
6. Test three: seed `/vault/Keep.view`, run `rebuildAllIndexes(['/vault/Other.view'])`, assert
   `/vault/Keep.view` survives. Guards against a lazy `clearAllViewParseCache()` implementation.

Side channels that would fake a green, check each before trusting the red run:

- `vi.mock('$lib/features/type-definitions/view-parse-cache', ...)`. Four suites in the repo mock
  this module (`TypeSidebar.test.ts`, `TypeNoteList.perf.test.ts`, `TypeNoteList.view.test.ts`,
  `type-definitions.service.test.ts`). Mocking it here makes every assertion vacuous.
- A `clearAllViewParseCache()` placed after the seed instead of in `beforeEach`.
- Asserting `expect(clearViewParseCache).toHaveBeenCalled()` on a spy instead of reading
  `getViewContentHash`. Forbidden by the repo's assertion rule and it would pass against a call
  placed in the wrong branch.
- The self-save guard: `areAllRecentSaves` is mocked to `false` at the top of the suite. If a test
  flips it to `true`, `rebuildAllIndexes` returns before the loop and the test goes green for the
  wrong reason.

Prove each new test red against the unmodified `watcher-handler.service.ts` before writing the fix.

### Must NOT change

- `note-change.service.ts`. Neither `applyNoteChange`'s delete branch, nor `SOURCE_POLICY`, nor the
  `NoteChangeConsumer` registry. The `.view` path never arrives there.
- `path-change.service.ts::applyPathChange` and its `clearViewParseCache` call. The in-app path is
  correct and its `fs.service.test.ts` regression test must keep passing untouched.
- `view-parse-cache.ts` itself. No new exports, no signature changes,
  `getCachedViewDefinition`'s disk fallback stays as is.
- `TypeNoteList.svelte`, `TypeSidebar.svelte`, `type-definitions.store.svelte.ts`. Clearing the
  stale selection when a `.view` disappears, and re-running `loadViewNotes` after the sidebar's
  sweep refreshes the cache, are separate behaviours. If they look worth doing, file a new issue,
  do not widen this one.
- The `mdPaths` filter, the `INCREMENTAL_THRESHOLD`, the self-save guard, and the duplicated
  `invalidateQueryjsCache` / `clearLinkedContentCache` calls in the two branches.
- Any Rust file. The watcher already reports the `.view` path; nothing is missing on that side.
- Root `CLAUDE.md`. No sentence there needs updating for this fix (the "`applyNoteChange` is the ONE
  owner" rule stays true: the `.view` path never reaches it, which is the whole defect). Recorded
  explicitly so the file list for this issue does not carry `CLAUDE.md` and falsely serialize this
  worktree against issue 61.

## Gate

Frontend surface only (`src/lib/` plus `src/tests/`): `pnpm check` + `pnpm vitest run` +
`pnpm build`. No Rust change, so no `cargo test`. No e2e collateral.

Stage only this change's files, verify with `git diff --cached --stat`, one commit carrying the fix
and all three tests, full commit format (Context, Problem, Solution, Behavior, Files with line
ranges). Adversarial review before commit per the folder playbook.

## Comments

### 2026-08-19 - triage revision after adversarial review

One finding applied. Verdict unchanged: confirmed, low, ready-for-agent.

`Must NOT change` now records explicitly that no root `CLAUDE.md` sentence needs updating for this
fix, so the issue's file list must not carry `CLAUDE.md`. Carrying it would falsely serialize this
worktree against issue 61, whose fix legitimately may touch that file.
