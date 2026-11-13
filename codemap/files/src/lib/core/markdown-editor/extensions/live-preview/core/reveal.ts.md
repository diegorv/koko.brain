# file card src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts other L77 module src/lib/core/markdown-editor in17 t4
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mouseSelectingField
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts sameTouchedLines
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate,type:RevealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts 14 files in 1 modules: src/lib/core/markdown-editor(14)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:8 type RevealPredicate L1 | Answers whether the syntax of a document range is shown as source.
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:RevealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:6 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:11 interface LineInterval L6 | A run of consecutive 1-based line numbers, `first` to `last` inclusive.
sym src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:26 fn touchedLines(state: EditorState): LineInterval[] L13 | The lines touched by any selection range (each cursor of a multi-cursor, every line of a multi-line selection), as sorted, merged intervals: two selections tha…
sym src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:44 fn sameTouchedLines(a: EditorState, b: EditorState): boolean L5 | True when both states' selections touch exactly the same lines, so `revealPredicate` gives the same answer for every range in both.
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:sameTouchedLines <- src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:35 in checkUpdateAction call
sym src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:66 fn revealPredicate(state: EditorState): RevealPredicate L12 | The live-preview reveal rule: syntax is shown as source on every line in `touchedLines(state)`.
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:121 in buildInlineDecorations call
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:13 in computeAudioBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:13 in computeBlockComments call
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:12 in computeBlockMath call
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:151 in computeCallouts call
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:30 in computeCodeBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:14 in computeCollectionBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:61 in buildFootnoteDecorations call
more by 8 not shown: src/lib/core/markdown-editor(8): q importers src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate
## locals
local src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:51 fn lastLine(state: EditorState, from: number, to: number): number L4
## calls
call src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:32 in touchedLines -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:lastLine call
call src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:45 in sameTouchedLines -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:touchedLines call +1
call src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:70 in revealPredicate -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:touchedLines call
call src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:74 in revealPredicate -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:lastLine call
