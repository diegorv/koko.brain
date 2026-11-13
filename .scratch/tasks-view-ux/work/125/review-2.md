VERDICT: APPROVED

Re-review, round 2, of the fix commit b75580c6b (`git diff b2a269e8f..HEAD`) on branch issue/125-smart-lists-and-empty-states.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `TaskLists.svelte:53-66`: `savedCounts` filters out the active list and reads only `rows`, `globalExcludes`, `lists` (saved views), the template folder settings and `activeList`; it does not read `query`, `quick`, `groupBy`, `sort` or `visibleRows`. `activeCount` reads `visibleRows` alone. Render at line 198 picks `activeCount` for the active row and `savedCounts.get` for the rest, so every row still shows a count (the active list is never in `savedCounts`, and is never read from it). The existing count test ("No date lists only the open tasks ... the column counts each list", `TasksView.lists.test.ts:371`) still asserts `['3', '2', '1']` and the active count after the switch. No test pins the "no re-run on a keystroke" property; it is a performance claim, verified by reading the derived's dependencies. |
| 2 | minor | resolved | `TaskLists.svelte:121-127`: `afterMarkerAction` captures the marker's parent before the action, flushes, and when the marker unmounted (Svelte nulls `rootEl`, so `rootEl?.isConnected` is falsy) focuses `[data-task-sources-edit]`. The marker's parent is the `div.p-4` in `TasksView.svelte:1057`, whose first match is the sentence's Edit button (`TasksView.svelte:1069`). Reset, Save, Revert (lines 253-256) and a committed Save as view (`close` with a non-null id, line 107) go through it; Escape in the marker input still goes to `focusList(null)`, which focuses the marker's "Save as view" button, which stays mounted. Tests: `TasksView.lists.test.ts` assert `document.activeElement` is Edit after Reset (431), Save as view (465), Save (481) and Revert (498). |
| 3 | nit | rejection stands | `explainEmptyTasks` takes no active list, and the same "Every open task has a due date" state is reached on All open with Due = No date, where "Reset Due filter" is the right action. On the No date list the action leaves a "modified" marker whose Reset restores it, so nothing is lost. The review itself called it an owner call. |
| 4 | nit | resolved | `TaskLists.svelte:130-134`: a marker-only `$effect` reads `tasksStore.activeList` and clears `editing` under `untrack`. Running once on mount is harmless (`editing` starts null), and the column and menu variants are excluded, so the column's own Save view and Rename inputs are not closed by a switch. Test "picking another list closes the marker's Save as view input" (`TasksView.lists.test.ts:435`). |
| 5 | nit | resolved | `TaskLists.svelte:190,197`: the list button's `aria-describedby` is `${uid}-count-${view.id}`, set only while `hasLoaded` (when the count span exists), and the span carries that id. `uid` comes from `$props.id()`, so the column instance's ids are unique. Test at `TasksView.lists.test.ts:372-373`. |

## Acceptance criteria re-checked

- [met] `TasksView.test.ts` with real stores: selecting No date lists only open tasks without a due date, and the column count matches. Changing the grouping on "All open" shows "modified" and Reset clears it. On a saved view, Save writes the view to `settings.json` (the `plugin-fs` `writeTextFile` mock receives a `tasksView.savedViews` entry holding the new group) and Revert restores the saved query. — The fix touched the count and marker paths these tests cover; `TasksView.lists.test.ts` still holds the No date / column count, the All open grouping + Reset, and the saved view Save (`lastTasksView().savedViews[0]` with `query: { groupBy: 'priority' }`) + Revert tests, unchanged except for added focus assertions, and the file passes.
- [met] "Reset filters" on a saved view brings back that view's saved quick filters. — Not touched by the fix; "Reset filters on a saved view brings back its saved quick filters" still passes in `TasksView.lists.test.ts`.

## Findings

None open or new.

Checked for regressions: the fix diff only adds assertions to `TasksView.lists.test.ts` (no test removed or weakened); the only `TasksView.svelte` change is the `data-task-sources-edit` attribute; no new import other than `untrack`. No change to `layer-baseline.json`, `BASELINE_SIZE` or the composition roots; no `src-tauri/` change; no save, index, watcher or decoration path touched. No scope creep.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 232 files, 0 errors, 0 warnings.
- `pnpm vitest run` on `src/tests/lib/features/tasks/TasksView.lists.test.ts`, `TasksView.test.ts`, `TasksView.filters.test.ts`, `task-query.logic.test.ts`, `task-views.logic.test.ts`: exit 0, 5 files, 448 tests passed.
- The full suite is deliver's to run (the fix report notes the auto-organize flaky test fixed on main by Issue 254; deliver should confirm it after the rebase). `e2e/specs/tasks-view.spec.ts` was not run.
