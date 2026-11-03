# Issue 03 discovery

No `spec.md` exists for ui-responsiveness; the Issue and `research/B-deep-dive.md` (fixes 1, 2), `F-verify.md` (test (c)) are the source.

## Files that change

- `src/lib/core/filesystem/fs.store.svelte.ts:6` `fileTree` -> `$state.raw`, JSDoc on why (replace-only; precedent `type-definitions.store.svelte.ts:7-10`). All writers already assign a new root (`fs.service.ts:93`, `fs.watcher.ts:184`, `path-change.service.ts:163`, `app-lifecycle.service.ts:367`, `reset()`); `applyFolderOrder` returns new arrays; `attachFileCounts` writes `fileCount`, which has no reader.
- `src/lib/core/filesystem/fs.logic.ts` new pure `findFileNode(tree, vaultPath, path)`: segment walk from the root, returns the node only when the last segment is a file (`!isDirectory`).
- `src/lib/core/filesystem/fs.watcher.ts:122-187` before `resolveRescanParents`: when every path is a known file node and `exists()` (plugin-fs) is true for each, skip scan/patch/`setFileTree`, bump a new `skippedModifyOnly` counter, still `notifyListeners`. An `exists()` rejection falls through to the rescan. Version check after the await.
- `src/lib/app/editor-host.ts:59-64` `WeakMap<FileTreeNode[], { files, cache }>` keyed on the tree root; `resolveLink` uses `resolveWikilinkCached`, `listLinkCandidates` reuses the memoized flat `files`.
- `src/lib/core/markdown-editor/editor-host.ts:29-31` contract comment: the first call per tree builds an O(N) index, later calls are O(1) until the tree is replaced.

## Tests

- New `src/tests/lib/core/filesystem/fs.store.client.test.ts` (jsdom): `fileTree[0]` identity (red first); derived guard via a new fixture `src/tests/fixtures/file-tree-derived-probe.svelte.ts` (`$effect.root` + `$derived`), green before and after. Prior art: `settings.store.reactivity.client.test.ts` + `settings-effect-probe.svelte.ts`.
- `fs.watcher.test.ts`: mock `@tauri-apps/plugin-fs` `exists`; known file + exists true -> no `scan_vault`, tree `toBe`, listener gets paths (red first). Negatives: unknown path, known path exists false, new directory, folder rename (old + new dir path), `mkdir x; touch x/a; rm x/a` batch (`[x, x/a]`, both unknown).
- `fs.logic.test.ts`: `findFileNode` (nested file, directory -> null, missing, outside vault).
- `editor-host.test.ts` (jsdom already): parity with `resolveWikilink` (collision first wins, path-style target, basename fallback, missing); freshness after `setFileTree` with moved/removed/added file; cost: accessor-getter `path` counter, 50 calls read `path` < 2x node count (red first).

## Plan (one commit each)

1. discovery
2. raw state test (red) + `$state.raw` (green)
3. `findFileNode` + watcher skip with tests
4. link memo with tests, contract comment; targeted checks: `pnpm check`, the four test files.

## Risks / defaults

- Tree `modifiedAt` goes stale on a skipped batch; its only reader (`lens.logic.ts:679`) never shows it.
- Raw state: any future in-place tree mutation would not re-render. Every writer today replaces.
- Default: `exists()` errors are treated as "not modify-only" (rescan), the safe side.
- On-device check (14-embed note docReplace < 15 ms) is not verified by the agent.
