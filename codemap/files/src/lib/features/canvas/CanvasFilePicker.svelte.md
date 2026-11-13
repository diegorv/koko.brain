# file card src/lib/features/canvas/CanvasFilePicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/CanvasFilePicker.svelte ' codemap/files
file src/lib/features/canvas/CanvasFilePicker.svelte component L152 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/CanvasFilePicker.svelte:2 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/canvas/CanvasFilePicker.svelte:3 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree,filterAndRank
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:25 -> src/lib/features/canvas/CanvasFilePicker.svelte default
## reach
in2 src/lib/features/canvas/CanvasFilePicker.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/CanvasFilePicker.svelte 2 files in 2 modules: src/lib/core/filesystem(1) src/lib/utils(1)
## symbols
sym src/lib/features/canvas/CanvasFilePicker.svelte:1 component CanvasFilePicker props:open,onSelect,onClose,extensions= L152
by src/lib/features/canvas/CanvasFilePicker.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:696 in (markup) mount +1
## locals
local src/lib/features/canvas/CanvasFilePicker.svelte:27 fn handleSelect(filePath: string) L5
local src/lib/features/canvas/CanvasFilePicker.svelte:33 fn handleKeydown(e: KeyboardEvent) L7
## mounted-at
mount src/lib/features/canvas/CanvasInner.svelte:696 CanvasFilePicker -> src/lib/features/canvas/CanvasFilePicker.svelte
mount src/lib/features/canvas/CanvasInner.svelte:706 CanvasFilePicker -> src/lib/features/canvas/CanvasFilePicker.svelte
## calls
call src/lib/features/canvas/CanvasFilePicker.svelte:21 in allFiles=$derived -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/features/canvas/CanvasFilePicker.svelte:25 in filtered=$derived -> src/lib/core/filesystem/file-entries.logic.ts:filterAndRank call
call src/lib/features/canvas/CanvasFilePicker.svelte:50 in (markup) -> src/lib/features/canvas/CanvasFilePicker.svelte:handleKeydown markup +1
call src/lib/features/canvas/CanvasFilePicker.svelte:61 in (markup) -> src/lib/features/canvas/CanvasFilePicker.svelte:handleSelect markup
## effects
fx src/lib/features/canvas/CanvasFilePicker.svelte:41 svelte.$effect in (script)
fx src/lib/features/canvas/CanvasFilePicker.svelte:43 timer.requestAnimationFrame in $effect@41
