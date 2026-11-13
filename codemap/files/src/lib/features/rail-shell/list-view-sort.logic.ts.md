# file card src/lib/features/rail-shell/list-view-sort.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-view-sort.logic.ts ' codemap/files
file src/lib/features/rail-shell/list-view-sort.logic.ts logic L68 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/list-view-sort.logic.ts:1 -> src/lib/features/collection/collection.types.ts type:SortDef
imp src/lib/features/rail-shell/list-view-sort.logic.ts:2 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig,type:ListSortOption
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:87 -> src/lib/features/rail-shell/list-view-sort.logic.ts listSortToSortDef,viewListSort
## reach
in2 src/lib/features/rail-shell/list-view-sort.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-view-sort.logic.ts 1 files in 1 modules: src/lib/features/collection(1)
## tests
test src/tests/lib/features/rail-shell/list-view-sort.logic.test.ts imports src/lib/features/rail-shell/list-view-sort.logic.ts mirror
## symbols
sym src/lib/features/rail-shell/list-view-sort.logic.ts:9 fn sortDefToListSort(def: SortDef): ListSortConfig L16 | Maps a view's `sort:` column to the Sort dropdown's option.
sym src/lib/features/rail-shell/list-view-sort.logic.ts:27 fn listSortToSortDef(config: ListSortConfig): SortDef L4 | Inverse of `sortDefToListSort`.
by src/lib/features/rail-shell/list-view-sort.logic.ts:listSortToSortDef <- src/lib/features/rail-shell/RailNoteList.svelte:468 in handleSortSelect call
sym src/lib/features/rail-shell/list-view-sort.logic.ts:53 fn viewListSort(sorts: readonly SortDef[], frontmatterSort: string): ListSortConfig L16 | The order a view's list shows.
by src/lib/features/rail-shell/list-view-sort.logic.ts:viewListSort <- src/lib/features/rail-shell/RailNoteList.svelte:560 in sortMenuConfig=$derived call
## locals
local src/lib/features/rail-shell/list-view-sort.logic.ts:33 fn sortColumnFor(option: ListSortOption): string L14
## calls
call src/lib/features/rail-shell/list-view-sort.logic.ts:29 in listSortToSortDef -> src/lib/features/rail-shell/list-view-sort.logic.ts:sortColumnFor call
call src/lib/features/rail-shell/list-view-sort.logic.ts:55 in viewListSort -> src/lib/features/rail-shell/list-view-sort.logic.ts:sortDefToListSort call
