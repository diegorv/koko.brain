# 58: Dragging a node in the graph moves that node; dragging the background pans

**What to build:** setupInteractions (src/lib/plugins/graph-view/GraphView.svelte:293-340) calls d3-zoom on the canvas first (:299-305) and d3-drag second (:308-335). d3-zoom's mousedown handler calls stopImmediatePropagation (d3-zoom@3.0.0 src/zoom.js:280, noevent.js nopropagation), so drag's mousedown.drag listener on the same element never runs: the start/drag/end handlers that pin fx/fy and reheat the simulation are dead and a drag on a node pans the whole view. Fix direction: register the drag behavior before the zoom behavior on the canvas. d3-drag only stops propagation when its subject returns a node (the subject at :309-313 returns null over the background), so background drags still reach zoom.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/graph-view/GraphView.test.ts: mount the graph on a one-note vault, wait for the simulation to place the node, compute its screen point from the canvas's stored d3 transform (canvas.__zoom), dispatch mousedown on the canvas at that point and mousemove/mouseup on window; canvas.__zoom is unchanged afterwards. It fails today (the drag pans).
- [ ] A mousedown and drag on empty background still changes canvas.__zoom (pan works).
- [ ] A click on a node without movement still opens the note.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/low. The graph view is not in the owner's daily list.
- **Trigger:** Open the graph (Cmd+G), press on a node and drag. help/documentation/14-graph-view.md:18 says this repositions the node.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/graph-view/GraphView.svelte:299-305 d3Zoom().on('zoom') then canvasSel.call(zoomBehavior); :308-335 d3Drag with subject findNodeAt and start/drag/end setting node.fx/fy, then canvasSel.call(dragBehavior) on the same canvas. node_modules/.pnpm/d3-zoom@3.0.0/node_modules/d3-zoom/src/zoom.js:270-283 mousedowned calls nopropagation(event) = event.stopImmediatePropagation() (noevent.js). d3-drag drag.js:41 registers mousedown.drag on the same element, so it is a later listener and is skipped. help/documentation/14-graph-view.md:18 'Drag a node to reposition it.' git log on GraphView.svelte shows no change to setupInteractions since the initial setup.
- **Related Issues before the audit:** `.scratch/audit-2026-11-04/issues/21-graph-center-follows-every-focus.md`
- **Source:** audit 2026-11-05, domain `shell`, finding `N-shell-04` (from shell-ux-2). Size S.

## Comments
