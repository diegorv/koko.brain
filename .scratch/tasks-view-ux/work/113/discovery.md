# 113 discovery: keyboard navigation and accessible rows

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec.

## Files that change

- `src/lib/features/tasks/tasks-keys.logic.ts` (new): `resolveTaskKey`, `nextCurrentRow`, `tabStopRow`, plus `taskRowKey(filePath, lineNumber)` so the view builds `<filePath>:<lineNumber>` in one place.
- `src/lib/features/tasks/tasks.types.ts:29`: add `TaskRowRef`.
- `src/lib/features/tasks/tasks.store.svelte.ts:16,52,69`: `currentRow` state (`$state.raw`), getter, `setCurrentRow` (copies the fields, no-op when equal), cleared in `reset()`.
- `src/lib/features/tasks/TasksView.svelte`:
  - script: `order` (keys of `notes` flattened, DOM order; `rowsByNote` keeps `visibleRows` order since rows come per note), `currentKey`, `tabStopKey = tabStopRow(order, order, currentKey)`; `handleListKeydown`, `handleListFocusin`; an order-change effect (`nextCurrentRow` against a plain `prevOrder`, focus follow under the guard); a once-per-mount focus-on-open effect.
  - markup :357 root gets `bind:this`; :534 `space-y-6` div becomes the list container (`bind:this`, `onkeydown`, `onfocusin`, svelte-ignore); :566 `role="list"` + `aria-label={note.noteTitle}`; :574 row gets `role="listitem"`, `data-task-key`, roving `tabindex`, NoteRow focus ring; circle :579, wikilink :604, URL :609 get roving `tabindex`.
- `src/lib/app/commands.ts:204`: `tasks:status-filter` after `tasks:toggle`; imports `tasksStore` and `openTasksTab`.
- Docs: `help/documentation/10-tasks-and-todoist.md` (Interacting with Tasks), `20-keyboard-shortcuts.md` (`## Tasks` after `## Calendar`'s table; command in "Commands Without Shortcuts").
- e2e: `e2e/specs/tasks-view.spec.ts` Space-on-circle test after the existing toggle test.

## Tests

- `src/tests/lib/features/tasks/tasks-keys.logic.test.ts` (new, pure).
- `src/tests/lib/features/tasks/TasksView.keyboard.test.ts` (new): copy the mock header, `beforeEach` and `until`/`settle` helpers of `TasksView.filters.test.ts`; `mockTaskFetch` with a function for the stateful/deferred cases.
- `tasks.store.test.ts`, `commands.new-commands.test.ts` (real tasks service), `commands.test.ts` count 44 -> 45.

## Plan (commits)

1. logic + test (red then green). 2. store + type + test. 3. view + keyboard tests. 4. palette command + tests. 5. docs + e2e.

## Risks / defaults taken

- jsdom `focusin` on `.focus()` and `activeElement` falling back to `<body>` when the focused row is removed: verified by the component tests.
- Effects order: the order-change effect is declared before focus-on-open, so on mount `prevOrder` is seeded first and focus-on-open reads the kept current row.
- Row lookup by key scans `[data-task-row]` and compares `dataset.taskKey` (no `CSS.escape` needed for paths with quotes).
- The palette action writes the value its label names (computed when the list is built), so label and effect always agree.
- The view-root guard is kept as written even though the root is not focusable today.
