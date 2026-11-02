# 15: An unparseable .canvas opens empty and the first edit overwrites the original

**Status:** needs-triage

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
