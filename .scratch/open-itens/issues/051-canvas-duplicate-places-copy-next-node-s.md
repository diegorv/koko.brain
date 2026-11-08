# 051: Canvas Duplicate places the copy next to the node's current position and size

**Origin:** `audit-2026-11-05` Issue 30, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** handleDuplicateNode (src/lib/features/canvas/CanvasInner.svelte:362-368) clones node.data, which is the copy of the CanvasNode taken when the node was loaded or created (canvas.logic.ts:129). Moves change node.position and resizes change width/height/measured, never data.x/y/width/height, so the copy appears 20 px off the node's original geometry, possibly far from where the node is now or off screen. Fix direction: build the clone from the node's current geometry (absolute position for a node inside a group, measured size), for example from the node produced by flowToCanvas for the current nodes, then offset it.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/canvas/canvas.logic.test.ts (for the helper the fix adds or reuses): a flow node with data { x: 0, y: 0, width: 260, height: 60 }, position { x: 500, y: 400 } and measured { width: 320, height: 90 } duplicates to a node at x 520, y 420 with width 320 and height 90. It fails today (20, 20, 260, 60).
- [ ] A node inside a group duplicates at its current absolute position plus the offset.
- [ ] handleDuplicateNode in CanvasInner.svelte uses that current geometry, and the copy keeps the node's current text, color and file.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/medium. After a node has been dragged or resized, Duplicate uses its stale position.
- **Trigger:** Drag or resize a canvas node, then right-click it and choose Duplicate.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/canvas/canvas.logic.ts:122-130 canvasNodeToFlowNode copies the node into data once; CanvasInner.svelte:133-173 drag stop updates position only; src/lib/features/canvas/canvas.logic.ts:202-210 only text/file/url/label/color flow back from data; nothing writes x/y/width/height into data (rg updateNodeData in src/lib/features/canvas finds only text, url/label, editing and color); CanvasInner.svelte:362-368 handleDuplicateNode uses node.data as CanvasNode; canvas.logic.ts:375-377 duplicateNode offsets data.x/data.y; CanvasInner.svelte:355-358 adds it at that position. Documented at help/documentation/11-canvas.md:56.
- **Source:** audit 2026-11-05, domain `boards`, finding `N-boards-04` (from boards-ux-2). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, medium). canvasNodeToFlowNode (canvas.logic.ts:122-130) copies the node into data once. Drag stop (CanvasInner.svelte:131-172) changes only position and parentId. Our own writes set lastSyncedJson, so the sync effect (:96-111) never rebuilds nodes or data after a drag or resize. updateNodeData calls write only text, url/label, editing and color. handleDuplicateNode (:362-368) clones node.data, and duplicateNode (canvas.logic.ts:375-377) offsets data.x/y, so the copy uses the geometry from when the node was loaded.

## Comments
