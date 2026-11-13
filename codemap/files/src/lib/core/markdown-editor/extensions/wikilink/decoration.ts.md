# file card src/lib/core/markdown-editor/extensions/wikilink/decoration.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/wikilink/decoration.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/wikilink/decoration.ts other L92 module src/lib/core/markdown-editor in1 t1
## imports
imp src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:9 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts findWikilinkRanges
## imported-by
imp src/lib/core/markdown-editor/extensions/wikilink/index.ts:2 -> src/lib/core/markdown-editor/extensions/wikilink/decoration.ts wikilinkDecoration
## reach
in2 src/lib/core/markdown-editor/extensions/wikilink/decoration.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
out2 src/lib/core/markdown-editor/extensions/wikilink/decoration.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/wikilink/decoration.test.ts imports src/lib/core/markdown-editor/extensions/wikilink/decoration.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:90 fn wikilinkDecoration(): Extension L3
by src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:wikilinkDecoration <- src/lib/core/markdown-editor/setup/editor-extensions.ts:103 in sourceModeExtensions call
## locals
local src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:17 fn buildDecorations(view: EditorView): DecorationSet L30
## calls
call src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:22 in buildDecorations -> src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts:findWikilinkRanges call
call src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:52 in wikilinkDecorationPlugin -> src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:buildDecorations call +1
