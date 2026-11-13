# file card src/lib/features/tasks/task-status.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/task-status.logic.ts ' codemap/files
file src/lib/features/tasks/task-status.logic.ts logic L70 module src/lib/features/tasks in6 t4
## imports
imp src/lib/features/tasks/task-status.logic.ts:1 -> src/lib/features/tasks/task-metadata.types.ts type:TaskStatus
## imported-by
imp src/lib/features/event-calendar/EventTaskChip.svelte:5 -> src/lib/features/tasks/task-status.logic.ts isTaskOpen
imp src/lib/features/tasks/TasksView.svelte:73 -> src/lib/features/tasks/task-status.logic.ts ROW_MENU_STATUSES,TASK_STATUSES,statusGlyph,statusMenuLabel,toggleTarget,type:StatusGlyphIcon
imp src/lib/features/tasks/task-query.logic.ts:7 -> src/lib/features/tasks/task-status.logic.ts TASK_STATUSES,isTaskOpen,statusGlyph
imp src/lib/features/tasks/task-views.logic.ts:23 -> src/lib/features/tasks/task-status.logic.ts TASK_STATUSES
imp src/lib/features/tasks/tasks.logic.ts:4 -> src/lib/features/tasks/task-status.logic.ts isTaskOpen
imp src/lib/features/tasks/tasks.service.ts:12 -> src/lib/features/tasks/task-status.logic.ts statusMenuLabel,toggleTarget
## reach
in2 src/lib/features/tasks/task-status.logic.ts 9 files in 3 modules: src/lib/app(4) src/lib/features/tasks(3) src/lib/features/event-calendar(2)
out2 src/lib/features/tasks/task-status.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/tasks/task-status.logic.test.ts imports src/lib/features/tasks/task-status.logic.ts mirror
test src/tests/fixtures/tasks.fixture.ts imports src/lib/features/tasks/task-status.logic.ts
test src/tests/lib/features/tasks/TasksView.test.ts imports src/lib/features/tasks/task-status.logic.ts
test src/tests/lib/features/tasks/tasks.logic.test.ts imports src/lib/features/tasks/task-status.logic.ts
## symbols
sym src/lib/features/tasks/task-status.logic.ts:7 const TASK_STATUSES: readonly TaskStatus[] L1 | Every task status in the Tasks view's order, open statuses first.
by src/lib/features/tasks/task-status.logic.ts:TASK_STATUSES <- src/lib/features/tasks/TasksView.svelte:626 in (markup) markup
by src/lib/features/tasks/task-status.logic.ts:TASK_STATUSES <- src/lib/features/tasks/task-query.logic.ts:204 in toggleQuickStatus mcall +1
by src/lib/features/tasks/task-status.logic.ts:TASK_STATUSES <- src/lib/features/tasks/task-views.logic.ts:270 in parseQuick ref
sym src/lib/features/tasks/task-status.logic.ts:14 fn isTaskOpen(status: TaskStatus): boolean L3 | Whether a task in `status` is open: done and cancelled are closed, every other status is open.
by src/lib/features/tasks/task-status.logic.ts:isTaskOpen <- src/lib/features/event-calendar/EventTaskChip.svelte:18 in closed=$derived call
by src/lib/features/tasks/task-status.logic.ts:isTaskOpen <- src/lib/features/tasks/task-query.logic.ts:281 in buildTaskRows call
by src/lib/features/tasks/task-status.logic.ts:isTaskOpen <- src/lib/features/tasks/tasks.logic.ts:204 in noteTaskCounts call
sym src/lib/features/tasks/task-status.logic.ts:22 fn toggleTarget(status: TaskStatus): TaskStatus L3 | The status a Tasks-list click writes for a task now in `status`: a closed task reopens to `todo`, an open one completes to `done`.
by src/lib/features/tasks/task-status.logic.ts:toggleTarget <- src/lib/features/tasks/TasksView.svelte:823 in (markup) markup
by src/lib/features/tasks/task-status.logic.ts:toggleTarget <- src/lib/features/tasks/tasks.service.ts:428 in toggleTask call
sym src/lib/features/tasks/task-status.logic.ts:27 type StatusGlyphIcon L8 | Lucide icon name of a status glyph; the view maps each to its component.
by src/lib/features/tasks/task-status.logic.ts:StatusGlyphIcon <- src/lib/features/tasks/TasksView.svelte:79 in (script) import
sym src/lib/features/tasks/task-status.logic.ts:37 interface StatusGlyph L8 | How the Tasks view draws and names a status
sym src/lib/features/tasks/task-status.logic.ts:57 fn statusGlyph(status: TaskStatus): StatusGlyph L3 | The glyph the Tasks view draws for `status`.
by src/lib/features/tasks/task-status.logic.ts:statusGlyph <- src/lib/features/tasks/TasksView.svelte:632 in (markup) markup +1
by src/lib/features/tasks/task-status.logic.ts:statusGlyph <- src/lib/features/tasks/task-query.logic.ts:1099 in flatGrouping call +1
sym src/lib/features/tasks/task-status.logic.ts:62 const ROW_MENU_STATUSES: readonly TaskStatus[] L3 | The statuses a task row's menu can set, in `TASK_STATUSES` order.
by src/lib/features/tasks/task-status.logic.ts:ROW_MENU_STATUSES <- src/lib/features/tasks/TasksView.svelte:684 in (markup) markup
sym src/lib/features/tasks/task-status.logic.ts:67 fn statusMenuLabel(status: TaskStatus): string L4 | The status word with its first letter capitalized, as the row menu and its Undo toast name it.
by src/lib/features/tasks/task-status.logic.ts:statusMenuLabel <- src/lib/features/tasks/TasksView.svelte:685 in (markup) markup
by src/lib/features/tasks/task-status.logic.ts:statusMenuLabel <- src/lib/features/tasks/tasks.service.ts:451 in setTaskStatusFromMenu call
## calls
call src/lib/features/tasks/task-status.logic.ts:23 in toggleTarget -> src/lib/features/tasks/task-status.logic.ts:isTaskOpen call
call src/lib/features/tasks/task-status.logic.ts:68 in statusMenuLabel -> src/lib/features/tasks/task-status.logic.ts:statusGlyph call
