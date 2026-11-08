# E: queryjs on first open of journal notes (deep dive)

Read-only. Code paths are repo-relative. Log: `2026-11-02_14-52-43.log`. Vault: `brain-os-vault`.
Bench: `/tmp/ui-resp-bench/E/` (node 26, V8, synthetic vault of 10,628 notes; JSC in WKWebView will differ).

## Summary

- The 282 ms and 155 ms `qjs-execute` numbers are wall-clock across two `readTextFile` awaits, not
  CPU. Other tasks ran inside both windows (watcher handler 86 ms, scroll restore, decoration rebuild).
  The queryjs work is one synchronous chunk at the end of each run, after the second script file is
  read. That chunk is at most 60 to 116 ms per block (upper bounds from log gaps, table below). In the
  282 ms run it is at most 77 ms of the 430 ms `[HB] stall`; the rest is finding B (`loadDirectoryTree`).
- Root cause of the chunk: every block execution makes a fresh `KBAPI` (`queryjs-block-widget.ts:188`).
  Its first `kb.current()` / `kb.pages()` runs `ensureCache()` (`kb-api.ts:373-402`), which builds a
  `KBPage` for all 10,628 notes, whatever the filter. Node bench: 85 to 190 ms per build (sensitive
  to property and link counts). Nothing is shared between blocks, notes or runs.
- The result cache rarely saves a run, because any note write clears all of it
  (`queryjs-ports.ts:15` -> `queryjs-block-widget.ts:31-33` -> `queryjs-session.store.svelte.ts:83-85`).
  Note creation on navigation, the watcher and autosave all write.
- Two correctness bugs in the same path. They keep today's cost low; fixing them will raise it:
  1. Under `first-open` (the owner's setting, `.kokobrain/settings.json`), only the FIRST queryjs block
     of a note auto-runs. Block 1 marks the file (`queryjs-block-widget.ts:117`) before block 2's
     `toDOM` checks the mark (`:109`), so block 2 shows "Query not run yet". Every journal note
     has two blocks.
  2. The result cache is keyed on block text only (`:98`). All weekly notes share the same text, so
     week 40 and week 41 re-attached charts built for week 42 and week 40 (log 17:54:59.534 and
     17:55:00.554). The scripts read `kb.current()`, so that is the wrong week's data.
- Best fix: one page build shared per index state (memo keyed on the entries-array and
  `propertyIndex` identities, shallow clone per block). It turns the second and later blocks
  from ~100 ms into ~6 ms. Filter-first page building cuts the first block too.

## Evidence

### Code path (VERIFIED)

1. `toDOM` (`queryjs-block-widget.ts:68-126`): cache lookup by `jsContent` (`:98-103`), policy (`:106-109`),
   `markAutoRun(filePath)` (`:117`), then `this.execute(container)` without awaiting it (`:118`).
2. `execute` (`:172-212`): `profileStart` (`:173`), placeholder (`:177-180`), `await getVaultEntries()`
   (`:187`, a resolved memo promise, so only a microtask yield: `vault-entries.service.ts:26-38`,
   `utils/inflight.ts:137-147`), `new KBAPI` (`:188-195`), `await runQueryjsBlock` (`:197`), `profileEnd` (`:198`).
3. The block body `await kb.view("_system/queryjs/weekly-wellness-chart")` -> `runView` -> `await
   this.loadScript` (`kb-api.ts:351`) = `readTextFile` IPC (`queryjs.service.ts:4-6`). That is a real task
   yield. The script calls `kb.view('_system/queryjs/_shared-weekly-radar', ...)` (vault
   `_system/queryjs/weekly-wellness-chart.js:1`), which is a second IPC and a second yield.
4. After the second read, everything is synchronous until the end. `kb.current()`
   (`_shared-weekly-radar.js:9`) -> `ensureCache()` (`kb-api.ts:373-402`): `Array.from` x2, `buildReverseIndex`
   (`queryjs.logic.ts:46-62`), `buildResolutionCache` (`wikilink-resolution.logic.ts:41-50`), `buildKBPage` x N
   (`queryjs.logic.ts:107-166`: inlinks, tasks, outlinks, a frontmatter copy with `maybeParseDate` per value),
   `byPath` map. Then the `kb.pages('#type/journal/daily')` tag filter over N pages (`kb-api.ts:67-78`,
   `queryjs.logic.ts:179-185`), `whereDate`/`byDate` over the tagged set (`data-array.ts:79-106`),
   `kb.ui.chart` (`kb-ui.ts:555-669`). `loadChartJS` is cached after the first chart (`kb-ui.ts:910-914`),
   so its `await` is a microtask. Then `new ChartCtor(canvas, config)` (`kb-ui.ts:666`) and the table.
5. A `pages('#tag')` call builds every page before it filters (`kb-api.ts:68-73`), so a narrow filter costs as
   much as `kb.pages()`.
6. `collectionStore.propertyIndex` is a plain Map (Svelte proxies only plain objects and arrays,
   `node_modules/svelte/src/internal/client/proxy.js:51-55`, svelte 5.57.2). Every mutation replaces it
   (`collection.store.svelte.ts:24-44`). The entries memo returns one array per version, and a patch returns a new
   array (`vault-entries.logic.ts:9-27`). Both identities are therefore valid cache keys.

### Per-block synchronous chunk (VERIFIED log lines, bound INFERRED)

The chunk starts after the last logged event before `qjs-execute` ends, so each value is an upper bound. In every
case the post-tab-switch `forceDecorationRebuild` (usually 5-10 ms after "restoring scroll", e.g. 17:56:27.802 ->
.807) waits until the run ends.

| Run start | Note / block | Wall | Last other event -> end | Chunk upper bound |
|---|---|---|---|---|
| 17:54:12.184 | week 45 / wellness | 104 | decorationRebuild .227 -> .287 | 60 ms |
| 17:54:53.542 | week 40 / wellness | 282 | decorationRebuild .747 -> .824 | 77 ms |
| 17:54:53.870 | 10-Oct / monthly-satisfaction | 155 | restoring scroll .903 -> rebuild .990 | 87 ms |
| 17:54:54.395 | Q4 / quarterly-satisfaction | 182 | restoring scroll .461 -> .577 | 116 ms |
| 17:54:54.862 | 2026 / yearly-satisfaction | 132 | restoring scroll .898 -> .994 | 96 ms |
| 17:54:57.234 | week 43 / wellness | 103 | HB alive .275 -> .337 | 62 ms |
| 17:54:58.332 | week 42 / wellness | 106 | restoring scroll .367 -> .439 | 72 ms |
| 17:54:59.535 | week 40 / habits | 100 | HB alive .571 -> .635 | 64 ms |

Inline blocks with no `kb.view` (17:56:27-17:56:39, `22/23/24-queryjs*.md`) take 60-89 ms. They make no IPC, so
the whole run happens in the microtask checkpoint of the tab-switch task, before the first frame. Example:
17:56:27.719 MISS, "restoring scroll" only at .802, after the run ended at .798.

### ensureCache microbenchmark (VERIFIED run, synthetic data)

`/tmp/ui-resp-bench/E/bench.mjs` copies `kb-api.ts:53,373-402`, `queryjs.logic.ts:11-185` and
`wikilink-resolution.logic.ts:4-67`. N=10,628, 6,040 tag pool, 900 daily notes, P = properties per note,
L = links per note. Steady-state medians:

| P / L / tags | ctor Map | reverse idx | res. cache | buildKBPage x N | byPath | tag filter | total |
|---|---|---|---|---|---|---|---|
| 4 / 3 / 2 | 0.7 | 8 | 9 | 64 | 1 | 2 | 84 ms |
| 8 / 6 / 2 | 0.6 | 16 | 8 | 86 | 1 | 2 | 114 ms |
| 15 / 10 / 2 | 1.0 | 24 | 10 | 152 | 1 | 4 | 193 ms |
| 25 / 15 / 4 | 1.1 | 38 | 10 | 212 | 3 | 7 | 273 ms |

Breakdown at P=8/L=6 (`breakdown.mjs`, noisy): building inlinks (`resolveInlinks` + `buildKBLink` per source,
`queryjs.logic.ts:69-84`) is about half of `buildKBPage`; date parsing is about 15%. The vault's real P and L
were not measured. The app's 60-116 ms chunks fit the low rows.

Fix shapes (`fixes.mjs`, `clone.mjs`, separate processes, noisy):

| Variant | ms |
|---|---|
| today, 2 blocks on one note | 208-291 |
| shared memo, first block | ~111 |
| shared memo, later block (no clone) | 0.5 |
| per-block shallow clone of root + `file` + byPath | 6.3 |
| filter-first `#type/journal/daily` (900 of 10,628 built; reverse index and resolution cache still whole-vault) | 28-56 |

### Correctness side findings (VERIFIED code, log sequence; not visually confirmed)

- Second block not auto-run: the raw extract has no `QJS-PROFILE` line for `weekly-habits`, `monthly-practices`,
  `quarterly-practices` or `yearly-practices` on first open, though every note has two blocks (week 40 lines 26-31,
  10-Oct lines 26-31). `renderRunPrompt` does not log (`:143-169`). The whole doc was in view
  (`visibleRanges` up to the end). Habits auto-ran only at 17:54:59.535, when wellness was a cache HIT and so
  did not mark the file.
- Cross-note result sharing: week 42 stored wellness at 17:54:58.439. Nothing cleared the cache until 17:54:59.534
  (no watcher, save or creation between, per the grep of that window). Week 40 then re-attached that element.
  Week 41 re-attached it plus week 40's habits element (17:55:00.554). `_shared-weekly-radar.js:9-30` and
  `weekly-habits-chart.js:14-19` depend on `kb.current().created`. ADR 0010 chose content keys on purpose
  ("we want one cache entry per distinct script body"); it did not account for `kb.current()`.
- Stale comment: `queryjs-block-widget.ts:51-53` says invalidation is per content. It is a full clear.

## Root cause

Per-execution, whole-vault materialisation of `KBPage` objects in `KBAPI.ensureCache()` (`kb-api.ts:373-402`),
triggered by `kb.current()` or any `kb.pages()` and never shared (`queryjs-block-widget.ts:188`). The cost is O(N + links)
regardless of the filter (`kb-api.ts:68-73`). Re-execution is frequent because the result cache is wiped on every
note write (`queryjs-ports.ts:15`, callers `editor.hooks.ts:83`, `watcher-handler.service.ts:75,115`,
`trash.service.ts:258`). Opening a periodic note that does not exist yet creates it, and creation is a write.

## Impact

- Thread: webview JS main thread. One contiguous long task of about 60-116 ms per executed block (upper bounds),
  after the note's first paint for `kb.view` blocks. For inline blocks it lands before the first paint.
- What the user sees: the note paints with "Running query…", then input, scrolling and the post-switch decoration
  rebuild freeze for about 0.1 s until the chart appears. During fast prev/next navigation (8 periodic notes in 7 s at
  17:54:53-17:55:00) this adds to finding B's 420-480 ms tree reload, so each step feels like a ~0.5 s hitch.
  queryjs is about 15-20% of that.
- Frequency: every first open of a periodic note after any write. That is nearly every open, since writes are
  constant. Today it is one block per note because of bug 1. Fixing bug 1 doubles it (two blocks, about 120-230 ms
  of back-to-back main-thread work per note). Fixing bug 2 adds runs on revisits that today wrongly hit the cache.
- The 282 ms headline overstates queryjs by about 3.5x; its own chunk is at most 77 ms.
- impact_score 4: sub-150 ms hitches, hit routinely in the journal workflow, worse once the correctness bugs are
  fixed. It never causes a multi-second freeze.

## Fixes (ranked by gain)

### 1. Share one page build per index state (quick-win)

- What: a module-level memo for the page base, keyed on `(entries array, propertyIndex Map)` identity. Rebuild
  when either identity changes. Each `KBAPI` gets a shallow per-block copy (`{...page, file: {...page.file}}` plus
  its own `byPath`) so `mutate` / direct assignment (documented, `help/documentation/13-queryjs.md:338`) cannot
  leak between blocks. Also reuse `entriesByPath` from the memo instead of `kb-api.ts:53`.
- Files: `src/lib/plugins/queryjs/kb-api.ts` (ensureCache, constructor); optionally a pure
  `buildPageBase(propertyIndex, entries)` in `queryjs.logic.ts`; tests in `src/tests/lib/plugins/queryjs/kb-api*.test.ts`.
- Gain: second and later blocks at one index state go from ~60-116 ms to ~6-8 ms (clone + script).
  In the measured burst, 3 of 7 executions (10-Oct, 2026, week-40 habits) would have hit. After the bug-1 fix,
  every second block on a note hits. The first block after a write is unchanged.
- Risks: retained memory for one page set (estimate 10-20 MB, not measured). Nested arrays (`file.tags`,
  `inlinks`, `outlinks`, `tasks`) stay shared, so a script that does `p.file.tags.push()` leaks; document it or
  clone those too (more ms). Vault scoping: both keys change identity on vault switch (`invalidateVaultEntries`,
  `collectionStore.reset`/`setPropertyIndex`), so no new teardown hook is needed. Holding the previous vault's pages
  until the next build is a memory-only issue; dropping the memo in `queryjsSessionStore.reset()` closes it.
  This does not touch `applyNoteChange` ownership or the `vaultIndexVersion` consumers. It reads the same two inputs as today.
- Tests (failing-first): two `KBAPI` instances over the same `entries` array and `propertyIndex` Map;
  `kb1.page(p).file.inlinks === kb2.page(p).file.inlinks` is false today and true after.
  Regression guards (pass both before and after): `kb1.pages().mutate(p => { p.x = 1 })` leaves
  `kb2.page(p).x` undefined; after `collectionStore.updateRecord(p, rec)` a new `KBAPI` sees the new
  property; `kb-api-contract.test.ts` page shape unchanged.

### 2. Filter-first, lazy page building (medium)

- What: `pages('#tag' | '"folder"')` filters on `entry.tags` / `record.folder` before calling `buildKBPage`.
  `current()` / `page(path)` build one page into a per-block lazy `byPath`, so a page is the same object within
  a block. Only bare `pages()` builds all N. Keep the reverse index and resolution cache in the fix-1 memo
  (or memo them on the entries identity).
- Files: `kb-api.ts` (pages, current, page, ensureCache), `queryjs.logic.ts` (an entry-level filter mirroring
  `parseSource`), tests.
- Gain: the first block after a write drops from ~60-116 ms to roughly 10-30 ms for `#tag` scripts (bench 28-56 ms
  with the indexes rebuilt; less with them memoised). Stacks with fix 1.
- Risks: the filter must match `parseSource` exactly (case-folding, subtag prefix, folder `includes`).
  Order must follow `propertyIndex` key order. A note in `propertyIndex` without an entry has no tags today
  (`entry?.tags ?? []`), so keep that. The contract surface is unchanged.
- Tests: for a fixture vault, `kb.pages('#a')` deep-equals `kb.pages().where(p => tag match)`, the same for
  folders, plus `kb.current() === kb.page(currentPath)` within a block. These pass before and after, so they
  guard equivalence. The perf gain is checked via LP-PROFILE.

### 3. Correctness: key results by file and content (small, raises cost)

- What: `getResult` / `setResult` key = `filePath + '\u0000' + jsContent` (`queryjs-block-widget.ts:98,207`).
  ADR 0010 needs an amendment, since content-only keys were a deliberate choice.
- Gain: none for speed. It costs one execution per revisit that today wrongly hits. Pair it with fix 1/2.
- Risks: the "two identical visible blocks" guard (`:90-103`) and its test stay valid. `invalidatePath`
  semantics are unchanged.
- Test (failing-first): render block X in note A with a cached result, switch `activeTabPath` to B and call
  `toDOM()` for the same X. Today A's element is re-attached; after the fix it misses. Exists:
  `queryjs-block-widget.test.ts:43-53` pattern.

### 4. Correctness: auto-run every block on first open (small, raises cost)

- What: make the first-open marker per block, not per file (e.g. `${filePath}\u0000${jsContent}`), or mark after the
  render pass. The owner needs to pick the semantics (open question).
- Gain: none for speed. It doubles executions per journal open (2 blocks), so land it after fix 1.
- Risks: the autoRunQueries matrix and the manual-mode invariant (`:46-49`, CLAUDE.md perf rule 10): manual must
  still never mark. `invalidatePath` on tab close must drop every marker for that path.
- Test (failing-first): `first-open`, two different blocks, same active file, `toDOM()` both. Today the second has
  `.cm-lp-qjs-run`; after the fix neither does.

### 5. Defer the first-open execution past the first frame (small)

- What: keep the cache check, policy and `markAutoRun` synchronous in `toDOM`. Schedule `execute` with
  `requestAnimationFrame(() => setTimeout(...))` (`:118`).
- Gain: inline blocks (no `kb.view`) stop delaying the new note's first paint by 60-89 ms. `kb.view` blocks already
  yield on IPC, so this gives them nothing. CPU is unchanged.
- Risks: the window between marking and the result grows by about a frame. A save during it stores pre-save
  output (that race exists today). It must run even if the widget is destroyed.
- Test: with fake timers, `toDOM()` returns a container with the "Running query…" placeholder and no script effect
  until the timers run.

### 6. Cache `kb.view` script text and compiled functions (small, low gain)

- What: memoise `loadScript` by path (invalidated on a write to that path) and `new Function` by code.
- Gain: two IPC round trips per block (latency, not main-thread CPU). `readTextFile` latency is not logged.
- Risks: a stale script after an edit made outside the app if the invalidation misses watcher events.

### 7. Narrow `clearResults()` to the written note (not recommended alone)

- The Phase 12.5 TODO (`:27-29`). Charts that aggregate other notes (dailies feed weeklies) would then go stale.
  Charts are cheap to recompute after fixes 1-2, so a full clear is the safer policy.

## Quick wins

- Fix 1 (shared page memo + per-block shallow clone): about 40 lines in `kb-api.ts` plus 3 tests. Measured
  gain: later blocks go from ~100 ms to ~6 ms each. It is the prerequisite for fixes 3 and 4.
- Step 0, instrumentation, about 10 lines. Add `appendLog('QJS-PROFILE', ...)` timers around `ensureCache`
  (N, ms) and around the post-IPC script body, and a log line in `renderRunPrompt`. It confirms the 60-116 ms split
  and bug 1 in the next owner session. No behaviour change.

## Open questions

- Real P (properties per note) and L (links per note) in the vault, and the count of `#type/journal/daily` notes.
  Bench rows span 84-273 ms; the app's chunks suggest the low end.
- How much of each chunk is `new ChartCtor` (Chart.js measures layout on construction, `kb-ui.ts:666`) vs
  `ensureCache`? Step-0 timers answer it.
- Bug 1: should first-open auto-run every block of a note (per-block marker) or every block in view at open?
- Bug 2: was the owner seeing the wrong week's chart? Repro: open week 42, then week 40 with no write in between,
  and compare the radar to week 40's dailies.
- Memory retained by a shared page set, measured with a heap snapshot.
- Whether the first chart of a session (17:54:12) paid a Chart.js chunk load. The 60 ms bound says it was small.

## Not verified

- The app was not run and no timer was added; chunk sizes are upper bounds from log gaps. Node/V8 bench numbers are
  not JSC numbers.
- Not read: the quarterly/yearly/practices scripts and any daily note. Bug 1 rests on code plus missing log lines,
  bug 2 on code plus log order; neither was confirmed on screen.
