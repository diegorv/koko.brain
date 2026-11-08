# Issue 14 discovery

No `.scratch/file-io-audit/spec.md` exists; the Issue is self-contained. Builds on Issue 46 (`work/46`):
`replaceDoc` in MarkdownEditor.svelte already wraps both doc replaces with a try/catch rebuild and
the suppress flags reset in `finally`.

## Files that change

- `src/lib/core/markdown-editor/MarkdownEditor.svelte`
  - :140-162 keep the mount-time extension array in a local (`mountExtensions`) to create fresh tab states.
  - :229-268 tab switch: save `view.state` for the outgoing tab (`saveTabEditorState`), then build the
    incoming state from the cached one (or `EditorState.create` with `mountExtensions` for a first visit),
    `update()` it with the minimal diff to `tab.content` (store content can change while the tab is in the
    background), the cursor, and the current compartment values (theme, `editorModeEffects`, sync language
    effects) because a cached state keeps the compartments it had when it was left; install with
    `view.setState`. A throw from `setState` is logged with the same message as `replaceDoc` and retried once.
    `isTabSwitching` stays in try/finally.
  - :77-96 `replaceDoc` (external sync only now): replace only the changed range from `docDiff`.
  - :180-198 onDestroy clears the cached states: their update listener closes over this instance's flags.
- New `src/lib/core/markdown-editor/doc-diff.logic.ts`: `docDiff(old, next)` common prefix/suffix change.
- `src/lib/core/markdown-editor/tab-view-state.ts`: a second path-keyed map of `EditorState`
  (`save/get/clearTabEditorStates`); `deleteTabViewState` (already called by `closeTab` and
  `closeTabsForDeletedPath`) and `clearAllTabViewStates` drop it too; new `renameTabViewState(old, new)`.
- `src/lib/core/filesystem/link-updater.service.ts:73-86` `updateTabAfterRenameOrMove` calls
  `renameTabViewState` for each tab it re-paths (the only `updateTabPath` caller).

## Tests

- Move `.scratch/file-io-audit/repro/o09-undo-canvas-kanban/undo-across-doc-replace.test.ts` to
  `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts` (real component, real store).
- `f84-shared-history-undo.test.ts` drives a fake view with the buggy dispatch spec copied inline, so it
  cannot go green by fixing the app. Its five scenarios are ported to the same new file against the real
  MarkdownEditor (A->B undo, A->B->A undo in place, redo in B, external sync in the same note); the
  repro file is deleted.
- New cases: close tab then reopen has no history; rename of a background tab keeps its history.
- `doc-diff.logic.test.ts`, `tab-view-state.test.ts` (rename, delete drops editor state),
  `link-updater.service.test.ts` (rename re-keys view state).

## Risks / defaults

- `setState` rebuilds view plugins and the DocView on every switch; the old whole-doc replace rebuilt every
  decoration too. Not measured.
- History does not survive a MarkdownEditor remount (canvas/collection tab and back): same as today.
- An external change overlapping a deleted range maps the undo insertion to that range's edge (inside the
  edited zone, never the doc end). Not cleared: the diff keeps it local.
