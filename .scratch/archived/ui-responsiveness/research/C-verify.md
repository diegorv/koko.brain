# C verify: adversarial review of C-deep-dive.md

Verdict: **partially confirmed**. The root cause and Fix 1 hold, and a JSC run backs them. The timing
method, the "always masked by A" claim, the magnitude wording and two fix risk lists need corrections.

## Root cause: holds

VERIFIED (code):
- `src/lib/features/tags/tags.logic.ts:13` does a linear `currentLevel.find(...)` with two `toLowerCase()`
  calls per comparison. A miss pushes at `:24`. Each new sibling scans all earlier siblings.
- `src-tauri/src/vault/index.rs:864-889` dedupes tags case-insensitively (`tags_index` key), clones every
  path (`:885`) and sorts by `name.to_lowercase()` (`:888`). The command is sync
  (`src-tauri/src/commands/vault.rs:582-591`).
- `tags.service.ts:22-42` runs the map, build, sort and set synchronously after one await. The only reader is
  `TagsView.svelte:35-39`, and a grep of `src/lib` finds no other `tagsStore` / `buildTagIndex` user
  (`app-lifecycle.service.ts:24,408` only). The mount effect `TagsView.svelte:41-46` always schedules a
  rebuild (300 ms debounce, `tags.service.ts:75-77`). So the startup build is redundant.
- `ipc.ts:21-26` `call()` is a bare `invoke`, with no schema validation in the JS window.

VERIFIED (I ran JSC). This answers the deep dive's "V8 not JSC" caveat. Script:
`/tmp/ui-resp-bench/C-verify/jsc-bench.js`, run with the system
`JavaScriptCore.framework/.../Helpers/jsc` under `nice 19`. It uses the real `buildTagTree` shape, with
fullPath and filePaths, on 6,040 tags sorted lowercase like Rust:

| Shape | current | Map fix | sort(count) | parity (JSON after sort) |
|---|---|---|---|---|
| flat 6,040, lowercase | 274 ms | 2.0 ms | 3.6 ms | true |
| 4,000 roots, lowercase | 177 ms | 2.3 ms | 0.7 ms | true |
| 1,000 roots, lowercase | 43 ms | 2.6 ms | 0.6 ms | true |
| flat 6,040, Capitalized | **1,088 ms** | 5.7 ms | 5.6 ms | true |
| 4,000 roots, Capitalized | 746 ms | 3.2 ms | 0.8 ms | true |

- New factor the deep dive missed: segment casing. When a segment has an uppercase letter, JSC's
  `toLowerCase()` allocates a new string on every comparison, which is about 4x slower (GC pressure). This
  matches the wide 0.4-1.7 s spread better than "flat lowercase" does. On-device the JS block is at least
  ~570 ms (see below). That is already 2x the fully-flat lowercase JSC case, so either the segments are
  mixed-case, or there is CPU contention (the Rust tasks command runs at the same time), or other unlogged
  JS runs in the window. INFERRED. Fix 2 settles it.
- Sort is 1-6 ms and `JSON.parse` of a 2.9 MB payload is ~2 ms in JSC. The deep dive's "sort/parse are
  cheap" holds in JSC too.
- `$state` deep-proxy is refuted as a startup cause. `tags.store.svelte.ts:16` just assigns, and no reader is
  mounted. Svelte's lazy proxying is INFERRED: I did not read `node_modules`, per the rules.

## Measured impact: mostly holds, with corrections

Numbers re-checked against all 12 logs:
- 14 inits, `completed in` 578-2,108 ms, median 915 ms: correct ((765+1,065)/2).
- Rust `after` 10-72 ms: correct.
- 6,040 tags in every session: correct.
- Stalls 635-1,958 ms: correct for the 11 inits that have a stall within 6 lines. 14-49-21 has a 614 ms stall
  at line 73, and 14-49-09 and 18-27-40 have none in reach.

Corrections:
1. **The timing method is wrong.** `[TAURI:RUST:*]` lines get their timestamp in the webview when the event
   arrives, not in Rust (`src/lib/utils/debug.ts:124-127` calls `appendLog`, which stamps `logTime()` at
   `src/lib/utils/log.service.ts:66`). During a JS block these lines are delayed and then land in a burst.
   So the enter/exit timestamps in the deep dive's masking table are receipt times, not Rust times.
2. **"Entirely inside A in every session" is false.** In `2026-11-02_14-49-21` (lines 56-64), tasks
   `enter` arrives at 22.229 with the JS free. `exit ... after 383ms`, `enter/exit get_all_property_records`
   and `buildTagIndex completed` all arrive at 22.786-22.787, so they were queued behind the JS block. The
   real tasks exit is about 22.229 + 0.383 = 22.612, while the JS stays blocked until 22.786. C outlasts A
   by about 170 ms there. The "4 of 4 checked" statement is true as worded, but it is not general: when A is
   short (warm cache), C is the visible freeze today.
3. **Magnitude wording.** 578-2,108 ms is the wall time of `buildTagIndex`, which includes the IPC wait and
   queueing. The JS block is the stall minus up to one 250 ms tick: about 0.4-1.96 s. For 11-02 it is
   567-665 ms (HB alive 43.620, JS free at 43.772 per the tasks `enter` receipt, stall end 44.437), not
   "570-680".
4. **Tags-tab open is more than the build.** In `2026-11-01_19-00-04` (lines 2575-2585):
   - Mount render: stall 378 ms at 40.172, so about 128 ms of block.
   - Build: JS free at 40.678, build done at 42.083.
   - Re-render after `setLoading(false)`: stall end 42.222, so about 139 ms after `completed`.

   About 1.4 s is the build and about 270 ms is two renders (`filterTagTree` over the proxied tree plus the
   DOM). After the Map fix, about 270 ms per tab open remains. The deep dive does not attribute it.
5. The 2026-05-11 note (`tags.service.ts:86-90`, 705 / 975 / 1,241 ms) is the wall time of 4 concurrent
   rebuilds. It is not evidence of quadratic growth.
6. The open question about the 15-360 ms "exit tags -> enter tasks" gap is measured with receipt times. In
   18-45-54 L3992-3995 the JS was alive (HB 09.018) during a 350 ms gap, so the main thread did something.
   Serializing a few MB with serde should take tens of ms, not 350 ms (INFERRED). Untraced plugin commands,
   such as `exists()` from `openOrCreateNote`, are an equally likely cause.

Impact score: the deep dive gives 6, I adjust to 5. Today the startup cost is masked by A in 13 of 14 inits.
The Tags tab was opened once in 12 sessions, and the owner-usage memory does not list Tags. The cost becomes
a daily 0.4-1.7 s freeze only after A is fixed.

## Fixes

1. **Map index in buildTagTree**: valid quick-win. The JSC parity is true for every shape. Keep the
   `pathSoFar` line (`tags.logic.ts:12`) unchanged so `fullPath` semantics stay the same, including the
   existing `/b` -> fullPath `b` quirk. The `i === 0` key rule is correct.
   - Test note: the red run of a 20k-flat budget test takes 6 s or more on this Mac, past vitest's 5 s
     default timeout. It still fails first, but 6,040 flat with a 200 ms budget gives a faster red run with
     the same margin (current about 274-1,088 ms in JSC, fixed about 2-6 ms).
   - `tags.logic.test.ts` has no case-merge or empty-segment test (`grep` of the file): add them, as the
     deep dive says.
2. **Split timers**: valid, safe. `timeSync` exists (`debug.ts:58`), and `perfStart` is used at
   `app-lifecycle.service.ts:406`. Also log the uppercase-segment share, or time the build alone, to separate
   casing from contention.
3. **Keep tree visible during rebuild**: valid. Each block is keyed by `fullPath` (`TagsView.svelte:85`,
   `TagItem.svelte:49`), so the local `open` state (`TagItem.svelte:19`) survives once the `{#if isLoading}`
   teardown (`TagsView.svelte:79`) is skipped. Missed: the gain is small in practice. The tab is a
   full-pane virtual tab, so no editing happens while it is active, and no bump was observed while it was
   open.
4. **Drop eager startup build**: valid, with missed risks.
   - Tests `app-lifecycle.service.test.ts:687` and `:710` are named for the WATCHER path ("rebuilds all
     indexes when external file change is detected"). `rebuildAllIndexes`
     (`watcher-handler.service.ts:30-79`) never calls `buildTagIndex`. They pass only because the startup
     `setTimeout(0)` fires after `vi.clearAllMocks()`. Removing `:408` will fail them, and someone may wrongly
     "fix" that by adding tags to the watcher path. Update them deliberately and say why.
   - "Show loading when the tree is empty" misreads an empty vault: it would show "Indexing tags..." where
     today it shows "No tags found". `TagsView.test.ts:62-67` pins "No tags found" for an empty tree. Use a
     `hasBuilt` flag, not `tagTree.length === 0`.
   - `tags.service.ts:16-20` docs ("Use this directly only for the initial vault-open build") go stale.
   - The gate comment at `app-lifecycle.service.ts:395-401` already says the TagsView effect refills from a
     stale index, so dropping the eager build adds no stale-vault regression (VERIFIED by reading it).
5. **Remove filePaths**: valid medium. Missed:
   - `src-tauri/tests/vault_index_test.rs:1117-1124` asserts that `filePaths` is present in the serialized
     JSON. It must be changed on purpose.
   - The `src/lib/types/vault-v2.types.ts:31` re-export and the test fixtures typed `TagAggregateV2`
     (`tags.service.test.ts:30,247,271-275,304`) also change.
   - `feature/ios-poc` exposes `get_all_tags_v2` over the remote WebSocket (`src-tauri/src/remote/dispatch.rs:247`).
     Its readers (`remote_ws_test.rs:261`, `fixtures/browser-cold-start.json:292`) do not read `filePaths`, so
     there is no blocker, and the payload cut helps the remote client more.
6. **Shared Collator**: not worth it. JSC sort is 0.6-5.6 ms (measured above).

## Open questions remaining

- R, P, and the casing mix (Fix 2).
- Other unlogged JS in the startup window (Fix 2's per-step timers bound it).
- Collapsible.Content closed-children mounting (not checked, `node_modules`).
