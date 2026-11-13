# file card src/lib/features/tasks/tasks.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/tasks.types.ts ' codemap/files
file src/lib/features/tasks/tasks.types.ts types L25 module src/lib/features/tasks in5 t0
## imports
imp src/lib/features/tasks/tasks.types.ts:1 -> src/lib/features/tasks/task-metadata.types.ts type:TaskMetadata,type:TaskStatus
## imported-by
imp src/lib/features/tasks/TasksView.svelte:85 -> src/lib/features/tasks/tasks.types.ts type:TaskItem
imp src/lib/features/tasks/task-query.logic.ts:11 -> src/lib/features/tasks/tasks.types.ts type:TaskItem
imp src/lib/features/tasks/tasks.logic.ts:6 -> src/lib/features/tasks/tasks.types.ts type:TaskItem
imp src/lib/features/tasks/tasks.service.ts:17 -> src/lib/features/tasks/tasks.types.ts type:TaskItem
imp src/lib/features/tasks/tasks.store.svelte.ts:21 -> src/lib/features/tasks/tasks.types.ts type:TaskRowRef
## reach
in2 src/lib/features/tasks/tasks.types.ts 7 files in 2 modules: src/lib/app(4) src/lib/features/tasks(3)
out2 src/lib/features/tasks/tasks.types.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/tasks/task-query.logic.test.ts imports-type src/lib/features/tasks/tasks.types.ts
test src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts imports-type src/lib/features/tasks/tasks.types.ts
test src/tests/lib/features/tasks/tasks.logic.test.ts imports-type src/lib/features/tasks/tasks.types.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports-type src/lib/features/tasks/tasks.types.ts
## symbols
sym src/lib/features/tasks/tasks.types.ts:4 interface TaskItem L14 | Represents a single task extracted from a markdown file
by src/lib/features/tasks/tasks.types.ts:TaskItem <- src/lib/features/tasks/TasksView.svelte:85 in (script) import
by src/lib/features/tasks/tasks.types.ts:TaskItem <- src/lib/features/tasks/task-query.logic.ts:11 in (module) import
by src/lib/features/tasks/tasks.types.ts:TaskItem <- src/lib/features/tasks/tasks.logic.ts:6 in (module) import
by src/lib/features/tasks/tasks.types.ts:TaskItem <- src/lib/features/tasks/tasks.service.ts:17 in (module) import
sym src/lib/features/tasks/tasks.types.ts:20 interface TaskRowRef L6 | A task row in the Tasks view, identified by its note and line.
by src/lib/features/tasks/tasks.types.ts:TaskRowRef <- src/lib/features/tasks/tasks.store.svelte.ts:21 in (module) import
