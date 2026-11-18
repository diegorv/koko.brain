# Issue 13 discovery

No `spec.md` in `.scratch/finders-ux/`. Line numbers are at d382b36ef (after Issue 12, so they differ from the Issue's `bb57e6165` numbers).

## Files that change

- `src/lib/plugins/graph-view/GraphView.svelte`
  - `:92-102` `loadAndRebuild`: on success set `loaded = true`, `loadFailed = false`, `vaultEmpty = fullData.nodes.length === 0`; on reject keep `error()`, set `loadFailed = true`, keep `fullData` (previous graph stays).
  - New `$state` flags `loaded`, `loadFailed`, `vaultEmpty` (booleans, no copy of `fullData`).
  - New `$derived` `isolated`: local mode, center set, and `filterOptionNodes` (Issue 12's pre-filter `$state.raw`, `:49`, set at `:108`) holds the center with `linkCount === 0`. Pre-filter, so it holds with Orphans off.
  - `:464-468` overlay chain, same markup as the hint: `loadFailed` alert (`role="alert"`, "Could not build the graph.", shared `Button` Retry -> `loadAndRebuild()`) > existing no-center hint > `!loaded` "Building graph..." > `vaultEmpty` "No notes to graph yet" > `isolated` "This note has no links yet".
  - The new overlays get `pointer-events-none` (the alert box `pointer-events-auto`) so a graph kept under the alert or the lone isolated dot still pans and clicks.

## Tests

- `src/tests/lib/plugins/graph-view/GraphView.test.ts` (jsdom, real stores, `invoke` mocked). Add cases: isolated with Orphans on/off, linked center has no message, loading with a deferred `invoke` then gone, a `vaultStore.bumpVaultIndexVersion` with a pending fetch shows no loading line, rejected load -> alert + Retry -> footer "3 notes", failed refresh keeps "3 notes" + alert, empty snapshot -> "No notes to graph yet". Existing cases unchanged.
- Retry/alert markup copies `src/lib/features/search/SearchPanel.svelte:208-211`.

## Risks

- Hint test asserts the hint while the first fetch may still be pending, so the hint ranks above the loading line.
- Concurrent loads resolving out of order: pre-existing, not touched.
- `filterOptionNodes` only updates when `initSimulation` runs (`width > 0`); a zero-size container keeps the previous isolated answer. Pre-existing gating, accepted.

## Defaults taken

- Error ranks above every other overlay, including the no-center hint.
- The alert clears only when a load succeeds (a pending Retry keeps it on screen).
- "No notes to graph yet" shows whenever the latest successful snapshot is empty, not only the first one.
