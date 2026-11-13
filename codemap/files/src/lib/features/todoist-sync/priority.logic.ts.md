# file card src/lib/features/todoist-sync/priority.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/priority.logic.ts ' codemap/files
file src/lib/features/todoist-sync/priority.logic.ts logic L46 module src/lib/features/todoist-sync in3 t1
## imports
imp src/lib/features/todoist-sync/priority.logic.ts:1 -> src/lib/contracts/index.ts type:TaskPriority
## imported-by
imp src/lib/features/todoist-sync/create.logic.ts:12 -> src/lib/features/todoist-sync/priority.logic.ts mapPriorityToTodoist
imp src/lib/features/todoist-sync/fields.logic.ts:12 -> src/lib/features/todoist-sync/priority.logic.ts mapPriorityFromTodoist,mapPriorityToTodoist
imp src/lib/features/todoist-sync/pull.logic.ts:12 -> src/lib/features/todoist-sync/priority.logic.ts mapPriorityFromTodoist
## reach
in2 src/lib/features/todoist-sync/priority.logic.ts 9 files in 1 modules: src/lib/features/todoist-sync(9)
out2 src/lib/features/todoist-sync/priority.logic.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/features/todoist-sync/priority.logic.test.ts imports src/lib/features/todoist-sync/priority.logic.ts mirror
## symbols
sym src/lib/features/todoist-sync/priority.logic.ts:14 fn mapPriorityToTodoist(priority?: TaskPriority): number L15 | Maps our 5-level priority to Todoist's 4-level priority.
by src/lib/features/todoist-sync/priority.logic.ts:mapPriorityToTodoist <- src/lib/features/todoist-sync/create.logic.ts:242 in addArgs call
by src/lib/features/todoist-sync/priority.logic.ts:mapPriorityToTodoist <- src/lib/features/todoist-sync/fields.logic.ts:300 in planLink call +2
sym src/lib/features/todoist-sync/priority.logic.ts:35 fn mapPriorityFromTodoist(priority: number): TaskPriority | null L12 | Maps a Todoist priority back to ours, the inverse of mapPriorityToTodoist for 4, 3 and 2.
by src/lib/features/todoist-sync/priority.logic.ts:mapPriorityFromTodoist <- src/lib/features/todoist-sync/fields.logic.ts:305 in planLink call
by src/lib/features/todoist-sync/priority.logic.ts:mapPriorityFromTodoist <- src/lib/features/todoist-sync/pull.logic.ts:358 in pulledTask call
