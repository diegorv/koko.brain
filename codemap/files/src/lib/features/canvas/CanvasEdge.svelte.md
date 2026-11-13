# file card src/lib/features/canvas/CanvasEdge.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/CanvasEdge.svelte ' codemap/files
file src/lib/features/canvas/CanvasEdge.svelte component L75 module src/lib/features/canvas in1 t0
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:22 -> src/lib/features/canvas/CanvasEdge.svelte default
## reach
in2 src/lib/features/canvas/CanvasEdge.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/CanvasEdge.svelte 0 files in 0 modules: -
## symbols
sym src/lib/features/canvas/CanvasEdge.svelte:1 component CanvasEdge props:id,sourceX,sourceY,targetX,targetY,sourcePosition,targetPosition,selected,label,style,markerStart,markerEnd L75
by src/lib/features/canvas/CanvasEdge.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:78 in edgeTypes ref
