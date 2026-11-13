# file card src/lib/features/type-definitions/type-sidebar.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/type-sidebar.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/type-definitions/type-sidebar.logic.ts logic L649 module src/lib/features/type-definitions in18 t9
## imports
imp src/lib/features/type-definitions/type-sidebar.logic.ts:3 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/type-sidebar.logic.ts:4 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/type-definitions/type-sidebar.logic.ts:5 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter
imp src/lib/features/type-definitions/type-sidebar.logic.ts:6 -> src/lib/features/collection/yaml-parser.ts viewIndexByName
imp src/lib/features/type-definitions/type-sidebar.logic.ts:7 -> src/lib/features/type-definitions/type-definitions.logic.ts type:TypeMetadata
imp src/lib/features/type-definitions/type-sidebar.logic.ts:8 -> src/lib/features/type-definitions/type-definitions.logic.ts getTypeMetadataFallback
imp src/lib/features/type-definitions/type-sidebar.logic.ts:9 -> src/lib/core/filesystem/fs.logic.ts isViewFile,naturalCompare
imp src/lib/features/type-definitions/type-sidebar.logic.ts:10 -> src/lib/features/file-icons/file-icons.logic.ts extractViewIcon,parseIconValuePermissive
imp src/lib/features/type-definitions/type-sidebar.logic.ts:30 -> src/lib/types/vault-v2.types.ts type:FrontmatterValue
## imported-by
imp src/lib/app/AppShell.svelte:9 -> src/lib/features/type-definitions/type-sidebar.logic.ts collectViewFiles,excludeSystemFolder
imp src/lib/app/boot.ts:15 -> src/lib/features/type-definitions/type-sidebar.logic.ts effectiveViewSortLabel
imp src/lib/app/commands.ts:21 -> src/lib/features/type-definitions/type-sidebar.logic.ts collectViewFiles,getViewLabel,getViewOpensInEditor,getViewVisible
imp src/lib/app/editor-host.ts:31 -> src/lib/features/type-definitions/type-sidebar.logic.ts getViewOpensInEditor
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:17 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder
imp src/lib/features/note-list/NoteRow.svelte:12 -> src/lib/features/type-definitions/type-sidebar.logic.ts splitPropertyIntoPills
imp src/lib/features/note-list/NoteRowMenu.svelte:27 -> src/lib/features/type-definitions/type-sidebar.logic.ts getViewVisible
imp src/lib/features/rail-shell/Rail.svelte:24 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder
imp src/lib/features/rail-shell/RailArchivedMenu.svelte:5 -> src/lib/features/type-definitions/type-sidebar.logic.ts type:ArchivedFilter
imp src/lib/features/rail-shell/RailNoteList.svelte:44 -> src/lib/features/type-definitions/type-sidebar.logic.ts effectiveViewSortLabel,getViewListProperties,getViewSort
imp src/lib/features/rail-shell/RailNoteList.svelte:58 -> src/lib/features/type-definitions/type-sidebar.logic.ts type:ArchivedFilter
imp src/lib/features/rail-shell/lens.logic.ts:20 -> src/lib/features/type-definitions/type-sidebar.logic.ts buildTypeSections,collectViewFiles,excludeSystemFolder,formatRelativeTime,getNotesForSelection,getNotesForViewPaths,getViewGroup,getViewLabel,getViewOpensInEditor,getViewOrder,getViewSort,getViewVisible,ignoredKeyNotes,isListableNote,sortViewFiles,type:ArchivedFilter,type:TypeSidebarSelection
imp src/lib/features/rail-shell/list-search.logic.ts:1 -> src/lib/features/type-definitions/type-sidebar.logic.ts splitPropertyIntoPills
imp src/lib/features/rail-shell/view-lens.service.ts:3 -> src/lib/features/type-definitions/type-sidebar.logic.ts railViewNameNote
imp src/lib/features/type-definitions/inbox-workflow.logic.ts:2 -> src/lib/features/type-definitions/type-sidebar.logic.ts isListableNote
imp src/lib/features/type-definitions/type-definitions.service.ts:20 -> src/lib/features/type-definitions/type-sidebar.logic.ts buildNewViewYaml,showViewInViewsYaml,updateViewColorsYaml,updateViewIconYaml,updateViewListPropertiesYaml,updateViewRailYaml
imp src/lib/features/type-definitions/type-definitions.store.svelte.ts:4 -> src/lib/features/type-definitions/type-sidebar.logic.ts type:TypeSidebarSelection
imp src/lib/plugins/calendar/day-lens.logic.ts:4 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder,isListableNote
imp src/lib/plugins/queryjs/kb-api.ts:15 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder,isListableNote
## reach
in2 src/lib/features/type-definitions/type-sidebar.logic.ts 38 files in 15 modules: src/lib/features/event-calendar(10) src/lib/features/rail-shell(8) src/lib/app(5) src/lib/plugins/calendar(2) src/lib/plugins/mods(2) +10 modules: q impact src/lib/features/type-definitions/type-sidebar.logic.ts --depth 2
out2 src/lib/features/type-definitions/type-sidebar.logic.ts 5 files in 5 modules: src/lib/contracts(1) src/lib/core/frontmatter(1) src/lib/core/settings(1) src/lib/features/file-icons(1) src/lib/utils(1)
## tests
test src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts mirror
test src/tests/help/type-definitions-views.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts
test src/tests/lib/features/collection/yaml-parser.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts
test src/tests/lib/features/type-definitions/create-view-folder.service.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts
test src/tests/lib/features/type-definitions/rewrite-view-file.service.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts
test src/tests/lib/features/type-definitions/type-note-list.logic.test.ts imports src/lib/features/type-definitions/type-sidebar.logic.ts
## symbols
sym src/lib/features/type-definitions/type-sidebar.logic.ts:13 interface TypeSection L8 | A section in the type-grouped sidebar.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:23 interface TypeSidebarNote L9 | A note entry in the type sidebar.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:34 type SidebarFilter L1 | Filter mode for the type sidebar.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:40 type ArchivedFilter L1 | Which notes a type or Untyped list shows by lifecycle: the active ones (not archived), all of them, or only the archived ones.
by src/lib/features/type-definitions/type-sidebar.logic.ts:ArchivedFilter <- src/lib/features/rail-shell/RailArchivedMenu.svelte:5 in (script) import
by src/lib/features/type-definitions/type-sidebar.logic.ts:ArchivedFilter <- src/lib/features/rail-shell/RailNoteList.svelte:58 in (script) import
by src/lib/features/type-definitions/type-sidebar.logic.ts:ArchivedFilter <- src/lib/features/rail-shell/lens.logic.ts:36 in (module) import
sym src/lib/features/type-definitions/type-sidebar.logic.ts:48 type NavItemId L1 | Identifiers for the top nav items in the type sidebar.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:51 type TypeSidebarSelection L5 | What is currently selected in the type sidebar.
by src/lib/features/type-definitions/type-sidebar.logic.ts:TypeSidebarSelection <- src/lib/features/rail-shell/lens.logic.ts:37 in (module) import
by src/lib/features/type-definitions/type-sidebar.logic.ts:TypeSidebarSelection <- src/lib/features/type-definitions/type-definitions.store.svelte.ts:4 in (module) import
sym src/lib/features/type-definitions/type-sidebar.logic.ts:65 fn excludeSystemFolder<T extends { path: string }>(entries: T[], vaultPath: string | null | undefined, systemFolder: string): T[] L11 | Returns a new array containing only entries whose `path` is outside the configured system folder.
by src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder <- src/lib/app/AppShell.svelte:69 in $effect@66 call
by src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder <- src/lib/features/event-calendar/event-calendar-event.logic.ts:246 in eventsFromEntries call
by src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder <- src/lib/features/rail-shell/Rail.svelte:62 in inboxCount=$derived call
by src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder <- src/lib/features/rail-shell/lens.logic.ts:327 in listEntries call +4
by src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder <- src/lib/plugins/calendar/day-lens.logic.ts:48 in noteDateCounts call
by src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder <- src/lib/plugins/queryjs/kb-api.ts:473 in KBAPI.ensureCache call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:85 fn isListableNote(entry: NoteEntryV2): boolean L3 | True when an entry may be listed as a note: not a `.view` file and not a type definition (`_type: Type`).
by src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote <- src/lib/features/rail-shell/lens.logic.ts:312 in BUILT_IN_LENSES call +4
by src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote <- src/lib/features/type-definitions/inbox-workflow.logic.ts:11 in isInboxEntry call
by src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote <- src/lib/plugins/calendar/day-lens.logic.ts:41 in resolveDayLens call +1
by src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote <- src/lib/plugins/queryjs/kb-api.ts:476 in KBAPI.ensureCache call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:95 fn getNotesForSelection(entries: NoteEntryV2[], selection: TypeSidebarSelection, archived: ArchivedFilter = 'active'): TypeSidebarNote[] L26 | Returns the notes matching the current sidebar selection, most-recently-modified first, with `_order` pins on top.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getNotesForSelection <- src/lib/features/rail-shell/lens.logic.ts:371 in resolveTypeLens call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:128 fn getNotesForViewPaths(entries: NoteEntryV2[], matchingPaths: ReadonlySet<string>, sort: string | null = 'modified', includeArchived = false)… L20 | Converts the entries matching a set of paths into sidebar notes, archived ones left out unless `includeArchived`.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getNotesForViewPaths <- src/lib/features/rail-shell/lens.logic.ts:729 in viewRowSet call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:180 fn buildTypeSections(entries: NoteEntryV2[], typeMetadataMap: Map<string, TypeMetadata>, filter: SidebarFilter): { sections: TypeSection[];… L44 | Builds type-grouped sections from vault entries.
by src/lib/features/type-definitions/type-sidebar.logic.ts:buildTypeSections <- src/lib/features/rail-shell/lens.logic.ts:497 in typeNavigatorRows call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:260 fn formatNoteDate(epochSeconds: number): string L7 | Formats an epoch-seconds timestamp as a short date.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:269 fn formatRelativeTime(epochSeconds: number, nowMs?: number): string L12 | Formats an epoch-seconds timestamp as relative time (e.g. "9m ago").
by src/lib/features/type-definitions/type-sidebar.logic.ts:formatRelativeTime <- src/lib/features/rail-shell/lens.logic.ts:259 in noteSubtitle call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:283 fn formatPropertyValue(value: unknown): string L7 | Formats a frontmatter value for display.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:291 interface PropertyPill L4
sym src/lib/features/type-definitions/type-sidebar.logic.ts:297 fn splitPropertyIntoPills(value: unknown): PropertyPill[] L22 | Splits a property value into pills, extracting wikilinks as separate entries.
by src/lib/features/type-definitions/type-sidebar.logic.ts:splitPropertyIntoPills <- src/lib/features/note-list/NoteRow.svelte:108 in (markup) markup
by src/lib/features/type-definitions/type-sidebar.logic.ts:splitPropertyIntoPills <- src/lib/features/rail-shell/list-search.logic.ts:28 in noteMatchesListQuery call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:321 interface ViewFileEntry L6 | A .view file entry for sidebar rendering.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:329 fn collectViewFiles(tree: FileTreeNode[]): ViewFileEntry[] L6 | Collects .view files from the file tree, sorted by name in natural order ("Week 2" before "Week 10").
by src/lib/features/type-definitions/type-sidebar.logic.ts:collectViewFiles <- src/lib/app/AppShell.svelte:123 in viewFilesKey=$derived call +1
by src/lib/features/type-definitions/type-sidebar.logic.ts:collectViewFiles <- src/lib/app/commands.ts:100 in openViewCommands call
by src/lib/features/type-definitions/type-sidebar.logic.ts:collectViewFiles <- src/lib/features/rail-shell/lens.logic.ts:658 in viewNavigatorRows call +1
sym src/lib/features/type-definitions/type-sidebar.logic.ts:350 fn getViewLabel(entry: NoteEntryV2 | undefined, fallbackName: string): string L4 | Extracts _sidebar_label from a view entry's frontmatter.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewLabel <- src/lib/app/commands.ts:105 in openViewCommands call
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewLabel <- src/lib/features/rail-shell/lens.logic.ts:226 in pinnedRailItems call +3
sym src/lib/features/type-definitions/type-sidebar.logic.ts:364 fn buildNewViewYaml(name: string, filters?: CollectionFilter | string): string L4 | Builds the YAML of a new `.view`: the name as its label and as the name of its one table view, sorted by title.
by src/lib/features/type-definitions/type-sidebar.logic.ts:buildNewViewYaml <- src/lib/features/type-definitions/type-definitions.service.ts:276 in createView call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:373 fn getViewOpensInEditor(entry: NoteEntryV2 | undefined): boolean L3 | Whether a click on the view's row opens the `.view` in the editor instead of picking it as the note list's lens.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewOpensInEditor <- src/lib/app/commands.ts:102 in openViewCommands call
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewOpensInEditor <- src/lib/app/editor-host.ts:187 in appEditorHost.openView call
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewOpensInEditor <- src/lib/features/rail-shell/lens.logic.ts:229 in pinnedRailItems call +1
sym src/lib/features/type-definitions/type-sidebar.logic.ts:381 fn getViewGroup(entry: NoteEntryV2 | undefined): string | null L5 | The subheading the view is listed under in Views: its trimmed `_group`.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewGroup <- src/lib/features/rail-shell/lens.logic.ts:669 in viewNavigatorRows call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:391 fn getViewVisible(entry: NoteEntryV2 | undefined): boolean L3 | Whether Views lists the view.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewVisible <- src/lib/app/commands.ts:100 in openViewCommands call
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewVisible <- src/lib/features/note-list/NoteRowMenu.svelte:90 in isHiddenView call
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewVisible <- src/lib/features/rail-shell/lens.logic.ts:660 in viewNavigatorRows call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:396 interface ReservedKeyRule L10 | A reserved frontmatter key and the value shape its reader uses; any other value is ignored.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:408 const VIEW_SORTS: readonly string[] L1 | The `_sort` values a view's list orders by (`sortNotes`); any other value is ignored.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:411 fn isViewSort(value: unknown): value is string L3 | True for a `_sort` value a view's list orders by.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:421 const RESERVED_KEY_RULES: readonly ReservedKeyRule[] L17 | The reserved keys whose ignored values are reported.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:450 fn railViewNameNote(definition: Pick<CollectionDefinition, 'views' | 'railView' | 'railViewIgnored'>): string | null L5 | The note for a parsed `.view` whose `_rail_view` picks no view: a name none of its views has, or a value that is not text (which the entry can miss, as Rust pr…
by src/lib/features/type-definitions/type-sidebar.logic.ts:railViewNameNote <- src/lib/features/rail-shell/view-lens.service.ts:34 in countViewNotes call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:457 fn ignoredKeyNotes(frontmatter: Record<string, unknown>): string[] L7 | One note per reserved key the frontmatter sets to a value its reader ignores, e.g. `_order: "1"`.
by src/lib/features/type-definitions/type-sidebar.logic.ts:ignoredKeyNotes <- src/lib/features/rail-shell/lens.logic.ts:508 in typeNavigatorRows call +1
sym src/lib/features/type-definitions/type-sidebar.logic.ts:466 fn getViewOrder(entry: NoteEntryV2 | undefined): number L4 | Extracts _order from a view entry's frontmatter.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewOrder <- src/lib/features/rail-shell/lens.logic.ts:230 in pinnedRailItems call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:475 fn getViewSort(entry: NoteEntryV2 | undefined): string L4 | Extracts _sort from a view entry's frontmatter.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewSort <- src/lib/features/rail-shell/RailNoteList.svelte:560 in sortMenuConfig=$derived call
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewSort <- src/lib/features/rail-shell/lens.logic.ts:727 in viewRowSet call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:484 fn effectiveViewSortLabel(entry: NoteEntryV2 | undefined): string L4 | The Sort panel's text for a view list that no sort of the view's own orders: its `_sort`, or the default when it has none or one that is ignored.
by src/lib/features/type-definitions/type-sidebar.logic.ts:effectiveViewSortLabel <- src/lib/app/boot.ts:80 in registerAppPorts call
by src/lib/features/type-definitions/type-sidebar.logic.ts:effectiveViewSortLabel <- src/lib/features/rail-shell/RailNoteList.svelte:767 in (markup) markup
sym src/lib/features/type-definitions/type-sidebar.logic.ts:490 fn getViewListProperties(entry: NoteEntryV2 | undefined): string[] L5 | Extracts _list_properties_display from a view entry's frontmatter.
by src/lib/features/type-definitions/type-sidebar.logic.ts:getViewListProperties <- src/lib/features/rail-shell/RailNoteList.svelte:385 in savedProperties=$derived call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:502 fn sortViewFiles(views: ViewFileEntry[], entriesByPath: Map<string, NoteEntryV2>): ViewFileEntry[] L12 | Sorts view files by _order from the entries index, then by the label the row shows (`getViewLabel`) in natural order, then by path.
by src/lib/features/type-definitions/type-sidebar.logic.ts:sortViewFiles <- src/lib/features/rail-shell/lens.logic.ts:658 in viewNavigatorRows call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:533 fn updateViewIconYaml(yamlString: string, icon?: string, color?: string, titleColor?: string): string L24 | Updates _icon, _color, and _title_color in a .view YAML string, dropping their aliases, so an absent value removes the key in either spelling.
by src/lib/features/type-definitions/type-sidebar.logic.ts:updateViewIconYaml <- src/lib/features/type-definitions/type-definitions.service.ts:450 in updateViewIcon call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:566 fn updateViewColorsYaml(yamlString: string, color?: string, titleColor?: string): string L18 | Updates the colors in a .view YAML string, leaving the icon keys as they are: the picker saves colors alone also when `extractViewIcon` rejected the `_icon` va…
by src/lib/features/type-definitions/type-sidebar.logic.ts:updateViewColorsYaml <- src/lib/features/type-definitions/type-definitions.service.ts:455 in updateViewIconColors call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:592 fn updateViewRailYaml(yamlString: string, on: boolean): string L13 | Pins a `.view` to the rail (`_rail: true`) or unpins it (the key deleted, whatever its value).
by src/lib/features/type-definitions/type-sidebar.logic.ts:updateViewRailYaml <- src/lib/features/type-definitions/type-definitions.service.ts:467 in setViewRailPin call
sym src/lib/features/type-definitions/type-sidebar.logic.ts:614 fn showViewInViewsYaml(yamlString: string): string L14 | Shows a hidden `.view` in Views: deletes `_visible` (and its alias `visible`, which Rust folds onto it) and `_open_in_editor`.
by src/lib/features/type-definitions/type-sidebar.logic.ts:showViewInViewsYaml <- src/lib/features/type-definitions/type-definitions.service.ts:477 in showViewInViews ref
sym src/lib/features/type-definitions/type-sidebar.logic.ts:635 fn updateViewListPropertiesYaml(yamlString: string, properties: readonly string[]): string L15 | Sets the property columns the rail note list shows (`_list_properties_display`, in display order), or deletes the key for an empty list.
by src/lib/features/type-definitions/type-sidebar.logic.ts:updateViewListPropertiesYaml <- src/lib/features/type-definitions/type-definitions.service.ts:486 in updateViewListProperties call
## locals
local src/lib/features/type-definitions/type-sidebar.logic.ts:42 fn passesArchivedFilter(entry: NoteEntryV2, filter: ArchivedFilter): boolean L4
local src/lib/features/type-definitions/type-sidebar.logic.ts:149 fn toSidebarNote(entry: NoteEntryV2): TypeSidebarNote L15
local src/lib/features/type-definitions/type-sidebar.logic.ts:166 fn filterByNavItem(entries: NoteEntryV2[], id: NavItemId): NoteEntryV2[] L12
local src/lib/features/type-definitions/type-sidebar.logic.ts:226 fn sortNotes(notes: TypeSidebarNote[], sort: string): void L4
local src/lib/features/type-definitions/type-sidebar.logic.ts:231 fn buildSecondaryComparator(sort: string): (a: TypeSidebarNote, b: TypeSidebarNote) => number L15
local src/lib/features/type-definitions/type-sidebar.logic.ts:248 fn applyFilter(entries: NoteEntryV2[], filter: SidebarFilter): NoteEntryV2[] L10
local src/lib/features/type-definitions/type-sidebar.logic.ts:336 fn collectViewFilesWalk(nodes: FileTreeNode[], out: ViewFileEntry[]): void L12
local src/lib/features/type-definitions/type-sidebar.logic.ts:440 fn railViewMissNote(name: string): string L3
local src/lib/features/type-definitions/type-sidebar.logic.ts:516 fn setViewIconKey(raw: Record<string, unknown>, key: string, alias: string, value: string | undefined): void L8
## calls
call src/lib/features/type-definitions/type-sidebar.logic.ts:86 in isListableNote -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/type-definitions/type-sidebar.logic.ts:104 in getNotesForSelection -> src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote call +1
call src/lib/features/type-definitions/type-sidebar.logic.ts:104 in getNotesForSelection -> src/lib/features/type-definitions/type-sidebar.logic.ts:passesArchivedFilter call +1
call src/lib/features/type-definitions/type-sidebar.logic.ts:110 in getNotesForSelection -> src/lib/features/type-definitions/type-sidebar.logic.ts:filterByNavItem call
call src/lib/features/type-definitions/type-sidebar.logic.ts:117 in getNotesForSelection -> src/lib/features/type-definitions/type-sidebar.logic.ts:toSidebarNote ref
call src/lib/features/type-definitions/type-sidebar.logic.ts:118 in getNotesForSelection -> src/lib/features/type-definitions/type-sidebar.logic.ts:sortNotes call
call src/lib/features/type-definitions/type-sidebar.logic.ts:139 in getNotesForViewPaths -> src/lib/features/type-definitions/type-sidebar.logic.ts:toSidebarNote call +1
call src/lib/features/type-definitions/type-sidebar.logic.ts:145 in getNotesForViewPaths -> src/lib/features/type-definitions/type-sidebar.logic.ts:sortNotes call
call src/lib/features/type-definitions/type-sidebar.logic.ts:185 in buildTypeSections -> src/lib/features/type-definitions/type-sidebar.logic.ts:applyFilter call
call src/lib/features/type-definitions/type-sidebar.logic.ts:190 in buildTypeSections -> src/lib/features/type-definitions/type-sidebar.logic.ts:isListableNote call
call src/lib/features/type-definitions/type-sidebar.logic.ts:191 in buildTypeSections -> src/lib/features/type-definitions/type-sidebar.logic.ts:toSidebarNote call
call src/lib/features/type-definitions/type-sidebar.logic.ts:207 in buildTypeSections -> src/lib/features/type-definitions/type-definitions.logic.ts:getTypeMetadataFallback call
call src/lib/features/type-definitions/type-sidebar.logic.ts:209 in buildTypeSections -> src/lib/features/type-definitions/type-sidebar.logic.ts:sortNotes call
call src/lib/features/type-definitions/type-sidebar.logic.ts:227 in sortNotes -> src/lib/features/type-definitions/type-sidebar.logic.ts:buildSecondaryComparator call
call src/lib/features/type-definitions/type-sidebar.logic.ts:279 in formatRelativeTime -> src/lib/features/type-definitions/type-sidebar.logic.ts:formatNoteDate call
call src/lib/features/type-definitions/type-sidebar.logic.ts:287 in formatPropertyValue -> src/lib/features/type-definitions/type-sidebar.logic.ts:formatPropertyValue ref
call src/lib/features/type-definitions/type-sidebar.logic.ts:299 in splitPropertyIntoPills -> src/lib/features/type-definitions/type-sidebar.logic.ts:splitPropertyIntoPills ref
call src/lib/features/type-definitions/type-sidebar.logic.ts:300 in splitPropertyIntoPills -> src/lib/features/type-definitions/type-sidebar.logic.ts:formatPropertyValue call
call src/lib/features/type-definitions/type-sidebar.logic.ts:331 in collectViewFiles -> src/lib/features/type-definitions/type-sidebar.logic.ts:collectViewFilesWalk call
call src/lib/features/type-definitions/type-sidebar.logic.ts:332 in collectViewFiles -> src/lib/core/filesystem/fs.logic.ts:naturalCompare call
call src/lib/features/type-definitions/type-sidebar.logic.ts:339 in collectViewFilesWalk -> src/lib/features/type-definitions/type-sidebar.logic.ts:collectViewFilesWalk call
call src/lib/features/type-definitions/type-sidebar.logic.ts:340 in collectViewFilesWalk -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/features/type-definitions/type-sidebar.logic.ts:424 in RESERVED_KEY_RULES -> src/lib/features/type-definitions/type-sidebar.logic.ts:isViewSort ref
call src/lib/features/type-definitions/type-sidebar.logic.ts:435 in RESERVED_KEY_RULES -> src/lib/features/type-definitions/type-sidebar.logic.ts:railViewMissNote call
call src/lib/features/type-definitions/type-sidebar.logic.ts:451 in railViewNameNote -> src/lib/features/type-definitions/type-sidebar.logic.ts:ignoredKeyNotes call
call src/lib/features/type-definitions/type-sidebar.logic.ts:453 in railViewNameNote -> src/lib/features/collection/yaml-parser.ts:viewIndexByName call
call src/lib/features/type-definitions/type-sidebar.logic.ts:453 in railViewNameNote -> src/lib/features/type-definitions/type-sidebar.logic.ts:railViewMissNote call
call src/lib/features/type-definitions/type-sidebar.logic.ts:477 in getViewSort -> src/lib/features/type-definitions/type-sidebar.logic.ts:isViewSort call
call src/lib/features/type-definitions/type-sidebar.logic.ts:486 in effectiveViewSortLabel -> src/lib/features/type-definitions/type-sidebar.logic.ts:isViewSort call
call src/lib/features/type-definitions/type-sidebar.logic.ts:506 in sortViewFiles -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewOrder call +1
call src/lib/features/type-definitions/type-sidebar.logic.ts:509 in sortViewFiles -> src/lib/core/filesystem/fs.logic.ts:naturalCompare call
call src/lib/features/type-definitions/type-sidebar.logic.ts:509 in sortViewFiles -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewLabel call +1
call src/lib/features/type-definitions/type-sidebar.logic.ts:534 in updateViewIconYaml -> src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive call
call src/lib/features/type-definitions/type-sidebar.logic.ts:536 in updateViewIconYaml -> src/lib/features/file-icons/file-icons.logic.ts:extractViewIcon call
call src/lib/features/type-definitions/type-sidebar.logic.ts:552 in updateViewIconYaml -> src/lib/features/type-definitions/type-sidebar.logic.ts:setViewIconKey call +2
call src/lib/features/type-definitions/type-sidebar.logic.ts:576 in updateViewColorsYaml -> src/lib/features/file-icons/file-icons.logic.ts:extractViewIcon call
call src/lib/features/type-definitions/type-sidebar.logic.ts:580 in updateViewColorsYaml -> src/lib/features/type-definitions/type-sidebar.logic.ts:setViewIconKey call +1
