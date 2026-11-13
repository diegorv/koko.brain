# file card src/lib/features/tasks/task-row-edit.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/tasks/task-row-edit.logic.ts ' codemap/files
file src/lib/features/tasks/task-row-edit.logic.ts logic L38 module src/lib/features/tasks in1 t2
## imports
imp src/lib/features/tasks/task-row-edit.logic.ts:1 -> src/lib/utils/date.ts formatDateWithOffset
imp src/lib/features/tasks/task-row-edit.logic.ts:2 -> src/lib/utils/task-tokens.ts type:PriorityEmoji
imp src/lib/features/tasks/task-row-edit.logic.ts:3 -> src/lib/features/tasks/task-metadata.types.ts type:TaskPriority
## imported-by
imp src/lib/features/tasks/TasksView.svelte:81 -> src/lib/features/tasks/task-row-edit.logic.ts priorityMenuLabel,prioritySignifier,resolveDuePreset,type:DuePreset
## reach
in2 src/lib/features/tasks/task-row-edit.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/tasks/task-row-edit.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/tasks/task-row-edit.logic.test.ts imports src/lib/features/tasks/task-row-edit.logic.ts mirror
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/features/tasks/task-row-edit.logic.ts
## symbols
sym src/lib/features/tasks/task-row-edit.logic.ts:6 type DuePreset L1 | The row menu's Due presets.
by src/lib/features/tasks/task-row-edit.logic.ts:DuePreset <- src/lib/features/tasks/TasksView.svelte:81 in (script) import
sym src/lib/features/tasks/task-row-edit.logic.ts:14 fn resolveDuePreset(preset: DuePreset, today: string): string L3 | The `YYYY-MM-DD` due date a Due preset sets: today, tomorrow, or today + 7 days.
by src/lib/features/tasks/task-row-edit.logic.ts:resolveDuePreset <- src/lib/features/tasks/TasksView.svelte:693 in (markup) markup
sym src/lib/features/tasks/task-row-edit.logic.ts:22 const PRIORITY_SIGNIFIERS: Record<Exclude<TaskPriority, 'none'>, PriorityEmoji> L7 | The signifier of each priority level, as the Rust parser reads them (`PRIORITY_EMOJIS`).
sym src/lib/features/tasks/task-row-edit.logic.ts:31 fn prioritySignifier(priority: TaskPriority): PriorityEmoji | null L3 | The signifier `setPriorityToken` writes for `priority`; null for `none`, which removes it.
by src/lib/features/tasks/task-row-edit.logic.ts:prioritySignifier <- src/lib/features/tasks/TasksView.svelte:562 in pickRowPriority call
sym src/lib/features/tasks/task-row-edit.logic.ts:36 fn priorityMenuLabel(priority: TaskPriority): string L3 | A priority's row menu label and toast word: the level, capitalized (`None` for none).
by src/lib/features/tasks/task-row-edit.logic.ts:priorityMenuLabel <- src/lib/features/tasks/TasksView.svelte:563 in pickRowPriority call +1
## calls
call src/lib/features/tasks/task-row-edit.logic.ts:15 in resolveDuePreset -> src/lib/utils/date.ts:formatDateWithOffset call
