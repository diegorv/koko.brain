# 13: Unparseable .canvas opens in an error state and is never overwritten by canvas edits

**What to build:** Opening a .canvas file whose JSON does not parse, has a non-object root, or has nodes/edges that are not arrays must not show an editable empty board whose first edit replaces the file. Today it does. parseCanvas (src/lib/features/canvas/canvas.logic.ts:36-49) is split into a result-returning parser, for example { ok: true, data } | { ok: false, reason }. CanvasInner.svelte (:71, :85-98, :104-115) renders an inline error ('This canvas file could not be read; switch to source mode to repair it') and never calls onJsonChange while the current jsonContent failed to parse. That covers persistWithoutHistory, persistChanges, the 300 ms watcher and undo/redo. Source mode (EditorView.svelte) stays available to repair the raw text. After a source-mode fix, the board re-parses and becomes editable. This follows the ADR 0029 precedent of refusing a write instead of dropping data.

**Blocked by:** 01

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first, in src/tests/lib/features/canvas/canvas.logic.test.ts, with the real logic functions. Parsing '{"nodes":[{"id":"keep","type":"text","x":0,"y":0,"width":10,"height":10,"text":"keep"}],"edges":[]' (truncated) returns a failure result, not an empty canvas. It fails today. Update the existing silent-empty cases at :56-79 to the new contract and record that change in the commit message.
- [ ] Component test (new, under src/tests/lib/features/canvas/): mount CanvasView with corrupt jsonContent and an onJsonChange spy. The error message is rendered, and running the add-card path or undo never calls onJsonChange. If SvelteFlow cannot mount in jsdom, guard persistWithoutHistory through a pure helper and test that.
- [ ] A valid canvas still round-trips and persists edits (existing tests stay green).
- [ ] Editing the raw text in source mode to valid JSON makes the board editable again.
- [ ] Frontend gate: pnpm check, pnpm vitest run and pnpm build all pass.

## Notes

- **Source:** audit 2026-11-04 (`.scratch/audit-2026-11-04/findings.md`), deep dive by an opus verifier the same day. Wave 2 of the parallel plan.
- **Finding `canvas-corrupt`:** real, high. Root cause: parseCanvas cannot report failure: invalid JSON, a non-object root and non-array nodes/edges all come back as an empty canvas. CanvasInner then uses that empty value both as what it displays and as the base for every write, so the first edit serializes {nodes:[new]} over the original bytes.
  Evidence: src/lib/features/canvas/canvas.logic.ts:36-49: the catch at :46-47 and the shape checks at :39-44 return createEmptyCanvas() or [] silently. src/lib/features/canvas/CanvasInner.svelte:71 has canvasData = $derived(parseCanvas(jsonContent)), and the sync effect at :85-98 sets nodes and edges to []. persistWithoutHistory :104-109 calls flowToCanvas(updatedNodes, updatedEdges, canvasData) and onJsonChange, and persistChanges :112-115 is called from drag, connect, delete and add (:157, :172, :177, :205), plus undo/redo. onJsonChange is the editor's onContentChange, and auto-save writes the tab content. File history (file-history.service.ts:190-196) snapshots only content saved through the app, so a file that was hand-edited or synced in corrupt never had its original bytes captured. The owner uses canvas. Tests canvas.logic.test.ts:56-79 pin the silent-empty contract.
- **Blocking edge:** Both tickets edit CanvasInner.svelte; the edge avoids a merge conflict, not a logic dependency.
- **Owner decision (2026-11-04):** D1 (a): a read-only error panel with a switch-to-source action (ADR 0029 precedent). Valid JSON whose root is not an object or whose nodes/edges are not arrays counts as unparseable.
- The generic auto-save (editor.service.ts saveFileByPath) writes any dirty tab without validation. The gate belongs in CanvasInner, so no dirty content is ever produced. Not checked: whether a CanvasInner or CanvasView component test harness exists already (none found under src/tests/lib/features/canvas/).
- **Size:** M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/101-unparseable-canvas-opens-error-state-never-overwritten.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
