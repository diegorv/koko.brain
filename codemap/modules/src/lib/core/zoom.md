# module card src/lib/core/zoom
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/zoom ' codemap/modules
module src/lib/core/zoom core files 3 in-modules 2 out-modules 1 pub 5/7 ipc 0/0 card ~0.7k
## neighbors
dep src/lib/app -> src/lib/core/zoom 2
dep src/routes -> src/lib/core/zoom 1
dep src/lib/core/zoom -> src/lib/utils 1
in2 src/lib/core/zoom 0 modules: -
out2 src/lib/core/zoom 2 modules: src/lib/contracts(2) src/lib/core/settings(2)
## entry files
entry src/lib/core/zoom/zoom.service.ts ext-in2 src/lib/app/global-keybindings.ts src/routes/(app)/+layout.svelte
entry src/lib/core/zoom/ZoomChip.svelte ext-in1 src/lib/app/AppOverlays.svelte
## files
file src/lib/core/zoom/ZoomChip.svelte component L22 module src/lib/core/zoom in1 t1
file src/lib/core/zoom/zoom.service.ts service L67 module src/lib/core/zoom in3 t4
file src/lib/core/zoom/zoom.store.svelte.ts store L32 module src/lib/core/zoom in2 t4
## public
sym src/lib/core/zoom/ZoomChip.svelte:1 component ZoomChip L22
sym src/lib/core/zoom/zoom.service.ts:20 fn zoomIn(): Promise<void> L5 | Increases zoom to the next predefined level.
sym src/lib/core/zoom/zoom.service.ts:27 fn zoomOut(): Promise<void> L5 | Decreases zoom to the previous predefined level.
sym src/lib/core/zoom/zoom.service.ts:34 fn resetZoom(): Promise<void> L3 | Resets zoom to 100%.
sym src/lib/core/zoom/zoom.service.ts:43 fn restoreZoom(): Promise<void> L12 | Applies the zoom level remembered on this machine, without showing the chip.
## stores
store src/lib/core/zoom/zoom.store.svelte.ts:11 zoomStore esc:0
## effects
fx-count storage.getItem 1
fx-count storage.removeItem 1
fx-count storage.setItem 1
fx-count tauri-api-webviewWindow.getCurrentWebviewWindow 2
fx-count timer.setTimeout 1
## debt
-
