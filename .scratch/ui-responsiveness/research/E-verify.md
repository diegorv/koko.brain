# E: adversarial verification of `E-deep-dive.md`

Read-only. I re-read the code and re-grepped the log (`2026-11-02_14-52-43.log`) for each run window.
Verdict: **partially confirmed**. The code-path root cause and both correctness bugs hold. The magnitude is
overstated, and the bench-based gain estimates for fixes 1 and 2 don't fit the in-app data.

## What survives (VERIFIED)

- A fresh `KBAPI` per execution (`queryjs-block-widget.ts:188-195`). The first `current()`/`pages()`/`page()` call
  builds every page (`kb-api.ts:68,87,92` -> `ensureCache` `:373-402`). The filter runs after the full build (`:70-74`).
  Nothing is shared across blocks.
- The nested `kb.view` inside a view script reuses the same `KBAPI` (`kb-api.ts:360-361`, `fn(this, this, input)`),
  so one block = one build.
- The post-IPC tail has no task yield: `loadChartJS` returns the cached module (`kb-ui.ts:910-914`). Everything else
  in `_shared-weekly-radar.js` / `_shared-period-radar.js` is sync or a microtask. Exception: the session's first
  chart, which awaits a real dynamic `import()`.
- The full clear on write: `queryjs-ports.ts:15` -> `queryjs-block-widget.ts:31-33` -> `queryjs-session.store.svelte.ts:83-85`.
  Callers: `editor.hooks.ts:83`, `watcher-handler.service.ts:75,115`, `trash.service.ts:258`.
- Identity keys are valid. `collectionStore.updateRecord`/`removeRecord` copy the Map (`collection.store.svelte.ts:31-44`).
  `patchEntriesSnapshot` returns a new array (`vault-entries.logic.ts:9-27`).
- Bug 1 (only the first block auto-runs under first-open). `markAutoRun(filePath)` runs synchronously in block 1's
  `toDOM` (`:117`) before block 2's `hasAutoRun` check (`:109`). The marker is per file (`queryjs-session.store.svelte.ts:38,88-98`).
  The log fits: at 17:54:59.534/.535 week 40's wellness was a HIT and did not mark, and habits then auto-ran. No
  existing widget test covers two blocks in one file (`queryjs-block-widget.test.ts` `it(` list).
- Bug 2 (another week's chart re-attached). Week 42 stored wellness at 17:54:58.439. Lines 11700-11925 show no save,
  watcher event or trash restore before the 17:54:59.534 HIT on week 40. The previous wellness entry had been cleared
  by the watcher at 17:54:57.712. So the element week 40 re-attached was week 42's. `_shared-weekly-radar.js:9`
  reads `kb.current()`. ADR 0010:59 chose content keys deliberately.
- "3 of 7 would hit" under fix 1 is plausible:
  - 10-Oct after week 40: no index change between 53.542 and 53.870.
  - 2026 after Q4: the watcher update at 54.026-.040 and `get_index_delta` at 55.055 fall outside that pair.
  - Habits after week 42: nothing between 58.332 and 59.535.
  - INFERRED: this assumes the create-path consumer wrote `propertyIndex` before each run.

## Corrections

1. **The 10-Oct row is wrong (87 -> at most 33 ms).** Rebuild rAF2 ran at 17:54:53.990-.992. `qjs-execute` ended
   at 17:54:54.025. The chunk has no task boundary, so it lies inside .992-.025, which caps it at 33 ms.
   The deep dive used the earlier rAF1->rAF2 gap (.903->.990), which was not queryjs. It used the rebuild->end
   gap for week 40 and week 45, so the method is inconsistent across rows.
2. **The 33 ms bound refutes the bench as a cost model.** That run did a full `ensureCache`, then the
   `#type/journal/weekly` filter, `whereDate`, sort, radar chart and table, all within 33 ms in JSC. The bench's
   lowest row is 84 ms for `ensureCache` alone. "The app's chunks fit the low rows" is false. In-app `ensureCache` is
   about 30 ms at most.
3. **The 60-116 ms gaps are mostly not queryjs.** In 6 of 8 rows the chunk sits between rAF1 ("restoring scroll")
   and rAF2. So the gap also contains that frame's style, layout and paint, plus any tab-switch effects that come
   after it. In 10-Oct the frame was rendered before the chunk and took 87 ms by itself.
   - Honest per-block bound: at most 33-116 ms, and probably about 30 ms of real queryjs work.
   - Corrected two-block estimate after the bug-1 fix: about 60 ms of queryjs, not 120-230.
4. **Inline runs are not "the whole run is queryjs".** In 22-queryjs, docReplace ended at .720 and other tab-switch
   effects logged until .740 ("activeTabPath changed"). The queryjs share is therefore at most 58 ms, not 79.
5. **The "rest of the 430 ms stall is finding B" claim is too broad.** `loadDirectoryTree` ended at 53.523. After
   that came the watcher's `handleChangedPaths` (53.573-.659, B's second leg), then 87 ms of unlogged work
   (.659->.746). That 87 ms cannot be queryjs, because rAF2 falls between it and the queryjs end.
6. **Note creation does not clear the cache directly.** `openOrCreateNote` is not a `notifyContentInvalidated`
   caller. The clear comes from the watcher event that follows (54.026, 57.712). In this burst, most executions came
   from first-seen block texts and new notes; clears forced only the week-43 and week-42 reruns.
7. **The fix-1 leak risk is overstated.** `file.tags` already is the entries-memo array today (`queryjs.logic.ts:114,148`).
   Non-date property values are already the `collectionStore` record's objects (`:159-161`). So `p.file.tags.push()`
   already leaks across blocks and into the shared snapshot. Fix 1 only adds `inlinks`, `outlinks`, `tasks` and
   `KBDateTime` values to the shared surface.
8. **Internal inconsistency.** The summary says "85 to 190 ms per build"; the bench table says 84-273.
9. **Impact score 4 -> 3.** About 30 ms per executed block (at most 116), one block per note today. That is small
   next to B (420-480 ms) on the same navigation.

## Fixes re-checked

| Fix | Holds? | Notes |
|---|---|---|
| 1 shared page memo | Yes, small and safe | Gain is at most ~25 ms per hit (33 ms bound minus clone), not 60-116 -> 6-8. Keying on `collectionStore.version` (`collection.store.svelte.ts:15`) plus entries identity is equivalent. The per-block list copy is required: `pages()` passes `cache.list` uncopied (`kb-api.ts:77`, `data-array.ts:13-14`), and `mutate` edits in place (`:187-191`). |
| 2 filter-first | Yes, medium | Same overstated gain. The equivalence risks listed are right. |
| 3 key by file+text | Yes, small | Needs an ADR 0010 amendment; ADR line 46 is also stale (it says `reset()`, the code calls `clearResults()`). It raises executions, and with them the Chart.js leak below. |
| 4 per-block first-open marker | **Not as specified** | A `${filePath}\0${jsContent}` marker breaks the matrix row "first-open, cache miss after edit -> ▶ Run" (`queryjs-block-widget.ts:40-44`, ADR 0010:36): an edited block has new text, no marker, and auto-runs on every edit-exit. `invalidatePath` would need a prefix scan. The "mark after the render pass" variant keeps file semantics, but blocks first built on scroll still get ▶ Run. The owner must choose; the variant's cost is not stated. |
| 5 defer past first frame | Yes, with one addition | `execute` reads `editorStore.activeTabPath` after an await (`:187-192`), while `toDOM` captured `filePath` at `:88`. Deferring widens a real race: under fast prev/next, `kb.current()` can resolve to the next note, and with content keys that result is then served on other notes. Pass the captured `filePath` into `execute`. |
| 6 phase timers | Yes | Should come before fix 1, because the attribution to `ensureCache` is unproven (corrections 2-3). |
| 7 cache script text | Plausible, low value | It removes only latency. "Invalidated on writes to that path" needs a hook for `.js` writes, and whether the watcher reports `.js` changes was not checked. |

## Missed risks

- **Chart.js instances are never destroyed.** Every `new Chart` registers in Chart.js's module-level `instances`
  (`node_modules/chart.js/dist/chart.js:5617,5700`) and leaves it only in `destroy()` (`:6269`). A grep of
  `src/lib/plugins/queryjs` finds no `destroy`. `clearResults()` drops the Map, but the registry keeps each chart's
  canvas and container alive. That is a leak per execution, on every journal open after a write. It is relevant to
  finding G's RSS growth, and fixes 3 and 4 multiply it.
- **Chart.js work runs after `profileEnd`.** Its animation frames and ResizeObserver resize happen in later frames
  and are not counted in `qjs-execute`. INFERRED from Chart.js defaults (`responsive: true`, `kb-ui.ts:609`); size
  not measured.
- **The log writer inflates every gap.** Each `appendLog` line is its own `writeTextFile` IPC
  (`log.service.ts:67-69`), and with LP-TRACE on that is about 40 lines per decoration pass. All gap bounds come
  from this instrumented session.
- **Race in `execute`.** `activeTabPath` is read after an await (`queryjs-block-widget.ts:187-192`) instead of using
  the `filePath` from `toDOM`. This is an existing bug, independent of fix 5.

## Not checked

- The app was not run. Every in-app number is a bound from log gaps. GC pauses could explain the 33-vs-116
  variance, but that was not measured.
- The fix 7 watcher behaviour for `.js` files and the Chart.js detach handling were not traced.
