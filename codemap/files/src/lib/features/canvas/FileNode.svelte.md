# file card src/lib/features/canvas/FileNode.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/FileNode.svelte ' codemap/files
file src/lib/features/canvas/FileNode.svelte component L188 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/FileNode.svelte:6 -> pkg:@tauri-apps/plugin-fs readTextFile
imp src/lib/features/canvas/FileNode.svelte:7 -> src/lib/features/canvas/canvas.logic.ts resolveColor
imp src/lib/features/canvas/FileNode.svelte:8 -> src/lib/features/canvas/canvas-markdown.logic.ts renderCanvasMarkdown
imp src/lib/features/canvas/FileNode.svelte:9 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/canvas/FileNode.svelte:10 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/canvas/FileNode.svelte:11 -> src/lib/features/canvas/canvas.types.ts type:CanvasColor
## imported-by
imp src/lib/features/canvas/CanvasInner.svelte:18 -> src/lib/features/canvas/FileNode.svelte default
## reach
in2 src/lib/features/canvas/FileNode.svelte 1 files in 1 modules: src/lib/features/canvas(1)
out2 src/lib/features/canvas/FileNode.svelte 11 files in 5 modules: src/lib/core/editor(4) src/lib/utils(4) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1) src/lib/core/vault(1)
## symbols
sym src/lib/features/canvas/FileNode.svelte:1 component FileNode props:data,selected L188
by src/lib/features/canvas/FileNode.svelte:default <- src/lib/features/canvas/CanvasInner.svelte:71 in nodeTypes ref
## locals
local src/lib/features/canvas/FileNode.svelte:55 fn handleClick() L3
## calls
call src/lib/features/canvas/FileNode.svelte:20 in bgColor=$derived -> src/lib/features/canvas/canvas.logic.ts:resolveColor call
call src/lib/features/canvas/FileNode.svelte:56 in handleClick -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/canvas/FileNode.svelte:66 in (markup) -> src/lib/features/canvas/FileNode.svelte:handleClick markup
call src/lib/features/canvas/FileNode.svelte:83 in (markup) -> src/lib/features/canvas/canvas-markdown.logic.ts:renderCanvasMarkdown markup
## effects
fx src/lib/features/canvas/FileNode.svelte:31 svelte.$effect in (script)
fx src/lib/features/canvas/FileNode.svelte:41 tauri-fs.readTextFile in $effect@31
