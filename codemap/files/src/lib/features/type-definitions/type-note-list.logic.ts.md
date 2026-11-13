# file card src/lib/features/type-definitions/type-note-list.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/type-note-list.logic.ts ' codemap/files
file src/lib/features/type-definitions/type-note-list.logic.ts logic L208 module src/lib/features/type-definitions in4 t6
## imports
imp src/lib/features/type-definitions/type-note-list.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter,type:CollectionViewDef,type:PropertyIndexRecord,type:SortDef
imp src/lib/features/type-definitions/type-note-list.logic.ts:2 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/type-definitions/type-note-list.logic.ts:3 -> src/lib/features/collection/toolbar/filter.logic.ts parseFilterToGroups,filterGroupsToFilter,getAllKnownProperties
imp src/lib/features/type-definitions/type-note-list.logic.ts:4 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml,railViewIndex,updateCollectionYaml,type:CollectionYamlUpdates
imp src/lib/features/type-definitions/type-note-list.logic.ts:5 -> src/lib/features/collection/key-edit.logic.ts sortedJson
imp src/lib/features/type-definitions/type-note-list.logic.ts:6 -> src/lib/core/filesystem/fs.logic.ts getFileNameError
## imported-by
imp src/lib/features/note-list/NoteRowMenu.svelte:24 -> src/lib/features/type-definitions/type-note-list.logic.ts buildRenameFileName
imp src/lib/features/rail-shell/RailNoteList.svelte:45 -> src/lib/features/type-definitions/type-note-list.logic.ts canonicalToolbarValue,combineAvailableProperties,countActiveFilters,seedToolbarStateFromDefinition,TOOLBAR_KEYS,toolbarKeyBase,toolbarKeysDiffering,toolbarValuesFromState,type:ToolbarKey
imp src/lib/features/rail-shell/lens.logic.ts:39 -> src/lib/features/type-definitions/type-note-list.logic.ts buildOverriddenQuery,resolveViewListSort,seedToolbarStateFromDefinition
imp src/lib/features/type-definitions/type-definitions.service.ts:23 -> src/lib/features/type-definitions/type-note-list.logic.ts applyToolbarEdit,type:ToolbarKey,type:ToolbarValues
## reach
in2 src/lib/features/type-definitions/type-note-list.logic.ts 23 files in 8 modules: src/lib/features/rail-shell(10) src/lib/app(6) src/lib/features/event-calendar(2) src/lib/features/search(1) src/lib/features/type-definitions(1) +3 modules: q impact src/lib/features/type-definitions/type-note-list.logic.ts --depth 2
out2 src/lib/features/type-definitions/type-note-list.logic.ts 5 files in 4 modules: src/lib/features/collection(2) src/lib/core/filesystem(1) src/lib/core/frontmatter(1) src/lib/utils(1)
## tests
test src/tests/lib/features/type-definitions/type-note-list.logic.test.ts imports src/lib/features/type-definitions/type-note-list.logic.ts mirror
test src/tests/help/type-definitions-views.test.ts imports src/lib/features/type-definitions/type-note-list.logic.ts
test src/tests/lib/features/collection/toolbar/suggestions-skip-views.test.ts imports src/lib/features/type-definitions/type-note-list.logic.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/type-definitions/type-note-list.logic.ts
test src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts imports src/lib/features/type-definitions/type-note-list.logic.ts
test src/tests/lib/features/type-definitions/update-view-toolbar-key.service.test.ts imports src/lib/features/type-definitions/type-note-list.logic.ts
## symbols
sym src/lib/features/type-definitions/type-note-list.logic.ts:9 type RenameFileNameResult L5 | Outcome of an inline note-list rename that has something to apply.
sym src/lib/features/type-definitions/type-note-list.logic.ts:23 fn buildRenameFileName(path: string, currentTitle: string, input: string): RenameFileNameResult | null L11 | Builds the target file name for an inline note-list rename, where the user edits the TITLE (file name without extension) rather than the full name.
by src/lib/features/type-definitions/type-note-list.logic.ts:buildRenameFileName <- src/lib/features/note-list/NoteRowMenu.svelte:136 in commitRename call
sym src/lib/features/type-definitions/type-note-list.logic.ts:40 interface ToolbarSeed L6 | Seed shape produced from a successfully-parsed .view definition.
sym src/lib/features/type-definitions/type-note-list.logic.ts:53 fn seedToolbarStateFromDefinition(definition: CollectionDefinition, activeView: CollectionViewDef | undefined): ToolbarSeed L11 | Returns the local toolbar state seeded from the parsed view definition and `activeView` (the rail passes the view it runs, `railViewIndex`).
by src/lib/features/type-definitions/type-note-list.logic.ts:seedToolbarStateFromDefinition <- src/lib/features/rail-shell/RailNoteList.svelte:272 in loadView call
by src/lib/features/type-definitions/type-note-list.logic.ts:seedToolbarStateFromDefinition <- src/lib/features/rail-shell/lens.logic.ts:806 in queryViewLens call
sym src/lib/features/type-definitions/type-note-list.logic.ts:66 interface OverriddenQuery L4 | Bundle returned by buildOverriddenQuery, ready to feed into executeQuery.
sym src/lib/features/type-definitions/type-note-list.logic.ts:81 fn buildOverriddenQuery(definition: CollectionDefinition, activeView: CollectionViewDef | undefined, localGlobalFilters: FilterGroup[], localV… L17 | Produces a `{ definition, view }` pair where the YAML-sourced filters / sort are replaced by the local toolbar state.
by src/lib/features/type-definitions/type-note-list.logic.ts:buildOverriddenQuery <- src/lib/features/rail-shell/lens.logic.ts:807 in queryViewLens call
sym src/lib/features/type-definitions/type-note-list.logic.ts:105 fn resolveViewListSort(view: CollectionViewDef, frontmatterSort: string): string | null L3 | Picks the order of a view's note list.
by src/lib/features/type-definitions/type-note-list.logic.ts:resolveViewListSort <- src/lib/features/rail-shell/lens.logic.ts:727 in viewRowSet call
sym src/lib/features/type-definitions/type-note-list.logic.ts:114 fn combineAvailableProperties(propertyIndex: Map<string, PropertyIndexRecord>, viewFormulas: Record<string, string>): string[] L8 | Returns the property names offered in the filter / sort dropdowns.
by src/lib/features/type-definitions/type-note-list.logic.ts:combineAvailableProperties <- src/lib/features/rail-shell/RailNoteList.svelte:182 in availableProperties=$derived call
sym src/lib/features/type-definitions/type-note-list.logic.ts:124 fn countActiveFilters(globalFilters: FilterGroup[], viewFilters: FilterGroup[]): number L6 | Total count of filter rows across global and view-scoped groups.
by src/lib/features/type-definitions/type-note-list.logic.ts:countActiveFilters <- src/lib/features/rail-shell/RailNoteList.svelte:181 in activeFilterCount=$derived call
sym src/lib/features/type-definitions/type-note-list.logic.ts:136 interface ToolbarValues L8 | What the rail's Sort and Filter toolbar writes, per `.view` key: the top-level `filters`, and the `filters` and `sort` of the view the rail runs (`railViewInde…
by src/lib/features/type-definitions/type-note-list.logic.ts:ToolbarValues <- src/lib/features/type-definitions/type-definitions.service.ts:23 in (module) import
sym src/lib/features/type-definitions/type-note-list.logic.ts:146 type ToolbarKey L1 | One key the toolbar writes.
by src/lib/features/type-definitions/type-note-list.logic.ts:ToolbarKey <- src/lib/features/rail-shell/RailNoteList.svelte:54 in (script) import
by src/lib/features/type-definitions/type-note-list.logic.ts:ToolbarKey <- src/lib/features/type-definitions/type-definitions.service.ts:23 in (module) import
sym src/lib/features/type-definitions/type-note-list.logic.ts:149 const TOOLBAR_KEYS: readonly ToolbarKey[] L1 | Every key the toolbar writes.
by src/lib/features/type-definitions/type-note-list.logic.ts:TOOLBAR_KEYS <- src/lib/features/rail-shell/RailNoteList.svelte:301 in baseOf ref
sym src/lib/features/type-definitions/type-note-list.logic.ts:152 fn toolbarValuesFromState(globalFilters: FilterGroup[], viewFilters: FilterGroup[], sort: SortDef[]): ToolbarValues L3 | The value of each key the toolbar would write for its local state.
by src/lib/features/type-definitions/type-note-list.logic.ts:toolbarValuesFromState <- src/lib/features/rail-shell/RailNoteList.svelte:315 in persistViewState call +1
sym src/lib/features/type-definitions/type-note-list.logic.ts:162 fn canonicalToolbarValue<K extends ToolbarKey>(key: K, raw: ToolbarValues[K] | undefined): string L4 | The canonical form of a raw value of `key`: the value after the toolbar's own round trip (filters are read into groups and written back, so `and: [x]` is `x`; …
by src/lib/features/type-definitions/type-note-list.logic.ts:canonicalToolbarValue <- src/lib/features/rail-shell/RailNoteList.svelte:317 in persistViewState call
sym src/lib/features/type-definitions/type-note-list.logic.ts:168 fn toolbarKeyBase(definition: CollectionDefinition, key: ToolbarKey): string L6 | The value of `key` in `definition`, through canonicalToolbarValue.
by src/lib/features/type-definitions/type-note-list.logic.ts:toolbarKeyBase <- src/lib/features/rail-shell/RailNoteList.svelte:301 in baseOf call
sym src/lib/features/type-definitions/type-note-list.logic.ts:176 fn toolbarKeysDiffering(definition: CollectionDefinition, values: ToolbarValues): ToolbarKey[] L3 | The keys whose value in `definition` is not the one in `values`.
by src/lib/features/type-definitions/type-note-list.logic.ts:toolbarKeysDiffering <- src/lib/features/rail-shell/RailNoteList.svelte:343 in persistViewState call
sym src/lib/features/type-definitions/type-note-list.logic.ts:181 type ToolbarEditResult L6 | The YAML a toolbar edit gives, or why it was refused.
sym src/lib/features/type-definitions/type-note-list.logic.ts:196 fn applyToolbarEdit<K extends ToolbarKey>(yaml: string, key: K, next: ToolbarValues[K], base: string): ToolbarEditResult L13 | Writes `next` as `key` of the `.view` YAML `yaml`, and nothing else.
by src/lib/features/type-definitions/type-note-list.logic.ts:applyToolbarEdit <- src/lib/features/type-definitions/type-definitions.service.ts:525 in updateViewToolbarKey call
## calls
call src/lib/features/type-definitions/type-note-list.logic.ts:30 in buildRenameFileName -> src/lib/core/filesystem/fs.logic.ts:getFileNameError call
call src/lib/features/type-definitions/type-note-list.logic.ts:58 in seedToolbarStateFromDefinition -> src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups call +1
call src/lib/features/type-definitions/type-note-list.logic.ts:90 in buildOverriddenQuery -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call +1
call src/lib/features/type-definitions/type-note-list.logic.ts:118 in combineAvailableProperties -> src/lib/features/collection/toolbar/filter.logic.ts:getAllKnownProperties call
call src/lib/features/type-definitions/type-note-list.logic.ts:153 in toolbarValuesFromState -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call +1
call src/lib/features/type-definitions/type-note-list.logic.ts:163 in canonicalToolbarValue -> src/lib/features/collection/key-edit.logic.ts:sortedJson call +1
call src/lib/features/type-definitions/type-note-list.logic.ts:164 in canonicalToolbarValue -> src/lib/features/collection/toolbar/filter.logic.ts:filterGroupsToFilter call
call src/lib/features/type-definitions/type-note-list.logic.ts:164 in canonicalToolbarValue -> src/lib/features/collection/toolbar/filter.logic.ts:parseFilterToGroups call
call src/lib/features/type-definitions/type-note-list.logic.ts:169 in toolbarKeyBase -> src/lib/features/collection/yaml-parser.ts:railViewIndex call
call src/lib/features/type-definitions/type-note-list.logic.ts:170 in toolbarKeyBase -> src/lib/features/type-definitions/type-note-list.logic.ts:canonicalToolbarValue call +2
call src/lib/features/type-definitions/type-note-list.logic.ts:177 in toolbarKeysDiffering -> src/lib/features/type-definitions/type-note-list.logic.ts:canonicalToolbarValue call
call src/lib/features/type-definitions/type-note-list.logic.ts:177 in toolbarKeysDiffering -> src/lib/features/type-definitions/type-note-list.logic.ts:toolbarKeyBase call
call src/lib/features/type-definitions/type-note-list.logic.ts:197 in applyToolbarEdit -> src/lib/features/collection/yaml-parser.ts:parseCollectionYaml call
call src/lib/features/type-definitions/type-note-list.logic.ts:199 in applyToolbarEdit -> src/lib/features/type-definitions/type-note-list.logic.ts:toolbarKeyBase call
call src/lib/features/type-definitions/type-note-list.logic.ts:200 in applyToolbarEdit -> src/lib/features/collection/yaml-parser.ts:railViewIndex call
call src/lib/features/type-definitions/type-note-list.logic.ts:207 in applyToolbarEdit -> src/lib/features/collection/yaml-parser.ts:updateCollectionYaml call
