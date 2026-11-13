# file card src/lib/features/type-definitions/type-definitions.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/type-definitions.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/type-definitions/type-definitions.service.ts service L549 module src/lib/features/type-definitions in10 t14
## imports
imp src/lib/features/type-definitions/type-definitions.service.ts:2 -> pkg:@tauri-apps/plugin-fs exists,readDir,readTextFile,writeTextFile
imp src/lib/features/type-definitions/type-definitions.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/features/type-definitions/type-definitions.service.ts:4 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/type-definitions.service.ts:5 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/type-definitions/type-definitions.service.ts:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/type-definitions/type-definitions.service.ts:7 -> src/lib/core/editor/editor.service.ts openFileInEditor,saveFileByPath,syncExternalContentToEditor,waitForTabSave
imp src/lib/features/type-definitions/type-definitions.service.ts:8 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/type-definitions/type-definitions.service.ts:9 -> src/lib/core/editor/editor.logic.ts isTabDirty
imp src/lib/features/type-definitions/type-definitions.service.ts:10 -> src/lib/core/note-creator/note-creator.service.ts loadNoteTemplate,openOrCreateNote
imp src/lib/features/type-definitions/type-definitions.service.ts:11 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization,withUnorganizedFlag
imp src/lib/features/type-definitions/type-definitions.service.ts:12 -> src/lib/core/filesystem/fs.service.ts createFile,renameItem
imp src/lib/features/type-definitions/type-definitions.service.ts:13 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/features/type-definitions/type-definitions.service.ts:14 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/features/type-definitions/type-definitions.service.ts:15 -> src/lib/core/filesystem/fs.logic.ts generateUniqueName
imp src/lib/features/type-definitions/type-definitions.service.ts:16 -> src/lib/core/settings/rail-pin.logic.ts typePinKey
imp src/lib/features/type-definitions/type-definitions.service.ts:18 -> src/lib/utils/debug.ts error
imp src/lib/features/type-definitions/type-definitions.service.ts:19 -> src/lib/features/type-definitions/type-definitions.logic.ts buildTypeMetadataMap,sameTypeMetadata,buildTypeNoteDir,rewriteTypeInFrontmatter,typeNameTakenMessage
imp src/lib/features/type-definitions/type-definitions.service.ts:20 -> src/lib/features/type-definitions/type-sidebar.logic.ts buildNewViewYaml,showViewInViewsYaml,updateViewColorsYaml,updateViewIconYaml,updateViewListPropertiesYaml,updateViewRailYaml
imp src/lib/features/type-definitions/type-definitions.service.ts:21 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/type-definitions/type-definitions.service.ts:22 -> src/lib/features/collection/yaml-parser.ts updateViewEditYaml,type:ViewEdit
imp src/lib/features/type-definitions/type-definitions.service.ts:23 -> src/lib/features/type-definitions/type-note-list.logic.ts applyToolbarEdit,type:ToolbarKey,type:ToolbarValues
imp src/lib/features/type-definitions/type-definitions.service.ts:24 -> src/lib/features/type-definitions/view-parse-cache.ts refreshViewDefinition
imp src/lib/features/type-definitions/type-definitions.service.ts:25 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter
## imported-by
imp src/lib/app/EditorView.svelte:15 -> src/lib/features/type-definitions/type-definitions.service.ts rewriteViewFile
imp src/lib/app/tauri-listeners.service.ts:12 -> src/lib/features/type-definitions/type-definitions.service.ts refreshTypeDefinitions
imp src/lib/features/event-calendar/EventCalendarSection.svelte:18 -> src/lib/features/type-definitions/type-definitions.service.ts createTypeDefinition,refreshTypeDefinitions
imp src/lib/features/event-calendar/event-calendar.service.ts:31 -> src/lib/features/type-definitions/type-definitions.service.ts createTypedNote
imp src/lib/features/note-list/NoteRowMenu.svelte:25 -> src/lib/features/type-definitions/type-definitions.service.ts showViewInViews,ViewWriteError
imp src/lib/features/rail-shell/RailNoteList.svelte:35 -> src/lib/features/type-definitions/type-definitions.service.ts updateViewListProperties,updateViewToolbarKey,ViewWriteConflict,ViewWriteError
imp src/lib/features/rail-shell/TypesNavigator.svelte:35 -> src/lib/features/type-definitions/type-definitions.service.ts createNoteOfType,createTypeDefinition,removeViewIcon,renameType,setViewRailPin,updateViewIcon,updateViewIconColors,ViewWriteError
imp src/lib/features/rail-shell/new-note.service.ts:9 -> src/lib/features/type-definitions/type-definitions.service.ts createTypedNote
imp src/lib/features/type-definitions/ViewDialog.svelte:17 -> src/lib/features/type-definitions/type-definitions.service.ts createView,editView
imp src/lib/plugins/mods/mod-app.service.ts:11 -> src/lib/features/type-definitions/type-definitions.service.ts createTypedNote
## reach
in2 src/lib/features/type-definitions/type-definitions.service.ts 17 files in 6 modules: src/lib/features/event-calendar(7) src/lib/app(6) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1) src/lib/plugins/mods(1) +1 modules: q impact src/lib/features/type-definitions/type-definitions.service.ts --depth 2
out2 src/lib/features/type-definitions/type-definitions.service.ts 24 files in 11 modules: src/lib/utils(5) src/lib/core/settings(4) src/lib/contracts(3) src/lib/core/filesystem(3) src/lib/features/collection(3) +6 modules
## tests
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/type-definitions/type-definitions.service.ts mirror
test src/tests/lib/features/type-definitions/create-view-folder.service.test.ts imports src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/type-definitions/edit-view.service.test.ts imports src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/type-definitions/rewrite-view-file.service.test.ts imports src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/type-definitions/type-definitions.reactivity.client.test.ts imports src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/type-definitions/update-view-toolbar-key.service.test.ts imports src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/app/AppShell.test.ts mocks src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/event-calendar/EventCalendarSection.test.ts mocks src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts mocks src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts mocks src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts mocks src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts mocks src/lib/features/type-definitions/type-definitions.service.ts
test src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts mocks src/lib/features/type-definitions/type-definitions.service.ts
## symbols
sym src/lib/features/type-definitions/type-definitions.service.ts:28 fn refreshTypeDefinitions(entries?: NoteEntryV2[]): Promise<void> L7 | Rebuilds the type metadata map.
by src/lib/features/type-definitions/type-definitions.service.ts:refreshTypeDefinitions <- src/lib/app/tauri-listeners.service.ts:213 in registerVaultIndexUpdatedListener call +1
by src/lib/features/type-definitions/type-definitions.service.ts:refreshTypeDefinitions <- src/lib/features/event-calendar/EventCalendarSection.svelte:104 in openEventType call
sym src/lib/features/type-definitions/type-definitions.service.ts:37 interface TypedNoteTarget L12 | Where a new note of a type goes, and the template it starts from.
sym src/lib/features/type-definitions/type-definitions.service.ts:54 fn resolveTypedNoteTarget(typeName: string, baseTitle: string): Promise<TypedNoteTarget | null> L28 | Resolves the folder, deduped filename and template for a new note of `typeName` titled `baseTitle`.
sym src/lib/features/type-definitions/type-definitions.service.ts:84 fn createNoteOfType(typeName: string): Promise<void> L12 | Creates a new note of a given type, applying the type's template if configured.
by src/lib/features/type-definitions/type-definitions.service.ts:createNoteOfType <- src/lib/features/rail-shell/TypesNavigator.svelte:350 in (markup) markup
sym src/lib/features/type-definitions/type-definitions.service.ts:98 interface CreateTypedNoteOptions L15 | Options for createTypedNote.
sym src/lib/features/type-definitions/type-definitions.service.ts:129 fn createTypedNote(options: CreateTypedNoteOptions): Promise<string> L27 | Creates a note of a type without opening it, through the same folder, dedupe and template owner as createNoteOfType.
by src/lib/features/type-definitions/type-definitions.service.ts:createTypedNote <- src/lib/features/event-calendar/event-calendar.service.ts:938 in createNow call
by src/lib/features/type-definitions/type-definitions.service.ts:createTypedNote <- src/lib/features/rail-shell/new-note.service.ts:33 in createNoteHere call
by src/lib/features/type-definitions/type-definitions.service.ts:createTypedNote <- src/lib/plugins/mods/mod-app.service.ts:36 in MOD_APP ref
sym src/lib/features/type-definitions/type-definitions.service.ts:173 fn createTypeDefinition(typeName: string, opts: { select?: boolean } = {}): Promise<string | null> L32 | Creates a type definition note with default frontmatter.
by src/lib/features/type-definitions/type-definitions.service.ts:createTypeDefinition <- src/lib/features/event-calendar/EventCalendarSection.svelte:96 in openEventType call
by src/lib/features/type-definitions/type-definitions.service.ts:createTypeDefinition <- src/lib/features/rail-shell/TypesNavigator.svelte:138 in handleNewType call +1
sym src/lib/features/type-definitions/type-definitions.service.ts:221 fn renameType(oldName: string, newName: string, definitionPath: string): Promise<void> L40 | True rename of a type.
by src/lib/features/type-definitions/type-definitions.service.ts:renameType <- src/lib/features/rail-shell/TypesNavigator.svelte:495 in (markup) markup
sym src/lib/features/type-definitions/type-definitions.service.ts:271 fn createView(name: string, filters?: CollectionFilter | string, folder?: string): Promise<string> L9 | Creates a `.view` named `name` in `folder` (the vault root without it), with `name` as its label and table view name and `filters` (when given) as that view's …
by src/lib/features/type-definitions/type-definitions.service.ts:createView <- src/lib/features/type-definitions/ViewDialog.svelte:129 in submit call
sym src/lib/features/type-definitions/type-definitions.service.ts:291 type ViewWriteReason L1 | Why a `.view` rewrite refused or failed: - `save-failed`: saving the open tab failed.
sym src/lib/features/type-definitions/type-definitions.service.ts:301 class ViewWriteError extends Error L13 | Typed failure of `rewriteViewFile`.
by src/lib/features/type-definitions/type-definitions.service.ts:ViewWriteError <- src/lib/features/note-list/NoteRowMenu.svelte:99 in handleShowInViews ref
by src/lib/features/type-definitions/type-definitions.service.ts:ViewWriteError <- src/lib/features/rail-shell/RailNoteList.svelte:332 in persistViewState ref +1
by src/lib/features/type-definitions/type-definitions.service.ts:ViewWriteError <- src/lib/features/rail-shell/TypesNavigator.svelte:203 in handleRailPin ref
sym src/lib/features/type-definitions/type-definitions.service.ts:350 fn rewriteViewFile(path: string, transform: (base: string) => string, options: RewriteViewOptions = {}): Promise<boolean> L15 | Rewrites the `.view` at `path` to `transform(base)`.
by src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile <- src/lib/app/EditorView.svelte:90 in (markup) markup
sym src/lib/features/type-definitions/type-definitions.service.ts:444 fn updateViewIcon(path: string, icon?: string, color?: string, titleColor?: string): Promise<void> L8 | Updates _icon, _color, and _title_color in a .view YAML file; a save that changes none of them does not touch the file.
by src/lib/features/type-definitions/type-definitions.service.ts:updateViewIcon <- src/lib/features/rail-shell/TypesNavigator.svelte:164 in handleIconSelect call
sym src/lib/features/type-definitions/type-definitions.service.ts:454 fn updateViewIconColors(path: string, color?: string, titleColor?: string): Promise<void> L3 | Updates the colors in a .view YAML file, leaving its icon; a save that changes no color does not touch the file.
by src/lib/features/type-definitions/type-definitions.service.ts:updateViewIconColors <- src/lib/features/rail-shell/TypesNavigator.svelte:174 in handleIconColors call
sym src/lib/features/type-definitions/type-definitions.service.ts:465 fn setViewRailPin(path: string, pinned: boolean): Promise<void> L4 | Pins the `.view` at `path` to the rail (`_rail: true`) or unpins it (the key removed), through `rewriteViewFile`.
by src/lib/features/type-definitions/type-definitions.service.ts:setViewRailPin <- src/lib/features/rail-shell/TypesNavigator.svelte:337 in (markup) markup
sym src/lib/features/type-definitions/type-definitions.service.ts:475 fn showViewInViews(path: string): Promise<void> L4 | Shows the hidden `.view` at `path` in Views (`showViewInViewsYaml` removes `_visible` and `_open_in_editor`).
by src/lib/features/type-definitions/type-definitions.service.ts:showViewInViews <- src/lib/features/note-list/NoteRowMenu.svelte:96 in handleShowInViews call
sym src/lib/features/type-definitions/type-definitions.service.ts:485 fn updateViewListProperties(path: string, properties: readonly string[]): Promise<void> L3 | Saves the property columns the rail note list shows for the `.view` at `path` (`_list_properties_display`; an empty list removes the key).
by src/lib/features/type-definitions/type-definitions.service.ts:updateViewListProperties <- src/lib/features/rail-shell/RailNoteList.svelte:486 in handlePropertiesChange call
sym src/lib/features/type-definitions/type-definitions.service.ts:490 fn removeViewIcon(path: string): Promise<void> L3 | Removes _icon, _color, and _title_color from a .view YAML file.
by src/lib/features/type-definitions/type-definitions.service.ts:removeViewIcon <- src/lib/features/rail-shell/TypesNavigator.svelte:183 in handleIconRemove call
sym src/lib/features/type-definitions/type-definitions.service.ts:495 class ViewWriteConflict extends Error L13 | A toolbar edit refused because its key in the `.view` changed since the toolbar read it.
by src/lib/features/type-definitions/type-definitions.service.ts:ViewWriteConflict <- src/lib/features/rail-shell/RailNoteList.svelte:330 in persistViewState ref
sym src/lib/features/type-definitions/type-definitions.service.ts:518 fn updateViewToolbarKey<K extends ToolbarKey>(path: string, key: K, next: ToolbarValues[K], base: string): Promise<CollectionDefinition> L16 | Writes one key of the rail toolbar (`applyToolbarEdit`) to the `.view` at `path`, through `rewriteViewFile`, so the bytes it checks are a dirty tab's buffer or…
by src/lib/features/type-definitions/type-definitions.service.ts:updateViewToolbarKey <- src/lib/features/rail-shell/RailNoteList.svelte:325 in persistViewState call
sym src/lib/features/type-definitions/type-definitions.service.ts:541 fn editView(path: string, edit: ViewEdit): Promise<void> L9 | Saves the Edit view dialog: rewrites the label and filters of the `.view` at `path` (`updateViewEditYaml`), keeping its filename and every other key, then refr…
by src/lib/features/type-definitions/type-definitions.service.ts:editView <- src/lib/features/type-definitions/ViewDialog.svelte:145 in save call
## locals
local src/lib/features/type-definitions/type-definitions.service.ts:367 fn assertViewVault(vault: string | null, path: string): void L3
local src/lib/features/type-definitions/type-definitions.service.ts:372 fn findViewTab(path: string) L3
local src/lib/features/type-definitions/type-definitions.service.ts:377 fn rewriteViewFileNow(path: string, transform: (base: string) => string, options: RewriteViewOptions, vault: string | null): Promise<boolean> L65
## calls
call src/lib/features/type-definitions/type-definitions.service.ts:29 in refreshTypeDefinitions -> src/lib/contracts/ipc.ts:call call
call src/lib/features/type-definitions/type-definitions.service.ts:30 in refreshTypeDefinitions -> src/lib/features/type-definitions/type-definitions.logic.ts:buildTypeMetadataMap call
call src/lib/features/type-definitions/type-definitions.service.ts:32 in refreshTypeDefinitions -> src/lib/features/type-definitions/type-definitions.logic.ts:sameTypeMetadata call
call src/lib/features/type-definitions/type-definitions.service.ts:33 in refreshTypeDefinitions -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.setTypeMetadataMap mcall
call src/lib/features/type-definitions/type-definitions.service.ts:59 in resolveTypedNoteTarget -> src/lib/features/type-definitions/type-definitions.logic.ts:buildTypeNoteDir call
call src/lib/features/type-definitions/type-definitions.service.ts:74 in resolveTypedNoteTarget -> src/lib/core/filesystem/fs.logic.ts:generateUniqueName call
call src/lib/features/type-definitions/type-definitions.service.ts:85 in createNoteOfType -> src/lib/features/type-definitions/type-definitions.service.ts:resolveTypedNoteTarget call
call src/lib/features/type-definitions/type-definitions.service.ts:88 in createNoteOfType -> src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote call
call src/lib/features/type-definitions/type-definitions.service.ts:93 in createNoteOfType -> src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag ref
call src/lib/features/type-definitions/type-definitions.service.ts:131 in createTypedNote -> src/lib/features/type-definitions/type-definitions.service.ts:resolveTypedNoteTarget call
call src/lib/features/type-definitions/type-definitions.service.ts:134 in createTypedNote -> src/lib/contracts/ipc.ts:call call
call src/lib/features/type-definitions/type-definitions.service.ts:136 in createTypedNote -> src/lib/utils/debug.ts:error call
call src/lib/features/type-definitions/type-definitions.service.ts:139 in createTypedNote -> src/lib/core/note-creator/note-creator.service.ts:loadNoteTemplate call
call src/lib/features/type-definitions/type-definitions.service.ts:148 in createTypedNote -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/features/type-definitions/type-definitions.service.ts:150 in createTypedNote -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/type-definitions/type-definitions.service.ts:181 in createTypeDefinition -> src/lib/utils/debug.ts:error call
call src/lib/features/type-definitions/type-definitions.service.ts:187 in createTypeDefinition -> src/lib/features/type-definitions/type-definitions.logic.ts:typeNameTakenMessage call
call src/lib/features/type-definitions/type-definitions.service.ts:193 in createTypeDefinition -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/type-definitions/type-definitions.service.ts:199 in createTypeDefinition -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.setSelection mcall
call src/lib/features/type-definitions/type-definitions.service.ts:201 in createTypeDefinition -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/type-definitions/type-definitions.service.ts:224 in renameType -> src/lib/core/filesystem/fs.service.ts:renameItem call
call src/lib/features/type-definitions/type-definitions.service.ts:231 in renameType -> src/lib/features/type-definitions/type-definitions.logic.ts:rewriteTypeInFrontmatter call
call src/lib/features/type-definitions/type-definitions.service.ts:235 in renameType -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/features/type-definitions/type-definitions.service.ts:239 in renameType -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/features/type-definitions/type-definitions.service.ts:241 in renameType -> src/lib/contracts/ipc.ts:call call
call src/lib/features/type-definitions/type-definitions.service.ts:243 in renameType -> src/lib/utils/debug.ts:error call
call src/lib/features/type-definitions/type-definitions.service.ts:249 in renameType -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.setSelection mcall
call src/lib/features/type-definitions/type-definitions.service.ts:254 in renameType -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall +1
call src/lib/features/type-definitions/type-definitions.service.ts:257 in renameType -> src/lib/core/settings/rail-pin.logic.ts:typePinKey call +1
call src/lib/features/type-definitions/type-definitions.service.ts:275 in createView -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/type-definitions/type-definitions.service.ts:276 in createView -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/type-definitions/type-definitions.service.ts:276 in createView -> src/lib/features/type-definitions/type-sidebar.logic.ts:buildNewViewYaml call
call src/lib/features/type-definitions/type-definitions.service.ts:277 in createView -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.setSelection mcall
call src/lib/features/type-definitions/type-definitions.service.ts:357 in rewriteViewFile -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFileNow call
call src/lib/features/type-definitions/type-definitions.service.ts:368 in assertViewVault -> src/lib/features/type-definitions/type-definitions.service.ts:ViewWriteError new
call src/lib/features/type-definitions/type-definitions.service.ts:383 in rewriteViewFileNow -> src/lib/core/editor/editor.service.ts:waitForTabSave call
call src/lib/features/type-definitions/type-definitions.service.ts:385 in rewriteViewFileNow -> src/lib/features/type-definitions/type-definitions.service.ts:assertViewVault call +3
call src/lib/features/type-definitions/type-definitions.service.ts:387 in rewriteViewFileNow -> src/lib/features/type-definitions/type-definitions.service.ts:findViewTab call +3
call src/lib/features/type-definitions/type-definitions.service.ts:388 in rewriteViewFileNow -> src/lib/core/editor/editor.logic.ts:isTabDirty call +1
call src/lib/features/type-definitions/type-definitions.service.ts:395 in rewriteViewFileNow -> src/lib/features/type-definitions/type-definitions.service.ts:ViewWriteError new +2
call src/lib/features/type-definitions/type-definitions.service.ts:405 in rewriteViewFileNow -> src/lib/core/vault/vault.store.svelte.ts:vaultStore.requestPromptIndexRefresh mcall
call src/lib/features/type-definitions/type-definitions.service.ts:413 in rewriteViewFileNow -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call +2
call src/lib/features/type-definitions/type-definitions.service.ts:414 in rewriteViewFileNow -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/features/type-definitions/type-definitions.service.ts:423 in rewriteViewFileNow -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFileNow call
call src/lib/features/type-definitions/type-definitions.service.ts:438 in rewriteViewFileNow -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/features/type-definitions/type-definitions.service.ts:439 in rewriteViewFileNow -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/features/type-definitions/type-definitions.service.ts:450 in updateViewIcon -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile call
call src/lib/features/type-definitions/type-definitions.service.ts:450 in updateViewIcon -> src/lib/features/type-definitions/type-sidebar.logic.ts:updateViewIconYaml call
call src/lib/features/type-definitions/type-definitions.service.ts:455 in updateViewIconColors -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile call
call src/lib/features/type-definitions/type-definitions.service.ts:455 in updateViewIconColors -> src/lib/features/type-definitions/type-sidebar.logic.ts:updateViewColorsYaml call
call src/lib/features/type-definitions/type-definitions.service.ts:467 in setViewRailPin -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile call
call src/lib/features/type-definitions/type-definitions.service.ts:467 in setViewRailPin -> src/lib/features/type-definitions/type-sidebar.logic.ts:updateViewRailYaml call
call src/lib/features/type-definitions/type-definitions.service.ts:477 in showViewInViews -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile call
call src/lib/features/type-definitions/type-definitions.service.ts:477 in showViewInViews -> src/lib/features/type-definitions/type-sidebar.logic.ts:showViewInViewsYaml ref
call src/lib/features/type-definitions/type-definitions.service.ts:486 in updateViewListProperties -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile call
call src/lib/features/type-definitions/type-definitions.service.ts:486 in updateViewListProperties -> src/lib/features/type-definitions/type-sidebar.logic.ts:updateViewListPropertiesYaml call
call src/lib/features/type-definitions/type-definitions.service.ts:491 in removeViewIcon -> src/lib/features/type-definitions/type-definitions.service.ts:updateViewIcon call
call src/lib/features/type-definitions/type-definitions.service.ts:524 in updateViewToolbarKey -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile call
call src/lib/features/type-definitions/type-definitions.service.ts:525 in updateViewToolbarKey -> src/lib/features/type-definitions/type-note-list.logic.ts:applyToolbarEdit call
call src/lib/features/type-definitions/type-definitions.service.ts:527 in updateViewToolbarKey -> src/lib/features/type-definitions/type-definitions.service.ts:ViewWriteConflict new
call src/lib/features/type-definitions/type-definitions.service.ts:530 in updateViewToolbarKey -> src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition call
call src/lib/features/type-definitions/type-definitions.service.ts:543 in editView -> src/lib/features/type-definitions/type-definitions.service.ts:rewriteViewFile call
call src/lib/features/type-definitions/type-definitions.service.ts:544 in editView -> src/lib/features/collection/yaml-parser.ts:updateViewEditYaml call
call src/lib/features/type-definitions/type-definitions.service.ts:548 in editView -> src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition call
## effects
ipc-call src/lib/features/type-definitions/type-definitions.service.ts:29 in refreshTypeDefinitions -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
fx src/lib/features/type-definitions/type-definitions.service.ts:69 tauri-fs.readDir in resolveTypedNoteTarget
ipc-call src/lib/features/type-definitions/type-definitions.service.ts:134 in createTypedNote -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
fx src/lib/features/type-definitions/type-definitions.service.ts:178 tauri-fs.readDir in createTypeDefinition
fx src/lib/features/type-definitions/type-definitions.service.ts:233 tauri-fs.writeTextFile in renameType
ipc-call src/lib/features/type-definitions/type-definitions.service.ts:241 in renameType -> ipc:propagate_type_rename -> src-tauri/src/commands/vault.rs:451
fx src/lib/features/type-definitions/type-definitions.service.ts:384 tauri-fs.readTextFile in rewriteViewFileNow
fx src/lib/features/type-definitions/type-definitions.service.ts:393 tauri-fs.exists in rewriteViewFileNow
fx src/lib/features/type-definitions/type-definitions.service.ts:430 tauri-fs.writeTextFile in rewriteViewFileNow
fx src/lib/features/type-definitions/type-definitions.service.ts:432 tauri-fs.exists in rewriteViewFileNow
