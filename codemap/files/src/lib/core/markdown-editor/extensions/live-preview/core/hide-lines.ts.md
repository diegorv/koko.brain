# file card src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts other L20 module src/lib/core/markdown-editor in11 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts hiddenLineDeco
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts 1 files in 1 modules: src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:14 fn hideLines(builder: RangeSetBuilder<Decoration>, doc: Text, firstLine: number, lastLine: number): void L7 | Collapses lines `firstLine` to `lastLine` (1-based, inclusive; nothing when `firstLine > lastLine`): the line class removes the line element and the replace re…
by src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:35 in computeAudioBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:35 in computeBlockComments call
by src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:30 in computeBlockMath call
by src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:56 in computeCodeBlocks call +1
by src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:31 in computeCollectionBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:23 in computeFrontmatter call
by src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:29 in computeMermaidBlocks call
by src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:29 in computeMetaBindButtons call
more by 3 not shown: src/lib/core/markdown-editor(3): q importers src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines
