# file card src/lib/features/rail-shell/TypesNavigator.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/TypesNavigator.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/rail-shell/TypesNavigator.svelte component L518 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/TypesNavigator.svelte:16 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/TypesNavigator.svelte:17 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:18 -> src/lib/core/filesystem/fs.service.ts revealInSystemExplorer
imp src/lib/features/rail-shell/TypesNavigator.svelte:19 -> src/lib/core/filesystem/delete-note.service.ts deleteNoteWithConfirm
imp src/lib/features/rail-shell/TypesNavigator.svelte:20 -> src/lib/core/filesystem/fs.logic.ts getRelativePath,isViewFile
imp src/lib/features/rail-shell/TypesNavigator.svelte:21 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing
imp src/lib/features/rail-shell/TypesNavigator.svelte:22 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:23 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:24 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:25 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:26 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,rowSurfaces
imp src/lib/features/rail-shell/TypesNavigator.svelte:27 -> src/lib/utils/debounce.ts debounce
imp src/lib/features/rail-shell/TypesNavigator.svelte:28 -> src/lib/utils/debug.ts error
imp src/lib/features/rail-shell/TypesNavigator.svelte:29 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/features/rail-shell/TypesNavigator.svelte:30 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/TypesNavigator.svelte:31 -> src/lib/features/file-icons/file-icons.logic.ts iconColorStyle,readableIconColor
imp src/lib/features/rail-shell/TypesNavigator.svelte:32 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/TypesNavigator.svelte:33 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/rail-shell/TypesNavigator.svelte:34 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:35 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/features/rail-shell/TypesNavigator.svelte:36 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId
imp src/lib/features/rail-shell/TypesNavigator.svelte:37 -> src/lib/features/type-definitions/type-definitions.service.ts createNoteOfType,createTypeDefinition,removeViewIcon,renameType,setViewRailPin,updateViewIcon,updateViewIconColors,ViewWriteError
imp src/lib/features/rail-shell/TypesNavigator.svelte:47 -> src/lib/features/properties/lifecycle.service.ts setTypeRailPin
imp src/lib/features/rail-shell/TypesNavigator.svelte:48 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:49 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/rail-shell/TypesNavigator.svelte:50 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:51 -> src/lib/features/type-definitions/type-definitions.logic.ts validateTypeName
imp src/lib/features/rail-shell/TypesNavigator.svelte:52 -> src/lib/features/type-definitions/TypeNameDialog.svelte default
imp src/lib/features/rail-shell/TypesNavigator.svelte:53 -> src/lib/features/type-definitions/ViewDialog.svelte default
imp src/lib/features/rail-shell/TypesNavigator.svelte:54 -> src/lib/features/rail-shell/lens.logic.ts sameLens,VIEW_LENS_KIND,viewEntriesLoaded,viewLabels
imp src/lib/features/rail-shell/TypesNavigator.svelte:55 -> src/lib/features/rail-shell/view-lens.service.ts countViewNotes,type:ViewCount
imp src/lib/features/rail-shell/TypesNavigator.svelte:56 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:LensContext,type:TypeNavigatorRow
## imported-by
imp src/lib/app/AppShell.svelte:16 -> src/lib/features/rail-shell/TypesNavigator.svelte default
## reach
in2 src/lib/features/rail-shell/TypesNavigator.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/TypesNavigator.svelte 64 files in 17 modules: src/lib/components(20) src/lib/utils(8) src/lib/core/settings(6) src/lib/features/collection(5) src/lib/core/filesystem(4) +12 modules
## tests
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/rail-shell/TypesNavigator.svelte mirror
## symbols
sym src/lib/features/rail-shell/TypesNavigator.svelte:1 component TypesNavigator props:rows,picked,onPick L518
by src/lib/features/rail-shell/TypesNavigator.svelte:default <- src/lib/app/AppShell.svelte:219 in (markup) mount
## locals
local src/lib/features/rail-shell/TypesNavigator.svelte:83 fn titleColorOf(color: string | undefined) L1
local src/lib/features/rail-shell/TypesNavigator.svelte:94 fn recountViews = debounce(…) L7
local src/lib/features/rail-shell/TypesNavigator.svelte:142 fn handleNewType(name: string) L5
local src/lib/features/rail-shell/TypesNavigator.svelte:148 fn handleRename(row: TypeNavigatorRow, path: string) L5
local src/lib/features/rail-shell/TypesNavigator.svelte:154 fn handleEditView(path: string) L6
local src/lib/features/rail-shell/TypesNavigator.svelte:161 fn handleChangeIcon(path: string) L4
local src/lib/features/rail-shell/TypesNavigator.svelte:167 fn handleIconSelect(pack: IconPackId, name: string, color?: string, textColor?: string) L9
local src/lib/features/rail-shell/TypesNavigator.svelte:177 fn handleIconColors(color?: string, textColor?: string) L8
local src/lib/features/rail-shell/TypesNavigator.svelte:186 fn handleIconRemove() L8
local src/lib/features/rail-shell/TypesNavigator.svelte:196 fn isRailPinned(path: string): boolean L3
local src/lib/features/rail-shell/TypesNavigator.svelte:204 fn handleRailPin(kind: 'view' | 'type', write: (pinned: boolean) => Promise<void>, pinned: boolean) L9
local src/lib/features/rail-shell/TypesNavigator.svelte:214 fn handleIconPickerClose() L4
## mounts
mount src/lib/features/rail-shell/TypesNavigator.svelte:296 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:426 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:471 TypeNameDialog -> src/lib/features/type-definitions/TypeNameDialog.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:480 ViewDialog -> src/lib/features/type-definitions/ViewDialog.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:488 ViewDialog -> src/lib/features/type-definitions/ViewDialog.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:493 TypeNameDialog -> src/lib/features/type-definitions/TypeNameDialog.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:507 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:219 TypesNavigator -> src/lib/features/rail-shell/TypesNavigator.svelte
## calls
call src/lib/features/rail-shell/TypesNavigator.svelte:81 in rowBgs=$derived -> src/lib/core/settings/theme-surfaces.logic.ts:rowSurfaces call
call src/lib/features/rail-shell/TypesNavigator.svelte:83 in titleColorOf -> src/lib/core/settings/theme-surfaces.logic.ts:readableOn call
call src/lib/features/rail-shell/TypesNavigator.svelte:94 in recountViews -> src/lib/utils/debounce.ts:debounce call
call src/lib/features/rail-shell/TypesNavigator.svelte:96 in recountViews -> src/lib/features/rail-shell/view-lens.service.ts:countViewNotes call
call src/lib/features/rail-shell/TypesNavigator.svelte:114 in $effect@102 -> src/lib/features/rail-shell/lens.logic.ts:viewEntriesLoaded call
call src/lib/features/rail-shell/TypesNavigator.svelte:118 in $effect@102 -> src/lib/features/rail-shell/TypesNavigator.svelte:recountViews call +1
call src/lib/features/rail-shell/TypesNavigator.svelte:132 in iconPickerRef=$derived -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/rail-shell/TypesNavigator.svelte:144 in handleNewType -> src/lib/features/type-definitions/type-definitions.service.ts:createTypeDefinition call
call src/lib/features/rail-shell/TypesNavigator.svelte:169 in handleIconSelect -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/rail-shell/TypesNavigator.svelte:170 in handleIconSelect -> src/lib/features/type-definitions/type-definitions.service.ts:updateViewIcon call
call src/lib/features/rail-shell/TypesNavigator.svelte:172 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:setIconForPath call
call src/lib/features/rail-shell/TypesNavigator.svelte:174 in handleIconSelect -> src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon call
call src/lib/features/rail-shell/TypesNavigator.svelte:179 in handleIconColors -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/rail-shell/TypesNavigator.svelte:180 in handleIconColors -> src/lib/features/type-definitions/type-definitions.service.ts:updateViewIconColors call
call src/lib/features/rail-shell/TypesNavigator.svelte:182 in handleIconColors -> src/lib/features/file-icons/file-icons.service.ts:setIconColors call
call src/lib/features/rail-shell/TypesNavigator.svelte:188 in handleIconRemove -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/rail-shell/TypesNavigator.svelte:189 in handleIconRemove -> src/lib/features/type-definitions/type-definitions.service.ts:removeViewIcon call
call src/lib/features/rail-shell/TypesNavigator.svelte:191 in handleIconRemove -> src/lib/features/file-icons/file-icons.service.ts:removeIconForPath call
call src/lib/features/rail-shell/TypesNavigator.svelte:208 in handleRailPin -> src/lib/utils/debug.ts:error call
call src/lib/features/rail-shell/TypesNavigator.svelte:284 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:sameLens markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:285 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:296 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:readableIconColor markup +3
call src/lib/features/rail-shell/TypesNavigator.svelte:298 in (markup) -> src/lib/features/file-icons/file-icons.logic.ts:iconColorStyle markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:300 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:titleColorOf markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:315 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup +2
call src/lib/features/rail-shell/TypesNavigator.svelte:319 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleEditView markup
call src/lib/features/rail-shell/TypesNavigator.svelte:334 in (markup) -> src/lib/core/filesystem/fs.logic.ts:getRelativePath markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:339 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleChangeIcon markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:343 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleRailPin markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:343 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:isRailPinned markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:343 in (markup) -> src/lib/features/type-definitions/type-definitions.service.ts:setViewRailPin markup
call src/lib/features/rail-shell/TypesNavigator.svelte:345 in (markup) -> src/lib/core/filesystem/fs.service.ts:revealInSystemExplorer markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:349 in (markup) -> src/lib/core/filesystem/delete-note.service.ts:deleteNoteWithConfirm markup
call src/lib/features/rail-shell/TypesNavigator.svelte:356 in (markup) -> src/lib/features/type-definitions/type-definitions.service.ts:createNoteOfType markup
call src/lib/features/rail-shell/TypesNavigator.svelte:366 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleRename markup
call src/lib/features/rail-shell/TypesNavigator.svelte:390 in (markup) -> src/lib/features/properties/lifecycle.service.ts:setTypeRailPin markup
call src/lib/features/rail-shell/TypesNavigator.svelte:396 in (markup) -> src/lib/features/type-definitions/type-definitions.service.ts:createTypeDefinition markup
call src/lib/features/rail-shell/TypesNavigator.svelte:475 in (markup) -> src/lib/features/type-definitions/type-definitions.logic.ts:validateTypeName markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:476 in (markup) -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:477 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleNewType markup
call src/lib/features/rail-shell/TypesNavigator.svelte:482 in (markup) -> src/lib/features/rail-shell/lens.logic.ts:viewLabels markup +1
call src/lib/features/rail-shell/TypesNavigator.svelte:502 in (markup) -> src/lib/features/type-definitions/type-definitions.service.ts:renameType markup
call src/lib/features/rail-shell/TypesNavigator.svelte:513 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleIconSelect markup
call src/lib/features/rail-shell/TypesNavigator.svelte:514 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleIconColors markup
call src/lib/features/rail-shell/TypesNavigator.svelte:515 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleIconRemove markup
call src/lib/features/rail-shell/TypesNavigator.svelte:516 in (markup) -> src/lib/features/rail-shell/TypesNavigator.svelte:handleIconPickerClose markup
## effects
fx src/lib/features/rail-shell/TypesNavigator.svelte:94 timer-wrap.debounce args=async (paths: string[], ctx: LensContext, propertyIndex: Ma… as recountViews in recountViews
fx src/lib/features/rail-shell/TypesNavigator.svelte:102 svelte.$effect in (script)
