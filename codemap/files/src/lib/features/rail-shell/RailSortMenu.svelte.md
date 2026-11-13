# file card src/lib/features/rail-shell/RailSortMenu.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/RailSortMenu.svelte ' codemap/files
file src/lib/features/rail-shell/RailSortMenu.svelte component L233 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/RailSortMenu.svelte:6 -> src/lib/components/ui/popover/index.ts Popover,PopoverPortal,PopoverTrigger,PopoverContent
imp src/lib/features/rail-shell/RailSortMenu.svelte:7 -> src/lib/features/rail-shell/list-sort.logic.ts BUILT_IN_SORT_OPTIONS,defaultSortDirection,propertySortOption,sortOptionLabel
imp src/lib/features/rail-shell/RailSortMenu.svelte:13 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig,type:ListSortDirection,type:ListSortOption
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:92 -> src/lib/features/rail-shell/RailSortMenu.svelte default
## reach
in2 src/lib/features/rail-shell/RailSortMenu.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/RailSortMenu.svelte 1 files in 1 modules: src/lib/components(1)
## tests
test src/tests/lib/features/rail-shell/RailSortMenu.test.ts imports src/lib/features/rail-shell/RailSortMenu.svelte mirror
## symbols
sym src/lib/features/rail-shell/RailSortMenu.svelte:1 component RailSortMenu props:config,extraCount,properties,onSelect,onMultipleSort,onReset,customized= L233
by src/lib/features/rail-shell/RailSortMenu.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:727 in (markup) mount
## locals
local src/lib/features/rail-shell/RailSortMenu.svelte:53 fn pick(option: ListSortOption, direction?: ListSortDirection) L13
local src/lib/features/rail-shell/RailSortMenu.svelte:67 fn rows(): HTMLElement[] L3
local src/lib/features/rail-shell/RailSortMenu.svelte:71 fn focusActiveRow() L5
local src/lib/features/rail-shell/RailSortMenu.svelte:77 fn handleMenuKeydown(event: KeyboardEvent) L24
## mounts
mount src/lib/features/rail-shell/RailSortMenu.svelte:130 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:727 RailSortMenu -> src/lib/features/rail-shell/RailSortMenu.svelte
## calls
call src/lib/features/rail-shell/RailSortMenu.svelte:43 in builtInOptions -> src/lib/features/rail-shell/list-sort.logic.ts:BUILT_IN_SORT_OPTIONS mcall
call src/lib/features/rail-shell/RailSortMenu.svelte:46 in propertyOptions=$derived -> src/lib/features/rail-shell/list-sort.logic.ts:propertySortOption call
call src/lib/features/rail-shell/RailSortMenu.svelte:51 in triggerTitle=$derived -> src/lib/features/rail-shell/list-sort.logic.ts:sortOptionLabel call
call src/lib/features/rail-shell/RailSortMenu.svelte:57 in pick -> src/lib/features/rail-shell/list-sort.logic.ts:defaultSortDirection call
call src/lib/features/rail-shell/RailSortMenu.svelte:72 in focusActiveRow -> src/lib/features/rail-shell/RailSortMenu.svelte:rows call
call src/lib/features/rail-shell/RailSortMenu.svelte:78 in handleMenuKeydown -> src/lib/features/rail-shell/RailSortMenu.svelte:rows call
call src/lib/features/rail-shell/RailSortMenu.svelte:93 in handleMenuKeydown -> src/lib/features/rail-shell/RailSortMenu.svelte:pick call
call src/lib/features/rail-shell/RailSortMenu.svelte:119 in (markup) -> src/lib/features/rail-shell/list-sort.logic.ts:sortOptionLabel markup +3
call src/lib/features/rail-shell/RailSortMenu.svelte:137 in (markup) -> src/lib/features/rail-shell/RailSortMenu.svelte:focusActiveRow markup
call src/lib/features/rail-shell/RailSortMenu.svelte:143 in (markup) -> src/lib/features/rail-shell/RailSortMenu.svelte:handleMenuKeydown markup
call src/lib/features/rail-shell/RailSortMenu.svelte:202 in (markup) -> src/lib/features/rail-shell/RailSortMenu.svelte:pick markup +2
## effects
fx src/lib/features/rail-shell/RailSortMenu.svelte:39 svelte.$effect in (script)
