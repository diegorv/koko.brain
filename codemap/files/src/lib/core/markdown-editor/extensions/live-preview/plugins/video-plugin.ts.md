# file card src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts other L56 module src/lib/core/markdown-editor in1 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts findMediaBlock
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts MediaWidget
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts hideLines
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts revealPredicate
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts getAllLines
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:22 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts videoPlugin
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts 19 files in 3 modules: src/lib/core/markdown-editor(14) src/lib/utils(3) src/lib/core/frontmatter(2)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:12 fn computeVideoBlocks(state: EditorState): DecorationSet L34 | Computes video block decorations
sym src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:52 const videoPlugin = blockDecorator(…) L5 | ViewPlugin that manages video block decorations.
by src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:videoPlugin <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:58 in BLOCK_EXTENSIONS ref
## calls
call src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:13 in computeVideoBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:revealPredicate call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:14 in computeVideoBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts:getAllLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:19 in computeVideoBlocks -> src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts:findMediaBlock call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:25 in computeVideoBlocks -> src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:MediaWidget new
call src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:35 in computeVideoBlocks -> src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:hideLines call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:52 in videoPlugin -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator call
call src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:55 in videoPlugin -> src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:computeVideoBlocks ref
