# file card src/lib/core/filesystem/path-change.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/path-change.service.ts ' codemap/files
file src/lib/core/filesystem/path-change.service.ts service L258 module src/lib/core/filesystem in8 t2
## imports
imp src/lib/core/filesystem/path-change.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/core/filesystem/path-change.service.ts:2 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/filesystem/path-change.service.ts:3 -> src/lib/core/filesystem/fs.service.ts currentTreeOrder,refreshTree
imp src/lib/core/filesystem/path-change.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts collectFilePathsUnder,findNodeByPath,getFileName,isMarkdownFile,moveTreeNode,PreDeleteSaveError,removeNodeByPath
imp src/lib/core/filesystem/path-change.service.ts:5 -> src/lib/core/filesystem/link-updater.service.ts updateLinksAfterRename,updateTabAfterRenameOrMove
imp src/lib/core/filesystem/path-change.service.ts:6 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/core/filesystem/path-change.service.ts:7 -> src/lib/core/editor/editor.service.ts closeTabsForDeletedPath,saveFileByPath
imp src/lib/core/filesystem/path-change.service.ts:8 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/filesystem/path-change.service.ts:9 -> src/lib/core/editor/editor.logic.ts isTabDirty,isVirtualTab
imp src/lib/core/filesystem/path-change.service.ts:10 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/filesystem/path-change.service.ts:11 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/filesystem/path-change.service.ts:12 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/filesystem/path-change.service.ts:13 -> src/lib/utils/path.ts vaultRelativeKey
## imported-by
imp src/lib/app/boot.ts:2 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/core/filesystem/fs.service.ts:8 -> src/lib/core/filesystem/path-change.service.ts applyPathChange
imp src/lib/features/collection/collection.service.ts:3 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/features/event-calendar/event-calendar.service.ts:22 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/features/rail-shell/files-navigator.service.ts:1 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/features/rail-shell/neighbourhood.service.ts:1 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/features/rail-shell/types-navigator.service.ts:1 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/plugins/mods/mods-host.service.ts:7 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
## reach
in2 src/lib/core/filesystem/path-change.service.ts 39 files in 20 modules: src/lib/app(7) src/lib/features/event-calendar(7) src/lib/features/rail-shell(4) src/lib/core/filesystem(2) src/lib/features/note-action-bar(2) +15 modules: q impact src/lib/core/filesystem/path-change.service.ts --depth 2
out2 src/lib/core/filesystem/path-change.service.ts 14 files in 8 modules: src/lib/core/filesystem(3) src/lib/utils(3) src/lib/contracts(2) src/lib/core/settings(2) src/lib/core/editor(1) +3 modules
## tests
test src/tests/lib/app/EditorView.test.ts imports src/lib/core/filesystem/path-change.service.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/core/filesystem/path-change.service.ts
## symbols
sym src/lib/core/filesystem/path-change.service.ts:16 interface PathChange L16 | One path change: where the item goes, and how the disk move is performed.
sym src/lib/core/filesystem/path-change.service.ts:38 interface PathChangeConsumer L22 | A feature index keyed by note path that must follow a rename, move or delete.
sym src/lib/core/filesystem/path-change.service.ts:85 fn registerPathChangeConsumer(consumer: PathChangeConsumer): () => void L8 | Registers a consumer to follow every path change.
by src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer <- src/lib/app/boot.ts:44 in registerAppPorts call +1
by src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer <- src/lib/features/collection/collection.service.ts:213 in registerCollectionPathChangeConsumer call
by src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer <- src/lib/features/event-calendar/event-calendar.service.ts:658 in registerEventCalendarPathChangeConsumer call
by src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer <- src/lib/features/rail-shell/files-navigator.service.ts:12 in registerFilesNavigatorPathChangeConsumer call
by src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer <- src/lib/features/rail-shell/neighbourhood.service.ts:23 in registerNeighbourhoodPathChangeConsumer call
by src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer <- src/lib/features/rail-shell/types-navigator.service.ts:13 in registerTypesNavigatorPathChangeConsumer call
by src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer <- src/lib/plugins/mods/mods-host.service.ts:653 in createModContext call
sym src/lib/core/filesystem/path-change.service.ts:117 fn forgetNote(path: string): void L3 | Drops every trace of a note that stops existing at `path`: the index-dedupe signature (so a later re-creation with identical bytes is not silently skipped), ev…
sym src/lib/core/filesystem/path-change.service.ts:157 fn applyPathChange(change: PathChange): Promise<void> L102 | THE one owner of "a note's path changed".
by src/lib/core/filesystem/path-change.service.ts:applyPathChange <- src/lib/core/filesystem/fs.service.ts:248 in deleteItem call +2
## locals
local src/lib/core/filesystem/path-change.service.ts:65 fn saveDirtyTabsUnder(path: string): Promise<void> L8
## calls
call src/lib/core/filesystem/path-change.service.ts:67 in saveDirtyTabsUnder -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/core/filesystem/path-change.service.ts:67 in saveDirtyTabsUnder -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/core/filesystem/path-change.service.ts:70 in saveDirtyTabsUnder -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/core/filesystem/path-change.service.ts:70 in saveDirtyTabsUnder -> src/lib/core/filesystem/fs.logic.ts:PreDeleteSaveError new
call src/lib/core/filesystem/path-change.service.ts:87 in registerPathChangeConsumer -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/path-change.service.ts:118 in forgetNote -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/core/filesystem/path-change.service.ts:163 in applyPathChange -> src/lib/core/filesystem/fs.logic.ts:collectFilePathsUnder call
call src/lib/core/filesystem/path-change.service.ts:164 in applyPathChange -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/core/filesystem/path-change.service.ts:168 in applyPathChange -> src/lib/core/filesystem/path-change.service.ts:saveDirtyTabsUnder call
call src/lib/core/filesystem/path-change.service.ts:171 in applyPathChange -> src/lib/core/editor/editor.service.ts:closeTabsForDeletedPath call
call src/lib/core/filesystem/path-change.service.ts:179 in applyPathChange -> src/lib/core/editor/editor.store.svelte.ts:editorStore.addTab mcall
call src/lib/core/filesystem/path-change.service.ts:184 in applyPathChange -> src/lib/core/filesystem/fs.logic.ts:removeNodeByPath call
call src/lib/core/filesystem/path-change.service.ts:184 in applyPathChange -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setFileTree mcall +1
call src/lib/core/filesystem/path-change.service.ts:185 in applyPathChange -> src/lib/core/filesystem/link-updater.service.ts:updateTabAfterRenameOrMove call
call src/lib/core/filesystem/path-change.service.ts:192 in applyPathChange -> src/lib/utils/debug.ts:error call +3
call src/lib/core/filesystem/path-change.service.ts:201 in applyPathChange -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/core/filesystem/path-change.service.ts:201 in applyPathChange -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/core/filesystem/path-change.service.ts:202 in applyPathChange -> src/lib/core/filesystem/link-updater.service.ts:updateLinksAfterRename call
call src/lib/core/filesystem/path-change.service.ts:211 in applyPathChange -> src/lib/core/filesystem/fs.logic.ts:moveTreeNode call
call src/lib/core/filesystem/path-change.service.ts:211 in applyPathChange -> src/lib/core/filesystem/fs.service.ts:currentTreeOrder call
call src/lib/core/filesystem/path-change.service.ts:213 in applyPathChange -> src/lib/core/filesystem/fs.service.ts:refreshTree call
call src/lib/core/filesystem/path-change.service.ts:221 in applyPathChange -> src/lib/contracts/ipc.ts:call call +1
call src/lib/core/filesystem/path-change.service.ts:230 in applyPathChange -> src/lib/utils/path.ts:vaultRelativeKey call +1
call src/lib/core/filesystem/path-change.service.ts:246 in applyPathChange -> src/lib/core/filesystem/path-change.service.ts:forgetNote call
## effects
ipc-call src/lib/core/filesystem/path-change.service.ts:221 in applyPathChange -> ipc:rename_note -> src-tauri/src/commands/vault.rs:1392
ipc-call src/lib/core/filesystem/path-change.service.ts:234 in applyPathChange -> ipc:rename_in_search_index -> src-tauri/src/commands/search_index.rs:265
