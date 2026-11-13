# file card src/lib/features/canvas/ImageNode.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/ImageNode.svelte ' codemap/files
file src/lib/features/canvas/ImageNode.svelte component L102 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/ImageNode.svelte:4 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/ImageNode.svelte:5 -> src/lib/features/canvas/canvas-image.service.ts resolveImageSrc
imp src/lib/features/canvas/ImageNode.svelte:6 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:21 -> src/lib/features/canvas/ImageNode.svelte default
## reach
in2 src/lib/features/canvas/ImageNode.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/ImageNode.svelte 1 files in 1 modules: src/lib/core/vault(1)
## symbols
sym src/lib/features/canvas/ImageNode.svelte:1 component ImageNode props:data,selected L102
by src/lib/features/canvas/ImageNode.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:74 in nodeTypes ref
## calls
call src/lib/features/canvas/ImageNode.svelte:14 in bgColor=$derived -> src/lib/features/canvas/canvas.logic.ts:resolveColor call
call src/lib/features/canvas/ImageNode.svelte:26 in $effect@18 -> src/lib/features/canvas/canvas-image.service.ts:resolveImageSrc call
## effects
fx src/lib/features/canvas/ImageNode.svelte:18 svelte.$effect in (script)
