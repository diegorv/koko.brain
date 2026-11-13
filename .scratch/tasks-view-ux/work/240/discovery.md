# 240 discovery: collapse groups and the 50-row cap

No `spec.md` in `.scratch/tasks-view-ux/`; the Issue is the spec. Builds on the landed 112 (groups) and 113 (keys) code; see `work/112`, `work/113`.

## Files that change

- `src/lib/features/tasks/task-query.logic.ts` (~308): add `GROUP_ROW_CAP = 50` and `collapseKey(groupBy, key)` = `` `${groupBy}:${key}` ``.
- `src/lib/features/tasks/tasks-keys.logic.ts:86-98`: `tabStopRow` gets the hidden-current fallback (first rendered row after it in `order`, else the last rendered row, else null). Current null or absent from `order` keeps 113's result (`rendered[0] ?? null`).
- `src/lib/features/tasks/tasks.store.svelte.ts:50,88,116`: `collapsedGroups` `$state.raw<ReadonlySet<string>>`, getter, `toggleGroupCollapsed` (replaces the set), cleared by `reset()`.
- `src/lib/features/tasks/TasksView.svelte`:
  - `:293-302`: a `shownRows(group)` view of each group (empty when collapsed, `slice(0, GROUP_ROW_CAP)` unless the group is in the view-local `$state.raw` `revealed` set); `rendered` = keys of shown rows; `tabStopKey = tabStopRow(rendered, order, currentKey)`. `order` stays every row of `tasksStore.groups`.
  - `:370-388` focus-follow: both focus calls read `tabStopRow(rendered, next, ...)`. The effect still tracks only `order`, so a collapse (no change to `order`) never runs it and never moves focus.
  - `:390-401` focus on open: the tab-stop row, else (no row rendered) the first group's chevron.
  - `:486-522` `groupHeader`: a chevron button first in both header kinds (FilesNavigator recipe: `ChevronRight`, `rotate-90` when open, `transition-transform`, `aria-expanded`, `Collapse/Expand <label>`), theme tokens only.
  - `:819-828`: rows `{#each}` over the shown rows inside `{#if !collapsed}`; `Show N more` button after the `role="list"` container; its click adds the key to `revealed`, `flushSync()`, then focuses row 51.
- `help/documentation/10-tasks-and-todoist.md:123-140`: collapse and cap sentences.

## Tests

- New `src/tests/lib/features/tasks/TasksView.collapse.test.ts`, setup copied from `TasksView.keyboard.test.ts` (`mockTaskFetch`, `mountTasksView`, real stores, `vaultStore.open('/vault')`, stateful toggle fixture for the Open filter case). Notes `/vault/A.md`, `/vault/B.md`, `/vault/C.md`; `buildTaskIndex` sorts notes by path (tasks.service.ts:103), so case (b) puts B at `/vault/Z/B.md` (label still `B`).
- `tasks-keys.logic.test.ts:103-121` tabStopRow cases; `task-query.logic.test.ts` collapseKey; `tasks.store.test.ts` collapsedGroups.
- `TasksView.grouping.test.ts:152`: "no `svg` in a bucket header" becomes "no file icon in a bucket header" (every `svg` in the header sits in the chevron button). Named in the commit.

## Risks and defaults

1. Focus-follow's `chosen === current` branch (focused element recreated) now focuses `tabStopRow(...)` instead of `rowElement(current)`; identical while the current row is rendered. Default taken because the Issue says the focus-follow reads the one result.
2. `revealed` keys use `collapseKey`, so a revealed group under one grouping does not reveal the same raw key under another.
3. `Show N more` uses `flushSync()` inside the click handler so row 51 exists before `focus()`.
