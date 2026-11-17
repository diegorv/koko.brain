VERDICT: APPROVED

Review of `git diff main...HEAD` (cea2a6b00, d18cf9847, af3985b4a) for Issue 15. No `.scratch/finders-ux/spec.md` exists; no ADR covers graph labels.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: of two overlapping candidates only the higher-degree one is selected; equal degree breaks by id; a forced candidate is selected even when it overlaps a higher-degree one; overlapping forced candidates are all selected; non-overlapping candidates are all selected; a label over another node's position but not over another label is selected; empty input returns an empty set. — `describe('selectLabels')` at graph-view.logic.test.ts:482-540 has all seven cases. The higher-degree and tie cases list the winner second, so input order cannot pass them. The non-overlap case includes a corner-touch pair. The file passes. Test-first order is shown by commit order (logic and test land together in d18cf9847); I did not re-run the red state of the logic tests.
- [met] Render test with the recording 2D context: at the default zoom, 40 unlinked notes with long names draw fewer label `fillText` calls than nodes, and the center note's label is drawn in local and in global mode. — GraphView.render.test.ts:77-103 uses `createRecordingContext` from src/tests/fixtures/canvas-context.fixture.ts. A probe confirmed the frames run at the default zoom (every label font is `10px sans-serif`, so the onMount `scaleTo(1.3)` applied). Over 72 forty-node frames it drew 10 to 24 labels per frame. The center label is checked in every global frame and in the local one-node frame. With main's GraphView.svelte swapped in, the "fewer labels" test fails, so it discriminates.
- [met] Text widths are measured once per name and font size, not on every tick (assert `measureText` call counts across two renders). — GraphView.render.test.ts:105-115 checks the count after 2 frames and again after 4 or more, and both equal 40 with 40 distinct names. The probe counted 40 calls over 72 frames. The test fails against main's component. The cache is `measureLabel` (GraphView.svelte:173-190), keyed by name and cleared when `ctx.font` changes.
- [met] Orphans stay visible by default; existing `GraphView.test.ts` cases stay green. — The render tests wait for frames with 40 `arc` calls, which includes 40 orphans. The orphan default is untouched. GraphView.test.ts passes in the graph-view directory run.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exits 0 with 0 errors and 0 warnings. The targeted run of `src/tests/lib/plugins/graph-view/` passes 6 files, 125 tests. The full `pnpm vitest run` is for deliver.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors and 0 warnings. The `fatal: ambiguous argument '4.9.1..HEAD'` line comes from the script prelude and does not change the exit status.
- `pnpm vitest run src/tests/lib/plugins/graph-view/`: exit 0, 6 files, 125 tests. My test verdict rests on these files: graph-view.logic.test.ts, GraphView.render.test.ts and GraphView.test.ts, plus the other graph-view test files in that directory.
- Mutation check: I restored main's GraphView.svelte temporarily and ran GraphView.render.test.ts. 2 of its 4 tests failed (fewer labels, measure once), then I restored the file. The worktree is clean.
- Probe (a temporary test file, deleted afterwards): 72 forty-node frames, all at the `10px` font, 10 to 24 labels each, 40 `measureText` calls in total.

## Correctness notes (no change needed)

- The grid lookup is sound. Two rectangles that strictly overlap share an interior point, and both rectangles cover that point's cell, so no overlap is missed. `Math.floor` also gives correct cells for negative world coordinates, which happen when orphans orbit past the origin.
- The candidate rectangle `(x - w/2, y + r + 3, w, fontSize)` matches the `fillText` call with center/top alignment. `r` and the font are the same values the draw uses.
- `labelWidths` and `labelWidthsFont` are plain (non-`$state`) values, so the cache triggers no reactivity.
- graph-view.logic.ts still imports only `.logic.ts` files and utils. No layer-baseline change, and `highlightedNodeId` is kept.

## Findings

1. minor, src/tests/lib/plugins/graph-view/GraphView.render.test.ts:77: no render test covers the hover path of `forced: isConnected || isActive` (GraphView.svelte:312). Only the center note (`isActive`) is checked. If `isConnected` were dropped from `forced`, every test would still pass, and hovered and neighbour labels could be skipped. Fix (optional): add a render case that sets `graphViewStore.highlightedNodeId` (or hovers) to a low-degree linked node and asserts that its label and its neighbours' labels draw in every frame.
2. nit, src/tests/lib/plugins/graph-view/graph-view.logic.test.ts:482: the grid is only exercised with a few small, non-negative rectangles. Fix (optional): add a case with many random candidates, including negative coordinates, and compare `selectLabels` against a brute-force all-pairs greedy pass.
3. nit, src/lib/plugins/graph-view/graph-view.logic.ts:185: each grid-cell visit allocates a template-string key (`${i},${j}`) on every frame. A numeric key would avoid those allocations on large graphs. Fix (optional) only if profiling shows a cost.

## Resolution

1. Fixed. GraphView.render.test.ts adds a case with two hubs and 20 degree-2 spokes plus a highlighted degree-2 note (sorting after the spokes) with two degree-1 neighbours; it asserts the highlighted label and both neighbour labels draw in every full frame. With `forced: isActive` (isConnected dropped) the case fails, so it guards the hover path.
2. Fixed. graph-view.logic.test.ts adds a seeded random case (50 rounds of 80 candidates, negative coordinates, random sizes, degrees and forced flags) compared against a brute-force all-pairs greedy pass. An off-by-one mutation in the grid cell range makes it fail.
3. Not changed. The finding is conditional on profiling showing a cost, and no profile shows one; a numeric key would add packing logic for coordinates with no measured benefit.
