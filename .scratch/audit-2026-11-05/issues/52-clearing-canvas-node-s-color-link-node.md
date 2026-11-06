# 52: Clearing a canvas node's color or a link node's title is saved to the .canvas file

**What to build:** flowNodeToCanvasNode (src/lib/features/canvas/canvas.logic.ts:190-213) starts from the last synced node and copies an editable data field only when it is !== undefined (:205-209). handleSetNodeColor sets data.color to undefined (src/lib/features/canvas/CanvasInner.svelte:411-416) and LinkNode sets label to undefined for an empty title (src/lib/features/canvas/LinkNode.svelte:56), so the old color or label is written back. The node looks cleared until the canvas remounts, then the value returns. Undoing a color set on a node that had none has the same effect. Edges already handle this (canvas.logic.ts:243-250). Fix direction: when the flow node's data has the key with an undefined value, delete that field from the result instead of keeping the original's value, as flowEdgeToCanvasEdge does.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/canvas/canvas.logic.test.ts: flowToCanvas with an original text node { color: '3' } and a flow node whose data is { ...original, color: undefined }; the result node has no color key. It fails today.
- [ ] The same for a link node whose label is cleared: the result has no label key.
- [ ] A node whose data never had a color keeps no color, and a node with a set color keeps it (existing behaviour).
- [ ] Undoing a color added to an uncolored node writes a node without color.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/low. A cleared attribute comes back, and clearing one is uncommon.
- **Trigger:** Right-click a colored canvas node and pick the crossed-out swatch (documented as clearing the color), or edit a link node and empty its title; then reopen the canvas or switch away and back.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/canvas/ColorPicker.svelte:23 crossed-out swatch calls onSelect(undefined); src/lib/features/canvas/CanvasInner.svelte:411-416 updateNodeData(nodeId, { ...node.data, color: undefined }); CanvasInner.svelte:227-239 debounced persist; CanvasInner.svelte:118-123 persistWithoutHistory -> flowToCanvas(nodes, edges, lastSyncedData), lastSyncedJson set to the same JSON so no resync; src/lib/features/canvas/canvas.logic.ts:194-200 base = { ...originalNode }; canvas.logic.ts:208-209 label/color copied only when !== undefined; src/lib/features/canvas/LinkNode.svelte:56 label: editLabel.trim() || undefined; canvas.logic.ts:243-250 edge path deletes color (tested at src/tests/lib/features/canvas/canvas.logic.test.ts:303-307), no node equivalent test; help/documentation/11-canvas.md:77 promises the swatch clears the color.
- **Second opinion:** upheld (ux, low). Confirmed. flowNodeToCanvasNode (canvas.logic.ts:194-210) starts from the last synced node and copies label and color only when they are !== undefined. handleSetNodeColor (CanvasInner.svelte:411-416) and LinkNode.svelte:56 set undefined, and persistWithoutHistory passes lastSyncedData as the original, so the old color or label is written back. The edge path already deletes color (:243-250). The effect is that a cleared color or link title comes back, which is a cosmetic attribute rather than the user's written content, and clearing one is an uncommon action. Corrections to apply while implementing: Category ux rather than content: a cleared node attribute comes back, and no user text is lost or overwritten.
- **Source:** audit 2026-11-05, domain `boards`, finding `N-boards-03` (from boards-content-2, boards-ux-1, boards-spec-1). Size S.

## Comments
