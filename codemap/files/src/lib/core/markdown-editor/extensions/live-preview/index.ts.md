# file card src/lib/core/markdown-editor/extensions/live-preview/index.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/index.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/index.ts other L1 module src/lib/core/markdown-editor in2 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/index.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts livePreview,livePreviewCompartment,livePreviewExtensions,forceDecorationRebuild
## imported-by
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:29 -> src/lib/core/markdown-editor/extensions/live-preview/index.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:24 -> src/lib/core/markdown-editor/extensions/live-preview/index.ts livePreview,livePreviewCompartment,livePreviewExtensions
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/index.ts 3 files in 2 modules: src/lib/app(2) src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/index.ts 26 files in 1 modules: src/lib/core/markdown-editor(26)
## tests
test src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/index.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/index.ts:1 reexport forceDecorationRebuild = src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild L1
sym src/lib/core/markdown-editor/extensions/live-preview/index.ts:1 reexport livePreview = src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreview L1
sym src/lib/core/markdown-editor/extensions/live-preview/index.ts:1 reexport livePreviewCompartment = src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewCompartment L1
sym src/lib/core/markdown-editor/extensions/live-preview/index.ts:1 reexport livePreviewExtensions = src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewExtensions L1
