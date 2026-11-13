# file card src/lib/features/collection/toolbar/FilterPanel.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/collection/toolbar/FilterPanel.svelte ' codemap/files
file src/lib/features/collection/toolbar/FilterPanel.svelte component L216 module src/lib/features/collection in4 t1
## imports
imp src/lib/features/collection/toolbar/FilterPanel.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/collection/toolbar/FilterPanel.svelte:3 -> src/lib/components/ui/separator/index.ts Separator
imp src/lib/features/collection/toolbar/FilterPanel.svelte:4 -> src/lib/components/ui/collapsible/index.ts Collapsible,CollapsibleTrigger,CollapsibleContent
imp src/lib/features/collection/toolbar/FilterPanel.svelte:9 -> src/lib/components/ui/dropdown-menu/index.ts DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem
imp src/lib/features/collection/toolbar/FilterPanel.svelte:17 -> src/lib/features/collection/toolbar/toolbar.types.ts type:FilterConjunction,type:FilterGroup,type:FilterRow
imp src/lib/features/collection/toolbar/FilterPanel.svelte:18 -> src/lib/features/collection/toolbar/toolbar.types.ts CONJUNCTION_LABELS
imp src/lib/features/collection/toolbar/FilterPanel.svelte:19 -> src/lib/features/collection/toolbar/filter.logic.ts createEmptyFilterRow,inferPropertyType
imp src/lib/features/collection/toolbar/FilterPanel.svelte:20 -> src/lib/features/collection/collection.types.ts type:PropertyIndexRecord
imp src/lib/features/collection/toolbar/FilterPanel.svelte:21 -> src/lib/features/collection/toolbar/FilterRow.svelte default
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:23 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/collection/CollectionView.svelte:26 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/rail-shell/RailNoteList.svelte:27 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
imp src/lib/features/type-definitions/ViewDialog.svelte:8 -> src/lib/features/collection/toolbar/FilterPanel.svelte default
## reach
in2 src/lib/features/collection/toolbar/FilterPanel.svelte 5 files in 3 modules: src/lib/app(2) src/lib/features/rail-shell(2) src/lib/features/auto-organize(1)
out2 src/lib/features/collection/toolbar/FilterPanel.svelte 28 files in 4 modules: src/lib/components(22) src/lib/features/collection(4) src/lib/core/filesystem(1) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/features/collection/toolbar/FilterPanel.svelte.test.ts imports src/lib/features/collection/toolbar/FilterPanel.svelte mirror
## symbols
sym src/lib/features/collection/toolbar/FilterPanel.svelte:1 component FilterPanel props:globalFilters,viewFilters,availableProperties,propertyIndex,onGlobalFiltersChange,onViewFiltersChange,showGlobal= L216
by src/lib/features/collection/toolbar/FilterPanel.svelte:default <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:332 in (markup) mount
by src/lib/features/collection/toolbar/FilterPanel.svelte:default <- src/lib/features/collection/CollectionView.svelte:654 in (markup) mount
by src/lib/features/collection/toolbar/FilterPanel.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:784 in (markup) mount
by src/lib/features/collection/toolbar/FilterPanel.svelte:default <- src/lib/features/type-definitions/ViewDialog.svelte:202 in (markup) mount
## locals
local src/lib/features/collection/toolbar/FilterPanel.svelte:57 fn updateRow(groups: FilterGroup[], groupIdx: number, rowIdx: number, row: FilterRowType): FilterGroup[] L7
local src/lib/features/collection/toolbar/FilterPanel.svelte:65 fn removeRow(groups: FilterGroup[], groupIdx: number, rowIdx: number): FilterGroup[] L7
local src/lib/features/collection/toolbar/FilterPanel.svelte:73 fn addFilter(groups: FilterGroup[]): FilterGroup[] L13
local src/lib/features/collection/toolbar/FilterPanel.svelte:87 fn changeConjunction(groups: FilterGroup[], groupIdx: number, conjunction: FilterConjunction): FilterGroup[] L5
## mounts
mount src/lib/features/collection/toolbar/FilterPanel.svelte:97 Collapsible -> src/lib/components/ui/collapsible/collapsible.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:98 CollapsibleTrigger -> src/lib/components/ui/collapsible/collapsible-trigger.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:107 CollapsibleContent -> src/lib/components/ui/collapsible/collapsible-content.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:111 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:112 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:117 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:119 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:131 FilterRow -> src/lib/features/collection/toolbar/FilterRow.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:142 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:155 Separator -> src/lib/components/ui/separator/separator.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:159 Collapsible -> src/lib/components/ui/collapsible/collapsible.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:160 CollapsibleTrigger -> src/lib/components/ui/collapsible/collapsible-trigger.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:169 CollapsibleContent -> src/lib/components/ui/collapsible/collapsible-content.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:173 DropdownMenu -> src/lib/components/ui/dropdown-menu/dropdown-menu.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:174 DropdownMenuTrigger -> src/lib/components/ui/dropdown-menu/dropdown-menu-trigger.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:179 DropdownMenuContent -> src/lib/components/ui/dropdown-menu/dropdown-menu-content.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:181 DropdownMenuItem -> src/lib/components/ui/dropdown-menu/dropdown-menu-item.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:193 FilterRow -> src/lib/features/collection/toolbar/FilterRow.svelte
mount src/lib/features/collection/toolbar/FilterPanel.svelte:204 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:332 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/collection/CollectionView.svelte:654 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/rail-shell/RailNoteList.svelte:784 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
mount src/lib/features/type-definitions/ViewDialog.svelte:202 FilterPanel -> src/lib/features/collection/toolbar/FilterPanel.svelte
## calls
call src/lib/features/collection/toolbar/FilterPanel.svelte:75 in addFilter -> src/lib/features/collection/toolbar/filter.logic.ts:inferPropertyType call
call src/lib/features/collection/toolbar/FilterPanel.svelte:76 in addFilter -> src/lib/features/collection/toolbar/filter.logic.ts:createEmptyFilterRow call
call src/lib/features/collection/toolbar/FilterPanel.svelte:121 in (markup) -> src/lib/features/collection/toolbar/FilterPanel.svelte:changeConjunction markup +1
call src/lib/features/collection/toolbar/FilterPanel.svelte:136 in (markup) -> src/lib/features/collection/toolbar/FilterPanel.svelte:updateRow markup +1
call src/lib/features/collection/toolbar/FilterPanel.svelte:137 in (markup) -> src/lib/features/collection/toolbar/FilterPanel.svelte:removeRow markup +1
call src/lib/features/collection/toolbar/FilterPanel.svelte:146 in (markup) -> src/lib/features/collection/toolbar/FilterPanel.svelte:addFilter markup +1
