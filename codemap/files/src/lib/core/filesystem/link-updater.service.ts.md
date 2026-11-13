# file card src/lib/core/filesystem/link-updater.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/link-updater.service.ts ' codemap/files
file src/lib/core/filesystem/link-updater.service.ts service L109 module src/lib/core/filesystem in1 t4
## imports
imp src/lib/core/filesystem/link-updater.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile,writeTextFile
imp src/lib/core/filesystem/link-updater.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/core/filesystem/link-updater.service.ts:3 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/filesystem/link-updater.service.ts:4 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/core/filesystem/link-updater.service.ts:5 -> src/lib/core/editor/editor.logic.ts isTabDirty
imp src/lib/core/filesystem/link-updater.service.ts:6 -> src/lib/core/markdown-editor/tab-view-state.ts renameTabViewState
imp src/lib/core/filesystem/link-updater.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/filesystem/link-updater.service.ts:8 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/core/filesystem/link-updater.service.ts:9 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/filesystem/link-updater.service.ts:10 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/core/filesystem/link-updater.service.ts:11 -> src/lib/core/filesystem/link-updater.logic.ts buildRenameResolution,extractNoteName,replaceWikilinks
imp src/lib/core/filesystem/link-updater.service.ts:12 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/core/filesystem/link-updater.service.ts:13 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/core/filesystem/path-change.service.ts:5 -> src/lib/core/filesystem/link-updater.service.ts updateLinksAfterRename,updateTabAfterRenameOrMove
## reach
in2 src/lib/core/filesystem/link-updater.service.ts 8 files in 6 modules: src/lib/features/rail-shell(3) src/lib/app(1) src/lib/core/filesystem(1) src/lib/features/collection(1) src/lib/features/event-calendar(1) +1 modules: q impact src/lib/core/filesystem/link-updater.service.ts --depth 2
out2 src/lib/core/filesystem/link-updater.service.ts 14 files in 6 modules: src/lib/utils(5) src/lib/contracts(2) src/lib/core/editor(2) src/lib/core/filesystem(2) src/lib/core/settings(2) +1 modules
## tests
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports src/lib/core/filesystem/link-updater.service.ts mirror
test src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts imports src/lib/core/filesystem/link-updater.service.ts
test src/tests/lib/core/filesystem/fs.service.race-audit.test.ts mocks src/lib/core/filesystem/link-updater.service.ts
test src/tests/lib/core/filesystem/fs.service.test.ts mocks src/lib/core/filesystem/link-updater.service.ts
## symbols
sym src/lib/core/filesystem/link-updater.service.ts:35 fn updateLinksAfterRename(oldPath: string, newPath: string): Promise<void> L46 | Updates all wikilinks across the vault after a file rename.
by src/lib/core/filesystem/link-updater.service.ts:updateLinksAfterRename <- src/lib/core/filesystem/path-change.service.ts:202 in applyPathChange call
sym src/lib/core/filesystem/link-updater.service.ts:93 fn updateTabAfterRenameOrMove(oldPath: string, newPath: string): void L17 | Updates the open editor tab's path/name after a file rename or move.
by src/lib/core/filesystem/link-updater.service.ts:updateTabAfterRenameOrMove <- src/lib/core/filesystem/path-change.service.ts:185 in applyPathChange call
## calls
call src/lib/core/filesystem/link-updater.service.ts:36 in updateLinksAfterRename -> src/lib/core/filesystem/link-updater.logic.ts:extractNoteName call +1
call src/lib/core/filesystem/link-updater.service.ts:41 in updateLinksAfterRename -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/core/filesystem/link-updater.service.ts:42 in updateLinksAfterRename -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/core/filesystem/link-updater.service.ts:44 in updateLinksAfterRename -> src/lib/core/filesystem/link-updater.logic.ts:buildRenameResolution call
call src/lib/core/filesystem/link-updater.service.ts:46 in updateLinksAfterRename -> src/lib/contracts/ipc.ts:call call
call src/lib/core/filesystem/link-updater.service.ts:53 in updateLinksAfterRename -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/core/filesystem/link-updater.service.ts:55 in updateLinksAfterRename -> src/lib/core/filesystem/link-updater.logic.ts:replaceWikilinks call
call src/lib/core/filesystem/link-updater.service.ts:66 in updateLinksAfterRename -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/core/filesystem/link-updater.service.ts:71 in updateLinksAfterRename -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/core/filesystem/link-updater.service.ts:77 in updateLinksAfterRename -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/link-updater.service.ts:99 in updateTabAfterRenameOrMove -> src/lib/core/editor/editor.store.svelte.ts:editorStore.updateTabPath mcall +1
call src/lib/core/filesystem/link-updater.service.ts:100 in updateTabAfterRenameOrMove -> src/lib/core/markdown-editor/tab-view-state.ts:renameTabViewState call +1
## effects
ipc-call src/lib/core/filesystem/link-updater.service.ts:46 in updateLinksAfterRename -> ipc:get_backlinks_v2 -> src-tauri/src/commands/vault.rs:486
fx src/lib/core/filesystem/link-updater.service.ts:54 tauri-fs.readTextFile in updateLinksAfterRename
fx src/lib/core/filesystem/link-updater.service.ts:58 tauri-fs.writeTextFile in updateLinksAfterRename
