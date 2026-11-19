# file card src/lib/features/note-list/NoteRowMenu.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-list/NoteRowMenu.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/note-list/NoteRowMenu.svelte component L321 module src/lib/features/note-list in1 t5
## imports
imp src/lib/features/note-list/NoteRowMenu.svelte:16 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/features/note-list/NoteRowMenu.svelte:17 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/note-list/NoteRowMenu.svelte:18 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/note-list/NoteRowMenu.svelte:19 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/note-list/NoteRowMenu.svelte:20 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:21 -> src/lib/core/filesystem/fs.service.ts duplicateItem,renameItem,revealInSystemExplorer
imp src/lib/features/note-list/NoteRowMenu.svelte:22 -> src/lib/core/filesystem/delete-note.service.ts deleteNoteWithConfirm
imp src/lib/features/note-list/NoteRowMenu.svelte:23 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,getFileName,getRelativePath,isMarkdownFile,isViewFile,PreDeleteSaveError
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
imp src/lib/features/rail-shell/RailNoteList.svelte:58 -> src/lib/features/note-list/NoteRowMenu.svelte default
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
sym src/lib/features/note-list/NoteRowMenu.svelte:1 component NoteRowMenu props:notes,extraItems=,class=,children L321
by src/lib/features/note-list/NoteRowMenu.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:891 in (markup) mount
## locals
local src/lib/features/note-list/NoteRowMenu.svelte:80 fn runOrToast(verb: string, note: NoteRowNote, op: () => Promise<unknown>) L10
local src/lib/features/note-list/NoteRowMenu.svelte:91 fn handleDuplicate(note: NoteRowNote) L3
local src/lib/features/note-list/NoteRowMenu.svelte:96 fn isHiddenView(path: string): boolean L3
local src/lib/features/note-list/NoteRowMenu.svelte:101 fn handleShowInViews(note: NoteRowNote) L9
local src/lib/features/note-list/NoteRowMenu.svelte:111 fn handleStartRename(note: NoteRowNote) L3
local src/lib/features/note-list/NoteRowMenu.svelte:137 fn commitRename() L14
local src/lib/features/note-list/NoteRowMenu.svelte:153 fn cancelRename() L4
local src/lib/features/note-list/NoteRowMenu.svelte:159 fn handleRenameKeydown(e: KeyboardEvent) L9
local src/lib/features/note-list/NoteRowMenu.svelte:170 fn noteActionIcon(id: NoteActionId, note: NoteRowNote): Component L6
local src/lib/features/note-list/NoteRowMenu.svelte:178 fn runNoteAction(id: NoteActionId, note: NoteRowNote) L9
local src/lib/features/note-list/NoteRowMenu.svelte:188 fn handleChangeIcon(path: string) L4
local src/lib/features/note-list/NoteRowMenu.svelte:193 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L5
local src/lib/features/note-list/NoteRowMenu.svelte:199 fn handleIconColors(color?: string, textColor?: string) L4
local src/lib/features/note-list/NoteRowMenu.svelte:204 fn handleIconRemove() L4
local src/lib/features/note-list/NoteRowMenu.svelte:209 fn handleIconPickerClose() L4
## mounts
mount src/lib/features/note-list/NoteRowMenu.svelte:310 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:891 NoteRowMenu -> src/lib/features/note-list/NoteRowMenu.svelte
## calls
call src/lib/features/note-list/NoteRowMenu.svelte:62 in iconPickerRef=$derived -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/note-list/NoteRowMenu.svelte:65 in (script) -> src/lib/features/note-list/note-row-menu.context.ts:setNoteRowMenuContext call
call src/lib/features/note-list/NoteRowMenu.svelte:67 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:handleStartRename ref
call src/lib/features/note-list/NoteRowMenu.svelte:69 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:commitRename ref
call src/lib/features/note-list/NoteRowMenu.svelte:70 in (script) -> src/lib/features/note-list/NoteRowMenu.svelte:handleRenameKeydown ref
call src/lib/features/note-list/NoteRowMenu.svelte:81 in runOrToast -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/note-list/NoteRowMenu.svelte:87 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/note-list/NoteRowMenu.svelte:87 in runOrToast -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:92 in handleDuplicate -> src/lib/core/filesystem/fs.service.ts:duplicateItem call
call src/lib/features/note-list/NoteRowMenu.svelte:92 in handleDuplicate -> src/lib/features/note-list/NoteRowMenu.svelte:runOrToast call
call src/lib/features/note-list/NoteRowMenu.svelte:97 in isHiddenView -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/note-list/NoteRowMenu.svelte:97 in isHiddenView -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:97 in isHiddenView -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewVisible call
call src/lib/features/note-list/NoteRowMenu.svelte:103 in handleShowInViews -> src/lib/features/type-definitions/type-definitions.service.ts:showViewInViews call
call src/lib/features/note-list/NoteRowMenu.svelte:107 in handleShowInViews -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
call src/lib/features/note-list/NoteRowMenu.svelte:107 in handleShowInViews -> src/lib/core/filesystem/fs.logic.ts:getFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:112 in handleStartRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:141 in commitRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:143 in commitRename -> src/lib/features/type-definitions/type-note-list.logic.ts:buildRenameFileName call
call src/lib/features/note-list/NoteRowMenu.svelte:149 in commitRename -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/note-list/NoteRowMenu.svelte:149 in commitRename -> src/lib/features/note-list/NoteRowMenu.svelte:runOrToast call
call src/lib/features/note-list/NoteRowMenu.svelte:155 in cancelRename -> src/lib/core/filesystem/fs.store.svelte.ts:fsStore.setRenamingPath mcall
call src/lib/features/note-list/NoteRowMenu.svelte:162 in handleRenameKeydown -> src/lib/features/note-list/NoteRowMenu.svelte:commitRename call
call src/lib/features/note-list/NoteRowMenu.svelte:165 in handleRenameKeydown -> src/lib/features/note-list/NoteRowMenu.svelte:cancelRename call
call src/lib/features/note-list/NoteRowMenu.svelte:179 in runNoteAction -> src/lib/features/properties/lifecycle.service.ts:setArchivedForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:180 in runNoteAction -> src/lib/features/properties/lifecycle.service.ts:setOrganizedForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:181 in runNoteAction -> src/lib/core/filesystem/delete-note.service.ts:deleteNoteWithConfirm call
call src/lib/features/note-list/NoteRowMenu.svelte:184 in runNoteAction -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/note-list/NoteRowMenu.svelte:185 in runNoteAction -> src/lib/features/file-history/file-history.service.ts:openFileHistory call
call src/lib/features/note-list/NoteRowMenu.svelte:195 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:setIconForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:196 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon call
call src/lib/features/note-list/NoteRowMenu.svelte:201 in handleIconColors -> src/lib/features/file-icons/file-icons.service.ts:setIconColors call
call src/lib/features/note-list/NoteRowMenu.svelte:206 in handleIconRemove -> src/lib/features/file-icons/file-icons.service.ts:removeIconForPath call
call src/lib/features/note-list/NoteRowMenu.svelte:240 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
call src/lib/features/note-list/NoteRowMenu.svelte:244 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleDuplicate markup
call src/lib/features/note-list/NoteRowMenu.svelte:248 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:isHiddenView markup
call src/lib/features/note-list/NoteRowMenu.svelte:249 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleShowInViews markup
call src/lib/features/note-list/NoteRowMenu.svelte:265 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getRelativePath markup +1
call src/lib/features/note-list/NoteRowMenu.svelte:272 in (markup) -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile markup +2
call src/lib/features/note-list/NoteRowMenu.svelte:273 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleChangeIcon markup
call src/lib/features/note-list/NoteRowMenu.svelte:277 in (markup) -> src/lib/features/properties/lifecycle.service.ts:toggleFavoriteForPath markup
call src/lib/features/note-list/NoteRowMenu.svelte:282 in (markup) -> src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer markup
call src/lib/features/note-list/NoteRowMenu.svelte:293 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleStartRename markup
call src/lib/features/note-list/NoteRowMenu.svelte:296 in (markup) -> src/lib/utils/keybindings.ts:formatShortcut markup
call src/lib/features/note-list/NoteRowMenu.svelte:298 in (markup) -> src/lib/features/properties/note-actions.logic.ts:noteActions markup
call src/lib/features/note-list/NoteRowMenu.svelte:299 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:noteActionIcon markup
call src/lib/features/note-list/NoteRowMenu.svelte:300 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:runNoteAction markup
call src/lib/features/note-list/NoteRowMenu.svelte:316 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconSelect markup
call src/lib/features/note-list/NoteRowMenu.svelte:317 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconColors markup
call src/lib/features/note-list/NoteRowMenu.svelte:318 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconRemove markup
call src/lib/features/note-list/NoteRowMenu.svelte:319 in (markup) -> src/lib/features/note-list/NoteRowMenu.svelte:handleIconPickerClose markup
## effects
fx src/lib/features/note-list/NoteRowMenu.svelte:116 svelte.$effect in (script)
fx src/lib/features/note-list/NoteRowMenu.svelte:127 timer.requestAnimationFrame in $effect@116
