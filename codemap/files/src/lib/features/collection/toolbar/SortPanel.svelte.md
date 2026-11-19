# file card src/lib/features/collection/toolbar/SortPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/SortPanel.svelte ' codemap/files
file src/lib/features/collection/toolbar/SortPanel.svelte component L160 module src/lib/features/collection in2 t1
## imports
imp src/lib/features/collection/toolbar/SortPanel.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/collection/toolbar/SortPanel.svelte:3 -> src/lib/components/ui/dropdown-menu/index.ts DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem
imp src/lib/features/collection/toolbar/SortPanel.svelte:13 -> src/lib/features/collection/collection.types.ts type:SortDef,type:PropertyConfig,type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/SortPanel.svelte:14 -> src/lib/features/collection/collection.logic.ts columnLabel
imp src/lib/features/collection/toolbar/SortPanel.svelte:15 -> src/lib/features/collection/toolbar/filter.logic.ts inferPropertyType
imp src/lib/features/collection/toolbar/SortPanel.svelte:16 -> src/lib/features/collection/toolbar/sort.logic.ts removeSort,toggleSortDirection,reorderSorts,getSortDirectionLabel
## imported-by
imp src/lib/features/collection/CollectionView.svelte:28 -> src/lib/features/collection/toolbar/SortPanel.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:30 -> src/lib/features/collection/toolbar/SortPanel.svelte default
## reach
in2 src/lib/features/collection/toolbar/SortPanel.svelte 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/collection/toolbar/SortPanel.svelte 28 files in 5 modules: src/lib/components(18) src/lib/features/collection(5) src/lib/core/filesystem(2) src/lib/core/frontmatter(2) src/lib/utils(1)
## tests
test src/tests/lib/features/collection/toolbar/SortPanel.svelte.test.ts imports src/lib/features/collection/toolbar/SortPanel.svelte mirror
## symbols
sym src/lib/features/collection/toolbar/SortPanel.svelte:1 component SortPanel props:sorts,availableProperties,propertyConfigs,propertyIndex,onSortsChange,emptyText= L160
by src/lib/features/collection/toolbar/SortPanel.svelte:default <- src/lib/features/collection/CollectionView.svelte:657 in (markup) mount
by src/lib/features/collection/toolbar/SortPanel.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:820 in (markup) mount
## locals
local src/lib/features/collection/toolbar/SortPanel.svelte:48 fn getDisplayName(column: string): string L3
local src/lib/features/collection/toolbar/SortPanel.svelte:52 fn handleDragStart(index: number, event: DragEvent) L6
local src/lib/features/collection/toolbar/SortPanel.svelte:59 fn handleDragOver(index: number, event: DragEvent) L6
local src/lib/features/collection/toolbar/SortPanel.svelte:66 fn handleDrop(toIndex: number) L6
local src/lib/features/collection/toolbar/SortPanel.svelte:73 fn handleDragEnd() L3
## mounts
mount src/lib/features/collection/toolbar/SortPanel.svelte:99 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:100 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:108 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:109 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:116 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:127 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:144 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:145 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:146 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:151 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:153 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
## mounted-at
mount src/lib/features/collection/CollectionView.svelte:657 SortPanel -> src/lib/features/collection/toolbar/SortPanel.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:820 SortPanel -> src/lib/features/collection/toolbar/SortPanel.svelte
## calls
call src/lib/features/collection/toolbar/SortPanel.svelte:49 in getDisplayName -> src/lib/features/collection/collection.logic.ts:columnLabel call
call src/lib/features/collection/toolbar/SortPanel.svelte:68 in handleDrop -> src/lib/features/collection/toolbar/sort.logic.ts:reorderSorts call
call src/lib/features/collection/toolbar/SortPanel.svelte:80 in (markup) -> src/lib/features/collection/toolbar/filter.logic.ts:inferPropertyType markup
call src/lib/features/collection/toolbar/SortPanel.svelte:84 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:handleDragStart markup
call src/lib/features/collection/toolbar/SortPanel.svelte:85 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:handleDragOver markup
call src/lib/features/collection/toolbar/SortPanel.svelte:86 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:handleDrop markup
call src/lib/features/collection/toolbar/SortPanel.svelte:87 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:handleDragEnd markup
call src/lib/features/collection/toolbar/SortPanel.svelte:96 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:getDisplayName markup +1
call src/lib/features/collection/toolbar/SortPanel.svelte:104 in (markup) -> src/lib/features/collection/toolbar/sort.logic.ts:getSortDirectionLabel markup +2
call src/lib/features/collection/toolbar/SortPanel.svelte:111 in (markup) -> src/lib/features/collection/toolbar/sort.logic.ts:toggleSortDirection markup +1
call src/lib/features/collection/toolbar/SortPanel.svelte:131 in (markup) -> src/lib/features/collection/toolbar/sort.logic.ts:removeSort markup
