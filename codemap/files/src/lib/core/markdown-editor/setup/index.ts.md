# file card src/lib/core/markdown-editor/setup/index.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/setup/index.ts ' codemap/files
file src/lib/core/markdown-editor/setup/index.ts other L2 module src/lib/core/markdown-editor in1 t0
## imports
imp src/lib/core/markdown-editor/setup/index.ts:1 -> src/lib/core/markdown-editor/setup/editor-theme.ts buildEditorTheme
imp src/lib/core/markdown-editor/setup/index.ts:2 -> src/lib/core/markdown-editor/setup/editor-extensions.ts createExtensions,editorModeEffects,type:CreateExtensionsOptions
## imported-by
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:46 -> src/lib/core/markdown-editor/setup/index.ts buildEditorTheme,createExtensions,editorModeEffects
## reach
in2 src/lib/core/markdown-editor/setup/index.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/markdown-editor/setup/index.ts 12 files in 2 modules: src/lib/core/markdown-editor(10) src/lib/utils(2)
## symbols
sym src/lib/core/markdown-editor/setup/index.ts:1 reexport buildEditorTheme = src/lib/core/markdown-editor/setup/editor-theme.ts:buildEditorTheme L1
sym src/lib/core/markdown-editor/setup/index.ts:2 reexport CreateExtensionsOptions = src/lib/core/markdown-editor/setup/editor-extensions.ts:CreateExtensionsOptions L1
sym src/lib/core/markdown-editor/setup/index.ts:2 reexport createExtensions = src/lib/core/markdown-editor/setup/editor-extensions.ts:createExtensions L1
sym src/lib/core/markdown-editor/setup/index.ts:2 reexport editorModeEffects = src/lib/core/markdown-editor/setup/editor-extensions.ts:editorModeEffects L1
