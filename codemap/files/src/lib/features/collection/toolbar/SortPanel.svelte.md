# file card src/lib/features/collection/toolbar/SortPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/SortPanel.svelte ' codemap/files
file src/lib/features/collection/toolbar/SortPanel.svelte component L159 module src/lib/features/collection in2 t0
## imports
imp src/lib/features/collection/toolbar/SortPanel.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/collection/toolbar/SortPanel.svelte:3 -> src/lib/components/ui/dropdown-menu/index.ts DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem
imp src/lib/features/collection/toolbar/SortPanel.svelte:13 -> src/lib/features/collection/collection.types.ts type:SortDef,type:PropertyConfig,type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/SortPanel.svelte:14 -> src/lib/features/collection/toolbar/filter.logic.ts inferPropertyType
imp src/lib/features/collection/toolbar/SortPanel.svelte:15 -> src/lib/features/collection/toolbar/sort.logic.ts removeSort,toggleSortDirection,reorderSorts,getSortDirectionLabel
## imported-by
imp src/lib/features/collection/CollectionView.svelte:27 -> src/lib/features/collection/toolbar/SortPanel.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:28 -> src/lib/features/collection/toolbar/SortPanel.svelte default
## reach
in2 src/lib/features/collection/toolbar/SortPanel.svelte 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/collection/toolbar/SortPanel.svelte 24 files in 4 modules: src/lib/components(18) src/lib/features/collection(4) src/lib/core/filesystem(1) src/lib/core/frontmatter(1)
## symbols
sym src/lib/features/collection/toolbar/SortPanel.svelte:1 component SortPanel props:sorts,availableProperties,propertyConfigs,propertyIndex,onSortsChange,emptyText= L159
by src/lib/features/collection/toolbar/SortPanel.svelte:default <- src/lib/features/collection/CollectionView.svelte:631 in (markup) mount
by src/lib/features/collection/toolbar/SortPanel.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:761 in (markup) mount
## locals
local src/lib/features/collection/toolbar/SortPanel.svelte:47 fn getDisplayName(column: string): string L3
local src/lib/features/collection/toolbar/SortPanel.svelte:51 fn handleDragStart(index: number, event: DragEvent) L6
local src/lib/features/collection/toolbar/SortPanel.svelte:58 fn handleDragOver(index: number, event: DragEvent) L6
local src/lib/features/collection/toolbar/SortPanel.svelte:65 fn handleDrop(toIndex: number) L6
local src/lib/features/collection/toolbar/SortPanel.svelte:72 fn handleDragEnd() L3
## mounts
mount src/lib/features/collection/toolbar/SortPanel.svelte:98 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:99 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:107 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:108 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:115 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:126 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:143 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:144 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:145 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:150 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/SortPanel.svelte:152 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
## mounted-at
mount src/lib/features/collection/CollectionView.svelte:631 SortPanel -> src/lib/features/collection/toolbar/SortPanel.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:761 SortPanel -> src/lib/features/collection/toolbar/SortPanel.svelte
## calls
call src/lib/features/collection/toolbar/SortPanel.svelte:67 in handleDrop -> src/lib/features/collection/toolbar/sort.logic.ts:reorderSorts call
call src/lib/features/collection/toolbar/SortPanel.svelte:79 in (markup) -> src/lib/features/collection/toolbar/filter.logic.ts:inferPropertyType markup
call src/lib/features/collection/toolbar/SortPanel.svelte:83 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:handleDragStart markup
call src/lib/features/collection/toolbar/SortPanel.svelte:84 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:handleDragOver markup
call src/lib/features/collection/toolbar/SortPanel.svelte:85 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:handleDrop markup
call src/lib/features/collection/toolbar/SortPanel.svelte:86 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:handleDragEnd markup
call src/lib/features/collection/toolbar/SortPanel.svelte:95 in (markup) -> src/lib/features/collection/toolbar/SortPanel.svelte:getDisplayName markup +1
call src/lib/features/collection/toolbar/SortPanel.svelte:103 in (markup) -> src/lib/features/collection/toolbar/sort.logic.ts:getSortDirectionLabel markup +2
call src/lib/features/collection/toolbar/SortPanel.svelte:110 in (markup) -> src/lib/features/collection/toolbar/sort.logic.ts:toggleSortDirection markup +1
call src/lib/features/collection/toolbar/SortPanel.svelte:130 in (markup) -> src/lib/features/collection/toolbar/sort.logic.ts:removeSort markup
