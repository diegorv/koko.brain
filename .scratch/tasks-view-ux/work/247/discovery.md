# 247 discovery: list column, Save view, row menu, narrow dropdown, Global / This list excludes

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. Issue 124 (work/124) landed every service call the Issue names, unchanged: `selectTaskList`, `saveTaskView` (returns id or null), `renameTaskView`/`deleteTaskView` (boolean), `duplicateTaskView`, `setTaskExcludes` (`tasks.service.ts:157-225`); store getters `savedViews`, `activeList`, `globalExcludes` (`tasks.store.svelte.ts:118-122`). `tasks-palette.test.ts` does not exist on main, so it is not run.

## Files that change
- `src/lib/features/tasks/TaskLists.svelte` (new): one component, `variant: 'column' | 'menu'`. Column (`data-task-lists="column"`, `@max-[720px]:hidden`): "All open" (`ALL_OPEN_VIEW`) then `savedViews`, each a button with `aria-current="true"` when active, calling `selectTaskList`; a row `DropdownMenu` on saved views (Rename, Duplicate, Delete `disabled` while one saved view is left); "+ Save view" with the inline name input. Menu (`data-task-lists="menu"`, `hidden @max-[720px]:flex`): a DropdownMenu whose RadioGroup picks a list, plus a Save view item opening the same inline input.
- `TasksView.svelte:1045-1145`: ScrollArea wrapped in a `flex min-h-0 flex-1` row with the column at its left; the menu rendering goes first in the scroll content, above the rule sentence (`:1054`).
- `SourcesPanel.svelte:53-67,73,220-241,413-474`: the Excludes section becomes a snippet rendered twice: "Global" (`data-task-excludes="global"`, reads `globalExcludes`, writes `setTaskExcludes`) and "This list" (`data-task-excludes="list"`, reads `tasksStore.query.exclude`, writes `tasksStore.setExclude`). Drafts and `removeEntry` refocus scoped per section.
- `e2e/specs/tasks-view.spec.ts`: opening test asserts the "To list" card is active and lists no fixture task; new test picks "All open" in the column.
- `help/documentation/10-tasks-and-todoist.md` Lists and Sources sections.

## Plan (commits)
1. discovery.md.
2. Failing `TasksView.lists.test.ts` (column, All open, active marker), then `TaskLists.svelte` + TasksView layout.
3. Save view, row menu (Rename, Duplicate, Delete), narrow menu tests + code.
4. Global / This list exclude sections + tests.
5. e2e spec, run `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`.
6. Help doc.

## Prior art
- `tasks-view-settings.test.ts:1-120` harness (`openVault`, `payloads`, `settle`, fake timers) for the written `settings.json`; `TasksView.sources.test.ts` `named`/`only` helpers and `openMenu`; `TasksView.test.ts:37` `noteUnder` for a task under `## Inbox #to-list`.
- Issue 239 (work/239) for the both-renderings-in-the-DOM container-query pattern.

## Defaults taken
- "This list" controls keep the Global labels with a suffix (`Archived notes on this list`, `Excluded folder on this list`), so every accessible name stays unique and the existing Global-labelled tests and `openSources('excludes')` (first `[data-task-excludes] [role="switch"]`, the Global one) are unchanged.
- The narrow dropdown picks a list and offers Save view; Rename, Duplicate and Delete stay in the column's row menus (the owner widens the pane for them).
- Clicking the active list calls `selectTaskList` again, which drops the session edit (the Issue says a click calls it; the "modified" marker is Issue 126).
- The name input: Enter commits, Escape cancels, blur does nothing; after a commit or cancel focus goes to that list's button.
- Row menu trigger: `aria-label="List actions: <name>"`, shown on row hover or focus (`group-focus-within`, chrome-state-styles).

## Risks
- Duplicate accessible names between the column and the menu trigger text: tests scope by `data-task-lists`.
- The column and the 720 px switch were not checked by eye (relay agents cannot run the app).
