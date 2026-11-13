# module card src/lib/features/type-definitions
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/type-definitions ' codemap/modules
sections: neighbors, entry files, files, public, stores, effects, debt
module src/lib/features/type-definitions features files 9 in-modules 13 out-modules 12 pub 63/100 ipc 3/0 card ~7.1k
## neighbors
dep src/lib/app -> src/lib/features/type-definitions 14
dep src/lib/features/auto-organize -> src/lib/features/type-definitions 2
dep src/lib/features/dock-badge -> src/lib/features/type-definitions 1
dep src/lib/features/event-calendar -> src/lib/features/type-definitions 6
dep src/lib/features/note-action-bar -> src/lib/features/type-definitions 1
dep src/lib/features/note-list -> src/lib/features/type-definitions 5
dep src/lib/features/properties -> src/lib/features/type-definitions 1
dep src/lib/features/rail-shell -> src/lib/features/type-definitions 25
dep src/lib/features/tasks -> src/lib/features/type-definitions 1
dep src/lib/plugins/calendar -> src/lib/features/type-definitions 2
dep src/lib/plugins/mods -> src/lib/features/type-definitions 2
dep src/lib/plugins/one-on-one -> src/lib/features/type-definitions 1
dep src/lib/plugins/queryjs -> src/lib/features/type-definitions 1
dep src/lib/features/type-definitions -> src/lib/components 6
dep src/lib/features/type-definitions -> src/lib/contracts 1
dep src/lib/features/type-definitions -> src/lib/core/editor 4
dep src/lib/features/type-definitions -> src/lib/core/filesystem 8
dep src/lib/features/type-definitions -> src/lib/core/frontmatter 2
dep src/lib/features/type-definitions -> src/lib/core/note-creator 2
dep src/lib/features/type-definitions -> src/lib/core/settings 2
dep src/lib/features/type-definitions -> src/lib/core/vault 1
dep src/lib/features/type-definitions -> src/lib/features/collection 15
dep src/lib/features/type-definitions -> src/lib/features/file-icons 1
dep src/lib/features/type-definitions -> src/lib/types 5
dep src/lib/features/type-definitions -> src/lib/utils 1
in2 src/lib/features/type-definitions 2 modules: src/routes(4) src/lib/features/search(1)
out2 src/lib/features/type-definitions 2 modules: src/lib/core/markdown-editor(1) src/lib/core/trash(1)
## entry files
entry src/lib/features/type-definitions/type-definitions.store.svelte.ts ext-in19 src/lib/app/AppShell.svelte src/lib/app/boot.ts src/lib/app/commands.ts src/lib/app/editor-host.ts src/lib/app/lifecycle/app-lifecycle.service.ts more importers 14 not shown: src/lib/features/rail-shell(4) src/lib/features/event-calendar(2) src/lib/app(1) +7 modules: q importers src/lib/features/type-definitions/type-definitions.store.svelte.ts
entry src/lib/features/type-definitions/type-sidebar.logic.ts ext-in15 src/lib/app/AppShell.svelte src/lib/app/boot.ts src/lib/app/commands.ts src/lib/app/editor-host.ts src/lib/features/event-calendar/event-calendar-event.logic.ts more importers 10 not shown: src/lib/features/rail-shell(6) src/lib/features/note-list(2) src/lib/plugins/calendar(1) +1 modules: q importers src/lib/features/type-definitions/type-sidebar.logic.ts
entry src/lib/features/type-definitions/type-definitions.service.ts ext-in9 src/lib/app/EditorView.svelte src/lib/app/tauri-listeners.service.ts src/lib/features/event-calendar/EventCalendarSection.svelte src/lib/features/event-calendar/event-calendar.service.ts src/lib/features/note-list/NoteRowMenu.svelte more importers 4 not shown: src/lib/features/rail-shell(3) src/lib/plugins/mods(1): q importers src/lib/features/type-definitions/type-definitions.service.ts
entry src/lib/features/type-definitions/type-definitions.logic.ts ext-in5 src/lib/features/auto-organize/type-lifecycle-rules.ts src/lib/features/event-calendar/EventCalendarSection.svelte src/lib/features/rail-shell/TypesNavigator.svelte src/lib/features/rail-shell/lens.logic.ts src/lib/features/rail-shell/rail-shell.types.ts
entry src/lib/features/type-definitions/inbox-workflow.logic.ts ext-in4 src/lib/features/dock-badge/dock-badge.logic.ts src/lib/features/rail-shell/Rail.svelte src/lib/features/rail-shell/lens.logic.ts src/lib/features/tasks/task-query.logic.ts
entry src/lib/features/type-definitions/view-parse-cache.ts ext-in4 src/lib/app/boot.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/features/rail-shell/RailNoteList.svelte src/lib/features/rail-shell/view-lens.service.ts
entry src/lib/features/type-definitions/type-note-list.logic.ts ext-in3 src/lib/features/note-list/NoteRowMenu.svelte src/lib/features/rail-shell/RailNoteList.svelte src/lib/features/rail-shell/lens.logic.ts
entry src/lib/features/type-definitions/ViewDialog.svelte ext-in2 src/lib/features/rail-shell/FilesNavigator.svelte src/lib/features/rail-shell/TypesNavigator.svelte
entry src/lib/features/type-definitions/TypeNameDialog.svelte ext-in1 src/lib/features/rail-shell/TypesNavigator.svelte
## files
file src/lib/features/type-definitions/TypeNameDialog.svelte component L76 module src/lib/features/type-definitions in1 t0
file src/lib/features/type-definitions/ViewDialog.svelte component L221 module src/lib/features/type-definitions in2 t1
file src/lib/features/type-definitions/inbox-workflow.logic.ts logic L24 module src/lib/features/type-definitions in4 t2
file src/lib/features/type-definitions/type-definitions.logic.ts logic L275 module src/lib/features/type-definitions in9 t21
file src/lib/features/type-definitions/type-definitions.service.ts service L549 module src/lib/features/type-definitions in10 t14
file src/lib/features/type-definitions/type-definitions.store.svelte.ts store L125 module src/lib/features/type-definitions in20 t38
file src/lib/features/type-definitions/type-note-list.logic.ts logic L208 module src/lib/features/type-definitions in4 t6
file src/lib/features/type-definitions/type-sidebar.logic.ts logic L649 module src/lib/features/type-definitions in18 t9
file src/lib/features/type-definitions/view-parse-cache.ts other L100 module src/lib/features/type-definitions in6 t17
## public
sym src/lib/features/type-definitions/TypeNameDialog.svelte:1 component TypeNameDialog props:open=$bindable,title,confirmLabel,initialValue=,description=,validate,normalize,onConfirm L76
sym src/lib/features/type-definitions/ViewDialog.svelte:1 component ViewDialog props:open=$bindable,existingLabels,edit=,oncreated,folder L221
sym src/lib/features/type-definitions/inbox-workflow.logic.ts:10 fn isInboxEntry(entry: NoteEntryV2): boolean L3 | Whether an entry belongs to the lifecycle inbox: not organized, not archived, and a listable note (`isListableNote`: not a Type Definition, not a `.view`).
sym src/lib/features/type-definitions/inbox-workflow.logic.ts:18 fn getInboxCount(entries: NoteEntryV2[]): number L7 | Returns the inbox count: entries that are not organized, not archived, and listable notes (not a Type Definition, not a `.view`).
sym src/lib/features/type-definitions/type-definitions.logic.ts:6 interface TypeMetadata L30 | Display metadata for a type definition.
sym src/lib/features/type-definitions/type-definitions.logic.ts:157 fn typeNameTakenMessage(entryName: string, typeName: string): string L3 | Message for a vault-root entry that holds a type's definition file name but is not that type.
sym src/lib/features/type-definitions/type-definitions.logic.ts:168 fn validateTypeName(name: string, existingTypeNames: string[]): string | null L10 | Validates a candidate type name for creation/rename dialogs.
sym src/lib/features/type-definitions/type-definitions.logic.ts:250 fn buildTypeNoteDir(vaultPath: string, baseFolder: string | null, typeFolder: string | null): string L13 | Builds the absolute directory a new typed note is created in: `vaultPath / baseFolder / typeFolder`, where `baseFolder` is the global setting and `typeFolder` …
sym src/lib/features/type-definitions/type-definitions.logic.ts:265 fn getTypeMetadataFallback(name: string, map: Map<string, TypeMetadata>): TypeMetadata L11 | Returns metadata for a type name, falling back to builtins then defaults.
sym src/lib/features/type-definitions/type-definitions.service.ts:28 fn refreshTypeDefinitions(entries?: NoteEntryV2[]): Promise<void> L7 | Rebuilds the type metadata map.
sym src/lib/features/type-definitions/type-definitions.service.ts:84 fn createNoteOfType(typeName: string): Promise<void> L12 | Creates a new note of a given type, applying the type's template if configured.
sym src/lib/features/type-definitions/type-definitions.service.ts:129 fn createTypedNote(options: CreateTypedNoteOptions): Promise<string> L27 | Creates a note of a type without opening it, through the same folder, dedupe and template owner as createNoteOfType.
sym src/lib/features/type-definitions/type-definitions.service.ts:173 fn createTypeDefinition(typeName: string, opts: { select?: boolean } = {}): Promise<string | null> L32 | Creates a type definition note with default frontmatter.
sym src/lib/features/type-definitions/type-definitions.service.ts:221 fn renameType(oldName: string, newName: string, definitionPath: string): Promise<void> L40 | True rename of a type.
sym src/lib/features/type-definitions/type-definitions.service.ts:301 class ViewWriteError extends Error L13 | Typed failure of `rewriteViewFile`.
sym src/lib/features/type-definitions/type-definitions.service.ts:350 fn rewriteViewFile(path: string, transform: (base: string) => string, options: RewriteViewOptions = {}): Promise<boolean> L15 | Rewrites the `.view` at `path` to `transform(base)`.
sym src/lib/features/type-definitions/type-definitions.service.ts:444 fn updateViewIcon(path: string, icon?: string, color?: string, titleColor?: string): Promise<void> L8 | Updates _icon, _color, and _title_color in a .view YAML file; a save that changes none of them does not touch the file.
sym src/lib/features/type-definitions/type-definitions.service.ts:454 fn updateViewIconColors(path: string, color?: string, titleColor?: string): Promise<void> L3 | Updates the colors in a .view YAML file, leaving its icon; a save that changes no color does not touch the file.
sym src/lib/features/type-definitions/type-definitions.service.ts:465 fn setViewRailPin(path: string, pinned: boolean): Promise<void> L4 | Pins the `.view` at `path` to the rail (`_rail: true`) or unpins it (the key removed), through `rewriteViewFile`.
sym src/lib/features/type-definitions/type-definitions.service.ts:475 fn showViewInViews(path: string): Promise<void> L4 | Shows the hidden `.view` at `path` in Views (`showViewInViewsYaml` removes `_visible` and `_open_in_editor`).
sym src/lib/features/type-definitions/type-definitions.service.ts:485 fn updateViewListProperties(path: string, properties: readonly string[]): Promise<void> L3 | Saves the property columns the rail note list shows for the `.view` at `path` (`_list_properties_display`; an empty list removes the key).
sym src/lib/features/type-definitions/type-definitions.service.ts:490 fn removeViewIcon(path: string): Promise<void> L3 | Removes _icon, _color, and _title_color from a .view YAML file.
sym src/lib/features/type-definitions/type-definitions.service.ts:495 class ViewWriteConflict extends Error L13 | A toolbar edit refused because its key in the `.view` changed since the toolbar read it.
sym src/lib/features/type-definitions/type-definitions.service.ts:518 fn updateViewToolbarKey<K extends ToolbarKey>(path: string, key: K, next: ToolbarValues[K], base: string): Promise<CollectionDefinition> L16 | Writes one key of the rail toolbar (`applyToolbarEdit`) to the `.view` at `path`, through `rewriteViewFile`, so the bytes it checks are a dirty tab's buffer or…
sym src/lib/features/type-definitions/type-definitions.store.svelte.ts:19 store typeDefinitionsStore L88
sym src/lib/features/type-definitions/type-note-list.logic.ts:23 fn buildRenameFileName(path: string, currentTitle: string, input: string): RenameFileNameResult | null L11 | Builds the target file name for an inline note-list rename, where the user edits the TITLE (file name without extension) rather than the full name.
sym src/lib/features/type-definitions/type-note-list.logic.ts:53 fn seedToolbarStateFromDefinition(definition: CollectionDefinition, activeView: CollectionViewDef | undefined): ToolbarSeed L11 | Returns the local toolbar state seeded from the parsed view definition and `activeView` (the rail passes the view it runs, `railViewIndex`).
sym src/lib/features/type-definitions/type-note-list.logic.ts:81 fn buildOverriddenQuery(definition: CollectionDefinition, activeView: CollectionViewDef | undefined, localGlobalFilters: FilterGroup[], localV… L17 | Produces a `{ definition, view }` pair where the YAML-sourced filters / sort are replaced by the local toolbar state.
sym src/lib/features/type-definitions/type-note-list.logic.ts:105 fn resolveViewListSort(view: CollectionViewDef, frontmatterSort: string): string | null L3 | Picks the order of a view's note list.
sym src/lib/features/type-definitions/type-note-list.logic.ts:114 fn combineAvailableProperties(propertyIndex: Map<string, PropertyIndexRecord>, viewFormulas: Record<string, string>): string[] L8 | Returns the property names offered in the filter / sort dropdowns.
sym src/lib/features/type-definitions/type-note-list.logic.ts:124 fn countActiveFilters(globalFilters: FilterGroup[], viewFilters: FilterGroup[]): number L6 | Total count of filter rows across global and view-scoped groups.
sym src/lib/features/type-definitions/type-note-list.logic.ts:146 type ToolbarKey L1 | One key the toolbar writes.
sym src/lib/features/type-definitions/type-note-list.logic.ts:149 const TOOLBAR_KEYS: readonly ToolbarKey[] L1 | Every key the toolbar writes.
sym src/lib/features/type-definitions/type-note-list.logic.ts:152 fn toolbarValuesFromState(globalFilters: FilterGroup[], viewFilters: FilterGroup[], sort: SortDef[]): ToolbarValues L3 | The value of each key the toolbar would write for its local state.
sym src/lib/features/type-definitions/type-note-list.logic.ts:162 fn canonicalToolbarValue<K extends ToolbarKey>(key: K, raw: ToolbarValues[K] | undefined): string L4 | The canonical form of a raw value of `key`: the value after the toolbar's own round trip (filters are read into groups and written back, so `and: [x]` is `x`; …
sym src/lib/features/type-definitions/type-note-list.logic.ts:168 fn toolbarKeyBase(definition: CollectionDefinition, key: ToolbarKey): string L6 | The value of `key` in `definition`, through canonicalToolbarValue.
sym src/lib/features/type-definitions/type-note-list.logic.ts:176 fn toolbarKeysDiffering(definition: CollectionDefinition, values: ToolbarValues): ToolbarKey[] L3 | The keys whose value in `definition` is not the one in `values`.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:40 type ArchivedFilter L1 | Which notes a type or Untyped list shows by lifecycle: the active ones (not archived), all of them, or only the archived ones.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:51 type TypeSidebarSelection L5 | What is currently selected in the type sidebar.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:65 fn excludeSystemFolder<T extends { path: string }>(entries: T[], vaultPath: string | null | undefined, systemFolder: string): T[] L11 | Returns a new array containing only entries whose `path` is outside the configured system folder.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:85 fn isListableNote(entry: NoteEntryV2): boolean L3 | True when an entry may be listed as a note: not a `.view` file and not a type definition (`_type: Type`).
sym src/lib/features/type-definitions/type-sidebar.logic.ts:95 fn getNotesForSelection(entries: NoteEntryV2[], selection: TypeSidebarSelection, archived: ArchivedFilter = 'active'): TypeSidebarNote[] L26 | Returns the notes matching the current sidebar selection, most-recently-modified first, with `_order` pins on top.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:128 fn getNotesForViewPaths(entries: NoteEntryV2[], matchingPaths: ReadonlySet<string>, sort: string | null = 'modified', includeArchived = false)… L20 | Converts the entries matching a set of paths into sidebar notes, archived ones left out unless `includeArchived`.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:180 fn buildTypeSections(entries: NoteEntryV2[], typeMetadataMap: Map<string, TypeMetadata>, filter: SidebarFilter): { sections: TypeSection[];… L44 | Builds type-grouped sections from vault entries.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:269 fn formatRelativeTime(epochSeconds: number, nowMs?: number): string L12 | Formats an epoch-seconds timestamp as relative time (e.g. "9m ago").
sym src/lib/features/type-definitions/type-sidebar.logic.ts:297 fn splitPropertyIntoPills(value: unknown): PropertyPill[] L22 | Splits a property value into pills, extracting wikilinks as separate entries.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:329 fn collectViewFiles(tree: FileTreeNode[]): ViewFileEntry[] L6 | Collects .view files from the file tree, sorted by name in natural order ("Week 2" before "Week 10").
sym src/lib/features/type-definitions/type-sidebar.logic.ts:350 fn getViewLabel(entry: NoteEntryV2 | undefined, fallbackName: string): string L4 | Extracts _sidebar_label from a view entry's frontmatter.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:373 fn getViewOpensInEditor(entry: NoteEntryV2 | undefined): boolean L3 | Whether a click on the view's row opens the `.view` in the editor instead of picking it as the note list's lens.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:381 fn getViewGroup(entry: NoteEntryV2 | undefined): string | null L5 | The subheading the view is listed under in Views: its trimmed `_group`.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:391 fn getViewVisible(entry: NoteEntryV2 | undefined): boolean L3 | Whether Views lists the view.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:450 fn railViewNameNote(definition: Pick<CollectionDefinition, 'views' | 'railView' | 'railViewIgnored'>): string | null L5 | The note for a parsed `.view` whose `_rail_view` picks no view: a name none of its views has, or a value that is not text (which the entry can miss, as Rust pr…
sym src/lib/features/type-definitions/type-sidebar.logic.ts:457 fn ignoredKeyNotes(frontmatter: Record<string, unknown>): string[] L7 | One note per reserved key the frontmatter sets to a value its reader ignores, e.g. `_order: "1"`.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:466 fn getViewOrder(entry: NoteEntryV2 | undefined): number L4 | Extracts _order from a view entry's frontmatter.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:475 fn getViewSort(entry: NoteEntryV2 | undefined): string L4 | Extracts _sort from a view entry's frontmatter.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:484 fn effectiveViewSortLabel(entry: NoteEntryV2 | undefined): string L4 | The Sort panel's text for a view list that no sort of the view's own orders: its `_sort`, or the default when it has none or one that is ignored.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:490 fn getViewListProperties(entry: NoteEntryV2 | undefined): string[] L5 | Extracts _list_properties_display from a view entry's frontmatter.
sym src/lib/features/type-definitions/type-sidebar.logic.ts:502 fn sortViewFiles(views: ViewFileEntry[], entriesByPath: Map<string, NoteEntryV2>): ViewFileEntry[] L12 | Sorts view files by _order from the entries index, then by the label the row shows (`getViewLabel`) in natural order, then by path.
sym src/lib/features/type-definitions/view-parse-cache.ts:43 fn refreshViewDefinition(path: string): Promise<ReturnType<typeof parseCollectionYaml>> L13 | Reads a .view file from disk, parses it, and updates the cache.
sym src/lib/features/type-definitions/view-parse-cache.ts:58 fn getCachedViewDefinition(path: string): Promise<ReturnType<typeof parseCollectionYaml>> L5 | Returns cached parsed definition without disk I/O.
sym src/lib/features/type-definitions/view-parse-cache.ts:69 fn getViewContentHash(path: string): string | undefined L3 | Returns the content hash of the cached parse for a path, or `undefined` when the path is not cached.
sym src/lib/features/type-definitions/view-parse-cache.ts:84 fn clearViewParseCacheUnder(path: string): void L10 | Clears `path` and every entry under `path + '/'`, so one call covers a renamed, moved or deleted folder and all the `.view` files inside it.
sym src/lib/features/type-definitions/view-parse-cache.ts:96 fn clearAllViewParseCache(): void L5 | Clears all entries.
## stores
store src/lib/features/type-definitions/type-definitions.store.svelte.ts:19 typeDefinitionsStore esc:4
## effects
fx-count svelte.$effect 2
fx-count tauri-fs.exists 2
fx-count tauri-fs.readDir 2
fx-count tauri-fs.readTextFile 2
fx-count tauri-fs.writeTextFile 2
ipc-count ipc:create_folder 1
ipc-count ipc:get_all_vault_entries_v2 1
ipc-count ipc:propagate_type_rename 1
## debt
-
