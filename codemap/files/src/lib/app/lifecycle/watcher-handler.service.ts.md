# file card src/lib/app/lifecycle/watcher-handler.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/lifecycle/watcher-handler.service.ts ' codemap/files
file src/lib/app/lifecycle/watcher-handler.service.ts service L126 module src/lib/app in1 t3
## imports
imp src/lib/app/lifecycle/watcher-handler.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/app/lifecycle/watcher-handler.service.ts:2 -> src/lib/features/backlinks/backlinks.service.ts rebuildIndex
imp src/lib/app/lifecycle/watcher-handler.service.ts:3 -> src/lib/features/collection/collection.service.ts buildPropertyIndex
imp src/lib/app/lifecycle/watcher-handler.service.ts:4 -> src/lib/features/file-icons/file-icons.service.ts buildFrontmatterIconIndex
imp src/lib/app/lifecycle/watcher-handler.service.ts:5 -> src/lib/core/editor/editor.hooks.ts areAllRecentSaves
imp src/lib/app/lifecycle/watcher-handler.service.ts:6 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/app/lifecycle/watcher-handler.service.ts:7 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,notifyContentInvalidated
imp src/lib/app/lifecycle/watcher-handler.service.ts:8 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/lifecycle/watcher-handler.service.ts:9 -> src/lib/plugins/mods/mods.logic.ts isModCodePath
imp src/lib/app/lifecycle/watcher-handler.service.ts:10 -> src/lib/utils/debug.ts debug,error,logProcessMemory
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:25 -> src/lib/app/lifecycle/watcher-handler.service.ts rebuildAllIndexes
## reach
in2 src/lib/app/lifecycle/watcher-handler.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/app/lifecycle/watcher-handler.service.ts 25 files in 11 modules: src/lib/features/file-icons(5) src/lib/utils(4) src/lib/core/filesystem(3) src/lib/features/collection(3) src/lib/contracts(2) +6 modules
## tests
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts imports src/lib/app/lifecycle/watcher-handler.service.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/app/lifecycle/watcher-handler.service.ts
test src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts imports src/lib/app/lifecycle/watcher-handler.service.ts
## symbols
sym src/lib/app/lifecycle/watcher-handler.service.ts:35 fn rebuildAllIndexes(changedPaths: string[] = []): Promise<void> L53 | Performs a FULL rebuild of all indexes from disk.
by src/lib/app/lifecycle/watcher-handler.service.ts:rebuildAllIndexes <- src/lib/app/lifecycle/app-lifecycle.service.ts:512 in initializeVault call
## locals
local src/lib/app/lifecycle/watcher-handler.service.ts:94 fn incrementalUpdateFiles(absolutePaths: string[], vaultPath: string): Promise<void> L33
## calls
call src/lib/app/lifecycle/watcher-handler.service.ts:44 in rebuildAllIndexes -> src/lib/plugins/mods/mods.logic.ts:isModCodePath call
call src/lib/app/lifecycle/watcher-handler.service.ts:50 in rebuildAllIndexes -> src/lib/core/editor/editor.hooks.ts:areAllRecentSaves call
call src/lib/app/lifecycle/watcher-handler.service.ts:51 in rebuildAllIndexes -> src/lib/utils/debug.ts:debug call +5
call src/lib/app/lifecycle/watcher-handler.service.ts:64 in rebuildAllIndexes -> src/lib/app/lifecycle/watcher-handler.service.ts:incrementalUpdateFiles call
call src/lib/app/lifecycle/watcher-handler.service.ts:64 in rebuildAllIndexes -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/app/lifecycle/watcher-handler.service.ts:66 in rebuildAllIndexes -> src/lib/utils/debug.ts:logProcessMemory call +1
call src/lib/app/lifecycle/watcher-handler.service.ts:76 in rebuildAllIndexes -> src/lib/features/backlinks/backlinks.service.ts:rebuildIndex call
call src/lib/app/lifecycle/watcher-handler.service.ts:76 in rebuildAllIndexes -> src/lib/utils/debug.ts:error call +2
call src/lib/app/lifecycle/watcher-handler.service.ts:77 in rebuildAllIndexes -> src/lib/features/collection/collection.service.ts:buildPropertyIndex call
call src/lib/app/lifecycle/watcher-handler.service.ts:78 in rebuildAllIndexes -> src/lib/features/file-icons/file-icons.service.ts:buildFrontmatterIconIndex call
call src/lib/app/lifecycle/watcher-handler.service.ts:83 in rebuildAllIndexes -> src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated call
call src/lib/app/lifecycle/watcher-handler.service.ts:98 in incrementalUpdateFiles -> src/lib/contracts/ipc.ts:call call
call src/lib/app/lifecycle/watcher-handler.service.ts:114 in incrementalUpdateFiles -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/app/lifecycle/watcher-handler.service.ts:115 in incrementalUpdateFiles -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/app/lifecycle/watcher-handler.service.ts:125 in incrementalUpdateFiles -> src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated call
## effects
ipc-call src/lib/app/lifecycle/watcher-handler.service.ts:98 in incrementalUpdateFiles -> ipc:read_files_batch -> src-tauri/src/commands/files.rs:24
