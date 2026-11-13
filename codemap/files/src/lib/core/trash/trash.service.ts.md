# file card src/lib/core/trash/trash.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/trash/trash.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/core/trash/trash.service.ts service L309 module src/lib/core/trash in4 t14
## imports
imp src/lib/core/trash/trash.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile,writeTextFile,mkdir,remove,rename,exists
imp src/lib/core/trash/trash.service.ts:2 -> src/lib/core/trash/trash.types.ts type:TrashItem
imp src/lib/core/trash/trash.service.ts:3 -> src/lib/core/trash/trash.store.svelte.ts trashStore
imp src/lib/core/trash/trash.service.ts:4 -> src/lib/core/trash/trash.logic.ts getTrashDir,getTrashItemsDir,getTrashManifestPath,getTrashItemPath,getTrashItemDir,createTrashItem,parseTrashManifest,serializeTrashManifest
imp src/lib/core/trash/trash.service.ts:14 -> src/lib/core/filesystem/fs.logic.ts collectFilePathsUnder,findNodeByPath,getRelativePath,isViewFile
imp src/lib/core/trash/trash.service.ts:15 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/trash/trash.service.ts:16 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,notifyContentInvalidated
imp src/lib/core/trash/trash.service.ts:17 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/core/trash/trash.service.ts:18 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/trash/trash.service.ts:158 -> src/lib/core/filesystem/fs.service.ts dyn:addScannedToTree
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:49 -> src/lib/core/trash/trash.service.ts loadTrash,resetTrash
imp src/lib/core/filesystem/fs.service.ts:256 -> src/lib/core/trash/trash.service.ts dyn:moveToTrash
imp src/lib/core/settings/sections/TrashSection.svelte:6 -> src/lib/core/trash/trash.service.ts loadTrash,restoreItem,deletePermanently,emptyTrash
imp src/lib/features/event-calendar/event-calendar.service.ts:24 -> src/lib/core/trash/trash.service.ts restoreItem
## reach
in2 src/lib/core/trash/trash.service.ts 37 files in 20 modules: src/lib/features/event-calendar(7) src/lib/app(6) src/lib/features/rail-shell(4) src/lib/core/filesystem(3) src/lib/features/todoist-sync(2) +15 modules: q impact src/lib/core/trash/trash.service.ts --depth 2
out2 src/lib/core/trash/trash.service.ts 10 files in 5 modules: src/lib/utils(3) src/lib/contracts(2) src/lib/core/filesystem(2) src/lib/core/settings(2) src/lib/core/vault(1)
## tests
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/core/trash/trash.service.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/core/trash/trash.service.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts imports src/lib/core/trash/trash.service.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/core/trash/trash.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/core/filesystem/fs.service.race-audit.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/core/filesystem/fs.service.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/core/settings/TrashSection.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/features/collection/collection-view-index-path-change.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/features/rail-shell/files-navigator.service.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/features/rail-shell/neighbourhood.service.test.ts mocks src/lib/core/trash/trash.service.ts
test src/tests/lib/features/rail-shell/types-navigator.service.test.ts mocks src/lib/core/trash/trash.service.ts
## symbols
sym src/lib/core/trash/trash.service.ts:24 fn loadTrash(vaultPath: string): Promise<void> L20 | Loads the trash manifest from disk and updates the store.
by src/lib/core/trash/trash.service.ts:loadTrash <- src/lib/app/lifecycle/app-lifecycle.service.ts:312 in initializeVault call
by src/lib/core/trash/trash.service.ts:loadTrash <- src/lib/core/settings/sections/TrashSection.svelte:19 in (script) call
sym src/lib/core/trash/trash.service.ts:49 fn moveToTrash(vaultPath: string, absolutePath: string, isDirectory: boolean): Promise<boolean> L49 | Moves a file or folder to the trash instead of permanently deleting it.
by src/lib/core/trash/trash.service.ts:moveToTrash <- src/lib/core/filesystem/fs.service.ts:257 in deleteItem call
sym src/lib/core/trash/trash.service.ts:110 fn restoreItem(vaultPath: string, item: TrashItem): Promise<string> L73 | Restores a trashed item to its original location.
by src/lib/core/trash/trash.service.ts:restoreItem <- src/lib/core/settings/sections/TrashSection.svelte:26 in handleRestore call
by src/lib/core/trash/trash.service.ts:restoreItem <- src/lib/features/event-calendar/event-calendar.service.ts:1178 in restoreNow call
sym src/lib/core/trash/trash.service.ts:187 fn deletePermanently(vaultPath: string, item: TrashItem): Promise<boolean> L16 | Permanently deletes a single trashed item from disk and removes it from the manifest.
by src/lib/core/trash/trash.service.ts:deletePermanently <- src/lib/core/settings/sections/TrashSection.svelte:40 in handleDeletePermanently call
sym src/lib/core/trash/trash.service.ts:207 fn emptyTrash(vaultPath: string): Promise<boolean> L18 | Permanently deletes all items in the trash and clears the manifest.
by src/lib/core/trash/trash.service.ts:emptyTrash <- src/lib/core/settings/sections/TrashSection.svelte:55 in handleEmptyTrash call
sym src/lib/core/trash/trash.service.ts:230 fn resetTrash(): void L3 | Resets the trash store to its initial empty state.
by src/lib/core/trash/trash.service.ts:resetTrash <- src/lib/app/lifecycle/app-lifecycle.service.ts:681 in teardownVault call
## locals
local src/lib/core/trash/trash.service.ts:246 fn indexRestoredNotes(vaultPath: string, paths: string[]): Promise<void> L17
local src/lib/core/trash/trash.service.ts:265 fn isMarkdownPath(path: string): boolean L3
local src/lib/core/trash/trash.service.ts:272 fn saveManifest(vaultPath: string, items: TrashItem[]): Promise<void> L8
local src/lib/core/trash/trash.service.ts:286 fn findUniqueRestorePath(originalPath: string, isDirectory: boolean): Promise<string> L9
local src/lib/core/trash/trash.service.ts:301 fn splitPathForSuffix(path: string, isDirectory: boolean): { base: string; ext: string } L9
## calls
call src/lib/core/trash/trash.service.ts:25 in loadTrash -> src/lib/core/trash/trash.store.svelte.ts:trashStore.setLoading mcall +1
call src/lib/core/trash/trash.service.ts:27 in loadTrash -> src/lib/core/trash/trash.logic.ts:getTrashManifestPath call
call src/lib/core/trash/trash.service.ts:30 in loadTrash -> src/lib/core/trash/trash.store.svelte.ts:trashStore.setItems mcall +2
call src/lib/core/trash/trash.service.ts:34 in loadTrash -> src/lib/core/trash/trash.logic.ts:parseTrashManifest call
call src/lib/core/trash/trash.service.ts:36 in loadTrash -> src/lib/utils/debug.ts:debug call
call src/lib/core/trash/trash.service.ts:38 in loadTrash -> src/lib/utils/debug.ts:error call
call src/lib/core/trash/trash.service.ts:50 in moveToTrash -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/core/trash/trash.service.ts:51 in moveToTrash -> src/lib/core/trash/trash.logic.ts:createTrashItem call
call src/lib/core/trash/trash.service.ts:52 in moveToTrash -> src/lib/core/trash/trash.logic.ts:getTrashItemDir call
call src/lib/core/trash/trash.service.ts:58 in moveToTrash -> src/lib/core/trash/trash.logic.ts:getTrashDir call
call src/lib/core/trash/trash.service.ts:62 in moveToTrash -> src/lib/core/trash/trash.logic.ts:getTrashItemsDir call
call src/lib/core/trash/trash.service.ts:70 in moveToTrash -> src/lib/core/trash/trash.logic.ts:getTrashItemPath call
call src/lib/core/trash/trash.service.ts:79 in moveToTrash -> src/lib/core/trash/trash.service.ts:saveManifest call
call src/lib/core/trash/trash.service.ts:81 in moveToTrash -> src/lib/utils/debug.ts:error call +1
call src/lib/core/trash/trash.service.ts:83 in moveToTrash -> src/lib/core/trash/trash.store.svelte.ts:trashStore.addItem mcall
call src/lib/core/trash/trash.service.ts:85 in moveToTrash -> src/lib/utils/debug.ts:debug call
call src/lib/core/trash/trash.service.ts:112 in restoreItem -> src/lib/core/trash/trash.logic.ts:getTrashItemPath call
call src/lib/core/trash/trash.service.ts:117 in restoreItem -> src/lib/core/trash/trash.service.ts:findUniqueRestorePath call
call src/lib/core/trash/trash.service.ts:129 in restoreItem -> src/lib/core/trash/trash.logic.ts:getTrashItemDir call
call src/lib/core/trash/trash.service.ts:131 in restoreItem -> src/lib/utils/debug.ts:debug call +1
call src/lib/core/trash/trash.service.ts:139 in restoreItem -> src/lib/core/trash/trash.service.ts:saveManifest call
call src/lib/core/trash/trash.service.ts:141 in restoreItem -> src/lib/utils/debug.ts:error call +3
call src/lib/core/trash/trash.service.ts:143 in restoreItem -> src/lib/core/trash/trash.store.svelte.ts:trashStore.removeItem mcall
call src/lib/core/trash/trash.service.ts:152 in restoreItem -> src/lib/core/filesystem/fs.logic.ts:isViewFile call +1
call src/lib/core/trash/trash.service.ts:152 in restoreItem -> src/lib/core/trash/trash.service.ts:isMarkdownPath call +1
call src/lib/core/trash/trash.service.ts:153 in restoreItem -> src/lib/core/trash/trash.service.ts:indexRestoredNotes call +1
call src/lib/core/trash/trash.service.ts:159 in restoreItem -> src/lib/core/filesystem/fs.service.ts:addScannedToTree call
call src/lib/core/trash/trash.service.ts:166 in restoreItem -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/core/trash/trash.service.ts:169 in restoreItem -> src/lib/core/filesystem/fs.logic.ts:collectFilePathsUnder call
call src/lib/core/trash/trash.service.ts:189 in deletePermanently -> src/lib/core/trash/trash.logic.ts:getTrashItemDir call
call src/lib/core/trash/trash.service.ts:193 in deletePermanently -> src/lib/core/trash/trash.service.ts:saveManifest call
call src/lib/core/trash/trash.service.ts:194 in deletePermanently -> src/lib/core/trash/trash.store.svelte.ts:trashStore.removeItem mcall
call src/lib/core/trash/trash.service.ts:196 in deletePermanently -> src/lib/utils/debug.ts:debug call
call src/lib/core/trash/trash.service.ts:199 in deletePermanently -> src/lib/utils/debug.ts:error call
call src/lib/core/trash/trash.service.ts:209 in emptyTrash -> src/lib/core/trash/trash.logic.ts:getTrashItemsDir call
call src/lib/core/trash/trash.service.ts:215 in emptyTrash -> src/lib/core/trash/trash.service.ts:saveManifest call
call src/lib/core/trash/trash.service.ts:216 in emptyTrash -> src/lib/core/trash/trash.store.svelte.ts:trashStore.clear mcall
call src/lib/core/trash/trash.service.ts:218 in emptyTrash -> src/lib/utils/debug.ts:debug call
call src/lib/core/trash/trash.service.ts:221 in emptyTrash -> src/lib/utils/debug.ts:error call
call src/lib/core/trash/trash.service.ts:231 in resetTrash -> src/lib/core/trash/trash.store.svelte.ts:trashStore.clear mcall
call src/lib/core/trash/trash.service.ts:253 in indexRestoredNotes -> src/lib/utils/debug.ts:error call
call src/lib/core/trash/trash.service.ts:256 in indexRestoredNotes -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/core/trash/trash.service.ts:257 in indexRestoredNotes -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/core/trash/trash.service.ts:257 in indexRestoredNotes -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/core/trash/trash.service.ts:261 in indexRestoredNotes -> src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated call
call src/lib/core/trash/trash.service.ts:273 in saveManifest -> src/lib/core/trash/trash.logic.ts:getTrashManifestPath call
call src/lib/core/trash/trash.service.ts:274 in saveManifest -> src/lib/core/trash/trash.logic.ts:getTrashDir call
call src/lib/core/trash/trash.service.ts:278 in saveManifest -> src/lib/core/trash/trash.logic.ts:serializeTrashManifest call
call src/lib/core/trash/trash.service.ts:287 in findUniqueRestorePath -> src/lib/core/trash/trash.service.ts:splitPathForSuffix call
## effects
fx src/lib/core/trash/trash.service.ts:28 tauri-fs.exists in loadTrash
fx src/lib/core/trash/trash.service.ts:33 tauri-fs.readTextFile in loadTrash
fx src/lib/core/trash/trash.service.ts:59 tauri-fs.exists in moveToTrash
fx src/lib/core/trash/trash.service.ts:60 tauri-fs.mkdir in moveToTrash
fx src/lib/core/trash/trash.service.ts:63 tauri-fs.exists in moveToTrash
fx src/lib/core/trash/trash.service.ts:64 tauri-fs.mkdir in moveToTrash
fx src/lib/core/trash/trash.service.ts:68 tauri-fs.mkdir in moveToTrash
fx src/lib/core/trash/trash.service.ts:71 tauri-fs.rename in moveToTrash
fx src/lib/core/trash/trash.service.ts:92 tauri-fs.remove in moveToTrash
fx src/lib/core/trash/trash.service.ts:116 tauri-fs.exists in restoreItem
fx src/lib/core/trash/trash.service.ts:122 tauri-fs.exists in restoreItem
fx src/lib/core/trash/trash.service.ts:123 tauri-fs.mkdir in restoreItem
fx src/lib/core/trash/trash.service.ts:126 tauri-fs.rename in restoreItem
fx src/lib/core/trash/trash.service.ts:130 tauri-fs.remove in restoreItem
fx src/lib/core/trash/trash.service.ts:190 tauri-fs.remove in deletePermanently
fx src/lib/core/trash/trash.service.ts:210 tauri-fs.exists in emptyTrash
fx src/lib/core/trash/trash.service.ts:211 tauri-fs.remove in emptyTrash
fx src/lib/core/trash/trash.service.ts:251 tauri-fs.readTextFile in indexRestoredNotes
fx src/lib/core/trash/trash.service.ts:275 tauri-fs.exists in saveManifest
fx src/lib/core/trash/trash.service.ts:276 tauri-fs.mkdir in saveManifest
fx src/lib/core/trash/trash.service.ts:278 tauri-fs.writeTextFile in saveManifest
fx src/lib/core/trash/trash.service.ts:292 tauri-fs.exists in findUniqueRestorePath
