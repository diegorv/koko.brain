# file card src/lib/core/filesystem/fs.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/fs.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/core/filesystem/fs.service.ts service L376 module src/lib/core/filesystem in27 t45
## imports
imp src/lib/core/filesystem/fs.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile,writeTextFile,mkdir,remove,rename,exists,copyFile,readDir
imp src/lib/core/filesystem/fs.service.ts:2 -> pkg:@tauri-apps/plugin-opener revealItemInDir
imp src/lib/core/filesystem/fs.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/core/filesystem/fs.service.ts:4 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode,type:FolderOrderMap
imp src/lib/core/filesystem/fs.service.ts:5 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/filesystem/fs.service.ts:6 -> src/lib/core/filesystem/fs.logic.ts getParentPath,getFileName,generateCopyName,generateUniqueName,applyFolderOrder,insertTreeNode,isMarkdownFile,renamedPath,TargetExistsError,type:TreeOrder
imp src/lib/core/filesystem/fs.service.ts:7 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/core/filesystem/fs.service.ts:8 -> src/lib/core/filesystem/path-change.service.ts applyPathChange
imp src/lib/core/filesystem/fs.service.ts:9 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/core/filesystem/fs.service.ts:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/filesystem/fs.service.ts:11 -> src/lib/utils/debug.ts debug,error,timeAsync,timeSync
imp src/lib/core/filesystem/fs.service.ts:130 -> src/lib/core/vault/vault.store.svelte.ts dyn:*
imp src/lib/core/filesystem/fs.service.ts:253 -> src/lib/core/vault/vault.store.svelte.ts dyn:vaultStore
imp src/lib/core/filesystem/fs.service.ts:256 -> src/lib/core/trash/trash.service.ts dyn:moveToTrash
## imported-by
imp src/lib/app/commands.ts:12 -> src/lib/core/filesystem/fs.service.ts createFile,createFolder
imp src/lib/app/deep-link-actions.ts:5 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/app/lifecycle/app-lifecycle.service.ts:6 -> src/lib/core/filesystem/fs.service.ts resetFileSystem,loadDirectoryTree
imp src/lib/app/tauri-listeners.service.ts:15 -> src/lib/core/filesystem/fs.service.ts loadDirectoryTree
imp src/lib/core/filesystem/delete-note.service.ts:3 -> src/lib/core/filesystem/fs.service.ts deleteItem
imp src/lib/core/filesystem/fs.watcher.ts:5 -> src/lib/core/filesystem/fs.service.ts refreshTree
imp src/lib/core/filesystem/path-change.service.ts:3 -> src/lib/core/filesystem/fs.service.ts currentTreeOrder,refreshTree
imp src/lib/core/note-creator/note-creator.service.ts:7 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/core/trash/trash.service.ts:158 -> src/lib/core/filesystem/fs.service.ts dyn:addScannedToTree
imp src/lib/features/auto-organize/auto-organize.service.ts:5 -> src/lib/core/filesystem/fs.service.ts createFile,moveItem,renameItem
imp src/lib/features/canvas/canvas.service.ts:1 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/collection/collection.service.ts:6 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/deep-link/deep-link.service.ts:12 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/features/event-calendar/event-calendar.service.ts:21 -> src/lib/core/filesystem/fs.service.ts createFile,deleteItem,renameItem
imp src/lib/features/file-history/FileHistoryDialog.svelte:7 -> src/lib/core/filesystem/fs.service.ts revealInSystemExplorer
imp src/lib/features/note-action-bar/note-action-bar.service.ts:4 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/note-list/NoteRowMenu.svelte:17 -> src/lib/core/filesystem/fs.service.ts deleteItem,duplicateItem,renameItem,revealInSystemExplorer
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:8 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:25 -> src/lib/core/filesystem/fs.service.ts createFile,createFolder,deleteItem,moveItem,renameItem,revealInSystemExplorer
imp src/lib/features/rail-shell/TypesNavigator.svelte:18 -> src/lib/core/filesystem/fs.service.ts revealInSystemExplorer
imp src/lib/features/rail-shell/new-note.service.ts:4 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:5 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/features/todoist-sync/sync-now.service.ts:15 -> src/lib/core/filesystem/fs.service.ts renameItem
imp src/lib/features/type-definitions/type-definitions.service.ts:12 -> src/lib/core/filesystem/fs.service.ts createFile,renameItem
imp src/lib/plugins/kanban/kanban.service.ts:3 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/plugins/mods/mod-vault.service.ts:9 -> src/lib/core/filesystem/fs.service.ts addToTree,deleteItem,moveItem,renameItem
imp src/lib/plugins/templates/templates.service.ts:4 -> src/lib/core/filesystem/fs.service.ts addToTree
## reach
in2 src/lib/core/filesystem/fs.service.ts 36 files in 16 modules: src/lib/features/event-calendar(8) src/lib/app(7) src/lib/features/rail-shell(4) src/lib/plugins/mods(3) src/lib/features/todoist-sync(2) +11 modules: q impact src/lib/core/filesystem/fs.service.ts --depth 2
out2 src/lib/core/filesystem/fs.service.ts 17 files in 7 modules: src/lib/core/editor(4) src/lib/contracts(3) src/lib/core/trash(3) src/lib/utils(3) src/lib/core/settings(2) +2 modules
## tests
test src/tests/lib/core/filesystem/fs.service.race-audit.test.ts imports src/lib/core/filesystem/fs.service.ts mirror
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/core/filesystem/fs.service.ts mirror
test src/tests/fixtures/calendar-vault.fixture.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/app/boot.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/core/filesystem/delete-dirty-tab.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/core/filesystem/f165-delete-dirty-tab.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/core/filesystem/fs.watcher.app-patch.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/collection/collection-view-index-path-change.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/files-navigator.service.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/neighbourhood.service.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/types-navigator.service.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/plugins/mods/mod-note-moved.test.ts imports src/lib/core/filesystem/fs.service.ts
test src/tests/lib/app/commands.new-commands.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/app/tauri-listeners.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/core/filesystem/delete-note.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/core/filesystem/fs.watcher.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/core/note-creator/note-creator.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/core/trash/trash.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/canvas/canvas.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/collection/collection.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/deep-link/deep-link.service.race-audit.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/note-action-bar/note-action-bar.service.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts mocks src/lib/core/filesystem/fs.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts mocks src/lib/core/filesystem/fs.service.ts
more tests 5 not shown: src/tests/lib/plugins/one-on-one(2) src/tests/lib/features/rail-shell(1) src/tests/lib/features/type-definitions(1) src/tests/lib/plugins/kanban(1): q tests src/lib/core/filesystem/fs.service.ts
## symbols
sym src/lib/core/filesystem/fs.service.ts:42 fn loadFolderOrder(vaultPath: string): Promise<FolderOrderMap> L30 | Reads the folder order config from `.kokobrain/folder-order.json`.
sym src/lib/core/filesystem/fs.service.ts:88 fn loadDirectoryTree(vaultPath: string) L39 | Builds the full file tree for a vault and updates the store.
by src/lib/core/filesystem/fs.service.ts:loadDirectoryTree <- src/lib/app/lifecycle/app-lifecycle.service.ts:339 in initializeVault call
by src/lib/core/filesystem/fs.service.ts:loadDirectoryTree <- src/lib/app/tauri-listeners.service.ts:203 in registerVaultIndexUpdatedListener call
sym src/lib/core/filesystem/fs.service.ts:129 fn refreshTree() L6 | Re-reads the current vault's file tree (lazy-imports vaultStore to avoid circular deps)
by src/lib/core/filesystem/fs.service.ts:refreshTree <- src/lib/core/filesystem/fs.watcher.ts:175 in handleChangedPaths call +2
by src/lib/core/filesystem/fs.service.ts:refreshTree <- src/lib/core/filesystem/path-change.service.ts:213 in applyPathChange call
sym src/lib/core/filesystem/fs.service.ts:137 fn currentTreeOrder(vaultPath: string): TreeOrder L4 | The ordering a full tree load applies, read from the store, for placing one node the same way.
by src/lib/core/filesystem/fs.service.ts:currentTreeOrder <- src/lib/core/filesystem/path-change.service.ts:211 in applyPathChange call
sym src/lib/core/filesystem/fs.service.ts:158 fn addToTree(path: string, isDirectory = false, children: FileTreeNode[] = []): void L14 | Adds a node the app just created on disk to the file tree, in the position the next full load gives it, instead of rescanning the vault.
by src/lib/core/filesystem/fs.service.ts:addToTree <- src/lib/app/deep-link-actions.ts:225 in executeCaptureAction call
by src/lib/core/filesystem/fs.service.ts:addToTree <- src/lib/core/note-creator/note-creator.service.ts:122 in openOrCreateNote call
by src/lib/core/filesystem/fs.service.ts:addToTree <- src/lib/features/deep-link/deep-link.service.ts:315 in executeNewAction call +1
by src/lib/core/filesystem/fs.service.ts:addToTree <- src/lib/features/todoist-sync/closed-note-writer.service.ts:80 in createNoteFile call
by src/lib/core/filesystem/fs.service.ts:addToTree <- src/lib/plugins/mods/mod-vault.service.ts:148 in createModVault call
by src/lib/core/filesystem/fs.service.ts:addToTree <- src/lib/plugins/templates/templates.service.ts:110 in ensureTemplatesFolder call +1
sym src/lib/core/filesystem/fs.service.ts:179 fn addScannedToTree(path: string, isDirectory: boolean): Promise<void> L11 | `addToTree` for an item that arrived on disk with content (a copied or restored folder): a folder's subtree comes from `scan_vault` on that folder alone.
by src/lib/core/filesystem/fs.service.ts:addScannedToTree <- src/lib/core/trash/trash.service.ts:159 in restoreItem call
sym src/lib/core/filesystem/fs.service.ts:198 fn createFile(parentPath: string, fileName: string, content: string = ''): Promise<string> L27 | Creates a file on disk with the given initial content (empty by default) and adds it to the tree.
by src/lib/core/filesystem/fs.service.ts:createFile <- src/lib/app/commands.ts:155 in getBuiltInCommands call
by src/lib/core/filesystem/fs.service.ts:createFile <- src/lib/features/auto-organize/auto-organize.service.ts:612 in createRuleNote call
by src/lib/core/filesystem/fs.service.ts:createFile <- src/lib/features/canvas/canvas.service.ts:9 in createCanvasFile call
by src/lib/core/filesystem/fs.service.ts:createFile <- src/lib/features/collection/collection.service.ts:34 in createCollectionFile call
by src/lib/core/filesystem/fs.service.ts:createFile <- src/lib/features/event-calendar/event-calendar.service.ts:1014 in duplicateEvent call
by src/lib/core/filesystem/fs.service.ts:createFile <- src/lib/features/note-action-bar/note-action-bar.service.ts:80 in createLinkedNote call
by src/lib/core/filesystem/fs.service.ts:createFile <- src/lib/features/quick-switcher/QuickSwitcher.svelte:50 in createAndOpenNote call
by src/lib/core/filesystem/fs.service.ts:createFile <- src/lib/features/rail-shell/FilesNavigator.svelte:86 in fileCreators=$derived call
more by 3 not shown: src/lib/features/rail-shell(1) src/lib/features/type-definitions(1) src/lib/plugins/kanban(1): q importers src/lib/core/filesystem/fs.service.ts:createFile
sym src/lib/core/filesystem/fs.service.ts:227 fn createFolder(parentPath: string, folderName: string): Promise<string> L17 | Creates a directory on disk and adds it to the tree.
by src/lib/core/filesystem/fs.service.ts:createFolder <- src/lib/app/commands.ts:167 in getBuiltInCommands call
by src/lib/core/filesystem/fs.service.ts:createFolder <- src/lib/features/rail-shell/FilesNavigator.svelte:140 in handleNewFolder call
sym src/lib/core/filesystem/fs.service.ts:246 fn deleteItem(itemPath: string, isDirectory: boolean = false): Promise<void> L24 | Moves a file or folder to trash (soft delete), closes open tabs, and removes it from the tree.
by src/lib/core/filesystem/fs.service.ts:deleteItem <- src/lib/core/filesystem/delete-note.service.ts:22 in deleteNoteWithConfirm call
by src/lib/core/filesystem/fs.service.ts:deleteItem <- src/lib/features/event-calendar/event-calendar.service.ts:1050 in deleteNow call
by src/lib/core/filesystem/fs.service.ts:deleteItem <- src/lib/features/note-list/NoteRowMenu.svelte:168 in handleDelete call
by src/lib/core/filesystem/fs.service.ts:deleteItem <- src/lib/features/rail-shell/FilesNavigator.svelte:202 in handleDelete call
by src/lib/core/filesystem/fs.service.ts:deleteItem <- src/lib/plugins/mods/mod-vault.service.ts:109 in createModVault call
sym src/lib/core/filesystem/fs.service.ts:275 fn renameItem(oldPath: string, newName: string): Promise<string> L20 | Renames a file or folder and returns the new path.
by src/lib/core/filesystem/fs.service.ts:renameItem <- src/lib/features/auto-organize/auto-organize.service.ts:517 in applyRename call
by src/lib/core/filesystem/fs.service.ts:renameItem <- src/lib/features/event-calendar/event-calendar.service.ts:734 in renameAndWrite call
by src/lib/core/filesystem/fs.service.ts:renameItem <- src/lib/features/note-list/NoteRowMenu.svelte:142 in commitRename call
by src/lib/core/filesystem/fs.service.ts:renameItem <- src/lib/features/rail-shell/FilesNavigator.svelte:179 in commitRename call
by src/lib/core/filesystem/fs.service.ts:renameItem <- src/lib/features/todoist-sync/sync-now.service.ts:960 in renameProjectNotes call
by src/lib/core/filesystem/fs.service.ts:renameItem <- src/lib/features/type-definitions/type-definitions.service.ts:224 in renameType call
by src/lib/core/filesystem/fs.service.ts:renameItem <- src/lib/plugins/mods/mod-vault.service.ts:93 in createModVault call
sym src/lib/core/filesystem/fs.service.ts:304 fn moveItem(sourcePath: string, targetDirPath: string, fileName = getFileName(sourcePath)): Promise<string | null> L21 | Moves a file or folder into a different directory, as `fileName` there, in one path change (links and tabs follow).
by src/lib/core/filesystem/fs.service.ts:moveItem <- src/lib/features/auto-organize/auto-organize.service.ts:393 in moveToFreeName call +1
by src/lib/core/filesystem/fs.service.ts:moveItem <- src/lib/features/rail-shell/FilesNavigator.svelte:288 in handleDrop call
by src/lib/core/filesystem/fs.service.ts:moveItem <- src/lib/plugins/mods/mod-vault.service.ts:100 in createModVault call
sym src/lib/core/filesystem/fs.service.ts:342 fn duplicateItem(itemPath: string, isDirectory: boolean): Promise<string> L21 | Duplicates a file or folder, generating a unique "copy" name.
by src/lib/core/filesystem/fs.service.ts:duplicateItem <- src/lib/features/note-list/NoteRowMenu.svelte:85 in handleDuplicate call
sym src/lib/core/filesystem/fs.service.ts:365 fn revealInSystemExplorer(itemPath: string): Promise<void> L7 | Opens the system file explorer with the given item selected
by src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer <- src/lib/features/file-history/FileHistoryDialog.svelte:37 in handleRevealBackup call
by src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer <- src/lib/features/note-list/NoteRowMenu.svelte:266 in (markup) markup
by src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer <- src/lib/features/rail-shell/FilesNavigator.svelte:388 in (markup) markup
by src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer <- src/lib/features/rail-shell/TypesNavigator.svelte:339 in (markup) markup +1
sym src/lib/core/filesystem/fs.service.ts:374 fn resetFileSystem() L3 | Resets all file system state (e.g. when switching vaults)
by src/lib/core/filesystem/fs.service.ts:resetFileSystem <- src/lib/app/lifecycle/app-lifecycle.service.ts:661 in teardownVault call
## locals
local src/lib/core/filesystem/fs.service.ts:14 fn countTreeNodes(nodes: FileTreeNode[]): number L8
local src/lib/core/filesystem/fs.service.ts:37 fn ensureKokobrainDir(vaultPath: string): Promise<void> L3
local src/lib/core/filesystem/fs.service.ts:327 fn copyDirectoryRecursive(sourcePath: string, destPath: string): Promise<void> L13
## calls
call src/lib/core/filesystem/fs.service.ts:18 in countTreeNodes -> src/lib/core/filesystem/fs.service.ts:countTreeNodes call
call src/lib/core/filesystem/fs.service.ts:47 in loadFolderOrder -> src/lib/core/filesystem/fs.service.ts:ensureKokobrainDir call
call src/lib/core/filesystem/fs.service.ts:49 in loadFolderOrder -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setFolderOrder mcall +3
call src/lib/core/filesystem/fs.service.ts:67 in loadFolderOrder -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:91 in loadDirectoryTree -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.startLoading mcall
call src/lib/core/filesystem/fs.service.ts:93 in loadDirectoryTree -> src/lib/utils/debug.ts:timeAsync call +1
call src/lib/core/filesystem/fs.service.ts:96 in loadDirectoryTree -> src/lib/contracts/ipc.ts:call call
call src/lib/core/filesystem/fs.service.ts:100 in loadDirectoryTree -> src/lib/core/filesystem/fs.service.ts:loadFolderOrder call
call src/lib/core/filesystem/fs.service.ts:104 in loadDirectoryTree -> src/lib/utils/debug.ts:debug call +2
call src/lib/core/filesystem/fs.service.ts:109 in loadDirectoryTree -> src/lib/utils/debug.ts:timeSync call +1
call src/lib/core/filesystem/fs.service.ts:113 in loadDirectoryTree -> src/lib/core/filesystem/fs.logic.ts:applyFolderOrder call
call src/lib/core/filesystem/fs.service.ts:116 in loadDirectoryTree -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setFileTree mcall
call src/lib/core/filesystem/fs.service.ts:117 in loadDirectoryTree -> src/lib/core/filesystem/fs.service.ts:countTreeNodes call
call src/lib/core/filesystem/fs.service.ts:120 in loadDirectoryTree -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:124 in loadDirectoryTree -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.stopLoading mcall
call src/lib/core/filesystem/fs.service.ts:132 in refreshTree -> src/lib/core/filesystem/fs.service.ts:loadDirectoryTree call
call src/lib/core/filesystem/fs.service.ts:163 in addToTree -> src/lib/core/filesystem/fs.logic.ts:getFileName call +1
call src/lib/core/filesystem/fs.service.ts:165 in addToTree -> src/lib/core/filesystem/fs.logic.ts:insertTreeNode call
call src/lib/core/filesystem/fs.service.ts:165 in addToTree -> src/lib/core/filesystem/fs.service.ts:currentTreeOrder call
call src/lib/core/filesystem/fs.service.ts:165 in addToTree -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setFileTree mcall
call src/lib/core/filesystem/fs.service.ts:166 in addToTree -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.service.ts:169 in addToTree -> src/lib/core/filesystem/fs.service.ts:loadDirectoryTree call
call src/lib/core/filesystem/fs.service.ts:181 in addScannedToTree -> src/lib/core/filesystem/fs.service.ts:addToTree call +1
call src/lib/core/filesystem/fs.service.ts:184 in addScannedToTree -> src/lib/contracts/ipc.ts:call call
call src/lib/core/filesystem/fs.service.ts:187 in addScannedToTree -> src/lib/core/filesystem/fs.service.ts:currentTreeOrder call
call src/lib/core/filesystem/fs.service.ts:188 in addScannedToTree -> src/lib/core/filesystem/fs.logic.ts:applyFolderOrder call
call src/lib/core/filesystem/fs.service.ts:202 in createFile -> src/lib/core/filesystem/fs.logic.ts:generateUniqueName call
call src/lib/core/filesystem/fs.service.ts:208 in createFile -> src/lib/contracts/ipc.ts:call call
call src/lib/core/filesystem/fs.service.ts:209 in createFile -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/core/filesystem/fs.service.ts:215 in createFile -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/core/filesystem/fs.service.ts:216 in createFile -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/core/filesystem/fs.service.ts:217 in createFile -> src/lib/core/filesystem/fs.service.ts:addToTree call
call src/lib/core/filesystem/fs.service.ts:218 in createFile -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.service.ts:221 in createFile -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:231 in createFolder -> src/lib/core/filesystem/fs.logic.ts:generateUniqueName call
call src/lib/core/filesystem/fs.service.ts:235 in createFolder -> src/lib/contracts/ipc.ts:call call
call src/lib/core/filesystem/fs.service.ts:236 in createFolder -> src/lib/core/filesystem/fs.service.ts:addToTree call
call src/lib/core/filesystem/fs.service.ts:237 in createFolder -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.service.ts:240 in createFolder -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:248 in deleteItem -> src/lib/core/filesystem/path-change.service.ts:applyPathChange call
call src/lib/core/filesystem/fs.service.ts:257 in deleteItem -> src/lib/core/trash/trash.service.ts:moveToTrash call
call src/lib/core/filesystem/fs.service.ts:264 in deleteItem -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.service.ts:266 in deleteItem -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:276 in renameItem -> src/lib/core/filesystem/fs.logic.ts:renamedPath call
call src/lib/core/filesystem/fs.service.ts:279 in renameItem -> src/lib/core/filesystem/fs.logic.ts:TargetExistsError new
call src/lib/core/filesystem/fs.service.ts:280 in renameItem -> src/lib/core/filesystem/path-change.service.ts:applyPathChange call
call src/lib/core/filesystem/fs.service.ts:288 in renameItem -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.service.ts:291 in renameItem -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:304 in moveItem -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/core/filesystem/fs.service.ts:308 in moveItem -> src/lib/core/filesystem/fs.logic.ts:TargetExistsError new
call src/lib/core/filesystem/fs.service.ts:309 in moveItem -> src/lib/core/filesystem/path-change.service.ts:applyPathChange call
call src/lib/core/filesystem/fs.service.ts:317 in moveItem -> src/lib/utils/debug.ts:debug call
call src/lib/core/filesystem/fs.service.ts:321 in moveItem -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:334 in copyDirectoryRecursive -> src/lib/core/filesystem/fs.service.ts:copyDirectoryRecursive call
call src/lib/core/filesystem/fs.service.ts:344 in duplicateItem -> src/lib/core/filesystem/fs.logic.ts:getParentPath call
call src/lib/core/filesystem/fs.service.ts:347 in duplicateItem -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/core/filesystem/fs.service.ts:348 in duplicateItem -> src/lib/core/filesystem/fs.logic.ts:generateCopyName call
call src/lib/core/filesystem/fs.service.ts:352 in duplicateItem -> src/lib/core/filesystem/fs.service.ts:copyDirectoryRecursive call
call src/lib/core/filesystem/fs.service.ts:356 in duplicateItem -> src/lib/core/filesystem/fs.service.ts:addScannedToTree call
call src/lib/core/filesystem/fs.service.ts:359 in duplicateItem -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:369 in revealInSystemExplorer -> src/lib/utils/debug.ts:error call
call src/lib/core/filesystem/fs.service.ts:375 in resetFileSystem -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.reset mcall
## effects
fx src/lib/core/filesystem/fs.service.ts:38 tauri-fs.mkdir in ensureKokobrainDir
fx src/lib/core/filesystem/fs.service.ts:45 tauri-fs.exists in loadFolderOrder
fx src/lib/core/filesystem/fs.service.ts:48 tauri-fs.writeTextFile in loadFolderOrder
fx src/lib/core/filesystem/fs.service.ts:52 tauri-fs.readTextFile in loadFolderOrder
ipc-call src/lib/core/filesystem/fs.service.ts:96 in loadDirectoryTree -> ipc:scan_vault -> src-tauri/src/commands/vault.rs:120
ipc-call src/lib/core/filesystem/fs.service.ts:184 in addScannedToTree -> ipc:scan_vault -> src-tauri/src/commands/vault.rs:120
fx src/lib/core/filesystem/fs.service.ts:200 tauri-fs.readDir in createFile
ipc-call src/lib/core/filesystem/fs.service.ts:208 in createFile -> ipc:create_note -> src-tauri/src/commands/vault.rs:1145
fx src/lib/core/filesystem/fs.service.ts:229 tauri-fs.readDir in createFolder
ipc-call src/lib/core/filesystem/fs.service.ts:235 in createFolder -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
fx src/lib/core/filesystem/fs.service.ts:260 tauri-fs.remove in deleteItem
fx src/lib/core/filesystem/fs.service.ts:279 tauri-fs.exists in renameItem
fx src/lib/core/filesystem/fs.service.ts:285 tauri-fs.rename in renameItem
fx src/lib/core/filesystem/fs.service.ts:308 tauri-fs.exists in moveItem
fx src/lib/core/filesystem/fs.service.ts:314 tauri-fs.rename in moveItem
fx src/lib/core/filesystem/fs.service.ts:328 tauri-fs.mkdir in copyDirectoryRecursive
fx src/lib/core/filesystem/fs.service.ts:329 tauri-fs.readDir in copyDirectoryRecursive
fx src/lib/core/filesystem/fs.service.ts:336 tauri-fs.copyFile in copyDirectoryRecursive
fx src/lib/core/filesystem/fs.service.ts:345 tauri-fs.readDir in duplicateItem
fx src/lib/core/filesystem/fs.service.ts:354 tauri-fs.copyFile in duplicateItem
fx src/lib/core/filesystem/fs.service.ts:367 tauri-opener.revealItemInDir in revealInSystemExplorer
