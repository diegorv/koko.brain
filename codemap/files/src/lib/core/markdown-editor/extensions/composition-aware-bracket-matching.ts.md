# file card src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts other L168 module src/lib/core/markdown-editor in1 t1
## imported-by
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:23 -> src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts compositionAwareBracketMatching
## reach
in2 src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts 3 files in 2 modules: src/lib/core/markdown-editor(2) src/lib/app(1)
out2 src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.test.ts imports src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:140 fn compositionAwareBracketMatching(): Extension L29 | Composition-aware bracket matching that replaces the built-in `bracketMatching()`.
by src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:compositionAwareBracketMatching <- src/lib/core/markdown-editor/setup/editor-extensions.ts:137 in createExtensions call
## locals
local src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:118 fn buildBracketDecorations(view: EditorView): DecorationSet L20
## calls
call src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:147 in compositionAwareBracketMatching -> src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:buildBracketDecorations call +1
