# file card src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts other L10 module src/lib/core/markdown-editor in4 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts getAllLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts getAllLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts getAllLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts getAllLines
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:4 fn getAllLines(state: EditorState): Line[] L7 | Builds an array with every line of the document in an EditorState
by src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:14 in computeAudioBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:14 in computeBlockComments call
by src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:14 in computeFrontmatter call +1
by src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:14 in computeVideoBlocks call
