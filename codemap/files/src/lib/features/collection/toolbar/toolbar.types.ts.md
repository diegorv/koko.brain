# file card src/lib/features/collection/toolbar/toolbar.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/toolbar.types.ts ' codemap/files
file src/lib/features/collection/toolbar/toolbar.types.ts types L106 module src/lib/features/collection in13 t1
## imports
imp src/lib/features/collection/toolbar/toolbar.types.ts:1 -> src/lib/features/collection/collection.types.ts type:CollectionFilter
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:25 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/auto-organize/auto-organize.logic.ts:21 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterRow
imp src/lib/features/collection/CollectionView.svelte:20 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup,type:FormulaEntry
imp src/lib/features/collection/toolbar/FilterPanel.svelte:17 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterConjunction,type:FilterGroup,type:FilterRow
imp src/lib/features/collection/toolbar/FilterPanel.svelte:18 -> src/lib/features/collection/toolbar/toolbar.types.ts CONJUNCTION_LABELS
imp src/lib/features/collection/toolbar/FilterRow.svelte:13 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterRow,type:FilterOperator
imp src/lib/features/collection/toolbar/FilterRow.svelte:14 -> src/lib/features/collection/toolbar/toolbar.types.ts OPERATOR_LABELS
imp src/lib/features/collection/toolbar/FormulaRow.svelte:6 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FormulaEntry
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:3 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FormulaEntry
imp src/lib/features/collection/toolbar/filter.logic.ts:6 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterConjunction,type:FilterGroup,type:FilterOperator,type:FilterRow
imp src/lib/features/collection/toolbar/formula.logic.ts:1 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FormulaEntry
imp src/lib/features/rail-shell/RailNoteList.svelte:31 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/rail-shell/lens.logic.ts:44 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/type-definitions/ViewDialog.svelte:15 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
imp src/lib/features/type-definitions/type-note-list.logic.ts:2 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterGroup
## reach
in2 src/lib/features/collection/toolbar/toolbar.types.ts 24 files in 9 modules: src/lib/features/rail-shell(10) src/lib/app(5) src/lib/features/auto-organize(3) src/lib/features/collection(1) src/lib/features/note-list(1) +4 modules: q impact src/lib/features/collection/toolbar/toolbar.types.ts --depth 2
out2 src/lib/features/collection/toolbar/toolbar.types.ts 1 files in 1 modules: src/lib/features/collection(1)
## tests
test src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts imports src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/auto-organize/auto-organize.logic.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/collection/toolbar/FilterRow.svelte.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/collection/toolbar/FormulaRow.svelte.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/collection/toolbar/filter-logic.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/collection/toolbar/formula-logic.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/type-definitions/type-note-list.logic.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
test src/tests/lib/features/type-definitions/type-sidebar.logic.test.ts imports-type src/lib/features/collection/toolbar/toolbar.types.ts
## symbols
sym src/lib/features/collection/toolbar/toolbar.types.ts:4 type FilterOperator L26 | Filter operators available in the visual filter UI
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterOperator <- src/lib/features/collection/toolbar/FilterRow.svelte:13 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterOperator <- src/lib/features/collection/toolbar/filter.logic.ts:6 in (module) import
sym src/lib/features/collection/toolbar/toolbar.types.ts:32 const OPERATOR_LABELS: Record<FilterOperator, string> L22 | Human-readable labels for filter operators
by src/lib/features/collection/toolbar/toolbar.types.ts:OPERATOR_LABELS <- src/lib/features/collection/toolbar/FilterRow.svelte:160 in (markup) markup +1
sym src/lib/features/collection/toolbar/toolbar.types.ts:56 type FilterConjunction L1 | Conjunction type for a filter group
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterConjunction <- src/lib/features/collection/toolbar/FilterPanel.svelte:17 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterConjunction <- src/lib/features/collection/toolbar/filter.logic.ts:6 in (module) import
sym src/lib/features/collection/toolbar/toolbar.types.ts:59 const CONJUNCTION_LABELS: Record<FilterConjunction, string> L5 | Human-readable labels for conjunctions
by src/lib/features/collection/toolbar/toolbar.types.ts:CONJUNCTION_LABELS <- src/lib/features/collection/toolbar/FilterPanel.svelte:114 in (markup) markup +3
sym src/lib/features/collection/toolbar/toolbar.types.ts:66 interface FilterRow L19 | A visual filter row (property + operator + value)
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterRow <- src/lib/features/auto-organize/auto-organize.logic.ts:21 in (module) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterRow <- src/lib/features/collection/toolbar/FilterPanel.svelte:17 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterRow <- src/lib/features/collection/toolbar/FilterRow.svelte:13 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterRow <- src/lib/features/collection/toolbar/filter.logic.ts:6 in (module) import
sym src/lib/features/collection/toolbar/toolbar.types.ts:87 interface FilterGroup L6 | A group of filters with a conjunction
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterGroup <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:25 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterGroup <- src/lib/features/collection/CollectionView.svelte:20 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterGroup <- src/lib/features/collection/toolbar/FilterPanel.svelte:17 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterGroup <- src/lib/features/collection/toolbar/filter.logic.ts:6 in (module) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterGroup <- src/lib/features/rail-shell/RailNoteList.svelte:31 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterGroup <- src/lib/features/rail-shell/lens.logic.ts:44 in (module) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterGroup <- src/lib/features/type-definitions/ViewDialog.svelte:15 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FilterGroup <- src/lib/features/type-definitions/type-note-list.logic.ts:2 in (module) import
sym src/lib/features/collection/toolbar/toolbar.types.ts:95 interface FormulaEntry L12 | A formula entry for the visual formula management UI
by src/lib/features/collection/toolbar/toolbar.types.ts:FormulaEntry <- src/lib/features/collection/CollectionView.svelte:20 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FormulaEntry <- src/lib/features/collection/toolbar/FormulaRow.svelte:6 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FormulaEntry <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:3 in (script) import
by src/lib/features/collection/toolbar/toolbar.types.ts:FormulaEntry <- src/lib/features/collection/toolbar/formula.logic.ts:1 in (module) import
