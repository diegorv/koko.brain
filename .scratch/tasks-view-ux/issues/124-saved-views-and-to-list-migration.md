# 124: Saved Tasks views and the "To list" migration (model, no UI)

**Origin:** `tasks-view` Issue 17, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/` ("Lists and views", "Storage", decision B1). Split on 2026-11-12 by the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` section 4, `dossier-123+124.md` section 5, `cross-persistence-sources.md`) into this Issue (124a: model, storage and migration) and Issue 247 (124b: the list column UI). Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others (030, 085, 151, 198, 204, 205 and the rest) in `.scratch/open-itens/issues/`.

**What to build:** One saved state (Issue 123: global excludes and heading tags) cannot hold "To list" next to "All open". Add the saved-view model, its storage under `tasksView`, the service operations, and a one-time migration that seeds a "To list" view, so the vault opens on it (B1 (b): the view never defaults to every task). Issue 247 adds the list column that calls these operations; Issue 126 adds the "modified" marker.

**Model** (pure, in a new `src/lib/features/tasks/task-views.logic.ts`, or `task-query.logic.ts` if it stays small):

```ts
interface TaskViewQuery { sources: TaskSource[]; exclude: TaskExcludes; quick: TaskQuickFilters; groupBy: TaskGroupKey; sort: TaskSortKey[] }
interface SavedTaskView { id: string; name: string; query: TaskViewQuery }
// on disk: { version: 1, activeList: string, globalExcludes: TaskExcludes, savedViews: SavedTaskView[] }
```

- `TaskSource` and `TaskExcludes` are Issue 116's types, `TaskQuickFilters` Issue 111's, `TaskGroupKey` and `TaskSortKey` Issue 112's.
- A view's `exclude` only adds to `globalExcludes`: its switches default to off and its lists to empty (`emptyTaskExcludes()`). `mergeExcludes(global, own)` ORs each switch and unions each list without duplicates; it never removes a global exclude.
- `quick.search` is not stored in a view, on save or on read: a restored search would hide rows behind a filter nobody typed in this session.
- **Built-in "All open"**: a code constant with the reserved id `all-open`: no sources, empty own excludes, `DEFAULT_QUICK` (open tasks), `groupBy: 'note'`, the default sort. It is never written to disk. Issue 125 adds more built-ins next to it.

**Store** (`tasksStore`): `globalExcludes` (default `defaultTaskExcludes()`), `savedViews` and `activeList`. `query.exclude` becomes the active list's own exclude. The `visibleRows` derived passes `mergeExcludes(globalExcludes, query.exclude)` to `selectSourceRows`. `reset()` restores every new field. Each new computed getter gets a test (ADR-0034).
- The panel's existing Excludes section (Issue 245) edits `globalExcludes` through Issue 123's `setTaskExcludes`, which now writes `tasksStore.globalExcludes` instead of `query.exclude`. A view's own `exclude` has no editor until Issue 247.

**Session state and edits.** Selecting a list copies its query into the session (`tasksStore.query` plus `groupBy` and `sort`). Any edit changes the session only. Switching lists drops the edit. Nothing writes a saved view except Save view, rename, duplicate and delete. This replaces Issue 123's save of the heading tags: after this Issue `setTaskSources` writes nothing.

**Service operations** (`tasks.service.ts`; each mutates the store and writes `tasksView` through `settingsStore.updateTasksView`, never `saveSettings`):
- `selectTaskList(id)`: sets `activeList` and the session query, and writes `activeList`, so a restart reopens the last list.
- `saveTaskView(name)`: stores the session query under a trimmed, non-empty name with a new id (`crypto.randomUUID()`, generated in the service, not in the logic), and makes it the active list.
- `renameTaskView(id, name)`: trimmed, non-empty.
- `duplicateTaskView(id)`: a copy named `<name> copy`, placed after the original.
- `deleteTaskView(id)`: removes it; deleting the active view selects the first remaining saved view. Deleting the last saved view is refused (owner Q4) and returns `false` with no change.
- Issue 123's `setTaskExcludes` writes `globalExcludes`, as before.

**Load and migration** (`loadSavedTasksView`, Issue 243's single load point, extended; it never writes settings):
- When `tasksView.savedViews` is missing, seed one saved view named "To list" with the fixed id `to-list`: `headingSources` of Issue 123's `headingTags` (or of `parseSectionTags` of a legacy `sectionTag`), or the `#to-list` card when there are none; own excludes empty; quick, `groupBy` and sort at their defaults. `activeList` becomes `to-list`. Seeding needs no snapshot read, whatever the notes hold.
- The fixed id makes a reload before any write seed the same view. The first write stores `savedViews` and removes the legacy `headingTags`, `sectionTag` and `query` keys, keeping any other unknown key. A present `savedViews`, even `[]`, never seeds again.
- **Fallback:** an `activeList` that names no saved view and no built-in opens the first saved view; only with no saved view at all (a hand-edited `savedViews: []`) does it open "All open".
- **Invalid values** follow Issue 123's rule: a `tasksView`, `globalExcludes` or `savedViews` of the wrong kind logs, toasts, and falls back to the defaults plus the seed, and the bytes stay until the next write. A `savedViews` entry that is not an object, or has no string `id` and `name`, is dropped with no toast; its fields fall back one by one. `version` is not checked.

**Behavior change:** after this Issue an edited heading card or exclude on a list does not survive a restart unless it is saved as a view (Issue 126 adds Save on a modified view). The global excludes still do. The help doc says so.

- `help/documentation/10-tasks-and-todoist.md`: the vault opens on "To list", seeded from the saved section tags; "All open" lists every open task; edits to a list last until a list switch or a restart. Issue 247 documents the column.

**Blocked by:** 123

**Status:** ready-for-agent

**Answered:** PRD B1, revised on 2026-11-12 from (a) to (b): the vault opens on the seeded "To list" view, never on every task (owner). The 2026-11-06 answer (a) is superseded. Owner, 2026-11-12: Q1, `#to-list` stays the default and a saved empty section filter is not restored; Q3, Issue 123 saves only the global excludes and the saved section tags, and this Issue seeds "To list" from them; Q4, deleting the last saved view is not allowed (the plan's default; the owner can override it at review); the split into this Issue (model and migration) and Issue 247 (list column UI).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` because the default query moves into the seeded view and the default excludes move to `globalExcludes`. relay-lite's configured checks do not run e2e: the build step runs this spec before its last commit and reports its pass count, and the reviewer runs it again as a probe and cites the result. Do not run the whole e2e suite. Targeted checks include `src/tests/lib/core/settings/`, `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`, `src/tests/lib/features/tasks/tasks-view-settings.test.ts` and `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`.

Tests use Issue 243's harness in `tasks-view-settings.test.ts` (real settings and Tasks stores and loader under jsdom with fake timers; mocks only for `@tauri-apps/plugin-fs`, `invoke`, `svelte-sonner`, `theme.service`, and `#lib/utils/debug.js` or a `console.error` spy).

**Tests that change on purpose:** Issue 123's and 245's write-back cases (the heading tags are no longer written by `setTaskSources`); the `tasks.store.test.ts` default-query and `reset()` cases (excludes move to `globalExcludes`); Issue 116's exclude cases that set `query.exclude` directly.

- [ ] Failing test first: a vault with no `savedViews` (whatever its notes hold) gets a "To list" view after load, and `activeList` is `to-list`. `headingTags: ['#to-list', '#work']` seeds both heading cards; a legacy `sectionTag: '#to-list #work'` seeds the same; nothing saved seeds the `#to-list` card. After a write and a reload, exactly one "To list" exists. Fails today (no `savedViews`).
- [ ] Save, rename, duplicate and delete round-trip through `settings.json`: perform each, advance the persistence debounce, reload the written JSON into reset stores, compare. The migrating write has no `headingTags`, `sectionTag` or `query` key and keeps an unknown key.
- [ ] Deleting the last saved view returns `false` and leaves `savedViews` unchanged. A hand-edited `savedViews: []` does not seed and opens "All open". An unknown `activeList` opens the first saved view.
- [ ] `mergeExcludes`: a global `archived: true` with an own `false` stays `true`; folder lists unite without duplicates. Through `tasksStore.visibleRows`, a view exclude adds a folder and never brings back an archived note's task.
- [ ] Switching from an edited list to another and back restores the saved query, and the saved view is unchanged on disk.
- [ ] `saveTaskView` drops `quick.search` from the stored query.
- [ ] A restart reopens the last selected list.
- [ ] The e2e spec passes: the fixture vault opens on "To list", whose `#to-list` card lists no fixture task, and the spec's Clear clicks still list them.
- [ ] `layer-rules.test.ts` stays green with no new baseline entry.

## Notes

- **Size:** M. The list column, the row menu and the "Global" section of the panel are Issue 247; the "modified" marker is Issue 126.
- Run in series with the other Tasks view Issues; launch it only by number.

## Comments

- 2026-11-12: the owner kept the `#to-list` default and revised B1 to (b): the vault opens on "To list", seeded from the saved section tags. Two criteria about removing the `#to-list` store default and the e2e section-tag clearing were dropped: the default does not change. Bare Issue numbers in this text used the tasks-view numbering (Issue 12 is 115, Issue 16 is 123, Issue 29 is 126).
- 2026-11-12: split and revised by the deep dive (SUMMARY 124 and section 4; cross-persistence M1, M3, M4, M5, L5) and the owner's Q1, Q3 and Q4. This Issue keeps the model, storage, service operations and migration; the list column UI moved to Issue 247. The seed comes from Issue 123's heading tags or the legacy `sectionTag`, else the `#to-list` card, with a fixed id and no snapshot read; the disk shape and a view's `exclude` (adds only) are pinned; the active-list fallback, the refused last-view delete and `savedViews: []` never re-seeding are specified; the behavior change for unsaved edits is stated. Numbers in this text are now open-itens numbers.

- 2026-11-12: main session, after the consistency review: `setTaskExcludes` is spelled out: it writes `tasksStore.globalExcludes`.
