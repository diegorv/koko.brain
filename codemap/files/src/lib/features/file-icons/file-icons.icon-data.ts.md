# file card src/lib/features/file-icons/file-icons.icon-data.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/file-icons.icon-data.ts ' codemap/files
file src/lib/features/file-icons/file-icons.icon-data.ts other L320 module src/lib/features/file-icons in7 t30
## imports
imp src/lib/features/file-icons/file-icons.icon-data.ts:1 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:IconPackMeta,type:NormalizedIcon
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:10 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:14 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/file-icons/IconPicker.svelte:4 -> src/lib/features/file-icons/file-icons.icon-data.ts getAllIconPacks,getIconsForPack,getIconSync
imp src/lib/features/file-icons/file-icons.service.ts:16 -> src/lib/features/file-icons/file-icons.icon-data.ts preloadPacks,setOnPacksLoaded
imp src/lib/features/file-icons/icon-resolver.ts:2 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/rail-shell/Rail.svelte:18 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/plugins/mods/mods-host.service.ts:11 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
## reach
in2 src/lib/features/file-icons/file-icons.icon-data.ts 17 files in 7 modules: src/lib/app(6) src/lib/features/rail-shell(3) src/lib/features/auto-organize(2) src/lib/features/note-list(2) src/lib/features/properties(2) +2 modules: q impact src/lib/features/file-icons/file-icons.icon-data.ts --depth 2
out2 src/lib/features/file-icons/file-icons.icon-data.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/file-icons/file-icons.icon-data.test.ts imports src/lib/features/file-icons/file-icons.icon-data.ts mirror
test src/tests/lib/features/file-icons/IconPicker.test.ts imports src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/tasks/TasksView.test.ts imports src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/plugins/mods/mod-rail-icon.test.ts imports src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/app/EditorView.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/app/commands.new-commands.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/app/commands.todoist.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/app/meta-bind-open-view.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/file-icons/file-icons.service.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/file-icons/icon-resolver.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/note-list/NoteRowMenu.favorite.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/properties/NoteInfo.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/properties/PropertiesView.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/properties/RelationshipSearch.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/LayoutSection.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/Rail.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts mocks src/lib/features/file-icons/file-icons.icon-data.ts
## symbols
sym src/lib/features/file-icons/file-icons.icon-data.ts:13 fn setOnPacksLoaded(cb: () => void): void L3 | Registers a callback to invoke when icon packs finish loading
by src/lib/features/file-icons/file-icons.icon-data.ts:setOnPacksLoaded <- src/lib/features/file-icons/file-icons.service.ts:18 in (module) call
sym src/lib/features/file-icons/file-icons.icon-data.ts:18 fn getAllIconPacks(): IconPackMeta[] L16 | Returns metadata about all available icon packs
by src/lib/features/file-icons/file-icons.icon-data.ts:getAllIconPacks <- src/lib/features/file-icons/IconPicker.svelte:50 in packs call
sym src/lib/features/file-icons/file-icons.icon-data.ts:274 fn getIconsForPack(packId: IconPackId): Promise<NormalizedIcon[]> L24 | Loads icons for a specific pack (cached).
by src/lib/features/file-icons/file-icons.icon-data.ts:getIconsForPack <- src/lib/features/file-icons/IconPicker.svelte:90 in loadIcons call +1
sym src/lib/features/file-icons/file-icons.icon-data.ts:306 fn getIconSync(pack: IconPackId, name: string): NormalizedIcon | undefined L8 | Looks up a single icon by pack and name (for rendering in file tree).
by src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:213 in resolvedIcon call
by src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:281 in getResolvedIcon call
by src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync <- src/lib/features/file-icons/IconPicker.svelte:74 in recentNormalized=$derived call +1
by src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync <- src/lib/features/file-icons/icon-resolver.ts:50 in resolveRef call
by src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync <- src/lib/features/rail-shell/Rail.svelte:202 in actionIcon call
by src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync <- src/lib/plugins/mods/mods-host.service.ts:593 in createModContext call
sym src/lib/features/file-icons/file-icons.icon-data.ts:316 fn preloadPacks(packIds: IconPackId[]): Promise<void> L5 | Pre-loads specific packs into cache (call at startup for packs referenced in saved icons)
by src/lib/features/file-icons/file-icons.icon-data.ts:preloadPacks <- src/lib/features/file-icons/file-icons.service.ts:230 in buildFrontmatterIconIndex call +1
by src/lib/features/file-icons/file-icons.icon-data.ts:preloadPacks <- src/lib/plugins/mods/mods-host.service.ts:594 in createModContext call
## locals
local src/lib/features/file-icons/file-icons.icon-data.ts:36 fn toKebabCase(str: string): string L6
local src/lib/features/file-icons/file-icons.icon-data.ts:44 fn extractSvgContent(svgString: string): string L4
local src/lib/features/file-icons/file-icons.icon-data.ts:53 fn loadIconifyPack(data: { icons: Record<string, { body: string }>; width?: number; height?: number }, pack: IconPackId, namePrefix?: str… L21
local src/lib/features/file-icons/file-icons.icon-data.ts:84 fn loadLucide(): Promise<NormalizedIcon[]> L21
local src/lib/features/file-icons/file-icons.icon-data.ts:107 fn loadFeather(): Promise<NormalizedIcon[]> L16
local src/lib/features/file-icons/file-icons.icon-data.ts:125 fn loadFontAwesome(packId: 'fa-solid' | 'fa-regular' | 'fa-brands'): Promise<NormalizedIcon[]> L31
local src/lib/features/file-icons/file-icons.icon-data.ts:158 fn loadOcticons(): Promise<NormalizedIcon[]> L22
local src/lib/features/file-icons/file-icons.icon-data.ts:182 fn loadBoxicons(): Promise<NormalizedIcon[]> L12
local src/lib/features/file-icons/file-icons.icon-data.ts:196 fn loadCoolicons(): Promise<NormalizedIcon[]> L4
local src/lib/features/file-icons/file-icons.icon-data.ts:202 fn loadSimpleIcons(): Promise<NormalizedIcon[]> L20
local src/lib/features/file-icons/file-icons.icon-data.ts:224 fn loadTabler(): Promise<NormalizedIcon[]> L4
local src/lib/features/file-icons/file-icons.icon-data.ts:230 fn loadRemix(): Promise<NormalizedIcon[]> L4
local src/lib/features/file-icons/file-icons.icon-data.ts:260 fn loadEmoji(): NormalizedIcon[] L9
## calls
call src/lib/features/file-icons/file-icons.icon-data.ts:90 in loadLucide -> src/lib/features/file-icons/file-icons.icon-data.ts:toKebabCase call
call src/lib/features/file-icons/file-icons.icon-data.ts:94 in loadLucide -> src/lib/features/file-icons/file-icons.icon-data.ts:extractSvgContent call
call src/lib/features/file-icons/file-icons.icon-data.ts:189 in loadBoxicons -> src/lib/features/file-icons/file-icons.icon-data.ts:loadIconifyPack call +2
call src/lib/features/file-icons/file-icons.icon-data.ts:198 in loadCoolicons -> src/lib/features/file-icons/file-icons.icon-data.ts:loadIconifyPack call
call src/lib/features/file-icons/file-icons.icon-data.ts:226 in loadTabler -> src/lib/features/file-icons/file-icons.icon-data.ts:loadIconifyPack call
call src/lib/features/file-icons/file-icons.icon-data.ts:232 in loadRemix -> src/lib/features/file-icons/file-icons.icon-data.ts:loadIconifyPack call
call src/lib/features/file-icons/file-icons.icon-data.ts:280 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadLucide call
call src/lib/features/file-icons/file-icons.icon-data.ts:281 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadFeather call
call src/lib/features/file-icons/file-icons.icon-data.ts:282 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadFontAwesome call +2
call src/lib/features/file-icons/file-icons.icon-data.ts:285 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadOcticons call
call src/lib/features/file-icons/file-icons.icon-data.ts:286 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadBoxicons call
call src/lib/features/file-icons/file-icons.icon-data.ts:287 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadCoolicons call
call src/lib/features/file-icons/file-icons.icon-data.ts:288 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadSimpleIcons call
call src/lib/features/file-icons/file-icons.icon-data.ts:289 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadTabler call
call src/lib/features/file-icons/file-icons.icon-data.ts:290 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadRemix call
call src/lib/features/file-icons/file-icons.icon-data.ts:291 in getIconsForPack -> src/lib/features/file-icons/file-icons.icon-data.ts:loadEmoji call
call src/lib/features/file-icons/file-icons.icon-data.ts:318 in preloadPacks -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconsForPack call
