# Issue 15 discovery

No `spec.md` in `.scratch/finders-ux/`. Line numbers are at 2cefe43d7 (after Issues 12 to 14), so the label block is `GraphView.svelte:273-301`, not `:240-268`.

## Files that change

- `src/lib/plugins/graph-view/graph-view.logic.ts`: add `LabelCandidate` (`id, x, y, width, height, degree, forced`; `x, y` is the top-left corner) and `selectLabels(candidates): Set<string>`. Forced ids go in first and are always kept; the rest sort by `degree` desc, then `id` asc, and each is kept when its rectangle overlaps no kept rectangle. Overlap is strict (touching edges do not overlap). Kept rectangles go into a uniform grid (cell size from the candidates' mean size), so a candidate is tested only against kept labels in the cells it covers.
- `src/lib/plugins/graph-view/GraphView.svelte:273-301` (`render()` node loop): set `font`, `textAlign`, `textBaseline` once before the loop; a pre-pass builds candidates for the nodes the existing gate admits (`k > 0.8 || isConnected || isActive`), `forced = isConnected || isActive`, `degree = linkCount`, rectangle in world space `(x - w/2, y + r + 3, w, fontSize)`; the node loop draws a label only when `selectLabels` kept its id. Colours unchanged.
- Width cache in the component: `Map<name, width>` for one font string; a different font string clears it. Ticks and hovers at a constant zoom reuse every width; a zoom that changes the font size re-measures once for the new size.

## Tests

- `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: new `describe('selectLabels')` with the seven cases from the Issue.
- `src/tests/fixtures/canvas-context.fixture.ts` (none exists): a recording 2D context; `clearRect` starts a new frame, each frame records `arc` and `fillText` calls; `measureText` counts calls and returns `text.length * fontPx * 0.6`. `installRecordingContext()` stubs `HTMLCanvasElement.prototype.getContext`.
- `src/tests/lib/plugins/graph-view/GraphView.render.test.ts` (copies the jsdom setup of `GraphView.test.ts:1-33` minus the null `getContext` stub): 40 unlinked notes with long names; wait for a frame with 40 arcs (orphans visible), assert fewer than 40 label `fillText` calls; center note (id sorted last, so the tiebreak alone would not place it) drawn in global and local mode; after two or more full frames `measureText` was called once per distinct name.

## Risks

- `render()` runs on every tick: the pre-pass adds one array, one sort and the grid per frame, O(n log n); no `measureText` at constant zoom.
- Continuous zoom between k 0.8 and 1.1 changes the font size every frame (`max(10, 11/k)`), so each zoom frame re-measures the candidates. Bounded cache, accepted; font size is out of scope.
- The real simulation runs in the render test (d3-timer on jsdom timers); asserts read the latest full frame, not a fixed tick.

## Defaults taken

- Label rectangle height is the font size (textBaseline `top`); no padding between labels.
- `highlightedNodeId` kept (Issue: do not remove it); it feeds `connectedIds` as today.
