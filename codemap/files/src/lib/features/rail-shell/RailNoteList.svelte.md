# file card src/lib/features/rail-shell/RailNoteList.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/RailNoteList.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/rail-shell/RailNoteList.svelte component L907 module src/lib/features/rail-shell in1 t6
## imports
imp src/lib/features/rail-shell/RailNoteList.svelte:10 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/rail-shell/RailNoteList.svelte:11 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/RailNoteList.svelte:12 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/RailNoteList.svelte:13 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/RailNoteList.svelte:14 -> src/lib/core/filesystem/fs.logic.ts findNodeByPath
imp src/lib/features/rail-shell/RailNoteList.svelte:15 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/RailNoteList.svelte:16 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError
imp src/lib/features/rail-shell/RailNoteList.svelte:17 -> src/lib/utils/debug.ts debug
imp src/lib/features/rail-shell/RailNoteList.svelte:18 -> src/lib/utils/log.service.ts appendLog
imp src/lib/features/rail-shell/RailNoteList.svelte:19 -> src/lib/components/ui/popover/index.ts Popover,PopoverPortal,PopoverTrigger,PopoverContent
imp src/lib/features/rail-shell/RailNoteList.svelte:20 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:21 -> src/lib/features/collection/toolbar/SortPanel.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:22 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/rail-shell/RailNoteList.svelte:23 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord,type:SortDef
imp src/lib/features/rail-shell/RailNoteList.svelte:24 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/rail-shell/RailNoteList.svelte:25 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/RailNoteList.svelte:26 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/features/rail-shell/RailNoteList.svelte:27 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/RailNoteList.svelte:28 -> src/lib/features/type-definitions/type-definitions.service.ts updateViewListProperties,updateViewToolbarKey,ViewWriteConflict,ViewWriteError
imp src/lib/features/rail-shell/RailNoteList.svelte:34 -> src/lib/features/type-definitions/view-parse-cache.ts getCachedViewDefinition,getViewContentHash,refreshViewDefinition
imp src/lib/features/rail-shell/RailNoteList.svelte:35 -> src/lib/features/collection/yaml-parser.ts railViewIndex
imp src/lib/features/rail-shell/RailNoteList.svelte:36 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition
imp src/lib/features/rail-shell/RailNoteList.svelte:37 -> src/lib/features/type-definitions/type-sidebar.logic.ts effectiveViewSortLabel,getViewListProperties,getViewSort
imp src/lib/features/rail-shell/RailNoteList.svelte:38 -> src/lib/features/type-definitions/type-note-list.logic.ts canonicalToolbarValue,combineAvailableProperties,countActiveFilters,seedToolbarStateFromDefinition,TOOLBAR_KEYS,toolbarKeyBase,toolbarKeysDiffering,toolbarValuesFromState,type:ToolbarKey
imp src/lib/features/rail-shell/RailNoteList.svelte:49 -> src/lib/features/note-list/NoteRowMenu.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:50 -> src/lib/features/note-list/NoteRow.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:51 -> src/lib/features/type-definitions/type-sidebar.logic.ts type:ArchivedFilter
imp src/lib/features/rail-shell/RailNoteList.svelte:52 -> src/lib/features/event-calendar/event-calendar.service.ts acquireCalendarClock
imp src/lib/features/rail-shell/RailNoteList.svelte:53 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/rail-shell/RailNoteList.svelte:54 -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts eventCalendarDailyNoteStore
imp src/lib/features/rail-shell/RailNoteList.svelte:55 -> src/lib/features/rail-shell/lens.logic.ts FOLDER_LENS_KIND,lensListsEntries,newNoteRule,queryViewLens,resolveLens,resolveViewLens,TODAY_DATED_GROUP,TODAY_LENS_KIND,todayLens,VIEW_LENS_KIND,viewEntriesLoaded,viewLoadFromQuery,viewNoteType,viewReadError
imp src/lib/features/rail-shell/RailNoteList.svelte:71 -> src/lib/features/rail-shell/view-lens-seed.logic.ts INITIAL_VIEW_SEED,stepViewSeed,type:ViewSeedEvent,type:ViewSeedState
imp src/lib/features/rail-shell/RailNoteList.svelte:72 -> src/lib/features/rail-shell/list-fulltext.service.ts searchListFullText
imp src/lib/features/rail-shell/RailNoteList.svelte:73 -> src/lib/features/rail-shell/list-prefs.logic.ts defaultLensSort,listPrefsKey,parseRailListPrefs,withListPrefs
imp src/lib/features/rail-shell/RailNoteList.svelte:74 -> src/lib/features/rail-shell/list-prefs.service.ts saveTypeListProperties,saveTypeListSort,serializeListWrite
imp src/lib/features/rail-shell/RailNoteList.svelte:75 -> src/lib/features/rail-shell/list-properties.logic.ts availableListProperties
imp src/lib/features/rail-shell/RailNoteList.svelte:76 -> src/lib/features/rail-shell/list-search.logic.ts filterResolvedLens,normalizeListQuery
imp src/lib/features/rail-shell/RailNoteList.svelte:77 -> src/lib/features/rail-shell/list-sort-compare.logic.ts applyListSort
imp src/lib/features/rail-shell/RailNoteList.svelte:78 -> src/lib/features/rail-shell/list-sort.logic.ts formatListSort,parseListSort
imp src/lib/features/rail-shell/RailNoteList.svelte:79 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig
imp src/lib/features/rail-shell/RailNoteList.svelte:80 -> src/lib/features/rail-shell/list-view-sort.logic.ts listSortToSortDef,viewListSort
imp src/lib/features/rail-shell/RailNoteList.svelte:81 -> src/lib/features/rail-shell/new-note.service.ts createNoteHere
imp src/lib/features/rail-shell/RailNoteList.svelte:82 -> src/lib/features/rail-shell/RailArchivedMenu.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:83 -> src/lib/features/rail-shell/RailListSearch.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:84 -> src/lib/features/rail-shell/RailPropertiesPicker.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:85 -> src/lib/features/rail-shell/RailSortMenu.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:86 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/RailNoteList.svelte:87 -> src/lib/features/rail-shell/kind-icons.ts KIND_ICONS
imp src/lib/features/rail-shell/RailNoteList.svelte:88 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:LensContext,type:LensNote,type:NewNoteRule,type:RailHeaderAction,type:RailTodaySection,type:ResolvedLens
## imported-by
imp src/lib/app/AppShell.svelte:15 -> src/lib/features/rail-shell/RailNoteList.svelte default
## reach
in2 src/lib/features/rail-shell/RailNoteList.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/RailNoteList.svelte 66 files in 18 modules: src/lib/features/event-calendar(9) src/lib/components(7) src/lib/features/file-icons(7) src/lib/utils(7) src/lib/core/filesystem(5) +13 modules
## tests
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
## symbols
sym src/lib/features/rail-shell/RailNoteList.svelte:1 component RailNoteList props:lens,firstPane= L907
by src/lib/features/rail-shell/RailNoteList.svelte:default <- src/lib/app/AppShell.svelte:248 in (markup) mount
## locals
local src/lib/features/rail-shell/RailNoteList.svelte:121 fn lensContext(): LensContext L12
local src/lib/features/rail-shell/RailNoteList.svelte:220 fn stepSeed(event: ViewSeedEvent): boolean L5
local src/lib/features/rail-shell/RailNoteList.svelte:233 fn loadView(path: string, generation: number, propertyIndex: Map<string, PropertyIndexRecord>, indexReady: boolean, inTree: boolea… L54
local src/lib/features/rail-shell/RailNoteList.svelte:288 fn emptyToolbarBase(): Record<ToolbarKey, string> L3
local src/lib/features/rail-shell/RailNoteList.svelte:292 fn baseOf(definition: CollectionDefinition): Record<ToolbarKey, string> L5
local src/lib/features/rail-shell/RailNoteList.svelte:304 fn persistViewState(key: ToolbarKey) L40
local src/lib/features/rail-shell/RailNoteList.svelte:350 fn handleGlobalFiltersChange(groups: FilterGroup[]) L4
local src/lib/features/rail-shell/RailNoteList.svelte:355 fn handleViewFiltersChange(groups: FilterGroup[]) L4
local src/lib/features/rail-shell/RailNoteList.svelte:360 fn handleSortsChange(sorts: SortDef[]) L4
local src/lib/features/rail-shell/RailNoteList.svelte:415 fn sameSort(a: ListSortConfig | null, b: ListSortConfig | null): boolean L3
local src/lib/features/rail-shell/RailNoteList.svelte:419 fn sameProperties(a: readonly string[], b: readonly string[]): boolean L3
local src/lib/features/rail-shell/RailNoteList.svelte:428 fn writeThroughOverlay<T>(slot: { get: () => ListOverlay<T> | null; set: (next: ListOverlay<T> | null) => void }, value: T, write: () => Prom… L18
local src/lib/features/rail-shell/RailNoteList.svelte:448 fn saveListSort(config: ListSortConfig | null) L10
local src/lib/features/rail-shell/RailNoteList.svelte:459 fn handleSortSelect(config: ListSortConfig) L7
local src/lib/features/rail-shell/RailNoteList.svelte:467 fn handleSortReset() L7
local src/lib/features/rail-shell/RailNoteList.svelte:475 fn handlePropertiesChange(next: string[]) L13
local src/lib/features/rail-shell/RailNoteList.svelte:511 fn closeSearch() L4
local src/lib/features/rail-shell/RailNoteList.svelte:530 fn runFullText(text: string, generation: number) L13
local src/lib/features/rail-shell/RailNoteList.svelte:572 fn currentNewNoteRule(): NewNoteRule | null L15
local src/lib/features/rail-shell/RailNoteList.svelte:593 fn handleNewHere() L15
local src/lib/features/rail-shell/RailNoteList.svelte:633 fn handleHeaderAction() L10
local src/lib/features/rail-shell/RailNoteList.svelte:645 fn resolveNoteIcon(note: LensNote) L11
local src/lib/features/rail-shell/RailNoteList.svelte:684 fn typeChipFor(note: LensNote): string | null L4
local src/lib/features/rail-shell/RailNoteList.svelte:689 fn listPropertiesFor(note: LensNote): string[] L5
## mounts
mount src/lib/features/rail-shell/RailNoteList.svelte:709 RailSortMenu -> src/lib/features/rail-shell/RailSortMenu.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:734 RailPropertiesPicker -> src/lib/features/rail-shell/RailPropertiesPicker.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:736 RailArchivedMenu -> src/lib/features/rail-shell/RailArchivedMenu.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:742 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:743 SortPanel -> src/lib/features/collection/toolbar/SortPanel.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:765 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:766 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:805 RailListSearch -> src/lib/features/rail-shell/RailListSearch.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:814 NoteRowMenu -> src/lib/features/note-list/NoteRowMenu.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:894 NoteRow -> src/lib/features/note-list/NoteRow.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:248 RailNoteList -> src/lib/features/rail-shell/RailNoteList.svelte
## calls
call src/lib/features/rail-shell/RailNoteList.svelte:112 in $effect@110 -> src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock call
call src/lib/features/rail-shell/RailNoteList.svelte:119 in shownLens=$derived -> src/lib/features/rail-shell/lens.logic.ts:todayLens call
call src/lib/features/rail-shell/RailNoteList.svelte:163 in toolbarBase -> src/lib/features/rail-shell/RailNoteList.svelte:emptyToolbarBase call
call src/lib/features/rail-shell/RailNoteList.svelte:174 in activeFilterCount=$derived -> src/lib/features/type-definitions/type-note-list.logic.ts:countActiveFilters call
call src/lib/features/rail-shell/RailNoteList.svelte:175 in availableProperties=$derived -> src/lib/features/type-definitions/type-note-list.logic.ts:combineAvailableProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:181 in resolved=$derived -> src/lib/features/rail-shell/RailNoteList.svelte:lensContext call +1
call src/lib/features/rail-shell/RailNoteList.svelte:181 in resolved=$derived -> src/lib/features/rail-shell/lens.logic.ts:resolveViewLens call
call src/lib/features/rail-shell/RailNoteList.svelte:184 in resolved=$derived -> src/lib/features/rail-shell/lens.logic.ts:resolveLens call
call src/lib/features/rail-shell/RailNoteList.svelte:186 in resolved=$derived -> src/lib/features/rail-shell/lens.logic.ts:lensListsEntries call
call src/lib/features/rail-shell/RailNoteList.svelte:201 in viewInTree=$derived -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/features/rail-shell/RailNoteList.svelte:206 in $effect@203 -> src/lib/features/rail-shell/RailNoteList.svelte:stepSeed call
call src/lib/features/rail-shell/RailNoteList.svelte:215 in $effect@203 -> src/lib/features/rail-shell/RailNoteList.svelte:loadView call
call src/lib/features/rail-shell/RailNoteList.svelte:221 in stepSeed -> src/lib/features/rail-shell/view-lens-seed.logic.ts:stepViewSeed call
call src/lib/features/rail-shell/RailNoteList.svelte:241 in loadView -> src/lib/features/rail-shell/lens.logic.ts:viewEntriesLoaded call
call src/lib/features/rail-shell/RailNoteList.svelte:242 in loadView -> src/lib/features/rail-shell/RailNoteList.svelte:lensContext call +5
call src/lib/features/rail-shell/RailNoteList.svelte:242 in loadView -> src/lib/features/rail-shell/lens.logic.ts:resolveViewLens call +4
call src/lib/features/rail-shell/RailNoteList.svelte:246 in loadView -> src/lib/features/rail-shell/RailNoteList.svelte:stepSeed call +4
call src/lib/features/rail-shell/RailNoteList.svelte:253 in loadView -> src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition call
call src/lib/features/rail-shell/RailNoteList.svelte:254 in loadView -> src/lib/features/type-definitions/view-parse-cache.ts:getCachedViewDefinition call
call src/lib/features/rail-shell/RailNoteList.svelte:255 in loadView -> src/lib/features/type-definitions/view-parse-cache.ts:getViewContentHash call
call src/lib/features/rail-shell/RailNoteList.svelte:265 in loadView -> src/lib/features/collection/yaml-parser.ts:railViewIndex call
call src/lib/features/rail-shell/RailNoteList.svelte:265 in loadView -> src/lib/features/type-definitions/type-note-list.logic.ts:seedToolbarStateFromDefinition call
call src/lib/features/rail-shell/RailNoteList.svelte:270 in loadView -> src/lib/features/rail-shell/RailNoteList.svelte:baseOf call
call src/lib/features/rail-shell/RailNoteList.svelte:272 in loadView -> src/lib/features/rail-shell/lens.logic.ts:queryViewLens call
call src/lib/features/rail-shell/RailNoteList.svelte:279 in loadView -> src/lib/features/rail-shell/lens.logic.ts:viewLoadFromQuery call
call src/lib/features/rail-shell/RailNoteList.svelte:282 in loadView -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/RailNoteList.svelte:284 in loadView -> src/lib/features/rail-shell/lens.logic.ts:viewReadError call
call src/lib/features/rail-shell/RailNoteList.svelte:293 in baseOf -> src/lib/features/rail-shell/RailNoteList.svelte:emptyToolbarBase call
call src/lib/features/rail-shell/RailNoteList.svelte:294 in baseOf -> src/lib/features/type-definitions/type-note-list.logic.ts:toolbarKeyBase call
call src/lib/features/rail-shell/RailNoteList.svelte:308 in persistViewState -> src/lib/features/type-definitions/type-note-list.logic.ts:toolbarValuesFromState call +1
call src/lib/features/rail-shell/RailNoteList.svelte:310 in persistViewState -> src/lib/features/type-definitions/type-note-list.logic.ts:canonicalToolbarValue call
call src/lib/features/rail-shell/RailNoteList.svelte:314 in persistViewState -> src/lib/features/rail-shell/RailNoteList.svelte:stepSeed call +2
call src/lib/features/rail-shell/RailNoteList.svelte:318 in persistViewState -> src/lib/features/rail-shell/list-prefs.service.ts:serializeListWrite call
call src/lib/features/rail-shell/RailNoteList.svelte:318 in persistViewState -> src/lib/features/type-definitions/type-definitions.service.ts:updateViewToolbarKey call
call src/lib/features/rail-shell/RailNoteList.svelte:321 in persistViewState -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/RailNoteList.svelte:336 in persistViewState -> src/lib/features/type-definitions/type-note-list.logic.ts:toolbarKeysDiffering call
call src/lib/features/rail-shell/RailNoteList.svelte:342 in persistViewState -> src/lib/features/rail-shell/RailNoteList.svelte:loadView call
call src/lib/features/rail-shell/RailNoteList.svelte:347 in viewTypeName=$derived -> src/lib/features/rail-shell/lens.logic.ts:viewNoteType call
call src/lib/features/rail-shell/RailNoteList.svelte:352 in handleGlobalFiltersChange -> src/lib/features/rail-shell/RailNoteList.svelte:persistViewState call
call src/lib/features/rail-shell/RailNoteList.svelte:357 in handleViewFiltersChange -> src/lib/features/rail-shell/RailNoteList.svelte:persistViewState call
call src/lib/features/rail-shell/RailNoteList.svelte:362 in handleSortsChange -> src/lib/features/rail-shell/RailNoteList.svelte:persistViewState call
call src/lib/features/rail-shell/RailNoteList.svelte:366 in definitionPath=$derived -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getTypeDefinitionPath mcall
call src/lib/features/rail-shell/RailNoteList.svelte:369 in savedEntry=$derived -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath mcall
call src/lib/features/rail-shell/RailNoteList.svelte:371 in settingsPrefs=$derived -> src/lib/features/rail-shell/list-prefs.logic.ts:listPrefsKey call
call src/lib/features/rail-shell/RailNoteList.svelte:371 in settingsPrefs=$derived -> src/lib/features/rail-shell/list-prefs.logic.ts:parseRailListPrefs call
call src/lib/features/rail-shell/RailNoteList.svelte:375 in savedSort=$derived -> src/lib/features/rail-shell/list-sort.logic.ts:parseListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:378 in savedProperties=$derived -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:408 in $effect@407 -> src/lib/features/rail-shell/RailNoteList.svelte:sameSort call
call src/lib/features/rail-shell/RailNoteList.svelte:412 in $effect@411 -> src/lib/features/rail-shell/RailNoteList.svelte:sameProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:416 in sameSort -> src/lib/features/rail-shell/list-sort.logic.ts:formatListSort call +1
call src/lib/features/rail-shell/RailNoteList.svelte:440 in writeThroughOverlay -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/RailNoteList.svelte:441 in writeThroughOverlay -> src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError call
call src/lib/features/rail-shell/RailNoteList.svelte:451 in saveListSort -> src/lib/features/rail-shell/RailNoteList.svelte:writeThroughOverlay call
call src/lib/features/rail-shell/RailNoteList.svelte:451 in saveListSort -> src/lib/features/rail-shell/list-prefs.service.ts:saveTypeListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:454 in saveListSort -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/RailNoteList.svelte:455 in saveListSort -> src/lib/features/rail-shell/list-prefs.logic.ts:listPrefsKey call
call src/lib/features/rail-shell/RailNoteList.svelte:455 in saveListSort -> src/lib/features/rail-shell/list-prefs.logic.ts:withListPrefs call
call src/lib/features/rail-shell/RailNoteList.svelte:461 in handleSortSelect -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortsChange call
call src/lib/features/rail-shell/RailNoteList.svelte:461 in handleSortSelect -> src/lib/features/rail-shell/list-view-sort.logic.ts:listSortToSortDef call
call src/lib/features/rail-shell/RailNoteList.svelte:464 in handleSortSelect -> src/lib/features/rail-shell/RailNoteList.svelte:saveListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:469 in handleSortReset -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortsChange call
call src/lib/features/rail-shell/RailNoteList.svelte:472 in handleSortReset -> src/lib/features/rail-shell/RailNoteList.svelte:saveListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:479 in handlePropertiesChange -> src/lib/features/rail-shell/RailNoteList.svelte:writeThroughOverlay call +1
call src/lib/features/rail-shell/RailNoteList.svelte:479 in handlePropertiesChange -> src/lib/features/rail-shell/list-prefs.service.ts:serializeListWrite call
call src/lib/features/rail-shell/RailNoteList.svelte:479 in handlePropertiesChange -> src/lib/features/type-definitions/type-definitions.service.ts:updateViewListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:481 in handlePropertiesChange -> src/lib/features/rail-shell/list-prefs.service.ts:saveTypeListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:483 in handlePropertiesChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/RailNoteList.svelte:484 in handlePropertiesChange -> src/lib/features/rail-shell/list-prefs.logic.ts:listPrefsKey call
call src/lib/features/rail-shell/RailNoteList.svelte:484 in handlePropertiesChange -> src/lib/features/rail-shell/list-prefs.logic.ts:withListPrefs call
call src/lib/features/rail-shell/RailNoteList.svelte:495 in searching=$derived -> src/lib/features/rail-shell/list-search.logic.ts:normalizeListQuery call
call src/lib/features/rail-shell/RailNoteList.svelte:507 in $effect.pre@501 -> src/lib/features/rail-shell/RailNoteList.svelte:closeSearch call
call src/lib/features/rail-shell/RailNoteList.svelte:525 in $effect@516 -> src/lib/features/rail-shell/RailNoteList.svelte:runFullText call
call src/lib/features/rail-shell/RailNoteList.svelte:535 in runFullText -> src/lib/features/rail-shell/list-fulltext.service.ts:searchListFullText call
call src/lib/features/rail-shell/RailNoteList.svelte:538 in runFullText -> src/lib/utils/debug.ts:debug call
call src/lib/features/rail-shell/RailNoteList.svelte:545 in sortedResolved=$derived -> src/lib/features/rail-shell/list-sort-compare.logic.ts:applyListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:546 in shownResolved=$derived -> src/lib/features/rail-shell/RailNoteList.svelte:listPropertiesFor ref
call src/lib/features/rail-shell/RailNoteList.svelte:546 in shownResolved=$derived -> src/lib/features/rail-shell/list-search.logic.ts:filterResolvedLens call
call src/lib/features/rail-shell/RailNoteList.svelte:553 in sortMenuConfig=$derived -> src/lib/features/rail-shell/list-view-sort.logic.ts:viewListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:553 in sortMenuConfig=$derived -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewSort call
call src/lib/features/rail-shell/RailNoteList.svelte:554 in sortMenuConfig=$derived -> src/lib/features/rail-shell/list-prefs.logic.ts:defaultLensSort call
call src/lib/features/rail-shell/RailNoteList.svelte:558 in sortProperties=$derived -> src/lib/features/rail-shell/list-properties.logic.ts:availableListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:559 in pickableProperties=$derived -> src/lib/features/rail-shell/list-properties.logic.ts:availableListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:565 in allPaths=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/features/rail-shell/RailNoteList.svelte:575 in currentNewNoteRule -> src/lib/features/rail-shell/lens.logic.ts:newNoteRule call
call src/lib/features/rail-shell/RailNoteList.svelte:588 in canCreate=$derived -> src/lib/features/rail-shell/RailNoteList.svelte:currentNewNoteRule call
call src/lib/features/rail-shell/RailNoteList.svelte:596 in handleNewHere -> src/lib/features/rail-shell/RailNoteList.svelte:currentNewNoteRule call
call src/lib/features/rail-shell/RailNoteList.svelte:600 in handleNewHere -> src/lib/features/rail-shell/new-note.service.ts:createNoteHere call
call src/lib/features/rail-shell/RailNoteList.svelte:618 in TODAY_DAILY_NOTE.run -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:eventCalendarDailyNoteStore.open mcall
call src/lib/features/rail-shell/RailNoteList.svelte:639 in handleHeaderAction -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/RailNoteList.svelte:646 in resolveNoteIcon -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath call +1
call src/lib/features/rail-shell/RailNoteList.svelte:648 in resolveNoteIcon -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getTypeDefinitionPath mcall
call src/lib/features/rail-shell/RailNoteList.svelte:692 in listPropertiesFor -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getTypeMetadata mcall
call src/lib/features/rail-shell/RailNoteList.svelte:714 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortSelect markup
call src/lib/features/rail-shell/RailNoteList.svelte:716 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortReset markup
call src/lib/features/rail-shell/RailNoteList.svelte:727 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:closeSearch markup +1
call src/lib/features/rail-shell/RailNoteList.svelte:734 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handlePropertiesChange markup
call src/lib/features/rail-shell/RailNoteList.svelte:748 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortsChange markup
call src/lib/features/rail-shell/RailNoteList.svelte:749 in (markup) -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath markup
call src/lib/features/rail-shell/RailNoteList.svelte:749 in (markup) -> src/lib/features/type-definitions/type-sidebar.logic.ts:effectiveViewSortLabel markup
call src/lib/features/rail-shell/RailNoteList.svelte:771 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleGlobalFiltersChange markup
call src/lib/features/rail-shell/RailNoteList.svelte:772 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleViewFiltersChange markup
call src/lib/features/rail-shell/RailNoteList.svelte:784 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleHeaderAction markup
call src/lib/features/rail-shell/RailNoteList.svelte:796 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleNewHere markup
call src/lib/features/rail-shell/RailNoteList.svelte:864 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
call src/lib/features/rail-shell/RailNoteList.svelte:896 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:resolveNoteIcon markup
call src/lib/features/rail-shell/RailNoteList.svelte:898 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:listPropertiesFor markup
call src/lib/features/rail-shell/RailNoteList.svelte:900 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:typeChipFor markup
## effects
fx src/lib/features/rail-shell/RailNoteList.svelte:110 svelte.$effect in (script)
reg src/lib/features/rail-shell/RailNoteList.svelte:112 src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock in $effect@110
fx src/lib/features/rail-shell/RailNoteList.svelte:203 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailNoteList.svelte:407 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailNoteList.svelte:411 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailNoteList.svelte:501 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailNoteList.svelte:516 svelte.$effect in (script)
