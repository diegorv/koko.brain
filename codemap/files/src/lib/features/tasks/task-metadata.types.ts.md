# file card src/lib/features/tasks/task-metadata.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/task-metadata.types.ts ' codemap/files
file src/lib/features/tasks/task-metadata.types.ts types L1 module src/lib/features/tasks in7 t0
## imports
imp src/lib/features/tasks/task-metadata.types.ts:1 -> src/lib/contracts/index.ts type:TaskPriority,type:TaskStatus,type:RecurrenceRule,type:TaskMetadata
## imported-by
imp src/lib/features/tasks/TasksView.svelte:84 -> src/lib/features/tasks/task-metadata.types.ts type:TaskPriority,type:TaskStatus
imp src/lib/features/tasks/task-query.logic.ts:8 -> src/lib/features/tasks/task-metadata.types.ts type:TaskMetadata,type:TaskPriority,type:TaskStatus
imp src/lib/features/tasks/task-row-edit.logic.ts:3 -> src/lib/features/tasks/task-metadata.types.ts type:TaskPriority
imp src/lib/features/tasks/task-status.logic.ts:1 -> src/lib/features/tasks/task-metadata.types.ts type:TaskStatus
imp src/lib/features/tasks/tasks.logic.ts:5 -> src/lib/features/tasks/task-metadata.types.ts type:TaskMetadata
imp src/lib/features/tasks/tasks.service.ts:16 -> src/lib/features/tasks/task-metadata.types.ts type:TaskMetadata,type:TaskStatus
imp src/lib/features/tasks/tasks.types.ts:1 -> src/lib/features/tasks/task-metadata.types.ts type:TaskMetadata,type:TaskStatus
## reach
in2 src/lib/features/tasks/task-metadata.types.ts 9 files in 3 modules: src/lib/app(4) src/lib/features/tasks(4) src/lib/features/event-calendar(1)
out2 src/lib/features/tasks/task-metadata.types.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/features/tasks/TasksView.filters.test.ts imports-type src/lib/features/tasks/task-metadata.types.ts
test src/tests/lib/features/tasks/TasksView.row-edit.test.ts imports-type src/lib/features/tasks/task-metadata.types.ts
test src/tests/lib/features/tasks/TasksView.row-menu.test.ts imports-type src/lib/features/tasks/task-metadata.types.ts
test src/tests/lib/features/tasks/TasksView.test.ts imports-type src/lib/features/tasks/task-metadata.types.ts
test src/tests/lib/features/tasks/task-query.logic.test.ts imports-type src/lib/features/tasks/task-metadata.types.ts
test src/tests/lib/features/tasks/task-status.logic.test.ts imports-type src/lib/features/tasks/task-metadata.types.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports-type src/lib/features/tasks/task-metadata.types.ts
## symbols
sym src/lib/features/tasks/task-metadata.types.ts:1 reexport RecurrenceRule = dto:RecurrenceRule L1
sym src/lib/features/tasks/task-metadata.types.ts:1 reexport TaskMetadata = dto:TaskMetadata L1
sym src/lib/features/tasks/task-metadata.types.ts:1 reexport TaskPriority = dto:TaskPriority L1
sym src/lib/features/tasks/task-metadata.types.ts:1 reexport TaskStatus = dto:TaskStatus L1
