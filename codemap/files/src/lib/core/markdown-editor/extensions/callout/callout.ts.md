# file card src/lib/core/markdown-editor/extensions/callout/callout.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/callout/callout.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/callout/callout.ts other L55 module src/lib/core/markdown-editor in1 t0
## imports
imp src/lib/core/markdown-editor/extensions/callout/callout.ts:10 -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts parseCalloutLine
## imported-by
imp src/lib/core/markdown-editor/extensions/callout/index.ts:1 -> src/lib/core/markdown-editor/extensions/callout/callout.ts calloutDecoration
## reach
in2 src/lib/core/markdown-editor/extensions/callout/callout.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/callout/callout.ts 0 files in 0 modules: -
## symbols
sym src/lib/core/markdown-editor/extensions/callout/callout.ts:53 fn calloutDecoration(): Extension L3
by src/lib/core/markdown-editor/extensions/callout/callout.ts:calloutDecoration <- src/lib/core/markdown-editor/setup/editor-extensions.ts:104 in sourceModeExtensions call
## locals
local src/lib/core/markdown-editor/extensions/callout/callout.ts:12 fn getCalloutDecoration(color: string): Decoration L8
local src/lib/core/markdown-editor/extensions/callout/callout.ts:21 fn buildDecorations(view: EditorView): DecorationSet L16
## calls
call src/lib/core/markdown-editor/extensions/callout/callout.ts:27 in buildDecorations -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts:parseCalloutLine call
call src/lib/core/markdown-editor/extensions/callout/callout.ts:29 in buildDecorations -> src/lib/core/markdown-editor/extensions/callout/callout.ts:getCalloutDecoration call
call src/lib/core/markdown-editor/extensions/callout/callout.ts:42 in calloutDecorationPlugin -> src/lib/core/markdown-editor/extensions/callout/callout.ts:buildDecorations call +1
