# file card src/lib/features/tasks/tasks.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/tasks.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/tasks/tasks.service.ts service L595 module src/lib/features/tasks in6 t16
## imports
imp src/lib/features/tasks/tasks.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/features/tasks/tasks.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/tasks/tasks.service.ts:4 -> src/lib/core/editor/editor.service.ts saveFileByPath
imp src/lib/features/tasks/tasks.service.ts:5 -> src/lib/core/editor/editor.logic.ts findTabIndex,isTabDirty,TASKS_VIRTUAL_PATH
imp src/lib/features/tasks/tasks.service.ts:6 -> src/lib/core/filesystem/task-write.service.ts settleTaskWrite
imp src/lib/features/tasks/tasks.service.ts:7 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/tasks/tasks.service.ts:8 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries,invalidateVaultEntries
imp src/lib/features/tasks/tasks.service.ts:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/tasks/tasks.service.ts:10 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/features/tasks/tasks.service.ts:11 -> src/lib/features/tasks/task-query.logic.ts buildTaskRows,type:TaskExcludes,type:TaskOverlayEntry,type:TaskSource
imp src/lib/features/tasks/tasks.service.ts:12 -> src/lib/features/tasks/task-status.logic.ts statusMenuLabel,toggleTarget
imp src/lib/features/tasks/tasks.service.ts:13 -> src/lib/features/tasks/task-views.logic.ts findTaskView,parseTasksViewState,viewQueryOf,withTasksViewState,type:SavedTaskView
imp src/lib/features/tasks/tasks.service.ts:14 -> src/lib/features/tasks/tasks-keys.logic.ts taskRowKey
imp src/lib/features/tasks/tasks.service.ts:15 -> src/lib/features/tasks/tasks.logic.ts taskDisplayText
imp src/lib/features/tasks/tasks.service.ts:16 -> src/lib/features/tasks/task-metadata.types.ts type:TaskMetadata,type:TaskStatus
imp src/lib/features/tasks/tasks.service.ts:17 -> src/lib/features/tasks/tasks.types.ts type:TaskItem
imp src/lib/features/tasks/tasks.service.ts:18 -> src/lib/utils/debug.ts debug,error,timeAsync
imp src/lib/features/tasks/tasks.service.ts:19 -> src/lib/utils/path.ts vaultRelativeKey
## imported-by
imp src/lib/app/commands.ts:33 -> src/lib/features/tasks/tasks.service.ts openTasksTab,toggleTasksTab
imp src/lib/app/global-keybindings.ts:13 -> src/lib/features/tasks/tasks.service.ts toggleTasksTab
imp src/lib/app/lifecycle/app-lifecycle.service.ts:57 -> src/lib/features/tasks/tasks.service.ts loadSavedTasksView,resetTasks
imp src/lib/features/tasks/SourcesPanel.svelte:11 -> src/lib/features/tasks/tasks.service.ts setTaskExcludes,setTaskSources
imp src/lib/features/tasks/TaskLists.svelte:11 -> src/lib/features/tasks/tasks.service.ts deleteTaskView,duplicateTaskView,renameTaskView,revertTaskList,saveTaskView,saveTaskViewQuery,selectTaskList
imp src/lib/features/tasks/TasksView.svelte:26 -> src/lib/features/tasks/tasks.service.ts buildTaskIndex,setTaskSources,setTaskStatusFromMenu,toggleTask,updateTaskFromMenu
## reach
in2 src/lib/features/tasks/tasks.service.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/features/tasks/tasks.service.ts 23 files in 10 modules: src/lib/utils(6) src/lib/core/settings(4) src/lib/contracts(3) src/lib/core/editor(2) src/lib/core/filesystem(2) +5 modules
## tests
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/features/tasks/tasks.service.ts mirror
test src/tests/lib/features/tasks/TasksView.collapse.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/TasksView.filters.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/TasksView.grouping.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/TasksView.keyboard.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/TasksView.lists.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/TasksView.row-edit.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/TasksView.row-menu.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/TasksView.sources.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/TasksView.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/tasks/tasks-view-settings.test.ts imports src/lib/features/tasks/tasks.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/features/tasks/tasks.service.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/features/tasks/tasks.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/tasks/tasks.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/features/tasks/tasks.service.ts
## symbols
sym src/lib/features/tasks/tasks.service.ts:47 fn getTasksResetGeneration(): number L3 | Returns how many times `resetTasks` has run.
sym src/lib/features/tasks/tasks.service.ts:74 fn buildTaskIndex(): Promise<void> L28 | Builds the Tasks store's rows from the memoized entries snapshot (`getVaultEntries`, one `get_all_vault_entries_v2` per index version, shared with QueryJS): ev…
by src/lib/features/tasks/tasks.service.ts:buildTaskIndex <- src/lib/features/tasks/TasksView.svelte:274 in $effect@271 call +1
sym src/lib/features/tasks/tasks.service.ts:108 fn setTaskSources(sources: TaskSource[]): void L3 | Replaces the session's source cards.
by src/lib/features/tasks/tasks.service.ts:setTaskSources <- src/lib/features/tasks/SourcesPanel.svelte:164 in updateCard call +2
by src/lib/features/tasks/tasks.service.ts:setTaskSources <- src/lib/features/tasks/TasksView.svelte:354 in groupActions call +2
sym src/lib/features/tasks/tasks.service.ts:143 fn loadSavedTasksView(): void L12 | Loads this vault's saved Tasks state (`tasksView`, `parseTasksViewState`): the global excludes, the saved views, and the active list, whose query it copies int…
by src/lib/features/tasks/tasks.service.ts:loadSavedTasksView <- src/lib/app/lifecycle/app-lifecycle.service.ts:213 in initializeVault call
sym src/lib/features/tasks/tasks.service.ts:157 fn selectTaskList(id: string): void L6 | Selects the list with `id` (a saved view or a built-in) and saves it as the active one; an unknown id does nothing.
by src/lib/features/tasks/tasks.service.ts:selectTaskList <- src/lib/features/tasks/TaskLists.svelte:192 in (markup) markup +1
sym src/lib/features/tasks/tasks.service.ts:169 fn saveTaskView(name: string): string | null L13 | Saves the session query (`viewQueryOf`, without the search) as a new view named `name`, trimmed, after the others, and makes it the active list.
by src/lib/features/tasks/tasks.service.ts:saveTaskView <- src/lib/features/tasks/TaskLists.svelte:88 in commit call
sym src/lib/features/tasks/tasks.service.ts:188 fn revertTaskList(): void L4 | Copies the active list's saved query back into the session, dropping its edit: the "modified" marker's Reset (a built-in) and Revert (a saved view).
by src/lib/features/tasks/tasks.service.ts:revertTaskList <- src/lib/features/tasks/TaskLists.svelte:253 in (markup) markup +1
sym src/lib/features/tasks/tasks.service.ts:198 fn saveTaskViewQuery(): boolean L8 | Writes the session query (`viewQueryOf`, without the search) into the active saved view, keeping its id, name and place.
by src/lib/features/tasks/tasks.service.ts:saveTaskViewQuery <- src/lib/features/tasks/TaskLists.svelte:255 in (markup) markup
sym src/lib/features/tasks/tasks.service.ts:208 fn renameTaskView(id: string, name: string): boolean L7 | Renames the saved view `id` to `name`, trimmed.
by src/lib/features/tasks/tasks.service.ts:renameTaskView <- src/lib/features/tasks/TaskLists.svelte:88 in commit call
sym src/lib/features/tasks/tasks.service.ts:220 fn duplicateTaskView(id: string): string | null L9 | Adds a copy of the saved view `id`, named `<name> copy`, right after it.
by src/lib/features/tasks/tasks.service.ts:duplicateTaskView <- src/lib/features/tasks/TaskLists.svelte:217 in (markup) markup
sym src/lib/features/tasks/tasks.service.ts:235 fn deleteTaskView(id: string): boolean L9 | Deletes the saved view `id`; deleting the active one selects the first remaining saved view.
by src/lib/features/tasks/tasks.service.ts:deleteTaskView <- src/lib/features/tasks/TaskLists.svelte:138 in deleteView call
sym src/lib/features/tasks/tasks.service.ts:246 fn setTaskExcludes(exclude: TaskExcludes): void L4 | Replaces the global excludes, which every list applies, and saves them.
by src/lib/features/tasks/tasks.service.ts:setTaskExcludes <- src/lib/features/tasks/SourcesPanel.svelte:233 in setExclude call
sym src/lib/features/tasks/tasks.service.ts:283 fn setTaskStatus(filePath: string, task: Pick<TaskItem, 'text' | 'status' | 'lineNumber'>, target: TaskStatus): Promise<boolean> L46 | Writes `target` as the status of `task` via the Rust `toggle_task_status` command, and returns true only when the line was rewritten.
sym src/lib/features/tasks/tasks.service.ts:376 fn updateTask(filePath: string, task: Pick<TaskItem, 'text' | 'status' | 'lineNumber'>, newText: string): Promise<boolean> L49 | Writes `newText` as the text of `task` (the part after `[ ] `) via the Rust `write_task_text` command, and returns true only when the line was rewritten.
sym src/lib/features/tasks/tasks.service.ts:427 fn toggleTask(filePath: string, task: TaskItem): Promise<void> L3 | Toggles a task: writes `toggleTarget(task.status)` through `setTaskStatus`.
by src/lib/features/tasks/tasks.service.ts:toggleTask <- src/lib/features/tasks/TasksView.svelte:259 in handleToggle call
sym src/lib/features/tasks/tasks.service.ts:448 fn setTaskStatusFromMenu(filePath: string, task: TaskItem, target: TaskStatus): Promise<void> L7 | A row menu's status change: `setTaskStatus`, then a `Task marked <Label>` toast whose Undo writes `task.status` back.
by src/lib/features/tasks/tasks.service.ts:setTaskStatusFromMenu <- src/lib/features/tasks/TasksView.svelte:542 in pickRowStatus call
sym src/lib/features/tasks/tasks.service.ts:463 fn updateTaskFromMenu(filePath: string, task: TaskItem, newText: string, message: string): Promise<void> L7 | A row menu's text change (due date, priority): `updateTask`, then a toast with `message` whose Undo writes `task.text` back, expecting `newText`.
by src/lib/features/tasks/tasks.service.ts:updateTaskFromMenu <- src/lib/features/tasks/TasksView.svelte:555 in setRowDue call +1
sym src/lib/features/tasks/tasks.service.ts:547 fn openTasksTab(): void L14 | Opens or focuses the Tasks tab.
by src/lib/features/tasks/tasks.service.ts:openTasksTab <- src/lib/app/commands.ts:88 in tasksStatusFilterCommand call
sym src/lib/features/tasks/tasks.service.ts:563 fn closeTasksTab(): void L6 | Closes the Tasks tab if it exists.
sym src/lib/features/tasks/tasks.service.ts:571 fn toggleTasksTab(): void L10 | Toggles the Tasks tab: opens if closed, closes if active, focuses if open but not active.
by src/lib/features/tasks/tasks.service.ts:toggleTasksTab <- src/lib/app/commands.ts:222 in getBuiltInCommands call
by src/lib/features/tasks/tasks.service.ts:toggleTasksTab <- src/lib/app/global-keybindings.ts:121 in GLOBAL_KEYBINDINGS call
sym src/lib/features/tasks/tasks.service.ts:588 fn resetTasks(): void L8 | Resets all task state.
by src/lib/features/tasks/tasks.service.ts:resetTasks <- src/lib/app/lifecycle/app-lifecycle.service.ts:673 in teardownVault call
## locals
local src/lib/features/tasks/tasks.service.ts:118 fn writeTasksViewState(): void L9
local src/lib/features/tasks/tasks.service.ts:129 fn showList(view: SavedTaskView): void L4
local src/lib/features/tasks/tasks.service.ts:342 fn preflightTaskWrite(filePath: string, lineNumber: number): Promise<boolean> L16
local src/lib/features/tasks/tasks.service.ts:435 fn dismissStatusUndo(): void L5
local src/lib/features/tasks/tasks.service.ts:476 fn holdUndoToast(message: string, task: TaskItem, generation: number, undo: () => void): void L19
local src/lib/features/tasks/tasks.service.ts:509 fn afterTaskWrite(path: string, updatedContent: string, written: { lineNumber: number; text: string; status: TaskStatus; version: number… L17
local src/lib/features/tasks/tasks.service.ts:535 fn refreshAfterRefusal(filePath: string, lineNumber: number): Promise<void> L5
local src/lib/features/tasks/tasks.service.ts:542 fn lineAt(content: string, lineNumber: number): string | undefined L3
## calls
call src/lib/features/tasks/tasks.service.ts:76 in buildTaskIndex -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setLoading mcall +1
call src/lib/features/tasks/tasks.service.ts:78 in buildTaskIndex -> src/lib/utils/debug.ts:timeAsync call
call src/lib/features/tasks/tasks.service.ts:80 in buildTaskIndex -> src/lib/core/vault/vault-entries.service.ts:getVaultEntries call
call src/lib/features/tasks/tasks.service.ts:85 in buildTaskIndex -> src/lib/features/tasks/task-query.logic.ts:buildTaskRows call
call src/lib/features/tasks/tasks.service.ts:86 in buildTaskIndex -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setRows mcall
call src/lib/features/tasks/tasks.service.ts:87 in buildTaskIndex -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setError mcall +1
call src/lib/features/tasks/tasks.service.ts:88 in buildTaskIndex -> src/lib/utils/debug.ts:debug call
call src/lib/features/tasks/tasks.service.ts:92 in buildTaskIndex -> src/lib/utils/debug.ts:error call
call src/lib/features/tasks/tasks.service.ts:98 in buildTaskIndex -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setHasLoaded mcall
call src/lib/features/tasks/tasks.service.ts:109 in setTaskSources -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setSources mcall
call src/lib/features/tasks/tasks.service.ts:119 in writeTasksViewState -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateTasksView mcall
call src/lib/features/tasks/tasks.service.ts:120 in writeTasksViewState -> src/lib/features/tasks/task-views.logic.ts:withTasksViewState call
call src/lib/features/tasks/tasks.service.ts:130 in showList -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setActiveList mcall
call src/lib/features/tasks/tasks.service.ts:131 in showList -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setSession mcall
call src/lib/features/tasks/tasks.service.ts:145 in loadSavedTasksView -> src/lib/features/tasks/task-views.logic.ts:parseTasksViewState call
call src/lib/features/tasks/tasks.service.ts:147 in loadSavedTasksView -> src/lib/utils/debug.ts:error call
call src/lib/features/tasks/tasks.service.ts:150 in loadSavedTasksView -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setGlobalExcludes mcall
call src/lib/features/tasks/tasks.service.ts:151 in loadSavedTasksView -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setSavedViews mcall
call src/lib/features/tasks/tasks.service.ts:153 in loadSavedTasksView -> src/lib/features/tasks/task-views.logic.ts:findTaskView call
call src/lib/features/tasks/tasks.service.ts:153 in loadSavedTasksView -> src/lib/features/tasks/tasks.service.ts:showList call
call src/lib/features/tasks/tasks.service.ts:158 in selectTaskList -> src/lib/features/tasks/task-views.logic.ts:findTaskView call
call src/lib/features/tasks/tasks.service.ts:160 in selectTaskList -> src/lib/features/tasks/tasks.service.ts:showList call
call src/lib/features/tasks/tasks.service.ts:161 in selectTaskList -> src/lib/features/tasks/tasks.service.ts:writeTasksViewState call
call src/lib/features/tasks/tasks.service.ts:175 in saveTaskView -> src/lib/features/tasks/task-views.logic.ts:viewQueryOf call
call src/lib/features/tasks/tasks.service.ts:177 in saveTaskView -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setSavedViews mcall
call src/lib/features/tasks/tasks.service.ts:178 in saveTaskView -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setActiveList mcall
call src/lib/features/tasks/tasks.service.ts:179 in saveTaskView -> src/lib/features/tasks/tasks.service.ts:writeTasksViewState call
call src/lib/features/tasks/tasks.service.ts:189 in revertTaskList -> src/lib/features/tasks/task-views.logic.ts:findTaskView call
call src/lib/features/tasks/tasks.service.ts:190 in revertTaskList -> src/lib/features/tasks/tasks.service.ts:showList call
call src/lib/features/tasks/tasks.service.ts:201 in saveTaskViewQuery -> src/lib/features/tasks/task-views.logic.ts:viewQueryOf call
call src/lib/features/tasks/tasks.service.ts:202 in saveTaskViewQuery -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setSavedViews mcall
call src/lib/features/tasks/tasks.service.ts:203 in saveTaskViewQuery -> src/lib/features/tasks/tasks.service.ts:writeTasksViewState call
call src/lib/features/tasks/tasks.service.ts:211 in renameTaskView -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setSavedViews mcall
call src/lib/features/tasks/tasks.service.ts:212 in renameTaskView -> src/lib/features/tasks/tasks.service.ts:writeTasksViewState call
call src/lib/features/tasks/tasks.service.ts:225 in duplicateTaskView -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setSavedViews mcall
call src/lib/features/tasks/tasks.service.ts:226 in duplicateTaskView -> src/lib/features/tasks/tasks.service.ts:writeTasksViewState call
call src/lib/features/tasks/tasks.service.ts:239 in deleteTaskView -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setSavedViews mcall
call src/lib/features/tasks/tasks.service.ts:240 in deleteTaskView -> src/lib/features/tasks/tasks.service.ts:showList call
call src/lib/features/tasks/tasks.service.ts:241 in deleteTaskView -> src/lib/features/tasks/tasks.service.ts:writeTasksViewState call
call src/lib/features/tasks/tasks.service.ts:247 in setTaskExcludes -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setGlobalExcludes mcall
call src/lib/features/tasks/tasks.service.ts:248 in setTaskExcludes -> src/lib/features/tasks/tasks.service.ts:writeTasksViewState call
call src/lib/features/tasks/tasks.service.ts:289 in setTaskStatus -> src/lib/features/tasks/tasks.service.ts:dismissStatusUndo call
call src/lib/features/tasks/tasks.service.ts:292 in setTaskStatus -> src/lib/features/tasks/tasks.service.ts:preflightTaskWrite call
call src/lib/features/tasks/tasks.service.ts:293 in setTaskStatus -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/tasks/tasks.service.ts:296 in setTaskStatus -> src/lib/contracts/ipc.ts:call call
call src/lib/features/tasks/tasks.service.ts:304 in setTaskStatus -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.takePromptIndexRefresh mcall +1
call src/lib/features/tasks/tasks.service.ts:309 in setTaskStatus -> src/lib/features/tasks/tasks.service.ts:refreshAfterRefusal call
call src/lib/features/tasks/tasks.service.ts:316 in setTaskStatus -> src/lib/features/tasks/tasks.service.ts:afterTaskWrite call
call src/lib/features/tasks/tasks.service.ts:324 in setTaskStatus -> src/lib/utils/debug.ts:error call
call src/lib/features/tasks/tasks.service.ts:344 in preflightTaskWrite -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/features/tasks/tasks.service.ts:345 in preflightTaskWrite -> src/lib/features/tasks/tasks.service.ts:lineAt call +1
call src/lib/features/tasks/tasks.service.ts:346 in preflightTaskWrite -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/features/tasks/tasks.service.ts:352 in preflightTaskWrite -> src/lib/features/tasks/tasks.service.ts:refreshAfterRefusal call
call src/lib/features/tasks/tasks.service.ts:382 in updateTask -> src/lib/features/tasks/tasks.service.ts:dismissStatusUndo call
call src/lib/features/tasks/tasks.service.ts:386 in updateTask -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/features/tasks/tasks.service.ts:388 in updateTask -> src/lib/features/tasks/tasks.service.ts:preflightTaskWrite call
call src/lib/features/tasks/tasks.service.ts:389 in updateTask -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/tasks/tasks.service.ts:392 in updateTask -> src/lib/contracts/ipc.ts:call call
call src/lib/features/tasks/tasks.service.ts:401 in updateTask -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.takePromptIndexRefresh mcall +1
call src/lib/features/tasks/tasks.service.ts:406 in updateTask -> src/lib/features/tasks/tasks.service.ts:refreshAfterRefusal call
call src/lib/features/tasks/tasks.service.ts:411 in updateTask -> src/lib/features/tasks/tasks.service.ts:afterTaskWrite call
call src/lib/features/tasks/tasks.service.ts:420 in updateTask -> src/lib/utils/debug.ts:error call
call src/lib/features/tasks/tasks.service.ts:428 in toggleTask -> src/lib/features/tasks/task-status.logic.ts:toggleTarget call
call src/lib/features/tasks/tasks.service.ts:428 in toggleTask -> src/lib/features/tasks/tasks.service.ts:setTaskStatus call
call src/lib/features/tasks/tasks.service.ts:450 in setTaskStatusFromMenu -> src/lib/features/tasks/tasks.service.ts:setTaskStatus call +1
call src/lib/features/tasks/tasks.service.ts:451 in setTaskStatusFromMenu -> src/lib/features/tasks/task-status.logic.ts:statusMenuLabel call
call src/lib/features/tasks/tasks.service.ts:451 in setTaskStatusFromMenu -> src/lib/features/tasks/tasks.service.ts:holdUndoToast call
call src/lib/features/tasks/tasks.service.ts:465 in updateTaskFromMenu -> src/lib/features/tasks/tasks.service.ts:updateTask call +1
call src/lib/features/tasks/tasks.service.ts:466 in updateTaskFromMenu -> src/lib/features/tasks/tasks.service.ts:holdUndoToast call
call src/lib/features/tasks/tasks.service.ts:481 in holdUndoToast -> src/lib/features/tasks/tasks.service.ts:dismissStatusUndo call
call src/lib/features/tasks/tasks.service.ts:483 in holdUndoToast -> src/lib/features/tasks/tasks.logic.ts:taskDisplayText call
call src/lib/features/tasks/tasks.service.ts:514 in afterTaskWrite -> src/lib/core/filesystem/task-write.service.ts:settleTaskWrite call
call src/lib/features/tasks/tasks.service.ts:515 in afterTaskWrite -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/tasks.service.ts:524 in afterTaskWrite -> src/lib/features/tasks/tasks.service.ts:buildTaskIndex call
call src/lib/features/tasks/tasks.service.ts:536 in refreshAfterRefusal -> src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey call
call src/lib/features/tasks/tasks.service.ts:537 in refreshAfterRefusal -> src/lib/core/vault/vault-entries.service.ts:invalidateVaultEntries call
call src/lib/features/tasks/tasks.service.ts:538 in refreshAfterRefusal -> src/lib/features/tasks/tasks.service.ts:buildTaskIndex call
call src/lib/features/tasks/tasks.service.ts:548 in openTasksTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/tasks/tasks.service.ts:550 in openTasksTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/features/tasks/tasks.service.ts:553 in openTasksTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.addTab mcall
call src/lib/features/tasks/tasks.service.ts:564 in closeTasksTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/tasks/tasks.service.ts:566 in closeTasksTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/features/tasks/tasks.service.ts:572 in toggleTasksTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/features/tasks/tasks.service.ts:574 in toggleTasksTab -> src/lib/features/tasks/tasks.service.ts:openTasksTab call
call src/lib/features/tasks/tasks.service.ts:576 in toggleTasksTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/features/tasks/tasks.service.ts:578 in toggleTasksTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/features/tasks/tasks.service.ts:592 in resetTasks -> src/lib/features/tasks/tasks.service.ts:dismissStatusUndo call
call src/lib/features/tasks/tasks.service.ts:593 in resetTasks -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.reset mcall
call src/lib/features/tasks/tasks.service.ts:594 in resetTasks -> src/lib/features/tasks/tasks.service.ts:closeTasksTab call
## effects
ipc-call src/lib/features/tasks/tasks.service.ts:296 in setTaskStatus -> ipc:toggle_task_status -> src-tauri/src/commands/vault.rs:733
ipc-call src/lib/features/tasks/tasks.service.ts:392 in updateTask -> ipc:write_task_text -> src-tauri/src/commands/vault.rs:956
