# file card src/lib/features/tasks/TaskLists.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/TaskLists.svelte ' codemap/files
file src/lib/features/tasks/TaskLists.svelte component L294 module src/lib/features/tasks in1 t0
## imports
imp src/lib/features/tasks/TaskLists.svelte:6 -> src/lib/components/ui/dropdown-menu/index.ts *
imp src/lib/features/tasks/TaskLists.svelte:7 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/tasks/TaskLists.svelte:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/tasks/TaskLists.svelte:9 -> src/lib/utils/date.ts formatNow
imp src/lib/features/tasks/TaskLists.svelte:10 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/features/tasks/TaskLists.svelte:11 -> src/lib/features/tasks/tasks.service.ts deleteTaskView,duplicateTaskView,renameTaskView,revertTaskList,saveTaskView,saveTaskViewQuery,selectTaskList
imp src/lib/features/tasks/TaskLists.svelte:20 -> src/lib/features/tasks/task-query.logic.ts isQueryModified
imp src/lib/features/tasks/TaskLists.svelte:21 -> src/lib/features/tasks/task-views.logic.ts BUILT_IN_TASK_VIEWS,findTaskView,isBuiltInTaskView,taskViewCount
## imported-by
imp src/lib/features/tasks/TasksView.svelte:35 -> src/lib/features/tasks/TaskLists.svelte default
## reach
in2 src/lib/features/tasks/TaskLists.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/tasks/TaskLists.svelte 39 files in 10 modules: src/lib/components(18) src/lib/features/tasks(6) src/lib/core/editor(3) src/lib/core/settings(3) src/lib/utils(3) +5 modules
## symbols
sym src/lib/features/tasks/TaskLists.svelte:1 component TaskLists props:variant L294
by src/lib/features/tasks/TaskLists.svelte:default <- src/lib/features/tasks/TasksView.svelte:1074 in (markup) mount +2
## locals
local src/lib/features/tasks/TaskLists.svelte:77 fn startEditing(next: NonNullable<typeof editing>, initial: string) L7
local src/lib/features/tasks/TaskLists.svelte:86 fn commit() L5
local src/lib/features/tasks/TaskLists.svelte:96 fn focusList(id: string | null) L4
local src/lib/features/tasks/TaskLists.svelte:106 fn close(id: string | null) L9
local src/lib/features/tasks/TaskLists.svelte:121 fn afterMarkerAction(action: () => unknown) L7
local src/lib/features/tasks/TaskLists.svelte:137 fn deleteView(id: string) L5
local src/lib/features/tasks/TaskLists.svelte:143 fn handleKeydown(e: KeyboardEvent) L9
local src/lib/features/tasks/TaskLists.svelte:154 fn handleCloseFocus(e: Event) L5
## mounts
mount src/lib/features/tasks/TaskLists.svelte:162 Input -> src/lib/components/ui/input/input.svelte
## mounted-at
mount src/lib/features/tasks/TasksView.svelte:1074 TaskLists -> src/lib/features/tasks/TaskLists.svelte
mount src/lib/features/tasks/TasksView.svelte:1077 TaskLists -> src/lib/features/tasks/TaskLists.svelte
mount src/lib/features/tasks/TasksView.svelte:1102 TaskLists -> src/lib/features/tasks/TaskLists.svelte
## calls
call src/lib/features/tasks/TaskLists.svelte:39 in activeView=$derived -> src/lib/features/tasks/task-views.logic.ts:findTaskView call
call src/lib/features/tasks/TaskLists.svelte:44 in modified=$derived -> src/lib/features/tasks/task-query.logic.ts:isQueryModified call
call src/lib/features/tasks/TaskLists.svelte:55 in savedCounts=$derived -> src/lib/utils/date.ts:formatNow call
call src/lib/features/tasks/TaskLists.svelte:61 in savedCounts=$derived -> src/lib/features/tasks/task-views.logic.ts:taskViewCount call
call src/lib/features/tasks/TaskLists.svelte:88 in commit -> src/lib/features/tasks/tasks.service.ts:renameTaskView call
call src/lib/features/tasks/TaskLists.svelte:88 in commit -> src/lib/features/tasks/tasks.service.ts:saveTaskView call
call src/lib/features/tasks/TaskLists.svelte:89 in commit -> src/lib/features/tasks/TaskLists.svelte:close call
call src/lib/features/tasks/TaskLists.svelte:108 in close -> src/lib/features/tasks/TaskLists.svelte:afterMarkerAction call
call src/lib/features/tasks/TaskLists.svelte:113 in close -> src/lib/features/tasks/TaskLists.svelte:focusList call
call src/lib/features/tasks/TaskLists.svelte:138 in deleteView -> src/lib/features/tasks/tasks.service.ts:deleteTaskView call
call src/lib/features/tasks/TaskLists.svelte:140 in deleteView -> src/lib/features/tasks/TaskLists.svelte:focusList call
call src/lib/features/tasks/TaskLists.svelte:146 in handleKeydown -> src/lib/features/tasks/TaskLists.svelte:commit call
call src/lib/features/tasks/TaskLists.svelte:149 in handleKeydown -> src/lib/features/tasks/TaskLists.svelte:close call
call src/lib/features/tasks/TaskLists.svelte:169 in (markup) -> src/lib/features/tasks/TaskLists.svelte:handleKeydown markup
call src/lib/features/tasks/TaskLists.svelte:192 in (markup) -> src/lib/features/tasks/tasks.service.ts:selectTaskList markup +1
call src/lib/features/tasks/TaskLists.svelte:201 in (markup) -> src/lib/features/tasks/task-views.logic.ts:isBuiltInTaskView markup +1
call src/lib/features/tasks/TaskLists.svelte:215 in (markup) -> src/lib/features/tasks/TaskLists.svelte:handleCloseFocus markup +1
call src/lib/features/tasks/TaskLists.svelte:216 in (markup) -> src/lib/features/tasks/TaskLists.svelte:startEditing markup +3
call src/lib/features/tasks/TaskLists.svelte:217 in (markup) -> src/lib/features/tasks/tasks.service.ts:duplicateTaskView markup
call src/lib/features/tasks/TaskLists.svelte:220 in (markup) -> src/lib/features/tasks/TaskLists.svelte:deleteView markup
call src/lib/features/tasks/TaskLists.svelte:253 in (markup) -> src/lib/features/tasks/TaskLists.svelte:afterMarkerAction markup +2
call src/lib/features/tasks/TaskLists.svelte:253 in (markup) -> src/lib/features/tasks/tasks.service.ts:revertTaskList markup +1
call src/lib/features/tasks/TaskLists.svelte:255 in (markup) -> src/lib/features/tasks/tasks.service.ts:saveTaskViewQuery markup
## effects
fx src/lib/features/tasks/TaskLists.svelte:130 svelte.$effect in (script)
