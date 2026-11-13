# Issue 110 discovery: open rule, status glyphs, shared fixture

## Files that change
- `src/lib/features/tasks/task-status.logic.ts:1-9`: add `TASK_STATUSES`, `isTaskOpen`, `StatusGlyphIcon`, `StatusGlyph`, `statusGlyph` (a `Record<TaskStatus, StatusGlyph>`); `toggleTarget` uses `isTaskOpen`.
- `src/lib/features/tasks/tasks.logic.ts:17-26` (`hasUncheckedDescendants`), `:34-52` (`filterCompletedTasks`), `:91-113` (`computeTaskStats`), `:187-214` (`explainEmptyTasks` stage 2 + wording "closed" / "Show closed"): read `!isTaskOpen(task.status)` instead of `task.checked`; JSDoc says "closed".
- `src/lib/features/tasks/TasksView.svelte:157` (hide title "closed"), `:214-216` (count line "N open in M notes"), `:239-283` (row: glyph map, `data-task-toggle`, `data-task-status`, aria-label with text and word, title = word, tone class only, `data-task-text`, strike when closed).
- `src/lib/features/event-calendar/EventTaskChip.svelte:16-18`: `closed = !isTaskOpen(task.status)`; comment shrinks.
- `src/tests/lib/architecture/feature-cycle-baseline.json`: gains `event-calendar -> tasks` (written by `feature-cycle.test.ts`).
- New `src/tests/fixtures/tasks.fixture.ts`: `taskV2`, `taskGroupV2`, `sevenStatusGroup`, `mockTaskFetch`, `mountTasksView`, `openMenu`.
- Tests: `task-status.logic.test.ts`, `tasks.logic.test.ts` (new cases + drop the "checked non-done counts as completed" case, which is the old rule), `TasksView.test.ts` (move to fixture, hooks, new cases), `EventTaskLane.test.ts` (open case gains todo, question, forwarded).
- `help/documentation/10-tasks-and-todoist.md:15,37-47,104,107`.
- `e2e/specs/tasks-view.spec.ts`: closed selector, `/^Mark task as done/`, drop duplicate test, no `waitForTimeout`, new `[/]` test.

## Plan (commit order)
1. Status logic test-first (`task-status.logic.test.ts`), then implement.
2. Fixture file + `tasks.logic.test.ts` failing cases on `sevenStatusGroup()` / `taskV2`, then the logic change.
3. `TasksView.test.ts` onto `mockTaskFetch` / `mountTasksView`, new hook / label / strike / count cases (failing), then `TasksView.svelte`.
4. `EventTaskChip` refactor + lane test cases + baseline JSON.
5. Help doc. 6. e2e spec, run both Gate specs.

## Prior art
- `openMenu` recipe: `src/tests/lib/features/properties/PropertiesView.test.ts:233`.
- Mount / wait pattern: current `TasksView.test.ts` `mountView` + `until`.
- Event chip already uses `data-task-status` (`EventTaskChip.svelte:33`).

## Risks
- `mountTasksView` waits on `tasksStore.hasLoaded`; on a remount the store keeps `hasLoaded`, which is the behavior the remount test wants.
- `vi.mock('@tauri-apps/api/core')` in the test file must reach the fixture's `invoke` import: confirmed on first run.
- `stats.pending` counts open tasks via the new rule, so the count line shows N open while hide-closed is off too.

## Defaults taken
- Count line keeps `mb-4` paragraph; plural "notes" only when M != 1, "open" has no plural form.
- `mockTaskFetch` default toggle result: `{ updatedContent: '', updateResult: { changed: false, version: 1, upserted: [], removed: [], fullRescan: false }, stale: false }` (the shape the current test returns).
- The deferred-promise refetch tests pass a function to `mockTaskFetch` that counts calls.
