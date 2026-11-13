# file card src/lib/features/rail-shell/lens.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/lens.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/rail-shell/lens.logic.ts logic L1111 module src/lib/features/rail-shell in18 t30
## imports
imp src/lib/features/rail-shell/lens.logic.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/rail-shell/lens.logic.ts:2 -> src/lib/core/settings/settings.types.ts type:LayoutSettings
imp src/lib/features/rail-shell/lens.logic.ts:3 -> src/lib/core/settings/rail-pin.logic.ts TYPE_PIN_PREFIX,VIEW_PIN_PREFIX,typePinKey,viewPinKey
imp src/lib/features/rail-shell/lens.logic.ts:4 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/rail-shell/lens.logic.ts:5 -> src/lib/core/filesystem/fs.logic.ts getFileExtension,getFileName,getRelativePath,isCanvasFile,isKanbanFile,isMarkdownFile,isViewFile,naturalCompare
imp src/lib/features/rail-shell/lens.logic.ts:15 -> src/lib/utils/capture-path.ts buildCaptureFolder
imp src/lib/features/rail-shell/lens.logic.ts:16 -> src/lib/utils/note-date.ts noteDateKey,parseDateKey
imp src/lib/features/rail-shell/lens.logic.ts:17 -> src/lib/features/type-definitions/inbox-workflow.logic.ts isInboxEntry
imp src/lib/features/rail-shell/lens.logic.ts:18 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,resolveWikilinkCached
imp src/lib/features/rail-shell/lens.logic.ts:19 -> src/lib/features/type-definitions/type-definitions.logic.ts getTypeMetadataFallback,type:TypeMetadata
imp src/lib/features/rail-shell/lens.logic.ts:20 -> src/lib/features/type-definitions/type-sidebar.logic.ts buildTypeSections,collectViewFiles,excludeSystemFolder,formatRelativeTime,getNotesForSelection,getNotesForViewPaths,getViewGroup,getViewLabel,getViewOpensInEditor,getViewOrder,getViewSort,getViewVisible,ignoredKeyNotes,isListableNote,sortViewFiles,type:ArchivedFilter,type:TypeSidebarSelection
imp src/lib/features/rail-shell/lens.logic.ts:39 -> src/lib/features/type-definitions/type-note-list.logic.ts buildOverriddenQuery,resolveViewListSort,seedToolbarStateFromDefinition
imp src/lib/features/rail-shell/lens.logic.ts:40 -> src/lib/features/collection/collection.logic.ts executeQuery,filterCitesArchived
imp src/lib/features/rail-shell/lens.logic.ts:41 -> src/lib/features/collection/yaml-parser.ts railViewIndex
imp src/lib/features/rail-shell/lens.logic.ts:42 -> src/lib/features/collection/toolbar/filter.logic.ts filterRowToExpression
imp src/lib/features/rail-shell/lens.logic.ts:43 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionViewDef,type:PropertyIndexRecord,type:SortDef
imp src/lib/features/rail-shell/lens.logic.ts:44 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/rail-shell/lens.logic.ts:45 -> src/lib/features/rail-shell/rail-shell.types.ts type:FileKind,type:Lens,type:LensContext,type:LensGroup,type:LensNote,type:NewNoteContext,type:NewNoteRule,type:PlainNewNoteRule,type:RailLensProvider,type:RailNavigator,type:RailPin,type:ResolvedLens,type:TypeNavigatorRow,type:ViewLensStatus
## imported-by
imp src/lib/app/AppShell.svelte:20 -> src/lib/features/rail-shell/lens.logic.ts FILES_RAIL_ITEM,parseExpandedFolders,pickedFolderLens,staleFolderPickFix,toggleExpandedFolder,pickedTypesLens,pinnedRailItems,restoreRailItem,SEARCH_LENS,INITIAL_TYPES_PICK_CHECK,staleRailPinFix,staleTypesPickFix,stepTypesPickCheck,TYPES_RAIL_ITEM,typeNavigatorRows,viewNavigatorRows
imp src/lib/app/AppShell.svelte:38 -> src/lib/features/rail-shell/lens.logic.ts type:TypesPickCheck
imp src/lib/app/boot.ts:13 -> src/lib/features/rail-shell/lens.logic.ts blockRowSet,viewEntriesLoaded,viewRowSet
imp src/lib/app/commands.ts:17 -> src/lib/features/rail-shell/lens.logic.ts FILES_RAIL_ITEM,pinnedRailItems
imp src/lib/app/rail-navigation.ts:4 -> src/lib/features/rail-shell/lens.logic.ts SEARCH_RAIL_ITEM,TYPES_RAIL_ITEM,VIEW_LENS_KIND
imp src/lib/features/rail-shell/FilesNavigator.svelte:55 -> src/lib/features/rail-shell/lens.logic.ts FILES_LENS,FOLDER_LENS_KIND,navigatorFolders,VIEW_LENS_KIND,viewLabels
imp src/lib/features/rail-shell/LayoutSection.svelte:8 -> src/lib/features/rail-shell/lens.logic.ts SEARCH_RAIL_ITEM,TODAY_RAIL_ITEM
imp src/lib/features/rail-shell/Rail.svelte:26 -> src/lib/features/rail-shell/lens.logic.ts pinnedRailItems
imp src/lib/features/rail-shell/RailNoteList.svelte:62 -> src/lib/features/rail-shell/lens.logic.ts FOLDER_LENS_KIND,lensListsEntries,newNoteRule,queryViewLens,resolveLens,resolveViewLens,TODAY_DATED_GROUP,TODAY_LENS_KIND,todayLens,VIEW_LENS_KIND,viewEntriesLoaded,viewLoadFromQuery,viewNoteType,viewReadError
imp src/lib/features/rail-shell/TypesNavigator.svelte:52 -> src/lib/features/rail-shell/lens.logic.ts sameLens,VIEW_LENS_KIND,viewEntriesLoaded,viewLabels
imp src/lib/features/rail-shell/files-navigator.service.ts:3 -> src/lib/features/rail-shell/lens.logic.ts followFolderPathChange
imp src/lib/features/rail-shell/neighbourhood.service.ts:3 -> src/lib/features/rail-shell/lens.logic.ts NEIGHBOURHOOD_RAIL_ITEM,TODAY_RAIL_ITEM
imp src/lib/features/rail-shell/new-note.service.ts:10 -> src/lib/features/rail-shell/lens.logic.ts newNoteContent
imp src/lib/features/rail-shell/rail-items.logic.ts:2 -> src/lib/features/rail-shell/lens.logic.ts FILES_RAIL_ITEM,SEARCH_RAIL_ITEM,TODAY_RAIL_ITEM,TYPES_RAIL_ITEM
imp src/lib/features/rail-shell/types-navigator.service.ts:3 -> src/lib/features/rail-shell/lens.logic.ts followRailPinPathChange,followTypesPickPathChange
imp src/lib/features/rail-shell/view-lens.service.ts:5 -> src/lib/features/rail-shell/lens.logic.ts queryViewLens,resolveViewLens,viewLoadFromQuery,viewReadError,type:ViewLoad
imp src/lib/features/search/open-search.service.ts:2 -> src/lib/features/rail-shell/lens.logic.ts SEARCH_RAIL_ITEM
imp src/lib/plugins/calendar/day-lens.logic.ts:3 -> src/lib/features/rail-shell/lens.logic.ts entryNoteDate,listEntries
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:5 -> src/lib/features/rail-shell/lens.logic.ts entryNoteDate
## reach
in2 src/lib/features/rail-shell/lens.logic.ts 15 files in 7 modules: src/lib/app(5) src/lib/plugins/one-on-one(4) src/lib/plugins/calendar(2) src/lib/features/deep-link(1) src/lib/features/note-action-bar(1) +2 modules: q impact src/lib/features/rail-shell/lens.logic.ts --depth 2
out2 src/lib/features/rail-shell/lens.logic.ts 14 files in 7 modules: src/lib/features/collection(4) src/lib/utils(3) src/lib/core/frontmatter(2) src/lib/core/settings(2) src/lib/contracts(1) +2 modules
## tests
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports src/lib/features/rail-shell/lens.logic.ts mirror
test src/tests/help/collection-features.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/help/type-definitions-views.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/app/AppShell.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/neighbourhood.service.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/new-note.service.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/types-navigator.service.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/rail-shell/view-lens.service.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/features/search/open-search.service.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/plugins/calendar/calendar-rail.service.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/plugins/calendar/day-lens.logic.test.ts imports src/lib/features/rail-shell/lens.logic.ts
test src/tests/lib/plugins/mods/mod-query.service.test.ts imports src/lib/features/rail-shell/lens.logic.ts
## symbols
sym src/lib/features/rail-shell/lens.logic.ts:63 const INBOX_LENS: Lens L1 | The Inbox rail item's lens.
sym src/lib/features/rail-shell/lens.logic.ts:66 const TODAY_LENS_KIND L1 | The lens kind of the Today rail item; its target is the day it lists, as a `YYYY-MM-DD` key.
by src/lib/features/rail-shell/lens.logic.ts:TODAY_LENS_KIND <- src/lib/features/rail-shell/RailNoteList.svelte:114 in isToday=$derived ref
sym src/lib/features/rail-shell/lens.logic.ts:72 const TODAY_LENS: Lens L1 | The Today rail item's lens before the note list gives it the current day.
sym src/lib/features/rail-shell/lens.logic.ts:75 fn todayLens(todayKey: string): Lens L3 | The Today lens of a day (`todayKey`), which the note list keeps on the clock's day.
by src/lib/features/rail-shell/lens.logic.ts:todayLens <- src/lib/features/rail-shell/RailNoteList.svelte:126 in shownLens=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:85 const TODAY_DATED_GROUP L1 | The Today lens's group of the notes dated today; plugin sections (`railRegistryStore.todaySections`) show before it.
by src/lib/features/rail-shell/lens.logic.ts:TODAY_DATED_GROUP <- src/lib/features/rail-shell/RailNoteList.svelte:688 in groupedItems=$derived ref
sym src/lib/features/rail-shell/lens.logic.ts:88 const FAVORITES_LENS: Lens L1 | The Favorites rail item's lens.
sym src/lib/features/rail-shell/lens.logic.ts:91 const ARCHIVE_LENS: Lens L1 | The Archive rail item's lens.
sym src/lib/features/rail-shell/lens.logic.ts:97 const SEARCH_LENS: Lens L1 | The Search rail item's lens.
by src/lib/features/rail-shell/lens.logic.ts:SEARCH_LENS <- src/lib/app/AppShell.svelte:245 in (markup) markup
sym src/lib/features/rail-shell/lens.logic.ts:100 const UNTYPED_LENS: Lens L1 | The Untyped row of the Types navigator: notes with no type.
sym src/lib/features/rail-shell/lens.logic.ts:106 const TYPES_LENS: Lens L1 | The Types rail item's lens before a navigator row is picked.
sym src/lib/features/rail-shell/lens.logic.ts:109 const VIEW_LENS_KIND L1 | The lens kind of a `.view` file; its target is the file's absolute path.
by src/lib/features/rail-shell/lens.logic.ts:VIEW_LENS_KIND <- src/lib/app/rail-navigation.ts:37 in openRailView ref
by src/lib/features/rail-shell/lens.logic.ts:VIEW_LENS_KIND <- src/lib/features/rail-shell/FilesNavigator.svelte:412 in (markup) markup
by src/lib/features/rail-shell/lens.logic.ts:VIEW_LENS_KIND <- src/lib/features/rail-shell/RailNoteList.svelte:142 in viewPath=$derived ref
by src/lib/features/rail-shell/lens.logic.ts:VIEW_LENS_KIND <- src/lib/features/rail-shell/TypesNavigator.svelte:67 in viewRows=$derived ref +2
sym src/lib/features/rail-shell/lens.logic.ts:112 const FOLDER_LENS_KIND L1 | The lens kind of a Files navigator folder; its target is the folder's absolute path, none is the vault root.
by src/lib/features/rail-shell/lens.logic.ts:FOLDER_LENS_KIND <- src/lib/features/rail-shell/FilesNavigator.svelte:109 in lensFor ref +1
by src/lib/features/rail-shell/lens.logic.ts:FOLDER_LENS_KIND <- src/lib/features/rail-shell/RailNoteList.svelte:581 in currentNewNoteRule ref
sym src/lib/features/rail-shell/lens.logic.ts:115 const FILES_LENS: Lens L1 | The Files rail item's lens before a folder is picked: the vault root.
by src/lib/features/rail-shell/lens.logic.ts:FILES_LENS <- src/lib/features/rail-shell/FilesNavigator.svelte:109 in lensFor ref +1
sym src/lib/features/rail-shell/lens.logic.ts:118 const TODAY_RAIL_ITEM L1 | The rail item that shows the Today lens.
by src/lib/features/rail-shell/lens.logic.ts:TODAY_RAIL_ITEM <- src/lib/features/rail-shell/LayoutSection.svelte:33 in FIXED_DESCRIPTIONS ref +1
by src/lib/features/rail-shell/lens.logic.ts:TODAY_RAIL_ITEM <- src/lib/features/rail-shell/neighbourhood.service.ts:33 in registerNeighbourhoodPathChangeConsumer ref
by src/lib/features/rail-shell/lens.logic.ts:TODAY_RAIL_ITEM <- src/lib/features/rail-shell/rail-items.logic.ts:40 in railItems ref +1
sym src/lib/features/rail-shell/lens.logic.ts:121 const DEFAULT_RAIL_ITEM L1 | The rail item shown when nothing valid is saved, and where a lost rail item or lens falls back.
sym src/lib/features/rail-shell/lens.logic.ts:124 const SEARCH_RAIL_ITEM L1 | The rail item that shows Search.
by src/lib/features/rail-shell/lens.logic.ts:SEARCH_RAIL_ITEM <- src/lib/app/rail-navigation.ts:15 in selectRailItem ref
by src/lib/features/rail-shell/lens.logic.ts:SEARCH_RAIL_ITEM <- src/lib/features/rail-shell/LayoutSection.svelte:32 in FIXED_DESCRIPTIONS ref +2
by src/lib/features/rail-shell/lens.logic.ts:SEARCH_RAIL_ITEM <- src/lib/features/rail-shell/rail-items.logic.ts:38 in railItems ref +6
by src/lib/features/rail-shell/lens.logic.ts:SEARCH_RAIL_ITEM <- src/lib/features/search/open-search.service.ts:13 in openSearch ref
sym src/lib/features/rail-shell/lens.logic.ts:127 const TYPES_RAIL_ITEM L1 | The rail item that opens the Types navigator.
by src/lib/features/rail-shell/lens.logic.ts:TYPES_RAIL_ITEM <- src/lib/app/AppShell.svelte:113 in showsTypesNavigator=$derived ref +1
by src/lib/features/rail-shell/lens.logic.ts:TYPES_RAIL_ITEM <- src/lib/app/rail-navigation.ts:37 in openRailView ref
by src/lib/features/rail-shell/lens.logic.ts:TYPES_RAIL_ITEM <- src/lib/features/rail-shell/rail-items.logic.ts:44 in railItems ref
sym src/lib/features/rail-shell/lens.logic.ts:130 const FILES_RAIL_ITEM L1 | The rail item that opens the Files navigator.
by src/lib/features/rail-shell/lens.logic.ts:FILES_RAIL_ITEM <- src/lib/app/AppShell.svelte:114 in showsFilesNavigator=$derived ref
by src/lib/features/rail-shell/lens.logic.ts:FILES_RAIL_ITEM <- src/lib/app/commands.ts:168 in getBuiltInCommands ref
by src/lib/features/rail-shell/lens.logic.ts:FILES_RAIL_ITEM <- src/lib/features/rail-shell/rail-items.logic.ts:46 in railItems ref
sym src/lib/features/rail-shell/lens.logic.ts:133 const NEIGHBOURHOOD_LENS_KIND L1 | The lens kind of a note's neighbourhood; its target is the note's absolute path.
sym src/lib/features/rail-shell/lens.logic.ts:140 const NEIGHBOURHOOD_RAIL_ITEM L1 | The rail item key while the note list shows a neighbourhood.
by src/lib/features/rail-shell/lens.logic.ts:NEIGHBOURHOOD_RAIL_ITEM <- src/lib/features/rail-shell/neighbourhood.service.ts:12 in openNeighbourhood ref +1
sym src/lib/features/rail-shell/lens.logic.ts:143 fn neighbourhoodLens(path: string): Lens L3 | The Neighbourhood lens of the note at `path`.
sym src/lib/features/rail-shell/lens.logic.ts:189 fn restoreRailItem(saved: unknown, navigators: readonly RailNavigator[] = [], neighbourhoodPath: string | null = null, hidden: readonly s… L20 | The rail item saved in `layout.railItem` and its lens: a built-in item, a navigator a plugin registered (its lens is the navigator's pick), or a pin key (`view…
by src/lib/features/rail-shell/lens.logic.ts:restoreRailItem <- src/lib/app/AppShell.svelte:106 in railItem=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:219 fn pinnedRailItems(entries: readonly NoteEntryV2[], typeMetadataMap: Map<string, TypeMetadata>): RailPin[] L21 | The rail's pinned items: every `.view` and type definition in the entries snapshot whose `_rail` is the YAML boolean `true` (only the canonical spelling; `"tru…
by src/lib/features/rail-shell/lens.logic.ts:pinnedRailItems <- src/lib/app/AppShell.svelte:177 in $effect@161 call
by src/lib/features/rail-shell/lens.logic.ts:pinnedRailItems <- src/lib/app/commands.ts:64 in railGoToCommands call
by src/lib/features/rail-shell/lens.logic.ts:pinnedRailItems <- src/lib/features/rail-shell/Rail.svelte:85 in items=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:247 fn staleRailPinFix(railItem: unknown, pinned: readonly RailPin[]): Pick<Partial<LayoutSettings>, 'railItem'> | null L4 | The layout change that sends a saved pin that is no longer pinned (file gone, `_rail` removed) back to the default item: `{ railItem }` when `railItem` is a pi…
by src/lib/features/rail-shell/lens.logic.ts:staleRailPinFix <- src/lib/app/AppShell.svelte:177 in $effect@161 call
sym src/lib/features/rail-shell/lens.logic.ts:258 fn noteSubtitle(entry: NoteEntryV2, vaultPath: string | null): string L3 | The row's second line: the note's modified time in relative form (`formatRelativeTime`, the order most lists sort by) and its vault-relative folder.
sym src/lib/features/rail-shell/lens.logic.ts:263 fn entryNoteDate(entry: NoteEntryV2): string | null L8 | An entry's note date (`noteDateKey`: frontmatter `date`, else `created`, else the disk creation time), or null.
by src/lib/features/rail-shell/lens.logic.ts:entryNoteDate <- src/lib/plugins/calendar/day-lens.logic.ts:41 in resolveDayLens call +1
by src/lib/features/rail-shell/lens.logic.ts:entryNoteDate <- src/lib/plugins/one-on-one/one-on-one.logic.ts:186 in buildMyPeople call
sym src/lib/features/rail-shell/lens.logic.ts:326 fn listEntries(ctx: LensContext, includes: (entry: NoteEntryV2) => boolean): LensNote[] L6 | The entries `includes` keeps as note list rows: system folder excluded, newest change first (the built-in lenses' order).
by src/lib/features/rail-shell/lens.logic.ts:listEntries <- src/lib/plugins/calendar/day-lens.logic.ts:41 in resolveDayLens call
sym src/lib/features/rail-shell/lens.logic.ts:434 fn resolveLens(lens: Lens, ctx: LensContext, providers: readonly RailLensProvider[] = [], archived: ArchivedFilter = 'active'): Resol… L15 | Turns a lens into the note list's label, rule and notes.
by src/lib/features/rail-shell/lens.logic.ts:resolveLens <- src/lib/features/rail-shell/RailNoteList.svelte:191 in resolved=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:456 fn lensListsEntries(lens: Lens): boolean L3 | True when a lens's list comes from the entries snapshot, so before the first snapshot it would say it is empty.
by src/lib/features/rail-shell/lens.logic.ts:lensListsEntries <- src/lib/features/rail-shell/RailNoteList.svelte:193 in resolved=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:471 fn viewEntriesLoaded(store: { readonly entries: readonly { path: string }[]; readonly entriesVersion: number }, propertyIndex: ReadonlyMap<… L11 | Whether this vault's entries have landed, for a `.view`'s row set (`viewRowSet` drops a record with no entry).
by src/lib/features/rail-shell/lens.logic.ts:viewEntriesLoaded <- src/lib/app/boot.ts:79 in registerAppPorts call
by src/lib/features/rail-shell/lens.logic.ts:viewEntriesLoaded <- src/lib/features/rail-shell/RailNoteList.svelte:248 in loadView call
by src/lib/features/rail-shell/lens.logic.ts:viewEntriesLoaded <- src/lib/features/rail-shell/TypesNavigator.svelte:108 in $effect@96 call
sym src/lib/features/rail-shell/lens.logic.ts:492 fn typeNavigatorRows(ctx: Pick<LensContext, 'entries' | 'vaultPath' | 'systemFolder' | 'typeMetadataMap'>, showUntyped: boolean): TypeNavig… L25 | The Types navigator's rows: the visible types in sidebar order, each with the number of notes its lens lists, then Untyped when `showUntyped` is on.
by src/lib/features/rail-shell/lens.logic.ts:typeNavigatorRows <- src/lib/app/AppShell.svelte:133 in entryTypeRows=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:523 fn parseTypesPick(saved: unknown): Lens | null L7 | The Types navigator pick saved in `layout.railTypesLens`.
sym src/lib/features/rail-shell/lens.logic.ts:536 fn pickedTypesLens(saved: unknown, rows: readonly TypeNavigatorRow[]): Lens L3 | The lens the Types rail item shows: the saved pick (kept even when the snapshot does not list it yet, as right after New type or a rename), else the first row,…
by src/lib/features/rail-shell/lens.logic.ts:pickedTypesLens <- src/lib/app/AppShell.svelte:148 in railLens=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:541 fn sameLens(a: Lens, b: Lens): boolean L3 | True when two lenses pick the same thing.
by src/lib/features/rail-shell/lens.logic.ts:sameLens <- src/lib/features/rail-shell/TypesNavigator.svelte:278 in (markup) markup +1
sym src/lib/features/rail-shell/lens.logic.ts:556 fn staleTypesPickFix(railItem: unknown, saved: unknown, rows: readonly TypeNavigatorRow[], viewPaths: readonly string[]): Pick<Partial<Layo… L11 | The layout change that drops a saved Types pick that no longer exists (a view gone from the tree, a deleted type, or Untyped with untyped notes hidden): the pi…
by src/lib/features/rail-shell/lens.logic.ts:staleTypesPickFix <- src/lib/app/AppShell.svelte:173 in $effect@161 call
sym src/lib/features/rail-shell/lens.logic.ts:569 interface TypesPickCheck L10 | Where the once-per-vault-open stale Types pick check stands.
by src/lib/features/rail-shell/lens.logic.ts:TypesPickCheck <- src/lib/app/AppShell.svelte:38 in (script) import
sym src/lib/features/rail-shell/lens.logic.ts:581 const INITIAL_TYPES_PICK_CHECK: TypesPickCheck L1 | The check state before any vault is seen.
by src/lib/features/rail-shell/lens.logic.ts:INITIAL_TYPES_PICK_CHECK <- src/lib/app/AppShell.svelte:160 in typesPickCheck ref
sym src/lib/features/rail-shell/lens.logic.ts:592 fn stepTypesPickCheck(prev: TypesPickCheck, now: { vaultPath: string | null; indexReady: boolean; entriesVersion: number }): { next: TypesPi… L13 | Advances the stale Types pick check by one observation and says whether to run `staleTypesPickFix` now.
by src/lib/features/rail-shell/lens.logic.ts:stepTypesPickCheck <- src/lib/app/AppShell.svelte:162 in $effect@161 call
sym src/lib/features/rail-shell/lens.logic.ts:618 fn newNoteRule(lens: Lens, ctx: NewNoteContext, providers: readonly RailLensProvider[] = []): NewNoteRule | null L20 | The one lens-to-new-note rule behind "+ New here".
by src/lib/features/rail-shell/lens.logic.ts:newNoteRule <- src/lib/features/rail-shell/RailNoteList.svelte:582 in currentNewNoteRule call
sym src/lib/features/rail-shell/lens.logic.ts:640 fn newNoteContent(rule: PlainNewNoteRule): string L5 | The new note's initial content: the rule's frontmatter block, or empty when it sets none.
by src/lib/features/rail-shell/lens.logic.ts:newNoteContent <- src/lib/features/rail-shell/new-note.service.ts:37 in createNoteHere call
sym src/lib/features/rail-shell/lens.logic.ts:656 fn viewNavigatorRows(tree: FileTreeNode[], entriesByPath: Map<string, NoteEntryV2>): TypeNavigatorRow[] L24 | The Views part of the Types navigator: every `.view` file in the tree but the hidden ones (`_visible: false`), labelled by its `_sidebar_label`, marked to open…
by src/lib/features/rail-shell/lens.logic.ts:viewNavigatorRows <- src/lib/app/AppShell.svelte:128 in viewRows=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:686 fn viewLabels(tree: FileTreeNode[], entriesByPath: Map<string, NoteEntryV2>, exceptPath?: string): string[] L5 | The label of every `.view` in the tree, hidden ones included, except the one at `exceptPath`: the names New view refuses, and Edit view with the edited view's …
by src/lib/features/rail-shell/lens.logic.ts:viewLabels <- src/lib/features/rail-shell/FilesNavigator.svelte:411 in (markup) markup
by src/lib/features/rail-shell/lens.logic.ts:viewLabels <- src/lib/features/rail-shell/TypesNavigator.svelte:476 in (markup) markup +1
sym src/lib/features/rail-shell/lens.logic.ts:693 interface ViewQueryOverrides L8 | The Sort and Filter toolbar state that replaces a view's saved filters and sort.
sym src/lib/features/rail-shell/lens.logic.ts:703 type ViewRowContext L1 | What a `.view`'s row set reads besides the matched records.
sym src/lib/features/rail-shell/lens.logic.ts:717 fn viewRowSet<T extends { path: string }>(records: readonly T[], view: CollectionViewDef, viewPath: string, ctx: ViewRowContext, def… L18 | The one row set of a `.view` view, which the editor (through the collection row-set port), the rail's view lens and the navigator count all use.
by src/lib/features/rail-shell/lens.logic.ts:viewRowSet <- src/lib/app/boot.ts:68 in registerAppPorts call
sym src/lib/features/rail-shell/lens.logic.ts:737 type BlockRowContext L1 | What an inline `collection` block's row set reads besides the matched records.
sym src/lib/features/rail-shell/lens.logic.ts:749 fn blockRowSet<T extends Pick<PropertyIndexRecord, 'path' | 'properties'>>(records: readonly T[], view: CollectionViewDef, definition… L15 | The row set of an inline ` ```collection ` block: `viewRowSet`'s rule read from the records alone. Takes the records the block's query matched (filters and the…
by src/lib/features/rail-shell/lens.logic.ts:blockRowSet <- src/lib/app/boot.ts:63 in registerAppPorts call
sym src/lib/features/rail-shell/lens.logic.ts:775 interface ViewQueryResult L16 | A view's query, run.
sym src/lib/features/rail-shell/lens.logic.ts:798 fn queryViewLens(definition: CollectionDefinition, overrides: ViewQueryOverrides | null, propertyIndex: Map<string, PropertyIndexRecord… L24 | Runs the view the rail runs (`railViewIndex`: the one `_rail_view` names, else the first) of a parsed `.view` over the property index, with the toolbar overrid…
by src/lib/features/rail-shell/lens.logic.ts:queryViewLens <- src/lib/features/rail-shell/RailNoteList.svelte:279 in loadView call
by src/lib/features/rail-shell/lens.logic.ts:queryViewLens <- src/lib/features/rail-shell/view-lens.service.ts:36 in countViewNotes call
sym src/lib/features/rail-shell/lens.logic.ts:824 type ViewLoad L1 | Where a view lens's load got to: a status that has no list, or its query run.
by src/lib/features/rail-shell/lens.logic.ts:ViewLoad <- src/lib/features/rail-shell/view-lens.service.ts:5 in (module) import
sym src/lib/features/rail-shell/lens.logic.ts:827 fn viewLoadFromQuery(result: ViewQueryResult | null): ViewLoad L3 | The load of a query run: `ran`, or an error when the definition has no view to run (`queryViewLens` gave null).
by src/lib/features/rail-shell/lens.logic.ts:viewLoadFromQuery <- src/lib/features/rail-shell/RailNoteList.svelte:286 in loadView call
by src/lib/features/rail-shell/lens.logic.ts:viewLoadFromQuery <- src/lib/features/rail-shell/view-lens.service.ts:36 in countViewNotes call
sym src/lib/features/rail-shell/lens.logic.ts:832 fn viewReadError(err: unknown): ViewLoad L3 | The load of a `.view` whose read threw.
by src/lib/features/rail-shell/lens.logic.ts:viewReadError <- src/lib/features/rail-shell/RailNoteList.svelte:291 in loadView call
by src/lib/features/rail-shell/lens.logic.ts:viewReadError <- src/lib/features/rail-shell/view-lens.service.ts:40 in countViewNotes call
sym src/lib/features/rail-shell/lens.logic.ts:845 fn resolveViewLens(viewPath: string, load: ViewLoad, ctx: LensContext): ResolvedLens L15 | Turns a view's load into the note list: the view's label, its filters in words (ending in `view "<name>"` when `_rail_view` named the view that ran, else in "f…
by src/lib/features/rail-shell/lens.logic.ts:resolveViewLens <- src/lib/features/rail-shell/RailNoteList.svelte:188 in resolved=$derived call +5
by src/lib/features/rail-shell/lens.logic.ts:resolveViewLens <- src/lib/features/rail-shell/view-lens.service.ts:42 in countViewNotes call
sym src/lib/features/rail-shell/lens.logic.ts:866 fn describeViewFilters(groups: readonly FilterGroup[], includesArchived = false): string L11 | A view's filter groups in words, e.g. "_type == 'Project' and status == 'active', not archived".
sym src/lib/features/rail-shell/lens.logic.ts:892 fn viewNoteType(groups: readonly FilterGroup[], knownTypes: Iterable<string>): string | null L15 | The type a view's "+ New here" note gets: the value of its one `_type` equality filter, in the casing of the matching known type.
by src/lib/features/rail-shell/lens.logic.ts:viewNoteType <- src/lib/features/rail-shell/RailNoteList.svelte:354 in viewTypeName=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:913 fn fileKind(name: string): FileKind L10 | The kind of a file, from its name's extension (case-insensitive).
sym src/lib/features/rail-shell/lens.logic.ts:941 fn navigatorFolders(nodes: readonly FileTreeNode[] | undefined): FileTreeNode[] L3 | The folders of a tree level the Files navigator shows: directories, hidden ones left out, in tree order.
by src/lib/features/rail-shell/lens.logic.ts:navigatorFolders <- src/lib/features/rail-shell/FilesNavigator.svelte:77 in topFolders=$derived call +1
sym src/lib/features/rail-shell/lens.logic.ts:1011 fn pickedFolderLens(saved: unknown): Lens L3 | The Files navigator's pick saved in `layout.railFolder` as a lens; anything but a non-empty string is the vault root.
by src/lib/features/rail-shell/lens.logic.ts:pickedFolderLens <- src/lib/app/AppShell.svelte:150 in railLens=$derived call
sym src/lib/features/rail-shell/lens.logic.ts:1016 fn parseExpandedFolders(saved: unknown): string[] L3 | The expanded folders saved in `layout.railExpandedFolders`; a hand-edited non-array reads as none, non-strings are dropped.
by src/lib/features/rail-shell/lens.logic.ts:parseExpandedFolders <- src/lib/app/AppShell.svelte:225 in (markup) markup
sym src/lib/features/rail-shell/lens.logic.ts:1029 fn staleFolderPickFix(railItem: unknown, savedPick: unknown, savedExpanded: unknown, tree: readonly FileTreeNode[], vaultPath: string): Pick… L19 | The layout change that drops what the Files navigator saved but the tree no longer holds: a picked folder that is gone clears the pick and, when Files is the a…
by src/lib/features/rail-shell/lens.logic.ts:staleFolderPickFix <- src/lib/app/AppShell.svelte:175 in $effect@161 call
sym src/lib/features/rail-shell/lens.logic.ts:1050 fn toggleExpandedFolder(savedExpanded: unknown, path: string): string[] L4 | The expanded folder list after a chevron click on `path`: added when collapsed, removed when expanded.
by src/lib/features/rail-shell/lens.logic.ts:toggleExpandedFolder <- src/lib/app/AppShell.svelte:229 in (markup) markup
sym src/lib/features/rail-shell/lens.logic.ts:1062 fn followTypesPickPathChange(saved: unknown, from: string, to: string | null): Pick<Partial<LayoutSettings>, 'railTypesLens'> | null L11 | The layout change that makes a saved Types pick follow a path change: a view pick whose `.view`, or a folder holding it, was renamed or moved takes the new pat…
by src/lib/features/rail-shell/lens.logic.ts:followTypesPickPathChange <- src/lib/features/rail-shell/types-navigator.service.ts:17 in registerTypesNavigatorPathChangeConsumer call
sym src/lib/features/rail-shell/lens.logic.ts:1081 fn followRailPinPathChange(railItem: unknown, from: string, to: string | null): Pick<Partial<LayoutSettings>, 'railItem'> | null L7 | The layout change that makes the rail follow a path change: a pinned view the rail shows whose `.view`, or a folder holding it, was renamed or moved stays on t…
by src/lib/features/rail-shell/lens.logic.ts:followRailPinPathChange <- src/lib/features/rail-shell/types-navigator.service.ts:17 in registerTypesNavigatorPathChangeConsumer call
sym src/lib/features/rail-shell/lens.logic.ts:1095 fn followFolderPathChange(savedPick: unknown, savedExpanded: unknown, from: string, to: string | null): Pick<Partial<LayoutSettings>, 'railFolde… L17 | The layout change that makes the Files navigator follow a path change: a renamed or moved folder re-roots the pick and every expanded path at or under `from`; …
by src/lib/features/rail-shell/lens.logic.ts:followFolderPathChange <- src/lib/features/rail-shell/files-navigator.service.ts:16 in registerFilesNavigatorPathChangeConsumer call
## locals
local src/lib/features/rail-shell/lens.logic.ts:80 fn todayLensDay(lens: Lens): string | null L3
local src/lib/features/rail-shell/lens.logic.ts:159 fn isPinKey(item: unknown): item is string L3
local src/lib/features/rail-shell/lens.logic.ts:164 fn pinLens(key: string): Lens | null L9
local src/lib/features/rail-shell/lens.logic.ts:272 fn vaultFolder(path: string, vaultPath: string | null): string L8
local src/lib/features/rail-shell/lens.logic.ts:281 fn toLensNote(entry: NoteEntryV2, vaultPath: string | null): LensNote L15
local src/lib/features/rail-shell/lens.logic.ts:316 fn resolveBuiltIn(lens: BuiltInLens, ctx: LensContext): ResolvedLens L3
local src/lib/features/rail-shell/lens.logic.ts:339 fn resolveTodayLens(lens: Lens, ctx: LensContext): ResolvedLens L6
local src/lib/features/rail-shell/lens.logic.ts:354 fn resolveTypeLens(lens: Lens, ctx: LensContext, archived: ArchivedFilter): ResolvedLens | null L23
local src/lib/features/rail-shell/lens.logic.ts:392 fn resolveNeighbourhoodLens(lens: Lens, ctx: LensContext): ResolvedLens | null L32
local src/lib/features/rail-shell/lens.logic.ts:770 fn queryCitesArchived(definition: CollectionDefinition, view: CollectionViewDef): boolean L3
local src/lib/features/rail-shell/lens.logic.ts:882 fn isTypeFilterKey(property: string): boolean L3
local src/lib/features/rail-shell/lens.logic.ts:936 fn isHiddenName(name: string): boolean L3
local src/lib/features/rail-shell/lens.logic.ts:946 fn findNavigatorFolder(nodes: readonly FileTreeNode[], path: string): FileTreeNode | null L7
local src/lib/features/rail-shell/lens.logic.ts:955 fn vaultRoot(vaultPath: string): string L3
local src/lib/features/rail-shell/lens.logic.ts:960 fn fileToLensNote(node: FileTreeNode, entry: NoteEntryV2 | undefined, vaultPath: string): LensNote L19
local src/lib/features/rail-shell/lens.logic.ts:986 fn resolveFolderLens(lens: Lens, ctx: LensContext): ResolvedLens | null L23
## calls
more calls codemap/files/src/lib/features/rail-shell/lens.logic.ts.calls.md
