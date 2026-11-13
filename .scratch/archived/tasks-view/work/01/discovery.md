# Issue 01 discovery: clicking task text opens the note at the line

## Files that change

- `src/lib/features/tasks/TasksView.svelte:200-220`: row `<div>` gains `data-task-row`; the text span's `onclick` (`:219`) calls a new `handleTextClick(e, filePath, lineNumber)` that returns early when the click ends a non-collapsed selection inside the span, else `void openNoteAt(filePath, { kind: 'line', line })`. Comment at `:215` replaced; `svelte-ignore` at `:216` kept. Import `openNoteAt` from `#lib/core/editor/open-note-at.service.js`.
- `src/tests/lib/features/tasks/TasksView.test.ts` (new): jsdom mount test.
- `help/documentation/10-tasks-and-todoist.md:107-110`: new bullet for the text click.
- `e2e/specs/tasks-view.spec.ts:51-54`: click the circle inside `[data-task-row]` with text `Ship feature A`.

## Plan

1. Test first (fails today): mount `TasksView` with real `tasksStore` / `editorStore`; mock `invoke` (`get_all_tasks_v2` returns one group for `/vault/Projects/2026-Q2.md`, task `Ship feature A` line 1; `toggle_task_status` returns an unchanged result), `@tauri-apps/api/event`, `@tauri-apps/plugin-fs` (`readTextFile` returns the note). `tasksStore.setSectionTag('')` before mount. Cases: text click opens tab and no toggle; circle click toggles with `{ path, lineNumber: 1 }`; selection-ending click does nothing; wikilink click calls `onOpenWikilink('Welcome')` only.
2. Component change, run the test green.
3. Help doc bullet and e2e spec edit.

## Prior art

- `src/tests/lib/features/collection/CollectionView.test.ts:1-30,70-91`: jsdom, `ResizeObserver` stub, Tauri mocks, `mount`/`unmount`/`flushSync`.
- `src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts:11-31`: `invoke` mock shape for `toggle_task_status` and `get_all_tasks_v2`.

## Risks

- The view loads tasks in an `$effect` calling async `buildTaskIndex`; the test must wait for microtasks (`vi.waitFor` or a few awaited ticks + `flushSync`) before querying the row.
- `onMount` calls `initTodoist()`; with no token it should do nothing beyond the mocked IPC. `invoke` returns `undefined` for unknown commands.
- jsdom `Selection.containsNode`/`addRange` support: `selectNodeContents` + `addRange` work in jsdom; `isCollapsed` and `anchorNode` are implemented.

## Defaults taken

- The handler takes the `MouseEvent` with `currentTarget` typed as `HTMLElement` (Svelte's inline handler typing) so `contains(sel.anchorNode)` type-checks.
- No change to `handleToggle` or `handleFileClick`.
