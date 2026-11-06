# 01: The caret and selection follow their text when a frontmatter toggle, property edit, link rewrite or external reload rewrites the open note

**What to build:** Every external doc replace keeps the caret at its old numeric offset instead of mapping it through the change. The content-sync effect (src/lib/core/markdown-editor/MarkdownEditor.svelte:627) reads `selection.main.head` from the old doc, and replaceDoc (:182-186) dispatches the `docDiff` changes together with an explicit `selection: EditorSelection.cursor(cursorPos)`. CodeMirror reads an explicit selection as post-change coordinates and does not map it (node_modules/@codemirror/state/dist/index.d.ts:865, index.js:2403-2415). So after a write above the caret, the caret sits N characters off and the next keystrokes land in the wrong place; a range selection also collapses to a cursor. Autosave then persists the misplaced text. Fix direction: let CodeMirror map the current selection through the diff (omit `selection`, or pass `state.selection.map(changeSet)`), keeping a clamp only for the fresh-state fallback (:173-180) where there is nothing to map. Apply the same to showTabState (:213-234): on a revisit the saved state's own selection should map through the background-write diff instead of being overwritten with the unmapped saved `cursorPos` (:224).

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, added by the owner on 2026-11-06 after the challenge review (`raw/first-wave-challenge.json`).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts (it already mounts the real MarkdownEditor and calls syncExternalContentToEditor): open '---\ntitle: x\n---\nHello world\n', put the caret at the index of 'world', call syncExternalContentToEditor(path, '---\ntitle: x\n_favorite: true\n---\nHello world\n', false, 'none') and flushSync; the selection head equals the new doc().indexOf('world'). It fails today (the head keeps the old offset).
- [ ] A text removal above the caret (Cmd+E turning `false` into `true`) moves the caret back by the removed length, so it stays before the same character.
- [ ] A non-empty selection in the body survives a frontmatter rewrite with both ends mapped, not collapsed.
- [ ] A change entirely below the caret leaves the caret where it was.
- [ ] A background tab rewritten above its saved caret (task toggle or link rewrite while another tab is active) shows the caret on the same text when the user switches back.
- [ ] The existing CRLF case 'an external sync that shortens a CRLF note below the cursor lands in the view' and the undo-mapping cases in the same file still pass.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** content safety (bucket 1-content). Upheld content/medium. Cmd+D and Cmd+E are daily and leave the caret about 16 characters off, so the next typing goes to the wrong place and autosave writes it to disk. It is an editor bug, so it comes first.
- **Trigger:** Caret in the body of the active note, editor focused. Press Cmd+D (adds `_favorite: true`, about 16 chars above the caret) or Cmd+E (`_organized: false` -> `true`, 1 char shorter), or let a watcher reload of the clean tab bring an edit above the caret, or a link rewrite / task toggle change text above it. Keep typing without clicking.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/app/global-keybindings.ts:191-202 (Cmd+D/Cmd+E reach the handler from inside the editor) -> src/lib/features/properties/lifecycle.service.ts:52,78 toggleActiveNoteFavorite -> updateNoteFrontmatter -> src/lib/core/frontmatter/frontmatter-write.service.ts:131-132 syncExternalContentToEditor(path, next, false, 'none') -> src/lib/core/editor/editor.service.ts:88-90 bumpExternalContentSignal for the active tab -> src/lib/core/markdown-editor/MarkdownEditor.svelte:616-641 content-sync effect, :627 cursorPos from the old doc, :635 replaceDoc -> :182-186 spec with explicit selection EditorSelection.cursor(cursorPos) -> node_modules/@codemirror/state/dist/index.d.ts:865 ('Offsets in this selection should refer to the document as it is after the transaction') and index.js:2403-2415 (explicit selection passed through unmapped). Same path: watcher reload editor.service.ts:449, link rewrite src/lib/core/filesystem/link-updater.service.ts:66, type rename src/lib/features/type-definitions/type-definitions.service.ts:235. Revisit path: MarkdownEditor.svelte:480-481 saved cursorPos -> showTabState :224. No test asserts the caret position after a sync (undo-history-across-notes.test.ts:506-517 checks only the doc).
- **Related Issues before the audit:** `.scratch/file-io-audit/issues/33-keystrokes-lost-during-async-writes.md`
- **Second opinion:** upheld (content, medium). I could not refute it. MarkdownEditor.svelte:627 reads selection.main.head from the old doc, and replaceDoc:182-186 dispatches the docDiff changes together with an explicit EditorSelection.cursor(cursorPos). CodeMirror does not map an explicit selection, so after Cmd+D inserts `_favorite: true` above the caret, the caret sits about 16 chars too early. Cmd+D is routed from inside the editor (global-keybindings.ts:189-196) to updateNoteFrontmatter, then syncExternalContentToEditor (frontmatter-write.service.ts:131), then the active-tab signal bump. No test asserts the caret after a sync. Text typed next lands at the wrong spot and autosave writes it to disk.
- **Source:** audit 2026-11-05, domain `editor`, finding `N-editor-01` (from editor-content-1, editor-ux-1). Size S.

## Comments

- 2026-11-06: added to the first wave by the owner after the challenge review.
