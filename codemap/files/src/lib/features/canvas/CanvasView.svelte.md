# file card src/lib/features/canvas/CanvasView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/CanvasView.svelte ' codemap/files
file src/lib/features/canvas/CanvasView.svelte component L19 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/CanvasView.svelte:3 -> src/lib/features/canvas/CanvasInner.svelte default
## imported-by
imp src/lib/app/EditorView.svelte:19 -> src/lib/features/canvas/CanvasView.svelte default
## reach
in2 src/lib/features/canvas/CanvasView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/canvas/CanvasView.svelte 15 files in 2 modules: src/lib/features/canvas(14) src/lib/core/editor(1)
## symbols
sym src/lib/features/canvas/CanvasView.svelte:1 component CanvasView props:path,jsonContent,onJsonChange L19
by src/lib/features/canvas/CanvasView.svelte:default <- src/lib/app/EditorView.svelte:85 in (markup) mount
## mounts
mount src/lib/features/canvas/CanvasView.svelte:18 CanvasInner -> src/lib/features/canvas/CanvasInner.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:85 CanvasView -> src/lib/features/canvas/CanvasView.svelte
