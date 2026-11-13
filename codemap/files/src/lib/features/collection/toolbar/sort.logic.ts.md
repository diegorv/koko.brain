# file card src/lib/features/collection/toolbar/sort.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/sort.logic.ts ' codemap/files
file src/lib/features/collection/toolbar/sort.logic.ts logic L54 module src/lib/features/collection in1 t1
## imports
imp src/lib/features/collection/toolbar/sort.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:SortDef
imp src/lib/features/collection/toolbar/sort.logic.ts:2 -> src/lib/core/frontmatter/properties.types.ts type:PropertyType
## imported-by
imp src/lib/features/collection/toolbar/SortPanel.svelte:15 -> src/lib/features/collection/toolbar/sort.logic.ts removeSort,toggleSortDirection,reorderSorts,getSortDirectionLabel
## reach
in2 src/lib/features/collection/toolbar/sort.logic.ts 2 files in 2 modules: src/lib/features/collection(1) src/lib/features/rail-shell(1)
out2 src/lib/features/collection/toolbar/sort.logic.ts 1 files in 1 modules: src/lib/features/collection(1)
## tests
test src/tests/lib/features/collection/toolbar/sort-logic.test.ts imports src/lib/features/collection/toolbar/sort.logic.ts
## symbols
sym src/lib/features/collection/toolbar/sort.logic.ts:7 fn removeSort(sorts: SortDef[], column: string): SortDef[] L3 | Removes the sort for a given column.
by src/lib/features/collection/toolbar/sort.logic.ts:removeSort <- src/lib/features/collection/toolbar/SortPanel.svelte:130 in (markup) markup
sym src/lib/features/collection/toolbar/sort.logic.ts:15 fn toggleSortDirection(sorts: SortDef[], column: string): SortDef[] L7 | Toggles the direction of a sort (ASC <-> DESC).
by src/lib/features/collection/toolbar/sort.logic.ts:toggleSortDirection <- src/lib/features/collection/toolbar/SortPanel.svelte:110 in (markup) markup +1
sym src/lib/features/collection/toolbar/sort.logic.ts:27 fn reorderSorts(sorts: SortDef[], fromIndex: number, toIndex: number): SortDef[] L10 | Moves a sort from one index to another (for drag-reorder).
by src/lib/features/collection/toolbar/sort.logic.ts:reorderSorts <- src/lib/features/collection/toolbar/SortPanel.svelte:67 in handleDrop call
sym src/lib/features/collection/toolbar/sort.logic.ts:42 fn getSortDirectionLabel(direction: 'ASC' | 'DESC', propertyType: PropertyType): string L13 | Returns a human-readable label for a sort direction based on property type.
by src/lib/features/collection/toolbar/sort.logic.ts:getSortDirectionLabel <- src/lib/features/collection/toolbar/SortPanel.svelte:103 in (markup) markup +2
