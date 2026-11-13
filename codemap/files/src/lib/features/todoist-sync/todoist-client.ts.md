# file card src/lib/features/todoist-sync/todoist-client.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/todoist-client.ts ' codemap/files
file src/lib/features/todoist-sync/todoist-client.ts other L12 module src/lib/features/todoist-sync in2 t2
## imports
imp src/lib/features/todoist-sync/todoist-client.ts:2 -> src/lib/features/todoist-sync/tauri-fetch-adapter.ts createTauriFetchAdapter
## imported-by
imp src/lib/features/todoist-sync/sync-now.service.ts:90 -> src/lib/features/todoist-sync/todoist-client.ts createTodoistClient
imp src/lib/features/todoist-sync/todoist-sync.service.ts:13 -> src/lib/features/todoist-sync/todoist-client.ts createTodoistClient
## reach
in2 src/lib/features/todoist-sync/todoist-client.ts 3 files in 2 modules: src/lib/features/todoist-sync(2) src/lib/app(1)
out2 src/lib/features/todoist-sync/todoist-client.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/todoist-sync/todoist-client.test.ts imports src/lib/features/todoist-sync/todoist-client.ts mirror
test src/tests/lib/features/todoist-sync/todoist-sync.fake.test.ts imports src/lib/features/todoist-sync/todoist-client.ts
## symbols
sym src/lib/features/todoist-sync/todoist-client.ts:8 fn createTodoistClient(token: string): TodoistApi L5 | Creates a TodoistApi client configured with Tauri's HTTP plugin.
by src/lib/features/todoist-sync/todoist-client.ts:createTodoistClient <- src/lib/features/todoist-sync/sync-now.service.ts:311 in cycle call
by src/lib/features/todoist-sync/todoist-client.ts:createTodoistClient <- src/lib/features/todoist-sync/todoist-sync.service.ts:26 in fetchRootProjectChoices call +1
## calls
call src/lib/features/todoist-sync/todoist-client.ts:10 in createTodoistClient -> src/lib/features/todoist-sync/tauri-fetch-adapter.ts:createTauriFetchAdapter call
