# file card src/lib/app/lifecycle/index-updater.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/lifecycle/index-updater.service.ts ' codemap/files
file src/lib/app/lifecycle/index-updater.service.ts service L44 module src/lib/app in1 t1
## imports
imp src/lib/app/lifecycle/index-updater.service.ts:1 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/app/lifecycle/index-updater.service.ts:2 -> src/lib/utils/debug.ts perfStart,perfEnd,perfBaseline
imp src/lib/app/lifecycle/index-updater.service.ts:3 -> src/lib/utils/index-dedupe.ts isAlreadyIndexed
## imported-by
imp src/routes/(app)/+layout.svelte:19 -> src/lib/app/lifecycle/index-updater.service.ts updateIndexesForFile
## reach
in2 src/lib/app/lifecycle/index-updater.service.ts 0 files in 0 modules: -
out2 src/lib/app/lifecycle/index-updater.service.ts 6 files in 3 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/utils(2)
## tests
test src/tests/lib/app/lifecycle/index-updater.service.test.ts imports src/lib/app/lifecycle/index-updater.service.ts mirror
## symbols
sym src/lib/app/lifecycle/index-updater.service.ts:24 fn updateIndexesForFile(filePath: string, content: string): Promise<void> L21 | Updates per-file indexes for a single file's content change.
by src/lib/app/lifecycle/index-updater.service.ts:updateIndexesForFile <- src/routes/(app)/+layout.svelte:162 in $effect@147 call
## calls
call src/lib/app/lifecycle/index-updater.service.ts:29 in updateIndexesForFile -> src/lib/utils/index-dedupe.ts:isAlreadyIndexed call
call src/lib/app/lifecycle/index-updater.service.ts:32 in updateIndexesForFile -> src/lib/utils/debug.ts:perfStart call
call src/lib/app/lifecycle/index-updater.service.ts:34 in updateIndexesForFile -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/app/lifecycle/index-updater.service.ts:42 in updateIndexesForFile -> src/lib/utils/debug.ts:perfEnd call
call src/lib/app/lifecycle/index-updater.service.ts:43 in updateIndexesForFile -> src/lib/utils/debug.ts:perfBaseline call
