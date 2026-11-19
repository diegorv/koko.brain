# file card src/lib/features/rail-shell/FilesNavigator.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/FilesNavigator.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/rail-shell/FilesNavigator.svelte component L586 module src/lib/features/rail-shell in1 t4
## imports
imp src/lib/features/rail-shell/FilesNavigator.svelte:2 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/features/rail-shell/FilesNavigator.svelte:20 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/features/rail-shell/FilesNavigator.svelte:21 -> src/lib/components/ui/dropdown-menu/index.ts *
imp src/lib/features/rail-shell/FilesNavigator.svelte:22 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/rail-shell/FilesNavigator.svelte:23 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/FilesNavigator.svelte:24 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:25 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/rail-shell/FilesNavigator.svelte:26 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:27 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:28 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,rowSurfaces
imp src/lib/features/rail-shell/FilesNavigator.svelte:29 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:30 -> src/lib/core/filesystem/fs.service.ts createFile,createFolder,deleteItem,moveItem,renameItem,revealInSystemExplorer
imp src/lib/features/rail-shell/FilesNavigator.svelte:38 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,findNodeByPath,getFileName,getFileNameError,getRelativePath,PreDeleteSaveError,validateDragDrop
imp src/lib/features/rail-shell/FilesNavigator.svelte:47 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/rail-shell/FilesNavigator.svelte:48 -> src/lib/features/canvas/canvas.service.ts createCanvasFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:49 -> src/lib/features/collection/collection.service.ts createCollectionFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:50 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/FilesNavigator.svelte:51 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle,readableIconColor
imp src/lib/features/rail-shell/FilesNavigator.svelte:52 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:53 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:54 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:55 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/features/rail-shell/FilesNavigator.svelte:56 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/rail-shell/FilesNavigator.svelte:57 -> src/lib/core/filesystem/folder-notes.logic.ts findFolderNote
imp src/lib/features/rail-shell/FilesNavigator.svelte:58 -> src/lib/features/type-definitions/ViewDialog.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:59 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:60 -> src/lib/features/rail-shell/lens.logic.ts FILES_LENS,FOLDER_LENS_KIND,folderFiles,navigatorFolders,systemFolderPredicate,systemFoldersLast,VIEW_LENS_KIND,viewLabels
imp src/lib/features/rail-shell/FilesNavigator.svelte:70 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:71 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:RailFolderCreator
## imported-by
imp src/lib/app/AppShell.svelte:17 -> src/lib/features/rail-shell/FilesNavigator.svelte default
## reach
in2 src/lib/features/rail-shell/FilesNavigator.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/FilesNavigator.svelte 82 files in 16 modules: src/lib/components(37) src/lib/utils(10) src/lib/features/collection(7) src/lib/features/type-definitions(6) src/lib/core/settings(5) +11 modules
## tests
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte
## symbols
sym src/lib/features/rail-shell/FilesNavigator.svelte:1 component FilesNavigator props:picked,expanded,onPick,onToggle,onPickView L586
by src/lib/features/rail-shell/FilesNavigator.svelte:default <- src/lib/app/AppShell.svelte:225 in (markup) mount
## locals
local src/lib/features/rail-shell/FilesNavigator.svelte:151 fn lensFor(dir: string): Lens L3
local src/lib/features/rail-shell/FilesNavigator.svelte:156 fn runOrToast<T>(verb: string, name: string, op: () => Promise<T>): Promise<T | null> L9
local src/lib/features/rail-shell/FilesNavigator.svelte:167 fn handleNewFile(dir: string, creator: RailFolderCreator) L7
local src/lib/features/rail-shell/FilesNavigator.svelte:176 fn handleNewView(dir: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:182 fn handleNewFolder(dir: string) L6
local src/lib/features/rail-shell/FilesNavigator.svelte:189 fn startRename(path: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:196 fn focusRenameInput(input: HTMLInputElement) L6
local src/lib/features/rail-shell/FilesNavigator.svelte:208 fn absorbWhileClosing(e: Event) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:220 fn commitRename(path: string) L15
local src/lib/features/rail-shell/FilesNavigator.svelte:237 fn handleRenameKeydown(e: KeyboardEvent, path: string) L10
local src/lib/features/rail-shell/FilesNavigator.svelte:249 fn handleDelete(path: string, name: string) L9
local src/lib/features/rail-shell/FilesNavigator.svelte:260 fn copyPath(name: string, text: string) L3
local src/lib/features/rail-shell/FilesNavigator.svelte:264 fn handleCopyRelativePath(path: string, name: string) L3
local src/lib/features/rail-shell/FilesNavigator.svelte:268 fn handleChangeIcon(path: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:273 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:279 fn handleIconColors(color?: string, textColor?: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:284 fn handleIconRemove() L4
local src/lib/features/rail-shell/FilesNavigator.svelte:289 fn handleIconPickerClose() L4
local src/lib/features/rail-shell/FilesNavigator.svelte:295 fn pickFolder(node: FileTreeNode) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:305 fn handleDragStart(e: DragEvent, path: string) L8
local src/lib/features/rail-shell/FilesNavigator.svelte:314 fn handleDragOver(e: DragEvent, dir: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:321 fn handleDragLeave(e: DragEvent, dir: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:333 fn handleDrop(e: DragEvent, dir: string) L12
local src/lib/features/rail-shell/FilesNavigator.svelte:350 fn rowClass(active: boolean, dropTarget = false): string L7
## mounts
mount src/lib/features/rail-shell/FilesNavigator.svelte:483 ViewDialog -> src/lib/features/type-definitions/ViewDialog.svelte
mount src/lib/features/rail-shell/FilesNavigator.svelte:491 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
mount src/lib/features/rail-shell/FilesNavigator.svelte:567 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:225 FilesNavigator -> src/lib/features/rail-shell/FilesNavigator.svelte
## calls
call src/lib/features/rail-shell/FilesNavigator.svelte:92 in isSystem=$derived -> src/lib/features/rail-shell/lens.logic.ts:systemFolderPredicate call
call src/lib/features/rail-shell/FilesNavigator.svelte:100 in topFolders=$derived -> src/lib/features/rail-shell/lens.logic.ts:navigatorFolders call
call src/lib/features/rail-shell/FilesNavigator.svelte:102 in topFolders=$derived -> src/lib/features/rail-shell/lens.logic.ts:systemFoldersLast call
call src/lib/features/rail-shell/FilesNavigator.svelte:108 in pickedPlace=$derived -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/features/rail-shell/FilesNavigator.svelte:117 in fileCreators=$derived -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/rail-shell/FilesNavigator.svelte:117 in fileCreators=$derived -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/rail-shell/FilesNavigator.svelte:119 in fileCreators=$derived -> src/lib/features/canvas/canvas.service.ts:createCanvasFile ref
call src/lib/features/rail-shell/FilesNavigator.svelte:120 in fileCreators=$derived -> src/lib/features/collection/collection.service.ts:createCollectionFile ref
call src/lib/features/rail-shell/FilesNavigator.svelte:130 in createItems=$derived -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewFile call
call src/lib/features/rail-shell/FilesNavigator.svelte:132 in createItems=$derived -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewView ref
call src/lib/features/rail-shell/FilesNavigator.svelte:133 in createItems=$derived -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewFolder ref
call src/lib/features/rail-shell/FilesNavigator.svelte:145 in iconPickerRef=$derived -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/rail-shell/FilesNavigator.svelte:161 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/rail-shell/FilesNavigator.svelte:168 in handleNewFile -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:170 in handleNewFile -> src/lib/features/rail-shell/FilesNavigator.svelte:lensFor call
call src/lib/features/rail-shell/FilesNavigator.svelte:171 in handleNewFile -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/rail-shell/FilesNavigator.svelte:172 in handleNewFile -> src/lib/core/editor/editor.hooks.ts:notifyNoteCreated call
call src/lib/features/rail-shell/FilesNavigator.svelte:183 in handleNewFolder -> src/lib/core/filesystem/fs.service.ts:createFolder call
call src/lib/features/rail-shell/FilesNavigator.svelte:183 in handleNewFolder -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:186 in handleNewFolder -> src/lib/features/rail-shell/FilesNavigator.svelte:startRename call
call src/lib/features/rail-shell/FilesNavigator.svelte:191 in startRename -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:225 in commitRename -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:228 in commitRename -> src/lib/core/filesystem/fs.logic.ts:getFileNameError call
call src/lib/features/rail-shell/FilesNavigator.svelte:233 in commitRename -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:233 in commitRename -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:240 in handleRenameKeydown -> src/lib/features/rail-shell/FilesNavigator.svelte:commitRename call
call src/lib/features/rail-shell/FilesNavigator.svelte:256 in handleDelete -> src/lib/core/filesystem/fs.service.ts:deleteItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:256 in handleDelete -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:261 in copyPath -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:265 in handleCopyRelativePath -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/features/rail-shell/FilesNavigator.svelte:265 in handleCopyRelativePath -> src/lib/features/rail-shell/FilesNavigator.svelte:copyPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:275 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:setIconForPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:276 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon call
call src/lib/features/rail-shell/FilesNavigator.svelte:281 in handleIconColors -> src/lib/features/file-icons/file-icons.service.ts:setIconColors call
call src/lib/features/rail-shell/FilesNavigator.svelte:286 in handleIconRemove -> src/lib/features/file-icons/file-icons.service.ts:removeIconForPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:297 in pickFolder -> src/lib/core/filesystem/folder-notes.logic.ts:findFolderNote call
call src/lib/features/rail-shell/FilesNavigator.svelte:298 in pickFolder -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/rail-shell/FilesNavigator.svelte:337 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:validateDragDrop call
call src/lib/features/rail-shell/FilesNavigator.svelte:339 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:342 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:342 in handleDrop -> src/lib/core/filesystem/fs.service.ts:moveItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:342 in handleDrop -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:347 in rowBgs=$derived -> src/lib/core/settings/theme-surfaces.logic.ts:rowSurfaces call
call src/lib/features/rail-shell/FilesNavigator.svelte:379 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:absorbWhileClosing markup +3
call src/lib/features/rail-shell/FilesNavigator.svelte:405 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getFileName markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:411 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:rowClass markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:414 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragOver markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:415 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragLeave markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:416 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDrop markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:439 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getRelativePath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:445 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleChangeIcon markup
call src/lib/features/rail-shell/FilesNavigator.svelte:455 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:copyPath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:458 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleCopyRelativePath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:463 in (markup) -> src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer markup
call src/lib/features/rail-shell/FilesNavigator.svelte:468 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:startRename markup
call src/lib/features/rail-shell/FilesNavigator.svelte:472 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDelete markup
call src/lib/features/rail-shell/FilesNavigator.svelte:486 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:viewLabels markup
call src/lib/features/rail-shell/FilesNavigator.svelte:497 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconSelect markup
call src/lib/features/rail-shell/FilesNavigator.svelte:498 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconColors markup
call src/lib/features/rail-shell/FilesNavigator.svelte:499 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconRemove markup
call src/lib/features/rail-shell/FilesNavigator.svelte:500 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconPickerClose markup
call src/lib/features/rail-shell/FilesNavigator.svelte:505 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:navigatorFolders markup
call src/lib/features/rail-shell/FilesNavigator.svelte:508 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:510 in (markup) -> src/lib/core/settings/theme-surfaces.logic.ts:readableOn markup
call src/lib/features/rail-shell/FilesNavigator.svelte:511 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:readableIconColor markup
call src/lib/features/rail-shell/FilesNavigator.svelte:513 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:folderFiles markup
call src/lib/features/rail-shell/FilesNavigator.svelte:521 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragStart markup
call src/lib/features/rail-shell/FilesNavigator.svelte:552 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleRenameKeydown markup
call src/lib/features/rail-shell/FilesNavigator.svelte:553 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:commitRename markup
call src/lib/features/rail-shell/FilesNavigator.svelte:563 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:pickFolder markup
call src/lib/features/rail-shell/FilesNavigator.svelte:569 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup +1
## effects
fx src/lib/features/rail-shell/FilesNavigator.svelte:197 timer.requestAnimationFrame in focusRenameInput
fx src/lib/features/rail-shell/FilesNavigator.svelte:250 tauri-dialog.ask in handleDelete
