# file card src/lib/features/collection/CollectionTableView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/CollectionTableView.svelte ' codemap/files
file src/lib/features/collection/CollectionTableView.svelte component L97 module src/lib/features/collection in1 t1
## imports
imp src/lib/features/collection/CollectionTableView.svelte:2 -> src/lib/features/collection/collection.types.ts type:QueryResult,type:PropertyIndexRecord,type:SortDef
imp src/lib/features/collection/CollectionTableView.svelte:3 -> src/lib/features/collection/collection.logic.ts formatCellValue,getPropertyValue
imp src/lib/features/collection/CollectionTableView.svelte:4 -> src/lib/features/collection/expression/expression.types.ts isDisplayValue
imp src/lib/features/collection/CollectionTableView.svelte:5 -> src/lib/utils/sanitize.ts sanitizeHtml
## imported-by
imp src/lib/features/collection/CollectionView.svelte:23 -> src/lib/features/collection/CollectionTableView.svelte default
## reach
in2 src/lib/features/collection/CollectionTableView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/collection/CollectionTableView.svelte 7 files in 4 modules: src/lib/features/collection(3) src/lib/core/filesystem(2) src/lib/core/frontmatter(1) src/lib/utils(1)
## tests
test src/tests/lib/features/collection/CollectionTableView.svelte.test.ts imports src/lib/features/collection/CollectionTableView.svelte mirror
## symbols
sym src/lib/features/collection/CollectionTableView.svelte:1 component CollectionTableView props:result,currentSort=,onClickRow,onToggleSort L97
by src/lib/features/collection/CollectionTableView.svelte:default <- src/lib/features/collection/CollectionView.svelte:726 in (markup) mount
## locals
local src/lib/features/collection/CollectionTableView.svelte:27 fn getSortIndicator(column: string): string L5
## mounted-at
mount src/lib/features/collection/CollectionView.svelte:726 CollectionTableView -> src/lib/features/collection/CollectionTableView.svelte
## calls
call src/lib/features/collection/CollectionTableView.svelte:48 in (markup) -> src/lib/features/collection/CollectionTableView.svelte:getSortIndicator markup
call src/lib/features/collection/CollectionTableView.svelte:60 in (markup) -> src/lib/features/collection/collection.logic.ts:getPropertyValue markup
call src/lib/features/collection/CollectionTableView.svelte:66 in (markup) -> src/lib/features/collection/expression/expression.types.ts:isDisplayValue markup
call src/lib/features/collection/CollectionTableView.svelte:74 in (markup) -> src/lib/utils/sanitize.ts:sanitizeHtml markup
call src/lib/features/collection/CollectionTableView.svelte:77 in (markup) -> src/lib/features/collection/collection.logic.ts:formatCellValue markup
