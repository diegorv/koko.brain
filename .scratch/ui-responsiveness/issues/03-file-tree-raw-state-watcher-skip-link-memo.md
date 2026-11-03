# 03: The file tree stops paying deep-proxy walks: raw state, modify-only watcher skip, memoized link resolution

**Status:** resolved

Priority: P1 (quick-win bundle; every autosave and every embed drawn)

**What to build:** Three fixes around the 42,925-node `fsStore.fileTree`.

1. **`fileTree` as `$state.raw`** (`src/lib/core/filesystem/fs.store.svelte.ts:6`). The tree is replace-only: every writer assigns a new root (`fs.service.ts:93`, `fs.watcher.ts:184`, `path-change.service.ts:163`, `app-lifecycle.service.ts:367`, `reset()`). The only in-place write is `attachFileCounts` (`fs.logic.ts:178-190`) to `fileCount`, which has no reader. Precedent: `type-definitions.store.svelte.ts:7-10`. The pre-IPC walk in the watcher handler measured about 46 ms; the expected cost on plain objects is about 1 ms.
2. **Watcher modify-only skip** in `handleChangedPaths` (`src/lib/core/filesystem/fs.watcher.ts:122-187`). When every changed path is an existing file node in the tree (segment walk) and still `exists()`, skip resolve, scan, patch and `setFileTree`, but still call `notifyListeners`. Today every autosave runs a subtree rescan (47-88 ms of JS), and a save of a root-level file (kanban, collection, `AGENTS.md` edited by an agent) runs a whole-vault `scan_vault` (185-211 ms on the main thread). Tree times (`modifiedAt`) have one reader, `fileToLensNote` (`lens.logic.ts:679-680`), which never shows them (`:683`), and the watcher always sorts by name.
3. **Memoize `resolveLink` / `listLinkCandidates`** (`src/lib/app/editor-host.ts:59-64`). Today each call flattens the proxied tree and runs `resolveWikilink` (two linear passes). `WikilinkImageEmbedWidget.toDOM` and `loadEmbedContent` call it synchronously (`widgets.ts:545,597`), so each embed drawn costs 30-65 ms, against CLAUDE.md live-preview rule 2. 8 of the 9 docReplaces of 50 ms or more in the baseline session were notes with embeds. Cache `buildResolutionCache(...)` plus the flat path list in a `WeakMap` keyed on the tree object, and resolve with `resolveWikilinkCached`. Do not build it as a `$derived` (an unowned derived re-checks about 170k sources per read). Update the contract comment at `src/lib/core/markdown-editor/editor-host.ts:29-31`, which says the scan is O(N).

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/core/filesystem/fs.store.svelte.ts:6,21,27, src/lib/core/filesystem/fs.watcher.ts:88-187, src/lib/core/filesystem/fs.logic.ts:178-190,314-329, src/lib/app/editor-host.ts:59-64, src/lib/core/markdown-editor/editor-host.ts:29-31, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:545,570,597, src/lib/core/filesystem/wikilink-resolution.logic.ts

- [x] Failing first (raw): a new `// @vitest-environment jsdom` test file, `expect(fsStore.fileTree[0]).toBe(t[0])`. The node environment runs Svelte's server runtime with no proxies, so `fs.store.test.ts:20` already passes and proves nothing
- [x] Guard, green before and after: a `$derived` over `fsStore.fileTree` inside `$effect.root` recomputes after `setFileTree`
- [x] Failing first (watcher): emit `vault-files-changed` with a known file path and `exists` true. No `scan_vault` invoke, `fsStore.fileTree` keeps identity (`toBe`), and the listener still gets the paths
- [x] Negatives that must still rescan: an unknown path, a known path with `exists` false, a new directory, a folder rename, and the batch from `mkdir x; touch x/a; rm x/a`
- [x] Link memo parity with `resolveWikilink`: name collisions, a path-style target, the basename fallback, a missing target
- [x] Link memo freshness: after `setFileTree` with a moved, removed or added file
- [x] Failing first (link cost): fixture nodes whose `path` is an accessor getter with a counter (Svelte does not cache accessors, `proxy.js:183,203`). 50 `resolveLink` calls read `path` fewer than 2x the node count. A `get` trap on a wrapping Proxy would NOT fail today
- [ ] Not verified by the agent: on device, a reading-list note with 14 embeds opens with docReplace under 15 ms

## Notes

- Creation echoes, task toggles and type-rename writes carry a `write_atomic` temp path (`.tmp-<pid>-<seq>`), so they still rescan until Issue 06 filters those paths in Rust.
- The lost-update race in subtree patching (the handler patches a pre-await snapshot, `fs.watcher.ts:157`) is not touched here; Issue 06 rebases the patch after the await.
- Research: `.scratch/ui-responsiveness/research/B-deep-dive.md` (fixes 1, 2), `B-verify.md`, `F-deep-dive.md` (fix 1), `F-verify.md` (test (c) correction).

## Comments

- 2026-11-02, branch `issue/03-file-tree-raw-state-watcher-skip-link-memo`: `fsStore.fileTree` is `$state.raw`; modify-only watcher batches of known files skip the `scan_vault` rescan; editor link resolution is memoized per tree. Fix round after review 1: tree JSDoc names the `fileCount` exception, `LinkCandidates.files` is `readonly`; the uncapped `exists` IPC nit is left for the owner. Tests: full suite at 1c5a4961, 439 files / 10131 passed, 1 skipped, 1 todo, build ok (log `brain.worktrees/test-logs/ui-responsiveness/03-deliver.log`). Reviews: round 1 APPROVED (3 nits), round 2 APPROVED (no findings). On-device docReplace check left to the owner.
