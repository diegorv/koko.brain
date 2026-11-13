# file card src/lib/features/rail-shell/list-fulltext.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-fulltext.service.ts ' codemap/files
file src/lib/features/rail-shell/list-fulltext.service.ts service L34 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/list-fulltext.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/features/rail-shell/list-fulltext.service.ts:2 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:79 -> src/lib/features/rail-shell/list-fulltext.service.ts searchListFullText
## reach
in2 src/lib/features/rail-shell/list-fulltext.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-fulltext.service.ts 5 files in 3 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/utils(1)
## tests
test src/tests/lib/features/rail-shell/list-fulltext.service.test.ts imports src/lib/features/rail-shell/list-fulltext.service.ts mirror
## symbols
sym src/lib/features/rail-shell/list-fulltext.service.ts:20 fn searchListFullText(query: string, vaultPath: string): Promise<Set<string>> L15 | Returns the absolute paths of notes whose full text matches `query`, for the rail list search.
by src/lib/features/rail-shell/list-fulltext.service.ts:searchListFullText <- src/lib/features/rail-shell/RailNoteList.svelte:542 in runFullText call
## calls
call src/lib/features/rail-shell/list-fulltext.service.ts:24 in searchListFullText -> src/lib/contracts/ipc.ts:call call
call src/lib/features/rail-shell/list-fulltext.service.ts:31 in searchListFullText -> src/lib/utils/debug.ts:error call
## effects
ipc-call src/lib/features/rail-shell/list-fulltext.service.ts:24 in searchListFullText -> ipc:search_fts -> src-tauri/src/commands/search_index.rs:153
