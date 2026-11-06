# 06: A canvas edit closed or renamed inside the debounce window reaches its .canvas file

**Migrated from:** `.scratch/audit-2026-11-04/issues/22-canvas-flush-on-close-and-rename.md` (audit 2026-11-05). Priority: content safety (bucket 1-content). Content/medium for a daily canvas user, because the last edit is dropped. Issue 49's bugs 1 and 2 are fixed (f37acb402), and what remains of 49 is exactly this close-within-debounce drop.

**Audit check at `5f8003d67`:** still_present (content, medium). src/lib/core/editor/editor.service.ts:309-328 closeTab checks isTabDirty, which is still clean inside the 300 ms debounce (CanvasInner.svelte:227-239), then calls removeTab at :328. Only after that does the keyed instance's onDestroy (CanvasInner.svelte:246-250) call persistChanges -> onJsonChange(ownPath, json) (:123) -> onContentChangeForPath (editor.service.ts:265-268) -> updateTabContentOnly (editor.store.svelte.ts:139-144), which finds no tab, so the edit is dropped. registerTabCloseListener (editor.service.ts:28) runs after removal (:330), and its only consumer is src/lib/plugins/queryjs/queryjs-ports.ts:16. Rename re-keys EditorView.svelte:83-85, and the flush targets the old ownPath (CanvasInner.svelte:63). src/tests/lib/features/canvas/canvas-tab-switch.test.ts:158-173 asserts only that the neighbour tab is not written, not that A's edit survives.

**Stale in the text below:** Accurate at HEAD. The kanban view has the same close-time problem (new Issue in this audit: a kanban card edit committed into its own board), so the pre-close flush mechanism chosen here should be reusable by KanbanView.

**What to build:** A canvas edit made less than 300 ms before the canvas tab is closed, or before the canvas file is renamed, is saved into that canvas's .canvas file. Today it is dropped: `closeTab` runs `removeTab` before the keyed CanvasInner's onDestroy flush, so `onContentChangeForPath(path, json)` (via `editorStore.updateTabContentOnly`) finds no tab and writes nothing; the tab was not dirty yet, so no "unsaved changes" prompt fires either. A rename re-keys the instance and the flush targets the old path, which has no tab. Options from the Issue 01 review: flush the canvas before `removeTab` (a pre-close hook the canvas registers), or have the path-scoped writer save a path with no open tab straight to disk.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: in src/tests/lib/features/canvas/canvas-tab-switch.test.ts, type into canvas A's card, advance 100 ms, `closeTab(A)`, advance 3000 ms: `writeTextFile` was called with A's path and the typed text, and never with the neighbour's path.
- [ ] A programmatic rename of A inside the debounce window (auto-move or a watcher-detected rename; a user rename takes longer than the 300 ms debounce) keeps the typed text in the renamed file, through the same pre-close flush. Never by saving to the old path.
- [ ] Frontend gate green: pnpm check, pnpm vitest run, pnpm build.

## Notes

- **Source:** Issue 01 review, findings 1 and 2 (`.scratch/audit-2026-11-04/work/01/review.md` in Issue 01's branch history). Not a regression: the reviewer's probe drops the edit on main too.
- Code: src/lib/features/canvas/CanvasInner.svelte (`ownPath`, the onDestroy flush), src/lib/core/editor/editor.service.ts (`onContentChangeForPath`, `closeTab`).
- **Size:** S to M.

## Audit 2026-11-05 additions

### Merged from `.scratch/file-io-audit/issues/49-canvas-switch-reuses-instance.md`

That Issue was folded into this one by the audit; its text follows.

### 49: A canvas-to-canvas tab switch reuses one CanvasInner: the last edit is dropped and Cmd+Z writes canvas 1 into canvas 2

**Status:** needs-triage

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

- Historical (Issue 49, met at HEAD by the keyed EditorView and the by-path persists; the Cmd+W case is the first criterion above): Failing test comes first. Move `.scratch/editor-data-safety/repro/writes-into-wrong-tab/canvas-unmount-flush.test.ts` under `src/tests/` (for example `src/tests/lib/features/canvas/canvas-tab-switch.test.ts`)
- Historical (Issue 49, met at HEAD by the keyed EditorView and the by-path persists; the Cmd+W case is the first criterion above): An edit typed less than 300 ms before a canvas-to-canvas switch is kept in the first canvas's tab content and saved to its file
- Historical (Issue 49, met at HEAD by the keyed EditorView and the by-path persists; the Cmd+W case is the first criterion above): Cmd+Z right after a canvas-to-canvas switch, with no edit, leaves the second canvas's tab content unchanged
- Historical (Issue 49, met at HEAD by the keyed EditorView and the by-path persists; the Cmd+W case is the first criterion above): Cmd+W within 300 ms of a canvas edit either prompts or saves the edit to the canvas file
- Historical (Issue 49, met at HEAD by the keyed EditorView and the by-path persists; the Cmd+W case is the first criterion above): Canvas persists (debounce, undo/redo, destroy flush) write by tab path, not through `editorStore.updateContent` / `tabs[activeIndex]`
- Historical (Issue 49, met at HEAD by the keyed EditorView and the by-path persists; the Cmd+W case is the first criterion above): The F5 tests in the moved file (canvas -> note switch and Cmd+W leave the note intact) stay green
- Historical (Issue 49, met at HEAD by the keyed EditorView and the by-path persists; the Cmd+W case is the first criterion above): Toggling a canvas between canvas view and source mode still shows the same content and loses no edit

### Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit, finding F21, with the refuted F5 (`.scratch/editor-data-safety/audit-2026-11-02.md`; cross-reference in `.scratch/editor-data-safety/xref-file-io-audit.md`: no existing issue covers it; `.scratch/file-io-audit/README.md` Refuted section lists the dropped edit as an unclaimed P3 residual, and issue 15 is a different canvas bug). Code re-read at 1351a35d; installed Svelte is 5.57.2.

### Canvas-to-canvas tab switch drops the pending edit and shares one undo history

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


**Second opinion (audit 2026-11-05, round 2):** upheld (content, low). The close case is real. closeTab (editor.service.ts:309-333) only checks isTabDirty, and the tab is still clean inside the 300 ms debounce (CanvasInner.svelte:236). It then calls removeTab, and only afterwards does the keyed instance's onDestroy (:246-250) run persistChanges -> onJsonChange(ownPath) (:123) -> onContentChangeForPath (:265-268) -> updateTabContentOnly (editor.store.svelte.ts:139-144). By then there is no tab, so the edit is dropped. Each keystroke re-arms the debounce, so a continuous typing burst followed by an immediate Cmd+W loses the whole burst. The existing test (canvas-tab-switch.test.ts:158-173) only checks the neighbour tab. Corrections to apply while implementing: In daily use the rename case is close to unreachable. The debounce fires 300 ms after the last edit whether or not the canvas has focus, and any rename the user starts (dialog, file tree, F2) takes longer than that, so pendingPersist is already false when the re-key destroys the instance. Only a programmatic rename (auto-move, which is off by default, or a watcher-detected rename) can hit it, so demote the rename criterion. Option 2 ('save a path with no open tab straight to disk') is unsafe for rename: it would write to the old path and recreate the renamed-away file. Prefer the pre-close flush hook. 'Stale in the text below: Accurate at HEAD' is wrong for the merged Issue 49 section: EditorView is now keyed (:83-85), persists already go by path (onContentChangeForPath), and its line numbers (EditorView:80-81, CanvasInner:85-115/:208-234, editor.service.ts:228-231/:266-294) are stale. Mark that section and its already-met checkboxes as historical, leaving only the Cmd+W criterion.

## Comments

- 2026-11-06: migrated from `.scratch/audit-2026-11-04/issues/22-canvas-flush-on-close-and-rename.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
