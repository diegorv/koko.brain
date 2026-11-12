# 124: Global excludes and saved Tasks views survive a restart, and "To list" is seeded (model, no UI)

**Origin:** `tasks-view` Issue 17, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/` ("Lists and views", "Storage", decision B1). Split on 2026-11-12 by the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` section 4, `dossier-123+124.md` section 5, `cross-persistence-sources.md`) into this Issue (124a: model, storage and migration) and Issue 247 (124b: the list column UI). The same day it absorbed Issue 123 (saving the global excludes), on the owner's approval: 123 wrote a `headingTags` field that this Issue removed again, so one Issue now writes the final shape once. Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others (030, 085, 151, 198, 204, 205 and the rest) in `.scratch/open-itens/issues/`.

**What to build:** Today only the section tags survive a restart, as the free text `tasksView.sectionTag` (Issues 243 and 245); the excludes edited in the Sources panel are lost, and one saved state could not hold "To list" next to "All open" anyway. Save the global excludes per vault, add the saved-view model, its storage under `tasksView`, the service operations, and a one-time migration that seeds a "To list" view from the saved section tags, so the vault opens on it (B1 (b): the view never defaults to every task). Issue 247 adds the list column that calls these operations; Issue 125 adds the built-in lists and the "modified" marker.

**Plumbing.** Reuse Issue 243's: `AppSettings.tasksView?: unknown` with the verbatim pass-through in `parseSettings`, `settingsStore.tasksView` and the in-place `settingsStore.updateTasksView`, and the single loader `loadSavedTasksView` that `initializeVault` calls after `loadSettings`. `core/settings` never imports a Tasks type. Add no `$effect` mirror from `tasksStore` to settings: writes happen in the service functions that apply a change, so a mirror cannot write the previous vault's state on the double-switch path. Writes mutate `settingsStore.tasksView` through `updateTasksView`, and settings persistence writes them; never call `saveSettings`, so Issue 030's guard for a never-loaded `settings.json` applies. No new `writeTextFile` site. One pure writer, `withTasksViewState(raw, state)`, keeps every unknown key and a numeric `version` (else `1`).

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
- The panel's existing Excludes section (Issue 245) edits `globalExcludes` through `setTaskExcludes` (below), which writes `tasksStore.globalExcludes`, not `query.exclude`. A view's own `exclude` has no editor until Issue 247.

**Session state and edits.** Selecting a list copies its query into the session (`tasksStore.query` plus `groupBy` and `sort`). Any edit changes the session only. Switching lists drops the edit. Nothing writes a saved view except Save view, rename, duplicate and delete. After this Issue `setTaskSources` writes nothing: Issue 245's write-back of the heading cards into `tasksView.sectionTag` goes away, and the saved views hold the cards.

**Service operations** (`tasks.service.ts`; each mutates the store and writes `tasksView` through `settingsStore.updateTasksView`, never `saveSettings`):
- `selectTaskList(id)`: sets `activeList` and the session query, and writes `activeList`, so a restart reopens the last list.
- `saveTaskView(name)`: stores the session query under a trimmed, non-empty name with a new id (`crypto.randomUUID()`, generated in the service, not in the logic), and makes it the active list.
- `renameTaskView(id, name)`: trimmed, non-empty.
- `duplicateTaskView(id)`: a copy named `<name> copy`, placed after the original.
- `deleteTaskView(id)`: removes it; deleting the active view selects the first remaining saved view. Deleting the last saved view is refused (owner Q4) and returns `false` with no change.
- `setTaskExcludes(exclude: TaskExcludes)`: sets `tasksStore.globalExcludes` and writes `globalExcludes`. The panel's exclude switches and lists call it.

**Load and migration** (`loadSavedTasksView`, Issue 243's single load point, extended; it never writes settings):
- When `tasksView.savedViews` is missing, seed one saved view named "To list" with the fixed id `to-list`: `headingSources` of `parseSectionTags` of the saved `sectionTag` (Issues 243 and 245), or the `#to-list` card when it gives no tag (owner Q1); own excludes empty; quick, `groupBy` and sort at their defaults. `activeList` becomes `to-list`. Seeding needs no snapshot read, whatever the notes hold.
- The fixed id makes a reload before any write seed the same view. The first write stores `savedViews` and `globalExcludes` and removes the legacy `sectionTag` key (and a `headingTags` or `query` key a hand edit may have left), keeping any other unknown key. Until that write the legacy key is read and left on disk. A present `savedViews`, even `[]`, never seeds again.
- **Fallback:** an `activeList` that names no saved view and no built-in opens the first saved view; only with no saved view at all (a hand-edited `savedViews: []`) does it open "All open".
- **Invalid values**, as Issue 243 does for `sectionTag`: a `tasksView` that is not a plain object, or a `globalExcludes` or `savedViews` of the wrong kind, logs with the tag `'TASKS'`, toasts once, and falls back to the defaults plus the seed, and the bytes stay until the next write. Inside a valid `globalExcludes`, a field of the wrong type falls back to its own default with no toast (each switch to `true`, each list to `[]`, non-string list entries dropped). A `savedViews` entry that is not an object, or has no string `id` and `name`, is dropped with no toast; its fields fall back one by one. `version` is not checked.

**Behavior change:** after this Issue an edited heading card or exclude on a list does not survive a restart unless it is saved as a view (Issue 126 adds Save on a modified view). The global excludes still do. The help doc says so.

- `help/documentation/10-tasks-and-todoist.md`: the vault opens on "To list", seeded from the saved section tags; "All open" lists every open task; edits to a list last until a list switch or a restart. Issue 247 documents the column.

**Blocked by:** 245, 117

**Status:** ready-for-agent

**Answered:** PRD B1, revised on 2026-11-12 from (a) to (b): the vault opens on the seeded "To list" view, never on every task (owner). The 2026-11-06 answer (a) is superseded. Owner, 2026-11-12: Q1, `#to-list` stays the default and a saved empty section filter is not restored; Q3, only the global excludes and the saved views are stored, and "To list" is seeded from the saved section tags; the merge of Issue 123 into this Issue (owner, 2026-11-12); Q4, deleting the last saved view is not allowed (the plan's default; the owner can override it at review); the split into this Issue (model and migration) and Issue 247 (list column UI).

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` because the default query moves into the seeded view and the default excludes move to `globalExcludes`. relay-lite's configured checks do not run e2e: the build step runs this spec before its last commit and reports its pass count, and the reviewer runs it again as a probe and cites the result. Do not run the whole e2e suite. Targeted checks include `src/tests/lib/core/settings/`, `src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts`, `src/tests/lib/features/tasks/tasks-view-settings.test.ts` and `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts`.

Tests use Issue 243's harness in `tasks-view-settings.test.ts` (real settings and Tasks stores and loader under jsdom with fake timers; mocks only for `@tauri-apps/plugin-fs`, `invoke`, `svelte-sonner`, `theme.service`, and `#lib/utils/debug.js` or a `console.error` spy).

**Tests that change on purpose:** Issue 245's write-back cases (`setTaskSources` no longer writes `sectionTag`); the `tasks.store.test.ts` default-query and `reset()` cases (excludes move to `globalExcludes`); Issue 116's exclude cases that set `query.exclude` directly.

- [ ] Failing test first: a vault with no `savedViews` (whatever its notes hold) gets a "To list" view after load, and `activeList` is `to-list`. A saved `sectionTag: '#to-list #work'` seeds both heading cards; nothing saved, or `sectionTag: ''`, seeds the `#to-list` card. After a write and a reload, exactly one "To list" exists. Fails today (no `savedViews`).
- [ ] Save, rename, duplicate and delete round-trip through `settings.json`: perform each, advance the persistence debounce, reload the written JSON into reset stores, compare. The migrating write has no `headingTags`, `sectionTag` or `query` key and keeps an unknown key.
- [ ] Deleting the last saved view returns `false` and leaves `savedViews` unchanged. A hand-edited `savedViews: []` does not seed and opens "All open". An unknown `activeList` opens the first saved view.
- [ ] `mergeExcludes`: a global `archived: true` with an own `false` stays `true`; folder lists unite without duplicates. Through `tasksStore.visibleRows`, a view exclude adds a folder and never brings back an archived note's task.
- [ ] Switching from an edited list to another and back restores the saved query, and the saved view is unchanged on disk.
- [ ] `saveTaskView` drops `quick.search` from the stored query.
- [ ] `setTaskExcludes` with the templates switch off: after the persistence debounce the written `tasksView` holds `globalExcludes.templatesFolder: false`, keeps an unknown key, and has no `sectionTag`; a fresh load restores it in `tasksStore.globalExcludes`.
- [ ] `tasksView: 42` and `globalExcludes: 5` load the defaults plus the seed, log once, toast once, and every `writeTextFile` payload carries the value unchanged until the next write. `globalExcludes: { archived: 'x' }` loads `archived: true` with no toast.
- [ ] A folder card, a quick filter and a `groupBy` change on a list leave `settingsStore.tasksView` unchanged.
- [ ] Loading vault C (no `tasksView`) while the store still holds vault B's state, without `resetTasks()` in between (the double-switch path), gives the defaults and the seed.
- [ ] Issue 030's protected session: after a load where `readTextFile` rejects, `setTaskExcludes` and `saveTaskView` leave `settings.json` unwritten for the rest of the session.
- [ ] A restart reopens the last selected list.
- [ ] The e2e spec passes: the fixture vault opens on "To list", whose `#to-list` card lists no fixture task, and the spec's Clear clicks still list them.
- [ ] `layer-rules.test.ts` stays green with no new baseline entry.

## Notes

- **Size:** M to L (Issue 123 merged in). The list column, the row menu and the "Global" section of the panel are Issue 247; the built-in lists and the "modified" marker are Issue 125.
- Issue 030 (open-itens), which guards a never-loaded `settings.json`, is done (2026-11-12), so this Issue has no Waits on line.
- Run in series with the other Tasks view Issues; launch it only by number.

## Comments

- 2026-11-12: the owner kept the `#to-list` default and revised B1 to (b): the vault opens on "To list", seeded from the saved section tags. Two criteria about removing the `#to-list` store default and the e2e section-tag clearing were dropped: the default does not change. Bare Issue numbers in this text used the tasks-view numbering (Issue 12 is 115, Issue 16 is 123, Issue 29 is 126).
- 2026-11-12: split and revised by the deep dive (SUMMARY 124 and section 4; cross-persistence M1, M3, M4, M5, L5) and the owner's Q1, Q3 and Q4. This Issue keeps the model, storage, service operations and migration; the list column UI moved to Issue 247. The seed comes from Issue 123's heading tags or the legacy `sectionTag`, else the `#to-list` card, with a fixed id and no snapshot read; the disk shape and a view's `exclude` (adds only) are pinned; the active-list fallback, the refused last-view delete and `savedViews: []` never re-seeding are specified; the behavior change for unsaved edits is stated. Numbers in this text are now open-itens numbers.

- 2026-11-12: main session, after the consistency review: `setTaskExcludes` is spelled out: it writes `tasksStore.globalExcludes`.

- 2026-11-12: main session: Issue 123 merged in on the owner's approval. The global excludes, `setTaskExcludes`, the plumbing, the invalid-value rule and the protected-session and double-switch criteria came from 123; its intermediate `headingTags` field is gone, and the seed reads the saved `sectionTag` directly. Blocked by 245 and 117, as 123 was.
