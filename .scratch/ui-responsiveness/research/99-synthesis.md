# UI responsiveness deep dive: synthesis (2026-11-02)

Inputs: `00-baseline.md`, `raw/*`, and for each finding A-G its `*-deep-dive.md` plus `*-verify.md`.
All seven findings have a verification, so none is UNVERIFIED as a whole. Where a verifier corrected
a deep dive, the correction is used here. Individual claims that no one observed are marked INFERRED.
I spot-checked the load-bearing code citations myself (VERIFIED below): `vault.rs:614-656`,
`app-lifecycle.service.ts:403-417`, `tags.logic.ts:11-24`, `fs.store.svelte.ts:6`,
`editor-host.ts:58-61`, `CollectionView.svelte:98-121`, `CollectionTableView.svelte:43`,
`kb-api.ts:373-402`, `semantic.rs:1233-1242`, `vault.rs:80-81`, and the test lines
`app-lifecycle.service.test.ts:534-535,614-615,687-688,710,1171-1172`.

No app, cargo, pnpm or vitest run was made for this synthesis.

## 1. Ranking by real impact on UI responsiveness

The ranking ignores fix complexity. Scores come from the verifier when it gave one. A and F were
not scored by either report, so their scores are my estimate and are marked as such.

| Rank | Finding | Impact (verified) | Thread blocked | Frequency | Magnitude (after verifier corrections) |
|---|---|---|---|---|---|
| 1 | **A** `get_tasks_in_section_v2` sync, reads every note | 8 (synthesis estimate; verifier confirmed root cause) | Native app main thread: every IPC dispatch queues behind it. Sync queueing VERIFIED; async queueing and window freeze INFERRED | Every vault open, because the default `sectionTag` is `'#to-list'` (`tasks.store.svelte.ts:8`). Every Tasks-tab activation. 2 scans per toggle | 1,819 ms at startup this session, 1,577 / 320 ms on tab activations. Max 6,164 ms, 57.5 s over 17 calls in 12 sessions. Delays the daily note by ~1.2 s on its own (the other ~0.7 s is C) |
| 2 | **B** whole-tree rescans + deep proxy over a 43k-node tree | 5 | Webview JS (measured) + native main for `scan_vault` (INFERRED freeze) | Every watcher event (every autosave), every note creation, every save of a root-level file | 47-88 ms JS per autosave watcher handler (measured; the cascade after it is INFERRED, 55-57 ms lower bound in 3 of 19 events). 268-464 ms per creation before the note opens (188-281 ms of it is Rust). 185-211 ms native scan per root-level save. Session: ~1.76 s native + ~2.0 s JS in 4.5 min |
| 3 | **F** embed widgets call an O(tree) `resolveLink` in `toDOM` | 6 (synthesis estimate) | Webview JS | Every fresh open or tab-close activation of a note with `![[...]]` embeds. INFERRED: also cursor leaving an embed line, and scroll | 30-65 ms per embed drawn (single-embed Radar note: 52-71 ms docReplace vs p50 5 ms). Fruit fly first open: ~430 ms in two tasks (`[NAV] ... 171ms` second wave). 8 of 9 docReplaces >= 50 ms were embed notes |
| 4 | **C** `buildTagTree` quadratic sibling scan | 5 | Webview JS | Every vault open (14 inits in 12 sessions). Every Tags-tab open (1 in 12 sessions) | JS block ~0.4-1.96 s per vault open (11-02: 567-665 ms). Masked by A in 13 of 14 inits today. It becomes the largest startup freeze once A's startup call goes. Tags tab: ~1.4 s build + ~270 ms renders |
| 5 | **D** `CollectionView` first render runs unfiltered | 5 | Webview JS | Each fresh mount (from a non-collection tab, or source to table) of a **table view without `limit`**. Every `.view` file (its default has no filter). Owner frequency unproven | 1,292 ms flush, observed once. It is build cost (~118 us/row x 10,628 rows), grows with vault size |
| 6 | **E** queryjs `ensureCache` builds every page per block | 3 | Webview JS | First open of a periodic note after any write. One block per note today because of a bug | Probably ~30 ms per block, upper bound 116 ms. The 282 / 155 ms headlines are wall-clock across two IPC awaits. The 10-Oct run is bounded at 33 ms |
| 7 | **G** embedder re-embeds re-keyed chunks, calls overlap | 3 | Background (`spawn_blocking` + ORT utility-QoS workers) | Every save that changes the line count above a heading (any Enter, any new meta-bind tracker line) | 51% of chunk embeds and 81% of embed wall time avoidable this session. One 21.5 s pass, cause unknown. RSS share of the model not isolated (the "1.0-1.3 GB" figure is INFERRED) |

Why this order:
- A is first: it has the largest block (seconds), it runs on the thread that dispatches all IPC,
  and it fires on the default path every day. The JS heartbeat cannot see it.
- B ranks above F and C on frequency x magnitude: it hits every autosave and every creation. F has a
  bigger per-event freeze but only on embed-heavy notes.
- C's real impact today is low (masked), but it is latent and daily: the startup part of A
  (`app-lifecycle.service.ts:409`) and C (`:408`) sit in the same `setTimeout(0)` (`:404-417`,
  VERIFIED). Ship C with or right after A's startup fix.
- D is large but narrow and its frequency is unproven. E and G cause no measured multi-hundred-ms UI
  freeze.

Cross-finding links:
- **B and F share one root cause**: `fileTree` is a deep `$state` (`fs.store.svelte.ts:6`, VERIFIED),
  and whole-tree walks pay proxy traps. F's `resolveLink` (`editor-host.ts:59-61`, VERIFIED) is B's
  "missed risk 2". B-1 (`$state.raw`) shrinks F's per-call cost but does not remove it
  (`resolveWikilink` over 43k paths is still ~18 ms in the bench), so F-1 is still needed.
- **A and C share the startup window**: fixing A alone moves the daily-note delay onto C.
- **E feeds G's memory**: Chart.js instances are never destroyed (E verify: no `destroy` under
  `src/lib/plugins/queryjs`, Chart.js registry `chart.js:5617,5700,6269`), so every re-execution leaks
  a canvas. Fixing E's correctness bugs multiplies that leak.
- **A, B and G meet in sync commands on main**: `scan_vault` (`vault.rs:80-81`, VERIFIED sync),
  `save_snapshot` / `get_semantic_file_status` on the `DB` mutex that `get_or_load_cache` holds during
  a cache load (`semantic.rs:152-193`, `db/mod.rs:110-117`). The 11.5 s figure for that load comes
  from scout A7 and was never re-checked.

## 2. Quick wins

Only fixes that the verifier accepted as quick wins. A fix counts when the verifier kept the deep
dive's quick-win label, or called it one. Ordered by expected gain.

| # | Fix | Expected gain | Test that proves it |
|---|---|---|---|
| QW1 | **A-F2**: remove `buildTaskIndex()` from startup step 5b (`app-lifecycle.service.ts:409`). Its only reader, `TasksView.svelte:53`, refetches on mount (`:78-83`). Frontend gate | Removes a 1.6-6.2 s native-main block from every vault open in sessions that do not open the Tasks tab. The daily note opens ~1.2 s sooner (not 1.9 s: C still blocks ~0.7 s) | Flip `app-lifecycle.service.test.ts:615` to `not.toHaveBeenCalled()` after `initializeVault` + macrotask flush (fails today). **Delete** `:688`: it is a watcher test that passes only because the startup `setTimeout(0)` fires after `vi.clearAllMocks()`. Do not flip it. On device: `get_all_property_records` enters within ~20 ms of the `get_all_tags_v2` exit (today it enters at the tasks exit, 45.585) |
| QW2 | **A-F1**: in `get_tasks_in_section_v2`, `if entry.tasks.is_empty() { continue; }` before `read_to_string` (`vault.rs:632`). Exact, because section tasks are a subset of `extract_tasks` (`parsing.rs:1676-1750`). Fix the stale doc comment (`vault.rs:607-613`). Log K once. Rust gate | Disk reads drop from N=10,628 to K, the number of notes with any task. The "14-22x" was a bench input, not a measurement. Gain ~N/K, unknown until K is logged (2-4x if templates carry checkboxes). Covers every remaining trigger (tab activation, toggle, typing) | Extract the loop to `tasks_in_section(entries, tag, read)` with an injected `read`. Two notes: A has a `## Todo #to-list` task, B has none. Assert `read` is called only for A (fails today), A's tasks are returned, and the result equals the unfiltered loop on a fixture vault (parity) |
| QW3 | **F-1**: memoize `buildResolutionCache(flattenFileTree(tree).map(path))` on `fsStore.fileTree` identity (prefer `WeakMap<tree, cache>`) in `editor-host.ts:59-61`. Resolve with `resolveWikilinkCached`. Share the flat list with `listLinkCandidates` (`:64`). Update the contract comment at `core/markdown-editor/editor-host.ts:29-31`. Do not use a `$derived` | 30-65 ms per embed drawn becomes ~0. Fruit fly docReplace 142-156 ms should drop under 15 ms. One ~23-45 ms rebuild per tree replacement, paid lazily on the next resolve | (a) Parity with `resolveWikilink` on name collisions, a path-style target, the basename fallback, a missing target. (b) Freshness: after `setFileTree` with a moved, removed or added file. (c) Cost guard that fails first: give fixture nodes a `path` **accessor getter** with a counter (Svelte does not cache accessors, `proxy.js:183,203`). 50 `resolveLink` calls must read `path` < 2x the node count. A `get` trap on a wrapping Proxy would NOT fail today |
| QW4 | **C-1 + C-2**: `Map` index keyed `i === 0 ? lower : key + '/' + lower` in `buildTagTree` (`tags.logic.ts:13`). Keep the `pathSoFar` line (`:12`) unchanged. Add per-step timers and log R (roots), P (pairs) and the uppercase share in `buildTagIndex` | Build cost in JSC: 274-1,088 ms down to 2-6 ms (verifier's JSC run, parity true for every shape). Removes ~0.4-1.96 s of JS per vault open and most of the 1.4 s Tags-tab build. ~270 ms of Tags-tab render stays | Red: 6,040 flat tags built in < 200 ms (today 274-1,088 ms in JSC; 20k flat would pass the 5 s vitest timeout). Characterization, green before and after: `Work/a` + `work/B` merge under `Work`, insertion order, `/b` vs `b` stay separate, `a//c` |
| QW5 | **D-1**: move the seed body (`CollectionView.svelte:100-110`) into a `seedFromDefinition()` called once in the script body. Arm the reset effect (`:113-121`) with a plain `let resetArmed`, checked **after** `void yamlContent` | ~1.25 s removed from each fresh mount of a table view without `limit`. Replica: 10,628 rows built down to 5, 5 query passes down to 2 | jsdom suite with the real `collectionStore.setPropertyIndex`, ~200 records, 3 matching the YAML filter. A `MutationObserver` attached before `mount`, then `flushSync()` + `takeRecords()`: 0 removed `TR` nodes (today ~197) and 3 `tbody tr`. Keep the 3 `selfUpdate` latch tests and `CollectionView.test.ts:119` (external YAML re-seed) green |
| QW6 | **B-2**: in `handleChangedPaths` (`fs.watcher.ts:122-187`), skip resolve, scan, patch and `setFileTree` when every path is an existing file node (segment walk) that `exists()`. Still call `notifyListeners` | Removes 47-88 ms JS from every autosave of a nested note, and the 185-211 ms native whole-vault scan from every save of a root-level file. Gap: batches carrying a `write_atomic` temp path (`.tmp-<pid>-<seq>`, `utils/fs.rs:26-28`) still rescan | Emit `vault-files-changed` with a known file path and `exists` true: no `scan_vault` invoke, `fsStore.fileTree` keeps identity (`toBe`), the listener gets the paths (fails today). Negatives that still rescan: unknown path, known path with `exists` false, and `mkdir x; touch x/a; rm x/a` |
| QW7 | **B-1**: `fileTree` as `$state.raw` (`fs.store.svelte.ts:6`). The only in-place write is `attachFileCounts` to the unread `fileCount` | Pre-IPC handler walk ~46 ms down to ~1 ms. Whole-tree flatten consumers ~50-100 ms down to ~3 ms. Does NOT shrink the entries-bound cascade (`AppShell.svelte:107-121`, `CalendarNavigator`, `RailNoteList` resolved), and the full-load segment is only 15 ms today | A new `// @vitest-environment jsdom` file (node env runs the server runtime without proxies, so `fs.store.test.ts:20` already passes): `expect(fsStore.fileTree[0]).toBe(t[0])` fails today. Guard, green before and after: a `$derived` over `fsStore.fileTree` in `$effect.root` recomputes after `setFileTree` |
| QW8 | **B-5**: `scan_vault` async (`vault.rs:80-81`; no state, no lock). Add a generation guard in `loadDirectoryTree` (`fs.service.ts:74-102`), because async completion can land an older tree last | INFERRED: removes 185-300 ms (max 2.4 s) native-main blocks for every remaining whole-vault scan | No unit test can prove thread placement. TS: two overlapping `loadDirectoryTree` calls, resolve the first last, assert the newer tree wins (fails today). Manual: drag the window during a creation. Measure with the main-thread heartbeat (section 5) |
| QW9 | **G-unload**: call `schedule_embedder_unload()` in the no-change branch of `build_semantic_index` (`semantic.rs:543-553`). Arming it in init too is redundant | Model leaves memory 120 s after an idle vault open. The size is unmeasured (~1 GB plausible) | Assert the unload generation advances after a no-change build, if `semantic_commands_test.rs` can build an all-mtimes-match fixture without a model. Otherwise manual: an "Embedder unloaded" line ~120 s after an idle open |
| QW10 | **G-rusage** (diagnostic): one line per embed pass with CPU time, major faults and footprint around `embed_batch` (`semantic.rs:1285`). Use `getrusage(RUSAGE_SELF)` for CPU (timeval). `proc_pid_rusage` `ri_*_time` may be Mach ticks on Apple silicon (from memory, unchecked) | No speedup. Decides whether the 21.5 s pass was CPU starvation or paging | Unit test: CPU time is non-decreasing across a busy loop and in the expected unit (compare to wall time of a 100 ms spin) |
| QW11 | **E step 0** (diagnostic): `QJS-PROFILE` timers around `ensureCache` (N, ms) and the post-IPC body, plus a log line in `renderRunPrompt` | No speedup. Proves or refutes that `ensureCache` is the cost before E-1 is built (the bench model was refuted by the 33 ms bound) | Log check in the next owner session. Widget test: under `first-open`, a second block in the same file logs the run-prompt line |

Demoted by the verifier (not quick wins): A-F4 `get_semantic_stats` async (cold one-off; skipping
the duplicate startup fetch is cheaper), E-1 shared page memo ("small and safe", gain at most
~25 ms per hit), G-1 hash-matched vector reuse ("small", not quick), D-4 `timeSync` inside
`$derived` (it adds settings dependencies to `queryResult`), B-6 in-memory reorder (rejected:
it leaves stale positions).

## 3. Per finding

### A. Sync `get_tasks_in_section_v2` (and other sync commands) on the main thread

- **Root cause.** A sync `#[tauri::command]` (`vault.rs:614-615`, VERIFIED) holds the `VaultIndex`
  read guard and calls `read_to_string` for all 10,628 notes (`:620-656`, VERIFIED). Nothing skips
  notes whose indexed `entry.tasks` is empty. The default filter `'#to-list'` makes this the common
  path, and startup fires it with no visible reader (`app-lifecycle.service.ts:409`). The stale doc
  comment (`vault.rs:607-613`) hid it.
- **Recommended fix.** QW1 + QW2 now. Then F3: make it `async` + `spawn_blocking`, copy
  `(path, modified_at)` candidates under a brief guard, read outside the lock, and add a sequence
  guard in `buildTaskIndex` (`tasks.service.ts:54`).
- **Alternatives.** F5: store heading marks in `NoteEntry` (needs `INDEX_SCHEMA_VERSION` bump and
  must not leak into the `#[ts(export)]` DTO). Only worth it if K stays large. F6: skip bump
  refetches when the delta has no task notes. Low value after F1.
- **Risks.** F3 must not hold the read guard across reads: sync writers (`update_note_in_index`,
  `vault.rs:302-316`) would block main on `.write()`. Async completion is out of order, so the
  sequence guard is required. F3 can run explicit + bump scans in parallel; keep F1 first. QW1
  moves the cold scan to the first Tasks-tab activation (the log suggests the cache was cold again
  40 s later anyway).
- **Open questions.** K for this vault. Which session and trigger produced 6,164 ms. Whether input
  and painting really stall (needs the native heartbeat). The section-scan quirk at
  `parsing.rs:1736-1741` (nested `#to-list` headings), which matters only for F5.

### B. Whole-tree rescans

- **Root cause.** A deep `$state` proxy over a replace-only 43k-node tree (`fs.store.svelte.ts:6`)
  turns 1-10 ms walks into 50-100 ms. The watcher has no modify-only path
  (`fs.watcher.ts:122-187`). `refreshTree` always rescans the vault root (`fs.service.ts:105-110`),
  and a root-level parent maps to a full recursive `scan_vault` (`fs.logic.ts:326`), which is sync.
- **Recommended fix.** QW6, QW7, QW8. Then targeted refresh for app-initiated changes (B-3). The
  verifier's simpler variant: insert the node directly, the way delete uses `removeNodeByPath`
  (`path-change.service.ts:163`). That needs a TS port of `natural_cmp` (`vault.rs:1453`) plus
  `applyFolderOrder`. Then filter `write_atomic` temp paths in the Rust watcher.
- **Alternatives.** B-4 shallow root scan (low value after B-2 and the insert). B-7 drop the unread
  `attachFileCounts` walk and guard `countTreeNodes` (small). B-8 narrow tree deps in `AppShell`
  `typeRows`, `CalendarNavigator`, `RailNoteList` (the verifier rates it undervalued: those
  consumers are entries-bound and re-run on every tree replacement only because they read the tree).
- **Risks.** Lost-update race: the handler patches a pre-await snapshot (`fs.watcher.ts:157`). More
  in-flight patches (B-3, async B-5) can drop an earlier patch, so rebase on `fsStore.fileTree`
  after the await. B-3 call sites the deep dive missed: `templates.service.ts:122`,
  `deep-link.service.ts:235`. `applyPathChange` ordering must stay intact. B-6 as written regresses
  ordering (`fs.logic.ts:442-467`).
- **Open questions.** Real dir count. The cascade split after `setFileTree` (needs a WebKit
  timeline). The window freeze during sync scans. Rename, move and delete timings (none logged).
  `write_atomic` temp paths also force a 381 ms full `rebuildAllIndexes` per non-Markdown creation
  (INFERRED cause, fits every log fact).

### C. `buildTagIndex`

- **Root cause.** `buildTagTree` finds each parent with a linear `find` plus two `toLowerCase()`
  calls per comparison (`tags.logic.ts:13`, VERIFIED). Rust sends tags sorted (`index.rs:888`), so
  each new root scans all earlier roots: R^2/2. In JSC, mixed-case segments make it ~4x worse. The
  startup build has no reader: only `TagsView` reads the tree, and its mount rebuilds anyway
  (`TagsView.svelte:41-46`).
- **Recommended fix.** QW4.
- **Alternatives.** C-3 keep the tree visible during a rebuild (small gain; the tab is full-pane).
  C-4 drop the eager startup build, with a `hasBuilt` flag, not `tagTree.length === 0`, which would
  break "No tags found" (`TagsView.test.ts:62-67`). C-5 drop `filePaths` from `TagAggregate` (IPC
  DTO change; `src-tauri/tests/vault_index_test.rs:1117-1124` asserts it). Collator for the sort:
  not worth it (1-6 ms in JSC).
- **Risks.** Casing or order drift (tests above). For C-4: tests `:687` and `:710` are watcher tests
  that pass by accident. Update them on purpose; do not add tags to the watcher path.
- **Open questions.** R, P and the casing mix. Other unlogged JS in the startup window. Whether the
  "exit tags -> next enter" gaps (15-360 ms, receipt times) are serialization or plugin commands.

### D. Collection mount

- **Root cause.** Svelte runs the template before top-level `$effect`s, so the first `queryResult`
  (`CollectionView.svelte:162-176`) runs with empty filters and `CollectionTableView.svelte:43`
  (unkeyed, uncapped `{#each}`, VERIFIED) builds a row per vault note. The seed effect
  (`:100-110`) and the unguarded reset effect (`:113-121`, VERIFIED) apply the YAML only afterwards.
- **Recommended fix.** QW5, then D-2: cap rows (e.g. 200) with "Showing N of M" + "Show more", keyed
  by `record.path`. D-2 is the only fix that covers legitimately large results (`.view` files
  created by `type-definitions.service.ts:269-271` have no filter and no limit).
- **Alternatives.** D-3 `{#key activeTab.path}` around `EditorView.svelte:83`: also fixes the
  `activeViewIndex` leak across files (correctness), but returning to a collection then opens
  view 0. Writable `$derived` instead of effects: not recommended (breaks the `selfUpdate` latch).
  Virtualization: later, if the cap is not enough.
- **Risks.** `resetArmed` must be a plain variable and must come after `void yamlContent`, or the
  reset effect stops tracking. The view-tab switch (`:370`) has the same post-render seed pattern;
  only D-2 bounds it.
- **Open questions.** How often the owner opens table collections or `.view` files. Dev vs release
  build. The calendar views' stale-pass cost.

### E. queryjs on journal notes

- **Root cause.** Each block builds a fresh `KBAPI` (`queryjs-block-widget.ts:188-195`), whose first
  `current()` / `pages()` builds a `KBPage` for every note (`kb-api.ts:373-402`, VERIFIED), even for
  a tag filter. Any note write clears every cached result (`queryjs-ports.ts:15`). The measured
  in-app cost is small (~30 ms per block), so this is mostly a correctness finding.
- **Recommended fix.** QW11 first. Then the correctness bugs: (1) the result-cache key is block text
  only (`queryjs-block-widget.ts:98,207`), so week 40 re-attached week 42's chart (VERIFIED log
  sequence); key it on file + text, with an ADR 0010 amendment. (2) `execute` reads
  `editorStore.activeTabPath` after an await (`:187-192`) instead of the `filePath` captured in
  `toDOM` (`:88`); pass it in. (3) Destroy Chart.js instances when results are dropped. Then E-1
  (shared page memo keyed on entries-array + `collectionStore.version`, with a per-block list copy:
  `pages()` passes `cache.list` uncopied, `kb-api.ts:77`).
- **Alternatives.** E-2 filter-first page building (medium). E-5 defer execution past the first
  frame (only helps inline blocks, and only with the captured `filePath` fix). E-7 cache script text
  (latency only).
- **Risks.** Fixing the cache key and first-open semantics raises executions, and with them the
  Chart.js leak. The deep dive's per-block first-open marker (E-4) breaks the matrix row
  "first-open, cache miss after edit -> Run button" (`queryjs-block-widget.ts:40-44`); the owner
  must choose the semantics.
- **Open questions.** Real `ensureCache` vs Chart.js share (QW11). Whether the owner saw a wrong
  week's chart. Memory held by a shared page set. Chart.js resize/animation work after
  `profileEnd`.

### F. Embed `resolveLink` in `toDOM`

- **Root cause.** `appEditorHost.resolveLink` (`editor-host.ts:59-61`, VERIFIED) flattens the 43k-node
  proxied tree and runs two linear scans on every call. `WikilinkImageEmbedWidget.toDOM` and
  `loadEmbedContent` call it synchronously (`widgets.ts:545,597`, VERIFIED), so every embed drawn
  costs 30-65 ms, against CLAUDE.md live-preview rule 2.
- **Recommended fix.** QW3.
- **Alternatives.** F-2 draw the right viewport once on a tab switch: its premise (previous tab's
  scrollTop) was refuted; first find why fresh tabs land scrolled down. F-3 `$state.raw` is B's QW7.
  F-4 exact vault-relative path match: a correctness change (any `![[foo.png]]` can resolve to
  `foo.md`, `wikilink-resolution.logic.ts:4-8,24-29`); owner decision.
- **Risks.** A stale map if a future change mutates tree paths in place (none today; every writer
  assigns a new root). A module-level `lastTree` keeps the previous vault's tree alive after
  teardown; a `WeakMap` avoids it.
- **Open questions.** Why fresh tabs land scrolled down (second render wave). The 50 ms
  `_gmail-inbox` note. Dev vs release Svelte.

### G. Background embedder

- **Root cause.** Chunk keys include the absolute `line_start` (`chunker.rs:395`), and the diff
  matches by key (`semantic.rs:1238-1242`, VERIFIED), so a line inserted above a heading re-embeds
  every later chunk although its `content_hash` is unchanged. Calls read hashes before the
  `EMBEDDER` lock and commit after releasing it (`:1233`, `:1266`, `:1288`, `:1299`), so overlapping
  calls repeat work and can commit out of order. The no-change startup build never arms the idle
  unload (`:543-553`).
- **Recommended fix.** QW9, QW10. Then G-1 hash-matched vector reuse (small; pure planner,
  failing-first test without a model at `semantic_commands_test.rs:594-648`). Then the verifier's
  smaller G-2: load-if-missing, re-read hashes and commit under one `EMBEDDER` guard. Fold it into
  the existing `.scratch/embedder-memory/issues/03-double-semantic-embed-per-save.md` together with
  `embedder-memory/02` and `embedder-burst-cpu/04`. Do not open a duplicate Issue.
- **Alternatives.** The deep dive's per-path generation map (heavier, the verifier argues against
  it). G-5 patch the search cache in place (helps semantic/hybrid users only). G-6 ORT memory tuning,
  gated on QW10 data.
- **Risks.** G-1's safety argument in the deep dive was wrong (recipe changes do not change
  `content_hash`). Reuse is safe because the unchanged-hash skip already keeps old vectors and the
  startup build clears on a recipe change. Decide `embedded_at` for re-keyed rows. G-2 longer
  parking widens the vault-switch window: a parked call can commit into the next vault's DB
  (`embedder-memory/07`: `shutdown_semantic` does not clear `VAULT_PATH`). An out-of-order commit can
  leave orphan rows that persist until the note is edited again.
- **Open questions.** Cause of the 21.5 s pass. The model's real RSS share. Sysinfo RSS semantics.
  The JS chunker port was not diffed against the Rust chunker.

## 4. Proposed `.scratch` Issue breakdown

Suggested slug: `.scratch/ui-responsiveness/issues/`. One Issue per independently shippable fix,
ordered by gain per effort. "Gate" follows CLAUDE.md rule 6.

| NN | Issue | Gate | Depends on |
|---|---|---|---|
| 01 | Drop the startup `buildTaskIndex` call (QW1) | Frontend | - |
| 02 | Map index + split timers in `buildTagTree` / `buildTagIndex` (QW4) | Frontend | Ship with or right after 01 (01 moves the startup wait onto C) |
| 03 | Prefilter `get_tasks_in_section_v2` by `entry.tasks`, log K, fix the doc comment (QW2) | Rust | - |
| 04 | Memoize `resolveLink` / `listLinkCandidates` on tree identity (QW3) | Frontend | - |
| 05 | `CollectionView` synchronous seed + reset first-run guard (QW5) | Frontend | - |
| 06 | Watcher modify-only skip in `handleChangedPaths` (QW6) | Frontend | - |
| 07 | `fileTree` as `$state.raw` (QW7) | Frontend | - (04 and 06 do not need it; it lowers the cost of every other tree walk) |
| 08 | Native main-thread heartbeat + Rust-side timestamps in `debug_log` (section 5) | Both | - (land early: it measures 09, 10, 13 and 19) |
| 09 | `scan_vault` async + `loadDirectoryTree` generation guard (QW8) | Both | 08 to measure the gain |
| 10 | Filter `write_atomic` `.tmp-<pid>-<seq>` paths in the Rust watcher | Rust | - (removes the 381 ms full rebuild per non-Markdown creation and makes 06 cover creation echoes) |
| 11 | Targeted tree update for app-initiated create / rename / move / restore (direct insert or subtree rescan, rebased after await; all call sites incl. `templates.service.ts:122`, `deep-link.service.ts:235`) | Frontend | 07 (cheap patches), 06 |
| 12 | Collection table row cap + keyed rows | Frontend | 05 (independent, but ordered after) |
| 13 | `get_tasks_in_section_v2` async + `buildTaskIndex` sequence guard | Both | 03 |
| 14 | Embedder: idle unload in the no-change build branch (QW9) | Rust | `embedder-memory/07` per the deep dive (the verifier rates that risk small) |
| 15 | Embedder: per-pass rusage line (QW10) | Rust | - |
| 16 | Embedder: hash-matched vector reuse (G-1) | Rust | - |
| 17 | queryjs phase timers + run-prompt log (QW11) | Frontend | - |
| 18 | queryjs correctness: cache key file + text (ADR 0010 amendment), captured `filePath` in `execute`, Chart.js `destroy` on drop | Frontend | 17 |
| 19 | queryjs first-open semantics for multiple blocks | Frontend | Owner decision; 18 |
| 20 | queryjs shared page memo (E-1) | Frontend | 17 data showing `ensureCache` is the cost |
| 21 | `CollectionView` `{#key path}` remount (fixes the `activeViewIndex` leak) | Frontend | 05; owner OK on "returns to view 0" |
| 22 | Narrow tree deps in `AppShell` / `CalendarNavigator` / `RailNoteList`, drop the unread `attachFileCounts` walk (B-7, B-8) | Frontend | 07 |
| 23 | Investigate why fresh tabs land scrolled down (second render wave, F-2) | Frontend | 04 (so the leftover cost is layout only) |
| 24 | Semantic stats: skip the duplicate startup fetch; async `save_snapshot` / `get_semantic_file_status` with a stale-response guard (A-F4) | Both | 08 to confirm the DB-mutex wait |

Not new Issues: G-2 belongs in the existing `embedder-memory/03`. Fix 4 of F (exact path
resolution), A-F5 (headings in the index), C-5 (drop `filePaths`), G-5 and G-6 wait for the owner
or for data.

## 5. Measurement gaps and what to add

| Gap | Why it matters | Add |
|---|---|---|
| Native app main-thread stalls are invisible. `[HB]` runs in the WebContent process | A (seconds) and B (`scan_vault`) block the thread that dispatches every IPC and owns the window. The JS heartbeat stayed green through A's 1.8 s block | A Rust heartbeat: a background thread posts `run_on_main_thread` every 250 ms and logs `[MAIN-HB] stall Nms` when the closure runs late. Optional: an Instruments time profile of one startup |
| `[TAURI:RUST:*]` timestamps are webview receipt times (`debug.ts:124-127`, `log.service.ts:66`) | During a JS block, Rust lines arrive late in a burst. The A and C masking analysis needed manual correction | Put a Rust-side monotonic or wall timestamp in the `debug_log` payload (`utils/logger.rs:47-58`) and print both times |
| No IPC queue-wait metric | Cannot tell a command's body time from time spent waiting behind another sync command | Log JS `invoke` start next to the Rust `enter` and report `queue = enter - invoke` per command in `ipc.ts` |
| Each `appendLog` line is its own `writeTextFile` IPC (`log.service.ts:67-69`) | With LP-TRACE on (~40 lines per decoration pass), logging inflates every gap that the analysis uses as a bound | Buffer lines and flush every N ms or N lines |
| `timeAsync` mixes IPC wait, JS and the Svelte flush (`debug.ts:41-51`) | `buildTagIndex` "694 ms" and `loadDirectoryTree` "464 ms" are not CPU numbers | Per-step `timeSync` inside `buildTagIndex`, `loadDirectoryTree`, `handleChangedPaths` (pre-IPC, IPC, post-IPC) |
| No timing inside `CollectionView` mount, embed `toDOM`, queryjs `ensureCache` / chart, or the Svelte flush after `setFileTree` | D, E, F and B's cascade are attributed from log gaps and benches | `profileStart` around embed `toDOM` (temporary), collection mount timer logged from an `$effect` or `untrack` (not from `$derived`), QW11 timers. A WebKit timeline for B's cascade |
| `[NAV] click -> next paint` is measured in the content process | It cannot see UI-process paint stalls caused by the native main thread | The native heartbeat covers it. Cross-check one session with a screen recording |
| Watcher batch paths are not logged | The `write_atomic` temp-path cause of the 381 ms full rebuild is INFERRED | Log the batch paths (capped) in `fs.watcher.ts` |
| RSS is sampled only on watcher events (`debug.ts:144`). No sample after the unload. Sysinfo semantics unknown | G's "model = 1.0-1.3 GB" is not isolated | A periodic RSS sample (e.g. every 10 s while debug log is on), one right after "Embedder unloaded", and `phys_footprint` next to RSS |
| No per-pass embedder CPU or page-ins | The 21.5 s outlier stays unexplained | QW10 |
| Build flavour (dev or release) not logged | D and F per-row and per-embed costs differ by ~1.6x between Svelte dev and prod | Log `import.meta.env.DEV` and the Rust profile once at session start |
| Vault shape not logged: K (notes with tasks), R/P (tags), dir count, properties and links per note | The A, C, B and E gain estimates hang on these | One-time counts at index build (Rust `VaultIndex` already has them) |
