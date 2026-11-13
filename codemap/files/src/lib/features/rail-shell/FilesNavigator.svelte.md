# file card src/lib/features/rail-shell/FilesNavigator.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/FilesNavigator.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/rail-shell/FilesNavigator.svelte component L502 module src/lib/features/rail-shell in1 t4
## imports
imp src/lib/features/rail-shell/FilesNavigator.svelte:2 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/features/rail-shell/FilesNavigator.svelte:18 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/features/rail-shell/FilesNavigator.svelte:19 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/rail-shell/FilesNavigator.svelte:20 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/FilesNavigator.svelte:21 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:22 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/rail-shell/FilesNavigator.svelte:23 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:24 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:25 -> src/lib/core/filesystem/fs.service.ts createFile,createFolder,deleteItem,moveItem,renameItem,revealInSystemExplorer
imp src/lib/features/rail-shell/FilesNavigator.svelte:33 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,findNodeByPath,getFileName,getFileNameError,getRelativePath,PreDeleteSaveError,validateDragDrop
imp src/lib/features/rail-shell/FilesNavigator.svelte:42 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/features/rail-shell/FilesNavigator.svelte:43 -> src/lib/features/canvas/canvas.service.ts createCanvasFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:44 -> src/lib/features/collection/collection.service.ts createCollectionFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:45 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/FilesNavigator.svelte:46 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle
imp src/lib/features/rail-shell/FilesNavigator.svelte:47 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:48 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:49 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:50 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/features/rail-shell/FilesNavigator.svelte:51 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/rail-shell/FilesNavigator.svelte:52 -> src/lib/core/filesystem/folder-notes.logic.ts findFolderNote
imp src/lib/features/rail-shell/FilesNavigator.svelte:53 -> src/lib/features/type-definitions/ViewDialog.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:54 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:55 -> src/lib/features/rail-shell/lens.logic.ts FILES_LENS,FOLDER_LENS_KIND,navigatorFolders,VIEW_LENS_KIND,viewLabels
imp src/lib/features/rail-shell/FilesNavigator.svelte:56 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:57 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:RailFolderCreator
## imported-by
imp src/lib/app/AppShell.svelte:17 -> src/lib/features/rail-shell/FilesNavigator.svelte default
## reach
in2 src/lib/features/rail-shell/FilesNavigator.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/FilesNavigator.svelte 64 files in 16 modules: src/lib/components(20) src/lib/utils(9) src/lib/features/collection(7) src/lib/features/type-definitions(6) src/lib/core/settings(5) +11 modules
## tests
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte mirror
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/features/rail-shell/FilesNavigator.svelte
## symbols
sym src/lib/features/rail-shell/FilesNavigator.svelte:1 component FilesNavigator props:picked,expanded,onPick,onToggle,onPickView L502
by src/lib/features/rail-shell/FilesNavigator.svelte:default <- src/lib/app/AppShell.svelte:223 in (markup) mount
## locals
local src/lib/features/rail-shell/FilesNavigator.svelte:108 fn lensFor(dir: string): Lens L3
local src/lib/features/rail-shell/FilesNavigator.svelte:113 fn runOrToast<T>(verb: string, name: string, op: () => Promise<T>): Promise<T | null> L9
local src/lib/features/rail-shell/FilesNavigator.svelte:124 fn handleNewFile(dir: string, creator: RailFolderCreator) L7
local src/lib/features/rail-shell/FilesNavigator.svelte:133 fn handleNewView(dir: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:139 fn handleNewFolder(dir: string) L6
local src/lib/features/rail-shell/FilesNavigator.svelte:146 fn startRename(path: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:153 fn focusRenameInput(input: HTMLInputElement) L6
local src/lib/features/rail-shell/FilesNavigator.svelte:166 fn commitRename(path: string) L15
local src/lib/features/rail-shell/FilesNavigator.svelte:183 fn handleRenameKeydown(e: KeyboardEvent, path: string) L10
local src/lib/features/rail-shell/FilesNavigator.svelte:195 fn handleDelete(path: string, name: string) L9
local src/lib/features/rail-shell/FilesNavigator.svelte:206 fn copyPath(name: string, text: string) L3
local src/lib/features/rail-shell/FilesNavigator.svelte:210 fn handleCopyRelativePath(path: string, name: string) L3
local src/lib/features/rail-shell/FilesNavigator.svelte:214 fn handleChangeIcon(path: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:219 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:225 fn handleIconColors(color?: string, textColor?: string) L4
local src/lib/features/rail-shell/FilesNavigator.svelte:230 fn handleIconRemove() L4
local src/lib/features/rail-shell/FilesNavigator.svelte:235 fn handleIconPickerClose() L4
local src/lib/features/rail-shell/FilesNavigator.svelte:241 fn pickFolder(node: FileTreeNode) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:251 fn handleDragStart(e: DragEvent, path: string) L8
local src/lib/features/rail-shell/FilesNavigator.svelte:260 fn handleDragOver(e: DragEvent, dir: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:267 fn handleDragLeave(e: DragEvent, dir: string) L5
local src/lib/features/rail-shell/FilesNavigator.svelte:279 fn handleDrop(e: DragEvent, dir: string) L12
local src/lib/features/rail-shell/FilesNavigator.svelte:293 fn rowClass(active: boolean, dropTarget = false): string L7
## mounts
mount src/lib/features/rail-shell/FilesNavigator.svelte:408 ViewDialog -> src/lib/features/type-definitions/ViewDialog.svelte
mount src/lib/features/rail-shell/FilesNavigator.svelte:416 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
mount src/lib/features/rail-shell/FilesNavigator.svelte:487 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:223 FilesNavigator -> src/lib/features/rail-shell/FilesNavigator.svelte
## calls
call src/lib/features/rail-shell/FilesNavigator.svelte:77 in topFolders=$derived -> src/lib/features/rail-shell/lens.logic.ts:navigatorFolders call
call src/lib/features/rail-shell/FilesNavigator.svelte:86 in fileCreators=$derived -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/rail-shell/FilesNavigator.svelte:86 in fileCreators=$derived -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/rail-shell/FilesNavigator.svelte:88 in fileCreators=$derived -> src/lib/features/canvas/canvas.service.ts:createCanvasFile ref
call src/lib/features/rail-shell/FilesNavigator.svelte:89 in fileCreators=$derived -> src/lib/features/collection/collection.service.ts:createCollectionFile ref
call src/lib/features/rail-shell/FilesNavigator.svelte:102 in iconPickerRef=$derived -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/rail-shell/FilesNavigator.svelte:118 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/rail-shell/FilesNavigator.svelte:125 in handleNewFile -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:127 in handleNewFile -> src/lib/features/rail-shell/FilesNavigator.svelte:lensFor call
call src/lib/features/rail-shell/FilesNavigator.svelte:128 in handleNewFile -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/rail-shell/FilesNavigator.svelte:129 in handleNewFile -> src/lib/core/editor/editor.hooks.ts:notifyNoteCreated call
call src/lib/features/rail-shell/FilesNavigator.svelte:140 in handleNewFolder -> src/lib/core/filesystem/fs.service.ts:createFolder call
call src/lib/features/rail-shell/FilesNavigator.svelte:140 in handleNewFolder -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:143 in handleNewFolder -> src/lib/features/rail-shell/FilesNavigator.svelte:startRename call
call src/lib/features/rail-shell/FilesNavigator.svelte:148 in startRename -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:171 in commitRename -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:174 in commitRename -> src/lib/core/filesystem/fs.logic.ts:getFileNameError call
call src/lib/features/rail-shell/FilesNavigator.svelte:179 in commitRename -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:179 in commitRename -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:186 in handleRenameKeydown -> src/lib/features/rail-shell/FilesNavigator.svelte:commitRename call
call src/lib/features/rail-shell/FilesNavigator.svelte:202 in handleDelete -> src/lib/core/filesystem/fs.service.ts:deleteItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:202 in handleDelete -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:207 in copyPath -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:211 in handleCopyRelativePath -> src/lib/core/filesystem/fs.logic.ts:getRelativePath call
call src/lib/features/rail-shell/FilesNavigator.svelte:211 in handleCopyRelativePath -> src/lib/features/rail-shell/FilesNavigator.svelte:copyPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:221 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:setIconForPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:222 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon call
call src/lib/features/rail-shell/FilesNavigator.svelte:227 in handleIconColors -> src/lib/features/file-icons/file-icons.service.ts:setIconColors call
call src/lib/features/rail-shell/FilesNavigator.svelte:232 in handleIconRemove -> src/lib/features/file-icons/file-icons.service.ts:removeIconForPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:243 in pickFolder -> src/lib/core/filesystem/folder-notes.logic.ts:findFolderNote call
call src/lib/features/rail-shell/FilesNavigator.svelte:244 in pickFolder -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/rail-shell/FilesNavigator.svelte:283 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:validateDragDrop call
call src/lib/features/rail-shell/FilesNavigator.svelte:285 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/features/rail-shell/FilesNavigator.svelte:288 in handleDrop -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/rail-shell/FilesNavigator.svelte:288 in handleDrop -> src/lib/core/filesystem/fs.service.ts:moveItem call
call src/lib/features/rail-shell/FilesNavigator.svelte:288 in handleDrop -> src/lib/features/rail-shell/FilesNavigator.svelte:runOrToast call
call src/lib/features/rail-shell/FilesNavigator.svelte:322 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getFileName markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:328 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:rowClass markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:331 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragOver markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:332 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragLeave markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:333 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDrop markup +1
call src/lib/features/rail-shell/FilesNavigator.svelte:350 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewFile markup
call src/lib/features/rail-shell/FilesNavigator.svelte:355 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewView markup
call src/lib/features/rail-shell/FilesNavigator.svelte:359 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleNewFolder markup
call src/lib/features/rail-shell/FilesNavigator.svelte:364 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getRelativePath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:370 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleChangeIcon markup
call src/lib/features/rail-shell/FilesNavigator.svelte:380 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:copyPath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:383 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleCopyRelativePath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:388 in (markup) -> src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer markup
call src/lib/features/rail-shell/FilesNavigator.svelte:393 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:startRename markup
call src/lib/features/rail-shell/FilesNavigator.svelte:397 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDelete markup
call src/lib/features/rail-shell/FilesNavigator.svelte:411 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:viewLabels markup
call src/lib/features/rail-shell/FilesNavigator.svelte:422 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconSelect markup
call src/lib/features/rail-shell/FilesNavigator.svelte:423 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconColors markup
call src/lib/features/rail-shell/FilesNavigator.svelte:424 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconRemove markup
call src/lib/features/rail-shell/FilesNavigator.svelte:425 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleIconPickerClose markup
call src/lib/features/rail-shell/FilesNavigator.svelte:430 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:navigatorFolders markup
call src/lib/features/rail-shell/FilesNavigator.svelte:433 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/rail-shell/FilesNavigator.svelte:441 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleDragStart markup
call src/lib/features/rail-shell/FilesNavigator.svelte:472 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:handleRenameKeydown markup
call src/lib/features/rail-shell/FilesNavigator.svelte:473 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:commitRename markup
call src/lib/features/rail-shell/FilesNavigator.svelte:483 in (markup) -> src/lib/features/rail-shell/FilesNavigator.svelte:pickFolder markup
call src/lib/features/rail-shell/FilesNavigator.svelte:489 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup +1
## effects
fx src/lib/features/rail-shell/FilesNavigator.svelte:154 timer.requestAnimationFrame in focusRenameInput
fx src/lib/features/rail-shell/FilesNavigator.svelte:196 tauri-dialog.ask in handleDelete
