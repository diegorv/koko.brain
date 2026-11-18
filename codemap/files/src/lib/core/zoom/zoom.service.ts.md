# file card src/lib/core/zoom/zoom.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/zoom/zoom.service.ts ' codemap/files
file src/lib/core/zoom/zoom.service.ts service L67 module src/lib/core/zoom in3 t4
## imports
imp src/lib/core/zoom/zoom.service.ts:1 -> pkg:@tauri-apps/api/webviewWindow getCurrentWebviewWindow
imp src/lib/core/zoom/zoom.service.ts:2 -> src/lib/core/zoom/zoom.store.svelte.ts zoomStore
## imported-by
imp src/lib/app/global-keybindings.ts:27 -> src/lib/core/zoom/zoom.service.ts zoomIn,zoomOut,resetZoom
imp src/lib/core/zoom/ZoomChip.svelte:4 -> src/lib/core/zoom/zoom.service.ts resetZoom
imp src/routes/(app)/+layout.svelte:6 -> src/lib/core/zoom/zoom.service.ts restoreZoom
## reach
in2 src/lib/core/zoom/zoom.service.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/core/zoom/zoom.service.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/zoom/zoom.service.test.ts imports src/lib/core/zoom/zoom.service.ts mirror
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/core/zoom/zoom.service.ts
test src/tests/lib/core/zoom/ZoomChip.test.ts imports src/lib/core/zoom/zoom.service.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/core/zoom/zoom.service.ts
## symbols
sym src/lib/core/zoom/zoom.service.ts:11 const ZOOM_STORAGE_KEY L1 | Per-machine zoom factor.
sym src/lib/core/zoom/zoom.service.ts:20 fn zoomIn(): Promise<void> L5 | Increases zoom to the next predefined level.
by src/lib/core/zoom/zoom.service.ts:zoomIn <- src/lib/app/global-keybindings.ts:178 in GLOBAL_KEYBINDINGS call +1
sym src/lib/core/zoom/zoom.service.ts:27 fn zoomOut(): Promise<void> L5 | Decreases zoom to the previous predefined level.
by src/lib/core/zoom/zoom.service.ts:zoomOut <- src/lib/app/global-keybindings.ts:180 in GLOBAL_KEYBINDINGS call
sym src/lib/core/zoom/zoom.service.ts:34 fn resetZoom(): Promise<void> L3 | Resets zoom to 100%.
by src/lib/core/zoom/zoom.service.ts:resetZoom <- src/lib/app/global-keybindings.ts:181 in GLOBAL_KEYBINDINGS call
by src/lib/core/zoom/zoom.service.ts:resetZoom <- src/lib/core/zoom/ZoomChip.svelte:8 in reset call
sym src/lib/core/zoom/zoom.service.ts:43 fn restoreZoom(): Promise<void> L12 | Applies the zoom level remembered on this machine, without showing the chip.
by src/lib/core/zoom/zoom.service.ts:restoreZoom <- src/routes/(app)/+layout.svelte:41 in (script) call
## locals
local src/lib/core/zoom/zoom.service.ts:56 fn applyZoom(factor: number): Promise<void> L12
## calls
call src/lib/core/zoom/zoom.service.ts:23 in zoomIn -> src/lib/core/zoom/zoom.service.ts:applyZoom call
call src/lib/core/zoom/zoom.service.ts:30 in zoomOut -> src/lib/core/zoom/zoom.service.ts:applyZoom call
call src/lib/core/zoom/zoom.service.ts:35 in resetZoom -> src/lib/core/zoom/zoom.service.ts:applyZoom call
call src/lib/core/zoom/zoom.service.ts:53 in restoreZoom -> src/lib/core/zoom/zoom.store.svelte.ts:zoomStore.setLevel mcall
call src/lib/core/zoom/zoom.service.ts:63 in applyZoom -> src/lib/core/zoom/zoom.store.svelte.ts:zoomStore.setLevel mcall
call src/lib/core/zoom/zoom.service.ts:64 in applyZoom -> src/lib/core/zoom/zoom.store.svelte.ts:zoomStore.showChip mcall
call src/lib/core/zoom/zoom.service.ts:66 in applyZoom -> src/lib/core/zoom/zoom.store.svelte.ts:zoomStore.hideChip mcall
## effects
fx src/lib/core/zoom/zoom.service.ts:46 storage.getItem in restoreZoom
fx src/lib/core/zoom/zoom.service.ts:52 tauri-api-webviewWindow.getCurrentWebviewWindow in restoreZoom
fx src/lib/core/zoom/zoom.service.ts:60 tauri-api-webviewWindow.getCurrentWebviewWindow in applyZoom
fx src/lib/core/zoom/zoom.service.ts:61 storage.removeItem in applyZoom
fx src/lib/core/zoom/zoom.service.ts:62 storage.setItem in applyZoom
fx src/lib/core/zoom/zoom.service.ts:66 timer.setTimeout delay=CHIP_HIDE_MS in applyZoom
