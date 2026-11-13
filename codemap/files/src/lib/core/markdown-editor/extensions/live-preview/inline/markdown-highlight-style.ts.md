# file card src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts other L28 module src/lib/core/markdown-editor in1 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts inlineHighlightExtension
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts:15 const markdownInlineHighlight = HighlightStyle.define(…) L6 | Tag-based style entries that the unified live-preview pipeline applies via `syntaxHighlighting`.
sym src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts:26 fn inlineHighlightExtension(): Extension L3 | Returns the live-preview HighlightStyle wrapped in a `syntaxHighlighting` extension, ready to be appended to the live-preview extension array.
by src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts:inlineHighlightExtension <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:101 in inlineExtensions call
