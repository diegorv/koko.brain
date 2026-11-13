# file card src/lib/features/file-history/DiffViewer.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-history/DiffViewer.svelte ' codemap/files
file src/lib/features/file-history/DiffViewer.svelte component L56 module src/lib/features/file-history in1 t0
## imports
imp src/lib/features/file-history/DiffViewer.svelte:2 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
imp src/lib/features/file-history/DiffViewer.svelte:3 -> src/lib/features/file-history/file-history.types.ts type:DiffLine
## imported-by
imp src/lib/features/file-history/FileHistoryDialog.svelte:10 -> src/lib/features/file-history/DiffViewer.svelte default
## reach
in2 src/lib/features/file-history/DiffViewer.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/file-history/DiffViewer.svelte 3 files in 2 modules: src/lib/components(2) src/lib/contracts(1)
## symbols
sym src/lib/features/file-history/DiffViewer.svelte:1 component DiffViewer props:diffLines,isLoading L56
by src/lib/features/file-history/DiffViewer.svelte:default <- src/lib/features/file-history/FileHistoryDialog.svelte:88 in (markup) mount
## locals
local src/lib/features/file-history/DiffViewer.svelte:12 fn lineClass(type: DiffLine['type']): string L7
local src/lib/features/file-history/DiffViewer.svelte:20 fn linePrefix(type: DiffLine['type']): string L7
## mounts
mount src/lib/features/file-history/DiffViewer.svelte:29 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
## mounted-at
mount src/lib/features/file-history/FileHistoryDialog.svelte:88 DiffViewer -> src/lib/features/file-history/DiffViewer.svelte
## calls
call src/lib/features/file-history/DiffViewer.svelte:42 in (markup) -> src/lib/features/file-history/DiffViewer.svelte:lineClass markup
call src/lib/features/file-history/DiffViewer.svelte:49 in (markup) -> src/lib/features/file-history/DiffViewer.svelte:linePrefix markup
