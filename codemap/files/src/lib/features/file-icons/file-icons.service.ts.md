# file card src/lib/features/file-icons/file-icons.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/file-icons.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/features/file-icons/file-icons.service.ts service L310 module src/lib/features/file-icons in7 t18
## imports
imp src/lib/features/file-icons/file-icons.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile,writeTextFile,mkdir,exists
imp src/lib/features/file-icons/file-icons.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/features/file-icons/file-icons.service.ts:3 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,registerNoteChangeConsumer
imp src/lib/features/file-icons/file-icons.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/file-icons/file-icons.service.ts:5 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:RecentIcon
imp src/lib/features/file-icons/file-icons.service.ts:6 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore,type:FrontmatterIconRef
imp src/lib/features/file-icons/file-icons.service.ts:7 -> src/lib/features/file-icons/file-icons.logic.ts addRecentIcon,extractIconFromFrontmatter,extractIconColorsFromFrontmatter,extractIconFromParsedFrontmatter,extractIconColorsFromParsedFrontmatter,extractViewIcon,mergeIconRef
imp src/lib/features/file-icons/file-icons.service.ts:16 -> src/lib/features/file-icons/file-icons.icon-data.ts preloadPacks,setOnPacksLoaded
imp src/lib/features/file-icons/file-icons.service.ts:21 -> src/lib/utils/debug.ts debug,error,timeAsync
imp src/lib/features/file-icons/file-icons.service.ts:128 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:setFrontmatterIcon
imp src/lib/features/file-icons/file-icons.service.ts:138 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:setFrontmatterIcon
imp src/lib/features/file-icons/file-icons.service.ts:159 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:setFrontmatterIconColors
imp src/lib/features/file-icons/file-icons.service.ts:176 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:removeFrontmatterIcon
imp src/lib/features/file-icons/file-icons.service.ts:186 -> src/lib/features/file-icons/frontmatter-icon.service.ts dyn:removeFrontmatterIcon
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:50 -> src/lib/features/file-icons/file-icons.service.ts loadRecentIcons,buildFrontmatterIconIndex,registerFileIconsNoteChangeConsumer,resetFileIcons
imp src/lib/app/lifecycle/watcher-handler.service.ts:4 -> src/lib/features/file-icons/file-icons.service.ts buildFrontmatterIconIndex
imp src/lib/features/auto-organize/auto-organize.service.ts:8 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath
imp src/lib/features/note-list/NoteRowMenu.svelte:21 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/features/rail-shell/FilesNavigator.svelte:50 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/features/rail-shell/TypesNavigator.svelte:33 -> src/lib/features/file-icons/file-icons.service.ts setIconForPath,setIconColors,removeIconForPath,trackRecentIcon
imp src/lib/plugins/mods/mods-host.service.ts:13 -> src/lib/features/file-icons/file-icons.service.ts preloadPacks
## reach
in2 src/lib/features/file-icons/file-icons.service.ts 6 files in 5 modules: src/lib/app(2) src/lib/features/auto-organize(1) src/lib/features/rail-shell(1) src/lib/plugins/mods(1) src/routes(1)
out2 src/lib/features/file-icons/file-icons.service.ts 14 files in 7 modules: src/lib/core/frontmatter(3) src/lib/core/settings(3) src/lib/utils(3) src/lib/contracts(2) src/lib/core/editor(1) +2 modules
## tests
test src/tests/lib/features/file-icons/file-icons.service.test.ts imports src/lib/features/file-icons/file-icons.service.ts mirror
test src/tests/lib/app/lifecycle/watcher-handler.mixed-batch.test.ts imports src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/core/filesystem/note-change.service.test.ts imports src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/file-icons/frontmatter-icon.service.test.ts imports src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/core/filesystem/fs.service.race-audit.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/core/filesystem/fs.service.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/auto-organize/auto-organize.service.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts mocks src/lib/features/file-icons/file-icons.service.ts
## symbols
sym src/lib/features/file-icons/file-icons.service.ts:47 fn loadRecentIcons(vaultPath: string): Promise<void> L16 | Reads recently used icons from disk.
by src/lib/features/file-icons/file-icons.service.ts:loadRecentIcons <- src/lib/app/lifecycle/app-lifecycle.service.ts:311 in initializeVault call
sym src/lib/features/file-icons/file-icons.service.ts:77 fn trackRecentIcon(vaultPath: string, iconPack: IconPackId, iconName: string): Promise<void> L5 | Tracks an icon as recently used and persists to disk
by src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon <- src/lib/features/note-list/NoteRowMenu.svelte:180 in handleIconSelect call
by src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon <- src/lib/features/rail-shell/FilesNavigator.svelte:222 in handleIconSelect call
by src/lib/features/file-icons/file-icons.service.ts:trackRecentIcon <- src/lib/features/rail-shell/TypesNavigator.svelte:168 in handleIconSelect call
sym src/lib/features/file-icons/file-icons.service.ts:118 fn setIconForPath(vaultPath: string, path: string, iconPack: IconPackId, iconName: string, color?: string, textColor?: string, isDirecto… L28 | Sets a custom icon for a file/folder path. - .md files: writes to frontmatter (_icon, _color, _title_color). - Directories (isDirectory=true): writes to folder…
by src/lib/features/file-icons/file-icons.service.ts:setIconForPath <- src/lib/features/auto-organize/auto-organize.service.ts:679 in applyLegacyIcon call
by src/lib/features/file-icons/file-icons.service.ts:setIconForPath <- src/lib/features/note-list/NoteRowMenu.svelte:179 in handleIconSelect call
by src/lib/features/file-icons/file-icons.service.ts:setIconForPath <- src/lib/features/rail-shell/FilesNavigator.svelte:221 in handleIconSelect call
by src/lib/features/file-icons/file-icons.service.ts:setIconForPath <- src/lib/features/rail-shell/TypesNavigator.svelte:166 in handleIconSelect call
sym src/lib/features/file-icons/file-icons.service.ts:153 fn setIconColors(path: string, color?: string, textColor?: string, isDirectory = false): Promise<void> L14 | Saves the colors of a file/folder that has no icon, leaving any `_icon` key alone.
by src/lib/features/file-icons/file-icons.service.ts:setIconColors <- src/lib/features/note-list/NoteRowMenu.svelte:185 in handleIconColors call
by src/lib/features/file-icons/file-icons.service.ts:setIconColors <- src/lib/features/rail-shell/FilesNavigator.svelte:227 in handleIconColors call
by src/lib/features/file-icons/file-icons.service.ts:setIconColors <- src/lib/features/rail-shell/TypesNavigator.svelte:176 in handleIconColors call
sym src/lib/features/file-icons/file-icons.service.ts:174 fn removeIconForPath(vaultPath: string, path: string, isDirectory = false): Promise<void> L20 | Removes a custom icon from a file/folder path. - .md files: removes _icon, _color, _title_color from frontmatter. - Directories (isDirectory=true): removes ico…
by src/lib/features/file-icons/file-icons.service.ts:removeIconForPath <- src/lib/features/note-list/NoteRowMenu.svelte:190 in handleIconRemove call
by src/lib/features/file-icons/file-icons.service.ts:removeIconForPath <- src/lib/features/rail-shell/FilesNavigator.svelte:232 in handleIconRemove call
by src/lib/features/file-icons/file-icons.service.ts:removeIconForPath <- src/lib/features/rail-shell/TypesNavigator.svelte:185 in handleIconRemove call
sym src/lib/features/file-icons/file-icons.service.ts:201 fn buildFrontmatterIconIndex(): Promise<void> L32 | Scans all vault notes for the frontmatter icon and colors and populates `fileIconsStore.frontmatterIcons`.
by src/lib/features/file-icons/file-icons.service.ts:buildFrontmatterIconIndex <- src/lib/app/lifecycle/app-lifecycle.service.ts:435 in initializeVault call
by src/lib/features/file-icons/file-icons.service.ts:buildFrontmatterIconIndex <- src/lib/app/lifecycle/watcher-handler.service.ts:78 in rebuildAllIndexes call
sym src/lib/features/file-icons/file-icons.service.ts:240 fn updateFrontmatterIconForFile(filePath: string, content: string): void L33 | Incrementally updates the frontmatter icon for a single file.
sym src/lib/features/file-icons/file-icons.service.ts:279 fn removeFrontmatterIconForFile(filePath: string): void L14 | Removes the frontmatter icon entry for a single file.
sym src/lib/features/file-icons/file-icons.service.ts:299 fn registerFileIconsNoteChangeConsumer(): () => void L7 | Registers the frontmatter icon index as a note-change consumer, so `applyNoteChange` keeps it in sync on every write and eviction.
by src/lib/features/file-icons/file-icons.service.ts:registerFileIconsNoteChangeConsumer <- src/lib/app/lifecycle/app-lifecycle.service.ts:263 in initializeVault call
sym src/lib/features/file-icons/file-icons.service.ts:308 fn resetFileIcons(): void L3 | Clears file icon state (e.g. when switching vaults)
by src/lib/features/file-icons/file-icons.service.ts:resetFileIcons <- src/lib/app/lifecycle/app-lifecycle.service.ts:670 in teardownVault call
## locals
local src/lib/features/file-icons/file-icons.service.ts:28 fn getRecentIconsPath(vaultPath: string): string L3
local src/lib/features/file-icons/file-icons.service.ts:33 fn getDirPath(vaultPath: string): string L3
local src/lib/features/file-icons/file-icons.service.ts:38 fn ensureDir(vaultPath: string): Promise<void> L7
local src/lib/features/file-icons/file-icons.service.ts:65 fn saveRecentIcons(vaultPath: string): Promise<void> L10
local src/lib/features/file-icons/file-icons.service.ts:85 fn isMarkdown(path: string): boolean L3
local src/lib/features/file-icons/file-icons.service.ts:89 fn getFolderNotePath(dirPath: string): string L4
local src/lib/features/file-icons/file-icons.service.ts:98 fn ensureFolderNote(dirPath: string): Promise<string> L13
## calls
call src/lib/features/file-icons/file-icons.service.ts:18 in (module) -> src/lib/features/file-icons/file-icons.icon-data.ts:setOnPacksLoaded call
call src/lib/features/file-icons/file-icons.service.ts:18 in (module) -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.bumpPackVersion mcall
call src/lib/features/file-icons/file-icons.service.ts:39 in ensureDir -> src/lib/features/file-icons/file-icons.service.ts:getDirPath call
call src/lib/features/file-icons/file-icons.service.ts:48 in loadRecentIcons -> src/lib/features/file-icons/file-icons.service.ts:getRecentIconsPath call
call src/lib/features/file-icons/file-icons.service.ts:52 in loadRecentIcons -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.setRecentIcons mcall +2
call src/lib/features/file-icons/file-icons.service.ts:59 in loadRecentIcons -> src/lib/utils/debug.ts:error call
call src/lib/features/file-icons/file-icons.service.ts:66 in saveRecentIcons -> src/lib/features/file-icons/file-icons.service.ts:getRecentIconsPath call
call src/lib/features/file-icons/file-icons.service.ts:68 in saveRecentIcons -> src/lib/features/file-icons/file-icons.service.ts:ensureDir call
call src/lib/features/file-icons/file-icons.service.ts:72 in saveRecentIcons -> src/lib/utils/debug.ts:error call
call src/lib/features/file-icons/file-icons.service.ts:78 in trackRecentIcon -> src/lib/features/file-icons/file-icons.logic.ts:addRecentIcon call
call src/lib/features/file-icons/file-icons.service.ts:79 in trackRecentIcon -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.setRecentIcons mcall
call src/lib/features/file-icons/file-icons.service.ts:80 in trackRecentIcon -> src/lib/features/file-icons/file-icons.service.ts:saveRecentIcons call
call src/lib/features/file-icons/file-icons.service.ts:99 in ensureFolderNote -> src/lib/features/file-icons/file-icons.service.ts:getFolderNotePath call
call src/lib/features/file-icons/file-icons.service.ts:107 in ensureFolderNote -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/features/file-icons/file-icons.service.ts:127 in setIconForPath -> src/lib/features/file-icons/file-icons.service.ts:isMarkdown call
call src/lib/features/file-icons/file-icons.service.ts:129 in setIconForPath -> src/lib/features/file-icons/frontmatter-icon.service.ts:setFrontmatterIcon call +1
call src/lib/features/file-icons/file-icons.service.ts:130 in setIconForPath -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.updateFrontmatterIcon mcall +2
call src/lib/features/file-icons/file-icons.service.ts:137 in setIconForPath -> src/lib/features/file-icons/file-icons.service.ts:ensureFolderNote call
call src/lib/features/file-icons/file-icons.service.ts:154 in setIconColors -> src/lib/features/file-icons/file-icons.service.ts:isMarkdown call
call src/lib/features/file-icons/file-icons.service.ts:156 in setIconColors -> src/lib/features/file-icons/file-icons.service.ts:getFolderNotePath call
call src/lib/features/file-icons/file-icons.service.ts:158 in setIconColors -> src/lib/features/file-icons/file-icons.service.ts:ensureFolderNote call
call src/lib/features/file-icons/file-icons.service.ts:160 in setIconColors -> src/lib/features/file-icons/frontmatter-icon.service.ts:setFrontmatterIconColors call
call src/lib/features/file-icons/file-icons.service.ts:162 in setIconColors -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/file-icons/file-icons.service.ts:164 in setIconColors -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.updateFrontmatterIcon mcall +1
call src/lib/features/file-icons/file-icons.service.ts:175 in removeIconForPath -> src/lib/features/file-icons/file-icons.service.ts:isMarkdown call
call src/lib/features/file-icons/file-icons.service.ts:177 in removeIconForPath -> src/lib/features/file-icons/frontmatter-icon.service.ts:removeFrontmatterIcon call +1
call src/lib/features/file-icons/file-icons.service.ts:178 in removeIconForPath -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.updateFrontmatterIcon mcall +2
call src/lib/features/file-icons/file-icons.service.ts:183 in removeIconForPath -> src/lib/features/file-icons/file-icons.service.ts:getFolderNotePath call
call src/lib/features/file-icons/file-icons.service.ts:202 in buildFrontmatterIconIndex -> src/lib/utils/debug.ts:timeAsync call
call src/lib/features/file-icons/file-icons.service.ts:203 in buildFrontmatterIconIndex -> src/lib/contracts/ipc.ts:call call
call src/lib/features/file-icons/file-icons.service.ts:207 in buildFrontmatterIconIndex -> src/lib/features/file-icons/file-icons.logic.ts:mergeIconRef call
call src/lib/features/file-icons/file-icons.service.ts:208 in buildFrontmatterIconIndex -> src/lib/features/file-icons/file-icons.logic.ts:extractIconFromParsedFrontmatter call
call src/lib/features/file-icons/file-icons.service.ts:209 in buildFrontmatterIconIndex -> src/lib/features/file-icons/file-icons.logic.ts:extractIconColorsFromParsedFrontmatter call
call src/lib/features/file-icons/file-icons.service.ts:225 in buildFrontmatterIconIndex -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.setFrontmatterIcons mcall
call src/lib/features/file-icons/file-icons.service.ts:226 in buildFrontmatterIconIndex -> src/lib/utils/debug.ts:debug call
call src/lib/features/file-icons/file-icons.service.ts:230 in buildFrontmatterIconIndex -> src/lib/features/file-icons/file-icons.icon-data.ts:preloadPacks call
call src/lib/features/file-icons/file-icons.service.ts:241 in updateFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/file-icons/file-icons.service.ts:243 in updateFrontmatterIconForFile -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/file-icons/file-icons.service.ts:244 in updateFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.logic.ts:extractViewIcon call
call src/lib/features/file-icons/file-icons.service.ts:245 in updateFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.logic.ts:extractIconColorsFromFrontmatter call
call src/lib/features/file-icons/file-icons.service.ts:245 in updateFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.logic.ts:extractIconFromFrontmatter call
call src/lib/features/file-icons/file-icons.service.ts:245 in updateFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.logic.ts:mergeIconRef call
call src/lib/features/file-icons/file-icons.service.ts:257 in updateFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.updateFrontmatterIcon mcall +1
call src/lib/features/file-icons/file-icons.service.ts:270 in updateFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.icon-data.ts:preloadPacks call
call src/lib/features/file-icons/file-icons.service.ts:280 in removeFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.getFrontmatterIcon mcall
call src/lib/features/file-icons/file-icons.service.ts:282 in removeFrontmatterIconForFile -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.updateFrontmatterIcon mcall +1
call src/lib/features/file-icons/file-icons.service.ts:300 in registerFileIconsNoteChangeConsumer -> src/lib/core/filesystem/note-change.service.ts:registerNoteChangeConsumer call
call src/lib/features/file-icons/file-icons.service.ts:302 in registerFileIconsNoteChangeConsumer -> src/lib/features/file-icons/file-icons.service.ts:updateFrontmatterIconForFile ref
call src/lib/features/file-icons/file-icons.service.ts:303 in registerFileIconsNoteChangeConsumer -> src/lib/features/file-icons/file-icons.service.ts:removeFrontmatterIconForFile ref
call src/lib/features/file-icons/file-icons.service.ts:309 in resetFileIcons -> src/lib/features/file-icons/file-icons.store.svelte.ts:fileIconsStore.reset mcall
## effects
fx src/lib/features/file-icons/file-icons.service.ts:40 tauri-fs.exists in ensureDir
fx src/lib/features/file-icons/file-icons.service.ts:42 tauri-fs.mkdir in ensureDir
fx src/lib/features/file-icons/file-icons.service.ts:50 tauri-fs.exists in loadRecentIcons
fx src/lib/features/file-icons/file-icons.service.ts:55 tauri-fs.readTextFile in loadRecentIcons
fx src/lib/features/file-icons/file-icons.service.ts:70 tauri-fs.writeTextFile in saveRecentIcons
fx src/lib/features/file-icons/file-icons.service.ts:100 tauri-fs.exists in ensureFolderNote
fx src/lib/features/file-icons/file-icons.service.ts:103 tauri-fs.writeTextFile in ensureFolderNote
fx src/lib/features/file-icons/file-icons.service.ts:156 tauri-fs.exists in setIconColors
fx src/lib/features/file-icons/file-icons.service.ts:184 tauri-fs.exists in removeIconForPath
ipc-call src/lib/features/file-icons/file-icons.service.ts:203 in buildFrontmatterIconIndex -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
reg src/lib/features/file-icons/file-icons.service.ts:300 src/lib/core/filesystem/note-change.service.ts:registerNoteChangeConsumer in registerFileIconsNoteChangeConsumer args={ name: 'file-icons', upsert: updateFrontmatterIconForFile, remove: removeFront…
