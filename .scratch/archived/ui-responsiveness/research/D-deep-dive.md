# D deep dive: opening a `.collection` file froze the webview 1.3 s

Read-only investigation. No app, cargo, pnpm or vitest runs. Two node experiments in
`/tmp/ui-resp-bench/D/` (a Svelte 5.57.2 replica of the mount pattern under jsdom, and the real
query engine copied in). VERIFIED = read in source, log or measured in the bench. INFERRED = reasoning.

## Summary

- Root cause (VERIFIED in a replica that uses the repo's own Svelte): on a fresh mount, `CollectionView`
  renders its template before its seeding `$effect` runs. The first `queryResult` therefore runs with
  empty toolbar state, so it has no filter, and `CollectionTableView` builds one `<tr>` with 6 `<td>`
  for every note in the vault (10,628 rows, about 64k cells). Then the seed effect applies the YAML
  filters, and Svelte tears down about 10,623 of those rows in the same flush. The user never sees
  that table: it is built and destroyed before the first paint.
- The query engine is not the cost. `executeQuery` on 10,628 synthetic records: 1.2 ms unfiltered,
  3.0 ms with bug-triage's 3 filters, 4 formulas and sort (VERIFIED, bench). Five passes add up to
  less than 15 ms of the 1,292 ms.
- What triggers it: every time a `.collection` tab becomes active from a tab that is not a collection
  (markdown, kanban, canvas, tasks...), and every time source mode is switched back to table view. The
  cost scales with vault size, not with the collection's real result size. Switching from one collection
  to another reuses the instance and does not trigger it (19-35 ms in the log).
- Quick win: seed the toolbar state synchronously at init and skip the reset effect's first run. In the
  replica, the mount goes from 10,628 built rows, 5 query passes and 2 seeds to 5 rows, 2 passes and 0
  seeds (jsdom 1.4-4.9 s down to 5 ms).

## Evidence

### Log (VERIFIED, `2026-11-02_14-52-43.log` lines 13770-13777; `raw/stall-context-2026-11-02.txt:325-342`)

| t | event |
|---|---|
| 17:55:55.690 | previous open `bug-login-timeout.md` (markdown, 364 chars), EXIT to `activeTabPath changed` 42 ms (55.732): a normal markdown flush |
| 17:55:55.988 | last `[HB] alive` |
| 17:55:56.151 | `openFileInEditor ENTRY` bug-triage.collection |
| 17:55:56.153 | `readTextFile` done (1231 chars, 2 ms) |
| 17:55:56.154 | `addTab` done, EXIT (4 ms total) |
| 17:55:57.446 | `activeTabPath changed` (`src/routes/(app)/+layout.svelte:99-102`, a `$effect` in the same flush) |
| 17:55:57.500 | `[HB] stall 1513ms` |
| 17:55:57.528 | next click: calendar-deadlines.collection (collection to collection), flush 21 ms, no stall |
| 17:55:59.178 | bug-triage again (from a collection tab), 19 ms, no stall |

Nothing is logged between 56.154 and 57.446. `addTab` (`src/lib/core/editor/editor.service.ts:141`)
is the last await-free step, so the 1,292 ms is one synchronous Svelte flush. Compared with the
42 ms markdown flush just before it, the extra cost is about 1.25 s. No IPC runs on this path: the
collection feature makes none on open.

### Code path (VERIFIED)

1. `EditorView.svelte:70-86` is one `{#if}` chain. Going from markdown to collection switches the branch:
   `MarkdownEditor` is destroyed (`MarkdownEditor.svelte:180-199`, `view.destroy()` at 196) and
   `CollectionView` mounts fresh (`:82-83`). Collection to collection stays in the same branch, so the
   instance is reused and only its props change.
2. `CollectionView.svelte` starts with empty state: `localSort = []` (36), `initialized = false` (37),
   `seededIndex = -1` (55), `localGlobalFilters/localViewFilters = []` (73-74),
   `localColumns = undefined` (77), `localFormulas = []` (80).
3. The template reads `queryResult` during mount (`{:else if !queryResult}`, 343). `queryResult`
   (162-176) calls `filterGroupsToFilter([])`, which returns `undefined` (`toolbar/filter.logic.ts:142-146`).
   `activeFormulas` is `{}` (124-126). `executeQuery` (`collection.logic.ts:114-194`) returns all
   10,628 records from `Array.from(index.values())` (122). The filter at 139-148 passes everything.
   The sort on `formula.urgency` (171-183) sees only nulls. Columns come from `view.order`, 6 keys (341-342).
4. `CollectionTableView.svelte:43` (`{#each result.records as record}`, unkeyed, no cap) and `:48` (6
   cells, each holding a nested `{#if}` block, 51-67) build the full table.
5. After the template, the user effects run: seed (100-110), then reset (113-121). Reset writes
   `initialized=false`, so the seed runs a second time. Then formula-column sync (149-160) adds
   `formula.urgency` to `localColumns`. Each of these writes invalidates `queryResult`. The unkeyed
   each shrinks to the filtered rows and destroys about 10.6k row subtrees and their effects.
6. `propertyIndex` is a `$state(Map)` (`collection.store.svelte.ts:4`). Svelte does not deep-proxy a
   Map (`node_modules/svelte/src/internal/client/proxy.js:51-53` returns non-plain prototypes as-is),
   so record reads in the table pay no proxy cost.

### Bench 1: mount-order replica (VERIFIED, `/tmp/ui-resp-bench/D/View.svelte`, `run2.mjs`)

This is a copy of the effect structure in lines 36-176 (seed, reset with the `selfUpdate` latch,
formula sync, derived query) and the table's nested each. It uses the repo's Svelte 5.57.2, compiled
with `svelte/compiler` and mounted in jsdom over a 10,628-entry Map. The jsdom ms show relative cost
only; jsdom is not WebKit.

| variant | scenario | rows built | query passes | seeds | jsdom ms |
|---|---|---|---|---|---|
| current code | markdown to bug (fresh mount) | **10,628** | 5 (lens 10628,5,5,5,5) | 2 | 1,374-4,889 |
| gate `queryResult` on `initialized` | fresh mount | 10 (5 built twice) | 3 | 2 | 11 |
| seed in initializers | fresh mount | 5 | 4 | 1 | 12 |
| seed in initializers + reset skips first run | fresh mount | 5 | 2 | 0 | 5 |
| current code | collection (narrow filter) to bug (reuse) | 0 new | 3 (first pass uses the **previous file's** filters: 15 rows) | 1 | 10 |

### Bench 2: query engine (VERIFIED, `/tmp/ui-resp-bench/D/engine/bench.ts`, real `evaluator.ts`/`parser.ts`/`executeQuery` copied in)

Run on 10,628 records with about 10 properties each, median of 15 runs (Node 26):

| case | records | median |
|---|---|---|
| first pass: no filter, no formula, sort | 10,628 | 1.2 ms |
| seeded: 3 filters + 4 formulas + sort | 6 | 3.0 ms |
| no filter + 4 formulas + sort (worst) | 10,628 | 37 ms |
| no `order` (key scan in `resolveColumns`) | 10,628 | 1.1 ms |

`new Map(propertyIndex)` with 10,628 entries (`collection.store.svelte.ts:32`): 0.4 ms median.

## Root cause

The defect is an ordering bug inside `CollectionView.svelte`: state is derived from the definition
inside a post-render `$effect` (100-110) when it should be set before the first render, and nothing
caps the table (`CollectionTableView.svelte:43`). Svelte 5 runs a component's template (render
effects) synchronously during mount, and its `$effect`s after that, in the same flush. The first
render therefore always sees `filters = undefined` and renders the whole vault. The reset effect
(113-121) fires on mount as well and forces a second seed, which costs two more query passes.
Without the missing row cap the stale pass would be harmless.

INFERRED split of the 1.29 s: building and tearing down about 10.6k rows comes to about 120 µs per
row in WebKit (1.25 s / 10,628). The query passes cost under 15 ms. `view.destroy()` of a 364-char
CodeMirror doc is small (markdown-to-markdown switches cost 40 ms all told). Not profiled on device.

## Impact

- Thread: the webview JS main thread. Rust and IPC are not involved.
- Duration: about 1.25 s per fresh mount on this vault. It grows linearly with the note count, and with
  the column count of the opened view (cells per row).
- What the user sees: the previous note stays on screen, frozen, for about 1.3 s, and clicks are queued
  (the calendar-deadlines click landed 28 ms after the stall ended). The 10k-row table is never painted.
- When:
  - Every switch from a non-collection tab to a `.collection` table view (tab-bar click, file tree,
    quick switcher, wikilink).
  - Every switch from source mode back to table view (`EditorView.svelte:114-120`; source mode is also
    reset on every tab change, `:46-51`).
  - Not at startup with a restored collection tab. The seed has already run by the time `isIndexReady`
    flips, so the first real query is seeded (INFERRED from 163 and 100-110).
  - Calendar views: the stale pass groups every note that has the date property (no DOM rows). Linear
    calendar views render one button for every such event with no cap
    (`CollectionLinearCalendarView.svelte:195`, INFERRED cost).
- Related exposure (VERIFIED code, INFERRED cost):
  - A collection whose real result is large (a broad filter, or none) pays the same per-row cost on
    every mount: about 250 ms at 2,000 rows.
  - With formulas, every index bump clones all matched records (`collection.logic.ts:151-153`), so the
    unkeyed each re-patches every row while the tab is open.
  - The editor embed already caps at 50 rows (`collection-block-widget.ts:52`, `:417`).
- Frequency for this owner: deterministic, but it depends on how often they open `.collection` files.
  That is not established: this session was a feature test pass over `use-cases-test/examples`.

## Fixes (ranked by gain)

### 1. Seed toolbar state before the first render, and skip the reset effect's first run (quick-win)

- Change: in `CollectionView.svelte`, move the body of the seed effect (102-108) into a plain
  `seedFromDefinition()` function. Call it once synchronously in the script body after `activeView`
  is declared, and keep the effect calling it for later re-seeds. The `$state` declarations keep their
  empty literals; the call assigns them. That avoids putting props in `$state` initializers, which
  would trip `state_referenced_locally`. Give the reset effect (113-121) a plain `let resetArmed = false`
  so its first run only arms it. Use the same plain-variable rationale as the `selfUpdate` comment at
  39-49; it must not be `$state`.
- Gain: removes about 1.25 s per fresh open on this vault (replica: 10,628 rows to 5, 5 passes to 2).
- Files: `src/lib/features/collection/CollectionView.svelte`,
  `src/tests/lib/features/collection/CollectionView.test.ts` (existing harness
  `src/tests/fixtures/CollectionViewHarness.svelte`).
- Risks:
  - The `selfUpdate` latch must keep working. The latch only matters for later YAML changes and the
    first-run guard sits before it, but the three existing latch tests must stay green.
  - `parseFilterToGroups` mints new row uids on every seed. Seeding once instead of twice is strictly
    fewer uid changes.
  - When the index is not ready, `queryResult` is still null ("Building index...") and the seed has
    already happened, so the behavior is the same.
  - No `applyNoteChange`, `vaultIndexVersion` or `autoRunQueries` path is touched.
- Test (failing first): in the jsdom suite, use the real `collectionStore.setPropertyIndex` with about
  2,000 `PropertyIndexRecord`s, of which 3 match a YAML global filter. Attach a `MutationObserver`
  (subtree) to the target before `mount`, then call `flushSync()` and `observer.takeRecords()`.
  - Assert that the number of `TR` nodes in `removedNodes` across all records is 0, and that the
    rendered `tbody tr` count is 3. Today the removal count is about 1,997.
  - Add a second case with an empty index ready flag false, then `setPropertyIndex`, to pin the startup
    path.

### 2. Cap rendered table rows (small)

- Change: render `result.records.slice(0, cap)` in `CollectionTableView.svelte:43`, with a "Showing N of
  M" footer and a "Show more" button that raises the cap. This mirrors `COLLECTION_ROW_CAP` and its
  footer (`collection-block-widget.ts:52, 153-157`). Key rows by `record.path` (unique; Map keys) and
  columns by `col.key`.
- Gain: bounds every table mount and re-render to cap × columns. A 200-row cap limits a 2k- or 10k-row
  result to about 25 ms. It also makes any future stale pass harmless.
- Files: `CollectionTableView.svelte`, plus a new `src/tests/lib/features/collection/CollectionTableView.test.ts`.
- Risks:
  - Users with big collections need "Show more" (or later virtualization) to reach the bottom rows.
  - The header result count (`CollectionView.svelte:422`) must keep showing the full count.
  - A keyed each throws on duplicate keys (`each_key_duplicate`). Paths are unique keys in the Map,
    but `executeQuery` with formulas clones records, and the paths stay unique.
- Test: mount the table with 1,000 records and assert `tbody tr` = cap, the footer text, and that
  "Show more" increases the count. Assert that sort order is kept within the slice.

### 3. Remount `CollectionView` per file (small)

- Change: wrap `EditorView.svelte:83` in `{#key editorStore.activeTab.path}`.
- Gain:
  - Ends the stale first pass on collection-to-collection switches. It is small today, but bounded by
    the previous file's filter: a previous collection with a broad or empty filter would build that
    whole result first.
  - Fixes `activeViewIndex` (53) leaking across files. It is reset only by the clamp (93-96), so file B
    opens on file A's view index when B has enough views. That is a correctness bug.
- Files: `src/lib/app/EditorView.svelte`, plus a test in the `CollectionView` suite (two YAMLs through
  the harness, one with 3 views).
- Risks:
  - The toolbar remounts on each collection switch (cheap with Fix 1).
  - An open popover closes on switch, which is the expected behavior.
  - Do not key on `content`: that would remount on every self-persist and break the `selfUpdate`
    latch's purpose.

### 4. Instrument the collection mount (quick, diagnostic)

- Change: wrap the `executeQuery` call at `CollectionView.svelte:175` in `timeSync('COLLECTION', ...)`
  (`utils/debug.ts`) and log `records.length`.
- Gain: no speedup. It makes the next regression attributable in the session log (no logs exist inside
  the collection code today).
- Risks: none. `debug()` is gated by the settings toggles.

### Not recommended now

- Replacing the seed and reset effects with writable `$derived` state. Re-deriving on a self-persist
  regenerates filter row uids and drops in-progress (`editing`) formula rows, which is exactly the bug
  the `selfUpdate` comment (39-49) guards against.
- Virtualizing the table. Fix 2 gets most of the gain at a fraction of the cost.
- Optimizing the engine (collator, precomputed sort keys, the formula clone). It is at most 37 ms in
  the worst case.

## Quick wins

1. Fix 1: synchronous seed plus a first-run guard on the reset effect, about 30 lines plus a test.
   Expected to remove about 1.25 s of each markdown-to-collection open on this vault.
2. Fix 4: one `timeSync` and a count log.

## Open questions

- How often does the owner open `.collection` tables in daily use? That decides whether the impact
  score is 6 or 8.
- The on-device split between DOM build, teardown and GC is not profiled. A Web Inspector timeline of
  one markdown-to-collection open, before and after Fix 1, would confirm it.
- Calendar and linear-calendar stale-pass cost on this vault depends on how many notes carry the view's
  date property. Not measured.
- Not checked: the order in which bits-ui popover content mounts. It is lazy per
  `popper-layer.svelte:47` according to scout D2; not re-read here. It is off the hot path either way,
  because the popovers start closed.
