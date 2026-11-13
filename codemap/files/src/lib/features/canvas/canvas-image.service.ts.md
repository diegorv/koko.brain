# file card src/lib/features/canvas/canvas-image.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/canvas-image.service.ts ' codemap/files
file src/lib/features/canvas/canvas-image.service.ts service L39 module src/lib/features/canvas in2 t1
## imports
imp src/lib/features/canvas/canvas-image.service.ts:1 -> pkg:@tauri-apps/plugin-fs readFile
imp src/lib/features/canvas/canvas-image.service.ts:2 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/canvas/canvas-image.service.ts:3 -> src/lib/features/canvas/canvas.logic.ts resolveCanvasFilePath
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:43 -> src/lib/features/canvas/canvas-image.service.ts isImageFile
imp src/lib/features/canvas/ImageNode.svelte:5 -> src/lib/features/canvas/canvas-image.service.ts resolveImageSrc
## reach
in2 src/lib/features/canvas/canvas-image.service.ts 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/canvas-image.service.ts 2 files in 2 modules: src/lib/core/vault(1) src/lib/features/canvas(1)
## tests
test src/tests/lib/features/canvas/canvas-image.service.test.ts imports src/lib/features/canvas/canvas-image.service.ts mirror
## symbols
sym src/lib/features/canvas/canvas-image.service.ts:6 const IMAGE_EXTENSIONS L1 | Image extensions we recognize
sym src/lib/features/canvas/canvas-image.service.ts:9 fn isImageFile(path: string): boolean L4 | Checks if a file path is an image
by src/lib/features/canvas/canvas-image.service.ts:isImageFile <- src/lib/features/canvas/CanvasInner.svelte:587 in handleDrop call
sym src/lib/features/canvas/canvas-image.service.ts:15 fn extToMime(ext: string): string L12 | Maps a file extension to a MIME type
sym src/lib/features/canvas/canvas-image.service.ts:29 fn resolveImageSrc(filePath: string): Promise<string> L11 | Resolves an image file path to a displayable src URL
by src/lib/features/canvas/canvas-image.service.ts:resolveImageSrc <- src/lib/features/canvas/ImageNode.svelte:26 in $effect@18 call
## calls
call src/lib/features/canvas/canvas-image.service.ts:34 in resolveImageSrc -> src/lib/features/canvas/canvas.logic.ts:resolveCanvasFilePath call
call src/lib/features/canvas/canvas-image.service.ts:36 in resolveImageSrc -> src/lib/features/canvas/canvas-image.service.ts:extToMime call
## effects
fx src/lib/features/canvas/canvas-image.service.ts:34 tauri-fs.readFile in resolveImageSrc
