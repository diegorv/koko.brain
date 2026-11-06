# 01: Clicking task text opens the note at the line

**What to build:** Clicking the text of a task toggles it on disk today (`src/lib/features/tasks/TasksView.svelte:215-220`), so selecting text or clicking to read a task flips its checkbox. Only the circle button (`:204-214`) should toggle. Clicking the text opens the note at the task's line, the way the calendar chip does (`EventTaskChip.svelte:34`, `openNoteAt(path, { kind: 'line', line })` from `src/lib/core/editor/open-note-at.service.ts:35`).

- Replace the span's `onclick` at `TasksView.svelte:219` with a handler that calls `void openNoteAt(group.filePath, { kind: 'line', line: task.lineNumber })`. Import `openNoteAt` from `#lib/core/editor/open-note-at.service.js`. `handleFileClick` (`:62-64`, the file header) stays as it is.
- The handler returns without doing anything when the click ends a text selection inside the span: `const sel = window.getSelection(); if (sel && !sel.isCollapsed && e.currentTarget.contains(sel.anchorNode)) return;`. Selecting text to copy it then does not navigate.
- Wikilinks and URLs inside the text keep their own click and `stopPropagation` (`:225-237`).
- Replace the comment at `:215` with: `<!-- Clicking the text opens the note at the task's line; only the circle toggles. -->`. Keep the `svelte-ignore` line at `:216`; Issue 10 reworks the row's a11y.
- PRD assumption A1.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because `e2e/specs/tasks-view.spec.ts` changes.

- [ ] Failing test first: a new `src/tests/lib/features/tasks/TasksView.test.ts` (`// @vitest-environment jsdom`, mounted with `mount`/`unmount`/`flushSync` from `svelte` the way `src/tests/lib/features/collection/CollectionView.test.ts` mounts its view, including its `ResizeObserver` stub at `:7-13` for the `ScrollArea`). Stores stay real (`tasksStore`, `editorStore`). Mock only `@tauri-apps/api/core` (`invoke`), `@tauri-apps/api/event` and `@tauri-apps/plugin-fs` (`readTextFile` returns the note's content), as that file does at `:26-28`. Before mounting, `tasksStore.setSectionTag('')` so the view calls `get_all_tasks_v2`, which returns one `FileTaskGroupV2` for `/vault/Projects/2026-Q2.md` with the task `Ship feature A` on line 1 (`status: 'todo'`, `checked: false`). Clicking the task text makes `editorStore.activeTabPath` equal that path, and `invoke` is never called with `toggle_task_status`. Fails today (the click toggles).
- [ ] Clicking the circle (`aria-label` "Mark task as done") still invokes `toggle_task_status` with `{ path: '/vault/Projects/2026-Q2.md', lineNumber: 1 }`.
- [ ] A click that ends a text selection inside the text (select the span's contents with `document.createRange().selectNodeContents(span)` and `window.getSelection().addRange(range)` before the click) opens no tab and invokes no `toggle_task_status`.
- [ ] Clicking a wikilink inside the text (task text `see [[Welcome]]`) calls `onOpenWikilink('Welcome')`, opens no tab for the task's note, and invokes no `toggle_task_status`.
- [ ] `help/documentation/10-tasks-and-todoist.md` "Interacting with Tasks" (`:107-110`) gains a bullet: clicking the task text opens the note at the task's line, and selecting text does nothing (PRD A12).
- [ ] `e2e/specs/tasks-view.spec.ts:51-54` ("toggling a task persists the checked state") clicks the circle in the row instead of the text: the row gets a `data-task-row` attribute in this Issue (Issue 10 reuses it), and the spec uses `page.locator('[data-task-row]', { hasText: 'Ship feature A' }).getByRole('button', { name: 'Mark task as done' })`, so later Issues that wrap the text (05's meta line, 08's breadcrumb) do not break it. The comment at `:51` says the circle is clicked, and the test still asserts `- [x] Ship feature A` on disk.

## Notes

- **Size:** S.
- Issue 05 adds the status word to the circle's label (`Mark task as done (todo)`); Playwright's `name` match is a substring by default, so the e2e locator above keeps working.
