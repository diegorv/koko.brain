# file card src/lib/features/collection/collection.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/collection.types.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols
file src/lib/features/collection/collection.types.ts types L117 module src/lib/features/collection in37 t0
## imports
imp src/lib/features/collection/collection.types.ts:1 -> src/lib/features/collection/yaml-parser.ts type:ViewType
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:24 -> src/lib/features/collection/collection.types.ts type:FilterItem
imp src/lib/features/auto-organize/auto-organize.logic.ts:12 -> src/lib/features/collection/collection.types.ts type:FilterItem,type:PropertyIndexRecord
imp src/lib/features/auto-organize/auto-organize.service.ts:46 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/auto-organize/auto-organize.types.ts:81 -> src/lib/features/collection/collection.types.ts type:FilterItem
imp src/lib/features/collection/CollectionCalendarView.svelte:2 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord
imp src/lib/features/collection/CollectionLinearCalendarView.svelte:2 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord
imp src/lib/features/collection/CollectionTableView.svelte:2 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord,type:SortDef
imp src/lib/features/collection/CollectionView.svelte:19 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord,type:SortDef,type:CollectionViewDef
imp src/lib/features/collection/calendar.logic.ts:2 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/collection-block-widget.ts:11 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord,type:CollectionViewDef,type:QueryResult
imp src/lib/features/collection/collection.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter,type:CollectionViewDef,type:FilterItem,type:PropertyIndexRecord,type:QueryColumn,type:QueryResult
imp src/lib/features/collection/collection.service.ts:9 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/collection.store.svelte.ts:1 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/expression/evaluator.ts:3 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/key-edit.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionViewDef
imp src/lib/features/collection/linear-calendar.logic.ts:2 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/FilterPanel.svelte:20 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/FilterRow.svelte:16 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:2 -> src/lib/features/collection/collection.types.ts type:PropertyConfig
imp src/lib/features/collection/toolbar/SortPanel.svelte:13 -> src/lib/features/collection/collection.types.ts type:SortDef,type:PropertyConfig,type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/filter.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionFilter,type:FilterItem,type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/properties.logic.ts:2 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/sort.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:SortDef
imp src/lib/features/collection/toolbar/toolbar.types.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionFilter
imp src/lib/features/collection/view-row-set.port.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionViewDef,type:PropertyIndexRecord
imp src/lib/features/collection/yaml-parser.ts:2 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter,type:CollectionViewDef,type:SortDef
imp src/lib/features/rail-shell/RailNoteList.svelte:30 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord,type:SortDef
imp src/lib/features/rail-shell/RailNoteList.svelte:43 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition
imp src/lib/features/rail-shell/TypesNavigator.svelte:47 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/rail-shell/lens.logic.ts:43 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionViewDef,type:PropertyIndexRecord,type:SortDef
imp src/lib/features/rail-shell/list-view-sort.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:SortDef
imp src/lib/features/rail-shell/view-lens.service.ts:1 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/type-definitions/type-definitions.service.ts:25 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter
imp src/lib/features/type-definitions/type-note-list.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter,type:CollectionViewDef,type:PropertyIndexRecord,type:SortDef
imp src/lib/features/type-definitions/type-sidebar.logic.ts:5 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:CollectionFilter
imp src/lib/plugins/mods/mod-query.service.ts:3 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:QueryResult
imp src/lib/plugins/queryjs/kb-api.ts:1 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/plugins/queryjs/queryjs.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
## reach
in2 src/lib/features/collection/collection.types.ts 40 files in 12 modules: src/lib/features/rail-shell(10) src/lib/app(9) src/lib/features/auto-organize(4) src/lib/features/type-definitions(4) src/lib/features/event-calendar(3) +7 modules: q impact src/lib/features/collection/collection.types.ts --depth 2
out2 src/lib/features/collection/collection.types.ts 0 files in 0 modules: -
## tests
test src/tests/fixtures/recent-view.fixture.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/help/collection-features.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/help/examples-scoping.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/help/queryjs-contract.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/help/queryjs-features-scoping.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/help/type-definitions-views.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/app/EditorView.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/auto-organize/auto-organize.logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/auto-organize/type-lifecycle-rules.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/CollectionTableView.svelte.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/CollectionView.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/calendar-logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/collection-block-widget.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/collection-logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/collection.service.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/expression/duration.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/expression/evaluator.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/expression/methods.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/key-edit.logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/linear-calendar-logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/portent-filters.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/toolbar/filter-logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/toolbar/properties-logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/toolbar/sort-logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/collection/view-relationship-filters.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/rail-shell/list-view-sort.logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/rail-shell/view-lens.service.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/type-definitions/type-note-list.logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/plugins/mods/mod-query.service.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/plugins/queryjs/kb-api-contract.test.ts imports-type src/lib/features/collection/collection.types.ts
test src/tests/lib/plugins/queryjs/kb-api.test.ts imports-type src/lib/features/collection/collection.types.ts
more tests 3 not shown: src/tests/lib/plugins/queryjs(3): q tests src/lib/features/collection/collection.types.ts
## symbols
sym src/lib/features/collection/collection.types.ts:4 type FilterItem L1 | Recursive filter type: an object with conjunctions or a string expression
by src/lib/features/collection/collection.types.ts:FilterItem <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:24 in (script) import
by src/lib/features/collection/collection.types.ts:FilterItem <- src/lib/features/auto-organize/auto-organize.logic.ts:12 in (module) import
by src/lib/features/collection/collection.types.ts:FilterItem <- src/lib/features/collection/collection.logic.ts:5 in (module) import
by src/lib/features/collection/collection.types.ts:FilterItem <- src/lib/features/collection/toolbar/filter.logic.ts:1 in (module) import
sym src/lib/features/collection/collection.types.ts:7 interface CollectionFilter L8 | Boolean-logic filter with and/or/not conjunctions
by src/lib/features/collection/collection.types.ts:CollectionFilter <- src/lib/features/collection/collection.logic.ts:3 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionFilter <- src/lib/features/collection/toolbar/filter.logic.ts:1 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionFilter <- src/lib/features/collection/toolbar/toolbar.types.ts:1 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionFilter <- src/lib/features/collection/yaml-parser.ts:2 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionFilter <- src/lib/features/type-definitions/type-definitions.service.ts:25 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionFilter <- src/lib/features/type-definitions/type-note-list.logic.ts:1 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionFilter <- src/lib/features/type-definitions/type-sidebar.logic.ts:5 in (module) import
sym src/lib/features/collection/collection.types.ts:17 interface SortDef L6 | Sort definition for a single column
by src/lib/features/collection/collection.types.ts:SortDef <- src/lib/features/collection/CollectionTableView.svelte:2 in (script) import
by src/lib/features/collection/collection.types.ts:SortDef <- src/lib/features/collection/CollectionView.svelte:19 in (script) import
by src/lib/features/collection/collection.types.ts:SortDef <- src/lib/features/collection/toolbar/SortPanel.svelte:13 in (script) import
by src/lib/features/collection/collection.types.ts:SortDef <- src/lib/features/collection/toolbar/sort.logic.ts:1 in (module) import
by src/lib/features/collection/collection.types.ts:SortDef <- src/lib/features/collection/yaml-parser.ts:2 in (module) import
by src/lib/features/collection/collection.types.ts:SortDef <- src/lib/features/rail-shell/RailNoteList.svelte:30 in (script) import
by src/lib/features/collection/collection.types.ts:SortDef <- src/lib/features/rail-shell/lens.logic.ts:43 in (module) import
by src/lib/features/collection/collection.types.ts:SortDef <- src/lib/features/rail-shell/list-view-sort.logic.ts:1 in (module) import
more by 1 not shown: src/lib/features/type-definitions(1): q importers src/lib/features/collection/collection.types.ts:SortDef
sym src/lib/features/collection/collection.types.ts:25 interface PropertyConfig L4 | Display configuration for a property
by src/lib/features/collection/collection.types.ts:PropertyConfig <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:2 in (script) import
by src/lib/features/collection/collection.types.ts:PropertyConfig <- src/lib/features/collection/toolbar/SortPanel.svelte:13 in (script) import
sym src/lib/features/collection/collection.types.ts:31 interface CollectionViewDef L28 | Definition of a single view within a `.view` file or ` ```collection ` block
by src/lib/features/collection/collection.types.ts:CollectionViewDef <- src/lib/features/collection/CollectionView.svelte:19 in (script) import
by src/lib/features/collection/collection.types.ts:CollectionViewDef <- src/lib/features/collection/collection-block-widget.ts:11 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionViewDef <- src/lib/features/collection/collection.logic.ts:4 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionViewDef <- src/lib/features/collection/key-edit.logic.ts:1 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionViewDef <- src/lib/features/collection/view-row-set.port.ts:1 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionViewDef <- src/lib/features/collection/yaml-parser.ts:2 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionViewDef <- src/lib/features/rail-shell/lens.logic.ts:43 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionViewDef <- src/lib/features/type-definitions/type-note-list.logic.ts:1 in (module) import
sym src/lib/features/collection/collection.types.ts:61 interface CollectionDefinition L14 | Root definition of a `.view` file or ` ```collection ` block
by src/lib/features/collection/collection.types.ts:CollectionDefinition <- src/lib/features/collection/collection.logic.ts:2 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionDefinition <- src/lib/features/collection/key-edit.logic.ts:1 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionDefinition <- src/lib/features/collection/toolbar/properties.logic.ts:2 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionDefinition <- src/lib/features/collection/view-row-set.port.ts:1 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionDefinition <- src/lib/features/collection/yaml-parser.ts:2 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionDefinition <- src/lib/features/rail-shell/RailNoteList.svelte:43 in (script) import
by src/lib/features/collection/collection.types.ts:CollectionDefinition <- src/lib/features/rail-shell/lens.logic.ts:43 in (module) import
by src/lib/features/collection/collection.types.ts:CollectionDefinition <- src/lib/features/type-definitions/type-definitions.service.ts:25 in (module) import
more by 3 not shown: src/lib/features/type-definitions(2) src/lib/plugins/mods(1): q importers src/lib/features/collection/collection.types.ts:CollectionDefinition
sym src/lib/features/collection/collection.types.ts:77 interface PropertyIndexRecord L20 | A note record in the property index
by src/lib/features/collection/collection.types.ts:PropertyIndexRecord <- src/lib/features/auto-organize/auto-organize.logic.ts:12 in (module) import
by src/lib/features/collection/collection.types.ts:PropertyIndexRecord <- src/lib/features/auto-organize/auto-organize.service.ts:46 in (module) import
by src/lib/features/collection/collection.types.ts:PropertyIndexRecord <- src/lib/features/collection/CollectionCalendarView.svelte:2 in (script) import
by src/lib/features/collection/collection.types.ts:PropertyIndexRecord <- src/lib/features/collection/CollectionLinearCalendarView.svelte:2 in (script) import
by src/lib/features/collection/collection.types.ts:PropertyIndexRecord <- src/lib/features/collection/CollectionTableView.svelte:2 in (script) import
by src/lib/features/collection/collection.types.ts:PropertyIndexRecord <- src/lib/features/collection/CollectionView.svelte:19 in (script) import
by src/lib/features/collection/collection.types.ts:PropertyIndexRecord <- src/lib/features/collection/calendar.logic.ts:2 in (module) import
by src/lib/features/collection/collection.types.ts:PropertyIndexRecord <- src/lib/features/collection/collection-block-widget.ts:11 in (module) import
more by 18 not shown: src/lib/features/collection(11) src/lib/features/rail-shell(4) src/lib/plugins/queryjs(2) src/lib/features/type-definitions(1): q importers src/lib/features/collection/collection.types.ts:PropertyIndexRecord
sym src/lib/features/collection/collection.types.ts:99 interface QueryColumn L6 | A column entry in a query result, pairing the original key with its display name
by src/lib/features/collection/collection.types.ts:QueryColumn <- src/lib/features/collection/collection.logic.ts:7 in (module) import
sym src/lib/features/collection/collection.types.ts:107 interface QueryResult L11 | Result of executing a query against the property index
by src/lib/features/collection/collection.types.ts:QueryResult <- src/lib/features/collection/CollectionCalendarView.svelte:2 in (script) import
by src/lib/features/collection/collection.types.ts:QueryResult <- src/lib/features/collection/CollectionLinearCalendarView.svelte:2 in (script) import
by src/lib/features/collection/collection.types.ts:QueryResult <- src/lib/features/collection/CollectionTableView.svelte:2 in (script) import
by src/lib/features/collection/collection.types.ts:QueryResult <- src/lib/features/collection/CollectionView.svelte:19 in (script) import
by src/lib/features/collection/collection.types.ts:QueryResult <- src/lib/features/collection/collection-block-widget.ts:11 in (module) import
by src/lib/features/collection/collection.types.ts:QueryResult <- src/lib/features/collection/collection.logic.ts:8 in (module) import
by src/lib/features/collection/collection.types.ts:QueryResult <- src/lib/plugins/mods/mod-query.service.ts:3 in (module) import
