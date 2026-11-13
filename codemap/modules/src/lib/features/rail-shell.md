# module card src/lib/features/rail-shell
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/rail-shell ' codemap/modules
sections: neighbors, entry files, files, public, stores, effects, debt
module src/lib/features/rail-shell features files 29 in-modules 7 out-modules 17 pub 49/161 ipc 2/0 card ~6.2k
## neighbors
dep src/lib/app -> src/lib/features/rail-shell 19
dep src/lib/features/note-action-bar -> src/lib/features/rail-shell 1
dep src/lib/features/search -> src/lib/features/rail-shell 1
dep src/lib/plugins/calendar -> src/lib/features/rail-shell 4
dep src/lib/plugins/kanban -> src/lib/features/rail-shell 1
dep src/lib/plugins/mods -> src/lib/features/rail-shell 2
dep src/lib/plugins/one-on-one -> src/lib/features/rail-shell 2
dep src/lib/features/rail-shell -> src/lib/components 10
dep src/lib/features/rail-shell -> src/lib/contracts 2
dep src/lib/features/rail-shell -> src/lib/core/editor 9
dep src/lib/features/rail-shell -> src/lib/core/filesystem 22
dep src/lib/features/rail-shell -> src/lib/core/frontmatter 5
dep src/lib/features/rail-shell -> src/lib/core/note-creator 2
dep src/lib/features/rail-shell -> src/lib/core/settings 13
dep src/lib/features/rail-shell -> src/lib/core/vault 6
dep src/lib/features/rail-shell -> src/lib/features/canvas 1
dep src/lib/features/rail-shell -> src/lib/features/collection 16
dep src/lib/features/rail-shell -> src/lib/features/event-calendar 3
dep src/lib/features/rail-shell -> src/lib/features/file-icons 20
dep src/lib/features/rail-shell -> src/lib/features/note-list 3
dep src/lib/features/rail-shell -> src/lib/features/properties 1
dep src/lib/features/rail-shell -> src/lib/features/type-definitions 25
dep src/lib/features/rail-shell -> src/lib/types 2
dep src/lib/features/rail-shell -> src/lib/utils 11
in2 src/lib/features/rail-shell 3 modules: src/routes(3) src/lib/features/deep-link(1) src/lib/features/tags(1)
out2 src/lib/features/rail-shell 2 modules: src/lib/core/trash(4) src/lib/core/markdown-editor(1)
## entry files
entry src/lib/features/rail-shell/lens.logic.ts ext-in7 src/lib/app/AppShell.svelte src/lib/app/boot.ts src/lib/app/commands.ts src/lib/app/rail-navigation.ts src/lib/features/search/open-search.service.ts more importers 2 not shown: src/lib/plugins/calendar(1) src/lib/plugins/one-on-one(1): q importers src/lib/features/rail-shell/lens.logic.ts
entry src/lib/features/rail-shell/rail-registry.store.svelte.ts ext-in7 src/lib/app/AppShell.svelte src/lib/app/commands.ts src/lib/plugins/calendar/calendar-rail.service.ts src/lib/plugins/kanban/kanban.service.ts src/lib/plugins/mods/mod-app.service.ts more importers 2 not shown: src/lib/plugins/mods(1) src/lib/plugins/one-on-one(1): q importers src/lib/features/rail-shell/rail-registry.store.svelte.ts
entry src/lib/features/rail-shell/rail-items.logic.ts ext-in3 src/lib/app/AppShell.svelte src/lib/app/commands.ts src/lib/app/rail-navigation.ts
entry src/lib/features/rail-shell/neighbourhood.service.ts ext-in2 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/features/note-action-bar/NoteActionBar.svelte
entry src/lib/features/rail-shell/neighbourhood.store.svelte.ts ext-in2 src/lib/app/AppShell.svelte src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/rail-shell/rail-shell.types.ts ext-in2 src/lib/plugins/calendar/calendar-rail.service.ts src/lib/plugins/calendar/day-lens.logic.ts
entry src/lib/features/rail-shell/FilesNavigator.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/rail-shell/LayoutSection.svelte ext-in1 src/lib/app/SettingsPanel.svelte
entry src/lib/features/rail-shell/Rail.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/rail-shell/RailNoteList.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/rail-shell/TypesNavigator.svelte ext-in1 src/lib/app/AppShell.svelte
entry src/lib/features/rail-shell/files-navigator.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/rail-shell/types-navigator.service.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
## files
file src/lib/features/rail-shell/FilesNavigator.svelte component L502 module src/lib/features/rail-shell in1 t4
file src/lib/features/rail-shell/LayoutSection.svelte component L201 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/Rail.svelte component L380 module src/lib/features/rail-shell in1 t3
file src/lib/features/rail-shell/RailArchivedMenu.svelte component L67 module src/lib/features/rail-shell in1 t0
file src/lib/features/rail-shell/RailListSearch.svelte component L119 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/RailNoteList.svelte component L925 module src/lib/features/rail-shell in1 t6
file src/lib/features/rail-shell/RailPropertiesPicker.svelte component L177 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/RailSortMenu.svelte component L233 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/TypesNavigator.svelte component L511 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/files-navigator.service.ts service L20 module src/lib/features/rail-shell in1 t3
file src/lib/features/rail-shell/lens.logic.ts logic L1111 module src/lib/features/rail-shell in18 t30
file src/lib/features/rail-shell/list-fulltext.service.ts service L34 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/list-prefs.logic.ts logic L107 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/list-prefs.service.ts service L69 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/list-properties.logic.ts logic L116 module src/lib/features/rail-shell in2 t1
file src/lib/features/rail-shell/list-search.logic.ts logic L62 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/list-sort-compare.logic.ts logic L121 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/list-sort.logic.ts logic L64 module src/lib/features/rail-shell in4 t2
file src/lib/features/rail-shell/list-toolbar.types.ts types L21 module src/lib/features/rail-shell in7 t0
file src/lib/features/rail-shell/list-view-sort.logic.ts logic L68 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/neighbourhood.service.ts service L36 module src/lib/features/rail-shell in2 t2
file src/lib/features/rail-shell/neighbourhood.store.svelte.ts store L25 module src/lib/features/rail-shell in3 t4 | The note the rail shell's Neighbourhood lens shows.
file src/lib/features/rail-shell/new-note.service.ts service L47 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/rail-items.logic.ts logic L195 module src/lib/features/rail-shell in5 t5
file src/lib/features/rail-shell/rail-registry.store.svelte.ts store L111 module src/lib/features/rail-shell in11 t26
file src/lib/features/rail-shell/rail-shell.types.ts types L234 module src/lib/features/rail-shell in15 t0
file src/lib/features/rail-shell/types-navigator.service.ts service L21 module src/lib/features/rail-shell in1 t2
file src/lib/features/rail-shell/view-lens-seed.logic.ts logic L56 module src/lib/features/rail-shell in1 t1
file src/lib/features/rail-shell/view-lens.service.ts service L48 module src/lib/features/rail-shell in1 t2
## public
sym src/lib/features/rail-shell/FilesNavigator.svelte:1 component FilesNavigator props:picked,expanded,onPick,onToggle,onPickView L502
sym src/lib/features/rail-shell/LayoutSection.svelte:1 component LayoutSection L201
sym src/lib/features/rail-shell/Rail.svelte:1 component Rail props:activeItem,onSelect L380
sym src/lib/features/rail-shell/RailNoteList.svelte:1 component RailNoteList props:lens,firstPane= L925
sym src/lib/features/rail-shell/TypesNavigator.svelte:1 component TypesNavigator props:rows,picked,onPick L511
sym src/lib/features/rail-shell/files-navigator.service.ts:11 fn registerFilesNavigatorPathChangeConsumer(): () => void L10 | Registers the Files navigator as a path-change consumer, so its saved pick and expanded folders follow a folder renamed, moved or deleted anywhere in the app.
sym src/lib/features/rail-shell/lens.logic.ts:97 const SEARCH_LENS: Lens L1 | The Search rail item's lens.
sym src/lib/features/rail-shell/lens.logic.ts:109 const VIEW_LENS_KIND L1 | The lens kind of a `.view` file; its target is the file's absolute path.
sym src/lib/features/rail-shell/lens.logic.ts:124 const SEARCH_RAIL_ITEM L1 | The rail item that shows Search.
sym src/lib/features/rail-shell/lens.logic.ts:127 const TYPES_RAIL_ITEM L1 | The rail item that opens the Types navigator.
sym src/lib/features/rail-shell/lens.logic.ts:130 const FILES_RAIL_ITEM L1 | The rail item that opens the Files navigator.
sym src/lib/features/rail-shell/lens.logic.ts:189 fn restoreRailItem(saved: unknown, navigators: readonly RailNavigator[] = [], neighbourhoodPath: string | null = null, hidden: readonly s… L20 | The rail item saved in `layout.railItem` and its lens: a built-in item, a navigator a plugin registered (its lens is the navigator's pick), or a pin key (`view…
sym src/lib/features/rail-shell/lens.logic.ts:219 fn pinnedRailItems(entries: readonly NoteEntryV2[], typeMetadataMap: Map<string, TypeMetadata>): RailPin[] L21 | The rail's pinned items: every `.view` and type definition in the entries snapshot whose `_rail` is the YAML boolean `true` (only the canonical spelling; `"tru…
sym src/lib/features/rail-shell/lens.logic.ts:247 fn staleRailPinFix(railItem: unknown, pinned: readonly RailPin[]): Pick<Partial<LayoutSettings>, 'railItem'> | null L4 | The layout change that sends a saved pin that is no longer pinned (file gone, `_rail` removed) back to the default item: `{ railItem }` when `railItem` is a pi…
sym src/lib/features/rail-shell/lens.logic.ts:263 fn entryNoteDate(entry: NoteEntryV2): string | null L8 | An entry's note date (`noteDateKey`: frontmatter `date`, else `created`, else the disk creation time), or null.
sym src/lib/features/rail-shell/lens.logic.ts:326 fn listEntries(ctx: LensContext, includes: (entry: NoteEntryV2) => boolean): LensNote[] L6 | The entries `includes` keeps as note list rows: system folder excluded, newest change first (the built-in lenses' order).
sym src/lib/features/rail-shell/lens.logic.ts:471 fn viewEntriesLoaded(store: { readonly entries: readonly { path: string }[]; readonly entriesVersion: number }, propertyIndex: ReadonlyMap<… L11 | Whether this vault's entries have landed, for a `.view`'s row set (`viewRowSet` drops a record with no entry).
sym src/lib/features/rail-shell/lens.logic.ts:492 fn typeNavigatorRows(ctx: Pick<LensContext, 'entries' | 'vaultPath' | 'systemFolder' | 'typeMetadataMap'>, showUntyped: boolean): TypeNavig… L25 | The Types navigator's rows: the visible types in sidebar order, each with the number of notes its lens lists, then Untyped when `showUntyped` is on.
sym src/lib/features/rail-shell/lens.logic.ts:536 fn pickedTypesLens(saved: unknown, rows: readonly TypeNavigatorRow[]): Lens L3 | The lens the Types rail item shows: the saved pick (kept even when the snapshot does not list it yet, as right after New type or a rename), else the first row,…
sym src/lib/features/rail-shell/lens.logic.ts:556 fn staleTypesPickFix(railItem: unknown, saved: unknown, rows: readonly TypeNavigatorRow[], viewPaths: readonly string[]): Pick<Partial<Layo… L11 | The layout change that drops a saved Types pick that no longer exists (a view gone from the tree, a deleted type, or Untyped with untyped notes hidden): the pi…
sym src/lib/features/rail-shell/lens.logic.ts:569 interface TypesPickCheck L10 | Where the once-per-vault-open stale Types pick check stands.
sym src/lib/features/rail-shell/lens.logic.ts:581 const INITIAL_TYPES_PICK_CHECK: TypesPickCheck L1 | The check state before any vault is seen.
sym src/lib/features/rail-shell/lens.logic.ts:592 fn stepTypesPickCheck(prev: TypesPickCheck, now: { vaultPath: string | null; indexReady: boolean; entriesVersion: number }): { next: TypesPi… L13 | Advances the stale Types pick check by one observation and says whether to run `staleTypesPickFix` now.
sym src/lib/features/rail-shell/lens.logic.ts:656 fn viewNavigatorRows(tree: FileTreeNode[], entriesByPath: Map<string, NoteEntryV2>): TypeNavigatorRow[] L24 | The Views part of the Types navigator: every `.view` file in the tree but the hidden ones (`_visible: false`), labelled by its `_sidebar_label`, marked to open…
sym src/lib/features/rail-shell/lens.logic.ts:717 fn viewRowSet<T extends { path: string }>(records: readonly T[], view: CollectionViewDef, viewPath: string, ctx: ViewRowContext, def… L18 | The one row set of a `.view` view, which the editor (through the collection row-set port), the rail's view lens and the navigator count all use.
sym src/lib/features/rail-shell/lens.logic.ts:749 fn blockRowSet<T extends Pick<PropertyIndexRecord, 'path' | 'properties'>>(records: readonly T[], view: CollectionViewDef, definition… L15 | The row set of an inline ` ```collection ` block: `viewRowSet`'s rule read from the records alone. Takes the records the block's query matched (filters and the…
sym src/lib/features/rail-shell/lens.logic.ts:1011 fn pickedFolderLens(saved: unknown): Lens L3 | The Files navigator's pick saved in `layout.railFolder` as a lens; anything but a non-empty string is the vault root.
sym src/lib/features/rail-shell/lens.logic.ts:1016 fn parseExpandedFolders(saved: unknown): string[] L3 | The expanded folders saved in `layout.railExpandedFolders`; a hand-edited non-array reads as none, non-strings are dropped.
sym src/lib/features/rail-shell/lens.logic.ts:1029 fn staleFolderPickFix(railItem: unknown, savedPick: unknown, savedExpanded: unknown, tree: readonly FileTreeNode[], vaultPath: string): Pick… L19 | The layout change that drops what the Files navigator saved but the tree no longer holds: a picked folder that is gone clears the pick and, when Files is the a…
sym src/lib/features/rail-shell/lens.logic.ts:1050 fn toggleExpandedFolder(savedExpanded: unknown, path: string): string[] L4 | The expanded folder list after a chevron click on `path`: added when collapsed, removed when expanded.
sym src/lib/features/rail-shell/neighbourhood.service.ts:10 fn openNeighbourhood(path: string): void L4 | Fills the note list with the neighbourhood of the note at `path`, showing the panels Cmd+1 may have hidden.
sym src/lib/features/rail-shell/neighbourhood.service.ts:22 fn registerNeighbourhoodPathChangeConsumer(): () => void L15 | Registers the Neighbourhood lens as a path-change consumer, so the open neighbourhood follows its note (or a folder above it) when renamed or moved.
sym src/lib/features/rail-shell/neighbourhood.store.svelte.ts:10 store neighbourhoodStore L16
sym src/lib/features/rail-shell/rail-items.logic.ts:9 interface RailItem L12 | A rail button: what it saves as `layout.railItem` and what it is called.
sym src/lib/features/rail-shell/rail-items.logic.ts:31 fn railItems(navigators: readonly RailNavigator[], pins: readonly RailPin[], hidden: readonly string[] = [], order: readonly string… L31 | Every rail button in rail order: Search, Inbox, Today, Favorites; Types, the registered navigators (Calendar), Files; the pins; Archive.
sym src/lib/features/rail-shell/rail-items.logic.ts:108 fn parseRailHidden(saved: unknown): string[] L3 | The hidden rail items saved in `layout.railHidden`; a hand-edited non-array reads as none, non-strings are dropped.
sym src/lib/features/rail-shell/rail-items.logic.ts:113 fn parseRailOrder(saved: unknown): string[] L3 | The rail order saved in `layout.railOrder`; a hand-edited non-array reads as the default order, non-strings are dropped.
sym src/lib/features/rail-shell/rail-items.logic.ts:153 fn parseRailWidth(saved: unknown): number L4 | The labeled rail's width from `layout.railWidth`: a finite number is rounded and clamped, anything else reads as the default.
sym src/lib/features/rail-shell/rail-items.logic.ts:168 fn parseRailStyle(saved: unknown): RailStyle L3 | The rail's style from `layout.railStyle`: only `'captioned'` gives captioned, anything else reads as labeled.
sym src/lib/features/rail-shell/rail-items.logic.ts:173 fn parseRailCollapsed(saved: unknown): boolean L3 | Whether the rail is collapsed, from `layout.railCollapsed`: only the boolean `true` collapses.
sym src/lib/features/rail-shell/rail-items.logic.ts:178 fn railFormWidth(style: RailStyle, collapsed: boolean, labeledWidth: number): number L4 | The rail's width in px from its parsed style, collapsed state and labeled width.
sym src/lib/features/rail-shell/rail-items.logic.ts:193 fn railHeaderPad(railWidth: number): number L3 | The left padding, in px, of the header strip beside a rail this wide: the macOS traffic lights and the rail toggle reach 120 px from the window's edge, and pas…
sym src/lib/features/rail-shell/rail-registry.store.svelte.ts:27 store railRegistryStore L85
sym src/lib/features/rail-shell/rail-shell.types.ts:12 interface Lens L6 | What the user picked on the left: a rail item, a navigator entry or a note's neighbourhood.
sym src/lib/features/rail-shell/rail-shell.types.ts:20 interface LensContext L12 | The snapshot a lens resolves against.
sym src/lib/features/rail-shell/rail-shell.types.ts:63 interface ResolvedLens L12 | A lens turned into what the note list shows.
sym src/lib/features/rail-shell/rail-shell.types.ts:134 type NewNoteRule L1 | What "+ New here" creates for a lens.
sym src/lib/features/rail-shell/rail-shell.types.ts:137 interface NewNoteContext L12 | What a lens's creation rule reads.
sym src/lib/features/rail-shell/types-navigator.service.ts:12 fn registerTypesNavigatorPathChangeConsumer(): () => void L10 | Registers the Types navigator as a path-change consumer, so a saved pick of a view and the rail showing it as a pinned item follow a rename or move of the view…
## stores
store src/lib/features/rail-shell/neighbourhood.store.svelte.ts:10 neighbourhoodStore esc:0
store src/lib/features/rail-shell/rail-registry.store.svelte.ts:27 railRegistryStore esc:1
## effects
fx-count dom.dragstart 1
fx-count svelte.$effect 12
fx-count tauri-dialog.ask 1
fx-count timer-wrap.debounce 1
fx-count timer.requestAnimationFrame 1
fx-count timer.setTimeout 1
ipc-count ipc:create_folder 1
ipc-count ipc:search_fts 1
## debt
-
