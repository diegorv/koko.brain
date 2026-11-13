# 001 discovery

No `spec.md` in `.scratch/open-itens/`; the Issue is self-contained.

## Files that change

- `src/lib/core/markdown-editor/MarkdownEditor.svelte:170-200` `replaceDoc`: the `spec` passes
  `selection: EditorSelection.cursor(Math.min(cursorPos, text.length))` with the `docDiff`
  changes (:186). CodeMirror treats an explicit selection as post-change coordinates and does
  not map it, so the caret keeps its old numeric offset and a range collapses.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:215-247` `showTabState`: the revisit
  update overwrites the saved state's selection with the unmapped saved `cursorPos` (:226).
- `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts`: new caret cases.

## Plan

1. Tests first (fail today): a `describe('caret after an external sync')` block in the test file:
   - Cmd+D shape: `'---\ntitle: x\n---\nHello world\n'`, caret at `indexOf('world')`,
     `syncExternalContentToEditor(path, <with _favorite: true>, false, 'none')`, head equals
     new `doc().indexOf('world')`.
   - Cmd+E shape: `_organized: false` -> `true`, head moves back by 1 and stays before 'world'.
   - Range selection over 'world' survives a frontmatter rewrite with anchor and head mapped.
   - Change below the caret: head unchanged.
   - Background tab: caret on 'world' in A, switch to B, sync A with a line inserted above,
     switch back, head equals `doc().indexOf('world')`.
2. Fix: drop `selection` from `replaceDoc`'s spec so CodeMirror maps `state.selection`
   through the change set (both the dispatch and the catch-rebuild `v.state.update`). Keep
   `cursorPos` only for the `freshState` fallback when `docDiff` returns null.
3. Fix: drop `selection` from `showTabState`'s `saved.update`, so the saved state's own
   selection maps through the background-write diff. `cursorPos` stays for the fresh-state
   paths (first visit, too-large diff, throw). Update both JSDoc blocks.

## Prior art

Same file: 'a background tab changed by an external write keeps its history mapped...' (:163)
and the CRLF case (:506) for mount/sync/flush shape.

## Risks

- The saved `TabViewState.cursorPos` and the saved `EditorState` are written together
  (MarkdownEditor.svelte:475-480), so on a revisit with no background write the mapped
  selection equals the old explicit one. After a remount `tabEditorStates` is cleared and the
  fresh path still uses `cursorPos`.
- CRLF case (:506): the caret past the new end maps into range by construction, no clamp needed.
- No decoration/widget/watcher logic changes; only the selection field of the replace transaction.

## Defaults taken

- 'Cmd+E' is modeled as the direct sync it ends in (`syncExternalContentToEditor`), not through
  the keybinding, as criterion 1 does.
