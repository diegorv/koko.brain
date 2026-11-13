# file card src/lib/features/tasks/task-views.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/task-views.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/tasks/task-views.logic.ts logic L355 module src/lib/features/tasks in4 t6
## imports
imp src/lib/features/tasks/task-views.logic.ts:1 -> src/lib/features/tasks/task-query.logic.ts DEFAULT_QUICK,DEFAULT_TASK_SORT,TASK_PRIORITIES,applyQuickFilters,defaultTaskExcludes,emptyTaskExcludes,headingSources,selectSourceRows,type:DueRange,type:LifecycleState,type:PropertyOp,type:TaskExcludes,type:TaskGroupKey,type:TaskQuery,type:TaskQuickFilters,type:TaskRow,type:TaskSortKey,type:TaskSource,type:TaskSourceClause,type:TaskSourceFolders
imp src/lib/features/tasks/task-views.logic.ts:23 -> src/lib/features/tasks/task-status.logic.ts TASK_STATUSES
imp src/lib/features/tasks/task-views.logic.ts:24 -> src/lib/features/tasks/tasks.logic.ts parseSectionTags
## imported-by
imp src/lib/features/tasks/TaskLists.svelte:21 -> src/lib/features/tasks/task-views.logic.ts BUILT_IN_TASK_VIEWS,findTaskView,isBuiltInTaskView,taskViewCount
imp src/lib/features/tasks/TasksView.svelte:82 -> src/lib/features/tasks/task-views.logic.ts findTaskView
imp src/lib/features/tasks/tasks.service.ts:13 -> src/lib/features/tasks/task-views.logic.ts findTaskView,parseTasksViewState,viewQueryOf,withTasksViewState,type:SavedTaskView
imp src/lib/features/tasks/tasks.store.svelte.ts:20 -> src/lib/features/tasks/task-views.logic.ts TO_LIST_ID,mergeExcludes,toListView,type:SavedTaskView,type:TaskViewQuery
## reach
in2 src/lib/features/tasks/task-views.logic.ts 5 files in 2 modules: src/lib/app(4) src/lib/features/tasks(1)
out2 src/lib/features/tasks/task-views.logic.ts 10 files in 4 modules: src/lib/features/tasks(4) src/lib/utils(4) src/lib/features/type-definitions(1) src/lib/types(1)
## tests
test src/tests/lib/features/tasks/task-views.logic.test.ts imports src/lib/features/tasks/task-views.logic.ts mirror
test src/tests/lib/features/tasks/TasksView.lists.test.ts imports src/lib/features/tasks/task-views.logic.ts
test src/tests/lib/features/tasks/task-query.logic.test.ts imports src/lib/features/tasks/task-views.logic.ts
test src/tests/lib/features/tasks/tasks-view-settings.test.ts imports src/lib/features/tasks/task-views.logic.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/features/tasks/task-views.logic.ts
test src/tests/lib/features/tasks/tasks.store.test.ts imports src/lib/features/tasks/task-views.logic.ts
## symbols
sym src/lib/features/tasks/task-views.logic.ts:27 interface TaskViewQuery L12 | What a list (saved view or built-in) selects and how it shows it.
by src/lib/features/tasks/task-views.logic.ts:TaskViewQuery <- src/lib/features/tasks/tasks.store.svelte.ts:20 in (module) import
sym src/lib/features/tasks/task-views.logic.ts:41 interface SavedTaskView L8 | A list of the Tasks view's list column: a saved view, or a built-in one.
by src/lib/features/tasks/task-views.logic.ts:SavedTaskView <- src/lib/features/tasks/tasks.service.ts:13 in (module) import
by src/lib/features/tasks/task-views.logic.ts:SavedTaskView <- src/lib/features/tasks/tasks.store.svelte.ts:20 in (module) import
sym src/lib/features/tasks/task-views.logic.ts:51 interface TaskViewsState L8 | The part of `settings.json` `tasksView` this build writes, besides `version`.
sym src/lib/features/tasks/task-views.logic.ts:61 const ALL_OPEN_ID L1 | Reserved id of the built-in "All open" list.
sym src/lib/features/tasks/task-views.logic.ts:64 const TO_LIST_ID L1 | Fixed id of the "To list" view the migration seeds, so a reload before any write seeds the same one.
by src/lib/features/tasks/task-views.logic.ts:TO_LIST_ID <- src/lib/features/tasks/tasks.store.svelte.ts:36 in activeList ref +1
sym src/lib/features/tasks/task-views.logic.ts:67 const ALL_OPEN_VIEW: SavedTaskView L11 | The built-in "All open" list: every open task, grouped by note.
sym src/lib/features/tasks/task-views.logic.ts:80 const NO_DATE_ID L1 | Reserved id of the built-in "No date" list.
sym src/lib/features/tasks/task-views.logic.ts:86 const NO_DATE_VIEW: SavedTaskView L5 | The built-in "No date" list: "All open" with the Due filter on No date, the open tasks without a due date.
sym src/lib/features/tasks/task-views.logic.ts:93 const BUILT_IN_TASK_VIEWS: readonly SavedTaskView[] L1 | The built-in lists, in list order.
by src/lib/features/tasks/task-views.logic.ts:BUILT_IN_TASK_VIEWS <- src/lib/features/tasks/TaskLists.svelte:38 in lists=$derived ref
sym src/lib/features/tasks/task-views.logic.ts:96 fn isBuiltInTaskView(id: string): boolean L3 | Whether `id` names a built-in list, which no write ever changes.
by src/lib/features/tasks/task-views.logic.ts:isBuiltInTaskView <- src/lib/features/tasks/TaskLists.svelte:201 in (markup) markup +1
sym src/lib/features/tasks/task-views.logic.ts:106 fn taskViewCount(rows: readonly TaskRow[], query: TaskViewQuery, globalExcludes: TaskExcludes, folders: TaskSourceFolders, today: strin… L11 | How many rows the list `query` shows, dimmed parents left out: its sources and its excludes merged with `globalExcludes`, then its quick filters.
by src/lib/features/tasks/task-views.logic.ts:taskViewCount <- src/lib/features/tasks/TaskLists.svelte:61 in savedCounts=$derived call
sym src/lib/features/tasks/task-views.logic.ts:126 fn mergeExcludes(global: TaskExcludes, own: TaskExcludes): TaskExcludes L12 | The excludes a list applies: each switch on when it is on in either, each list the union of both without duplicates.
by src/lib/features/tasks/task-views.logic.ts:mergeExcludes <- src/lib/features/tasks/tasks.store.svelte.ts:69 in effectiveQuery=$derived call
sym src/lib/features/tasks/task-views.logic.ts:144 fn toListView(sectionTag: string): SavedTaskView L14 | The "To list" view the migration seeds: one heading card per tag of the legacy `sectionTag` text (`parseSectionTags`), or the `#to-list` card when it holds no …
by src/lib/features/tasks/task-views.logic.ts:toListView <- src/lib/features/tasks/tasks.store.svelte.ts:34 in savedViews call +1
sym src/lib/features/tasks/task-views.logic.ts:164 fn viewQueryOf(query: TaskQuery, groupBy: TaskGroupKey, sort: readonly TaskSortKey[]): TaskViewQuery L6 | What a saved view stores of the session: its query, grouping and sort, without `quick.search` (a restored search would hide rows behind a filter nobody typed i…
by src/lib/features/tasks/task-views.logic.ts:viewQueryOf <- src/lib/features/tasks/tasks.service.ts:175 in saveTaskView call +1
sym src/lib/features/tasks/task-views.logic.ts:172 fn findTaskView(id: string, savedViews: readonly SavedTaskView[]): SavedTaskView | undefined L3 | The saved view or built-in list with `id`, saved views first; undefined when none has it.
by src/lib/features/tasks/task-views.logic.ts:findTaskView <- src/lib/features/tasks/TaskLists.svelte:39 in activeView=$derived call
by src/lib/features/tasks/task-views.logic.ts:findTaskView <- src/lib/features/tasks/TasksView.svelte:240 in savedQuick=$derived call
by src/lib/features/tasks/task-views.logic.ts:findTaskView <- src/lib/features/tasks/tasks.service.ts:153 in loadSavedTasksView call +2
sym src/lib/features/tasks/task-views.logic.ts:313 fn parseTasksViewState(raw: unknown): { state: TaskViewsState; valid: boolean } L24 | Reads the Tasks view's saved state (`settings.json` `tasksView`, unvalidated) into fresh objects.
by src/lib/features/tasks/task-views.logic.ts:parseTasksViewState <- src/lib/features/tasks/tasks.service.ts:145 in loadSavedTasksView call
sym src/lib/features/tasks/task-views.logic.ts:345 fn withTasksViewState(raw: unknown, state: TaskViewsState): Record<string, unknown> L11 | Returns the Tasks view's saved state with `state` written into it.
by src/lib/features/tasks/task-views.logic.ts:withTasksViewState <- src/lib/features/tasks/tasks.service.ts:120 in writeTasksViewState call
## locals
local src/lib/features/tasks/task-views.logic.ts:119 fn union(a: readonly string[], b: readonly string[]) L1
local src/lib/features/tasks/task-views.logic.ts:177 fn isPlainObject(value: unknown): value is Record<string, unknown> L3
local src/lib/features/tasks/task-views.logic.ts:182 fn strings(value: unknown): string[] L1
local src/lib/features/tasks/task-views.logic.ts:185 fn oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined L3
local src/lib/features/tasks/task-views.logic.ts:190 fn someOf<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined L5
local src/lib/features/tasks/task-views.logic.ts:200 fn parseExcludes(raw: Record<string, unknown>, defaults: TaskExcludes): TaskExcludes L14
local src/lib/features/tasks/task-views.logic.ts:232 fn parseClause(raw: unknown): TaskSourceClause | null L25
local src/lib/features/tasks/task-views.logic.ts:259 fn parseSources(raw: unknown): TaskSource[] L6
local src/lib/features/tasks/task-views.logic.ts:267 fn parseQuick(raw: unknown): TaskQuickFilters L13
local src/lib/features/tasks/task-views.logic.ts:282 fn parseGroupBy(raw: unknown): TaskGroupKey L4
local src/lib/features/tasks/task-views.logic.ts:288 fn parseViewQuery(raw: unknown): TaskViewQuery L11
## calls
call src/lib/features/tasks/task-views.logic.ts:72 in ALL_OPEN_VIEW -> src/lib/features/tasks/task-query.logic.ts:emptyTaskExcludes call
call src/lib/features/tasks/task-views.logic.ts:114 in taskViewCount -> src/lib/features/tasks/task-query.logic.ts:selectSourceRows call
call src/lib/features/tasks/task-views.logic.ts:114 in taskViewCount -> src/lib/features/tasks/task-views.logic.ts:mergeExcludes call
call src/lib/features/tasks/task-views.logic.ts:115 in taskViewCount -> src/lib/features/tasks/task-query.logic.ts:applyQuickFilters call
call src/lib/features/tasks/task-views.logic.ts:132 in mergeExcludes -> src/lib/features/tasks/task-views.logic.ts:union call +3
call src/lib/features/tasks/task-views.logic.ts:145 in toListView -> src/lib/features/tasks/tasks.logic.ts:parseSectionTags call
call src/lib/features/tasks/task-views.logic.ts:150 in toListView -> src/lib/features/tasks/task-query.logic.ts:headingSources call
call src/lib/features/tasks/task-views.logic.ts:151 in toListView -> src/lib/features/tasks/task-query.logic.ts:emptyTaskExcludes call
call src/lib/features/tasks/task-views.logic.ts:208 in parseExcludes -> src/lib/features/tasks/task-views.logic.ts:strings call +3
call src/lib/features/tasks/task-views.logic.ts:233 in parseClause -> src/lib/features/tasks/task-views.logic.ts:isPlainObject call
call src/lib/features/tasks/task-views.logic.ts:245 in parseClause -> src/lib/features/tasks/task-views.logic.ts:oneOf call +1
call src/lib/features/tasks/task-views.logic.ts:262 in parseSources -> src/lib/features/tasks/task-views.logic.ts:isPlainObject call
call src/lib/features/tasks/task-views.logic.ts:263 in parseSources -> src/lib/features/tasks/task-views.logic.ts:parseClause ref
call src/lib/features/tasks/task-views.logic.ts:268 in parseQuick -> src/lib/features/tasks/task-views.logic.ts:isPlainObject call
call src/lib/features/tasks/task-views.logic.ts:269 in parseQuick -> src/lib/features/tasks/task-views.logic.ts:oneOf call +1
call src/lib/features/tasks/task-views.logic.ts:270 in parseQuick -> src/lib/features/tasks/task-views.logic.ts:someOf call +1
call src/lib/features/tasks/task-views.logic.ts:276 in parseQuick -> src/lib/features/tasks/task-views.logic.ts:strings call
call src/lib/features/tasks/task-views.logic.ts:283 in parseGroupBy -> src/lib/features/tasks/task-views.logic.ts:isPlainObject call
call src/lib/features/tasks/task-views.logic.ts:284 in parseGroupBy -> src/lib/features/tasks/task-views.logic.ts:oneOf call
call src/lib/features/tasks/task-views.logic.ts:289 in parseViewQuery -> src/lib/features/tasks/task-views.logic.ts:isPlainObject call +1
call src/lib/features/tasks/task-views.logic.ts:290 in parseViewQuery -> src/lib/features/tasks/task-views.logic.ts:strings call
call src/lib/features/tasks/task-views.logic.ts:292 in parseViewQuery -> src/lib/features/tasks/task-views.logic.ts:parseSources call
call src/lib/features/tasks/task-views.logic.ts:293 in parseViewQuery -> src/lib/features/tasks/task-query.logic.ts:emptyTaskExcludes call +1
call src/lib/features/tasks/task-views.logic.ts:293 in parseViewQuery -> src/lib/features/tasks/task-views.logic.ts:parseExcludes call
call src/lib/features/tasks/task-views.logic.ts:294 in parseViewQuery -> src/lib/features/tasks/task-views.logic.ts:parseQuick call
call src/lib/features/tasks/task-views.logic.ts:295 in parseViewQuery -> src/lib/features/tasks/task-views.logic.ts:parseGroupBy call
call src/lib/features/tasks/task-views.logic.ts:314 in parseTasksViewState -> src/lib/features/tasks/task-views.logic.ts:isPlainObject call +3
call src/lib/features/tasks/task-views.logic.ts:317 in parseTasksViewState -> src/lib/features/tasks/task-query.logic.ts:defaultTaskExcludes call +1
call src/lib/features/tasks/task-views.logic.ts:318 in parseTasksViewState -> src/lib/features/tasks/task-views.logic.ts:parseExcludes call
call src/lib/features/tasks/task-views.logic.ts:325 in parseTasksViewState -> src/lib/features/tasks/task-views.logic.ts:parseViewQuery call
call src/lib/features/tasks/task-views.logic.ts:330 in parseTasksViewState -> src/lib/features/tasks/task-views.logic.ts:toListView call
call src/lib/features/tasks/task-views.logic.ts:334 in parseTasksViewState -> src/lib/features/tasks/task-views.logic.ts:findTaskView call
call src/lib/features/tasks/task-views.logic.ts:346 in withTasksViewState -> src/lib/features/tasks/task-views.logic.ts:isPlainObject call
