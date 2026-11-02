# 14: Undo history survives a tab switch, so Cmd+Z can insert another note's text

**Status:** resolved

**Blocked by:** 46

**What to build:** One `EditorView` is reused for every markdown and code tab (src/lib/app/EditorView.svelte renders a single unkeyed `MarkdownEditor`), and its one `history()` (src/lib/core/markdown-editor/setup/editor-extensions.ts:130) is never reset. Both whole-doc replaces in src/lib/core/markdown-editor/MarkdownEditor.svelte, the tab switch (dispatch with `Transaction.addToHistory.of(false)` at :233) and the external-content sync (:332), only MAP the stored undo events (@codemirror/commands `addMapping`), so the inverse of an edit made in note A survives and Cmd+Z later replays it into note B (or, after an external sync, at the end of the same note), and autosave writes it. Fix:
1. Tab switch: give each tab its own history. Keep a `Map<path, EditorState>` (or at least the history field's JSON via `historyField`) and swap with `view.setState(...)` when the tab changes, creating a fresh `EditorState` with the same extensions for a tab seen for the first time. Drop the entry when the tab closes (`notifyTabClosed` / the tab-close path) and re-key it on rename. Undo inside one note keeps working across switches away and back.
2. External-content sync (task toggle, link rewrite, Properties panel, watcher reload): replace only the changed range (common prefix and suffix diff) instead of the whole doc, so undo entries of the user's own edits map correctly and none lands at the end of the doc. If that is not possible for a given sync, clear the history for that note rather than keep events that would replay elsewhere.
3. Keep the suppress-flag handling Issue 46 adds (try/catch/finally around both dispatches): `view.setState` must not run inside a suppressed update without resetting the flags.

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/MarkdownEditor.svelte (tab-switch effect and external-content sync), src/lib/core/markdown-editor/setup/editor-extensions.ts:130, src/lib/app/EditorView.svelte, src/lib/core/markdown-editor/tab-view-state.ts, src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts

- [x] Failing tests come first. Move `.scratch/file-io-audit/repro/o09-undo-canvas-kanban/undo-across-doc-replace.test.ts` and `.scratch/editor-data-safety/repro/undo-and-delete/f84-shared-history-undo.test.ts` under `src/tests/` and see them fail on their bug assertions
- [x] Delete text in note A, switch to note B, press Cmd+Z repeatedly: B never receives A's text, and B's tab content and disk stay free of it
- [x] Round trip A -> B -> A, then Cmd+Z in A undoes A's own last edit at its original position (per-note undo survives a switch away and back)
- [x] Cmd+Shift+Z in B never redoes an edit undone in A
- [x] Delete a sentence, apply an external-content sync to the same note (Properties panel edit or task toggle), then Cmd+Z: the sentence is restored at its original position or not at all, never appended at the end of the doc
- [x] Closing a tab drops its stored state, and renaming a tab keeps its undo history under the new path
- [x] Existing MarkdownEditor, tab-switch and tab-view-state tests still pass
Priority: P1
Severity: corruption
Source: file I/O audit, deep-dive group(s) o09-undo-canvas-kanban (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Details

- Verdict: CONFIRMED_BY_TEST (deep dive priority P1, severity corruption)
- Claims covered: cross-cutting-3

**How a user hits it.** Default settings, common actions. (1) Delete a paragraph in note A, switch to note B, type, then press Cmd+Z a few times to revert B: after B's own events, the next Cmd+Z inserts A's paragraph at the end of B. (2) Delete a sentence, edit a property in the Properties panel, press Cmd+Z: the sentence lands at the end of the note. Task toggle, link rename and watcher reload take the same external-sync path. Nothing is lost, but foreign bytes are written to a different file 2 s later. CM scrolls to the change, so it is usually visible, but easy to miss when pressing Cmd+Z repeatedly.

**Recoverable from.** Cmd+Shift+Z (redo) or a manual delete if the user notices; File History holds B's earlier in-app saves

**Root cause.** src/lib/core/markdown-editor/MarkdownEditor.svelte:230-235 (tab switch) and :329-333 (external sync) dispatch a whole-doc replace with addToHistory=false into one long-lived EditorState whose history() (setup/editor-extensions.ts:130) is never reset

**Evidence.** One EditorState per mount (MarkdownEditor.svelte:107-131). Tab switch dispatches {from:0,to:len,insert} with Transaction.addToHistory.of(false) (:230-235); external sync does the same (:329-333). Fetched codemirror/commands src/history.ts: addToHistory===false -> state.addMapping(tr.changes.desc); addMappingToBranch keeps an event whose mapped changes are non-empty; mapEvent uses event.changes.map(mapping). The inverse of a deletion is an insertion, which survives the mapping and is placed after the replacement text, i.e. at the end of the doc. Undo passes the onDocChanged gate (editor-extensions.ts:171) -> onContentChange (editor.service.ts:224-227) -> updateContent + 2 s autosave. Repro uses the real MarkdownEditor.svelte, the real editor store and the real CM history; only Tauri is mocked.

**Repro test.** `.scratch/file-io-audit/repro/o09-undo-canvas-kanban/undo-across-doc-replace.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL Cmd+Z in note B never inserts text that was deleted in note A: AssertionError: expected 'Line one of B\nLine two of B\nSECRET …' not to contain 'SECRET' at expect(editorStore.tabs[1].content).not.toContain('SECRET'). FAIL Cmd+Z after a Properties-panel rewrite: AssertionError: expected true to be false at expect(doc.endsWith(`Last para.\n${SENT}`)).toBe(false)
```

**Fix sketch.** On tab switch, give each tab its own EditorState (view.setState with a cached or fresh state) instead of replacing the doc in a shared history. For external syncs, dispatch a minimal diff (or reset history) instead of a whole-doc replace.

## Comments

- 2026-11-02, branch `issue/14-undo-history-across-notes`: each tab keeps its own EditorState/undo history (stored per path, dropped on close, moved on rename only when a rename was recorded); external-content syncs dispatch a minimal per-region diff so undo maps through it instead of appending deleted text at the end. Repro tests moved under `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts`. Tests: `pnpm check` 0 errors; full suite at 74052c0b exit=0 (437 files, 10065 passed, 1 skipped, 1 todo), build OK. Reviews: round 1 CHANGES_REQUESTED, round 2 APPROVED, round 3 APPROVED (one optional nit on a vacuous assertion, not acted on).
