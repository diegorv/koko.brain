# file card src/lib/features/rail-shell/FilesNavigator.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/FilesNavigator.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/rail-shell/FilesNavigator.svelte component L579 module src/lib/features/rail-shell in1 t4
## imports
imp src/lib/features/rail-shell/FilesNavigator.svelte:2 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/features/rail-shell/FilesNavigator.svelte:20 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/features/rail-shell/FilesNavigator.svelte:21 -> src/lib/components/ui/dropdown-menu/index.ts *
imp src/lib/features/rail-shell/FilesNavigator.svelte:22 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/rail-shell/FilesNavigator.svelte:23 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/FilesNavigator.svelte:24 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:25 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/rail-shell/FilesNavigator.svelte:26 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:27 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:28 -> src/lib/core/filesystem/fs.service.ts createFile,createFolder,deleteItem,moveItem,renameItem,revealInSystemExplorer
imp src/lib/features/rail-shell/FilesNavigator.svelte:36 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,findNodeByPath,getFileName,getFileNameError,getRelativePath,PreDeleteSaveError,validateDragDrop
imp src/lib/features/rail-shell/FilesNavigator.svelte:45 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/rail-shell/FilesNavigator.svelte:46 -> src/lib/features/canvas/canvas.service.ts createCanvasFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:47 -> src/lib/features/collection/collection.service.ts createCollectionFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:48 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/FilesNavigator.svelte:49 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/rail-shell/FilesNavigator.svelte:50 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:51 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:52 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:53 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/features/rail-shell/FilesNavigator.svelte:54 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/rail-shell/FilesNavigator.svelte:55 -> src/lib/core/filesystem/folder-notes.logic.ts findFolderNote
imp src/lib/features/rail-shell/FilesNavigator.svelte:56 -> src/lib/features/type-definitions/ViewDialog.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:57 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:58 -> src/lib/features/rail-shell/lens.logic.ts FILES_LENS,FOLDER_LENS_KIND,folderFiles,navigatorFolders,systemFolderPredicate,systemFoldersLast,VIEW_LENS_KIND,viewLabels
imp src/lib/features/rail-shell/FilesNavigator.svelte:68 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:69 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:RailFolderCreator
## imported-by
imp src/lib/app/AppShell.svelte:17 -> src/lib/features/rail-shell/FilesNavigator.svelte default
## reach
in2 src/lib/features/rail-shell/FilesNavigator.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/FilesNavigator.svelte 81 files in 16 modules: src/lib/components(37) src/lib/utils(9) src/lib/features/collection(7) src/lib/features/type-definitions(6) src/lib/core/settings(5) +11 modules
## tests
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte
## symbols
sym src/lib/features/rail-shell/FilesNavigator.svelte:1 component FilesNavigator props:picked,expanded,onPick,onToggle,onPickView L579
by src/lib/features/rail-shell/FilesNavigator.svelte:default <- src/lib/app/AppShell.svelte:223 in (markup) mount
## locals
local src/lib/features/rail-shell/FilesNavigator.svelte:149 fn lensFor(dir: string): Lens L3
local src/lib/features/rail-shell/FilesNavigator.svelte:154 fn runOrToast<T>(verb: string, name: string, op: () => Promise<T>): Promise<T | null> L9
local src/lib/features/rail-shell/FilesNavigator.svelte:165 fn handleNewFile(dir: string, creator: RailFolderCreator) L7
local src/lib/features/rail-shell/FilesNavigator.svelte:174 fn handleNewView(dir: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:180 fn handleNewFolder(dir: string) L6
local src/lib/features/rail-shell/FilesNavigator.svelte:187 fn startRename(path: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:194 fn focusRenameInput(input: HTMLInputElement) L6
local src/lib/features/rail-shell/FilesNavigator.svelte:206 fn absorbWhileClosing(e: Event) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:218 fn commitRename(path: string) L15
local src/lib/features/rail-shell/FilesNavigator.svelte:235 fn handleRenameKeydown(e: KeyboardEvent, path: string) L10
local src/lib/features/rail-shell/FilesNavigator.svelte:247 fn handleDelete(path: string, name: string) L9
local src/lib/features/rail-shell/FilesNavigator.svelte:258 fn copyPath(name: string, text: string) L3
local src/lib/features/rail-shell/FilesNavigator.svelte:262 fn handleCopyRelativePath(path: string, name: string) L3
local src/lib/features/rail-shell/FilesNavigator.svelte:266 fn handleChangeIcon(path: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:271 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:277 fn handleIconColors(color?: string, textColor?: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:282 fn handleIconRemove() L4
local src/lib/features/rail-shell/FilesNavigator.svelte:287 fn handleIconPickerClose() L4
local src/lib/features/rail-shell/FilesNavigator.svelte:293 fn pickFolder(node: FileTreeNode) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:303 fn handleDragStart(e: DragEvent, path: string) L8
local src/lib/features/rail-shell/FilesNavigator.svelte:312 fn handleDragOver(e: DragEvent, dir: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:319 fn handleDragLeave(e: DragEvent, dir: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:331 fn handleDrop(e: DragEvent, dir: string) L12
local src/lib/features/rail-shell/FilesNavigator.svelte:345 fn rowClass(active: boolean, dropTarget = false): string L7
## mounts
mount src/lib/features/rail-shell/FilesNavigator.svelte:478 ViewDialog -> src/lib/features/type-definitions/ViewDialog.svelte
mount src/lib/features/rail-shell/FilesNavigator.svelte:486 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
mount src/lib/features/rail-shell/FilesNavigator.svelte:560 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:223 FilesNavigator -> src/lib/features/rail-shell/FilesNavigator.svelte
## calls
call src/lib/features/rail-shell/FilesNavigator.svelte:90 in isSystem=$derived -> src/lib/features/rail-shell/lens.logic.ts:systemFolderPredicate call
call src/lib/features/rail-shell/FilesNavigator.svelte:98 in topFolders=$derived -> src/lib/features/rail-shell/lens.logic.ts:navigatorFolders call
call src/lib/features/rail-shell/FilesNavigator.svelte:100 in topFolders=$derived -> src/lib/features/rail-shell/lens.logic.ts:systemFoldersLast call
call src/lib/features/rail-shell/FilesNavigator.svelte:106 in pickedPlace=$derived -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/features/rail-shell/FilesNavigator.svelte:115 in fileCreators=$derived -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/rail-shell/FilesNavigator.svelte:115 in fileCreators=$derived -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/rail-shell/FilesNavigator.svelte:117 in fileCreators=$derived -> src/lib/features/canvas/canvas.service.ts:createCanvasFile ref
call src/lib/features/rail-shell/FilesNavigator.svelte:118 in fileCreators=$derived -> src/lib/features/collection/collection.service.ts:createCollectionFile ref
call src/lib/features/rail-shell/FilesNavigator.svelte:128 in createItems=$derived -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewFile call
call src/lib/features/rail-shell/FilesNavigator.svelte:130 in createItems=$derived -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewView ref
call src/lib/features/rail-shell/FilesNavigator.svelte:131 in createItems=$derived -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewFolder ref
call src/lib/features/rail-shell/FilesNavigator.svelte:143 in iconPickerRef=$derived -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/rail-shell/FilesNavigator.svelte:159 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/rail-shell/FilesNavigator.svelte:166 in handleNewFile -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:168 in handleNewFile -> src/lib/features/rail-shell/FilesNavigator.svelte:lensFor call
call src/lib/features/rail-shell/FilesNavigator.svelte:169 in handleNewFile -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/rail-shell/FilesNavigator.svelte:170 in handleNewFile -> src/lib/core/editor/editor.hooks.ts:notifyNoteCreated call
call src/lib/features/rail-shell/FilesNavigator.svelte:181 in handleNewFolder -> src/lib/core/filesystem/fs.service.ts:createFolder call
call src/lib/features/rail-shell/FilesNavigator.svelte:181 in handleNewFolder -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:184 in handleNewFolder -> src/lib/features/rail-shell/FilesNavigator.svelte:startRename call
call src/lib/features/rail-shell/FilesNavigator.svelte:189 in startRename -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:223 in commitRename -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:226 in commitRename -> src/lib/core/filesystem/fs.logic.ts:getFileNameError call
call src/lib/features/rail-shell/FilesNavigator.svelte:231 in commitRename -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:231 in commitRename -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:238 in handleRenameKeydown -> src/lib/features/rail-shell/FilesNavigator.svelte:commitRename call
call src/lib/features/rail-shell/FilesNavigator.svelte:254 in handleDelete -> src/lib/core/filesystem/fs.service.ts:deleteItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:254 in handleDelete -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:259 in copyPath -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:263 in handleCopyRelativePath -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/features/rail-shell/FilesNavigator.svelte:263 in handleCopyRelativePath -> src/lib/features/rail-shell/FilesNavigator.svelte:copyPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:273 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:setIconForPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:274 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon call
call src/lib/features/rail-shell/FilesNavigator.svelte:279 in handleIconColors -> src/lib/features/file-icons/file-icons.service.ts:setIconColors call
call src/lib/features/rail-shell/FilesNavigator.svelte:284 in handleIconRemove -> src/lib/features/file-icons/file-icons.service.ts:removeIconForPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:295 in pickFolder -> src/lib/core/filesystem/folder-notes.logic.ts:findFolderNote call
call src/lib/features/rail-shell/FilesNavigator.svelte:296 in pickFolder -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/rail-shell/FilesNavigator.svelte:335 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:validateDragDrop call
call src/lib/features/rail-shell/FilesNavigator.svelte:337 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:340 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:340 in handleDrop -> src/lib/core/filesystem/fs.service.ts:moveItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:340 in handleDrop -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:374 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:absorbWhileClosing markup +3
call src/lib/features/rail-shell/FilesNavigator.svelte:400 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getFileName markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:406 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:rowClass markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:409 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragOver markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:410 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragLeave markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:411 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDrop markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:434 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getRelativePath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:440 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleChangeIcon markup
call src/lib/features/rail-shell/FilesNavigator.svelte:450 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:copyPath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:453 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleCopyRelativePath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:458 in (markup) -> src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer markup
call src/lib/features/rail-shell/FilesNavigator.svelte:463 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:startRename markup
call src/lib/features/rail-shell/FilesNavigator.svelte:467 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDelete markup
call src/lib/features/rail-shell/FilesNavigator.svelte:481 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:viewLabels markup
call src/lib/features/rail-shell/FilesNavigator.svelte:492 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconSelect markup
call src/lib/features/rail-shell/FilesNavigator.svelte:493 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconColors markup
call src/lib/features/rail-shell/FilesNavigator.svelte:494 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconRemove markup
call src/lib/features/rail-shell/FilesNavigator.svelte:495 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconPickerClose markup
call src/lib/features/rail-shell/FilesNavigator.svelte:500 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:navigatorFolders markup
call src/lib/features/rail-shell/FilesNavigator.svelte:503 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:506 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:folderFiles markup
call src/lib/features/rail-shell/FilesNavigator.svelte:514 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragStart markup
call src/lib/features/rail-shell/FilesNavigator.svelte:545 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleRenameKeydown markup
call src/lib/features/rail-shell/FilesNavigator.svelte:546 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:commitRename markup
call src/lib/features/rail-shell/FilesNavigator.svelte:556 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:pickFolder markup
call src/lib/features/rail-shell/FilesNavigator.svelte:562 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup +1
## effects
fx src/lib/features/rail-shell/FilesNavigator.svelte:195 timer.requestAnimationFrame in focusRenameInput
fx src/lib/features/rail-shell/FilesNavigator.svelte:248 tauri-dialog.ask in handleDelete
