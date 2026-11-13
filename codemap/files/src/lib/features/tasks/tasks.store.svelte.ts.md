# file card src/lib/features/tasks/tasks.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/tasks.store.svelte.ts ' codemap/files
file src/lib/features/tasks/tasks.store.svelte.ts store L195 module src/lib/features/tasks in5 t15
## imports
imp src/lib/features/tasks/tasks.store.svelte.ts:1 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/tasks/tasks.store.svelte.ts:2 -> src/lib/utils/date.ts formatNow
imp src/lib/features/tasks/tasks.store.svelte.ts:3 -> src/lib/utils/debug.ts timeSync
imp src/lib/features/tasks/tasks.store.svelte.ts:4 -> src/lib/features/tasks/task-query.logic.ts DEFAULT_QUICK,DEFAULT_TASK_SORT,applyQuickFilters,defaultTaskExcludes,defaultTaskQuery,groupTaskRows,selectSourceRows,type:TaskExcludes,type:TaskGroupKey,type:TaskQuery,type:TaskQuickFilters,type:TaskRow,type:TaskSortKey,type:TaskSource
imp src/lib/features/tasks/tasks.store.svelte.ts:20 -> src/lib/features/tasks/task-views.logic.ts TO_LIST_ID,mergeExcludes,toListView,type:SavedTaskView,type:TaskViewQuery
imp src/lib/features/tasks/tasks.store.svelte.ts:21 -> src/lib/features/tasks/tasks.types.ts type:TaskRowRef
## imported-by
imp src/lib/app/commands.ts:34 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/features/tasks/SourcesPanel.svelte:10 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/features/tasks/TaskLists.svelte:10 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/features/tasks/TasksView.svelte:23 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/features/tasks/tasks.service.ts:10 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
## reach
in2 src/lib/features/tasks/tasks.store.svelte.ts 4 files in 1 modules: src/lib/app(4)
out2 src/lib/features/tasks/tasks.store.svelte.ts 16 files in 6 modules: src/lib/features/tasks(5) src/lib/core/settings(4) src/lib/utils(3) src/lib/contracts(2) src/lib/features/type-definitions(1) +1 modules
## tests
test src/tests/lib/features/tasks/tasks.store.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts mirror
test src/tests/fixtures/tasks.fixture.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.collapse.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.filters.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.grouping.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.keyboard.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.lists.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.row-edit.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.row-menu.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.sources.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/TasksView.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/tasks-view-settings.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/features/tasks/tasks.store.svelte.ts
## symbols
sym src/lib/features/tasks/tasks.store.svelte.ts:100 store tasksStore L96
by src/lib/features/tasks/tasks.store.svelte.ts:tasksStore <- src/lib/app/commands.ts:80 in tasksStatusFilterCommand member +1
by src/lib/features/tasks/tasks.store.svelte.ts:tasksStore <- src/lib/features/tasks/SourcesPanel.svelte:79 in sources=$derived member +4
by src/lib/features/tasks/tasks.store.svelte.ts:tasksStore <- src/lib/features/tasks/TaskLists.svelte:38 in lists=$derived member +16
by src/lib/features/tasks/tasks.store.svelte.ts:tasksStore <- src/lib/features/tasks/TasksView.svelte:134 in groupRadioValue=$derived member +81
by src/lib/features/tasks/tasks.store.svelte.ts:tasksStore <- src/lib/features/tasks/tasks.service.ts:76 in buildTaskIndex mcall +42
## store
store src/lib/features/tasks/tasks.store.svelte.ts:100 tasksStore esc:0
mem src/lib/features/tasks/tasks.store.svelte.ts:102 get tasksStore.rows r:src/lib/features/tasks/SourcesPanel.svelte:82,src/lib/features/tasks/TaskLists.svelte:61,src/lib/features/tasks/TasksView.svelte:165,src/lib/features/tasks/TasksView.svelte:174,src/lib/features/tasks/TasksView.svelte:1079,src/lib/features/tasks/TasksView.svelte:1104 w-via:setRows,reset | Every task of the snapshot as a row, before any view filter
mem src/lib/features/tasks/tasks.store.svelte.ts:104 get tasksStore.sourceRows r:src/lib/features/tasks/TasksView.svelte:140,src/lib/features/tasks/TasksView.svelte:217 w-via:setRows,reset | The rows the sources and excludes keep, before the quick filters
mem src/lib/features/tasks/tasks.store.svelte.ts:106 get tasksStore.visibleRows r:src/lib/features/tasks/TaskLists.svelte:66,src/lib/features/tasks/TasksView.svelte:158 w-via:setSources,setExclude,setSession,setQuick,resetQuick,+1 | The rows the list shows, dimmed parents included (see `applyQuickFilters`)
mem src/lib/features/tasks/tasks.store.svelte.ts:108 get tasksStore.groups r:src/lib/features/tasks/TasksView.svelte:156 w-via:setSession,setGroupBy,reset | The list's groups, in display order
mem src/lib/features/tasks/tasks.store.svelte.ts:110 get tasksStore.groupBy r:9 w-via:setSession,setGroupBy,reset | What the list groups its rows by
more r 9 not shown: src/lib/features/tasks(9): q store src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.groupBy
mem src/lib/features/tasks/tasks.store.svelte.ts:112 get tasksStore.sort r:src/lib/features/tasks/TaskLists.svelte:44,src/lib/features/tasks/tasks.service.ts:175,src/lib/features/tasks/tasks.service.ts:201 w-via:setSession,reset | The sort keys of the groups other than Note
mem src/lib/features/tasks/tasks.store.svelte.ts:114 get tasksStore.query r:11 w-via:setSources,setExclude,setSession,setQuick,resetQuick,+1 | The session's sources, the active list's own excludes and the quick filters
more r 11 not shown: src/lib/features/tasks(11): q store src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.query
mem src/lib/features/tasks/tasks.store.svelte.ts:116 get tasksStore.effectiveQuery r:src/lib/features/tasks/TasksView.svelte:169,src/lib/features/tasks/TasksView.svelte:175 w-via:setSources,setExclude,setGlobalExcludes,setSession,setQuick,+2 | `query` with the global excludes merged into its own: what the list applies
mem src/lib/features/tasks/tasks.store.svelte.ts:118 get tasksStore.globalExcludes r:src/lib/features/tasks/SourcesPanel.svelte:80,src/lib/features/tasks/TaskLists.svelte:61,src/lib/features/tasks/tasks.service.ts:122 w-via:setGlobalExcludes,reset | The excludes every list applies
mem src/lib/features/tasks/tasks.store.svelte.ts:120 get tasksStore.savedViews r:16 w-via:setSavedViews,reset | The saved views, in list order
more r 16 not shown: src/lib/features/tasks(16): q store src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.savedViews
mem src/lib/features/tasks/tasks.store.svelte.ts:122 get tasksStore.activeList r:11 w-via:setActiveList,reset | Id of the active list (a saved view or a built-in)
more r 11 not shown: src/lib/features/tasks(11): q store src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.activeList
mem src/lib/features/tasks/tasks.store.svelte.ts:124 get tasksStore.quick r:17 w-via:setSources,setExclude,setSession,setQuick,resetQuick,+1 | The quick filters (`query.quick`)
more r 17 not shown: src/lib/features/tasks(16) src/lib/app(1): q store src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.quick
mem src/lib/features/tasks/tasks.store.svelte.ts:125 get tasksStore.isLoading r:src/lib/features/tasks/TasksView.svelte:610,src/lib/features/tasks/TasksView.svelte:910 w-via:setLoading,reset
mem src/lib/features/tasks/tasks.store.svelte.ts:126 get tasksStore.hasLoaded r:src/lib/features/tasks/TaskLists.svelte:190,src/lib/features/tasks/TaskLists.svelte:196,src/lib/features/tasks/TasksView.svelte:295,src/lib/features/tasks/TasksView.svelte:907,src/lib/features/tasks/TasksView.svelte:910,src/lib/features/tasks/TasksView.svelte:1079 w-via:setHasLoaded,reset
mem src/lib/features/tasks/tasks.store.svelte.ts:127 get tasksStore.error r:src/lib/features/tasks/TasksView.svelte:1104,src/lib/features/tasks/TasksView.svelte:1106,src/lib/features/tasks/TasksView.svelte:1108,src/lib/features/tasks/TasksView.svelte:1125 w-via:setError,reset
mem src/lib/features/tasks/tasks.store.svelte.ts:128 get tasksStore.scrollOffset r:src/lib/features/tasks/TasksView.svelte:297 w-via:setScrollOffset,reset
mem src/lib/features/tasks/tasks.store.svelte.ts:130 get tasksStore.currentRow r:src/lib/features/tasks/TasksView.svelte:312 w-via:setCurrentRow,reset | The list's current row, or null
mem src/lib/features/tasks/tasks.store.svelte.ts:132 get tasksStore.collapsedGroups r:src/lib/features/tasks/TasksView.svelte:325 w-via:toggleGroupCollapsed,reset | The `collapseKey`s of the collapsed groups
mem src/lib/features/tasks/tasks.store.svelte.ts:135 do tasksStore.setRows w:src/lib/features/tasks/tasks.service.ts:86 | Replaces the rows.
mem src/lib/features/tasks/tasks.store.svelte.ts:137 do tasksStore.setSources w:src/lib/features/tasks/tasks.service.ts:109 | Replaces the source cards.
mem src/lib/features/tasks/tasks.store.svelte.ts:139 do tasksStore.setExclude w:src/lib/features/tasks/SourcesPanel.svelte:234,src/lib/features/tasks/TasksView.svelte:348,src/lib/features/tasks/TasksView.svelte:355,src/lib/features/tasks/TasksView.svelte:362 | Replaces the active list's own excludes in the session.
mem src/lib/features/tasks/tasks.store.svelte.ts:141 do tasksStore.setGlobalExcludes w:src/lib/features/tasks/tasks.service.ts:150,src/lib/features/tasks/tasks.service.ts:247 | Replaces the global excludes.
mem src/lib/features/tasks/tasks.store.svelte.ts:143 do tasksStore.setSavedViews w:src/lib/features/tasks/tasks.service.ts:151,src/lib/features/tasks/tasks.service.ts:177,src/lib/features/tasks/tasks.service.ts:202,src/lib/features/tasks/tasks.service.ts:211,src/lib/features/tasks/tasks.service.ts:225,src/lib/features/tasks/tasks.service.ts:239 | Replaces the saved views.
mem src/lib/features/tasks/tasks.store.svelte.ts:145 do tasksStore.setActiveList w:src/lib/features/tasks/tasks.service.ts:130,src/lib/features/tasks/tasks.service.ts:178 | Sets the active list's id.
mem src/lib/features/tasks/tasks.store.svelte.ts:147 do tasksStore.setSession w:src/lib/features/tasks/tasks.service.ts:131 | Copies a list's query into the session: sources, own excludes, quick filters, grouping and sort.
mem src/lib/features/tasks/tasks.store.svelte.ts:153 do tasksStore.setQuick w:9 | Merges `partial` into the quick filters; a key set to `undefined` clears that field.
more w 9 not shown: src/lib/features/tasks(8) src/lib/app(1): q store src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick
mem src/lib/features/tasks/tasks.store.svelte.ts:155 do tasksStore.resetQuick w:src/lib/features/tasks/TasksView.svelte:1065 | Replaces the quick filters with a copy of `quick`, `DEFAULT_QUICK` when omitted.
mem src/lib/features/tasks/tasks.store.svelte.ts:157 do tasksStore.setGroupBy w:src/lib/features/tasks/TasksView.svelte:938,src/lib/features/tasks/TasksView.svelte:947,src/lib/features/tasks/TasksView.svelte:957 | Sets the grouping; the current value changes nothing.
mem src/lib/features/tasks/tasks.store.svelte.ts:158 do tasksStore.setLoading w:src/lib/features/tasks/tasks.service.ts:76,src/lib/features/tasks/tasks.service.ts:97
mem src/lib/features/tasks/tasks.store.svelte.ts:159 do tasksStore.setHasLoaded w:src/lib/features/tasks/tasks.service.ts:98
mem src/lib/features/tasks/tasks.store.svelte.ts:161 do tasksStore.setError w:src/lib/features/tasks/tasks.service.ts:87,src/lib/features/tasks/tasks.service.ts:93 | Sets or clears the refresh error message.
mem src/lib/features/tasks/tasks.store.svelte.ts:163 do tasksStore.setScrollOffset w:src/lib/features/tasks/TasksView.svelte:285 | Saves the list viewport's `scrollTop`.
mem src/lib/features/tasks/tasks.store.svelte.ts:165 do tasksStore.setCurrentRow w:src/lib/features/tasks/TasksView.svelte:423,src/lib/features/tasks/TasksView.svelte:464,src/lib/features/tasks/TasksView.svelte:476,src/lib/features/tasks/TasksView.svelte:502 | Sets the current row to a copy of `row`, or clears it; does nothing when the row is unchanged.
mem src/lib/features/tasks/tasks.store.svelte.ts:174 do tasksStore.toggleGroupCollapsed w:src/lib/features/tasks/TasksView.svelte:722 | Collapses the group with `collapseKey` `key`, or expands it when collapsed.
mem src/lib/features/tasks/tasks.store.svelte.ts:180 do tasksStore.reset w:src/lib/features/tasks/tasks.service.ts:593
## calls
call src/lib/features/tasks/tasks.store.svelte.ts:30 in query -> src/lib/features/tasks/task-query.logic.ts:defaultTaskQuery call
call src/lib/features/tasks/tasks.store.svelte.ts:32 in globalExcludes -> src/lib/features/tasks/task-query.logic.ts:defaultTaskExcludes call
call src/lib/features/tasks/tasks.store.svelte.ts:34 in savedViews -> src/lib/features/tasks/task-views.logic.ts:toListView call
call src/lib/features/tasks/tasks.store.svelte.ts:69 in effectiveQuery=$derived -> src/lib/features/tasks/task-views.logic.ts:mergeExcludes call
call src/lib/features/tasks/tasks.store.svelte.ts:77 in sourceRows=$derived -> src/lib/features/tasks/task-query.logic.ts:selectSourceRows call
call src/lib/features/tasks/tasks.store.svelte.ts:89 in visibleRows=$derived -> src/lib/features/tasks/task-query.logic.ts:applyQuickFilters call
call src/lib/features/tasks/tasks.store.svelte.ts:89 in visibleRows=$derived -> src/lib/utils/date.ts:formatNow call
call src/lib/features/tasks/tasks.store.svelte.ts:97 in groups=$derived -> src/lib/features/tasks/task-query.logic.ts:groupTaskRows call
call src/lib/features/tasks/tasks.store.svelte.ts:97 in groups=$derived -> src/lib/utils/date.ts:formatNow call
call src/lib/features/tasks/tasks.store.svelte.ts:97 in groups=$derived -> src/lib/utils/debug.ts:timeSync call
call src/lib/features/tasks/tasks.store.svelte.ts:182 in tasksStore.reset -> src/lib/features/tasks/task-query.logic.ts:defaultTaskQuery call
call src/lib/features/tasks/tasks.store.svelte.ts:183 in tasksStore.reset -> src/lib/features/tasks/task-query.logic.ts:defaultTaskExcludes call
call src/lib/features/tasks/tasks.store.svelte.ts:184 in tasksStore.reset -> src/lib/features/tasks/task-views.logic.ts:toListView call
