# file card src/lib/core/zoom/zoom.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/zoom/zoom.service.ts ' codemap/files
file src/lib/core/zoom/zoom.service.ts service L30 module src/lib/core/zoom in1 t2
## imports
imp src/lib/core/zoom/zoom.service.ts:1 -> pkg:@tauri-apps/api/webviewWindow getCurrentWebviewWindow
## imported-by
imp src/lib/app/global-keybindings.ts:27 -> src/lib/core/zoom/zoom.service.ts zoomIn,zoomOut,resetZoom
## reach
in2 src/lib/core/zoom/zoom.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/core/zoom/zoom.service.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/zoom/zoom.service.test.ts imports src/lib/core/zoom/zoom.service.ts mirror
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/core/zoom/zoom.service.ts
## symbols
sym src/lib/core/zoom/zoom.service.ts:9 fn zoomIn(): Promise<void> L5 | Increases zoom to the next predefined level.
by src/lib/core/zoom/zoom.service.ts:zoomIn <- src/lib/app/global-keybindings.ts:178 in GLOBAL_KEYBINDINGS call +1
sym src/lib/core/zoom/zoom.service.ts:16 fn zoomOut(): Promise<void> L5 | Decreases zoom to the previous predefined level.
by src/lib/core/zoom/zoom.service.ts:zoomOut <- src/lib/app/global-keybindings.ts:180 in GLOBAL_KEYBINDINGS call
sym src/lib/core/zoom/zoom.service.ts:23 fn resetZoom(): Promise<void> L3 | Resets zoom to 100%.
by src/lib/core/zoom/zoom.service.ts:resetZoom <- src/lib/app/global-keybindings.ts:181 in GLOBAL_KEYBINDINGS call
## locals
local src/lib/core/zoom/zoom.service.ts:27 fn applyZoom(factor: number): Promise<void> L4
## calls
call src/lib/core/zoom/zoom.service.ts:12 in zoomIn -> src/lib/core/zoom/zoom.service.ts:applyZoom call
call src/lib/core/zoom/zoom.service.ts:19 in zoomOut -> src/lib/core/zoom/zoom.service.ts:applyZoom call
call src/lib/core/zoom/zoom.service.ts:24 in resetZoom -> src/lib/core/zoom/zoom.service.ts:applyZoom call
## effects
fx src/lib/core/zoom/zoom.service.ts:29 tauri-api-webviewWindow.getCurrentWebviewWindow in applyZoom
