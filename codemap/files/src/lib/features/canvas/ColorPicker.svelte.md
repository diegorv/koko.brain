# file card src/lib/features/canvas/ColorPicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/ColorPicker.svelte ' codemap/files
file src/lib/features/canvas/ColorPicker.svelte component L72 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/ColorPicker.svelte:2 -> src/lib/features/canvas/canvas.types.ts CANVAS_COLOR_MAP
imp src/lib/features/canvas/ColorPicker.svelte:3 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
## imported-by
imp src/lib/features/canvas/CanvasContextMenu.svelte:16 -> src/lib/features/canvas/ColorPicker.svelte default
## reach
in2 src/lib/features/canvas/ColorPicker.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/ColorPicker.svelte 0 files in 0 modules: -
## symbols
sym src/lib/features/canvas/ColorPicker.svelte:1 component ColorPicker props:currentColor,onSelect L72
by src/lib/features/canvas/ColorPicker.svelte:default <- src/lib/features/canvas/CanvasContextMenu.svelte:140 in (markup) mount +1
## mounted-at
mount src/lib/features/canvas/CanvasContextMenu.svelte:140 ColorPicker -> src/lib/features/canvas/ColorPicker.svelte
mount src/lib/features/canvas/CanvasContextMenu.svelte:158 ColorPicker -> src/lib/features/canvas/ColorPicker.svelte
