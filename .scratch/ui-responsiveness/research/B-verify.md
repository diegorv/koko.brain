# B verify: adversarial review of B-deep-dive.md

Verdict: **partially confirmed**. The root cause holds: a deep `$state` proxy over a replace-only tree, a
watcher with no modify-only path, and `refreshTree` meaning a root rescan. The fix direction holds too.
Several numbers, one mechanism claim, one fix (6) and the Fix 1 red test are wrong. One cost on the
same trigger was missed: the `write_atomic` temp file.

VERIFIED = I read the code or the log line myself. INFERRED = reasoned, not measured.

## What survives (VERIFIED)

- `fileTree` is a deep `$state` (`fs.store.svelte.ts:6`), replaced only via `setFileTree` (`:27`). The
  `$state.raw` precedent is at `type-definitions.store.svelte.ts:7-10`.
- In-place mutation of tree nodes: none in `src/lib`, other than `attachFileCounts`
  (`fs.logic.ts:183`). The grep for `.children.push/splice/sort` and `node.<field> =` matched only
  `tags.logic.ts:75` (the tag tree). `fileCount` has no reader (`TasksView`/`tasks.logic` `fileCount`
  is a different field).
- `handleChangedPaths` (`fs.watcher.ts:122-187`) has no modify-only or self-save gate. It always runs
  `resolveRescanParents` -> `collectAllDirPaths` (`fs.logic.ts:314-329`, `:289-302`), `scan_vault`,
  `patchSubtree`, `attachFileCounts` and `setFileTree`. Root parent: whole-vault scan
  (`fs.logic.ts:326`, `fs.watcher.ts:94-95`). The only self-save gate is
  `watcher-handler.service.ts:41`.
- `refreshTree` always loads the root (`fs.service.ts:105-110`). Awaited at
  `note-creator.service.ts:120`, `fs.service.ts:138,157,280`, `path-change.service.ts:185` and
  `trash.service.ts:157` (the deep dive says 156).
- `scan_vault` is a sync `#[tauri::command] pub fn` with no state or lock and no depth option
  (`vault.rs:80-90`, recursion at `:138-141`).
- Tree `modifiedAt`/`createdAt` have one reader, `fileToLensNote` (`lens.logic.ts:679-680`). It always
  sets `subtitle` (`:683`, and `FILE_KIND_LABELS` `:634-643` covers every kind), so `NoteRow.svelte:116`
  never shows tree times. The watcher and loads always pass `sortBy: 'name'`.
- Log numbers match. 23 watcher events, all incremental. Root handler times are 237/269/263/282 ms
  (sum 1,051) with Rust 185/211/195/211. The 19 subfolder handlers run 47-88 ms (sum 1,283). The
  four creation loads are 300/464/418/268 ms (sum 1,450) with Rust 214/281/273/188.
- The proxy cost in the handler is real. Pre-IPC is about 46 ms (17:54:07.440 to the `scan_vault`
  enter at 07.486), and that is essentially `collectAllDirPaths`. On plain objects that walk is
  O(dirs x depth) Set adds, about 1 ms.

## Corrections

1. **The second path in a creation batch is not the parent dir.** `filter_ancestor_paths`
   (`watcher.rs:88-99`) drops any path that is an ancestor of another path in the burst, and the buffer
   is a `HashSet` (`watcher.rs:160`). `create_note` writes through `write_atomic`
   (`vault.rs:899`). That writes `${path}.tmp-<pid>-<seq>` and then renames it
   (`utils/fs.rs:26-28`). The name is not dot-prefixed, so the hidden filter lets it through.
   INFERRED, but every log fact fits:
   - Every creation batch has rawEvents +2 (17:53:43.748, 17:54:53.659, 17:54:57.409, 17:55:16.286).
   - Saves go through plugin-fs `writeTextFile` (`editor.service.ts:169`) and show +1.
   - `areAllRecentSaves` failed although `markRecentSave(filePath)` ran
     (`note-creator.service.ts:104`, `fs.service.ts:130`).

   This answers open question 4 (see missed risk 1).
2. **"Four saves of Untitled.kanban"** is really 1 creation echo (17:53:43.748, paths: 2) plus 3 saves.
   The "19 subfolder autosaves" are 16 saves plus 3 creation echoes.
3. **Root-level save cost is double counted.** The "237-282 ms of handler time" already includes the
   185-211 ms Rust scan the handler awaits. The heartbeat stayed alive inside the scan (HB at
   17:53:43.720, scan 43.536-43.721). Webview JS per root save is about 26-71 ms plus the cascade, and
   the native main thread spends 185-211 ms (INFERRED).
4. **The "4.8-5.3 s of blocked time" total mixes threads.**
   - Native main thread: about 1.76 s of `scan_vault` (956 ms in creation loads, 802 ms in root echoes).
   - Webview JS: about 2.0 s measured (creation loads about 494 ms after Rust, root events about
     249 ms, subfolder 1,283 ms) plus an unmeasured cascade.
5. **"Full load saves 40-60 ms of post-IPC JS" is wrong.** The real segment from `loadDirectoryTree:`
   to `Tree: N` is 15 ms (17:54:53.414 to .429). `countTreeNodes` walks the plain `orderedTree`
   (`fs.service.ts:94`), not the proxy. The bench row "full load: proxy + ... + countTreeNodes"
   (`bench.mjs`, last `timed` lines) counts through the proxy, which the app does not do. The full
   load's proxy cost lives only in the cascade, so counting it again here double counts it.
6. **The bench inflates the proxy handler figure.** The "watcher handler JS on warm proxy" case calls
   `fresh()` (a `JSON.parse` of 10.5 MB, 11-24 ms per the bench's own row) inside the timed function.
   The plain case uses `target.children.slice()`. The ratio still points the same way, because of the
   46 ms pre-IPC log evidence above.
7. **Cascade evidence is weaker than stated.** The heartbeat lower bounds are due-to-fire: 09.497 to
   09.552 is 55 ms (not 77), and 37.125 to 37.182 is 57 ms (not 65). The 77 and 65 assume JS stayed
   busy from handler end to the due time. 16 of the 19 events show nothing either way: for example at
   17:54:06 the heartbeat was due 06.430 and fired 06.432. "110-165 ms per autosave" is INFERRED;
   only the 47-88 ms handler is measured.
8. **The Fix 1 red test does not fail today.**
   - `src/tests/lib/core/filesystem/fs.store.test.ts:20` already asserts
     `expect(fsStore.fileTree).toBe(tree)`, and it passes.
   - Vitest's default node environment runs the Svelte server runtime with no proxies (header of
     `src/tests/lib/svelte-derived-sync.test.ts`).
   - The identity test must be a `// @vitest-environment jsdom` file, as in
     `svelte-derived-sync.client.test.ts:1`.
   - The second test (a derived recomputes on replace) passes before and after the change. It is a
     guard, not a red test.
9. **The keyed-each identity benefit is moot.** In the watcher path, unchanged branches already keep
   identity today. `patchSubtree` returns the same (proxy) arrays for untouched branches
   (`fs.watcher.ts:113`), and `proxy()` returns an existing proxy unchanged
   (`node_modules/svelte/src/internal/client/proxy.js:42-48`). A full load builds fresh objects either
   way.
10. **"New File is the default for a new note" is overstated.** Only the command-palette `New File`
    targets the root (`commands.ts:86`). Cmd+N uses the capture folder (`day-lens.logic.ts:54`,
    `utils/capture-path.ts`). The likelier root-level triggers are kanban/collection/view files created
    at the root, and external edits of root `AGENTS.md`/`CLAUDE.md`/`CHANGELOG.md`/`skills-lock.json`
    by agents. Each of those edits costs a whole-vault scan today.
11. **Fix 8 is undervalued and Fix 1's cascade gain is overstated.** Three consumers re-run on every
    tree replacement only because they read `fsStore.fileTree` into a context literal, and their work
    is entries-bound (about 10k entries), not tree-bound:
    - AppShell `typeRows`, always mounted (`AppShell.svelte:107-121`), calls `typeNavigatorRows` =
      `excludeSystemFolder` + `buildTypeSections` over all entries (`lens.logic.ts:360-373`). The
      `$effect` at `:139-146` reads it before its gate.
    - CalendarNavigator `noteDateCounts`, over all entries (`day-lens.logic.ts:45-52`).
    - RailNoteList `resolved` for non-folder lenses (`RailNoteList.svelte:128-131`).

    `$state.raw` does not shrink any of these. The "~5 ms after Fix 1" figure is a guess.

## Fix review

| Fix | Holds? | Notes |
|---|---|---|
| 1 `$state.raw` | Yes, quick-win | One line, safe (no in-place mutation besides the unread `fileCount`). Gain is real for walks (handler, `allPaths`, `collectViewFiles`, flattens) but not for the entries-bound cascade (correction 11) or the full-load segment (correction 5). The test needs jsdom (correction 8). |
| 2 modify-only skip | Yes, quick-win | It holds against: external dir create (new file is not in the tree), delete (the ancestor filter leaves the file path, `exists` is false), folder rename (dir paths are not file nodes) and a dir created next to an edit (the dir path stays because it is not an ancestor). Gap: creation echoes, task toggles and type-rename writes carry the `.tmp-*` path (`vault.rs:370,683,899`), so they still rescan. A sharper rule: drop paths that are neither in the tree nor on disk, but only when their parent dir is in the tree. Without that condition, `mkdir x; touch x/a; rm x/a` would hide the new folder `x`, because the ancestor filter dropped `x`. |
| 3 targeted refresh | Yes, small | Missed call sites: `templates.service.ts:122`, `deep-link.service.ts:235`. Race: the handler patches a pre-await snapshot (`fs.watcher.ts:157`). With more subtree patches in flight (app refresh, the watcher echo, and async scans after Fix 5), a later `setFileTree` can drop an earlier patch, so a just-created note vanishes until the next event. Rebase the patch on `fsStore.fileTree` after the await. A simpler alternative for app-initiated creates: insert the node directly, the way delete already uses `removeNodeByPath` (`path-change.service.ts:163`). That needs no IPC and also covers root-level creates without Fix 4. It does need a TS port of `natural_cmp` (`vault.rs:1453`) plus `applyFolderOrder`. |
| 4 shallow root | Holds, but low value | After Fix 2 (and the insert alternative), root parents are rare. |
| 5 async `scan_vault` | Yes, quick-win | No state or lock (`vault.rs:81-89`). The gain is INFERRED from the Tauri docs. Async allows out-of-order completion, which feeds the Fix 3 race. |
| 6 in-memory reorder | **No, as written** | `applyFolderOrder` keeps the current relative order for nodes without `_order`: the comparator returns 0 and `reorderedFiles = files` (`fs.logic.ts:442-467`). Removing or lowering an `_order` leaves the stale position instead of restoring the name order. Step 4b (`app-lifecycle.service.ts:364-367`) is safe only because its input is a fresh name-sorted scan. A fix needs a name re-sort first (a `natural_cmp` port), or a rescan when entries leave the map. |
| 7 drop unread walks | Yes, small | The trace is right. `countTreeNodes` runs on the plain tree, so it costs little (correction 5). |
| 8 narrow deps | Yes, undervalued | See correction 11. |

## Missed risks

1. **`write_atomic` temp paths in watcher batches** (`utils/fs.rs:26`, not hidden-filtered by
   `watcher.rs:71-79`).
   - On every non-Markdown creation (kanban, collection, view, canvas through `create_note`), the batch
     fails `areAllRecentSaves`, so `rebuildAllIndexes` takes the full branch. That was 381 ms at
     17:53:44.050-44.431: `scan_vault_v2_cached` 281 ms, `buildPropertyIndex` 49 ms,
     `buildFrontmatterIconIndex` 98 ms.
   - Markdown creations get a redundant incremental re-index instead (2-13 ms).
   - Fix: filter `*.tmp-<digits>-<digits>` in the Rust watcher, or handle not-in-tree and not-on-disk
     paths as above.
2. **Image embeds flatten the whole tree in `toDOM`.** `WikilinkImageEmbedWidget.toDOM` ->
   `resolveImageEmbedAssetUrl` -> `host.resolveLink` -> `flattenFileTree(fsStore.fileTree)`
   (`widgets.ts:545,570`, `editor-host.ts:60`). Embed loading (`widgets.ts:597`) and meta-bind buttons
   (`meta-bind-button-widget.ts:93`) do the same. That is one 43k-node walk per widget, repeated when
   it scrolls back into view, against CLAUDE.md performance rule 2. INFERRED to cost tens of ms per
   image embed through the proxy. A memoized path list per tree identity fixes it. This is broader
   than the `[[` keystroke case the deep dive cites.
3. **Lost-update race** in subtree patching, and Fix 3 plus Fix 5 widen it (see the Fix review).
4. **Fix 6 ordering regression** (see the Fix review).
5. **Fix 3 call-site list is incomplete** (`templates.service.ts:122`, `deep-link.service.ts:235`).

## Impact

Adjusted from 6 to **5**. Measured webview JS per autosave is 47-88 ms (the cascade is inferred). The
3 heartbeat stalls are 55-87 ms blocks. A creation awaits 268-464 ms, mostly Rust, which is INFERRED
to freeze the native window. That is daily and visible, but smaller than A (6 s) or D (1.3 s).
Missed risk 1 adds about 0.4 s per non-Markdown creation.
