# 14 Undo history survives a tab switch, so Cmd+Z can insert another note's text

Status: needs-triage
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
