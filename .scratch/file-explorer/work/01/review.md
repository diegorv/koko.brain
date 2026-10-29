VERDICT: APPROVED

# Review: file-explorer 01, files created inside a new folder outside the app

Reviewed `git diff main...HEAD` on `issue/file-explorer-01-watcher-new-folder-tree` (commits 38ccf2c6, 18ece5d9, 7e5bf22b).

## Checks run by the reviewer

- `pnpm check`: 211 files, 0 errors, 0 warnings (log: `.claude/worktrees/test-logs/file-explorer-01-review-check.log`).
- `pnpm vitest run src/tests/lib/core/filesystem/ src/tests/lib/core/app-lifecycle`: 11 files, 439/439 passed (log: `.claude/worktrees/test-logs/file-explorer-01-review-tests.log`).
- Red probe: with `fs.watcher.ts` temporarily restored from `main` (helper kept, then `git checkout HEAD --` the file; worktree clean afterwards), `fs.watcher.test.ts` fails 4 of the new tests (chain of new folders, new folder under vault root, dedupe of walked-up parents, folder order on walked-up ancestor), 28 pass (log: `.claude/worktrees/test-logs/file-explorer-01-review-probe-red.log`).

The test verdict rests on `src/tests/lib/core/filesystem/fs.watcher.test.ts`, `src/tests/lib/core/filesystem/fs.logic.test.ts` and the rest of `src/tests/lib/core/filesystem/` plus `src/tests/lib/core/app-lifecycle/` (the only other importer of `fs.watcher.ts`).

## Acceptance criteria

- [x] **Test written and seen failing first: `<existing>/new-a/new-b/file.md` makes `new-a`, `new-b`, `file.md` appear in `fsStore.fileTree`.** Met. `fs.watcher.test.ts` "shows files created inside a chain of new folders by rescanning the nearest existing ancestor" asserts the single `scan_vault` of `/vault/docs`, no `refreshTree`, and the three nodes in the store tree. The red probe above shows it fails against main's watcher.
- [x] **A file created in an existing folder still rescans only that folder.** Met. `fs.watcher.test.ts` "still rescans only the folder itself when it is already in the tree" (scans exactly `/vault/docs/sub`), plus `fs.logic.test.ts` "keeps a parent that is already in the tree".
- [x] **Walked-up parents are deduplicated, and more than 5 distinct parents after the walk-up still trigger the full refresh.** Met. "deduplicates walked-up parents so many new folders under one ancestor stay incremental" (6 new folders -> one scan, `incrementalRefreshes` 1) and "performs full refresh when more than 5 distinct parents remain after the walk-up" (no scan, `refreshTree` called, `fullRefreshes` 1). Unit tests cover dedupe, nested-parent drop and root collapse. The count is taken after the walk-up and dedupe (`fs.watcher.ts:148-151`).
- [x] **Folder order / content order is still applied to the rescanned subtree.** Met for folder order: "applies folder order to the subtree of the walked-up ancestor" sets order on the nested key `docs/new` while the rescanned dir is `/vault/docs`, and the mock returns the opposite order, so the test only passes if `applyFolderOrder` ran on the walked-up subtree. Content order goes through the same unchanged call (`fs.watcher.ts:171-173`) but has no test (finding 1).

## Correctness review

- Walk-up termination: `inVault` guarantees the parent is the vault root or under `vaultPath + '/'`, and each `getParentPath` step strips one segment, so the loop ends at `vaultPath`. Paths with `//`, a trailing-slash vault path, or backslash paths are skipped by `inVault` before the loop, so no infinite loop.
- Dedupe uses `q + '/'`, so `/vault/docs2` is not swallowed by `/vault/docs`.
- `scan_vault` is recursive (`src-tauri/src/commands/vault.rs:80-138`), so rescanning an ancestor covers the dropped nested parents; `patchSubtree` already handles `parentPath === vaultPath` by replacing the root (`fs.watcher.ts:93-95`).
- Folders `scan_dir` leaves out of the tree (dot-prefixed, symlinks, depth >= 64) are either filtered by the Rust watcher (dot dirs) or not reported under the vault (symlink targets), so no steady stream of events walks up to an expensive root rescan.
- The two edited pre-existing ">5 parents" tests keep their premise (six folders the tree already has) and assertions; one gains an extra `refreshTree` assertion. Nothing was weakened.
- Layer rules: the helper is pure, lives in `fs.logic.ts`, imports nothing new, has JSDoc. Tabs used. Every changed source file has its test file updated. No scope creep.

## Findings

1. **Low** - `src/tests/lib/core/filesystem/fs.watcher.test.ts:537` - The AC names "folder order / content order", but only folder order is tested on the walked-up subtree; no watcher test sets `fsStore.setContentOrder`. Fix: add a test that sets a content order (`fsStore.setContentOrder(new Map([...]))`) with an empty folder order and asserts the files in the walked-up rescanned subtree come out in that order. Non-blocking: the content-order call is unchanged code.
2. **Nit** - `src/lib/core/filesystem/fs.logic.ts:282` - `[...parents]` is rebuilt inside the `filter` callback for every element. Fix: hoist `const list = [...parents];` and filter `list` against itself. Cost is negligible at the sizes involved (at most a few hundred parents), so optional.
3. **Info, no change required** - `docs/adr/0017-file-watcher-incremental-hidden-filter.md:29` and `docs/adr/0031-native-rust-vault-watcher.md:31` describe the rescan set as "parent directories containing changed files". ADRs are decision records and their line refs are already stale; mention the walk-up only if the deliver step touches them anyway.

## Not verified

- Not exercised in the running Tauri app with real folders copied in from Finder/shell; the fix is verified against a mocked `scan_vault` only.
