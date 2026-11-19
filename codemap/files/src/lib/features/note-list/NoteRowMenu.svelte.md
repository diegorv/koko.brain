# file card src/lib/features/note-list/NoteRowMenu.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-list/NoteRowMenu.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/note-list/NoteRowMenu.svelte component L331 module src/lib/features/note-list in1 t5
## imports
imp src/lib/features/note-list/NoteRowMenu.svelte:16 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/features/note-list/NoteRowMenu.svelte:17 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/note-list/NoteRowMenu.svelte:18 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/note-list/NoteRowMenu.svelte:19 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/note-list/NoteRowMenu.svelte:20 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:21 -> src/lib/core/filesystem/fs.service.ts duplicateItem,renameItem,revealInSystemExplorer
imp src/lib/features/note-list/NoteRowMenu.svelte:22 -> src/lib/core/filesystem/delete-note.service.ts deleteNoteWithConfirm
imp src/lib/features/note-list/NoteRowMenu.svelte:23 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,getFileName,getRelativePath,isMarkdownFile,isViewFile,PreDeleteSaveError,renamedPath
imp src/lib/features/note-list/NoteRowMenu.svelte:24 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/note-list/NoteRowMenu.svelte:25 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:26 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/features/note-list/NoteRowMenu.svelte:27 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/note-list/NoteRowMenu.svelte:28 -> src/lib/features/file-history/file-history.service.ts openFileHistory
imp src/lib/features/note-list/NoteRowMenu.svelte:29 -> src/lib/features/properties/lifecycle.service.ts setArchivedForPath,setOrganizedForPath,toggleFavoriteForPath
imp src/lib/features/note-list/NoteRowMenu.svelte:30 -> src/lib/features/properties/note-actions.logic.ts noteActions,type:NoteActionId
imp src/lib/features/note-list/NoteRowMenu.svelte:31 -> src/lib/features/type-definitions/type-note-list.logic.ts buildRenameFileName
imp src/lib/features/note-list/NoteRowMenu.svelte:32 -> src/lib/features/type-definitions/type-definitions.service.ts showViewInViews,ViewWriteError
imp src/lib/features/note-list/NoteRowMenu.svelte:33 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:34 -> src/lib/features/type-definitions/type-sidebar.logic.ts getViewVisible
imp src/lib/features/note-list/NoteRowMenu.svelte:35 -> src/lib/utils/keybindings.ts formatShortcut
imp src/lib/features/note-list/NoteRowMenu.svelte:36 -> src/lib/utils/menu-action.types.ts type:MenuActionItem
imp src/lib/features/note-list/NoteRowMenu.svelte:37 -> src/lib/features/note-list/note-row-menu.context.ts RENAME_SHORTCUT,setNoteRowMenuContext,type:NoteRowRenameState
imp src/lib/features/note-list/NoteRowMenu.svelte:38 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:59 -> src/lib/features/note-list/NoteRowMenu.svelte default
## reach
in2 src/lib/features/note-list/NoteRowMenu.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/note-list/NoteRowMenu.svelte 56 files in 17 modules: src/lib/components(19) src/lib/features/collection(5) src/lib/features/file-icons(4) src/lib/utils(4) src/lib/core/editor(3) +12 modules
## tests
test src/tests/lib/features/note-list/NoteRowMenu.favorite.test.ts harness src/lib/features/note-list/NoteRowMenu.svelte mirror via src/tests/fixtures/NoteRowMenuHarness.svelte
test src/tests/lib/features/note-list/NoteRowMenu.lifecycle.test.ts harness src/lib/features/note-list/NoteRowMenu.svelte mirror via src/tests/fixtures/NoteRowMenuHarness.svelte
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts harness src/lib/features/note-list/NoteRowMenu.svelte mirror via src/tests/fixtures/NoteRowMenuHarness.svelte
test src/tests/lib/features/note-list/NoteRowMenu.test.ts harness src/lib/features/note-list/NoteRowMenu.svelte mirror via src/tests/fixtures/NoteRowMenuHarness.svelte
test src/tests/lib/features/note-list/NoteRow.test.ts harness src/lib/features/note-list/NoteRowMenu.svelte via src/tests/fixtures/NoteRowMenuHarness.svelte
## symbols
sym src/lib/features/note-list/NoteRowMenu.svelte:1 component NoteRowMenu props:notes,extraItems=,class=,children,ref=$bindable,onRename,onRenameFailed L331
by src/lib/features/note-list/NoteRowMenu.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:1038 in (markup) mount
## locals
local src/lib/features/note-list/NoteRowMenu.svelte:87 fn runOrToast(verb: string, note: NoteRowNote, op: () => Promise<unknown>): Promise<boolean> L11
local src/lib/features/note-list/NoteRowMenu.svelte:99 fn handleDuplicate(note: NoteRowNote) L3
local src/lib/features/note-list/NoteRowMenu.svelte:104 fn isHiddenView(path: string): boolean L3
local src/lib/features/note-list/NoteRowMenu.svelte:109 fn handleShowInViews(note: NoteRowNote) L9
local src/lib/features/note-list/NoteRowMenu.svelte:119 fn handleStartRename(note: NoteRowNote) L3
local src/lib/features/note-list/NoteRowMenu.svelte:145 fn commitRename() L15
local src/lib/features/note-list/NoteRowMenu.svelte:162 fn cancelRename() L4
local src/lib/features/note-list/NoteRowMenu.svelte:168 fn handleRenameKeydown(e: KeyboardEvent) L9
local src/lib/features/note-list/NoteRowMenu.svelte:179 fn noteActionIcon(id: NoteActionId, note: NoteRowNote): Component L6
local src/lib/features/note-list/NoteRowMenu.svelte:187 fn runNoteAction(id: NoteActionId, note: NoteRowNote) L9
local src/lib/features/note-list/NoteRowMenu.svelte:197 fn handleChangeIcon(path: string) L4
local src/lib/features/note-list/NoteRowMenu.svelte:202 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L5
local src/lib/features/note-list/NoteRowMenu.svelte:208 fn handleIconColors(color?: string, textColor?: string) L4
local src/lib/features/note-list/NoteRowMenu.svelte:213 fn handleIconRemove() L4
local src/lib/features/note-list/NoteRowMenu.svelte:218 fn handleIconPickerClose() L4
## mounts
mount src/lib/features/note-list/NoteRowMenu.svelte:320 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:1038 NoteRowMenu -> src/lib/features/note-list/NoteRowMenu.svelte
## calls
call src/lib/features/note-list/NoteRowMenu.svelte:68 in iconPickerRef=$derived -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/note-list/NoteRowMenu.svelte:71 in (script) -> src/lib/features/note-list/note-row-menu.context.ts:setNoteRowMenuContext call
call src/lib/features/note-list/NoteRowMenu.svelte:73 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:handleStartRename ref
call src/lib/features/note-list/NoteRowMenu.svelte:75 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:commitRename ref
call src/lib/features/note-list/NoteRowMenu.svelte:76 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:handleRenameKeydown ref
call src/lib/features/note-list/NoteRowMenu.svelte:88 in runOrToast -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/note-list/NoteRowMenu.svelte:94 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/note-list/NoteRowMenu.svelte:94 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:100 in handleDuplicate -> src/lib/core/filesystem/fs.service.ts:duplicateItem call
call src/lib/features/note-list/NoteRowMenu.svelte:100 in handleDuplicate -> src/lib/features/note-list/NoteRowMenu.svelte:runOrToast call
call src/lib/features/note-list/NoteRowMenu.svelte:105 in isHiddenView -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/note-list/NoteRowMenu.svelte:105 in isHiddenView -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:105 in isHiddenView -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewVisible call
call src/lib/features/note-list/NoteRowMenu.svelte:111 in handleShowInViews -> src/lib/features/type-definitions/type-definitions.service.ts:showViewInViews call
call src/lib/features/note-list/NoteRowMenu.svelte:115 in handleShowInViews -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/note-list/NoteRowMenu.svelte:115 in handleShowInViews -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:120 in handleStartRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:149 in commitRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:151 in commitRename -> src/lib/features/type-definitions/type-note-list.logic.ts:buildRenameFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:157 in commitRename -> src/lib/core/filesystem/fs.logic.ts:renamedPath call
call src/lib/features/note-list/NoteRowMenu.svelte:158 in commitRename -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/note-list/NoteRowMenu.svelte:158 in commitRename -> src/lib/features/note-list/NoteRowMenu.svelte:runOrToast call
call src/lib/features/note-list/NoteRowMenu.svelte:164 in cancelRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:171 in handleRenameKeydown -> src/lib/features/note-list/NoteRowMenu.svelte:commitRename call
call src/lib/features/note-list/NoteRowMenu.svelte:174 in handleRenameKeydown -> src/lib/features/note-list/NoteRowMenu.svelte:cancelRename call
call src/lib/features/note-list/NoteRowMenu.svelte:188 in runNoteAction -> src/lib/features/properties/lifecycle.service.ts:setArchivedForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:189 in runNoteAction -> src/lib/features/properties/lifecycle.service.ts:setOrganizedForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:190 in runNoteAction -> src/lib/core/filesystem/delete-note.service.ts:deleteNoteWithConfirm call
call src/lib/features/note-list/NoteRowMenu.svelte:193 in runNoteAction -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/note-list/NoteRowMenu.svelte:194 in runNoteAction -> src/lib/features/file-history/file-history.service.ts:openFileHistory call
call src/lib/features/note-list/NoteRowMenu.svelte:204 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:setIconForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:205 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon call
call src/lib/features/note-list/NoteRowMenu.svelte:210 in handleIconColors -> src/lib/features/file-icons/file-icons.service.ts:setIconColors call
call src/lib/features/note-list/NoteRowMenu.svelte:215 in handleIconRemove -> src/lib/features/file-icons/file-icons.service.ts:removeIconForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:250 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
call src/lib/features/note-list/NoteRowMenu.svelte:254 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleDuplicate markup
call src/lib/features/note-list/NoteRowMenu.svelte:258 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:isHiddenView markup
call src/lib/features/note-list/NoteRowMenu.svelte:259 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleShowInViews markup
call src/lib/features/note-list/NoteRowMenu.svelte:275 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getRelativePath markup +1
call src/lib/features/note-list/NoteRowMenu.svelte:282 in (markup) -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile markup +2
call src/lib/features/note-list/NoteRowMenu.svelte:283 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleChangeIcon markup
call src/lib/features/note-list/NoteRowMenu.svelte:287 in (markup) -> src/lib/features/properties/lifecycle.service.ts:toggleFavoriteForPath markup
call src/lib/features/note-list/NoteRowMenu.svelte:292 in (markup) -> src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer markup
call src/lib/features/note-list/NoteRowMenu.svelte:303 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleStartRename markup
call src/lib/features/note-list/NoteRowMenu.svelte:306 in (markup) -> src/lib/utils/keybindings.ts:formatShortcut markup
call src/lib/features/note-list/NoteRowMenu.svelte:308 in (markup) -> src/lib/features/properties/note-actions.logic.ts:noteActions markup
call src/lib/features/note-list/NoteRowMenu.svelte:309 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:noteActionIcon markup
call src/lib/features/note-list/NoteRowMenu.svelte:310 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:runNoteAction markup
call src/lib/features/note-list/NoteRowMenu.svelte:326 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconSelect markup
call src/lib/features/note-list/NoteRowMenu.svelte:327 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconColors markup
call src/lib/features/note-list/NoteRowMenu.svelte:328 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconRemove markup
call src/lib/features/note-list/NoteRowMenu.svelte:329 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconPickerClose markup
## effects
fx src/lib/features/note-list/NoteRowMenu.svelte:124 svelte.$effect in (script)
fx src/lib/features/note-list/NoteRowMenu.svelte:135 timer.requestAnimationFrame in $effect@124
