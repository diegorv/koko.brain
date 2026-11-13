# module card src/lib/core/zoom
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/zoom ' codemap/modules
module src/lib/core/zoom core files 1 in-modules 1 out-modules 0 pub 3/3 ipc 0/0 card ~0.4k
## neighbors
dep src/lib/app -> src/lib/core/zoom 1
in2 src/lib/core/zoom 1 modules: src/routes(1)
out2 src/lib/core/zoom 0 modules: -
## entry files
entry src/lib/core/zoom/zoom.service.ts ext-in1 src/lib/app/global-keybindings.ts
## files
file src/lib/core/zoom/zoom.service.ts service L30 module src/lib/core/zoom in1 t2
## public
sym src/lib/core/zoom/zoom.service.ts:9 fn zoomIn(): Promise<void> L5 | Increases zoom to the next predefined level.
sym src/lib/core/zoom/zoom.service.ts:16 fn zoomOut(): Promise<void> L5 | Decreases zoom to the previous predefined level.
sym src/lib/core/zoom/zoom.service.ts:23 fn resetZoom(): Promise<void> L3 | Resets zoom to 100%.
## effects
fx-count tauri-api-webviewWindow.getCurrentWebviewWindow 1
## debt
-
