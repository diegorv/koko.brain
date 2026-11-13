# file card src/lib/core/markdown-editor/extensions/lezer/math-extension.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/lezer/math-extension.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/lezer/math-extension.ts other L115 module src/lib/core/markdown-editor in1 t3
## imported-by
imp src/lib/core/markdown-editor/highlight-styles.ts:9 -> src/lib/core/markdown-editor/extensions/lezer/math-extension.ts MathExtension
## reach
in2 src/lib/core/markdown-editor/extensions/lezer/math-extension.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
out2 src/lib/core/markdown-editor/extensions/lezer/math-extension.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.test.ts imports src/lib/core/markdown-editor/extensions/lezer/math-extension.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/lezer/math-extension.ts
test src/tests/lib/core/markdown-editor/test-helpers.ts imports src/lib/core/markdown-editor/extensions/lezer/math-extension.ts
## symbols
sym src/lib/core/markdown-editor/extensions/lezer/math-extension.ts:106 const MathExtension: MarkdownConfig L10 | Lezer MarkdownConfig extension for math syntax.
by src/lib/core/markdown-editor/extensions/lezer/math-extension.ts:MathExtension <- src/lib/core/markdown-editor/highlight-styles.ts:87 in markdownLanguage ref
