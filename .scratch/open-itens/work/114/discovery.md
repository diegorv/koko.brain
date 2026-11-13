# 114 discovery: task writes reach search and the QueryJS cache

No `spec.md` in `.scratch/open-itens/`; the Issue file is the whole spec. Read
`docs/agents/indexing-watcher-rules.md` (rule 6: `applyNoteChange` is the one owner).

## Files that change

- `src/lib/core/filesystem/note-change.service.ts`
  - `:7-17` doc comment + `NoteChangeSource` union gain `task`.
  - `:60-65` `rust` field comment names the task commands (`toggle_task_status`) next to `create_note`.
  - `:86-95` `SOURCE_POLICY` gains `task: { consumers: 'always', rust: 'never', mark: true, yieldBeforeConsumers: false }`.
- `src/lib/features/tasks/tasks.service.ts`
  - `:160-166` (the Issue's `:144-150`, shifted by Issue 021) replaced by a call to a new module-private
    `afterTaskWrite(path, updatedContent)`: `syncExternalContentToEditor(..., true, 'none')`,
    `markRecentSave`, `void applyNoteChange({ kind: 'upsert', source: 'task', ... vaultPath: vaultStore.path ?? undefined })`,
    `notifyContentInvalidated()`, `await buildTaskIndex()`.
  - The stale / no-op returns (`:152-159`) stay before it. `toggleTask` JSDoc updated (it says no TS-side index sync remains).
- Tests: `src/tests/lib/features/tasks/tasks.service.test.ts`, `src/tests/lib/core/filesystem/note-change.service.test.ts`.

## Plan

1. Failing test in `tasks.service.test.ts` (real stores; mock only `invoke`, plus the existing debug / toast mocks):
   `setupLocalStorage()` at top, `vaultStore.open('/vault')`, real consumer + listener registered, unregister and
   `vaultStore.close()` + `resetHooks()` in `afterEach`. `invoke` mocked per command (every command returns a promise,
   because `applyNoteChange` chains `.catch` on `call`). Asserts: `update_search_index_file` args, consumer upsert content,
   listener fired once, `areAllRecentSaves(['/vault/a.md'])`, no `update_note_in_index`. Second test: no-op and stale
   toggles reach none of FTS / consumer / listener.
2. `note-change.service.test.ts`: `['task', false, true]` row; `task` upsert on an already-indexed signature runs consumers;
   `'task'` added to the no-vaultPath list at `:216`.
3. Implement policy row, then `afterTaskWrite`.

## Prior art

- `note-action-bar.service.test.ts:2-5` (localStorage fixture before `vaultStore.open`).
- `notifyAfterSave` (`editor.hooks.ts:67-92`) is the same shape: mark, synchronous `applyNoteChange`, then invalidate.

## Risks / defaults

- `vaultStore` is module state shared across the test file; the new tests close it in `afterEach` so later tests keep
  `vaultPath` null (the FTS leg stays off and their `invoke` mocks need no extra values).
- `mark: true` means a later `save` of the same bytes dedupes the TS consumers, which already saw them here. Intended.
- Issue 09 will call `afterTaskWrite` too; kept module-private as the Issue says.
