# 15: Graph labels drawn by priority, skipping overlaps

**Origin:** design review 2026-11-17, proposal P78 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/finders-search-tags-graph.html`, research `.scratch/finders-ux/research/verdict-graph.md` (ticket T1) and `.scratch/finders-ux/research/breakdown.md` (11).

**What to build:**

1. **Pure selection.** A label-selection function in `src/lib/plugins/graph-view/graph-view.logic.ts`. Input: candidates `{ id, x, y, width, height, degree, forced }` in one coordinate space (screen or world, but consistent). Output: the set of ids to draw. Forced labels (the hovered node, its neighbours, and `graphViewStore.centerPath`) always draw, even when they overlap each other. The rest go by descending degree with a stable id tiebreak, and a label is skipped when its rectangle overlaps a label already placed. Test against placed labels only, or use a grid; not all pairs.
2. **Labels only.** Overlap is tested between label rectangles. A label that covers another node's circle still draws.
3. **Render.** In `render()` (`GraphView.svelte:240-268`), keep the existing candidate gate (`currentTransform.k > 0.8` or connected or active), measure text widths through a cache keyed by name and font size (not `ctx.measureText` per node per tick; `render()` runs on every tick, zoom, resize and hover change), call the function, and draw only the selected labels. Dimmed and normal colours stay as today.
4. **Unchanged.** Orphans stay visible by default. The label font size is out of scope.
5. **Test harness.** Add a recording 2D-context fixture at `src/tests/fixtures/canvas-context.fixture.ts` unless one already exists there, and use it from a sibling `GraphView.render.test.ts`, which avoids the module-level `getContext` null stub at `GraphView.test.ts:18`.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, `src/tests/lib/plugins/graph-view/graph-view.logic.test.ts`: of two overlapping candidates only the higher-degree one is selected; equal degree breaks by id; a forced candidate is selected even when it overlaps a higher-degree one; overlapping forced candidates are all selected; non-overlapping candidates are all selected; a label over another node's position but not over another label is selected; empty input returns an empty set.
- [x] Render test with the recording 2D context: at the default zoom, 40 unlinked notes with long names draw fewer label `fillText` calls than nodes, and the center note's label is drawn in local and in global mode.
- [x] Text widths are measured once per name and font size, not on every tick (assert `measureText` call counts across two renders).
- [x] Orphans stay visible by default; existing `GraphView.test.ts` cases stay green.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P78.** Graph labels collide: every label draws above zoom 0.8, with no overlap test. Draw labels by priority (degree, then the hovered node and its neighbours) and skip any label that overlaps one already drawn. Validation: keep the orphan default.

## Problem

`onMount` zooms the graph to 1.3, so every label draws by default, and in any vault of more than a few dozen notes the labels pile on each other and the graph is unreadable.

## Evidence

Checked at `bb57e6165`.

- `src/lib/plugins/graph-view/GraphView.svelte:260-267`: `if (currentTransform.k > 0.8 || isConnected || isActive)` then `fillText` for every node, no overlap test; `:263` font size from the zoom; `:428` `scaleTo(canvasSel, 1.3)` on mount.
- `src/lib/plugins/graph-view/graph-view.store.svelte.ts`: `centerPath`; `highlightedNodeId` has no setter caller in `src/lib` (only `reset()` writes it), so the forced set is the hovered node, its neighbours and the center. Do not remove `highlightedNodeId` here.
- `src/tests/lib/plugins/graph-view/GraphView.test.ts:18`: `HTMLCanvasElement.prototype.getContext` returns null, so `render()` returns early in that file.
- `src/tests/fixtures/`: no canvas-context fixture exists.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided: do not skip labels that cover other node circles; only label-to-label overlap is skipped.
- 2026-11-17, deliver (branch issue/15-graph-labels-priority-skip-overlaps): `selectLabels` in graph-view.logic.ts picks labels by priority (forced hover/neighbour/center first, then degree, then id) and skips label-to-label overlaps via a grid; GraphView.svelte draws only the selected labels and caches text widths per name and font size. Review round 1 APPROVED with findings; fixes added a forced-hover render test and a brute-force randomized grid test (finding 3, numeric key, not changed). Review round 2 APPROVED, no findings. Tests: `pnpm check` 0 errors; full suite at b3af1282d exit=0, 646 files, 17102 passed, 54 skipped, 1 todo.
