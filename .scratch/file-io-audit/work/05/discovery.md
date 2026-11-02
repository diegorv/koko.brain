# Issue 05 discovery

No `spec.md` exists for file-io-audit; the Issue file is the spec. Same save-first pattern as `work/02` (`saveFileByPath` returns false and toasts on a failed write); what differs is the close/re-add around `diskOp`.

## Files that change

- `src/lib/core/filesystem/path-change.service.ts:117-127` (`applyPathChange`): for `to === null`, await `saveFileByPath` for each non-virtual dirty tab at or under `from` (sequential, abort on the first `false` by throwing `PreDeleteSaveError`); then `closeTabsForDeletedPath(from)` keeps the removed tabs; `diskOp` in a try/catch that re-adds them with `editorStore.addTab` and rethrows. Close stays before `diskOp`.
- `src/lib/core/editor/editor.service.ts:360-370` (`closeTabsForDeletedPath`): returns the removed tabs, in tab order.
- Callers that toast a `deleteItem` failure skip `PreDeleteSaveError` (its toast is `saveFileByPath`'s "Failed to save file."): `note-action-bar.service.ts:19-28`, `NoteRowMenu.svelte:59-65` (`runOrToast`), `FilesNavigator.svelte:95-102` (`runOrToast`).
- Tests: move `.scratch/file-io-audit/repro/o04-delete-rename/delete-dirty-tab.test.ts` to `src/tests/lib/core/filesystem/delete-dirty-tab.test.ts`, copy its `fake-fs.ts` to `src/tests/fixtures/fake-fs.fixture.ts` (the other o04 repros still import the scratch copy); move `.scratch/editor-data-safety/repro/undo-and-delete/f165-delete-dirty-tab.test.ts` next to it, line 87 becomes `toBe(UNSAVED)`. Add: failed pre-delete save (file stays, tab dirty, one toast), folder Trash failure re-adds every child tab with its buffer on disk, pinned tab re-added pinned. `editor.service.test.ts` `closeTabsForDeletedPath` block: assert the return value. Race-audit mock gets `saveFileByPath`; mocks of `closeTabsForDeletedPath` return `[]`. Caller tests: a `PreDeleteSaveError` shows no caller toast.

## Plan

1. Red: move both repro tests under `src/tests/` (they fail on main).
2. `closeTabsForDeletedPath` returns the removed tabs (test first).
3. `applyPathChange` save-first + re-add on `diskOp` failure; green repros + new cases.
4. Callers skip their toast for `PreDeleteSaveError`.

## Risks

- Typing during the awaited pre-delete save re-dirties the tab; the close then drops those keystrokes. Accepted by the Issue's design (no await between the last save and the close, the window is one write).
- Re-added tabs lose order, focus, view state, and queryjs first-open markers (documented by the Issue as not restored).

## Defaults taken

- The Issue says the error "propagates through `deleteItem` so the caller's toast shows it" and also "show one toast". Reading: the error does propagate (callers' catch runs, nothing deleted), and the caller's toast is skipped for this one error type so the user sees only "Failed to save file.".
- Error class `PreDeleteSaveError` exported from `fs.logic.ts` (callers import it without pulling in path-change.service), message `Could not save "<path>" before moving it to the Trash`.
