# file card src/lib/core/markdown-editor/extensions/callout/index.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/callout/index.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/callout/index.ts other L1 module src/lib/core/markdown-editor in1 t0
## imports
imp src/lib/core/markdown-editor/extensions/callout/index.ts:1 -> src/lib/core/markdown-editor/extensions/callout/callout.ts calloutDecoration
## imported-by
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:22 -> src/lib/core/markdown-editor/extensions/callout/index.ts calloutDecoration
## reach
in2 src/lib/core/markdown-editor/extensions/callout/index.ts 3 files in 2 modules: src/lib/core/markdown-editor(2) src/lib/app(1)
out2 src/lib/core/markdown-editor/extensions/callout/index.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
## symbols
sym src/lib/core/markdown-editor/extensions/callout/index.ts:1 reexport calloutDecoration = src/lib/core/markdown-editor/extensions/callout/callout.ts:calloutDecoration L1
