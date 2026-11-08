# C: buildTagIndex blocks the webview on every vault open

## Summary

- Root cause: `buildTagTree` (`src/lib/features/tags/tags.logic.ts:13`) finds each tag's parent with a linear
  `currentLevel.find(...)` that lowercases both strings on every comparison. Rust sends tags sorted by name,
  so every new root tag scans all the earlier roots. With R root tags that is R²/2 comparisons. A flat list of
  6,040 tags is about 18.2 M comparisons.
- Benchmark (node 26, V8, Mac throttled, `/tmp/ui-resp-bench/C/`): the current function takes **434 ms** on
  6,040 flat tags and **5,885 ms** on 20,000. With a `Map` index it takes **1.2 ms** and **4.6 ms**, and the
  output is identical. Sort and JSON parse are 1-9 ms each in V8.
- The observed 578-2,108 ms (n=14 startups) only fits a tag set with thousands of root tags. 60 roots would
  cost about 14 ms. The real root count was never logged (INFERRED).
- The `$state` deep-proxy suspect in the baseline is not the cause at startup: the tree is built from plain
  objects and no component reads it until the Tags tab mounts.
- User impact today: every vault open freezes the webview JS for 0.6-2.1 s. At startup that freeze sits
  inside Finding A's sync `get_tasks_in_section_v2` freeze, which is longer, so it is masked for now. Opening
  the Tags tab is not masked: it froze for 1.6 s and showed "Indexing tags..." the whole time. Once A is fixed,
  C becomes the largest JS freeze at startup.
- The best fix is a quick win: a `Map` index in `buildTagTree`, about 15 lines plus tests, with no IPC,
  store or lifecycle change.

## Evidence

VERIFIED (read in code or log):

- `tags.logic.ts:11-33`: for each segment, `pathSoFar` is concatenated (`:12`), then a linear `find` runs
  with `n.segment.toLowerCase() === parts[i].toLowerCase()` (`:13`). A miss pushes a new node (`:24`).
- `src-tauri/src/vault/index.rs:864-889`: `lookup_all_tags` returns one aggregate per tag, sorted by
  lowercase name (`:888`), with every tag's full `file_paths` cloned (`:885`). The command
  (`src-tauri/src/commands/vault.rs:582-591`) is sync (`#[tauri::command]` with no `async`).
- `tags.service.ts:22-42`: one `await call('get_all_tags_v2')` (`:26`), then `.map` (`:27-31`),
  `sortTagTree(buildTagTree(...))` (`:32`) and `setTagTree` (`:33`), all synchronous after the await.
  `timeAsync` (`src/lib/utils/debug.ts:41-51`) measures wall time from before the invoke to the end, so
  "completed in" includes the IPC wait.
- Startup trigger: `app-lifecycle.service.ts:403-413`. Inside `setTimeout(0)` (`:404`), `buildTagIndex()`
  (`:408`) runs unconditionally whenever `indexBuilt` is set.
- Only reader: `TagsView.svelte:35-39` (`displayedTree`). It mounts only while the Tags tab is active
  (`src/lib/app/EditorView.svelte:72-73`). A grep of `src/lib` finds no other `tagsStore` reader.
- The mount always rebuilds: the `$effect` at `TagsView.svelte:41-46` calls `scheduleTagIndexRebuild()` on
  mount and on every `vaultIndexVersion` bump (300 ms debounce, `tags.service.ts:75-77`). Each rebuild sets
  `isLoading` (`tags.service.ts:23`), which swaps the list for "Indexing tags..." (`TagsView.svelte:79-80`)
  and destroys every `TagItem` with its local `open` state (`TagItem.svelte:19`).
- No code reads `filePaths`. It is written at `tags.logic.ts:21,29` and `tags.service.ts:30` and typed at
  `tags.types.ts:4,12`. `TagItem.svelte:43-44,67-68` render only `segment`, `count` and `totalCount`.
  Tag click goes to search (`TagsView.svelte:17-19`).
- Log `2026-11-02_14-52-43.log`, lines 56-61:
  - `enter get_all_tags_v2` at 43.747 and `exit after 13ms` at 43.757.
  - The last `[HB] alive` before the build is at 43.620 (line 38).
  - `buildTagIndex completed in 694.0ms` and `[HB] stall 817ms` both land at 44.437.
  - No other JS work is logged in that window: tasks and properties are still waiting on IPC.
  - So about 570-680 ms is JS work after the response arrived.
- The tags freeze falls inside `get_tasks_in_section_v2` (sync, main thread) in every session I checked:
  | Session | tags enter / exit (completed) | tasks enter / exit |
  |---|---|---|
  | 11-02 | 43.747 / 44.437 (694 ms) | 43.772 / 45.585 |
  | 11-01_19-08-13 | 17.761 / 19.863 (2,108 ms) | 18.190 / 24.356 |
  | 11-01_19-00-04 | 06.495 / 07.224 (731 ms) | 06.673 / 09.801 |
  | 11-01_18-43-03 | 18.214 / 20.218 (2,016 ms) | 18.620 / 24.666 |
- Tags-tab open (`2026-11-01_19-00-04`): `__virtual__/tags` active at 22:00:40.147, then
  `completed in 1635ms`, `stall 1544ms`. Scout C2 gathered this. I checked the tab line and the
  session's startup lines.

Benchmarks (VERIFIED by running; V8 not JSC; noisy because the Mac is throttled under `nice`). Scripts:
`/tmp/ui-resp-bench/C/bench.mjs`, `bench2.mjs` and `bench3.mjs`. The synthetic set is 6,040 names, lowercase
order like Rust, about 25k tag-note pairs and ~105-char paths.

| Shape | current `buildTagTree` | `Map` version | build+sort (localeCompare) | parity |
|---|---|---|---|---|
| flat, 6,040 roots | 434 ms (430-513 over runs) | 1.2 ms | 2.4 ms | identical JSON |
| 70% flat (4,261 roots) | 385 ms | 1.7 ms | 2.7 ms | identical |
| 60 roots x ~100 children | 13.6 ms | 2.3 ms | 3.0 ms | identical |
| roots 500 / 1k / 2k / 3k / 4k (+children to 6,040) | 21 / 56 / 101 / 179 / 246 ms | - | - | - |
| flat, 20,000 roots | 5,885 ms | 4.6 ms | - | - |

- Hoisting `parts[i].toLowerCase()` out of the callback alone gives 166-485 ms, which is unreliable.
- JSON.parse of the payload in V8:
  | Tag-note pairs P | Payload | Parse |
  |---|---|---|
  | 6,040 | 0.93 MB | 1.4 ms |
  | 25,000 | 3.0 MB | 2.7 ms |
  | 100,000 | 11.2 MB | 8.6 ms |
  | (no `filePaths`) | 185 KB | 0.7 ms |
- Edge case: `bench3.mjs` checks parity for `Work/a` + `work/B` (merge, first-seen casing `Work`), `/b`
  vs `b`, and `a//c`. The parity holds only if the key is built with `i === 0`, not with a truthiness
  check (see Fix 1).

## Root cause

1. Main cause: the quadratic sibling scan at `tags.logic.ts:13`. The input arrives sorted, so every new
   tag misses and scans all its siblings to the end. The cost is Σ(siblings at each level), which is about
   R²/2 for R root tags, plus two `toLowerCase` calls per comparison. The measured webview time (578-2,108 ms)
   matches only a sibling level in the thousands. INFERRED, but the 60-root case at 14 ms rules out a
   mostly nested set. The 2026-05-11 note at `tags.service.ts:86-90` (3,948 tags, about 705 ms) also fits
   quadratic growth.
2. The whole build is wasted at startup. Nothing reads the tree until the Tags tab mounts, and the mount
   rebuilds anyway (`TagsView.svelte:41-46`). The startup build is only visible for the first 300 ms of the
   first tab open.
3. Secondary: about 1-11 MB of unused `filePaths` per call (the size depends on P, which is not measured).
   In V8 the parse is cheap. Rust clones P strings (`index.rs:885`), and Tauri serializes them after the
   command body. The gap between `exit get_all_tags_v2` and the next sync command's `enter` is 15 / 151 /
   341 / 360 ms across the four sessions. That gap may include this serialization on the main thread
   (INFERRED: the Tauri serialization thread was not read).
4. Not a cause at startup: Svelte `$state` proxying. `setTagTree` assigns a plain tree, and Svelte proxies
   lazily on read (INFERRED from scout C1's fetched summary of Svelte 5 `proxy.js`; I did not read
   `node_modules`). Proxy cost lands only on `filterTagTree` reads while the tab is mounted.

## Impact

- Thread: webview JS (event loop blocked; `[HB] stall` 635-1,958 ms). Rust command time is 10-72 ms.
- Frequency: every vault init (14 inits in 12 sessions, 578-2,108 ms, median 915 ms), plus every Tags-tab
  open (1 in 12 sessions, 1,635 ms), plus one rebuild per throttled `vaultIndexVersion` bump while the tab is
  open (none observed).
- What the user sees:
  - At startup, the window freezes for 0.6-2.1 s just after the vault opens. Today this is hidden inside
    Finding A's longer main-thread freeze (`get_tasks_in_section_v2`, 1.8-6.2 s), so fixing C alone does not
    shorten the startup freeze. It does make the JS thread free during that window. This is INFERRED: the
    UI process main thread blocks input whether or not JS is busy.
  - After A is fixed, C is the remaining 0.6-2.1 s freeze at startup.
  - On a Tags-tab open, the app freezes for about 1.6 s on "Indexing tags...". Each later bump with the tab
    open blanks the list and collapses expanded groups (`TagsView.svelte:79-80`, `TagItem.svelte:19`).
- impact_score 6: a daily, second-scale JS freeze, currently masked at startup by A, unmasked on the Tags tab.

## Fixes (ranked by gain)

1. **Index lookup in `buildTagTree`** (quick-win). Keep `const index = new Map<string, TagTreeNode>()`
   keyed by the lowercased path prefix, built as `key = i === 0 ? lower : key + '/' + lower`. Do not use a
   truthiness check on the key: with `''` segments, `/b` would collide with `b`. Push to `currentLevel` as
   today, so insertion order and first-seen casing stay the same.
   - Gain: about 434 ms to 1.2 ms in V8 for the flat case. Expected webview time drops from 578-2,108 ms to
     a few tens of ms, mostly IPC (INFERRED; confirm with Fix 2's timers).
   - Files: `src/lib/features/tags/tags.logic.ts`, `src/tests/lib/features/tags/tags.logic.test.ts`.
   - Risks: casing or order drift. The existing tests cover order and nesting but not mixed-case parents, so
     add those cases. Nothing touches `applyNoteChange`, `vaultIndexVersion`, IPC or stores.
   - Tests:
     - Failing first: a coarse budget, e.g. 20,000 flat tags in under 500 ms. Today that takes about 5.9 s,
       the fix about 5 ms, so a 100x margin keeps it from being flaky.
     - Characterization tests that must pass before and after: `Work/a` + `work/B` merge under `Work`,
       insertion order kept, `/b` vs `b` stay separate, `a//c`.
2. **Split the timing in `buildTagIndex`** (quick-win, ship with 1). Wrap the `call`, `buildTagTree`,
   `sortTagTree` and `setTagTree` steps with `timeSync`/`perfStart`, and log `tree.length` (R) and
   Σ`count` (P).
   - Gain: confirms Fix 1 on device and decides whether Fixes 5 and 6 are needed.
   - Files: `tags.service.ts` and its test.
   - Risk: none (`debug()` is off by default).
3. **Keep the tree on screen during a rebuild** (small). Set `isLoading` only when the tree is empty, and
   have `buildTagIndex` swap the tree in at the end.
   - Gain: no list teardown and no collapse of expanded groups on every bump while the tab is open.
   - Files: `tags.service.ts`, `TagsView.svelte`, `tags.service.test.ts`.
   - Risk: a stale tree shows for tens of ms. The tests that assert the loading flag change.
   - Test: build twice, assert `isLoading` stays false during the second call while a tree exists, and
     assert the tree updates at the end.
4. **Drop the eager startup build** (small). Remove `app-lifecycle.service.ts:408` and let the mount effect
   build. When `tagTree` is empty, build at once (or show the loading state) instead of showing "No tags
   found" for 300 ms.
   - Gain: one IPC call, the payload transfer and the build per vault open. That is 0.6-2.1 s today but only
     tens of ms after Fix 1, so do Fix 1 first.
   - Files: `app-lifecycle.service.ts`, `TagsView.svelte`, `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`
     (assertions at `:614,687,710` pin the eager call; changing them is a deliberate behavior change, not a
     weakening).
   - Risk: the `indexBuilt` gate comment at `app-lifecycle.service.ts:395-401` stops applying to tags. The
     first tab open waits for the IPC.
5. **Remove `filePaths` from `TagAggregate`** (medium). Edit `src-tauri/src/vault/task.rs:139-147` and
   `index.rs:879-886` (`count` stays `paths.len()`, no clones), plus `tags.types.ts`, `tags.logic.ts:21,29`,
   `tags.service.ts:30` and the fixtures in `tags.service.test.ts` and `tags.logic.test.ts`.
   - Gain: payload drops from about 1-11 MB to about 185 KB, with fewer Rust clones, less main-thread
     serialization and less retained JS heap. The size of the gain is not measured; P is needed from Fix 2.
   - Risk: an IPC DTO change, so it takes the Both gate and regenerated ts-rs bindings
     (`src/lib/contracts/generated/TagAggregate.ts`). Check that the `feature/ios-poc` branch does not read
     it.
6. **One `Intl.Collator` for `sortTagTree`** (small, only if Fix 2 shows sort cost in JSC). In V8 the sort
   is about 1-2 ms, and `collator.compare` gave identical output. Without a measurement this is speculative.

## Quick wins

- Fix 1 (`Map` index in `buildTagTree`) plus Fix 2 (split timers): about a day including the tests. They
  remove nearly all of the 0.6-2.1 s JS freeze on vault open and on Tags-tab open.

## Open questions

- The real root count R and pair count P. Not logged, and the vault was not scanned. Fix 2 answers both.
- The JSC cost of the parts V8 makes cheap (`localeCompare` ties, JSON decode of the IPC body). Only an
  on-device measurement settles it.
- Whether the 15-360 ms gap between `exit get_all_tags_v2` and the next command's `enter` is Tauri
  serializing the tags payload on the main thread. The Tauri internals were not read.
- The DOM cost of a Tags-tab mount with `hideRareTags` off (no virtualization, `TagsView.svelte:85-87`; one
  `Popover` per row, `TagItem.svelte:33-38,57-62`). Not measured.
- Whether bits-ui `Collapsible.Content` unmounts closed children. Not verified (`node_modules` was not read).
