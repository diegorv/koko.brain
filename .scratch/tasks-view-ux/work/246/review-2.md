VERDICT: APPROVED

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | `handleRowMenuCloseFocus` treated focus in any `[role="dialog"]` as free | resolved | `TasksView.svelte:461` now matches `[role="menu"], [data-task-due-dialog]`, and `:1062` puts `data-task-due-dialog` on the due dialog's `Dialog.Content`. The shadcn wrapper `components/ui/dialog/dialog-content.svelte` spreads `restProps` onto `DialogPrimitive.Content`, so the attribute reaches the dialog element. The due dialog still matches, so the Pick a date and dialog close paths behave as before (their `TasksView.row-edit.test.ts` cases pass). New test `TasksView.row-menu.test.ts` "leaves focus in another dialog, such as the Command Palette, when the menu closes" uses a `role="dialog"` stand-in outside the view; under the old selector that element matched and the row would take focus, so the test fails without the fix. |
| 2 | nit | `updateTask` ran the outside-vault check after the dirty-tab save | resolved | `tasks.service.ts:309-312`: `relPath` is computed and the refusal thrown before `preflightTaskWrite`. The throw is inside the outer `try`, so it reaches the `toast.error` catch; `requestPromptIndexRefresh` now runs after the check, so no refresh flag is left set. New test `task-toggle-dirty-buffer.test.ts` "refuses a note outside the open vault before saving its dirty tab" asserts no write, no `writeTextFile`, the tab still dirty and the error toast. |

## Acceptance criteria re-checked

- [met] `task-toggle-dirty-buffer.test.ts`: parallel cases for `updateTask` (typing moved the line, typing edited the line, the pre-save failed), next to the existing `setTaskStatus` cases, which keep passing. — The four existing `updateTask` cases are unchanged and pass after the reorder; the fix only appends one case. The file passes in the run below.
- [met] `TasksView.row-edit.test.ts`: Due > Tomorrow sends the date (clock faked); Clear is offered only on a row with a due date; Pick a date opens the dialog, Save writes the picked date, Cancel writes nothing, and focus returns to the row after the dialog closes. — The due dialog still matches the narrowed selector through `data-task-due-dialog`; the Pick a date Save and Cancel focus cases pass unchanged.
- [met] Issue 241's tests that assert the exact item list of the menu change on purpose to include Due and Priority; no other 241 test changes. — The fix adds one new case to `TasksView.row-menu.test.ts` and edits no existing case (diff since the review is additions only).

## Findings

None open or new.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 231 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/`: exit 0, 18 files, 715 tests passed (covers `TasksView.row-menu.test.ts`, `TasksView.row-edit.test.ts`, `task-toggle-dirty-buffer.test.ts`, `tasks.service.test.ts`).
- Diff since the review (`26d122e92..HEAD`): `TasksView.svelte`, `tasks.service.ts`, two test files and the review file. No test weakened or deleted, no scope creep, layer baseline untouched.
- Not run: the full suite and e2e (deliver's). The Command Palette case is covered only with a stand-in element, not the real palette.
