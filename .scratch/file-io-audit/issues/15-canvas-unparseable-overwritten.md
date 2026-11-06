# 15: An unparseable .canvas opens empty and the first edit overwrites the original

**Status:** wontfix

**Blocked by:** none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o09-undo-canvas-kanban (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity data-loss)
- Claims covered: feature-writers-6, fidelity-10

**How a user hits it.** Needs a .canvas whose JSON does not parse: a git merge-conflict marker, a sync conflict, a hand edit with a trailing comma, or a typo made in the app's own canvas source mode before toggling back. No warning is shown, and the empty state shows a '+ Add card' button, so the destructive click is the obvious next step. Less common than everyday note editing, but realistic.

**Recoverable from.** File History only if the canvas was saved in-app within the 7-day retention; externally broken bytes are never snapshotted. Otherwise git or an external backup only.

**Root cause.** src/lib/features/canvas/canvas.logic.ts:36-49 (parseCanvas returns createEmptyCanvas() on any error, with no signal), used as the merge base in CanvasInner.svelte:71 and :104-109

**Evidence.** parseCanvas catch -> createEmptyCanvas (canvas.logic.ts:46-48). CanvasInner.svelte:71 canvasData=$derived(parseCanvas(jsonContent)); :571-577 empty state renders '+ Add card'; addTextCard :451-457 -> persistChanges -> persistWithoutHistory :104-109 -> flowToCanvas(nodes, edges, canvasData={nodes:[],edges:[]}) -> onJsonChange = onContentChange (app/EditorView.svelte:81) -> 2 s autosave writeTextFile (editor.service.ts:168). Repro mounts the real CanvasView/SvelteFlow with the real onContentChange and clicks the button.

**Repro test.** `.scratch/file-io-audit/repro/o09-undo-canvas-kanban/canvas-tab-switch.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL feature-writers-6 / fidelity-10: AssertionError: expected '{\n\t"nodes": [\n\t\t{\n\t\t\t"id": "…' to contain 'keepme0000000001' (received a canvas holding only the new empty text card) at expect(editorStore.tabs[0].content).toContain('keepme0000000001')
```

**Fix sketch.** Have parseCanvas report a failure, render an error state that points to source mode, and block persistChanges while the source does not parse.

Also keep the unknown top-level keys of a valid canvas. parseCanvas (canvas.logic.ts:42-45) returns only `nodes` and `edges`, and flowToCanvas (canvas.logic.ts:299-342) builds a new object with only those two keys, so every persist (CanvasInner.svelte:104-109) drops any other top-level key, for example a `metadata` object written by another canvas tool, even when the file parses. Carry the other parsed top-level keys through parseCanvas and spread them into the flowToCanvas result. `CanvasData` (canvas.types.ts:105-110) declares only `nodes` and `edges`, so it needs room for them.

These criteria cover only the editor-data-safety amendment (2026-11-02). Triage must add criteria for the original sections above before this Issue runs; each section's repro test is its red test.

- [ ] A valid canvas with an extra top-level key (for example `"metadata": { "version": "1.0" }`) still holds that key, with the same value, after an edit is persisted

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding G6 (P0, rare). Its invalid-JSON half is the case this Issue already describes. Its second defect, unknown top-level keys dropped on every persist from a valid file, is the amendment above.
- Repro test: `.scratch/editor-data-safety/repro/gap-findings-and-kanban/canvas-invalid-json.test.ts`, case 'a persist from a valid canvas keeps unknown top-level keys' (the case 'adding a node to a canvas that failed to parse must not drop the original nodes' replays the invalid-JSON half through the same logic pipeline). To run it, copy the group folder to `src/tests/audit-repro/gap-findings-and-kanban/` (see `.scratch/editor-data-safety/repro/README.md`).
- Code path, verified against the current code: src/lib/features/canvas/canvas.logic.ts:42-45 (parseCanvas returns `{ nodes, edges }` only); src/lib/features/canvas/canvas.logic.ts:299-342 (flowToCanvas returns `{ nodes, edges }` only); src/lib/features/canvas/CanvasInner.svelte:71 (`canvasData = $derived(parseCanvas(jsonContent))`); src/lib/features/canvas/CanvasInner.svelte:104-109 (persistWithoutHistory: flowToCanvas(updatedNodes, updatedEdges, canvasData) -> serializeCanvas -> onJsonChange); src/lib/features/canvas/canvas.types.ts:105-110 (`CanvasData` has only `nodes` and `edges`).

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/101-unparseable-canvas-opens-error-state-never-overwritten.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
