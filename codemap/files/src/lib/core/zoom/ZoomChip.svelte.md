# file card src/lib/core/zoom/ZoomChip.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/zoom/ZoomChip.svelte ' codemap/files
file src/lib/core/zoom/ZoomChip.svelte component L22 module src/lib/core/zoom in1 t1
## imports
imp src/lib/core/zoom/ZoomChip.svelte:3 -> src/lib/core/zoom/zoom.store.svelte.ts zoomStore
imp src/lib/core/zoom/ZoomChip.svelte:4 -> src/lib/core/zoom/zoom.service.ts resetZoom
imp src/lib/core/zoom/ZoomChip.svelte:5 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/app/AppOverlays.svelte:5 -> src/lib/core/zoom/ZoomChip.svelte default
## reach
in2 src/lib/core/zoom/ZoomChip.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/core/zoom/ZoomChip.svelte 5 files in 3 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/utils(1)
## tests
test src/tests/lib/core/zoom/ZoomChip.test.ts imports src/lib/core/zoom/ZoomChip.svelte mirror
## symbols
sym src/lib/core/zoom/ZoomChip.svelte:1 component ZoomChip L22
by src/lib/core/zoom/ZoomChip.svelte:default <- src/lib/app/AppOverlays.svelte:44 in (markup) mount
## locals
local src/lib/core/zoom/ZoomChip.svelte:7 fn reset() L3
## mounted-at
mount src/lib/app/AppOverlays.svelte:44 ZoomChip -> src/lib/core/zoom/ZoomChip.svelte
## calls
call src/lib/core/zoom/ZoomChip.svelte:8 in reset -> src/lib/core/zoom/zoom.service.ts:resetZoom call
call src/lib/core/zoom/ZoomChip.svelte:8 in reset -> src/lib/utils/debug.ts:error call
call src/lib/core/zoom/ZoomChip.svelte:17 in (markup) -> src/lib/core/zoom/ZoomChip.svelte:reset markup
