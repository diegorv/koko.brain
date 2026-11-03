VERDICT: APPROVED

Review of `git diff main...HEAD` (b0226c9b, 01efa38f, 80c2a3fc, plus the discovery record 44129c1d) against Issue 03. No `spec.md` exists for ui-responsiveness; the Issue is the source.

## Acceptance criteria

- [met] Failing first (raw): a new `// @vitest-environment jsdom` test file, `expect(fsStore.fileTree[0]).toBe(t[0])`. The node environment runs Svelte's server runtime with no proxies, so `fs.store.test.ts:20` already passes and proves nothing — `src/tests/lib/core/filesystem/fs.store.client.test.ts` starts with `// @vitest-environment jsdom` and asserts `fsStore.fileTree[0]` `toBe(t[0])` (plus the root and a nested child). I ran it against main's source in a throwaway worktree: "hands back the nodes it was given, not proxies over them" fails; on the branch it passes.
- [met] Guard, green before and after: a `$derived` over `fsStore.fileTree` inside `$effect.root` recomputes after `setFileTree` — same file, "recomputes a $derived reader after setFileTree replaces the tree", via `src/tests/fixtures/file-tree-derived-probe.svelte.ts` (`$effect.root` + `$derived` + `$effect`). It passed against main's source and passes on the branch.
- [met] Failing first (watcher): emit `vault-files-changed` with a known file path and `exists` true. No `scan_vault` invoke, `fsStore.fileTree` keeps identity (`toBe`), and the listener still gets the paths — `fs.watcher.test.ts` "skips the scan and keeps the tree for a known file that still exists, and still notifies" asserts no `scan_vault` call, no `refreshTree`, `fsStore.fileTree` `toBe(tree)`, and that the listener gets the paths. Against main it fails on the `scan_vault` assertion (main scans `/vault`), the expected red. It passes on the branch.
- [met] Negatives that must still rescan: an unknown path, a known path with `exists` false, a new directory, a folder rename, and the batch from `mkdir x; touch x/a; rm x/a` — `fs.watcher.test.ts` has a parametrized `still rescans for …` block (unknown file, new directory, folder rename, `mkdir x; touch x/a; rm x/a`, known file batched with an unknown one), plus "still rescans a known file that no longer exists" and "still rescans when the exists check fails". Each asserts a `scan_vault` call, a new tree root and `skippedModifyOnly === 0`. Against main these fail only on the new counter (undefined), as expected. On the branch they pass. Note: Rust's `filter_ancestor_paths` cuts the mkdir batch down to `[x/a]`, which the unknown-path case covers too.
- [met] Link memo parity with `resolveWikilink`: name collisions, a path-style target, the basename fallback, a missing target — `editor-host.test.ts` "matches resolveWikilink on collisions, path-style targets, basename fallback and misses" compares `appEditorHost.resolveLink` with `resolveWikilink` for 10 targets, including `''`. I also read `resolveWikilinkCached` / `buildResolutionCache` against `resolveWikilink`: both do first-path-wins on the lowercase note name, then a basename fallback only when it differs, so they are equivalent for every input.
- [met] Link memo freshness: after `setFileTree` with a moved, removed or added file — "follows setFileTree when a file is moved, removed or added" covers all three. "listLinkCandidates lists the files of the current tree" checks that the shared `files` follow a tree swap.
- [met] Failing first (link cost): fixture nodes whose `path` is an accessor getter with a counter (Svelte does not cache accessors, `proxy.js:183,203`). 50 `resolveLink` calls read `path` fewer than 2x the node count. A `get` trap on a wrapping Proxy would NOT fail today — "reads each node path a bounded number of times across many calls on one tree" uses `Object.defineProperty` accessors on 200 nodes and a `< 2 * files.length` bound. Against main it fails; on the branch it passes.
- [not met] Not verified by the agent: on device, a reading-list note with 14 embeds opens with docReplace under 15 ms — not done, by design: this is the owner's on-device check, and no agent or deliver step can run it.

## Findings

1. **nit** `src/lib/core/filesystem/fs.store.svelte.ts:7`: the new JSDoc says writers "never mutate a node [they] handed over". That is not quite true. `attachFileCounts(currentTree)` (`fs.watcher.ts:218`, and the same call in `app-lifecycle.service.ts`) writes `fileCount` in place on directory nodes still shared with the current root. This is harmless today because nothing reads `fileCount`, but the comment overstates the invariant that `$state.raw` and the editor-host WeakMap memo rely on. Fix: add "except `fileCount`, which has no reader".
2. **nit** `src/lib/core/filesystem/fs.watcher.ts:127`: `allStillExist` sends one `exists` IPC per path with no cap. A large modify-only batch (for example a `git checkout` that touches hundreds of known files) now makes hundreds of parallel IPCs, where the old code made one full `scan_vault`. The result is still correct. Fix (optional, owner's call): send batches above a threshold down the existing rescan path.
3. **nit** `src/lib/core/markdown-editor/editor-host.ts:14`: `LinkCandidates.files` is now the same array the memo holds, and only the contract comment forbids mutating it. Its one caller (`matchFilesForWikilink`) copies before sorting, so nothing is broken. Fix (optional): type it `readonly FileEntry[]`, so the type checker enforces the "never mutate" rule.

## Other checks

- Typecheck: `pnpm check`: 0 errors, 0 warnings (212 files).
- The test verdict rests on these runs, done myself in the worktree:
  - `pnpm vitest run src/tests/lib/app/editor-host.test.ts src/tests/lib/core/filesystem/ src/tests/lib/architecture/`: 23 files, 540 tests passed. This covers `fs.store.client.test.ts`, `fs.store.test.ts`, `fs.watcher.test.ts`, `fs.logic.test.ts` (the `findFileNode` cases), `fs.service*.test.ts`, `wikilink-resolution.logic.test.ts`, and the layer, raw-invoke and pure-logic architecture tests.
  - `pnpm vitest run src/tests/lib/core/markdown-editor/editor-host.test.ts src/tests/lib/features/rail-shell/ src/tests/lib/app/lifecycle/ src/tests/lib/core/markdown-editor/extensions/live-preview/`: 113 files, 1979 passed, 1 skipped. These are the readers of the tree and of `resolveLink`.
  - Red-first probe: a throwaway worktree at `main` with the branch's 3 new or changed test files (and the fixture) had 12 failures, each for the expected reason. The probe worktree was removed afterwards.
- The full suite and `pnpm build` were not run: deliver runs them.
- Traced and found sound:
  - Every tree writer assigns a new root (`fs.service.ts:93`, `fs.watcher.ts:219`, `path-change.service.ts:163`, `app-lifecycle.service.ts:367`, `reset()`), and no component mutates a node.
  - The tree's `modifiedAt` / `createdAt` have one reader, `fileToLensNote`, whose rows always carry a `subtitle`, so `NoteRow.svelte:116` never shows the times.
  - `_order` changes re-sort through `publishContentOrder` -> `loadDirectoryTree`, not through the watcher rescan, so the skip loses no reorder.
  - The file-change listener (`app-lifecycle.service.ts:496`) does not read the tree.
  - App-side renames call `refreshTree()` themselves.
  - `fs:allow-exists` covers the same vault globs as the other plugin-fs calls.
  - `findFileNode` uses the same `vaultPath + '/'` prefix convention as `resolveRescanParents`.
- Scope: nothing outside the Issue's three fixes, their tests and the discovery record. Layer baseline and `BASELINE_SIZE` are untouched.

## Resolution

1. Fixed: the `fileTree` JSDoc in `fs.store.svelte.ts` now names the one exception, `attachFileCounts` writing a directory's `fileCount`, which has no reader.
2. Not changed: the reviewer marks it optional and the owner's call. A threshold that sends large modify-only batches to the rescan path is a new behavior beyond the Issue's acceptance criteria and would need its own test and a chosen cap. The current code is correct, so this is left for the owner to decide.
3. Fixed: `LinkCandidates.files` is `readonly FileEntry[]`, and `matchFilesForWikilink` takes `readonly FileEntry[]` (it already copies before sorting), so the type checker enforces the "never mutate" rule. `pnpm check` is clean, and the wikilink completion, fs store and editor-host tests pass (8 files, 132 tests).
