# file card src/lib/features/tasks/tasks-keys.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/tasks-keys.logic.ts ' codemap/files
file src/lib/features/tasks/tasks-keys.logic.ts logic L112 module src/lib/features/tasks in3 t1 | The Tasks view's keyboard model: which action a key on a row maps to, which row stays current when the list changes, and which row holds the tab stop.
## imported-by
imp src/lib/features/tasks/TasksView.svelte:83 -> src/lib/features/tasks/tasks-keys.logic.ts nextCurrentRow,resolveTaskKey,tabStopRow,taskRowKey
imp src/lib/features/tasks/task-query.logic.ts:9 -> src/lib/features/tasks/tasks-keys.logic.ts taskRowKey
imp src/lib/features/tasks/tasks.service.ts:14 -> src/lib/features/tasks/tasks-keys.logic.ts taskRowKey
## reach
in2 src/lib/features/tasks/tasks-keys.logic.ts 8 files in 2 modules: src/lib/app(4) src/lib/features/tasks(4)
out2 src/lib/features/tasks/tasks-keys.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/tasks/tasks-keys.logic.test.ts imports src/lib/features/tasks/tasks-keys.logic.ts mirror
## symbols
sym src/lib/features/tasks/tasks-keys.logic.ts:8 interface TaskKeyInput L20 | A keydown on the task list, as `resolveTaskKey` reads it.
sym src/lib/features/tasks/tasks-keys.logic.ts:30 type TaskKeyAction L1 | What the list does for a key: focus a row by index, toggle the row, open its note at the task's line, or open the row's menu.
sym src/lib/features/tasks/tasks-keys.logic.ts:33 fn taskRowKey(filePath: string, lineNumber: number): string L3 | The `<filePath>:<lineNumber>` key that identifies a task row.
by src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey <- src/lib/features/tasks/TasksView.svelte:307 in rowsByKey=$derived call +7
by src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey <- src/lib/features/tasks/task-query.logic.ts:252 in buildTaskRows call +4
by src/lib/features/tasks/tasks-keys.logic.ts:taskRowKey <- src/lib/features/tasks/tasks.service.ts:515 in afterTaskWrite call +1
sym src/lib/features/tasks/tasks-keys.logic.ts:46 fn resolveTaskKey(input: TaskKeyInput): TaskKeyAction | null L22 | Maps a keydown on the task list to an action, or null when the list leaves the key alone: a key on a control inside the row (it keeps its native click), any mo…
by src/lib/features/tasks/tasks-keys.logic.ts:resolveTaskKey <- src/lib/features/tasks/TasksView.svelte:394 in handleListKeydown call
sym src/lib/features/tasks/tasks-keys.logic.ts:75 fn nextCurrentRow(order: string[], prevOrder: string[], current: string | null): string | null L14 | The current row after the list changed from `prevOrder` to `order`: `current` when it is still listed, else the first row after it in `prevOrder` that is still…
by src/lib/features/tasks/tasks-keys.logic.ts:nextCurrentRow <- src/lib/features/tasks/TasksView.svelte:458 in $effect@448 call +1
sym src/lib/features/tasks/tasks-keys.logic.ts:101 fn tabStopRow(rendered: string[], order: string[], current: string | null): string | null L12 | The row that holds the list's tab stop: `current` when it is rendered.
by src/lib/features/tasks/tasks-keys.logic.ts:tabStopRow <- src/lib/features/tasks/TasksView.svelte:333 in tabStopKey=$derived call +2
