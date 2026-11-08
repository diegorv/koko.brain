# Issue 02 discovery

No `spec.md` exists for file-io-audit; the Issue file is the spec.

## Files that change

- `src/lib/features/tasks/tasks.service.ts:100-120` (`toggleTask`): `await saveFileByPath(filePath)` before `call('toggle_task_status')`; on false, toast + return.
- `src/lib/app/deep-link-actions.ts:51-54` (`executeDailyAction`): pre-save before `readTextFile`.
- `src/lib/features/deep-link/deep-link.service.ts:254-300` (`executeNewAction`): pre-save before the prepend / append read and before the overwrite write (overwrite: the save gives the replaced text a File History snapshot via `notifyAfterSave`).
- Tests: move `.scratch/file-io-audit/repro/o02-task-toggle/task-toggle-dirty-buffer.test.ts` to `src/tests/lib/features/tasks/` and `.scratch/file-io-audit/repro/o03-deep-link/deep-link-dirty-buffer.test.ts` to `src/tests/lib/features/deep-link/`; add overwrite, save-failure and clean/closed cases.
- Existing tests that mock `editor.service.js` without `saveFileByPath` (`deep-link.service.test.ts:31`, `deep-link.service.race-audit.test.ts:40`) get `saveFileByPath: vi.fn(() => Promise.resolve(true))`.

## Plan

1. Red tests moved under `src/tests/` (they fail on main).
2. `toggleTask` pre-save; green.
3. Deep-link daily + new pre-save; green; failure and overwrite cases.

`saveFileByPath` (editor.service.ts:161) already returns true for a closed, virtual or clean tab, so "a clean tab or a closed note behaves as today" needs no extra branch. On failure it toasts "Failed to save file." and leaves the tab dirty; the writers add their own toast saying the action was skipped, and write nothing.

## Risk: task line numbers shift after the pre-save

The Tasks view's `lineNumber` comes from the Rust index, which reflects the disk copy (the `edit` source skips the Rust IPC). If the unsaved typing inserted or removed lines above the task, saving first moves the task, and Rust would toggle whatever line now sits at `lineNumber` (a different task). Guard: before the save, take line `lineNumber` of `tab.savedContent` (the disk copy); after the save, compare it with the same line of the saved text. If they differ, skip the toggle, refresh the task index (`buildTaskIndex`) and toast that the list was refreshed, so the user clicks again on fresh line numbers. Rust is unchanged, per the Issue.

## Defaults taken

- Abort toasts: "Task not changed: the note could not be saved." / "Deep link skipped: the open note could not be saved." Error toasts, on top of `saveFileByPath`'s own.
- Remaining race (typing between the pre-save and the write) is not handled: during a Tasks-view click the editor is destroyed, and a deep link runs in milliseconds.
- Prior art: `frontmatter-write.service.ts:111-135` (save-then-abort), repro tests as listed.
