# file card src/lib/core/zoom/zoom.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/zoom/zoom.store.svelte.ts ' codemap/files
file src/lib/core/zoom/zoom.store.svelte.ts store L32 module src/lib/core/zoom in2 t4
## imported-by
imp src/lib/core/zoom/ZoomChip.svelte:3 -> src/lib/core/zoom/zoom.store.svelte.ts zoomStore
imp src/lib/core/zoom/zoom.service.ts:2 -> src/lib/core/zoom/zoom.store.svelte.ts zoomStore
## reach
in2 src/lib/core/zoom/zoom.store.svelte.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/core/zoom/zoom.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/zoom/zoom.store.test.ts imports src/lib/core/zoom/zoom.store.svelte.ts mirror
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/core/zoom/zoom.store.svelte.ts
test src/tests/lib/core/zoom/ZoomChip.test.ts imports src/lib/core/zoom/zoom.store.svelte.ts
test src/tests/lib/core/zoom/zoom.service.test.ts imports src/lib/core/zoom/zoom.store.svelte.ts
## symbols
sym src/lib/core/zoom/zoom.store.svelte.ts:11 store zoomStore L22 | Reactive zoom state for the zoom chip.
by src/lib/core/zoom/zoom.store.svelte.ts:zoomStore <- src/lib/core/zoom/ZoomChip.svelte:12 in (markup) markup +1
by src/lib/core/zoom/zoom.store.svelte.ts:zoomStore <- src/lib/core/zoom/zoom.service.ts:53 in restoreZoom mcall +3
## store
store src/lib/core/zoom/zoom.store.svelte.ts:11 zoomStore esc:0
mem src/lib/core/zoom/zoom.store.svelte.ts:13 get zoomStore.level r:src/lib/core/zoom/ZoomChip.svelte:20 w-via:setLevel,_reset | Zoom factor last applied to the webview (1 is 100%).
mem src/lib/core/zoom/zoom.store.svelte.ts:16 get zoomStore.chipVisible r:src/lib/core/zoom/ZoomChip.svelte:12 w-via:showChip,hideChip,_reset | True while the zoom chip is shown.
mem src/lib/core/zoom/zoom.store.svelte.ts:19 do zoomStore.setLevel w:src/lib/core/zoom/zoom.service.ts:53,src/lib/core/zoom/zoom.service.ts:63 | Records the factor just applied.
mem src/lib/core/zoom/zoom.store.svelte.ts:22 do zoomStore.showChip w:src/lib/core/zoom/zoom.service.ts:64 | Shows the zoom chip.
mem src/lib/core/zoom/zoom.store.svelte.ts:25 do zoomStore.hideChip w:src/lib/core/zoom/zoom.service.ts:66 | Hides the zoom chip.
mem src/lib/core/zoom/zoom.store.svelte.ts:28 do zoomStore._reset w:-
