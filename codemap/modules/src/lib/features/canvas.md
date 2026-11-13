# module card src/lib/features/canvas
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/canvas ' codemap/modules
module src/lib/features/canvas features files 19 in-modules 2 out-modules 4 pub 2/62 ipc 0/0 card ~1.2k
## neighbors
dep src/lib/app -> src/lib/features/canvas 2
dep src/lib/features/rail-shell -> src/lib/features/canvas 1
dep src/lib/features/canvas -> src/lib/core/editor 2
dep src/lib/features/canvas -> src/lib/core/filesystem 3
dep src/lib/features/canvas -> src/lib/core/vault 3
dep src/lib/features/canvas -> src/lib/utils 2
in2 src/lib/features/canvas 0 modules: -
out2 src/lib/features/canvas 3 modules: src/lib/contracts(1) src/lib/core/markdown-editor(1) src/lib/core/trash(1)
## entry files
entry src/lib/features/canvas/canvas.service.ts ext-in2 src/lib/app/commands.ts src/lib/features/rail-shell/FilesNavigator.svelte
entry src/lib/features/canvas/CanvasView.svelte ext-in1 src/lib/app/EditorView.svelte
## files
file src/lib/features/canvas/CanvasContextMenu.svelte component L234 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/CanvasEdge.svelte component L75 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/CanvasFilePicker.svelte component L152 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/CanvasInner.svelte component L817 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/CanvasLinkInput.svelte component L163 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/CanvasToolbar.svelte component L78 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/CanvasView.svelte component L19 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/ColorPicker.svelte component L72 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/FileNode.svelte component L188 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/GroupNode.svelte component L45 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/ImageNode.svelte component L102 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/LinkNode.svelte component L216 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/TextNode.svelte component L131 module src/lib/features/canvas in1 t0
file src/lib/features/canvas/canvas-history.logic.ts logic L84 module src/lib/features/canvas in1 t1
file src/lib/features/canvas/canvas-image.service.ts service L39 module src/lib/features/canvas in2 t1
file src/lib/features/canvas/canvas-markdown.logic.ts logic L18 module src/lib/features/canvas in2 t1
file src/lib/features/canvas/canvas.logic.ts logic L397 module src/lib/features/canvas in8 t2
file src/lib/features/canvas/canvas.service.ts service L10 module src/lib/features/canvas in2 t4
file src/lib/features/canvas/canvas.types.ts types L110 module src/lib/features/canvas in9 t0
## public
sym src/lib/features/canvas/CanvasView.svelte:1 component CanvasView props:path,jsonContent,onJsonChange L19
sym src/lib/features/canvas/canvas.service.ts:8 fn createCanvasFile(parentPath: string): Promise<string> L3 | Creates a new .canvas file with an empty canvas structure.
## effects
fx-count svelte.$effect 8
fx-count tauri-fs.readFile 1
fx-count tauri-fs.readTextFile 1
fx-count tauri-opener.openUrl 1
fx-count timer.queueMicrotask 3
fx-count timer.requestAnimationFrame 5
fx-count timer.setTimeout 1
## debt
-
