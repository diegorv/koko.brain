# 246: Set due and priority from the Tasks row menu, with Undo

**Origin:** split out of Issue 122 on 2026-11-12 by the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` 122 and section 4, `dossier-122.md`, `cross-rust-ipc.md` F8), as 122b, the frontend half. The PRD stays in `.scratch/archived/tasks-view/`; the UX research ticket is `synthesis.md` T14. Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others (030, 085, 151, 198, 204, 205 and the rest) in `.scratch/open-itens/issues/`.

**What to build:** The Due filter and due grouping (Issues 238, 112) are only useful if a task can get a due date without typing the due signifier (U+1F4C5) and a date by hand. Add Due and Priority to the row menu Issue 241 built, next to Status, written through Issue 122's `write_task_text`:

- **Due:** Today, Tomorrow, In a week (today + 7 days), Pick a date, Clear. Clear shows only when the row has `metadata.dueDate`.
- **Priority:** a radio group Highest, High, Medium, None, Low, Lowest. The checked item is `metadata.priority ?? 'none'` (Rust never emits `none`).
- Every edit made from the menu shows Issue 241's Undo toast, which restores the previous text through the same command.

**Edit text**
- The menu builds the new text from the row's raw `task.text` with Issue 122's `setDueToken(text, date | null)` and `setPriorityToken(text, emoji | null)` (`src/lib/utils/task-tokens.ts`). The other signifiers, tags, the Todoist anchor and a trailing block id stay where they are.
- A pure `resolveDuePreset(preset: 'today' | 'tomorrow' | 'week', today: string): string` in a new `src/lib/features/tasks/task-row-edit.logic.ts` computes the date with `formatDateWithOffset` (`src/lib/utils/date.ts`), so no test depends on the clock reader. `today` is the view's derived today value (Issue 109). The priority-to-signifier map for all five levels lives in the same file (Todoist's `PRIORITY_EMOJI` in `pull.logic.ts` covers only three).

**The write**
- `updateTask` in `tasks.service.ts`:

  ```ts
  export async function updateTask(
  	filePath: string,
  	task: Pick<TaskItem, 'text' | 'status' | 'lineNumber'>,
  	newText: string
  ): Promise<boolean>; // true only when the line was rewritten
  ```

  - Returns `false` before doing anything when `newText === task.text`: no dirty-tab save, no IPC, no Undo dismissal.
  - Otherwise: call `dismissStatusUndo()` (Issue 241), then run the dirty-buffer protocol of `setTaskStatus` (Issue 241). Extract that block into one private `preflightTaskWrite(filePath, lineNumber): Promise<boolean>` that both writers call, so they cannot drift; `task-toggle-dirty-buffer.test.ts` guards it.
  - Call `vaultStore.requestPromptIndexRefresh()` right before `call('write_task_text', { vaultRoot: vaultStore.path, relPath, lineNumber, expectedText: task.text, expectedStatus: task.status, newText })`, with `relPath` from `vaultRelativeKey(vaultRoot, filePath)` (`#lib/utils/path.js`, which takes a `string` and returns `null` outside the vault), `vaultRoot` being the open `vaultStore.path` (`toggle_task_status` takes the absolute path, so there is no precedent in `setTaskStatus` to copy). When the call throws, or returns `stale` or `updateResult.changed: false`, no event follows: clear the flag with `vaultStore.takePromptIndexRefresh()` (Issue 244's rule).
  - `stale`: refetch and show `The task changed on disk, so the list was refreshed. Try again.` (Issue 241's copy), writing nothing more. A thrown error: `Failed to save task change.` and `error('TASKS', ...)`.
  - Success: `afterTaskWrite`, with Issue 244's overlay entry for `filePath:lineNumber` also carrying `TaskTextWriteResult.task`'s `metadata`: extend 244's `TaskOverlayEntry` with an optional `metadata?: TaskMetadata` and its `written` argument with the same optional field, and have `buildTaskRows` replace a kept row's `metadata` when the entry carries one (status writes leave it absent), so the due and priority chips change at once while the entries snapshot is still the pre-edit one.
- `updateTaskFromMenu(filePath, task, newText, message): Promise<void>` mirrors Issue 241's `setTaskStatusFromMenu`: it reads `getTasksResetGeneration()` (Issue 234) before the write; on `false` or a changed generation no toast is shown; otherwise it shows the toast through 241's single held toast id with `message` (`Due set to <date>`, `Due cleared`, `Priority set to <Label>`) and `description: taskDisplayText(task)` (Issue 109). Undo's `onClick` returns when the generation is no longer current, else calls `updateTask(filePath, { text: newText, status: task.status, lineNumber: task.lineNumber }, task.text)`: the old text back, with the new text as expected. Undo shows no second toast. 241's rules hold unchanged: only the last menu write can be undone, and any newer write or `resetTasks()` retires the toast.

**Menu**
- Add the items to 241's shared item list, so the DropdownMenu and the ContextMenu both get them. Use submenus (`sub`, `sub-trigger`, `sub-content` in `#lib/components/ui/dropdown-menu/` and `context-menu/`) for Due and Priority; if 241 delivered its Status group inline and submenus do not fit, match 241 and say why in the delivery comment. No side margins and no `text-xs` on items (`menu-item-anatomy.test.ts`).
- Pick a date closes the menu and opens one view-level `Dialog` with an `Input type="date"` (precedent: `EventForm.svelte` in `event-calendar`), prefilled with the row's due date; Save writes through `updateTaskFromMenu`, Cancel writes nothing. Do not import `plugins/kanban/KanbanDatePicker.svelte` (a `features` to `plugins` import, which `layer-rules.test.ts` forbids). When the dialog closes, focus returns to the row, else to the row `tabStopRow` (Issue 113) gives, as 241's `onCloseAutoFocus` handler does for the menus.
- A due edit can move a row between groups under Group by Due, or remove it under a Due filter. Issue 113's `nextCurrentRow` and 241's focus rule apply unchanged.

**Help:** `help/documentation/10-tasks-and-todoist.md` gains Due and Priority in the row menu section, and the Todoist effect: on a synced line a due edit reaches Todoist on the next sync, and so does a priority edit among Highest, High and Medium; Low, Lowest and None all map to Todoist priority 1, so moving between them sends nothing. Undo after a sync sends a second change. Clear on a recurring synced task keeps the due in Todoist (`fields.logic.ts` `due-not-pushed`). A due or priority edit on a note with Windows line endings fails with an error (Issue 122's limit).

**Blocked by:** 122, 241

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: split approved, 246 = 122b, blocked by 122 (and by 241). Undo for row-menu writes, never for the circle or Space (owner, 2026-11-12, Issue 241, decided when the menu held only status); extending it to the menu's Due and Priority writes is this plan's reading, for the owner to confirm at triage. PRD A7: row edits cover status, due and priority, with no done-date stamp and no recurrence spawn (owner, 2026-11-06). Open: Issue 122's locator (deep-dive Q5); this Issue follows its decision and stays `needs-triage` with it. Owner, 2026-11-12: confirmed, every row-menu write (status, due, priority) shows the Undo toast; the circle and Space stay without it. Owner, 2026-11-12 (Q5): Issue 122 uses the guarded line-number command.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` because the row menu gains items and the spec gains a due test. relay-lite's configured checks do not run e2e: the build step runs this spec before its last commit and reports its pass count, and the reviewer runs it again as a probe and cites the result. Do not run the whole e2e suite.

Test mechanics: component tests go in a new `src/tests/lib/features/tasks/TasksView.row-edit.test.ts`, built on Issue 110's `src/tests/fixtures/tasks.fixture.ts` (`mountTasksView`, `openMenu`, and `mockTaskFetch` to serve tasks; never an inline `invoke` mock of a task fetch command). Real stores. Allowed boundary mocks besides `invoke`: `svelte-sonner` in 241's callable form (`Object.assign(vi.fn(() => 'undo-1'), { error: vi.fn(), info: vi.fn(), dismiss: vi.fn() })`), `#lib/utils/debug.js` or a `console.error` spy. Fake only `Date` (`vi.useFakeTimers({ toFake: ['Date'] })`) where a test needs today. Read menu items only inside `[role="menu"][data-state="open"]`, and await a `requestAnimationFrame` before focus assertions (241's notes).

- [ ] Failing test first, `src/tests/lib/features/tasks/task-row-edit.logic.test.ts`: `resolveDuePreset('tomorrow', '2026-11-05')` is `2026-11-06`, `'week'` is `2026-11-12`, and `'tomorrow'` on `2026-12-31` is `2027-01-01`; the priority map covers all five levels.
- [ ] `tasks.service.test.ts` with real stores: with `Date` at 2026-11-05, the menu's "Due tomorrow" path sends `write_task_text` with `newText` ending in the due token for `2026-11-06`, `expectedText` the raw text and `expectedStatus` the row's status; Undo sends the old text as `newText` and the new text as `expectedText`. Red first: `updateTask` does not exist.
- [ ] `tasks.service.test.ts`: `newText === task.text` sends nothing and shows no toast; a `stale` result refetches, shows the stale copy and writes nothing more; a write that resolves after `resetTasks()` shows no toast; Undo with a stale generation sends nothing; a thrown write leaves the prompt-refresh flag cleared.
- [ ] `tasks.service.test.ts`: with `get_all_vault_entries_v2` still returning the pre-edit snapshot, after the write the row's `metadata.dueDate` is the new date (from the overlay and `TaskTextWriteResult.task`), and once `vaultIndexVersion` reaches the write's version the row reads from the snapshot again.
- [ ] `task-toggle-dirty-buffer.test.ts`: parallel cases for `updateTask` (typing moved the line, typing edited the line, the pre-save failed), next to the existing `setTaskStatus` cases, which keep passing.
- [ ] `TasksView.row-edit.test.ts`: Priority > High on a row with no priority sends `newText` ending in the high signifier (U+23EB) and the row's chip then reads `high`; the radio group checks None on a row with no priority.
- [ ] `TasksView.row-edit.test.ts`: Due > Tomorrow sends the date (clock faked); Clear is offered only on a row with a due date; Pick a date opens the dialog, Save writes the picked date, Cancel writes nothing, and focus returns to the row after the dialog closes.
- [ ] `TasksView.row-edit.test.ts`: right click on a row shows the same Due and Priority items; Undo from the toast restores the previous chip.
- [ ] `TasksView.row-edit.test.ts`: under the Open filter and a Due "Today" filter, setting Due > Tomorrow on row B of A, B, C removes it, and focus lands on C's row with `tabindex="0"`.
- [ ] Issue 241's tests that assert the exact item list of the menu change on purpose to include Due and Priority; no other 241 test changes.
- [ ] e2e, `e2e/specs/tasks-view.spec.ts`: open a row's menu, choose Due > Today, and the note's file content (read through `__e2e.fs`, as the spec's toggle test does) carries the due token for the test clock's today, and the row shows a due chip. Priority is asserted through the file content only (the mock task parser fills no priority).
- [ ] `help/documentation/10-tasks-and-todoist.md` describes Due and Priority in the row menu and the Todoist effect above.

## Notes

- **Size:** M (service and Undo, two menus, the date dialog, three test files, e2e, help).
- Run in series with the other Tasks view Issues (see 108). It edits `tasks.service.ts`, `TasksView.svelte` and the row menu that 241, 244 and 129 also edit; never run it beside them.
- Names other Issues define, used here exactly: `mountTasksView`, `mockTaskFetch`, `openMenu`, `TASK_STATUSES` (Issue 110); `getTasksResetGeneration` (Issue 234); `taskDisplayText`, `stripTaskTrailers` (Issue 109); `nextCurrentRow`, `tabStopRow` (Issue 113); `setTaskStatus`, `setTaskStatusFromMenu`, `dismissStatusUndo` (Issue 241); the overlay and `requestPromptIndexRefresh` placement (Issue 244); `write_task_text`, `TaskTextWriteResult`, `setDueToken`, `setPriorityToken` (Issue 122).
- Targeted checks include the source scans that read this feature: `src/tests/lib/pane-toolbar.test.ts`, `menu-item-anatomy.test.ts`, `chrome-type-scale.test.ts`, `chrome-state-styles.test.ts`, `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`, Issue 236's `tasks-palette.test.ts` (or Issue 198's `palette-classes.test.ts` once it has replaced it).
- jsdom checks bits-ui submenus only by keyboard (ArrowRight on the sub-trigger) or pointer events; use the shared `openMenu` and say in the delivery comment if a submenu needed another recipe. WebKit focus after the dialog closes is not checked by e2e (Chromium only).
- A rapid second edit before the refetch lands reads the overlaid row, so it is not refused. A Todoist sync that rewrote the line between render and write turns the write into `stale`: no data is lost.

## Comments

- 2026-11-12: created by the deep-dive split of Issue 122 (SUMMARY 122 and section 4, `dossier-122.md` sections 2-4, `cross-rust-ipc.md` F8). It takes the service, the menu items, Undo, the date dialog, the e2e test and the help text that Issue 122 used to hold; 122 keeps the Rust command and the shared token patchers. `setPriority` replaces in place; the date picker is a Dialog; the overlay carries the re-parsed `metadata`; the dirty-buffer block is shared with `setTaskStatus`; own test file on the shared fixture, allowed boundary mocks, targeted e2e spec Gate, source-scan checks.
- 2026-11-12: consistency review: `relPath` comes from `vaultRelativeKey` (the old pointer to a `setTaskStatus` precedent was wrong: `toggle_task_status` takes absolute paths); the overlay's `metadata` is named as an optional field on Issue 244's `TaskOverlayEntry`; the Answered line separates the owner's Undo decision from this plan's extension of it to Due and Priority.

- 2026-11-12: owner confirmed Undo for Due and Priority and answered 122's locator; Status ready-for-agent.
