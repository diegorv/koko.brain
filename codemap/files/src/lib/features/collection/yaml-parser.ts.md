# file card src/lib/features/collection/yaml-parser.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/yaml-parser.ts ' codemap/files
file src/lib/features/collection/yaml-parser.ts other L430 module src/lib/features/collection in11 t18
## imports
imp src/lib/features/collection/yaml-parser.ts:2 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter,type:CollectionViewDef,type:SortDef
## imported-by
imp src/lib/features/collection/CollectionView.svelte:3 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml,addView,removeView,renameView,setViewType,type:CollectionYamlUpdates,type:ViewType
imp src/lib/features/collection/collection-block-widget.ts:3 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml
imp src/lib/features/collection/collection.types.ts:1 -> src/lib/features/collection/yaml-parser.ts type:ViewType
imp src/lib/features/collection/key-edit.logic.ts:2 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml,updateCollectionYaml,type:CollectionYamlUpdates
imp src/lib/features/rail-shell/RailNoteList.svelte:42 -> src/lib/features/collection/yaml-parser.ts railViewIndex
imp src/lib/features/rail-shell/lens.logic.ts:41 -> src/lib/features/collection/yaml-parser.ts railViewIndex
imp src/lib/features/type-definitions/ViewDialog.svelte:16 -> src/lib/features/collection/yaml-parser.ts railViewIndex
imp src/lib/features/type-definitions/type-definitions.service.ts:22 -> src/lib/features/collection/yaml-parser.ts updateViewEditYaml,type:ViewEdit
imp src/lib/features/type-definitions/type-note-list.logic.ts:4 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml,railViewIndex,updateCollectionYaml,type:CollectionYamlUpdates
imp src/lib/features/type-definitions/type-sidebar.logic.ts:6 -> src/lib/features/collection/yaml-parser.ts viewIndexByName
imp src/lib/features/type-definitions/view-parse-cache.ts:2 -> src/lib/features/collection/yaml-parser.ts parseCollectionYaml
## reach
in2 src/lib/features/collection/yaml-parser.ts 57 files in 12 modules: src/lib/features/collection(18) src/lib/features/rail-shell(13) src/lib/app(8) src/lib/features/auto-organize(4) src/lib/features/event-calendar(3) +7 modules: q impact src/lib/features/collection/yaml-parser.ts --depth 2
out2 src/lib/features/collection/yaml-parser.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/collection/yaml-parser.test.ts imports src/lib/features/collection/yaml-parser.ts mirror
test src/tests/help/collection-features.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/help/examples-scoping.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/help/type-definitions-views.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/app/boot.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/collection/CollectionView.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/collection/key-edit.logic.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/collection/view-relationship-filters.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/rail-shell/view-lens.service.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/type-definitions/type-note-list.logic.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/type-definitions/update-view-toolbar-key.service.test.ts imports src/lib/features/collection/yaml-parser.ts
test src/tests/lib/features/type-definitions/view-parse-cache.test.ts mocks src/lib/features/collection/yaml-parser.ts
## symbols
sym src/lib/features/collection/yaml-parser.ts:5 type ParseResult L3 | Result of parsing a `.view` or ` ```collection ` block YAML string
sym src/lib/features/collection/yaml-parser.ts:13 fn parseCollectionYaml(yamlString: string): ParseResult L111 | Parses a YAML string into a CollectionDefinition.
by src/lib/features/collection/yaml-parser.ts:parseCollectionYaml <- src/lib/features/collection/CollectionView.svelte:126 in parseResult=$derived call +2
by src/lib/features/collection/yaml-parser.ts:parseCollectionYaml <- src/lib/features/collection/collection-block-widget.ts:93 in CollectionBlockWidget.toDOM call
by src/lib/features/collection/yaml-parser.ts:parseCollectionYaml <- src/lib/features/collection/key-edit.logic.ts:79 in applyEditorKeyEdit call +2
by src/lib/features/collection/yaml-parser.ts:parseCollectionYaml <- src/lib/features/type-definitions/type-note-list.logic.ts:197 in applyToolbarEdit call
by src/lib/features/collection/yaml-parser.ts:parseCollectionYaml <- src/lib/features/type-definitions/view-parse-cache.ts:47 in refreshViewDefinition call +1
sym src/lib/features/collection/yaml-parser.ts:131 fn viewIndexByName(views: unknown, name: unknown): number L4 | Index of the first entry of `views` (raw YAML or parsed) whose `name` equals `name` exactly; -1 when none does.
by src/lib/features/collection/yaml-parser.ts:viewIndexByName <- src/lib/features/type-definitions/type-sidebar.logic.ts:453 in railViewNameNote call
sym src/lib/features/collection/yaml-parser.ts:142 fn railViewIndex(definition: Pick<CollectionDefinition, 'views' | 'railView'>): number L3 | Index of the view the rail runs (its note list, navigator count, Sort and Filter toolbar, and Edit view): the first view whose `name` equals `railView` exactly…
by src/lib/features/collection/yaml-parser.ts:railViewIndex <- src/lib/features/rail-shell/RailNoteList.svelte:272 in loadView call
by src/lib/features/collection/yaml-parser.ts:railViewIndex <- src/lib/features/rail-shell/lens.logic.ts:805 in queryViewLens call
by src/lib/features/collection/yaml-parser.ts:railViewIndex <- src/lib/features/type-definitions/ViewDialog.svelte:96 in load call
by src/lib/features/collection/yaml-parser.ts:railViewIndex <- src/lib/features/type-definitions/type-note-list.logic.ts:169 in toolbarKeyBase call +1
sym src/lib/features/collection/yaml-parser.ts:147 interface CollectionYamlUpdates L22 | Fields that can be updated in a `.view` YAML file
by src/lib/features/collection/yaml-parser.ts:CollectionYamlUpdates <- src/lib/features/collection/CollectionView.svelte:3 in (script) import
by src/lib/features/collection/yaml-parser.ts:CollectionYamlUpdates <- src/lib/features/collection/key-edit.logic.ts:2 in (module) import
by src/lib/features/collection/yaml-parser.ts:CollectionYamlUpdates <- src/lib/features/type-definitions/type-note-list.logic.ts:4 in (module) import
sym src/lib/features/collection/yaml-parser.ts:175 fn updateCollectionYaml(yamlString: string, updates: CollectionYamlUpdates): string L88 | Updates fields in a `.view` YAML string, preserving all other content.
by src/lib/features/collection/yaml-parser.ts:updateCollectionYaml <- src/lib/features/collection/key-edit.logic.ts:82 in applyEditorKeyEdit call +1
by src/lib/features/collection/yaml-parser.ts:updateCollectionYaml <- src/lib/features/type-definitions/type-note-list.logic.ts:207 in applyToolbarEdit call
sym src/lib/features/collection/yaml-parser.ts:265 interface ViewEdit L8 | What the Edit view dialog saves into a `.view`.
by src/lib/features/collection/yaml-parser.ts:ViewEdit <- src/lib/features/type-definitions/type-definitions.service.ts:22 in (module) import
sym src/lib/features/collection/yaml-parser.ts:275 type ViewEditYamlResult L1 | The rewritten YAML of updateViewEditYaml, or why it could not be rewritten.
sym src/lib/features/collection/yaml-parser.ts:286 fn updateViewEditYaml(yamlString: string, edit: ViewEdit): ViewEditYamlResult L45 | Applies a ViewEdit to the view the rail runs (`railViewIndex`) of a `.view` YAML string, keeping every other key as a value (the YAML is re-serialized, so comm…
by src/lib/features/collection/yaml-parser.ts:updateViewEditYaml <- src/lib/features/type-definitions/type-definitions.service.ts:544 in editView call
sym src/lib/features/collection/yaml-parser.ts:333 const VIEW_TYPES L1 | The view types the collection renders; `parseCollectionYaml` rejects any other.
sym src/lib/features/collection/yaml-parser.ts:336 type ViewType L1 | Supported view types for addView / setViewType.
by src/lib/features/collection/yaml-parser.ts:ViewType <- src/lib/features/collection/CollectionView.svelte:3 in (script) import
by src/lib/features/collection/yaml-parser.ts:ViewType <- src/lib/features/collection/collection.types.ts:1 in (module) import
sym src/lib/features/collection/yaml-parser.ts:344 fn addView(yamlString: string, name: string, type: ViewType = 'table'): string L13 | Appends a new view at the end of the `views:` array with the given type and name.
by src/lib/features/collection/yaml-parser.ts:addView <- src/lib/features/collection/CollectionView.svelte:431 in handleAddView call
sym src/lib/features/collection/yaml-parser.ts:364 fn removeView(yamlString: string, index: number): string L16 | Removes the view at the given index from the `views:` array.
by src/lib/features/collection/yaml-parser.ts:removeView <- src/lib/features/collection/CollectionView.svelte:450 in handleDeleteView call
sym src/lib/features/collection/yaml-parser.ts:388 fn renameView(yamlString: string, index: number, newName: string): string L20 | Renames the view at the given index.
by src/lib/features/collection/yaml-parser.ts:renameView <- src/lib/features/collection/CollectionView.svelte:478 in commitTabRename call
sym src/lib/features/collection/yaml-parser.ts:416 fn setViewType(yamlString: string, index: number, type: ViewType): string L15 | Changes the type of the view at the given index.
by src/lib/features/collection/yaml-parser.ts:setViewType <- src/lib/features/collection/CollectionView.svelte:456 in handleSetViewType call
## locals
local src/lib/features/collection/yaml-parser.ts:126 fn readRailView(value: unknown): string | undefined L3
## calls
call src/lib/features/collection/yaml-parser.ts:118 in parseCollectionYaml -> src/lib/features/collection/yaml-parser.ts:readRailView call
call src/lib/features/collection/yaml-parser.ts:143 in railViewIndex -> src/lib/features/collection/yaml-parser.ts:viewIndexByName call
call src/lib/features/collection/yaml-parser.ts:298 in updateViewEditYaml -> src/lib/features/collection/yaml-parser.ts:readRailView call
call src/lib/features/collection/yaml-parser.ts:298 in updateViewEditYaml -> src/lib/features/collection/yaml-parser.ts:viewIndexByName call +1
call src/lib/features/collection/yaml-parser.ts:403 in renameView -> src/lib/features/collection/yaml-parser.ts:viewIndexByName call
