# file card src/lib/features/collection/toolbar/properties.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/properties.logic.ts ' codemap/files
file src/lib/features/collection/toolbar/properties.logic.ts logic L80 module src/lib/features/collection in2 t2
## imports
imp src/lib/features/collection/toolbar/properties.logic.ts:1 -> src/lib/core/filesystem/fs.logic.ts isViewFile
imp src/lib/features/collection/toolbar/properties.logic.ts:2 -> src/lib/features/collection/collection.types.ts type:CollectionDefinition,type:PropertyIndexRecord
## imported-by
imp src/lib/features/collection/CollectionView.svelte:29 -> src/lib/features/collection/toolbar/properties.logic.ts getAllAvailableColumns
imp src/lib/features/collection/toolbar/PropertiesPanel.svelte:4 -> src/lib/features/collection/toolbar/properties.logic.ts toggleColumn
## reach
in2 src/lib/features/collection/toolbar/properties.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/toolbar/properties.logic.ts 3 files in 3 modules: src/lib/core/filesystem(1) src/lib/features/collection(1) src/lib/utils(1)
## tests
test src/tests/lib/features/collection/toolbar/properties-logic.test.ts imports src/lib/features/collection/toolbar/properties.logic.ts
test src/tests/lib/features/collection/toolbar/suggestions-skip-views.test.ts imports src/lib/features/collection/toolbar/properties.logic.ts
## symbols
sym src/lib/features/collection/toolbar/properties.logic.ts:8 fn getAllAvailableColumns(index: Map<string, PropertyIndexRecord>, definition: CollectionDefinition): string[] L34 | Returns all possible columns: file.*, the notes' frontmatter properties, formula.* Sorted: file.name first, then frontmatter (alphabetical), then formulas (alp…
by src/lib/features/collection/toolbar/properties.logic.ts:getAllAvailableColumns <- src/lib/features/collection/CollectionView.svelte:230 in allColumns=$derived call
sym src/lib/features/collection/toolbar/properties.logic.ts:47 fn toggleColumn(currentOrder: string[], column: string, visible: boolean, allColumns: string[]): string[] L34 | Toggles a column's visibility by adding or removing it from the order array.
by src/lib/features/collection/toolbar/properties.logic.ts:toggleColumn <- src/lib/features/collection/toolbar/PropertiesPanel.svelte:62 in handleToggle call
## calls
call src/lib/features/collection/toolbar/properties.logic.ts:24 in getAllAvailableColumns -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
