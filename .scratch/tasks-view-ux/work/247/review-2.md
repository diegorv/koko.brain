VERDICT: APPROVED

Re-review, round 2, of the fixes in `git diff 8060dbac6..HEAD` (commit e9006c87d): `src/lib/features/tasks/TaskLists.svelte` and `src/tests/lib/features/tasks/TasksView.lists.test.ts`, plus the Resolution section of `review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `TasksView.lists.test.ts:316-335` adds folders A and B in the `list` section, removes A, asserts `tasksStore.query.exclude.folders` is `['B']` and focus is on `Remove excluded folder on this list B` inside `[data-task-excludes="list"]`. Dropping `${scope}` from the selector at `SourcesPanel.svelte:249` would match the Global section's empty folder list first and focus its input, so the test catches the regression the finding named. |
| 2 | minor | resolved | `TasksView.lists.test.ts:298-314` opens the menu trigger, picks Save view, types `Work` + Enter, and asserts the input is gone, the active view's name is `Work` and the trigger reads `List: Work`. |
| 3 | nit | resolved | `TaskLists.svelte:157` adds `data-task-save-view`; Escape on a save input calls `close(null)` (`:78`), and `focusList(null)` (`:53-56`) skips `[data-task-list]` buttons and focuses the first of the trigger or Save view button inside this rendering's `rootEl` (the column has no trigger, the menu has no Save view button). Asserted at `TasksView.lists.test.ts:175-176`. Rename-cancel and commit paths still pass a list id, as before. |
| 4 | nit | resolved | Delete calls `deleteView` (`TaskLists.svelte:66-70`), which focuses the new active list's button after `deleteTaskView`. Asserted at `TasksView.lists.test.ts:227-228`. Reviewer probe: an uncommitted copy of the test file that ran `vi.runAllTimersAsync()` after the Delete and Escape steps and asserted focus again passed (7 tests), so bits-ui's close autofocus does not move focus later in jsdom. The probe file was deleted. |

## Acceptance criteria re-checked

- [met] "+ Save view" with the name `Work` adds a `Work` row that becomes active; the written `settings.json` (the `plugin-fs` `writeTextFile` mock) holds it in `tasksView.savedViews`. — The fix changed only the Escape focus target; `TasksView.lists.test.ts` Save view test still asserts the `Work` row active and the written `savedViews` `['To list', 'Work']`, and passes.
- [met] Rename, Duplicate and Delete through the row menu change the column and the written `savedViews`. With one saved view, its Delete item is `disabled`. — Delete now routes through `deleteView`, which still calls `deleteTaskView(id)` first; the row menu test asserts the column, the written `['Inbox copy']`, the disabled Delete with one view, and the new focus, and passes.
- [met] Both renderings exist: inside `[data-task-lists="menu"]`, picking "All open" from the dropdown selects it. — Unchanged test passes; the new narrow-dropdown Save view test adds coverage of the menu rendering.
- [met] Turning a "Global" switch off changes `globalExcludes` and the list on every list; turning a "This list" switch on hides the matching tasks on the active list only, and switching lists drops it. — `SourcesPanel.svelte` unchanged by the fixes; the added This list removal test passes alongside the existing ones.

## Checks run by the reviewer

- `pnpm check`: exit 0, 232 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/TasksView.lists.test.ts src/tests/lib/features/tasks/TasksView.sources.test.ts src/tests/lib/pane-toolbar.test.ts src/tests/lib/menu-item-anatomy.test.ts src/tests/lib/chrome-state-styles.test.ts src/tests/lib/chrome-type-scale.test.ts`: exit 0, 6 files, 55 tests.
- No test was weakened or deleted: the fix diff only adds assertions and two tests. No scope creep beyond `TaskLists.svelte` and its test. No change to `layer-baseline.json`, `BASELINE_SIZE` or composition roots.
- The full vitest suite is deliver's to run. The e2e spec was not re-run: the fixes change only focus after Escape and Delete, which `e2e/specs/tasks-view.spec.ts` does not exercise.

## Findings

None open or new.
