# file card src/lib/features/todoist-sync/tauri-fetch-adapter.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/todoist-sync/tauri-fetch-adapter.ts ' codemap/files
file src/lib/features/todoist-sync/tauri-fetch-adapter.ts other L26 module src/lib/features/todoist-sync in1 t2
## imports
imp src/lib/features/todoist-sync/tauri-fetch-adapter.ts:1 -> pkg:@tauri-apps/plugin-http fetch
## imported-by
imp src/lib/features/todoist-sync/todoist-client.ts:2 -> src/lib/features/todoist-sync/tauri-fetch-adapter.ts createTauriFetchAdapter
## reach
in2 src/lib/features/todoist-sync/tauri-fetch-adapter.ts 2 files in 1 modules: src/lib/features/todoist-sync(2)
out2 src/lib/features/todoist-sync/tauri-fetch-adapter.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/todoist-sync/tauri-fetch-adapter.test.ts imports src/lib/features/todoist-sync/tauri-fetch-adapter.ts mirror
test src/tests/lib/features/todoist-sync/todoist-client.test.ts mocks src/lib/features/todoist-sync/tauri-fetch-adapter.ts
## symbols
sym src/lib/features/todoist-sync/tauri-fetch-adapter.ts:11 fn createTauriFetchAdapter(): CustomFetch L16 | Creates a CustomFetch adapter for Tauri's HTTP plugin.
by src/lib/features/todoist-sync/tauri-fetch-adapter.ts:createTauriFetchAdapter <- src/lib/features/todoist-sync/todoist-client.ts:10 in createTodoistClient call
## effects
fx src/lib/features/todoist-sync/tauri-fetch-adapter.ts:16 tauri-http.fetch in createTauriFetchAdapter
