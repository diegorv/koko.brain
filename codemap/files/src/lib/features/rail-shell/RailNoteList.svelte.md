# file card src/lib/features/rail-shell/RailNoteList.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/RailNoteList.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/rail-shell/RailNoteList.svelte component L987 module src/lib/features/rail-shell in1 t7
## imports
imp src/lib/features/rail-shell/RailNoteList.svelte:18 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/rail-shell/RailNoteList.svelte:19 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/RailNoteList.svelte:20 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/RailNoteList.svelte:21 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/RailNoteList.svelte:22 -> src/lib/core/filesystem/fs.logic.ts findNodeByPath
imp src/lib/features/rail-shell/RailNoteList.svelte:23 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/RailNoteList.svelte:24 -> src/lib/core/frontmatter/frontmatter-write.service.ts FrontmatterWriteError,toastFrontmatterWriteError
imp src/lib/features/rail-shell/RailNoteList.svelte:25 -> src/lib/utils/debug.ts debug
imp src/lib/features/rail-shell/RailNoteList.svelte:26 -> src/lib/utils/log.service.ts appendLog
imp src/lib/features/rail-shell/RailNoteList.svelte:27 -> src/lib/components/ui/popover/index.ts Popover,PopoverPortal,PopoverTrigger,PopoverContent
imp src/lib/features/rail-shell/RailNoteList.svelte:28 -> src/lib/components/EmptyState.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:29 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:30 -> src/lib/features/collection/toolbar/SortPanel.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:31 -> src/lib/features/collection/collection.store.svelte.ts collectionStore
imp src/lib/features/rail-shell/RailNoteList.svelte:32 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord,type:SortDef
imp src/lib/features/rail-shell/RailNoteList.svelte:33 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/rail-shell/RailNoteList.svelte:34 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/RailNoteList.svelte:35 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/features/rail-shell/RailNoteList.svelte:36 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/RailNoteList.svelte:37 -> src/lib/features/type-definitions/type-definitions.service.ts updateViewListProperties,updateViewToolbarKey,ViewWriteConflict,ViewWriteError
imp src/lib/features/rail-shell/RailNoteList.svelte:43 -> src/lib/features/type-definitions/view-parse-cache.ts getCachedViewDefinition,getViewContentHash,refreshViewDefinition
imp src/lib/features/rail-shell/RailNoteList.svelte:44 -> src/lib/features/collection/yaml-parser.ts railViewIndex
imp src/lib/features/rail-shell/RailNoteList.svelte:45 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition
imp src/lib/features/rail-shell/RailNoteList.svelte:46 -> src/lib/features/type-definitions/type-sidebar.logic.ts effectiveViewSortLabel,getViewListProperties,getViewSort
imp src/lib/features/rail-shell/RailNoteList.svelte:47 -> src/lib/features/type-definitions/type-note-list.logic.ts canonicalToolbarValue,combineAvailableProperties,countActiveFilters,seedToolbarStateFromDefinition,TOOLBAR_KEYS,toolbarKeyBase,toolbarKeysDiffering,toolbarValuesFromState,type:ToolbarKey
imp src/lib/features/rail-shell/RailNoteList.svelte:58 -> src/lib/features/note-list/NoteRowMenu.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:59 -> src/lib/features/note-list/NoteRow.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:60 -> src/lib/features/properties/lifecycle.service.ts setOrganizedForPath
imp src/lib/features/rail-shell/RailNoteList.svelte:61 -> src/lib/features/type-definitions/type-sidebar.logic.ts type:ArchivedFilter
imp src/lib/features/rail-shell/RailNoteList.svelte:62 -> src/lib/features/event-calendar/event-calendar.service.ts acquireCalendarClock
imp src/lib/features/rail-shell/RailNoteList.svelte:63 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/features/rail-shell/RailNoteList.svelte:64 -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts eventCalendarDailyNoteStore
imp src/lib/features/rail-shell/RailNoteList.svelte:65 -> src/lib/features/rail-shell/lens.logic.ts FOLDER_LENS_KIND,INBOX_LENS,lensListsEntries,newNoteRule,queryViewLens,resolveLens,resolveViewLens,TODAY_DATED_GROUP,TODAY_LENS_KIND,todayLens,VIEW_LENS_KIND,viewEntriesLoaded,viewLoadFromQuery,viewNoteType,viewReadError
imp src/lib/features/rail-shell/RailNoteList.svelte:82 -> src/lib/features/rail-shell/view-lens-seed.logic.ts INITIAL_VIEW_SEED,stepViewSeed,type:ViewSeedEvent,type:ViewSeedState
imp src/lib/features/rail-shell/RailNoteList.svelte:83 -> src/lib/features/rail-shell/list-fulltext.service.ts searchListFullText
imp src/lib/features/rail-shell/RailNoteList.svelte:84 -> src/lib/features/rail-shell/list-prefs.logic.ts defaultLensSort,listPrefsKey,parseRailListPrefs,withListPrefs
imp src/lib/features/rail-shell/RailNoteList.svelte:85 -> src/lib/features/rail-shell/list-prefs.service.ts saveTypeListProperties,saveTypeListSort,serializeListWrite
imp src/lib/features/rail-shell/RailNoteList.svelte:86 -> src/lib/features/rail-shell/list-properties.logic.ts availableListProperties
imp src/lib/features/rail-shell/RailNoteList.svelte:87 -> src/lib/features/rail-shell/list-search.logic.ts filterResolvedLens,normalizeListQuery
imp src/lib/features/rail-shell/RailNoteList.svelte:88 -> src/lib/features/rail-shell/list-sort-compare.logic.ts applyListSort
imp src/lib/features/rail-shell/RailNoteList.svelte:89 -> src/lib/features/rail-shell/list-sort.logic.ts formatListSort,parseListSort
imp src/lib/features/rail-shell/RailNoteList.svelte:90 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig
imp src/lib/features/rail-shell/RailNoteList.svelte:91 -> src/lib/features/rail-shell/list-view-sort.logic.ts listSortToSortDef,viewListSort
imp src/lib/features/rail-shell/RailNoteList.svelte:92 -> src/lib/features/rail-shell/new-note.service.ts createNoteHere
imp src/lib/features/rail-shell/RailNoteList.svelte:93 -> src/lib/features/rail-shell/list-empty.logic.ts explainEmptyList,LIST_EMPTY_COPY,type:EmptyListAction,type:EmptyListIcon,type:EmptyListState
imp src/lib/features/rail-shell/RailNoteList.svelte:100 -> src/lib/features/rail-shell/RailArchivedMenu.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:101 -> src/lib/features/rail-shell/RailListSearch.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:102 -> src/lib/features/rail-shell/RailPropertiesPicker.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:103 -> src/lib/features/rail-shell/RailSortMenu.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:104 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/RailNoteList.svelte:105 -> src/lib/features/rail-shell/kind-icons.ts KIND_ICONS
imp src/lib/features/rail-shell/RailNoteList.svelte:106 -> src/lib/features/rail-shell/rail-shell.types.ts type:Lens,type:LensContext,type:LensNote,type:NewNoteRule,type:RailHeaderAction,type:RailTodaySection,type:ResolvedLens
## imported-by
imp src/lib/app/AppShell.svelte:15 -> src/lib/features/rail-shell/RailNoteList.svelte default
## reach
in2 src/lib/features/rail-shell/RailNoteList.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/RailNoteList.svelte 70 files in 20 modules: src/lib/features/event-calendar(9) src/lib/components(7) src/lib/features/file-icons(7) src/lib/utils(7) src/lib/core/filesystem(6) +15 modules
## tests
test src/tests/lib/features/rail-shell/RailNoteList.inbox-check.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/rail-shell/RailNoteList.svelte mirror
## symbols
sym src/lib/features/rail-shell/RailNoteList.svelte:1 component RailNoteList props:lens,firstPane= L987
by src/lib/features/rail-shell/RailNoteList.svelte:default <- src/lib/app/AppShell.svelte:250 in (markup) mount
## locals
local src/lib/features/rail-shell/RailNoteList.svelte:139 fn lensContext(): LensContext L12
local src/lib/features/rail-shell/RailNoteList.svelte:238 fn stepSeed(event: ViewSeedEvent): boolean L5
local src/lib/features/rail-shell/RailNoteList.svelte:251 fn loadView(path: string, generation: number, propertyIndex: Map<string, PropertyIndexRecord>, indexReady: boolean, inTree: boolea… L54
local src/lib/features/rail-shell/RailNoteList.svelte:306 fn emptyToolbarBase(): Record<ToolbarKey, string> L3
local src/lib/features/rail-shell/RailNoteList.svelte:310 fn baseOf(definition: CollectionDefinition): Record<ToolbarKey, string> L5
local src/lib/features/rail-shell/RailNoteList.svelte:322 fn persistViewState(key: ToolbarKey) L40
local src/lib/features/rail-shell/RailNoteList.svelte:368 fn handleGlobalFiltersChange(groups: FilterGroup[]) L4
local src/lib/features/rail-shell/RailNoteList.svelte:373 fn handleViewFiltersChange(groups: FilterGroup[]) L4
local src/lib/features/rail-shell/RailNoteList.svelte:378 fn handleSortsChange(sorts: SortDef[]) L4
local src/lib/features/rail-shell/RailNoteList.svelte:433 fn sameSort(a: ListSortConfig | null, b: ListSortConfig | null): boolean L3
local src/lib/features/rail-shell/RailNoteList.svelte:437 fn sameProperties(a: readonly string[], b: readonly string[]): boolean L3
local src/lib/features/rail-shell/RailNoteList.svelte:446 fn writeThroughOverlay<T>(slot: { get: () => ListOverlay<T> | null; set: (next: ListOverlay<T> | null) => void }, value: T, write: () => Prom… L18
local src/lib/features/rail-shell/RailNoteList.svelte:466 fn saveListSort(config: ListSortConfig | null) L10
local src/lib/features/rail-shell/RailNoteList.svelte:477 fn handleSortSelect(config: ListSortConfig) L7
local src/lib/features/rail-shell/RailNoteList.svelte:485 fn handleSortReset() L7
local src/lib/features/rail-shell/RailNoteList.svelte:493 fn handlePropertiesChange(next: string[]) L13
local src/lib/features/rail-shell/RailNoteList.svelte:529 fn closeSearch() L4
local src/lib/features/rail-shell/RailNoteList.svelte:548 fn runFullText(text: string, generation: number) L13
local src/lib/features/rail-shell/RailNoteList.svelte:590 fn currentNewNoteRule(): NewNoteRule | null L15
local src/lib/features/rail-shell/RailNoteList.svelte:611 fn handleNewHere() L15
local src/lib/features/rail-shell/RailNoteList.svelte:651 fn handleHeaderAction() L10
local src/lib/features/rail-shell/RailNoteList.svelte:663 fn resolveNoteIcon(note: LensNote) L11
local src/lib/features/rail-shell/RailNoteList.svelte:702 fn typeChipFor(note: LensNote): string | null L4
local src/lib/features/rail-shell/RailNoteList.svelte:757 fn runEmptyAction(action: EmptyListAction) L8
local src/lib/features/rail-shell/RailNoteList.svelte:766 fn listPropertiesFor(note: LensNote): string[] L5
## mounts
mount src/lib/features/rail-shell/RailNoteList.svelte:786 RailSortMenu -> src/lib/features/rail-shell/RailSortMenu.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:811 RailPropertiesPicker -> src/lib/features/rail-shell/RailPropertiesPicker.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:813 RailArchivedMenu -> src/lib/features/rail-shell/RailArchivedMenu.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:819 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:820 SortPanel -> src/lib/features/collection/toolbar/SortPanel.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:842 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:843 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:882 RailListSearch -> src/lib/features/rail-shell/RailListSearch.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:891 NoteRowMenu -> src/lib/features/note-list/NoteRowMenu.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:923 EmptyState -> src/lib/components/EmptyState.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:925 EmptyState -> src/lib/components/EmptyState.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:950 EmptyState -> src/lib/components/EmptyState.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:973 NoteRow -> src/lib/features/note-list/NoteRow.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:250 RailNoteList -> src/lib/features/rail-shell/RailNoteList.svelte
## calls
call src/lib/features/rail-shell/RailNoteList.svelte:130 in $effect@128 -> src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock call
call src/lib/features/rail-shell/RailNoteList.svelte:137 in shownLens=$derived -> src/lib/features/rail-shell/lens.logic.ts:todayLens call
call src/lib/features/rail-shell/RailNoteList.svelte:181 in toolbarBase -> src/lib/features/rail-shell/RailNoteList.svelte:emptyToolbarBase call
call src/lib/features/rail-shell/RailNoteList.svelte:192 in activeFilterCount=$derived -> src/lib/features/type-definitions/type-note-list.logic.ts:countActiveFilters call
call src/lib/features/rail-shell/RailNoteList.svelte:193 in availableProperties=$derived -> src/lib/features/type-definitions/type-note-list.logic.ts:combineAvailableProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:199 in resolved=$derived -> src/lib/features/rail-shell/RailNoteList.svelte:lensContext call +1
call src/lib/features/rail-shell/RailNoteList.svelte:199 in resolved=$derived -> src/lib/features/rail-shell/lens.logic.ts:resolveViewLens call
call src/lib/features/rail-shell/RailNoteList.svelte:202 in resolved=$derived -> src/lib/features/rail-shell/lens.logic.ts:resolveLens call
call src/lib/features/rail-shell/RailNoteList.svelte:204 in resolved=$derived -> src/lib/features/rail-shell/lens.logic.ts:lensListsEntries call
call src/lib/features/rail-shell/RailNoteList.svelte:219 in viewInTree=$derived -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/features/rail-shell/RailNoteList.svelte:224 in $effect@221 -> src/lib/features/rail-shell/RailNoteList.svelte:stepSeed call
call src/lib/features/rail-shell/RailNoteList.svelte:233 in $effect@221 -> src/lib/features/rail-shell/RailNoteList.svelte:loadView call
call src/lib/features/rail-shell/RailNoteList.svelte:239 in stepSeed -> src/lib/features/rail-shell/view-lens-seed.logic.ts:stepViewSeed call
call src/lib/features/rail-shell/RailNoteList.svelte:259 in loadView -> src/lib/features/rail-shell/lens.logic.ts:viewEntriesLoaded call
call src/lib/features/rail-shell/RailNoteList.svelte:260 in loadView -> src/lib/features/rail-shell/RailNoteList.svelte:lensContext call +5
call src/lib/features/rail-shell/RailNoteList.svelte:260 in loadView -> src/lib/features/rail-shell/lens.logic.ts:resolveViewLens call +4
call src/lib/features/rail-shell/RailNoteList.svelte:264 in loadView -> src/lib/features/rail-shell/RailNoteList.svelte:stepSeed call +4
call src/lib/features/rail-shell/RailNoteList.svelte:271 in loadView -> src/lib/features/type-definitions/view-parse-cache.ts:refreshViewDefinition call
call src/lib/features/rail-shell/RailNoteList.svelte:272 in loadView -> src/lib/features/type-definitions/view-parse-cache.ts:getCachedViewDefinition call
call src/lib/features/rail-shell/RailNoteList.svelte:273 in loadView -> src/lib/features/type-definitions/view-parse-cache.ts:getViewContentHash call
call src/lib/features/rail-shell/RailNoteList.svelte:283 in loadView -> src/lib/features/collection/yaml-parser.ts:railViewIndex call
call src/lib/features/rail-shell/RailNoteList.svelte:283 in loadView -> src/lib/features/type-definitions/type-note-list.logic.ts:seedToolbarStateFromDefinition call
call src/lib/features/rail-shell/RailNoteList.svelte:288 in loadView -> src/lib/features/rail-shell/RailNoteList.svelte:baseOf call
call src/lib/features/rail-shell/RailNoteList.svelte:290 in loadView -> src/lib/features/rail-shell/lens.logic.ts:queryViewLens call
call src/lib/features/rail-shell/RailNoteList.svelte:297 in loadView -> src/lib/features/rail-shell/lens.logic.ts:viewLoadFromQuery call
call src/lib/features/rail-shell/RailNoteList.svelte:300 in loadView -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/RailNoteList.svelte:302 in loadView -> src/lib/features/rail-shell/lens.logic.ts:viewReadError call
call src/lib/features/rail-shell/RailNoteList.svelte:311 in baseOf -> src/lib/features/rail-shell/RailNoteList.svelte:emptyToolbarBase call
call src/lib/features/rail-shell/RailNoteList.svelte:312 in baseOf -> src/lib/features/type-definitions/type-note-list.logic.ts:toolbarKeyBase call
call src/lib/features/rail-shell/RailNoteList.svelte:326 in persistViewState -> src/lib/features/type-definitions/type-note-list.logic.ts:toolbarValuesFromState call +1
call src/lib/features/rail-shell/RailNoteList.svelte:328 in persistViewState -> src/lib/features/type-definitions/type-note-list.logic.ts:canonicalToolbarValue call
call src/lib/features/rail-shell/RailNoteList.svelte:332 in persistViewState -> src/lib/features/rail-shell/RailNoteList.svelte:stepSeed call +2
call src/lib/features/rail-shell/RailNoteList.svelte:336 in persistViewState -> src/lib/features/rail-shell/list-prefs.service.ts:serializeListWrite call
call src/lib/features/rail-shell/RailNoteList.svelte:336 in persistViewState -> src/lib/features/type-definitions/type-definitions.service.ts:updateViewToolbarKey call
call src/lib/features/rail-shell/RailNoteList.svelte:339 in persistViewState -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/RailNoteList.svelte:354 in persistViewState -> src/lib/features/type-definitions/type-note-list.logic.ts:toolbarKeysDiffering call
call src/lib/features/rail-shell/RailNoteList.svelte:360 in persistViewState -> src/lib/features/rail-shell/RailNoteList.svelte:loadView call
call src/lib/features/rail-shell/RailNoteList.svelte:365 in viewTypeName=$derived -> src/lib/features/rail-shell/lens.logic.ts:viewNoteType call
call src/lib/features/rail-shell/RailNoteList.svelte:370 in handleGlobalFiltersChange -> src/lib/features/rail-shell/RailNoteList.svelte:persistViewState call
call src/lib/features/rail-shell/RailNoteList.svelte:375 in handleViewFiltersChange -> src/lib/features/rail-shell/RailNoteList.svelte:persistViewState call
call src/lib/features/rail-shell/RailNoteList.svelte:380 in handleSortsChange -> src/lib/features/rail-shell/RailNoteList.svelte:persistViewState call
call src/lib/features/rail-shell/RailNoteList.svelte:384 in definitionPath=$derived -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getTypeDefinitionPath mcall
call src/lib/features/rail-shell/RailNoteList.svelte:387 in savedEntry=$derived -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath mcall
call src/lib/features/rail-shell/RailNoteList.svelte:389 in settingsPrefs=$derived -> src/lib/features/rail-shell/list-prefs.logic.ts:listPrefsKey call
call src/lib/features/rail-shell/RailNoteList.svelte:389 in settingsPrefs=$derived -> src/lib/features/rail-shell/list-prefs.logic.ts:parseRailListPrefs call
call src/lib/features/rail-shell/RailNoteList.svelte:393 in savedSort=$derived -> src/lib/features/rail-shell/list-sort.logic.ts:parseListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:396 in savedProperties=$derived -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:426 in $effect@425 -> src/lib/features/rail-shell/RailNoteList.svelte:sameSort call
call src/lib/features/rail-shell/RailNoteList.svelte:430 in $effect@429 -> src/lib/features/rail-shell/RailNoteList.svelte:sameProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:434 in sameSort -> src/lib/features/rail-shell/list-sort.logic.ts:formatListSort call +1
call src/lib/features/rail-shell/RailNoteList.svelte:458 in writeThroughOverlay -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/RailNoteList.svelte:459 in writeThroughOverlay -> src/lib/core/frontmatter/frontmatter-write.service.ts:toastFrontmatterWriteError call
call src/lib/features/rail-shell/RailNoteList.svelte:469 in saveListSort -> src/lib/features/rail-shell/RailNoteList.svelte:writeThroughOverlay call
call src/lib/features/rail-shell/RailNoteList.svelte:469 in saveListSort -> src/lib/features/rail-shell/list-prefs.service.ts:saveTypeListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:472 in saveListSort -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/RailNoteList.svelte:473 in saveListSort -> src/lib/features/rail-shell/list-prefs.logic.ts:listPrefsKey call
call src/lib/features/rail-shell/RailNoteList.svelte:473 in saveListSort -> src/lib/features/rail-shell/list-prefs.logic.ts:withListPrefs call
call src/lib/features/rail-shell/RailNoteList.svelte:479 in handleSortSelect -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortsChange call
call src/lib/features/rail-shell/RailNoteList.svelte:479 in handleSortSelect -> src/lib/features/rail-shell/list-view-sort.logic.ts:listSortToSortDef call
call src/lib/features/rail-shell/RailNoteList.svelte:482 in handleSortSelect -> src/lib/features/rail-shell/RailNoteList.svelte:saveListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:487 in handleSortReset -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortsChange call
call src/lib/features/rail-shell/RailNoteList.svelte:490 in handleSortReset -> src/lib/features/rail-shell/RailNoteList.svelte:saveListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:497 in handlePropertiesChange -> src/lib/features/rail-shell/RailNoteList.svelte:writeThroughOverlay call +1
call src/lib/features/rail-shell/RailNoteList.svelte:497 in handlePropertiesChange -> src/lib/features/rail-shell/list-prefs.service.ts:serializeListWrite call
call src/lib/features/rail-shell/RailNoteList.svelte:497 in handlePropertiesChange -> src/lib/features/type-definitions/type-definitions.service.ts:updateViewListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:499 in handlePropertiesChange -> src/lib/features/rail-shell/list-prefs.service.ts:saveTypeListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:501 in handlePropertiesChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/RailNoteList.svelte:502 in handlePropertiesChange -> src/lib/features/rail-shell/list-prefs.logic.ts:listPrefsKey call
call src/lib/features/rail-shell/RailNoteList.svelte:502 in handlePropertiesChange -> src/lib/features/rail-shell/list-prefs.logic.ts:withListPrefs call
call src/lib/features/rail-shell/RailNoteList.svelte:513 in searching=$derived -> src/lib/features/rail-shell/list-search.logic.ts:normalizeListQuery call
call src/lib/features/rail-shell/RailNoteList.svelte:525 in $effect.pre@519 -> src/lib/features/rail-shell/RailNoteList.svelte:closeSearch call
call src/lib/features/rail-shell/RailNoteList.svelte:543 in $effect@534 -> src/lib/features/rail-shell/RailNoteList.svelte:runFullText call
call src/lib/features/rail-shell/RailNoteList.svelte:553 in runFullText -> src/lib/features/rail-shell/list-fulltext.service.ts:searchListFullText call
call src/lib/features/rail-shell/RailNoteList.svelte:556 in runFullText -> src/lib/utils/debug.ts:debug call
call src/lib/features/rail-shell/RailNoteList.svelte:563 in sortedResolved=$derived -> src/lib/features/rail-shell/list-sort-compare.logic.ts:applyListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:564 in shownResolved=$derived -> src/lib/features/rail-shell/RailNoteList.svelte:listPropertiesFor ref
call src/lib/features/rail-shell/RailNoteList.svelte:564 in shownResolved=$derived -> src/lib/features/rail-shell/list-search.logic.ts:filterResolvedLens call
call src/lib/features/rail-shell/RailNoteList.svelte:571 in sortMenuConfig=$derived -> src/lib/features/rail-shell/list-view-sort.logic.ts:viewListSort call
call src/lib/features/rail-shell/RailNoteList.svelte:571 in sortMenuConfig=$derived -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewSort call
call src/lib/features/rail-shell/RailNoteList.svelte:572 in sortMenuConfig=$derived -> src/lib/features/rail-shell/list-prefs.logic.ts:defaultLensSort call
call src/lib/features/rail-shell/RailNoteList.svelte:576 in sortProperties=$derived -> src/lib/features/rail-shell/list-properties.logic.ts:availableListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:577 in pickableProperties=$derived -> src/lib/features/rail-shell/list-properties.logic.ts:availableListProperties call
call src/lib/features/rail-shell/RailNoteList.svelte:583 in allPaths=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/features/rail-shell/RailNoteList.svelte:593 in currentNewNoteRule -> src/lib/features/rail-shell/lens.logic.ts:newNoteRule call
call src/lib/features/rail-shell/RailNoteList.svelte:606 in canCreate=$derived -> src/lib/features/rail-shell/RailNoteList.svelte:currentNewNoteRule call
call src/lib/features/rail-shell/RailNoteList.svelte:614 in handleNewHere -> src/lib/features/rail-shell/RailNoteList.svelte:currentNewNoteRule call
call src/lib/features/rail-shell/RailNoteList.svelte:618 in handleNewHere -> src/lib/features/rail-shell/new-note.service.ts:createNoteHere call
call src/lib/features/rail-shell/RailNoteList.svelte:636 in TODAY_DAILY_NOTE.run -> src/lib/features/event-calendar/event-calendar-daily-note.store.svelte.ts:eventCalendarDailyNoteStore.open mcall
call src/lib/features/rail-shell/RailNoteList.svelte:657 in handleHeaderAction -> src/lib/utils/log.service.ts:appendLog call
call src/lib/features/rail-shell/RailNoteList.svelte:664 in resolveNoteIcon -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath call +1
call src/lib/features/rail-shell/RailNoteList.svelte:666 in resolveNoteIcon -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getTypeDefinitionPath mcall
call src/lib/features/rail-shell/RailNoteList.svelte:714 in hiddenArchivedCount=$derived -> src/lib/features/rail-shell/RailNoteList.svelte:lensContext call
call src/lib/features/rail-shell/RailNoteList.svelte:714 in hiddenArchivedCount=$derived -> src/lib/features/rail-shell/lens.logic.ts:resolveLens call
call src/lib/features/rail-shell/RailNoteList.svelte:720 in emptyExplanation=$derived -> src/lib/features/rail-shell/list-empty.logic.ts:explainEmptyList call
call src/lib/features/rail-shell/RailNoteList.svelte:769 in listPropertiesFor -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getTypeMetadata mcall
call src/lib/features/rail-shell/RailNoteList.svelte:791 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortSelect markup
call src/lib/features/rail-shell/RailNoteList.svelte:793 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortReset markup
call src/lib/features/rail-shell/RailNoteList.svelte:804 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:closeSearch markup +1
call src/lib/features/rail-shell/RailNoteList.svelte:811 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handlePropertiesChange markup
call src/lib/features/rail-shell/RailNoteList.svelte:825 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleSortsChange markup
call src/lib/features/rail-shell/RailNoteList.svelte:826 in (markup) -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath markup
call src/lib/features/rail-shell/RailNoteList.svelte:826 in (markup) -> src/lib/features/type-definitions/type-sidebar.logic.ts:effectiveViewSortLabel markup
call src/lib/features/rail-shell/RailNoteList.svelte:848 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleGlobalFiltersChange markup
call src/lib/features/rail-shell/RailNoteList.svelte:849 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleViewFiltersChange markup
call src/lib/features/rail-shell/RailNoteList.svelte:861 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleHeaderAction markup
call src/lib/features/rail-shell/RailNoteList.svelte:873 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:handleNewHere markup
call src/lib/features/rail-shell/RailNoteList.svelte:939 in (markup) -> src/lib/core/editor/editor.service.ts:openFileInEditor markup
call src/lib/features/rail-shell/RailNoteList.svelte:954 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:runEmptyAction markup
call src/lib/features/rail-shell/RailNoteList.svelte:975 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:resolveNoteIcon markup
call src/lib/features/rail-shell/RailNoteList.svelte:977 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:listPropertiesFor markup
call src/lib/features/rail-shell/RailNoteList.svelte:979 in (markup) -> src/lib/features/rail-shell/RailNoteList.svelte:typeChipFor markup
call src/lib/features/rail-shell/RailNoteList.svelte:985 in (markup) -> src/lib/features/properties/lifecycle.service.ts:setOrganizedForPath markup
## effects
fx src/lib/features/rail-shell/RailNoteList.svelte:128 svelte.$effect in (script)
reg src/lib/features/rail-shell/RailNoteList.svelte:130 src/lib/features/event-calendar/event-calendar.service.ts:acquireCalendarClock in $effect@128
fx src/lib/features/rail-shell/RailNoteList.svelte:221 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailNoteList.svelte:425 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailNoteList.svelte:429 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailNoteList.svelte:519 svelte.$effect in (script)
fx src/lib/features/rail-shell/RailNoteList.svelte:534 svelte.$effect in (script)
