# 027: An unparseable .canvas opens in an error state and is never overwritten by canvas edits

**Origin:** `audit-2026-11-05` Issue 101, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/audit-2026-11-04/issues/13-canvas-refuse-write-on-unparseable.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). Issue 15 has the same root cause (parseCanvas returns an empty canvas), and this Issue carries the owner decision. Its blocker 01 is resolved. It needs a broken .canvas file.

**Audit check at `5f8003d67`:** still_present (content, low). src/lib/features/canvas/canvas.logic.ts:36-49 returns an empty canvas on parse failure, with no failure result type. src/lib/features/canvas/CanvasInner.svelte:97-111 syncs that as lastSyncedData, and :118-123 writes over the file on the first edit through onJsonChange(ownPath, json) with no guard. No read-only or error panel in src/lib/features/canvas or src/lib/app/EditorView.svelte. src/tests/lib/features/canvas/canvas.logic.test.ts:57-78 still asserts the silent-empty contract.

**Stale in the text below:** Duplicates .scratch/file-io-audit/issues/15-canvas-unparseable-overwritten.md; keep this one (it has the owner decision) and close 15 against it. The onJsonChange call is at CanvasInner.svelte:123.

**What to build:** Opening a .canvas file whose JSON does not parse, has a non-object root, or has nodes/edges that are not arrays must not show an editable empty board whose first edit replaces the file. Today it does. parseCanvas (src/lib/features/canvas/canvas.logic.ts:36-49) is split into a result-returning parser, for example { ok: true, data } | { ok: false, reason }. CanvasInner.svelte (:71, :85-98, :104-115) renders an inline error ('This canvas file could not be read; switch to source mode to repair it') and never calls onJsonChange while the current jsonContent failed to parse. That covers persistWithoutHistory, persistChanges, the 300 ms watcher and undo/redo. Source mode (EditorView.svelte) stays available to repair the raw text. After a source-mode fix, the board re-parses and becomes editable. This follows the ADR 0029 precedent of refusing a write instead of dropping data.

**Blocked by:** 004, 026

**Status:** ready-for-agent

**First wave:** yes, added by the owner on 2026-11-06 after the challenge review (`raw/first-wave-challenge.json`).

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

## Audit 2026-11-05 additions

### Merged from `.scratch/file-io-audit/issues/15-canvas-unparseable-overwritten.md`

That Issue was folded into this one by the audit; its text follows.

### 15: An unparseable .canvas opens empty and the first edit overwrites the original

**Status:** needs-triage

(Blocked by in the merged Issue, superseded:) none
Priority: P1
Severity: data-loss
Source: file I/O audit, deep-dive group(s) o09-undo-canvas-kanban (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

### Details

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

### Audit evidence (editor-data-safety, 2026-11-02)

- Finding G6 (P0, rare). Its invalid-JSON half is the case this Issue already describes. Its second defect, unknown top-level keys dropped on every persist from a valid file, is the amendment above.
- Repro test: `.scratch/editor-data-safety/repro/gap-findings-and-kanban/canvas-invalid-json.test.ts`, case 'a persist from a valid canvas keeps unknown top-level keys' (the case 'adding a node to a canvas that failed to parse must not drop the original nodes' replays the invalid-JSON half through the same logic pipeline). To run it, copy the group folder to `src/tests/audit-repro/gap-findings-and-kanban/` (see `.scratch/editor-data-safety/repro/README.md`).
- Code path, verified against the current code: src/lib/features/canvas/canvas.logic.ts:42-45 (parseCanvas returns `{ nodes, edges }` only); src/lib/features/canvas/canvas.logic.ts:299-342 (flowToCanvas returns `{ nodes, edges }` only); src/lib/features/canvas/CanvasInner.svelte:71 (`canvasData = $derived(parseCanvas(jsonContent))`); src/lib/features/canvas/CanvasInner.svelte:104-109 (persistWithoutHistory: flowToCanvas(updatedNodes, updatedEdges, canvasData) -> serializeCanvas -> onJsonChange); src/lib/features/canvas/canvas.types.ts:105-110 (`CanvasData` has only `nodes` and `edges`).


## Comments

- 2026-11-06: migrated from `.scratch/audit-2026-11-04/issues/13-canvas-refuse-write-on-unparseable.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: added to the first wave by the owner after the challenge review.
- 2026-11-06: Blocked by 52 added after the order review: 52 also reworks the canvas persist and sync code.
