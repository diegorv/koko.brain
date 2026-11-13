# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts other L271 module src/lib/core/markdown-editor in1 t3
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts findAllCallouts,type:CalloutBlock
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts calloutFoldState,toggleCalloutFold
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenLineDeco,hiddenSyntaxDeco,revealedBlockSyntaxDeco
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:8 -> src/lib/core/markdown-editor/extensions/callout/callout.logic.ts CALLOUT_COLORS
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts calloutField
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts 5 files in 2 modules: src/lib/core/markdown-editor(4) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:150 fn computeCallouts(state: EditorState): DecorationSet L104 | Computes callout decorations using the Lezer syntax tree.
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:266 const calloutField = blockDecorator(…) L6 | ViewPlugin that manages callout decorations independently.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:calloutField <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:51 in BLOCK_EXTENSIONS ref
## locals
local src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:133 fn quotePrefixLength(text: string, depth: number): number L8
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:33 in CalloutFoldWidget.toDOM -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:toggleCalloutFold mcall
call src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:151 in computeCallouts -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:153 in computeCallouts -> src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts:findAllCallouts call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:240 in computeCallouts -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts:hiddenLineDeco mcall
call src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:244 in computeCallouts -> src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:quotePrefixLength call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:266 in calloutField -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:269 in calloutField -> src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:computeCallouts ref
## effects
fx src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:30 dom.mousedown span in CalloutFoldWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:82 dom.mousedown opt in CalloutTypeSwitcherWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:94 dom.mousedown label in CalloutTypeSwitcherWidget.toDOM
fx src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:104 dom.mousedown document in CalloutTypeSwitcherWidget.toDOM
