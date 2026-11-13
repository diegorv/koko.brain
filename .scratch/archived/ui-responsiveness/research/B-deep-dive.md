# B deep dive: whole-vault file-tree rescans (note creation, root-level and per-save watcher events)

Session: `~/Library/Logs/com.diegorv.kokobrain/2026-11-02_14-52-43.log` (17:52:43 to 17:57:29).
Vault: 10,628 notes, 42,925 to 42,930 tree nodes, 10 top-level items (`AGENTS.md`, `CHANGELOG.md`,
`CLAUDE.md`, `Makefile`, `README.md`, `Untitled.kanban`, `_system`, `out`, `skills-lock.json`, `vault`).
Benchmark: `/tmp/ui-resp-bench/B/bench.mjs` (node 26, Svelte 5.57.2 `proxy` imported from the repo's
`node_modules`, synthetic tree of 42,925 nodes, 4,000 or 8,000 dirs, average path 130 chars, 10.5 MB JSON).

VERIFIED = I read the code or the log line. INFERRED = reasoned, not measured.

## Summary

Three costs stack. They have one root cause: the app treats any change to the file tree as "rebuild
the whole tree, then hand it to a deep `$state` proxy".

1. **Every watcher event re-patches the tree, saves included (largest daily cost).** Autosaving an
   existing note changes no tree structure. It still runs `handleChangedPaths`: 47 to 88 ms of
   webview JS (19 events), then a reactive cascade of about 55 to 80 ms (the heartbeat shows it in 3
   cases). That is about 110 to 165 ms of blocked JS per autosave. The benchmark shows why: the same
   walks cost 1.6 to 9 ms on plain objects and 95 to 103 ms through Svelte's deep proxy.
2. **Every note creation awaits a whole-vault `scan_vault` before the note opens.** It took 268 to
   464 ms (4 of 4 creations). 188 to 281 ms of that is a sync Rust command. Per the Tauri docs it
   runs on the native main thread (INFERRED that it freezes the window). The watcher then rescans
   the parent again.
3. **A changed file at the vault root triggers a whole-vault `scan_vault` on every save.**
   `resolveRescanParents` returns `[vaultPath]`, and `patchSubtree` swaps in a fresh full tree.
   Four saves of `Untitled.kanban` cost 185 to 211 ms of Rust each and 237 to 282 ms of handler
   time. The "New File" command creates `Untitled.md` at the root (`commands.ts:86`), so this path
   is the default for a new note until it is moved.

Session total for tree work after startup: about 4.8 to 5.3 s of blocked time in about 4 minutes
(1,450 ms of explicit loads, 1,051 ms of root watcher events, 1,283 ms of subfolder watcher events,
plus about 1.0 to 1.5 s of cascade, INFERRED). Cross-session `scan_vault`: n=77, 17.0 s total,
max 2,426 ms.

## Evidence

### Code (VERIFIED)

- Store: `fileTree` is a deep `$state` (`src/lib/core/filesystem/fs.store.svelte.ts:6`). The setter
  is a plain assignment (`:27`). The Svelte proxy `get` trap creates a `Source` plus a child proxy
  the first time each property is read (`node_modules/svelte/src/internal/client/proxy.js`), so every
  whole-tree walk after a replacement allocates per node. Precedent:
  `src/lib/features/type-definitions/type-definitions.store.svelte.ts:7-10` moved `entries` to
  `$state.raw` because "a deep proxy over 10k+ entries cost ~100-150 ms per refresh".
- `scan_vault` is sync (`#[tauri::command] pub fn`, `src-tauri/src/commands/vault.rs:80-81`) and
  always recursive (`scan_dir`, `:91-156`, recursion at `:138-141`, depth cap `:17`). There is no
  depth or shallow option (`src/lib/contracts/commands.ts:51`). Tauri: "Commands without the async
  keyword are executed on the main thread unless defined with #[tauri::command(async)]"
  (https://v2.tauri.app/develop/calling-rust/, cited in `00-baseline.md`, not re-fetched).
- `loadDirectoryTree` (`src/lib/core/filesystem/fs.service.ts:74-102`): `scan_vault(vaultPath)`, then
  `applyFolderOrder`, `attachFileCounts` (`:92`), `setFileTree` (`:93`), and `countTreeNodes` (`:94`).
  `countTreeNodes` runs even with debug off, because the template literal is evaluated before
  `debug()` is called. `refreshTree` (`:105-110`) always scans the vault root.
- `timeAsync` (`src/lib/utils/debug.ts:46-49`) reads the clock after `await fn()`. So
  "loadDirectoryTree completed in" includes the Svelte flush that `setFileTree` queues as a microtask.
- Creation: `openOrCreateNote` awaits `refreshTree()` (`src/lib/core/note-creator/note-creator.service.ts:119-123`)
  before `openFileInEditor` (`:128`). `createFile` (`fs.service.ts:138`), `createFolder` (`:157`),
  `applyPathChange` for rename, move and delete (`src/lib/core/filesystem/path-change.service.ts:185`)
  and trash restore all await a full `refreshTree`. Typed notes (event creation) reach `createFile`
  through `src/lib/features/type-definitions/type-definitions.service.ts:135`.
- Watcher consumer (`src/lib/core/filesystem/fs.watcher.ts:122-187`):
  - It has no self-save or modify-only check. The only self-save gate is in `rebuildAllIndexes`
    (`src/lib/app/lifecycle/watcher-handler.service.ts:41`), a separate listener that is notified
    after the tree work (`fs.watcher.ts:185`).
  - `resolveRescanParents` (`src/lib/core/filesystem/fs.logic.ts:314-329`) walks the whole tree
    (`collectAllDirPaths`, `:289-302`). It returns `[vaultPath]` when any parent is the root (`:326`).
  - Then `[...fsStore.fileTree]` (`fs.watcher.ts:157`), `scan_vault(parentDir)` (`:162`), and
    `patchSubtree` (`:88-114`, which maps every array and has no early exit, and returns the new
    full tree when `parentPath === vaultPath`, `:94-95`).
  - Then `attachFileCounts` over the whole tree (`:183`) and `setFileTree` (`:184`).
  - `logElapsed` (`:186`) runs before the flush, so the logged handler time excludes the cascade.
- Payload: `VaultFilesChangedPayload` carries only `paths` (`src-tauri/src/vault/watcher.rs:41`).
  The notify closure forwards every event path with no `EventKind` filter (`watcher.rs:256-261`).
- Dead data: `fileCount` is written only at `fs.logic.ts:183-184` and declared at `fs.types.ts:14`.
  No reader in `src/lib` (`tasks.logic.ts` `fileCount` is unrelated).
- Tree times are invisible:
  - `modifiedAt` and `createdAt` on tree nodes are read only by `fileToLensNote`
    (`src/lib/features/rail-shell/lens.logic.ts:679-680`). That function always sets `subtitle`
    (`:683`).
  - `NoteRow` shows times only when `subtitle === undefined`
    (`src/lib/features/note-list/NoteRow.svelte:116`), and RailNoteList passes `note.subtitle`
    (`RailNoteList.svelte:501`).
  - The folder lens keeps tree order and does not sort by time (`lens.logic.ts:695-716`).
  - So for current UI, a pure content save changes nothing in the tree that anyone shows.
- Eager tree consumers (re-run on every replacement):
  - `AppShell.svelte:107-122` `typeRows`, which walks the whole tree through `collectViewFiles`
    (`type-sidebar.logic.ts:296-310`) and is read by the `$effect` at `:139-156` before its gate.
  - `RailNoteList.svelte:128-131` `resolved` (through `lensContext().fileTree`, `:99`).
  - `RailNoteList.svelte:228` `allPaths`, a full `flattenFileTree`.
  - Non-reactive full flattens on every call: `src/lib/app/editor-host.ts:60,64` (link resolution
    and `[[` completion).

### Log (VERIFIED)

Creations, click to note open:

| Time | Op | `scan_vault` root (Rust) | `loadDirectoryTree` | Click to open |
|---|---|---|---|---|
| 17:53:42.995 | `createFile` `Untitled.kanban` (root) | 214 ms | 300 ms | ~304 ms after `create_note` |
| 17:54:52.946 | weekly note `_journal-week-40-2026.md` | 281 ms | 464 ms | 588 ms (`opened file` 53.534) |
| 17:54:56.696 | weekly note | 273 ms | 418 ms | ~530 ms |
| 17:55:15.532 | typed note `_inbox/Event/teste.md` | 188 ms | 268 ms | 433 ms to `created file` |

Breakdown of the 464 ms load, which runs entirely between `create_note` exit (53.055) and
`file created` (53.523):
- Rust scan: 53.060 to 53.341 (281 ms).
- Serialize, transfer and parse of the result: 53.341 to 53.414 (73 ms).
- Order, counts and set: 53.414 to 53.429 (15 ms).
- Reactive cascade with nothing logged: 53.429 to 53.523 (94 ms).

The other loads show cascade gaps of 43 to 98 ms. Each creation is followed about 80 ms to 0.5 s
later by a watcher rescan of the parent: 18-item folder, 0 ms Rust, 86 ms handler.

Watcher events, 23 in total, all `incremental — 1 parents`, 0 full:
- Root parent (4, all `Untitled.kanban`): Rust 185, 211, 195, 211 ms; handler 237, 269, 263,
  282 ms.
- Subfolder (19): Rust 0 ms each; handler 47 to 88 ms. The cost is the same whether the folder
  holds 1, 5, 18 or 24 items, so it is a fixed O(tree) cost.
- Cascade after the handler, inferred from heartbeat ticks (HB is due 250 ms after the previous
  tick, so a late tick means JS was busy):
  - 17:54:09: handler ends 09.475, HB due 09.497, fires 09.552 (stall 305). Busy at least 77 ms
    after the handler.
  - 17:54:37: handler ends 37.117, HB due 37.125, fires 37.182 (stall 307). At least 65 ms.
  - 17:56:47: IPC returns 47.949, HB due 47.954, fires 48.041 (stall 337). At least 92 ms,
    covering the post-IPC handler plus the cascade.
  - Nothing else is logged in those windows.
- Handler split for a subfolder (17:55:16): pre-IPC about 45 ms (`collectAllDirPaths` over the
  proxy), post-IPC 36 ms (patch, counts and set).
- The heartbeat kept ticking during the root scans (e.g. HB alive at 53.116 and 53.395 inside the
  53.060 to 53.341 scan). So the Rust scan does not block the webview JS thread. It blocks the
  thread that runs the command (main thread per the Tauri docs).

### Benchmark (`/tmp/ui-resp-bench/B/bench.mjs`, V8, median of 5)

| Operation over 42,925 nodes | Plain objects (`$state.raw`) | Svelte deep proxy (today) |
|---|---|---|
| Watcher handler JS (resolve parents + patch + file counts) | 1.6 ms (4k dirs), 9.3 ms (8k dirs) | 103 ms (4k), 95 ms (8k) |
| `collectAllDirPaths`, first read after replacement | 0.9 ms | 31 to 57 ms |
| `collectAllDirPaths`, second read | 0.9 ms | 17 to 33 ms |
| `flattenFileTree().map(path)` (RailNoteList `allPaths`, editor-host) | 3.2 ms | 74 to 101 ms (cold), 50 ms (warm) |
| `collectViewFiles` + flatten (cascade simulation) | ~5 ms | 103 to 112 ms |
| Full load post-parse (counts + proxy + count) | <1 ms | 44 to 60 ms |
| `JSON.parse` of the 10.5 MB tree | 11 to 24 ms | same |
| `Set.has` modify-only check per event | <0.1 ms | n/a |

The proxy numbers match the observed 47 to 88 ms handler and the 43 to 98 ms cascade in WebKit
(INFERRED: JSC and V8 differ in absolute speed, but the ratio of 10 to 50x is the point).

## Root cause

1. **A deep reactive proxy over a 43k-node, replace-only structure.** Every writer replaces the tree.
   Nothing relies on per-node reactivity (`fileCount` writes go unread). Yet every walk, by the
   watcher, the loaders or consumers, pays proxy traps and allocations. This turns 2 to 10 ms of
   work into 50 to 110 ms per pass, with 2 to 4 passes per event.
2. **The watcher has no notion of "modify".** `handleChangedPaths` treats a content save like a
   structural change. It runs before (and separately from) the self-save gate that the index
   listener already uses.
3. **"Refresh" means "rescan the vault root".** `refreshTree` has no subtree form. The root parent
   maps to a recursive whole-vault scan, because `scan_vault` has no shallow mode. Creation, rename,
   move, delete and restore all await it, though the watcher already knows how to patch one subtree.
4. **`scan_vault` is a sync command**, so each whole-vault scan holds the native main thread for
   185 to 300 ms (max 2.4 s cross-session). This is the same class as finding A.

## Impact

| Trigger | Thread | Per event | Frequency | What the user sees |
|---|---|---|---|---|
| Autosave of any existing note (subfolder) | webview JS | ~110 to 165 ms (47 to 88 handler + ~55 to 92 cascade) | Every save: 2 s after typing stops (500 ms for frontmatter). 19 in this 4-minute session | Typing or scroll hitch right after each autosave. Contributes to 3 of the session's 300+ ms HB stalls |
| Save of a root-level file | native main (185 to 211 ms) + JS (~50 to 70 ms + cascade) | ~240 to 280 ms + cascade | Every save while a note sits at the root. "New File" puts notes there | Window unresponsive about 0.2 s (INFERRED), then a JS hitch |
| Note creation (weekly, daily, typed or event, quick capture, New File, kanban, canvas) | native main 188 to 281 ms + JS ~150 to 190 ms | 268 to 464 ms before the note opens | Several times a day | Click to note opens in 0.43 to 0.59 s, then a second hitch ~0.5 s later from the watcher rescan |
| Rename, move or delete | same as creation (no samples this session) | ~300 to 460 ms, INFERRED | Occasional | Old name stays in the explorer until the rescan lands (no optimistic patch for rename or move) |

`impact_score` 6: no multi-second freezes from this finding in this session. But there is a
sub-second hitch on every autosave, and a 0.3 to 0.6 s delay on every creation, both daily.

## Fixes (ranked by gain)

### 1. `fileTree` as `$state.raw` (quick-win)

- **Change:** `fs.store.svelte.ts:6` `$state.raw<FileTreeNode[]>([])`.
- **Gain:** the watcher handler drops from 47 to 88 ms to an estimated 2 to 10 ms. The cascade walks
  (`typeRows`, `allPaths`, `resolved`) drop from ~70 to 110 ms to ~5 ms. Full load post-IPC saves
  ~40 to 60 ms. `editor-host` flattens per `[[` keystroke drop from ~50 to 100 ms to ~3 ms. This
  helps every path in this finding, and the tree consumers in other findings.
- **Files:** `src/lib/core/filesystem/fs.store.svelte.ts`, `src/tests/lib/core/filesystem/fs.store.test.ts`.
- **Risks:**
  - In-place node mutation stops being reactive. The only one is `attachFileCounts`, whose output is
    unread. VERIFIED no `.children.push` or `node.x =` on tree nodes in `src/lib` (the
    `tags.logic.ts:75` hit is the tag tree).
  - Unchanged branches keep their identity, so keyed `{#each}` rows in `FilesNavigator` skip
    updates for untouched nodes. That is desired.
  - No getter, store or `.logic.ts` contract changes. CLAUDE.md rule 3 (getters) holds.
- **Test (fails today):**
  `const t = [dirNode]; fsStore.setFileTree(t); expect(fsStore.fileTree).toBe(t); expect(fsStore.fileTree[0]).toBe(t[0]);`.
  The deep proxy returns a different identity. Add a derived-consumer test: a `$derived` over
  `fsStore.fileTree` inside `$effect.root` re-computes after `setFileTree(newTree)` (keeps
  reactivity on replacement).

### 2. Skip the tree patch for modify-only watcher batches (quick-win)

- **Change:** in `handleChangedPaths`, before `resolveRescanParents`:
  - If every changed path is (a) an existing file node in the tree, found by a segment walk from
    the root (O(depth x siblings), not a whole-tree Set), and (b) still on disk (`exists()`, one
    cheap plugin-fs call per path, at most a few), skip the scan, patch and `setFileTree`.
  - Still call `notifyListeners(changedPaths)`.
  - Count it as a new `skippedModifyOnly` counter.
- **Variant:** gate on `areAllRecentSaves` as well, to limit it to app saves. The general rule above
  also covers external editors and agents editing vault files. I prefer the general rule.
- **Gain:** removes the ~110 to 165 ms JS per autosave entirely. For a root-level file it also
  removes the 185 to 211 ms whole-vault native scan per save. In this session: 4 root events
  (~1.05 s plus cascade) and most of the 19 subfolder events (~1.3 s plus cascade).
- **Files:** `src/lib/core/filesystem/fs.watcher.ts`, `src/lib/core/filesystem/fs.logic.ts` (pure
  `findFileNode(tree, vaultPath, path)`), `src/tests/lib/core/filesystem/fs.watcher.test.ts`,
  `fs.logic.test.ts`.
- **Risks:**
  - Tree `modifiedAt` goes stale for non-Markdown files. No visible reader today (see Evidence).
    Any future UI that shows tree times must patch them.
  - A create batch carries the parent dir path (`paths: 2`), which is not a file node, so it still
    rescans as today.
  - A delete of a tracked file fails `exists()` and still rescans.
  - Rename emits both paths. The new one is not in the tree, so it rescans.
  - Does not touch `applyNoteChange` or `vaultIndexVersion`: those run in the index listener, not
    here.
- **Test (failing first):** emit `vault-files-changed` with the path of a file already in the tree
  (mock `exists` true). Expect no `scan_vault` invoke, and `fsStore.fileTree` to be the same array
  (`toBe`). Expect the `onFileChange` listener called with the paths. Plus a negative case: an
  unknown path, and a known path with `exists` false, both still rescan.

### 3. Targeted subtree refresh instead of `refreshTree()` after app-initiated changes (small, about 1 to 2 days)

- **Change:**
  - Extract the incremental branch of `handleChangedPaths` into an exported
    `refreshTreeAt(paths: string[])` in `fs.watcher.ts` or `fs.service.ts`: `resolveRescanParents`,
    then `scan_vault(parent)`, `applyFolderOrder`, `patchSubtree` and `setFileTree`.
  - Use it in `openOrCreateNote` (`note-creator.service.ts:120`), `createFile` (`fs.service.ts:138`),
    `createFolder` (`:157`), `duplicateItem` (`:280`), trash restore (`trash.service.ts:156`), and
    rename, move and delete (`path-change.service.ts:185`, with `[from, to]`).
  - `resolveRescanParents` already walks up to the nearest ancestor in the tree, which covers
    `create_folder` creating new dirs.
- **Gain:** a creation in a nested folder goes from 268 to 464 ms to an estimated 30 to 60 ms:
  Rust 0 ms, IPC plus patch ~5 to 10 ms with fix 1, plus the cascade. The 188 to 281 ms native
  freeze per creation goes away. Rename and move show the new name about 0.3 s sooner.
- **Gap:** a root-level parent (New File, `Untitled.kanban`) still maps to a whole-vault scan.
  That needs fix 4.
- **Files:** `fs.service.ts`, `fs.watcher.ts`, `note-creator.service.ts`, `path-change.service.ts`,
  `trash.service.ts`, and their tests in `src/tests/lib/core/filesystem/` and
  `src/tests/lib/core/note-creator/`.
- **Risks:**
  - `applyPathChange` ordering: the child snapshot before `diskOp` (`:140-142`), consumers before
    the link rewrite, `rename_note` before the `forgetNote` sweep. The refresh stays at the same
    point in the sequence.
  - `refreshTree` has a `fsStore.startLoading()` and `stopLoading()` pair. Check whether anything
    shows a spinner off `isLoading`.
  - The watcher echo still arrives about 0.5 s later. With fix 2 it is skipped only for modify-only
    batches, so creation still costs one cheap subtree pass.
  - `note-creator.service.test.ts:90,351-364` asserts on `refreshTree`, so update it to the new
    helper and assert on the resulting `fsStore.fileTree` (real store, not a call count).
- **Test:** `openOrCreateNote` for `vault/notes/2026/09-Sep/new.md` invokes `scan_vault` with
  `path` equal to the parent dir (not the vault root). Afterwards `fsStore.fileTree` contains the
  new node under that folder, and sibling branches keep identity.

### 4. Shallow root refresh, so a root-level parent stops meaning a whole-vault scan (medium)

- **Change:**
  - Add an optional `depth` (or a new `list_dir` command) to `scan_vault`.
  - For the root parent: list the root one level deep, then reuse each existing directory node's
    `children` from the current tree.
  - Scan only directories that are new, recursively. They are small or freshly created.
  - This is an additive Rust command, or an arg change in `src/lib/contracts/commands.ts:51,202`.
    `FileNode` is unchanged, so there is no ts-rs regeneration unless a DTO is added. The gate is
    Both: `cargo test` plus the frontend gate.
- **Gain:** removes the remaining whole-vault scans for root-level creates and external
  root-level changes. Fix 2 already covers root saves: 185 to 214 ms of native main thread plus
  ~25 to 70 ms of JS each.
- **Risks:**
  - A directory renamed at root by an external tool looks like a new dir and gets a full subtree
    scan. That is correct, just slower.
  - Folder-order (`applyFolderOrder`) must apply to the merged root list.
- **Test:** Rust: a shallow scan returns the direct children with no `children` for dirs. TS: a
  root-level change merges the root list and keeps `vault`'s children array identity.

### 5. `scan_vault` as an async command (quick-win; overlaps finding A)

- **Change:** `#[tauri::command(async)]` on `scan_vault` (`vault.rs:80`). The args are already
  owned `String`s, and the body holds no lock.
- **Gain:** the scans that remain (startup, fallback full refresh, `publishContentOrder`, and the
  root case until fix 4 lands) run on the async runtime instead of the native main thread. That
  removes 185 to 300 ms (max 2.4 s) native freezes. The window freeze itself is INFERRED from the
  docs, not measured.
- **Files:** `src-tauri/src/commands/vault.rs`. Rust tests for `scan_vault` stay as they are.
- **Risks:**
  - Scans can now run concurrently with other commands. They are read-only filesystem walks, so
    this is fine.
  - Ordering between two overlapping TS `loadDirectoryTree` calls is already unguarded today (last
    writer wins). The async change can widen that window. Consider a sequence number in
    `loadDirectoryTree`.
- **Test:** none can prove main-thread placement in unit tests. Verify with a manual check: during
  a creation, the native window still responds (drag or resize). Existing Rust tests cover
  behavior.

### 6. `publishContentOrder`: re-order in memory instead of rescanning (small)

- **Change:** `tauri-listeners.service.ts:203` calls `loadDirectoryTree(vaultStore.path)` when `_order`
  changes. Replace it with
  `fsStore.setFileTree(applyFolderOrder(fsStore.fileTree, fsStore.folderOrder, vaultPath, vaultPath, newOrder))`.
  This is exactly what startup step 4b does (`app-lifecycle.service.ts:364-367`).
- **Gain:** one whole-vault scan (~270 to 460 ms) avoided per `_order` change. The trigger did not
  fire in this session, so the frequency is unknown.
- **Risks:**
  - The full scan here also served as a catch-up refresh. The watcher still patches structure, so
    nothing is lost (INFERRED).
  - It needs fix 1, or the in-memory reorder pays the proxy walk (~50 ms).
- **Test:** an index-updated payload whose delta changes an `_order` value re-sorts `fsStore.fileTree`
  and does not invoke `scan_vault`.

### 7. Drop the per-event whole-tree walks with no reader (small, after fix 1 it is ~1 ms)

- **Change:**
  - `attachFileCounts` (`fs.watcher.ts:183`, `fs.service.ts:92`, `app-lifecycle.service.ts:366`):
    the only writer of `fileCount`, which has no reader. CLAUDE.md requires the caller trace before
    removal. Trace done: writes at `fs.logic.ts:183-184` only, no reads in `src/lib`. Tests in
    `fs.logic.test.ts` cover the function itself.
  - `countTreeNodes` inside the template literal at `fs.service.ts:94`: guard it, or move it
    behind the debug flag.
- **Gain:** with the proxy ~15 to 30 ms per event. With fix 1, ~1 ms. Do it only alongside fix 1
  or fix 2.

### 8. Narrow spurious tree dependencies in consumers (medium, lower value after fix 1)

- **Changes:**
  - `RailNoteList.svelte:99`: pass `fileTree` only for the folder lens.
  - `CalendarNavigator.svelte:56`: `noteDateCounts` never reads it.
  - `AppShell.svelte:117`: `typeNavigatorRows` does not read the tree.
  - Memoize `flattenFileTree` per tree identity for `editor-host.ts:60,64` and `allPaths`.
- **Gain:** fewer derived re-runs per replacement, about 5 ms after fix 1. It stops the cascade
  from growing as consumers are added.

## Quick wins

1. Fix 1, `$state.raw` for `fileTree`: one line plus the identity test. Expected about 10x less JS
   per tree event (bench: 95 to 103 ms down to 2 to 9 ms for the handler walks).
2. Fix 2, the modify-only skip in `handleChangedPaths`: about 20 lines plus a pure helper and
   tests. Expected 0 ms tree work per autosave (today 110 to 165 ms JS), and no whole-vault scan
   per root-level save (today ~240 to 280 ms).
3. Fix 5, `#[tauri::command(async)]` on `scan_vault`: one attribute. It moves every remaining
   whole-vault scan off the native main thread. The gain is INFERRED (no native-thread sampling in
   the logs).

Fix 3 is the next step, for creation latency. It is small, not a quick-win, because it touches
`applyPathChange` ordering and five call sites.

## Open questions

- Native freeze: is the window really unresponsive during the 185 to 300 ms sync scans? The logs
  cannot show it (HB runs in the WebContent process). This needs a manual drag test during a
  creation, or an Instruments sample.
- The cascade split (which consumer costs what in the 43 to 98 ms after `setFileTree`) is inferred
  from the benchmark and HB gaps, not profiled. A WebKit timeline of one autosave would confirm it.
- Real directory count of the vault is unknown. The benchmark brackets it with 4k and 8k dirs.
- 17:53:44.050: the first watcher batch after creating `Untitled.kanban` (`paths: 2`) ran a full
  `rebuildAllIndexes` (381 ms, a second whole-vault `scan_vault_v2_cached`). `Untitled.kanban` was
  marked as a recent save, so the second path had a dot in its name and was not a self-save. It is
  unidentified, because the batch paths are not logged. Also, a non-Markdown change that is not a
  self-save always takes the full rebuild (`watcher-handler.service.ts:49-53`). That belongs to the
  index side, not the tree, but it is the same trigger.
- `contentOrder` size for this vault (whether `applyFolderOrder` runs on each patch) was not
  checked.
- Rename, move and delete timings: none were logged in this session.
