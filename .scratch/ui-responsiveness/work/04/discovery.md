# Issue 04 discovery

No `spec.md` exists for ui-responsiveness; the Issue and `research/D-deep-dive.md`, `D-verify.md` are the source.

## Files that change

- `src/lib/features/collection/CollectionView.svelte:98-110` seed effect body -> `seedFromDefinition()`, called once in the script body (after the state and deriveds it reads) so the first `queryResult` (`:162-176`) already sees the YAML filters. The effect stays for tab switches and post-reset re-seeds; it calls the same function.
- `CollectionView.svelte:112-121` reset effect: plain `let resetArmed = false`, checked AFTER `void yamlContent` (first run arms and returns, so the mount does not undo the sync seed; later runs keep tracking `yamlContent`).
- `src/lib/features/collection/CollectionTableView.svelte:43` keyed `{#each visibleRecords as record (record.path)}`; `visibleRecords = result.records.slice(0, visibleCount)`, `visibleCount = $state(ROW_CAP)`, `ROW_CAP = 200`. Footer below the table when capped: "Showing N of M" + "Show more" button (+200).

## Tests

- `src/tests/lib/features/collection/CollectionView.test.ts` new describe: real `collectionStore.setPropertyIndex` with 200 records, 3 `status: open`; `MutationObserver` on the target before `mount`, `flushSync()`, `takeRecords()`: 0 removed `TR`, 3 `tbody tr` (red first). Existing 3 latch tests stay as they are.
- New `src/tests/lib/features/collection/CollectionTableView.test.ts` (jsdom, mounts the component with a hand-built `QueryResult`): 250 records -> 200 rows + "Showing 200 of 250"; "Show more" -> 250 rows, footer gone; under the cap -> no footer; empty -> "No results"; keyed: a reordered result keeps the same `tr` node per path.
- Prior art: `CollectionView.test.ts` (mount/flushSync, ResizeObserver stub, editor.service mock), `makeRecord` in `collection-logic.test.ts`.

## Defaults for open questions

- The Issue is `needs-triage` and asks the owner for cap size and wording. Taken: cap 200, step 200, "Showing N of M" and "Show more", as the Issue writes them. Easy to change in one constant and two strings.
- `visibleCount` does not reset when filters change (the component instance is reused); a smaller result simply shows all its rows. A bigger later result keeps the expanded count.
- The toolbar "{N} results" count keeps showing the full total.

## Risks

- Script-body seed reads `activeView`/`definition` deriveds at init; Svelte allows this (no `state_referenced_locally` warning for reads inside a called function).
- The view-tab switch (`activeViewIndex` change) still seeds post-render; the row cap bounds its cost. `{#key}` fix is Issue 14.
- On-device `[HB] stall` check is not verified by the agent.
