# D verify: adversarial review of `D-deep-dive.md`

Read-only. I re-read the code, the Svelte 5.57.2 runtime in `node_modules/svelte`, the session log for 17:55:55 to 17:56:15, and the replica sources in `/tmp/ui-resp-bench/D/`. I did not re-run the replica.

Verdict: **confirmed**. The root cause holds, and so do the numbers. The fixes need the corrections below.

## Root cause: holds (VERIFIED)

- Svelte defers a component's top-level `$effect` until `pop()`, which runs after the template has been built:
  - `node_modules/svelte/src/internal/client/reactivity/effects.js:214-230` pushes it to `context.e`;
  - `context.js:197-207` creates it in `pop`.
- `{#if}` and `{#each}` blocks run during the component function. So the first read of `queryResult` (`CollectionView.svelte:343`, derived at 162-176) sees:
  - `localGlobalFilters` and `localViewFilters` as `[]` (73-74);
  - `filterGroupsToFilter([])` returning `undefined` (`toolbar/filter.logic.ts:142-146`);
  - `executeQuery` keeping every record (`collection.logic.ts:122`, 139-148).
- The reset effect (113-121) has no first-run guard. It sets `initialized=false` and `seededIndex=-1` on mount.
- `CollectionTableView.svelte:43` is an unkeyed `{#each}` with no cap. Line 48 adds 6 cells per row for bug-triage's `order` (6 keys in the YAML).
- The index really holds 10,628 records. The log says `[COLLECTION] Properties: 10628 notes` at lines 72, 83, 3944 and 3958.
- `bug-triage.collection` has a 3-clause global filter, 4 formulas, sort on `formula.urgency` and no `limit`, matching the report.

## Numbers: hold (VERIFIED against the log)

| claim | log |
|---|---|
| 1,292 ms flush | `openFileInEditor EXIT` 17:55:56.154 (l.13774), then `activeTabPath changed` 17:55:57.446 (l.13776) |
| stall 1513 ms | last `[HB] alive` 55.988 (l.13768), then `stall 1513ms` at 57.500 (l.13777) |
| markdown flush 42 ms | 55.690 to 55.732 (l.13685, 13723) |
| collection to collection is cheap | 21 ms (57.529 to .550), 19 ms (59.178 to .197), 12 ms (tab close, 56:14.226 to .238) |

The log has one markdown-to-collection fresh mount that the report did not use: `calendar-recent-edits.collection` opened from `bug-login-timeout.md` at 17:56:00.535, with the flush done at .567, 32 ms and no stall. It fits the theory. That collection is a calendar view with `limit: 50`, so the stale pass is cut to 50 records by `collection.logic.ts:186-188`. The freeze needs a **table view without `limit`**, not just any collection.

## Corrections

1. **The cost split is mostly build, not teardown** (INFERRED from the Svelte source).
   - The `activeTabPath` log line comes from a user `$effect` (`+layout.svelte:99-102`).
   - In `batch.js:394` (`current_batch = null`) and `443-444` (`flush_queued_effects`), writes made by effects go into a new batch, which is processed at `batch.js:480-483` after every queued effect has run.
   - So the seed writes, the 4 later query passes and the 10,623-row teardown all run **after** 57.446. They fit in the ≤54 ms before the HB tick at 57.500.
   - The 1,292 ms is therefore MarkdownEditor destroy plus building 10,628 × 6 cells, about 118 µs per row of **build**. The fix and its gain do not change. The title and the "about 120 µs per row build and teardown" line should say build.
2. **The replica did not bench the proposed implementation.**
   - The "seed in initializers + reset skips first run" variant (`/tmp/ui-resp-bench/D/View.svelte`) seeds through `$state` initializers (which the report itself rules out) and guards reset with a `lastYaml` comparison, not `resetArmed`.
   - The semantics are equivalent. One pitfall the report misses: the `resetArmed` early return must come **after** `void yamlContent`. If it comes before, the first run tracks nothing and the reset effect never runs again. External YAML changes would then stop re-seeding, which the test at `CollectionView.test.ts:119` catches.
3. **"No logs inside the collection code" is too broad.** `collection.service.ts:91-92` logs `buildPropertyIndex`. There is no log in `CollectionView`.
4. **The startup exclusion is moot.** I found no tab restoration: startup opens the daily journal (`openFileInEditor` 17:52:45.686), not a restored tab. A collection opened right after the index is ready would hit the freeze.
5. **Fix 2's claim "index-bump re-renders stop re-patching every row" is overstated.**
   - With formulas, `executeQuery` clones every matched record (`collection.logic.ts:151-153`). A keyed each still updates every rendered row.
   - The cap bounds that work to `cap` rows. Keying does not remove it.
   - "Mirrors COLLECTION_ROW_CAP" is only partly true: the embed shows a static footer (`collection-block-widget.ts:153-157`) and has no Show more.
6. **Fix 4's "Risks: none" is wrong as specified.**
   - `timeSync` calls `debug()`, which reads `settingsStore.debugLogToFile` and `debugMode` (`utils/debug.ts:17-20`). Both are `$state` (`settings.store.svelte.ts:149, 168-170`).
   - Called inside `$derived.by` at line 175, these become dependencies of `queryResult`, so toggling a debug setting re-runs the query.
   - It also times only `executeQuery` (1-3 ms), the part the report itself says is not the cost. Only the `records.length` value is diagnostic.
   - Log from an `$effect` or under `untrack`, and time the mount and flush, not the query.

## Missed risks

- **`.view` files render through the same `CollectionView`.**
  - `editor.service.ts:137` maps `isViewFile` (`.view`, `fs.logic.ts:55-57`) to `fileType: 'collection'`.
  - `createView()` (`type-definitions.service.ts:269-271`) writes a table view with **no filters and no limit**. Its real result is the whole vault, so every open builds about 10.6k rows, and Fix 1 does nothing for it. Only Fix 2 (the cap) covers it.
  - No `.view` exists at the vault root today (ls of `/Users/diegorv/kokobrain-vaults/brain-os-vault`). I did not search deeper.
- **Same pattern on view-tab clicks and external YAML edits.**
  - Changing `activeViewIndex` (line 370) re-renders with the new view but the old view's local filters, columns and sort, and re-seeds only in the post-render effect.
  - The cost is bounded by the previous view's result size (the global filter is shared), so it is small today. Fix 1 does not cover it. Fix 2 does.
- **Dev or release build is unknown.** The log does not say whether this was `pnpm tauri dev`. Svelte DEV-mode overhead would inflate the 118 µs per row. The ratio, and the gain from Fix 1, still hold.
- **Owner usage hint.** The memory note `owner-feature-usage` lists "tables" among daily features. That is ambiguous: it may mean markdown tables. `.collection` is not named. This session was a feature-test pass over `use-cases-test/examples`.

## Fixes

- **Fix 1 (sync seed + reset first-run guard): valid quick-win.**
  - It removes the stale 10,628-row pass on fresh mounts.
  - The `selfUpdate` latch is untouched, as long as `resetArmed` is a plain variable and the guard comes after the `void yamlContent` read.
  - No `applyNoteChange`, `vaultIndexVersion` or queryjs invariant is involved.
  - The proposed test is sound: a MutationObserver plus `takeRecords()` after `flushSync()` would see about 1,997 TR removals today. About 200 records would keep the jsdom run short.
- **Fix 2 (cap + key): valid, small.**
  - It is the only fix that covers legitimately large results (`.view` defaults, broad filters).
  - It should arguably rank above Fix 3.
- **Fix 3 (`{#key path}`): valid.**
  - The `activeViewIndex` leak is real: reset (113-121) never resets it, and the clamp (93-96) only shrinks it.
  - It changes behavior: returning to a collection opens view 0. Today it opens whatever index the shared instance last had.
- **Fix 4: not "risk none".** See correction 6.

## Impact

The measured magnitude stands: about 1.25 s, once in the log, and deterministic per code. Frequency is unproven and the trigger is narrower than stated: a table view without `limit`. Adjusted score: 5.
