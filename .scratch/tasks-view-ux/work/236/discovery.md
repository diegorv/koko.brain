# Issue 236 discovery: a Tasks group header reads like a note

## Files that change
- `src/lib/features/tasks/tasks.logic.ts` (end): export `noteFolder(vaultPath: string | null, filePath: string)` on `vaultRelativeKey` (`#lib/utils/path.js:120`, part before the last `/`, `''` for root / outside / null vault) and `noteTaskCounts(tasks)` (`open` via `isTaskOpen`, already imported at `:2`).
- `src/lib/features/tasks/TasksView.svelte`:
  - imports (`:2-31`): `FileText`, `resolveIconForPath`, `iconColorStyle`, `IconRenderer` (as `EditorView.svelte:5,24-26`), `formatDate` from `#lib/utils/date.js`, `noteFolder`, `noteTaskCounts`.
  - `:183-190`: delete the local `formatDate`; add `modifiedTitle(ms)` returning `undefined` for 0, `'MMM D'` this year, `'MMM D, YYYY'` otherwise.
  - a `$derived` map `filePath -> noteTaskCounts(group.tasks)` over the unfiltered `tasksStore.fileTaskGroups`.
  - header `:304-318`: wrapper gets `data-task-group`; icon (fileTabIcon markup at `size-4`) outside the title button; title button `text-foreground font-medium hover:underline`, `data-task-group-title`, `title={modifiedTitle(...)}`; a min-w-0 column with the subtitle `data-task-group-subtitle` (`text-xs text-muted-foreground truncate`, only when non-empty) and the count `data-task-group-count` as one text node `{`${open} of ${total} open`}`.
  - toggle `:334`: `shrink-0 cursor-pointer p-1 -mx-1 -mb-1 -mt-0.5 rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`.
- `src/tests/lib/architecture/feature-cycle-baseline.json`: gains `"tasks -> file-icons"` (rewritten by `feature-cycle.test.ts`).
- `help/documentation/10-tasks-and-todoist.md:117`: the "Click a file name" bullet.

## Tests
- `tasks.logic.test.ts`: `describe('noteFolder')`, `describe('noteTaskCounts')` with `TASK_STATUSES`.
- `TasksView.test.ts`: new `describe('TasksView: the note header')` on `mockTaskFetch` / `mountTasksView`, `vaultStore._reset(); vaultStore.open('/vault')` / `vaultStore.close()` as in the Todoist describe (`:256-275`), `fileIconsStore.reset()` in `beforeEach`. Cases: title/subtitle/count with hide-closed on and off, root note no subtitle; FileText fallback; emoji icon after `preloadPacks(['emoji'])` + `updateFrontmatterIcon`; dates with `vi.useFakeTimers({ toFake: ['Date'] })`; circle class tokens.
- New `src/tests/lib/features/tasks/tasks-palette.test.ts` (node env, `node:fs`, like `pane-toolbar.test.ts`).

## Risks
- The count must use the unfiltered group; with hide-closed on `group.tasks` is filtered (the test rejects that).
- `resolveIconForPath` reads `fileIconsStore` reactively; `typeIconLookup` may be unset in tests (returns undefined, fallback renders).
- Two flex children: keep the title button the accessible name `group.fileName` only (e2e selectors read it).

## Defaults taken
- Layout: icon, then a column with the title row (title + count on one baseline) and the subtitle under it. Count sits after the title, muted `text-xs`.
- The date helper stays inside the component (one caller), not in `tasks.logic.ts`.
