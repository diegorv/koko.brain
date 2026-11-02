# Issue 46 discovery

No `.scratch/file-io-audit/spec.md` exists; the Issue is self-contained.

## Files that change

- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:104-117` (`fileUrlToFsPath`):
  wrap `decodeURIComponent(parsed.pathname)` (:113) in try/catch, return `null`; JSDoc names the case.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:227-237` (tab switch) and `:328-334` (external sync):
  `try { dispatch } catch (err) { error('EDITOR', ...); rebuild } finally { flag = false }`.
  One local helper `rebuildView(content, cursorPos, err)` shared by both:
  `view.setState(view.state.update({ changes: full replace with content, selection }).state)`,
  itself in a try/catch that logs, so the effect never rethrows.
  Rebuilding from `view.state` (not `EditorState.create` with the mount-time extensions) keeps the
  compartment contents (theme, language, live-preview mode) the effects reconfigured since mount.
  The rest of the tab-switch effect (focus, rAF rebuild, `lastTabPath = path`) runs after the catch.
- Tests:
  - `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts`: move the
    `F105` and `F105 escalation` describes from
    `.scratch/editor-data-safety/repro/table-and-doc-mutations/widget-doc-rewrites.test.ts` (import
    `createMarkdownState`, `testMarkdown` from `../../../test-helpers`), plus a well-encoded URL check.
    Remove the two describes from the repro file so they are not duplicated.
  - `src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts`: `render()` takes a host; new describe
    with a host whose `assetUrl` throws (`file://` image in the target note): tab switch then typing
    updates `editorStore` and marks the tab dirty; same for `syncExternalContentToEditor`; a second
    switch shows the right note in `view.state.doc` and `contentDOM`, edits land only in that tab.

## Prior art

- `MarkdownEditor.test.ts` mount pattern (real store, `flushSync`); `isTabDirty` from `editor.logic.ts`.
- `image-widget.test.ts` `hostView()` / `assetUrl` mock.

## Risks / defaults taken

- A widget that throws on every render also throws inside the rebuild. Default: log it and stop
  (no second fallback such as forcing source mode); the flags still reset in `finally`, so the store
  is not silenced. The component tests exercise a persistent thrower to see what the view does.
- The F105 escalation test dispatches without the component, so it only passes via part 2.
- Issue 14 touches the same dispatches; not landed yet, nothing to rebase onto.
