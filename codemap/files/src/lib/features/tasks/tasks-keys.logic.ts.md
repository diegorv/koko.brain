# file card src/lib/features/tasks/tasks-keys.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/tasks-keys.logic.ts ' codemap/files
file src/lib/features/tasks/tasks-keys.logic.ts logic L67 module src/lib/features/tasks in3 t1 | The Tasks view's keyboard model: which action a key on a row maps to, which row stays current when the list changes, and which row holds the tab stop.
## imports
imp src/lib/features/tasks/tasks-keys.logic.ts:9 -> src/lib/utils/roving-list.ts resolveRovingFocus
imp src/lib/features/tasks/tasks-keys.logic.ts:11 -> src/lib/utils/roving-list.ts nextCurrentRow,tabStopRow
## imported-by
imp src/lib/features/tasks/TasksView.svelte:83 -> src/lib/features/tasks/tasks-keys.logic.ts nextCurrentRow,resolveTaskKey,tabStopRow,taskRowKey
imp src/lib/features/tasks/task-query.logic.ts:9 -> src/lib/features/tasks/tasks-keys.logic.ts taskRowKey
imp src/lib/features/tasks/tasks.service.ts:14 -> src/lib/features/tasks/tasks-keys.logic.ts taskRowKey
## reach
in2 src/lib/features/tasks/tasks-keys.logic.ts 9 files in 2 modules: src/lib/app(5) src/lib/features/tasks(4)
out2 src/lib/features/tasks/tasks-keys.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/tasks/tasks-keys.logic.test.ts imports src/lib/features/tasks/tasks-keys.logic.ts mirror
## symbols
sym src/lib/features/tasks/tasks-keys.logic.ts:11 reexport nextCurrentRow = src/lib/utils/roving-list.ts:nextCurrentRow L1
sym src/lib/features/tasks/tasks-keys.logic.ts:11 reexport tabStopRow = src/lib/utils/roving-list.ts:tabStopRow L1
sym src/lib/features/tasks/tasks-keys.logic.ts:14 interface TaskKeyInput L20 | A keydown on the task list, as `resolveTaskKey` reads it.
sym src/lib/features/tasks/tasks-keys.logic.ts:36 type TaskKeyAction L1 | What the list does for a key: focus a row by index, toggle the row, open its note at the task's line, or open the row's menu.
sym src/lib/features/tasks/tasks-keys.logic.ts:39 fn taskRowKey(filePath: string, lineNumber: number): string L3 | The `<filePath>:<lineNumber>` key that identifies a task row.
by src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey <- src/lib/features/tasks/TasksView.svelte:315 in rowsByKey=$derived call +7
by src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey <- src/lib/features/tasks/task-query.logic.ts:252 in buildTaskRows call +4
by src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey <- src/lib/features/tasks/tasks.service.ts:515 in afterTaskWrite call +1
sym src/lib/features/tasks/tasks-keys.logic.ts:52 fn resolveTaskKey(input: TaskKeyInput): TaskKeyAction | null L16 | Maps a keydown on the task list to an action, or null when the list leaves the key alone: a key on a control inside the row (it keeps its native click), any mo…
by src/lib/features/tasks/tasks-keys.logic.ts:resolveTaskKey <- src/lib/features/tasks/TasksView.svelte:423 in handleListKeydown call
## calls
call src/lib/features/tasks/tasks-keys.logic.ts:57 in resolveTaskKey -> src/lib/utils/roving-list.ts:resolveRovingFocus call
