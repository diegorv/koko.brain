# file card src/lib/features/note-list/NoteRowMenu.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-list/NoteRowMenu.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/note-list/NoteRowMenu.svelte component L302 module src/lib/features/note-list in1 t3
## imports
imp src/lib/features/note-list/NoteRowMenu.svelte:3 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/features/note-list/NoteRowMenu.svelte:13 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/features/note-list/NoteRowMenu.svelte:14 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/note-list/NoteRowMenu.svelte:15 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/note-list/NoteRowMenu.svelte:16 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:17 -> src/lib/core/filesystem/fs.service.ts deleteItem,duplicateItem,renameItem,revealInSystemExplorer
imp src/lib/features/note-list/NoteRowMenu.svelte:18 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,getFileName,getRelativePath,isMarkdownFile,isViewFile,PreDeleteSaveError
imp src/lib/features/note-list/NoteRowMenu.svelte:19 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/note-list/NoteRowMenu.svelte:20 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:21 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/features/note-list/NoteRowMenu.svelte:22 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/note-list/NoteRowMenu.svelte:23 -> src/lib/features/properties/lifecycle.service.ts toggleFavoriteForPath
imp src/lib/features/note-list/NoteRowMenu.svelte:24 -> src/lib/features/type-definitions/type-note-list.logic.ts buildRenameFileName
imp src/lib/features/note-list/NoteRowMenu.svelte:25 -> src/lib/features/type-definitions/type-definitions.service.ts showViewInViews,ViewWriteError
imp src/lib/features/note-list/NoteRowMenu.svelte:26 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:27 -> src/lib/features/type-definitions/type-sidebar.logic.ts getViewVisible
imp src/lib/features/note-list/NoteRowMenu.svelte:28 -> src/lib/utils/keybindings.ts formatShortcut
imp src/lib/features/note-list/NoteRowMenu.svelte:29 -> src/lib/utils/menu-action.types.ts type:MenuActionItem
imp src/lib/features/note-list/NoteRowMenu.svelte:30 -> src/lib/features/note-list/note-row-menu.context.ts RENAME_SHORTCUT,setNoteRowMenuContext,type:NoteRowRenameState
imp src/lib/features/note-list/NoteRowMenu.svelte:31 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:56 -> src/lib/features/note-list/NoteRowMenu.svelte default
## reach
in2 src/lib/features/note-list/NoteRowMenu.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/note-list/NoteRowMenu.svelte 54 files in 16 modules: src/lib/components(19) src/lib/features/collection(5) src/lib/core/editor(4) src/lib/features/file-icons(4) src/lib/utils(4) +11 modules
## tests
test src/tests/lib/features/note-list/NoteRowMenu.favorite.test.ts harness src/lib/features/note-list/NoteRowMenu.svelte mirror via src/tests/fixtures/NoteRowMenuHarness.svelte
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts harness src/lib/features/note-list/NoteRowMenu.svelte mirror via src/tests/fixtures/NoteRowMenuHarness.svelte
test src/tests/lib/features/note-list/NoteRowMenu.test.ts harness src/lib/features/note-list/NoteRowMenu.svelte mirror via src/tests/fixtures/NoteRowMenuHarness.svelte
## symbols
sym src/lib/features/note-list/NoteRowMenu.svelte:1 component NoteRowMenu props:notes,extraItems=,class=,children L302
by src/lib/features/note-list/NoteRowMenu.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:832 in (markup) mount
## locals
local src/lib/features/note-list/NoteRowMenu.svelte:73 fn runOrToast(verb: string, note: NoteRowNote, op: () => Promise<unknown>) L10
local src/lib/features/note-list/NoteRowMenu.svelte:84 fn handleDuplicate(note: NoteRowNote) L3
local src/lib/features/note-list/NoteRowMenu.svelte:89 fn isHiddenView(path: string): boolean L3
local src/lib/features/note-list/NoteRowMenu.svelte:94 fn handleShowInViews(note: NoteRowNote) L9
local src/lib/features/note-list/NoteRowMenu.svelte:104 fn handleStartRename(note: NoteRowNote) L3
local src/lib/features/note-list/NoteRowMenu.svelte:130 fn commitRename() L14
local src/lib/features/note-list/NoteRowMenu.svelte:146 fn cancelRename() L4
local src/lib/features/note-list/NoteRowMenu.svelte:152 fn handleRenameKeydown(e: KeyboardEvent) L9
local src/lib/features/note-list/NoteRowMenu.svelte:162 fn handleDelete(note: NoteRowNote) L9
local src/lib/features/note-list/NoteRowMenu.svelte:172 fn handleChangeIcon(path: string) L4
local src/lib/features/note-list/NoteRowMenu.svelte:177 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L5
local src/lib/features/note-list/NoteRowMenu.svelte:183 fn handleIconColors(color?: string, textColor?: string) L4
local src/lib/features/note-list/NoteRowMenu.svelte:188 fn handleIconRemove() L4
local src/lib/features/note-list/NoteRowMenu.svelte:193 fn handleIconPickerClose() L4
## mounts
mount src/lib/features/note-list/NoteRowMenu.svelte:291 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:832 NoteRowMenu -> src/lib/features/note-list/NoteRowMenu.svelte
## calls
call src/lib/features/note-list/NoteRowMenu.svelte:55 in iconPickerRef=$derived -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/note-list/NoteRowMenu.svelte:58 in (script) -> src/lib/features/note-list/note-row-menu.context.ts:setNoteRowMenuContext call
call src/lib/features/note-list/NoteRowMenu.svelte:60 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:handleStartRename ref
call src/lib/features/note-list/NoteRowMenu.svelte:62 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:commitRename ref
call src/lib/features/note-list/NoteRowMenu.svelte:63 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:handleRenameKeydown ref
call src/lib/features/note-list/NoteRowMenu.svelte:74 in runOrToast -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/note-list/NoteRowMenu.svelte:80 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/note-list/NoteRowMenu.svelte:80 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:85 in handleDuplicate -> src/lib/core/filesystem/fs.service.ts:duplicateItem call
call src/lib/features/note-list/NoteRowMenu.svelte:85 in handleDuplicate -> src/lib/features/note-list/NoteRowMenu.svelte:runOrToast call
call src/lib/features/note-list/NoteRowMenu.svelte:90 in isHiddenView -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/note-list/NoteRowMenu.svelte:90 in isHiddenView -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:90 in isHiddenView -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewVisible call
call src/lib/features/note-list/NoteRowMenu.svelte:96 in handleShowInViews -> src/lib/features/type-definitions/type-definitions.service.ts:showViewInViews call
call src/lib/features/note-list/NoteRowMenu.svelte:100 in handleShowInViews -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/note-list/NoteRowMenu.svelte:100 in handleShowInViews -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:105 in handleStartRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:134 in commitRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:136 in commitRename -> src/lib/features/type-definitions/type-note-list.logic.ts:buildRenameFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:142 in commitRename -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/note-list/NoteRowMenu.svelte:142 in commitRename -> src/lib/features/note-list/NoteRowMenu.svelte:runOrToast call
call src/lib/features/note-list/NoteRowMenu.svelte:148 in cancelRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:155 in handleRenameKeydown -> src/lib/features/note-list/NoteRowMenu.svelte:commitRename call
call src/lib/features/note-list/NoteRowMenu.svelte:158 in handleRenameKeydown -> src/lib/features/note-list/NoteRowMenu.svelte:cancelRename call
call src/lib/features/note-list/NoteRowMenu.svelte:168 in handleDelete -> src/lib/core/filesystem/fs.service.ts:deleteItem call
call src/lib/features/note-list/NoteRowMenu.svelte:168 in handleDelete -> src/lib/features/note-list/NoteRowMenu.svelte:runOrToast call
call src/lib/features/note-list/NoteRowMenu.svelte:179 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:setIconForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:180 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon call
call src/lib/features/note-list/NoteRowMenu.svelte:185 in handleIconColors -> src/lib/features/file-icons/file-icons.service.ts:setIconColors call
call src/lib/features/note-list/NoteRowMenu.svelte:190 in handleIconRemove -> src/lib/features/file-icons/file-icons.service.ts:removeIconForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:224 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
call src/lib/features/note-list/NoteRowMenu.svelte:228 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleDuplicate markup
call src/lib/features/note-list/NoteRowMenu.svelte:232 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:isHiddenView markup
call src/lib/features/note-list/NoteRowMenu.svelte:233 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleShowInViews markup
call src/lib/features/note-list/NoteRowMenu.svelte:249 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getRelativePath markup +1
call src/lib/features/note-list/NoteRowMenu.svelte:256 in (markup) -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile markup +1
call src/lib/features/note-list/NoteRowMenu.svelte:257 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleChangeIcon markup
call src/lib/features/note-list/NoteRowMenu.svelte:261 in (markup) -> src/lib/features/properties/lifecycle.service.ts:toggleFavoriteForPath markup
call src/lib/features/note-list/NoteRowMenu.svelte:266 in (markup) -> src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer markup
call src/lib/features/note-list/NoteRowMenu.svelte:277 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleStartRename markup
call src/lib/features/note-list/NoteRowMenu.svelte:280 in (markup) -> src/lib/utils/keybindings.ts:formatShortcut markup
call src/lib/features/note-list/NoteRowMenu.svelte:282 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleDelete markup
call src/lib/features/note-list/NoteRowMenu.svelte:297 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconSelect markup
call src/lib/features/note-list/NoteRowMenu.svelte:298 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconColors markup
call src/lib/features/note-list/NoteRowMenu.svelte:299 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconRemove markup
call src/lib/features/note-list/NoteRowMenu.svelte:300 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconPickerClose markup
## effects
fx src/lib/features/note-list/NoteRowMenu.svelte:109 svelte.$effect in (script)
fx src/lib/features/note-list/NoteRowMenu.svelte:120 timer.requestAnimationFrame in $effect@109
fx src/lib/features/note-list/NoteRowMenu.svelte:163 tauri-dialog.ask in handleDelete
