# file card src/lib/features/canvas/CanvasLinkInput.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/CanvasLinkInput.svelte ' codemap/files
file src/lib/features/canvas/CanvasLinkInput.svelte component L163 module src/lib/features/canvas in1 t0
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:26 -> src/lib/features/canvas/CanvasLinkInput.svelte default
## reach
in2 src/lib/features/canvas/CanvasLinkInput.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/CanvasLinkInput.svelte 0 files in 0 modules: -
## symbols
sym src/lib/features/canvas/CanvasLinkInput.svelte:1 component CanvasLinkInput props:open,onSubmit,onClose L163
by src/lib/features/canvas/CanvasLinkInput.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:703 in (markup) mount
## locals
local src/lib/features/canvas/CanvasLinkInput.svelte:17 fn handleSubmit() L10
local src/lib/features/canvas/CanvasLinkInput.svelte:28 fn handleKeydown(e: KeyboardEvent) L12
## mounted-at
mount src/lib/features/canvas/CanvasInner.svelte:703 CanvasLinkInput -> src/lib/features/canvas/CanvasLinkInput.svelte
## calls
call src/lib/features/canvas/CanvasLinkInput.svelte:37 in handleKeydown -> src/lib/features/canvas/CanvasLinkInput.svelte:handleSubmit call
call src/lib/features/canvas/CanvasLinkInput.svelte:50 in (markup) -> src/lib/features/canvas/CanvasLinkInput.svelte:handleKeydown markup +2
call src/lib/features/canvas/CanvasLinkInput.svelte:68 in (markup) -> src/lib/features/canvas/CanvasLinkInput.svelte:handleSubmit markup
## effects
fx src/lib/features/canvas/CanvasLinkInput.svelte:41 svelte.$effect in (script)
fx src/lib/features/canvas/CanvasLinkInput.svelte:43 timer.requestAnimationFrame in $effect@41
