# 49: A canvas-to-canvas tab switch reuses one CanvasInner: the last edit is dropped and Cmd+Z writes canvas 1 into canvas 2

**Status:** wontfix

Priority: P1 (Cmd+Z right after a canvas switch overwrites the second canvas with the first one's content and autosaves it; the dropped edit is at most the last 300 ms of typing)

**What to build:** src/lib/app/EditorView.svelte:80-81 renders every canvas tab in the same unkeyed `{:else if isCanvasTab && !canvasSourceMode}` branch, so a switch from Board-1.canvas to Board-2.canvas keeps the same CanvasView and CanvasInner and only changes `jsonContent`. Two bugs follow.

1. Dropped edit. A node-text edit arms the 300 ms persist debounce (src/lib/features/canvas/CanvasInner.svelte:208-226: `pendingPersist = true` at :219, timer at :221-224). On the switch, the sync effect (:85-98) sets `syncing = true` and replaces `nodes` with Board-2's data. The debounce effect re-runs: its cleanup `clearTimeout` (:225) cancels Board-1's pending persist, and the body returns at :218 because `syncing` is true. Board-1's tab content was never updated, so the edit is gone.
2. Shared undo history. `history` (:101) is never reset, and the sync effect pushes Board-2's baseline onto Board-1's stack (:94). Cmd+Z in Board-2 (:261-273) undoes to Board-1's snapshot and calls `persistWithoutHistory` (:104-109) -> `onJsonChange` = `onContentChange` (EditorView.svelte:81, src/lib/core/editor/editor.service.ts:228-231), which writes Board-1's nodes into Board-2's tab and arms the 2 s body autosave. No edit is needed to hit it.

Latent dependency (F5, refuted as a bug today, kept here because the fix removes it): `persistWithoutHistory` writes through `onContentChange` -> `editorStore.updateContent`, which writes `tabs[activeIndex]` (src/lib/core/editor/editor.store.svelte.ts:84-88) with no tab identity. The `onDestroy` flush (CanvasInner.svelte:230-234) on a canvas -> note switch lands in the canvas tab only because Svelte 5 (installed 5.57.2) returns pre-change signal values inside effect teardown, so `activeIndex` still reads the canvas index. That is a runtime detail, not a documented contract. A Svelte change, or a tab switch made from inside an effect, would write canvas JSON into the newly active note.

Side bug: Cmd+W (or any `closeTab`) within 300 ms of a canvas edit closes without a prompt and drops the edit. The tab is not dirty in the store yet, so `closeTab` (editor.service.ts:266-294, dirty check at :275) does not ask, and the `onDestroy` flush then writes into the removed tab object.

Fix:
- Key the canvas branch by tab path in EditorView.svelte (`{#key editorStore.activeTab.path}<CanvasView .../>{/key}`), so each canvas gets a fresh CanvasInner with its own `history`, its own debounce timer and its own `onDestroy` flush.
- Pass the tab path into CanvasView and CanvasInner and make every persist (`persistWithoutHistory`, the debounce timer, the `onDestroy` flush) call a path-keyed writer instead of `onContentChange`: `editorStore.updateTabContentOnly(path, json)` (editor.store.svelte.ts:139-144) plus the body autosave, exposed from editor.service.ts. Then the destroy flush targets its own file without relying on Svelte teardown semantics.
- Flush a pending canvas persist before `closeTab` runs its dirty check, so a Cmd+W inside the 300 ms window either prompts or saves. `core/` must not import `features/` (ADR-0003), so the canvas registers its flush (for example a per-path before-close hook in editor.service.ts that CanvasInner registers on mount and removes on destroy) instead of editor.service importing the canvas.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/app/EditorView.svelte:80-81, src/lib/features/canvas/CanvasView.svelte:5-16, src/lib/features/canvas/CanvasInner.svelte:85-115, :208-234, :261-273, src/lib/core/editor/editor.service.ts:228-231, :266-300, src/lib/core/editor/editor.store.svelte.ts:84-88, :139-144

- [ ] Failing test comes first. Move `.scratch/editor-data-safety/repro/writes-into-wrong-tab/canvas-unmount-flush.test.ts` under `src/tests/` (for example `src/tests/lib/features/canvas/canvas-tab-switch.test.ts`)
- [ ] An edit typed less than 300 ms before a canvas-to-canvas switch is kept in the first canvas's tab content and saved to its file
- [ ] Cmd+Z right after a canvas-to-canvas switch, with no edit, leaves the second canvas's tab content unchanged
- [ ] Cmd+W within 300 ms of a canvas edit either prompts or saves the edit to the canvas file
- [ ] Canvas persists (debounce, undo/redo, destroy flush) write by tab path, not through `editorStore.updateContent` / `tabs[activeIndex]`
- [ ] The F5 tests in the moved file (canvas -> note switch and Cmd+W leave the note intact) stay green
- [ ] Toggling a canvas between canvas view and source mode still shows the same content and loses no edit

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit, finding F21, with the refuted F5 (`.scratch/editor-data-safety/audit-2026-11-02.md`; cross-reference in `.scratch/editor-data-safety/xref-file-io-audit.md`: no existing issue covers it; `.scratch/file-io-audit/README.md` Refuted section lists the dropped edit as an unclaimed P3 residual, and issue 15 is a different canvas bug). Code re-read at 1351a35d; installed Svelte is 5.57.2.

## Canvas-to-canvas tab switch drops the pending edit and shares one undo history

- Verdict: PARTIAL (priority P1, likelihood occasional). The dropped edit and the shared undo history reproduce. The reported stale-flag consequence does not: `pendingPersist` stays true after the switch, but the later `onDestroy` flush lands in Board-2 itself (old `activeIndex` during teardown), so it never reaches another note.

**How a user hits it.** (a) Edit a text card in Board-1.canvas and switch to Board-2.canvas within 300 ms (tab click, Cmd+Shift+] or the quick switcher): the last words are not in Board-1. (b) Switch from Board-1 to Board-2 and press Cmd+Z, for example to undo something the user believes is on Board-2: Board-2's tab becomes Board-1's nodes and the 2 s autosave writes that into Board-2.canvas. (c) Cmd+W within 300 ms of a canvas edit closes the tab without a prompt and drops the edit.

**Recoverable from.** (b) Cmd+Shift+Z while the instance lives, or File History for Board-2's earlier in-app saves. (a) and (c) no: the dropped text was never in the store or on disk.

**Code trace.** EditorView.svelte:80-81 has no `{#key}` around CanvasView; CanvasView.svelte:12-16 passes only `jsonContent` and `onJsonChange`, no path. CanvasInner.svelte:85-98 sync effect: `syncing = true`, `nodes`/`edges` replaced, `history = pushSnapshot(history, ...)` at :94 onto the existing stack (:101). Debounce effect :212-226: cleanup at :225 clears the pending timer, body returns at :218 on `syncing`. Undo at :262-273 pops to the previous canvas's snapshot and calls `persistWithoutHistory` (:104-109) -> `onJsonChange(json)` -> editor.service.ts:228-231 `editorStore.updateContent` + `scheduleAutoSave('body')` -> editor.store.svelte.ts:84-88 writes `tabs[activeIndex]`. F5: `onDestroy` (:230-234) calls `persistChanges` through the same active-index writer; the guard is Svelte's teardown old-value semantics (sources.js `old_values`, runtime.js `is_destroying_effect`, per the deep dive). Close: editor.service.ts:275 prompts only on `isTabDirty(tab)`, which is false before the debounce fires.

**Repro test.** `.scratch/editor-data-safety/repro/writes-into-wrong-tab/canvas-unmount-flush.test.ts` (copy to `src/tests/audit-repro/writes-into-wrong-tab/` to run, see the repro README). It mounts the real EditorView.svelte. 'F21: an edit typed <300 ms before a canvas-to-canvas switch is kept in the first canvas', 'F21 (shared undo history)' and 'F5 side effect: Cmd+W inside the 300 ms window either prompts or saves the canvas edit' fail on the bug assertion; 'F5: canvas -> note switch', 'F5 (close variant)' and 'F21 (stale flag)' pass and guard the latent dependency.

```
F21: expected '{..."text": "card A"...}' to contain 'last words'
F21 (shared undo history): expected ... not to contain 'card A'
F5 side effect: expected false to be true (no write to Board-1.canvas and no ask() prompt)
```

**Fix sketch (audit).** Key the canvas branch by tab path, so each canvas gets a fresh CanvasInner with its own history and its own `onDestroy` flush. Combine that with a path-keyed persist, so the flush during destroy targets the right file without relying on Svelte teardown semantics. For close, flush the pending canvas persist before the dirty check in `closeTab`.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/06-canvas-edit-closed-renamed-inside-debounce-window.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
