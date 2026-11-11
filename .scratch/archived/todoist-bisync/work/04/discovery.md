# 04 discovery: guarded writer for task lines in open tabs

No `spec.md`; the design is `research/design.md` rule 12. Repeats Issue 03 (`work/03/`): same `TaskLineEdits` batch and `TaskLinesStale` reasons, now applied in TS to a tab's text.

## Files

- New `src/lib/features/todoist-sync/task-line-edits.logic.ts`: `applyTaskLineEdits(content, edits)`, a line-for-line port of Rust `apply_task_line_edits` (`src-tauri/src/vault/task_lines.rs:149-302`): same checks, order, stale reasons and caller-bug errors (thrown). Uses `ID_TOKEN_RE` (`anchor.logic.ts:18`), the Rust `HEADING_RE` (`parsing.rs:1441`) and `detect_code_fence` (`parsing.rs:1679`).
- New `src/lib/features/todoist-sync/note-writer.service.ts`:
  - `writeTaskLinesToNote(vaultRoot, relPath, edits)`: the entry point. No tab -> `writeTaskLinesToClosedNote` (Issue 03). Active tab whose CodeMirror doc equals the tab content -> one `view.dispatch` of `docDiff(doc, next)` (`core/markdown-editor/doc-diff.logic.ts:27`); the update listener (`setup/editor-extensions.ts:173`) runs `onContentChange`, which updates the tab and arms the body autosave. Any other tab -> `syncExternalContentToEditor(path, next, false, 'body')` (`core/editor/editor.service.ts:71`): content only, tab stays dirty, autosave arms. Returns `written` / `unchanged` / `stale` with the new content.
  - `readNoteContent(vaultRoot, relPath)`: open tab content, else `readTextFile`.
- `closed-note-writer.service.ts:18` comment on `open-tab` now names this writer.

## Plan

1. Logic test (port of the Rust pure cases in `src-tauri/tests/vault_task_lines_test.rs:70-294`), then the logic.
2. Service test (jsdom, real `MarkdownEditor.svelte` mounted, real stores, mock only plugin-fs / dialog / `invoke`), then the service.

## Prior art

- `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts` (mounts the real editor, types via `view.dispatch`).
- `src/tests/lib/features/todoist-sync/closed-note-writer.service.test.ts` (invoke mock per command).

## Risks

- Tab-switch window: `activeTabPath` moves before the editor effect installs the new doc. The view is used only when its doc equals the tab content; otherwise the string path patches the tab, and the editor's own effects install it.
- CRLF tab: the tab keeps raw CRLF text, the view has LF, so it takes the string path and comes back `crlfLineEndings` stale, as Rust does.

## Defaults taken

- The sync transaction is not added to undo history (`Transaction.addToHistory.of(false)`), like every other external write (`MarkdownEditor.svelte:187`); undo of the user's own edits still maps through it.
- The open-tab path refuses (throws) a `vaultRoot` that is not `vaultStore.path`, the same refusal Rust makes for closed notes.
- No `markRecentSave` / `applyNoteChange` on the open-tab paths: the autosave's `notifyAfterSave` does them when it writes.
- `readNoteContent` rethrows a disk read error (missing note) after logging it.
