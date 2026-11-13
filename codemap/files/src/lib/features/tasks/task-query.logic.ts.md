# file card src/lib/features/tasks/task-query.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/task-query.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/tasks/task-query.logic.ts logic L1508 module src/lib/features/tasks in6 t9
## imports
imp src/lib/features/tasks/task-query.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/tasks/task-query.logic.ts:2 -> src/lib/utils/date.ts formatDateWithOffset
imp src/lib/features/tasks/task-query.logic.ts:3 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/tasks/task-query.logic.ts:4 -> src/lib/utils/tag-extraction.ts findInlineTags
imp src/lib/features/tasks/task-query.logic.ts:5 -> src/lib/features/type-definitions/inbox-workflow.logic.ts isInboxEntry
imp src/lib/features/tasks/task-query.logic.ts:6 -> src/lib/features/tasks/task-headings.logic.ts headingChains,matchesHeading,type:HeadingMatchMode
imp src/lib/features/tasks/task-query.logic.ts:7 -> src/lib/features/tasks/task-status.logic.ts TASK_STATUSES,isTaskOpen,statusGlyph
imp src/lib/features/tasks/task-query.logic.ts:8 -> src/lib/features/tasks/task-metadata.types.ts type:TaskMetadata,type:TaskPriority,type:TaskStatus
imp src/lib/features/tasks/task-query.logic.ts:9 -> src/lib/features/tasks/tasks-keys.logic.ts taskRowKey
imp src/lib/features/tasks/task-query.logic.ts:10 -> src/lib/features/tasks/tasks.logic.ts compareTaskPaths,noteFolder,noteTaskCounts,taskDisplayText
imp src/lib/features/tasks/task-query.logic.ts:11 -> src/lib/features/tasks/tasks.types.ts type:TaskItem
## imported-by
imp src/lib/features/tasks/SourcesPanel.svelte:13 -> src/lib/features/tasks/task-query.logic.ts sourceSuggestions,type:LifecycleState,type:PropertyOp,type:TaskExcludes,type:TaskSource,type:TaskSourceClause
imp src/lib/features/tasks/TaskLists.svelte:20 -> src/lib/features/tasks/task-query.logic.ts isQueryModified
imp src/lib/features/tasks/TasksView.svelte:43 -> src/lib/features/tasks/task-query.logic.ts DEFAULT_QUICK,GROUP_ROW_CAP,TASK_PRIORITIES,collapseKey,describeTaskQuery,explainEmptyTasks,hideFolder,hideNote,hideType,isQuickFieldDefault,isQuickModified,onlyThisFolder,onlyThisType,priorityWord,propertyKeyOptions,statusFilterLabel,tagMenuOptions,taskCountText,toggleQuickPriority,toggleQuickStatus,toggleQuickTag,type:DueRange,type:EmptyTasksExplanation,type:GroupedRow,type:QuickFilterField,type:TaskGroup,type:TaskGroupKey,type:TaskQuickFilters
imp src/lib/features/tasks/task-views.logic.ts:1 -> src/lib/features/tasks/task-query.logic.ts DEFAULT_QUICK,DEFAULT_TASK_SORT,TASK_PRIORITIES,applyQuickFilters,defaultTaskExcludes,emptyTaskExcludes,headingSources,selectSourceRows,type:DueRange,type:LifecycleState,type:PropertyOp,type:TaskExcludes,type:TaskGroupKey,type:TaskQuery,type:TaskQuickFilters,type:TaskRow,type:TaskSortKey,type:TaskSource,type:TaskSourceClause,type:TaskSourceFolders
imp src/lib/features/tasks/tasks.service.ts:11 -> src/lib/features/tasks/task-query.logic.ts buildTaskRows,type:TaskExcludes,type:TaskOverlayEntry,type:TaskSource
imp src/lib/features/tasks/tasks.store.svelte.ts:4 -> src/lib/features/tasks/task-query.logic.ts DEFAULT_QUICK,DEFAULT_TASK_SORT,applyQuickFilters,defaultTaskExcludes,defaultTaskQuery,groupTaskRows,selectSourceRows,type:TaskExcludes,type:TaskGroupKey,type:TaskQuery,type:TaskQuickFilters,type:TaskRow,type:TaskSortKey,type:TaskSource
## reach
in2 src/lib/features/tasks/task-query.logic.ts 4 files in 1 modules: src/lib/app(4)
out2 src/lib/features/tasks/task-query.logic.ts 3 files in 3 modules: src/lib/contracts(1) src/lib/features/type-definitions(1) src/lib/utils(1)
## tests
test src/tests/lib/features/tasks/task-query.logic.test.ts imports src/lib/features/tasks/task-query.logic.ts mirror
test src/tests/lib/features/tasks/TasksView.collapse.test.ts imports src/lib/features/tasks/task-query.logic.ts
test src/tests/lib/features/tasks/TasksView.sources.test.ts imports src/lib/features/tasks/task-query.logic.ts
test src/tests/lib/features/tasks/TasksView.test.ts imports src/lib/features/tasks/task-query.logic.ts
test src/tests/lib/features/tasks/task-row-edit.logic.test.ts imports src/lib/features/tasks/task-query.logic.ts
test src/tests/lib/features/tasks/task-views.logic.test.ts imports src/lib/features/tasks/task-query.logic.ts
test src/tests/lib/features/tasks/tasks-view-settings.test.ts imports src/lib/features/tasks/task-query.logic.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/features/tasks/task-query.logic.ts
test src/tests/lib/features/tasks/tasks.store.test.ts imports src/lib/features/tasks/task-query.logic.ts
## symbols
sym src/lib/features/tasks/task-query.logic.ts:18 type TaskRow L36 | One task of the Tasks view, with the fields of its note that the filters and the list read.
by src/lib/features/tasks/task-query.logic.ts:TaskRow <- src/lib/features/tasks/task-views.logic.ts:17 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskRow <- src/lib/features/tasks/tasks.store.svelte.ts:16 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:56 type VisibleRow L4 | A row the quick filters keep: one that passes, or one `dimmed` because a passing row sits in its subtree
sym src/lib/features/tasks/task-query.logic.ts:66 type DueRange L1 | The Due filter's options.
by src/lib/features/tasks/task-query.logic.ts:DueRange <- src/lib/features/tasks/TasksView.svelte:65 in (script) import
by src/lib/features/tasks/task-query.logic.ts:DueRange <- src/lib/features/tasks/task-views.logic.ts:10 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:69 type TaskQuickFilters L14 | The Tasks view's quick filters
by src/lib/features/tasks/task-query.logic.ts:TaskQuickFilters <- src/lib/features/tasks/TasksView.svelte:71 in (script) import
by src/lib/features/tasks/task-query.logic.ts:TaskQuickFilters <- src/lib/features/tasks/task-views.logic.ts:16 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskQuickFilters <- src/lib/features/tasks/tasks.store.svelte.ts:15 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:85 const DEFAULT_QUICK: TaskQuickFilters L1 | The quick filters a fresh Tasks view starts with
by src/lib/features/tasks/task-query.logic.ts:DEFAULT_QUICK <- src/lib/features/tasks/TasksView.svelte:240 in savedQuick=$derived ref
by src/lib/features/tasks/task-query.logic.ts:DEFAULT_QUICK <- src/lib/features/tasks/task-views.logic.ts:73 in ALL_OPEN_VIEW ref +4
by src/lib/features/tasks/task-query.logic.ts:DEFAULT_QUICK <- src/lib/features/tasks/tasks.store.svelte.ts:155 in tasksStore.resetQuick ref
sym src/lib/features/tasks/task-query.logic.ts:88 type QuickFilterField L1 | A quick filter field `isQuickFieldDefault` tests
by src/lib/features/tasks/task-query.logic.ts:QuickFilterField <- src/lib/features/tasks/TasksView.svelte:68 in (script) import
sym src/lib/features/tasks/task-query.logic.ts:96 fn isQuickFieldDefault(quick: TaskQuickFilters, field: QuickFilterField): boolean L14 | Whether `field` of `quick` is at its default.
by src/lib/features/tasks/task-query.logic.ts:isQuickFieldDefault <- src/lib/features/tasks/TasksView.svelte:237 in foldedCount=$derived call +1
sym src/lib/features/tasks/task-query.logic.ts:112 const TASK_PRIORITIES: readonly TaskPriority[] L1 | Every priority, highest first, in the order of the generated `TaskPriority` (`none` between medium and low)
by src/lib/features/tasks/task-query.logic.ts:TASK_PRIORITIES <- src/lib/features/tasks/TasksView.svelte:209 in priorityTriggerLabel=$derived mcall +2
by src/lib/features/tasks/task-query.logic.ts:TASK_PRIORITIES <- src/lib/features/tasks/task-views.logic.ts:274 in parseQuick ref
sym src/lib/features/tasks/task-query.logic.ts:115 fn priorityWord(priority: TaskPriority): string L3 | A priority's menu label and sentence word: the level itself, `no priority` for `none`.
by src/lib/features/tasks/task-query.logic.ts:priorityWord <- src/lib/features/tasks/TasksView.svelte:209 in priorityTriggerLabel=$derived ref +1
sym src/lib/features/tasks/task-query.logic.ts:123 fn toggleQuickPriority(priorities: TaskPriority[] | undefined, priority: TaskPriority): TaskPriority[] | undefined L7 | `priorities` with `priority` added or removed, in `TASK_PRIORITIES` order whatever the click order.
by src/lib/features/tasks/task-query.logic.ts:toggleQuickPriority <- src/lib/features/tasks/TasksView.svelte:213 in togglePriority call
sym src/lib/features/tasks/task-query.logic.ts:136 fn matchesNestedTag(chosen: string, tag: string): boolean L5 | Whether a task tag passes a chosen tag: equal to it, or nested under it (`work` passes `work/client`, not `workshop`), case-insensitively.
sym src/lib/features/tasks/task-query.logic.ts:153 fn taskTagOptions(rows: TaskRow[]): string[] L10 | The Tag menu's options: every tag of `rows` as Rust emits it (no `#`), de-duplicated case-insensitively (the first spelling wins) and sorted case-insensitively.
sym src/lib/features/tasks/task-query.logic.ts:168 fn tagMenuOptions(rows: TaskRow[], chosen: string[] | undefined): string[] L5 | `taskTagOptions(rows)` plus each chosen tag it lacks (same spelling), so a chosen tag whose tasks are gone can still be unchecked.
by src/lib/features/tasks/task-query.logic.ts:tagMenuOptions <- src/lib/features/tasks/TasksView.svelte:217 in tagOptions=$derived call
sym src/lib/features/tasks/task-query.logic.ts:178 fn propertyKeyOptions(rows: readonly TaskRow[]): string[] L5 | The Display menu's Property options: the frontmatter keys of the notes of `rows`, whatever their value, sorted case-insensitively.
by src/lib/features/tasks/task-query.logic.ts:propertyKeyOptions <- src/lib/features/tasks/TasksView.svelte:140 in propertyKeys=$derived call
sym src/lib/features/tasks/task-query.logic.ts:188 fn toggleQuickTag(tags: string[] | undefined, tag: string, options: string[]): string[] | undefined L7 | `tags` with `tag` added or removed, in `options` order whatever the click order.
by src/lib/features/tasks/task-query.logic.ts:toggleQuickTag <- src/lib/features/tasks/TasksView.svelte:226 in toggleTag call
sym src/lib/features/tasks/task-query.logic.ts:200 fn toggleQuickStatus(statuses: TaskStatus[] | undefined, status: TaskStatus): TaskStatus[] | undefined L7 | `statuses` with `status` added or removed, in `TASK_STATUSES` order whatever the click order.
by src/lib/features/tasks/task-query.logic.ts:toggleQuickStatus <- src/lib/features/tasks/TasksView.svelte:192 in toggleStatus call
sym src/lib/features/tasks/task-query.logic.ts:209 interface TaskOverlayEntry L10 | What the Tasks view itself last wrote to a task line, shown until the snapshot holds it.
by src/lib/features/tasks/task-query.logic.ts:TaskOverlayEntry <- src/lib/features/tasks/tasks.service.ts:11 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:221 type TaskOverlay L1 | The view's own writes, keyed by `taskRowKey(filePath, lineNumber)`.
sym src/lib/features/tasks/task-query.logic.ts:240 fn buildTaskRows(entries: readonly NoteEntryV2[], vaultPath: string | null, overlay: TaskOverlay): TaskRow[] L60 | Builds the Tasks view's rows from the entries snapshot: every task, notes in `compareTaskPaths` order of their path, tasks in document order, each with its hea…
by src/lib/features/tasks/task-query.logic.ts:buildTaskRows <- src/lib/features/tasks/tasks.service.ts:85 in buildTaskIndex call
sym src/lib/features/tasks/task-query.logic.ts:302 type LifecycleState L1 | A lifecycle clause's state (see `TaskSourceClause`).
by src/lib/features/tasks/task-query.logic.ts:LifecycleState <- src/lib/features/tasks/SourcesPanel.svelte:13 in (script) import
by src/lib/features/tasks/task-query.logic.ts:LifecycleState <- src/lib/features/tasks/task-views.logic.ts:11 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:305 type PropertyOp L1 | How a property clause compares the note's frontmatter value (see `TaskSourceClause`).
by src/lib/features/tasks/task-query.logic.ts:PropertyOp <- src/lib/features/tasks/SourcesPanel.svelte:13 in (script) import
by src/lib/features/tasks/task-query.logic.ts:PropertyOp <- src/lib/features/tasks/task-views.logic.ts:12 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:314 type TaskSourceClause L26 | One condition of a source card.
by src/lib/features/tasks/task-query.logic.ts:TaskSourceClause <- src/lib/features/tasks/SourcesPanel.svelte:13 in (script) import
by src/lib/features/tasks/task-query.logic.ts:TaskSourceClause <- src/lib/features/tasks/task-views.logic.ts:20 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:342 interface TaskSource L4 | A source card: its clauses are ANDed; the cards of a query are ORed.
by src/lib/features/tasks/task-query.logic.ts:TaskSource <- src/lib/features/tasks/SourcesPanel.svelte:13 in (script) import
by src/lib/features/tasks/task-query.logic.ts:TaskSource <- src/lib/features/tasks/task-views.logic.ts:19 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskSource <- src/lib/features/tasks/tasks.service.ts:11 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskSource <- src/lib/features/tasks/tasks.store.svelte.ts:18 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:348 interface TaskExcludes L18 | What the Tasks view never lists, whatever the sources say.
by src/lib/features/tasks/task-query.logic.ts:TaskExcludes <- src/lib/features/tasks/SourcesPanel.svelte:13 in (script) import
by src/lib/features/tasks/task-query.logic.ts:TaskExcludes <- src/lib/features/tasks/task-views.logic.ts:13 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskExcludes <- src/lib/features/tasks/tasks.service.ts:11 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskExcludes <- src/lib/features/tasks/tasks.store.svelte.ts:12 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:368 interface TaskQuery L10 | Everything that decides which tasks the Tasks view lists, but the grouping and sort.
by src/lib/features/tasks/task-query.logic.ts:TaskQuery <- src/lib/features/tasks/task-views.logic.ts:15 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskQuery <- src/lib/features/tasks/tasks.store.svelte.ts:14 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:380 interface TaskSourceFolders L6 | The template and system folder settings the excludes read, vault-relative; '' excludes nothing.
by src/lib/features/tasks/task-query.logic.ts:TaskSourceFolders <- src/lib/features/tasks/task-views.logic.ts:21 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:388 fn defaultTaskExcludes(): TaskExcludes L12 | The global excludes of a vault that saved none: the four switches on, no listed value.
by src/lib/features/tasks/task-query.logic.ts:defaultTaskExcludes <- src/lib/features/tasks/task-views.logic.ts:317 in parseTasksViewState call +1
by src/lib/features/tasks/task-query.logic.ts:defaultTaskExcludes <- src/lib/features/tasks/tasks.store.svelte.ts:32 in globalExcludes call +1
sym src/lib/features/tasks/task-query.logic.ts:402 fn headingSources(tags: readonly string[]): TaskSource[] L3 | One card per tag, each holding a heading clause in tag mode; `[]` for no tag.
by src/lib/features/tasks/task-query.logic.ts:headingSources <- src/lib/features/tasks/task-views.logic.ts:150 in toListView call
sym src/lib/features/tasks/task-query.logic.ts:407 fn emptyTaskExcludes(): TaskExcludes L12 | A list's own excludes before any is added: every switch off, no listed value.
by src/lib/features/tasks/task-query.logic.ts:emptyTaskExcludes <- src/lib/features/tasks/task-views.logic.ts:72 in ALL_OPEN_VIEW call +3
sym src/lib/features/tasks/task-query.logic.ts:424 fn defaultTaskQuery(): TaskQuery L3 | The query of a fresh Tasks view, the seeded "To list" view's: the `#to-list` card, no own exclude (the global ones still apply) and `DEFAULT_QUICK`.
by src/lib/features/tasks/task-query.logic.ts:defaultTaskQuery <- src/lib/features/tasks/tasks.store.svelte.ts:30 in query call +1
sym src/lib/features/tasks/task-query.logic.ts:438 fn onlyThisFolder(query: TaskQuery, folder: string): TaskQuery L8 | The query that keeps only `folder`'s tasks (a Folder group's "Only this folder"): one card holding the folder clause when there is no card, else the clause add…
by src/lib/features/tasks/task-query.logic.ts:onlyThisFolder <- src/lib/features/tasks/TasksView.svelte:361 in groupActions call
sym src/lib/features/tasks/task-query.logic.ts:452 fn hideFolder(query: TaskQuery, folder: string): TaskQuery L6 | The query with `folder` added to the excluded folders (a Folder group's "Hide this folder").
by src/lib/features/tasks/task-query.logic.ts:hideFolder <- src/lib/features/tasks/TasksView.svelte:362 in groupActions call
sym src/lib/features/tasks/task-query.logic.ts:464 fn hideNote(query: TaskQuery, relPath: string): TaskQuery L5 | The query with the vault-relative `relPath` added to the excluded notes (a Note group's "Hide this note").
by src/lib/features/tasks/task-query.logic.ts:hideNote <- src/lib/features/tasks/TasksView.svelte:348 in groupActions call
sym src/lib/features/tasks/task-query.logic.ts:480 fn onlyThisType(query: TaskQuery, type: string): TaskQuery L8 | The query that keeps only `type`'s tasks (a Type group's "Only this type"), like `onlyThisFolder`: one card holding the type clause when there is no card, else…
by src/lib/features/tasks/task-query.logic.ts:onlyThisType <- src/lib/features/tasks/TasksView.svelte:354 in groupActions call
sym src/lib/features/tasks/task-query.logic.ts:494 fn hideType(query: TaskQuery, type: string): TaskQuery L6 | The query with `type` added to the excluded types (a Type group's "Hide this type").
by src/lib/features/tasks/task-query.logic.ts:hideType <- src/lib/features/tasks/TasksView.svelte:355 in groupActions call
sym src/lib/features/tasks/task-query.logic.ts:633 fn selectSourceRows(rows: readonly TaskRow[], sources: readonly TaskSource[], exclude: TaskExcludes, folders: TaskSourceFolders): TaskRow[] L30 | The rows the sources and excludes keep: a row passes when no exclude matches it and `sources` is empty or some card has every clause matching (see `TaskSourceC…
by src/lib/features/tasks/task-query.logic.ts:selectSourceRows <- src/lib/features/tasks/task-views.logic.ts:114 in taskViewCount call
by src/lib/features/tasks/task-query.logic.ts:selectSourceRows <- src/lib/features/tasks/tasks.store.svelte.ts:77 in sourceRows=$derived call
sym src/lib/features/tasks/task-query.logic.ts:665 interface SourceSuggestions L17 | What the Sources panel's value pickers offer, each list sorted case-insensitively.
sym src/lib/features/tasks/task-query.logic.ts:704 fn sourceSuggestions(rows: readonly TaskRow[]): SourceSuggestions L41 | The Sources panel's suggestions from `rows` (`tasksStore.rows`: every note with tasks, before the sources and excludes), each list but the keys de-duplicated c…
by src/lib/features/tasks/task-query.logic.ts:sourceSuggestions <- src/lib/features/tasks/SourcesPanel.svelte:82 in suggestions=$derived call
sym src/lib/features/tasks/task-query.logic.ts:817 fn applyQuickFilters(rows: TaskRow[], quick: TaskQuickFilters, today: string, now: number): VisibleRow[] L24 | The rows that pass the quick filters (status, Due, Priority, Tag and Search), plus each failing row with a passing row in its subtree (the later rows of the sa…
by src/lib/features/tasks/task-query.logic.ts:applyQuickFilters <- src/lib/features/tasks/task-views.logic.ts:115 in taskViewCount call
by src/lib/features/tasks/task-query.logic.ts:applyQuickFilters <- src/lib/features/tasks/tasks.store.svelte.ts:89 in visibleRows=$derived call
sym src/lib/features/tasks/task-query.logic.ts:846 type TaskGroupKey L1 | What the Tasks list groups its rows by (the Display menu's Group by): `{ property }` groups by the value of that frontmatter key.
by src/lib/features/tasks/task-query.logic.ts:TaskGroupKey <- src/lib/features/tasks/TasksView.svelte:70 in (script) import
by src/lib/features/tasks/task-query.logic.ts:TaskGroupKey <- src/lib/features/tasks/task-views.logic.ts:14 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskGroupKey <- src/lib/features/tasks/tasks.store.svelte.ts:13 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:849 const GROUP_ROW_CAP L1 | The most rows a group renders before its `Show N more` button (PRD A9).
by src/lib/features/tasks/task-query.logic.ts:GROUP_ROW_CAP <- src/lib/features/tasks/TasksView.svelte:326 in shownGroups=$derived ref +1
sym src/lib/features/tasks/task-query.logic.ts:858 fn collapseKey(groupBy: TaskGroupKey, key: string): string L3 | The key a group's collapsed (or revealed) state is held under: `<groupBy>:<group key>`, so the same raw key under two groupings stays apart (`note:/vault/A.md`…
by src/lib/features/tasks/task-query.logic.ts:collapseKey <- src/lib/features/tasks/TasksView.svelte:324 in shownGroups=$derived call
sym src/lib/features/tasks/task-query.logic.ts:863 type TaskSortKey L1 | A key the rows of a group other than Note are sorted by.
by src/lib/features/tasks/task-query.logic.ts:TaskSortKey <- src/lib/features/tasks/task-views.logic.ts:18 in (module) import
by src/lib/features/tasks/task-query.logic.ts:TaskSortKey <- src/lib/features/tasks/tasks.store.svelte.ts:17 in (module) import
sym src/lib/features/tasks/task-query.logic.ts:866 const DEFAULT_TASK_SORT: TaskSortKey[] L1 | The sort of a fresh Tasks view: due date, then priority, then path.
by src/lib/features/tasks/task-query.logic.ts:DEFAULT_TASK_SORT <- src/lib/features/tasks/task-views.logic.ts:75 in ALL_OPEN_VIEW ref +2
by src/lib/features/tasks/task-query.logic.ts:DEFAULT_TASK_SORT <- src/lib/features/tasks/tasks.store.svelte.ts:40 in sort ref +1
sym src/lib/features/tasks/task-query.logic.ts:869 type GroupedRow L4 | A row of a group; `breadcrumb` is set only outside Note groups.
by src/lib/features/tasks/task-query.logic.ts:GroupedRow <- src/lib/features/tasks/TasksView.svelte:67 in (script) import
sym src/lib/features/tasks/task-query.logic.ts:875 interface TaskGroup L24 | One group of the Tasks list
by src/lib/features/tasks/task-query.logic.ts:TaskGroup <- src/lib/features/tasks/TasksView.svelte:69 in (script) import
sym src/lib/features/tasks/task-query.logic.ts:1116 fn groupTaskRows(rows: VisibleRow[], groupBy: TaskGroupKey, sort: TaskSortKey[], today: string): TaskGroup[] L24 | Groups the visible rows for the Tasks list, leaving out empty groups.
by src/lib/features/tasks/task-query.logic.ts:groupTaskRows <- src/lib/features/tasks/tasks.store.svelte.ts:97 in groups=$derived call
sym src/lib/features/tasks/task-query.logic.ts:1150 fn statusFilterLabel(quick: TaskQuickFilters): string L3 | The value after `Status: ` on the Status menu trigger: `open`, `closed`, `all`, or the chosen statuses' words joined with `, `.
by src/lib/features/tasks/task-query.logic.ts:statusFilterLabel <- src/lib/features/tasks/TasksView.svelte:1001 in (markup) markup
sym src/lib/features/tasks/task-query.logic.ts:1159 fn taskCountText(rows: VisibleRow[], quick: TaskQuickFilters): string L11 | The toolbar count: "N open in M notes" at the default status filter, else "N tasks in M notes", with singular forms.
by src/lib/features/tasks/task-query.logic.ts:taskCountText <- src/lib/features/tasks/TasksView.svelte:158 in countText=$derived call
sym src/lib/features/tasks/task-query.logic.ts:1296 fn describeTaskQuery(query: TaskQuery): string L10 | Builds the sentence above the Tasks list that says which tasks it shows: the status, the sources, the excludes, then Due, Priority, Tag and Search, e.g. "Open …
by src/lib/features/tasks/task-query.logic.ts:describeTaskQuery <- src/lib/features/tasks/TasksView.svelte:169 in ruleSentence=$derived call
sym src/lib/features/tasks/task-query.logic.ts:1367 fn isQuickModified(current: TaskQuickFilters, saved: TaskQuickFilters): boolean L3 | Whether the quick filters `current` differ from `saved`.
by src/lib/features/tasks/task-query.logic.ts:isQuickModified <- src/lib/features/tasks/TasksView.svelte:244 in quickAtSaved=$derived call
sym src/lib/features/tasks/task-query.logic.ts:1378 fn isQueryModified(current: ComparedQuery, saved: ComparedQuery): boolean L3 | Whether the list on screen (`current`) differs from its saved query: the sources, own excludes, quick filters (`isQuickModified`), grouping and sort.
by src/lib/features/tasks/task-query.logic.ts:isQueryModified <- src/lib/features/tasks/TaskLists.svelte:44 in modified=$derived call
sym src/lib/features/tasks/task-query.logic.ts:1383 interface EmptyTasksExplanation L12 | Why the Tasks list is empty, and the one action that would fill it
by src/lib/features/tasks/task-query.logic.ts:EmptyTasksExplanation <- src/lib/features/tasks/TasksView.svelte:66 in (script) import
sym src/lib/features/tasks/task-query.logic.ts:1446 fn explainEmptyTasks({ rows: allRows, query, folders, today, now, }: { rows: readonly TaskRow[]; query: TaskQuery; folders: TaskSourceFolde… L63 | Names the first stage of the pipeline that leaves the Tasks list empty: no task at all, then the sources, then the excludes, then the status filter, Due, Prior…
by src/lib/features/tasks/task-query.logic.ts:explainEmptyTasks <- src/lib/features/tasks/TasksView.svelte:173 in emptyExplanation=$derived call
## locals
local src/lib/features/tasks/task-query.logic.ts:142 fn byLowerCase(a: string, b: string) L5
local src/lib/features/tasks/task-query.logic.ts:429 fn folderValue(path: string) L1
local src/lib/features/tasks/task-query.logic.ts:471 fn typeValue(type: string) L1
local src/lib/features/tasks/task-query.logic.ts:502 fn tagValue(tag: string) L1
local src/lib/features/tasks/task-query.logic.ts:505 fn headingValue(text: string, match: HeadingMatchMode): string L4
local src/lib/features/tasks/task-query.logic.ts:511 fn inFolder(rowFolder: string, folder: string) L1
local src/lib/features/tasks/task-query.logic.ts:514 fn hasNoteTag(noteTags: readonly string[], tag: string) L1
local src/lib/features/tasks/task-query.logic.ts:519 fn clauseTest(clause: TaskSourceClause): RowTest | null L36
local src/lib/features/tasks/task-query.logic.ts:557 fn propertyScalars(value: unknown): string[] L5
local src/lib/features/tasks/task-query.logic.ts:564 fn propertyTest(rawKey: string, op: PropertyOp, rawValue: string | undefined): RowTest | null L20
local src/lib/features/tasks/task-query.logic.ts:586 fn liftsArchived(source: TaskSource): boolean L3
local src/lib/features/tasks/task-query.logic.ts:595 fn excludeTest(exclude: TaskExcludes, folders: TaskSourceFolders): RowTest | null L21
local src/lib/features/tasks/task-query.logic.ts:687 fn stringSet(exact = false) L10
local src/lib/features/tasks/task-query.logic.ts:747 fn passesStatus(row: TaskRow, quick: TaskQuickFilters): boolean L6
local src/lib/features/tasks/task-query.logic.ts:763 fn duePredicate(due: DueRange | undefined, today: string, now: number): ((row: TaskRow) => boolean) | null L23
local src/lib/features/tasks/task-query.logic.ts:794 fn metaPredicate(quick: TaskQuickFilters): ((row: TaskRow) => boolean) | null L12
local src/lib/features/tasks/task-query.logic.ts:921 fn priorityOf(row: TaskRow): TaskPriority L1
local src/lib/features/tasks/task-query.logic.ts:927 fn compareDue(a: string | undefined, b: string | undefined): number L8
local src/lib/features/tasks/task-query.logic.ts:943 fn compareRows(sort: TaskSortKey[]): (a: TaskRow, b: TaskRow) => number L9
local src/lib/features/tasks/task-query.logic.ts:954 fn noteGroups(rows: VisibleRow[]): TaskGroup[] L23
local src/lib/features/tasks/task-query.logic.ts:989 fn headingGroups(rows: VisibleRow[]): TaskGroup[] L37
local src/lib/features/tasks/task-query.logic.ts:1028 fn labelOrder(keys: string[]) L1
local src/lib/features/tasks/task-query.logic.ts:1031 fn valueText(v: unknown) L2
local src/lib/features/tasks/task-query.logic.ts:1039 fn propertyGroupKey(row: TaskRow, key: string): string L6
local src/lib/features/tasks/task-query.logic.ts:1055 fn fixedOrder(all: readonly string[]) L1
local src/lib/features/tasks/task-query.logic.ts:1057 fn flatGrouping(groupBy: Exclude<TaskGroupKey, 'note' | 'heading'>, today: string): FlatGrouping L48
local src/lib/features/tasks/task-query.logic.ts:1142 fn statusWords(statuses: TaskStatus[]): string[] L3
local src/lib/features/tasks/task-query.logic.ts:1172 fn describeStatus(quick: TaskQuickFilters): string L6
local src/lib/features/tasks/task-query.logic.ts:1190 fn tagWord(tag: string) L1
local src/lib/features/tasks/task-query.logic.ts:1193 fn clauseWords(clause: TaskSourceClause): string | null L28
local src/lib/features/tasks/task-query.logic.ts:1234 fn activeCards(sources: readonly TaskSource[]): { clause: TaskSourceClause; words: string }[][] L8
local src/lib/features/tasks/task-query.logic.ts:1249 fn textboxTags(sources: readonly TaskSource[]): string | null L11
local src/lib/features/tasks/task-query.logic.ts:1262 fn describeSources(sources: readonly TaskSource[]): string L8
local src/lib/features/tasks/task-query.logic.ts:1276 fn describeExcludes(exclude: TaskExcludes, sources: readonly TaskSource[]): string L13
local src/lib/features/tasks/task-query.logic.ts:1308 fn asSet(values: readonly string[] | undefined) L1
local src/lib/features/tasks/task-query.logic.ts:1311 fn normalQuick(quick: TaskQuickFilters) L9
local src/lib/features/tasks/task-query.logic.ts:1322 fn normalClause(clause: TaskSourceClause): unknown[] L16
local src/lib/features/tasks/task-query.logic.ts:1349 fn queryKey(query: ComparedQuery): string L11
local src/lib/features/tasks/task-query.logic.ts:1423 fn explainEmptyDue(quick: TaskQuickFilters, allRows: readonly TaskRow[], today: string): Pick<EmptyTasksExplanation, 'message' | 'hint'> L12
## calls
more calls codemap/files/src/lib/features/tasks/task-query.logic.ts.calls.md
