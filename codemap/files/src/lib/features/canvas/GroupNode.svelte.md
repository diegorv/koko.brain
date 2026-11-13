# file card src/lib/features/canvas/GroupNode.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/GroupNode.svelte ' codemap/files
file src/lib/features/canvas/GroupNode.svelte component L45 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/GroupNode.svelte:3 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/GroupNode.svelte:4 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:20 -> src/lib/features/canvas/GroupNode.svelte default
## reach
in2 src/lib/features/canvas/GroupNode.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/GroupNode.svelte 0 files in 0 modules: -
## symbols
sym src/lib/features/canvas/GroupNode.svelte:1 component GroupNode props:data,selected L45
by src/lib/features/canvas/GroupNode.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:71 in nodeTypes ref
## calls
call src/lib/features/canvas/GroupNode.svelte:12 in bgColor=$derived -> src/lib/features/canvas/canvas.logic.ts:resolveColor call
