# file card src/lib/features/rail-shell/RailArchivedMenu.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/RailArchivedMenu.svelte ' codemap/files
file src/lib/features/rail-shell/RailArchivedMenu.svelte component L67 module src/lib/features/rail-shell in1 t0
## imports
imp src/lib/features/rail-shell/RailArchivedMenu.svelte:4 -> src/lib/components/ui/popover/index.ts Popover,PopoverPortal,PopoverTrigger,PopoverContent
imp src/lib/features/rail-shell/RailArchivedMenu.svelte:5 -> src/lib/features/type-definitions/type-sidebar.logic.ts type:ArchivedFilter
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:89 -> src/lib/features/rail-shell/RailArchivedMenu.svelte default
## reach
in2 src/lib/features/rail-shell/RailArchivedMenu.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/RailArchivedMenu.svelte 8 files in 6 modules: src/lib/core/filesystem(2) src/lib/features/collection(2) src/lib/components(1) src/lib/features/file-icons(1) src/lib/features/type-definitions(1) +1 modules
## symbols
sym src/lib/features/rail-shell/RailArchivedMenu.svelte:1 component RailArchivedMenu props:value,onChange L67
by src/lib/features/rail-shell/RailArchivedMenu.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:754 in (markup) mount
## locals
local src/lib/features/rail-shell/RailArchivedMenu.svelte:26 fn pick(next: ArchivedFilter) L4
## mounts
mount src/lib/features/rail-shell/RailArchivedMenu.svelte:45 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:754 RailArchivedMenu -> src/lib/features/rail-shell/RailArchivedMenu.svelte
## calls
call src/lib/features/rail-shell/RailArchivedMenu.svelte:56 in (markup) -> src/lib/features/rail-shell/RailArchivedMenu.svelte:pick markup
