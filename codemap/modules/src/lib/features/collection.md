# module card src/lib/features/collection
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/collection ' codemap/modules
sections: neighbors, entry files, files, public, stores, effects, debt
module src/lib/features/collection features files 32 in-modules 6 out-modules 9 pub 49/157 ipc 1/0 card ~6.4k
## neighbors
dep src/lib/app -> src/lib/features/collection 8
dep src/lib/features/auto-organize -> src/lib/features/collection 18
dep src/lib/features/rail-shell -> src/lib/features/collection 16
dep src/lib/features/type-definitions -> src/lib/features/collection 15
dep src/lib/plugins/mods -> src/lib/features/collection 5
dep src/lib/plugins/queryjs -> src/lib/features/collection 3
dep src/lib/features/collection -> src/lib/components 13
dep src/lib/features/collection -> src/lib/contracts 1
dep src/lib/features/collection -> src/lib/core/editor 2
dep src/lib/features/collection -> src/lib/core/filesystem 8
dep src/lib/features/collection -> src/lib/core/frontmatter 3
dep src/lib/features/collection -> src/lib/core/markdown-editor 1
dep src/lib/features/collection -> src/lib/core/vault 3
dep src/lib/features/collection -> src/lib/types 1
dep src/lib/features/collection -> src/lib/utils 9
in2 src/lib/features/collection 6 modules: src/lib/features/note-list(4) src/lib/features/event-calendar(3) src/routes(3) src/lib/plugins/calendar(2) src/lib/features/search(1) +1 modules
out2 src/lib/features/collection 2 modules: src/lib/core/settings(2) src/lib/core/trash(1)
## entry files
entry src/lib/features/collection/collection.types.ts ext-in15 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/auto-organize/auto-organize.logic.ts src/lib/features/auto-organize/auto-organize.service.ts src/lib/features/auto-organize/auto-organize.types.ts src/lib/features/rail-shell/RailNoteList.svelte more importers 10 not shown: src/lib/features/rail-shell(4) src/lib/features/type-definitions(3) src/lib/plugins/queryjs(2) +1 modules: q importers src/lib/features/collection/collection.types.ts
entry src/lib/features/collection/collection.store.svelte.ts ext-in10 src/lib/app/boot.ts src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/auto-organize/auto-organize.service.ts src/lib/features/rail-shell/RailNoteList.svelte more importers 5 not shown: src/lib/plugins/mods(2) src/lib/features/rail-shell(1) src/lib/features/type-definitions(1) +1 modules: q importers src/lib/features/collection/collection.store.svelte.ts
entry src/lib/features/collection/yaml-parser.ts ext-in7 src/lib/features/rail-shell/RailNoteList.svelte src/lib/features/rail-shell/lens.logic.ts src/lib/features/type-definitions/ViewDialog.svelte src/lib/features/type-definitions/type-definitions.service.ts src/lib/features/type-definitions/type-note-list.logic.ts more importers 2 not shown: src/lib/features/type-definitions(2): q importers src/lib/features/collection/yaml-parser.ts
entry src/lib/features/collection/toolbar/toolbar.types.ts ext-in6 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/auto-organize/auto-organize.logic.ts src/lib/features/rail-shell/RailNoteList.svelte src/lib/features/rail-shell/lens.logic.ts src/lib/features/type-definitions/ViewDialog.svelte more importers 1 not shown: src/lib/features/type-definitions(1): q importers src/lib/features/collection/toolbar/toolbar.types.ts
entry src/lib/features/collection/collection.logic.ts ext-in5 src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte src/lib/features/auto-organize/auto-organize.logic.ts src/lib/features/auto-organize/auto-organize.service.ts src/lib/features/rail-shell/lens.logic.ts src/lib/plugins/mods/mod-query.service.ts
entry src/lib/features/collection/toolbar/filter.logic.ts ext-in5 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/auto-organize/auto-organize.logic.ts src/lib/features/rail-shell/lens.logic.ts src/lib/features/type-definitions/ViewDialog.svelte src/lib/features/type-definitions/type-note-list.logic.ts
entry src/lib/features/collection/collection.service.ts ext-in4 src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/lifecycle/watcher-handler.service.ts src/lib/app/tauri-listeners.service.ts src/lib/features/rail-shell/FilesNavigator.svelte
entry src/lib/features/collection/toolbar/FilterPanel.svelte ext-in3 src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte src/lib/features/rail-shell/RailNoteList.svelte src/lib/features/type-definitions/ViewDialog.svelte
entry src/lib/features/collection/collection-block-widget.ts ext-in2 src/lib/app/editor-host.ts src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/features/collection/view-row-set.port.ts ext-in2 src/lib/app/boot.ts src/lib/plugins/mods/mod-query.service.ts
entry src/lib/features/collection/CollectionView.svelte ext-in1 src/lib/app/EditorView.svelte
entry src/lib/features/collection/expression/evaluator.ts ext-in1 src/lib/features/auto-organize/auto-organize.logic.ts
entry src/lib/features/collection/expression/expression.types.ts ext-in1 src/lib/features/auto-organize/auto-organize.logic.ts
entry src/lib/features/collection/expression/parser.ts ext-in1 src/lib/features/auto-organize/auto-organize.logic.ts
entry src/lib/features/collection/key-edit.logic.ts ext-in1 src/lib/features/type-definitions/type-note-list.logic.ts
entry src/lib/features/collection/toolbar/SortPanel.svelte ext-in1 src/lib/features/rail-shell/RailNoteList.svelte
## files
file src/lib/features/collection/CollectionCalendarView.svelte component L172 module src/lib/features/collection in1 t0
file src/lib/features/collection/CollectionLinearCalendarView.svelte component L219 module src/lib/features/collection in1 t0
file src/lib/features/collection/CollectionTableView.svelte component L97 module src/lib/features/collection in1 t1
file src/lib/features/collection/CollectionView.svelte component L736 module src/lib/features/collection in1 t4
file src/lib/features/collection/calendar.logic.ts logic L179 module src/lib/features/collection in3 t2
file src/lib/features/collection/collection-block-widget.ts other L507 module src/lib/features/collection in2 t6
file src/lib/features/collection/collection.logic.ts logic L505 module src/lib/features/collection in11 t32
file src/lib/features/collection/collection.service.ts service L220 module src/lib/features/collection in4 t22
file src/lib/features/collection/collection.store.svelte.ts store L83 module src/lib/features/collection in13 t44
file src/lib/features/collection/collection.types.ts types L117 module src/lib/features/collection in37 t0
file src/lib/features/collection/expression/date-value.logic.ts logic L24 module src/lib/features/collection in1 t1
file src/lib/features/collection/expression/duration.logic.ts logic L71 module src/lib/features/collection in1 t1
file src/lib/features/collection/expression/evaluator.ts other L725 module src/lib/features/collection in3 t4
file src/lib/features/collection/expression/expression.types.ts types L125 module src/lib/features/collection in7 t1
file src/lib/features/collection/expression/methods.logic.ts logic L285 module src/lib/features/collection in1 t1
file src/lib/features/collection/expression/parser.ts other L231 module src/lib/features/collection in5 t1
file src/lib/features/collection/expression/tokenizer.ts other L181 module src/lib/features/collection in1 t1
file src/lib/features/collection/key-edit.logic.ts logic L100 module src/lib/features/collection in2 t1
file src/lib/features/collection/linear-calendar.logic.ts logic L322 module src/lib/features/collection in2 t2
file src/lib/features/collection/toolbar/CalendarConfigPanel.svelte component L144 module src/lib/features/collection in1 t0
file src/lib/features/collection/toolbar/FilterPanel.svelte component L216 module src/lib/features/collection in4 t1
file src/lib/features/collection/toolbar/FilterRow.svelte component L188 module src/lib/features/collection in1 t1
file src/lib/features/collection/toolbar/FormulaRow.svelte component L91 module src/lib/features/collection in1 t1
file src/lib/features/collection/toolbar/PropertiesPanel.svelte component L168 module src/lib/features/collection in1 t0
file src/lib/features/collection/toolbar/SortPanel.svelte component L159 module src/lib/features/collection in2 t0
file src/lib/features/collection/toolbar/filter.logic.ts logic L560 module src/lib/features/collection in9 t9
file src/lib/features/collection/toolbar/formula.logic.ts logic L144 module src/lib/features/collection in3 t2
file src/lib/features/collection/toolbar/properties.logic.ts logic L80 module src/lib/features/collection in2 t2
file src/lib/features/collection/toolbar/sort.logic.ts logic L54 module src/lib/features/collection in1 t1
file src/lib/features/collection/toolbar/toolbar.types.ts types L106 module src/lib/features/collection in13 t1
file src/lib/features/collection/view-row-set.port.ts other L65 module src/lib/features/collection in4 t2
file src/lib/features/collection/yaml-parser.ts other L430 module src/lib/features/collection in11 t18
## public
sym src/lib/features/collection/CollectionView.svelte:1 component CollectionView props:path,yamlContent,onYamlChange,rewriteView L736
sym src/lib/features/collection/collection-block-widget.ts:68 fn clearCollectionCache(): void L3 | Drops all cached renders.
sym src/lib/features/collection/collection-block-widget.ts:418 const collectionBlockRenderer: FencedBlockRenderer L7 | Renders `` ```collection `` blocks; the app installs it in the editor's `fencedBlockRenderers`.
sym src/lib/features/collection/collection.logic.ts:22 fn buildNoteRecord(filePath: string, content: string, mtime = 0, ctime = 0, size = 0): PropertyIndexRecord L22 | Builds a PropertyIndexRecord from a file path and its content.
sym src/lib/features/collection/collection.logic.ts:132 fn executeQuery(definition: CollectionDefinition, view: CollectionViewDef, index: Map<string, PropertyIndexRecord>, vaultPath: string … L91 | Executes a query against the property index using a collection definition and view.
sym src/lib/features/collection/collection.logic.ts:270 fn filterCitesArchived(filter: FilterItem | undefined): boolean L15 | Whether a filter cites the archived flag, which hands the archived rows of a `.view` to the filter instead of the default exclusion.
sym src/lib/features/collection/collection.logic.ts:326 fn evaluateFilter(filter: FilterItem, ctx: EvalContext, onLeafError?: (err: unknown) => void): boolean L26 | Evaluates a filter item (string expression or recursive filter object) against a note record.
sym src/lib/features/collection/collection.service.ts:30 fn createCollectionFile(parentPath: string): Promise<string> L6 | Creates the `Untitled.view` of New table in `parentPath` (`Untitled 1.view` when taken) with `NEW_TABLE_TEMPLATE`.
sym src/lib/features/collection/collection.service.ts:90 fn buildPropertyIndex(): Promise<void> L22 | Builds the property index from the Rust `VaultIndex`.
sym src/lib/features/collection/collection.service.ts:118 fn propertyIndexNeedsWholeRead(): boolean L3 | Whether the property index needs a whole read before per-path deltas can keep it current: it was never built, or the latest whole read failed (a failed full-re…
sym src/lib/features/collection/collection.service.ts:132 fn applyPropertyDelta(records: NoteRecordV2[], removed: Iterable<string>): void L7 | Patches the property index for the paths one `vault-index-updated` refresh window changed: `records` (from `get_index_delta`) replace or add their notes, `remo…
sym src/lib/features/collection/collection.service.ts:182 fn registerCollectionNoteChangeConsumer(): () => void L10 | Registers the property index as a note-change consumer, so `applyNoteChange` keeps it in sync on every write and eviction.
sym src/lib/features/collection/collection.service.ts:212 fn registerCollectionPathChangeConsumer(): () => void L3 | Registers the remembered view indexes as a path-change consumer, so a renamed or moved collection reopens on its last view.
sym src/lib/features/collection/collection.service.ts:217 fn resetCollection(): void L4 | Resets the collection store to its initial state.
sym src/lib/features/collection/collection.store.svelte.ts:28 store collectionStore L56 | Reactive store for the collection property index
sym src/lib/features/collection/collection.types.ts:4 type FilterItem L1 | Recursive filter type: an object with conjunctions or a string expression
sym src/lib/features/collection/collection.types.ts:7 interface CollectionFilter L8 | Boolean-logic filter with and/or/not conjunctions
sym src/lib/features/collection/collection.types.ts:17 interface SortDef L6 | Sort definition for a single column
sym src/lib/features/collection/collection.types.ts:31 interface CollectionViewDef L28 | Definition of a single view within a `.view` file or ` ```collection ` block
sym src/lib/features/collection/collection.types.ts:61 interface CollectionDefinition L14 | Root definition of a `.view` file or ` ```collection ` block
sym src/lib/features/collection/collection.types.ts:77 interface PropertyIndexRecord L20 | A note record in the property index
sym src/lib/features/collection/collection.types.ts:107 interface QueryResult L11 | Result of executing a query against the property index
sym src/lib/features/collection/expression/evaluator.ts:11 interface EvalContext L8 | Context provided to the evaluator for resolving properties and formulas
sym src/lib/features/collection/expression/evaluator.ts:77 fn evaluateExpression(expression: string, ctx: EvalContext): unknown L4 | Parses and evaluates an expression string in one call.
sym src/lib/features/collection/expression/evaluator.ts:308 fn validateExpression(expression: string): string | undefined L10 | Checks an expression without running it: it must parse and every plain function it calls must be one the evaluator handles.
sym src/lib/features/collection/expression/expression.types.ts:74 type ASTNode L11 | Union of all AST node types
sym src/lib/features/collection/expression/parser.ts:8 fn parse(expression: string): ASTNode L203 | Parses an expression string into an AST using recursive descent.
sym src/lib/features/collection/key-edit.logic.ts:34 fn sortedJson(value: unknown): string L7 | JSON with the keys of every object sorted, so key order never makes two values differ.
sym src/lib/features/collection/toolbar/FilterPanel.svelte:1 component FilterPanel props:globalFilters,viewFilters,availableProperties,propertyIndex,onGlobalFiltersChange,onViewFiltersChange,showGlobal= L216
sym src/lib/features/collection/toolbar/SortPanel.svelte:1 component SortPanel props:sorts,availableProperties,propertyConfigs,propertyIndex,onSortsChange,emptyText= L159
sym src/lib/features/collection/toolbar/filter.logic.ts:22 fn parseExpressionToRow(expr: string): FilterRow L10 | Tries to parse a simple expression into a visual FilterRow.
sym src/lib/features/collection/toolbar/filter.logic.ts:38 fn filterRowToExpression(row: FilterRow): string L51 | Converts a FilterRow back into an expression string for YAML serialization.
sym src/lib/features/collection/toolbar/filter.logic.ts:94 fn parseFilterToGroups(filter: CollectionFilter | string | undefined): FilterGroup[] L47 | Converts a CollectionFilter or string (from YAML) into FilterGroup[] for the visual UI.
sym src/lib/features/collection/toolbar/filter.logic.ts:146 fn filterGroupsToFilter(groups: FilterGroup[]): CollectionFilter | string | undefined L32 | Converts FilterGroup[] (from the UI) back into a CollectionFilter or string or undefined.
sym src/lib/features/collection/toolbar/filter.logic.ts:203 fn isUnaryOperator(op: FilterOperator): boolean L3 | Whether an operator takes no value: `filterRowToExpression` ignores the row's value for it, and the filter row shows no value input.
sym src/lib/features/collection/toolbar/filter.logic.ts:223 fn getAllKnownProperties(index: Map<string, PropertyIndexRecord>): string[] L16 | Collects all known note property names from the index plus standard file.* properties.
sym src/lib/features/collection/toolbar/filter.logic.ts:296 fn createEmptyExpressionRow(): FilterRow L3 | Creates an expression row with no text yet.
sym src/lib/features/collection/toolbar/filter.logic.ts:328 fn isFilterObject(item: unknown): item is CollectionFilter L5 | True for a non-null object whose `and` / `or` / `not`, where present, are lists.
sym src/lib/features/collection/toolbar/toolbar.types.ts:66 interface FilterRow L19 | A visual filter row (property + operator + value)
sym src/lib/features/collection/toolbar/toolbar.types.ts:87 interface FilterGroup L6 | A group of filters with a conjunction
sym src/lib/features/collection/view-row-set.port.ts:55 fn registerViewRowSetPort(port: ViewRowSetPort): () => void L6 | Installs the port a `.view` in the collection editor uses.
sym src/lib/features/collection/view-row-set.port.ts:63 fn getViewRowSetPort(): ViewRowSetPort | null L3 | The installed port, or null when none is registered (the editor then runs the plain query).
sym src/lib/features/collection/yaml-parser.ts:13 fn parseCollectionYaml(yamlString: string): ParseResult L111 | Parses a YAML string into a CollectionDefinition.
sym src/lib/features/collection/yaml-parser.ts:131 fn viewIndexByName(views: unknown, name: unknown): number L4 | Index of the first entry of `views` (raw YAML or parsed) whose `name` equals `name` exactly; -1 when none does.
sym src/lib/features/collection/yaml-parser.ts:142 fn railViewIndex(definition: Pick<CollectionDefinition, 'views' | 'railView'>): number L3 | Index of the view the rail runs (its note list, navigator count, Sort and Filter toolbar, and Edit view): the first view whose `name` equals `railView` exactly…
sym src/lib/features/collection/yaml-parser.ts:147 interface CollectionYamlUpdates L22 | Fields that can be updated in a `.view` YAML file
sym src/lib/features/collection/yaml-parser.ts:175 fn updateCollectionYaml(yamlString: string, updates: CollectionYamlUpdates): string L88 | Updates fields in a `.view` YAML string, preserving all other content.
sym src/lib/features/collection/yaml-parser.ts:265 interface ViewEdit L8 | What the Edit view dialog saves into a `.view`.
sym src/lib/features/collection/yaml-parser.ts:286 fn updateViewEditYaml(yamlString: string, edit: ViewEdit): ViewEditYamlResult L45 | Applies a ViewEdit to the view the rail runs (`railViewIndex`) of a `.view` YAML string, keeping every other key as a value (the YAML is re-serialized, so comm…
## stores
store src/lib/features/collection/collection.store.svelte.ts:28 collectionStore esc:0
## effects
fx-count dom.click 3
fx-count dom.mousedown 1
fx-count svelte.$effect 5
fx-count timer.queueMicrotask 1
fx-count timer.requestAnimationFrame 2
ipc-count ipc:get_all_property_records 1
## debt
-
