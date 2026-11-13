VERDICT: APPROVED

Re-review of the fix round: `git diff 91f682312..HEAD` (commit 4cfe3c5c6), which changes only `src/tests/lib/features/tasks/TasksView.test.ts` and the `## Resolution` section of `review.md`. No app code changed.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `mountView(text, lineNumber = 1)` (`TasksView.test.ts:74-76`) pads `readTextFile`'s content with `lineNumber - 1` newlines and passes the same `lineNumber` to `group()` (`:31,40`). The text-click test (`:98-109`) mounts the task on line 3 and waits for `editorStore.pendingScrollPosition` to be 2, the offset of line 3 after two blank lines. A plain `openFileInEditor` or a `line: 1` jump would leave the position at null/0, so the test now distinguishes a line jump from a plain open. The other three tests use the default line 1, so the circle test's `{ path: NOTE, lineNumber: 1 }` assertion is unchanged. |
| 2 | nit | rejection stands | `TasksView.svelte:74` is exactly the guard the Issue body specifies (`sel.anchorNode` only). The original finding said no change was needed now; deferring to Issue 10 is consistent with it. |

## Acceptance criteria re-checked

- [met] Failing test first: a new `src/tests/lib/features/tasks/TasksView.test.ts` (`// @vitest-environment jsdom`, mounted with `mount`/`unmount`/`flushSync` from `svelte` the way `src/tests/lib/features/collection/CollectionView.test.ts` mounts its view, including its `ResizeObserver` stub at `:7-13` for the `ScrollArea`). Stores stay real (`tasksStore`, `editorStore`). Mock only `@tauri-apps/api/core` (`invoke`), `@tauri-apps/api/event` and `@tauri-apps/plugin-fs` (`readTextFile` returns the note's content), as that file does at `:26-28`. Before mounting, `tasksStore.setSectionTag('')` so the view calls `get_all_tasks_v2`, which returns one `FileTaskGroupV2` for `/vault/Projects/2026-Q2.md` with the task `Ship feature A` on line 1 (`status: 'todo'`, `checked: false`). Clicking the task text makes `editorStore.activeTabPath` equal that path, and `invoke` is never called with `toggle_task_status`. Fails today (the click toggles). — The text-click test now places the task on line 3 instead of line 1 to also prove the caret jump (finding 1); it still asserts `activeTabPath === NOTE` and zero `toggle_task_status` calls, mocks only the three Tauri modules, and keeps the stores real. This is a strengthening, not a weakening. My run: 4/4 pass.
- [met] Clicking the circle (`aria-label` "Mark task as done") still invokes `toggle_task_status` with `{ path: '/vault/Projects/2026-Q2.md', lineNumber: 1 }`. — Circle test still mounts with the default line 1 and asserts the same args; passes.

## Other checks

- Typecheck: `taskpolicy -c background pnpm check`: 0 errors, 0 warnings (exit 0).
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/tasks/TasksView.test.ts`: 4 passed (exit 0).
- No test deleted or weakened; no source, layer-baseline or composition-root change. Full suite and build are deliver's to run.

## Findings

None.
