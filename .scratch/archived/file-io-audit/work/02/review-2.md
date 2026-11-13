VERDICT: APPROVED

## Previous findings

| # | Finding (review.md) | Status | Evidence |
|---|---|---|---|
| 1 | nit: a failed pre-save shows two error toasts | rejection stands | The finding itself marked the fix optional and advised against an API change to `saveFileByPath`. Rejecting it changes no behavior, and the reason is recorded under "## Resolution". |
| 2 | nit: the line-shift guard compares line text only | resolved | `src/lib/features/tasks/tasks.service.ts:105-106` JSDoc now says that a duplicated identical line shifted into `lineNumber` is the one toggled. This matches the code at lines 116-117 (`lineAt(saved, lineNumber) !== diskLine`). The change is comments only. |
| 3 | nit: no test for typing that edits the task line itself | resolved | `src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts:137-149` "skips the toggle when the unsaved typing edited the task line itself" asserts no `toggle_task_status` call, the edited text on disk and in `content`/`savedContent`, and the info toast. It cannot pass without the guard, because the toggle would run and `toggleCalls()` would have length 1. |

## Acceptance criteria re-checked

- [met] Ticking a task of a note with unsaved typing keeps the typing in the tab and on disk, with the task toggled — The fixes add one test and change no code. `task-toggle-dirty-buffer.test.ts` still has the happy-path case unchanged, and it passes: `pnpm vitest run src/tests/lib/features/tasks/` exit 0, 9 files, 157 tests. The new case covers the edited-line skip branch, where the typing is kept. Deliver runs the full suite.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/`: exit 0, 9 files, 157 tests passed.
- The fix diff (`9b0f51f1..HEAD`) touches only the toggleTask JSDoc, one added test and review.md. No test was weakened or removed, there is no scope creep, src-tauri/ is not touched, and the layer baseline is unchanged.
- Not run: the full suite and `pnpm build` (deliver runs them).

## Findings

1. nit — src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts:147: the fix report says the new case checks that "the list is refreshed", but unlike the shift case (line 131) it does not assert a `get_all_tasks_v2`/`get_tasks_in_section_v2` call. The code path is shared with the shift case, so the refresh is covered there. Fix (optional): copy the line-131 assertion into the new case.
