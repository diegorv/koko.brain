# file card src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts other L91 module src/lib/core/markdown-editor in11 t1
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction,isPureScroll
imp src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts type:BlockDecoratorName
imp src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts profileStart,profileEnd
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts blockDecorator
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts 1 files in 1 modules: src/lib/core/markdown-editor(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts 3 files in 1 modules: src/lib/core/markdown-editor(3)
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts mirror
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:14 interface BlockDecoratorValue L4 | Runtime value every block decorator ViewPlugin exposes.
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:20 interface BlockDecoratorSpec L32 | Describes one block decorator: its identity, its scan, and its update gates.
sym src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:59 fn blockDecorator(spec: BlockDecoratorSpec): ViewPlugin<BlockDecoratorValue> L33 | Builds a block decorator ViewPlugin: one full-document scan plus the update discipline every block decorator shares (CLAUDE.md live-preview perf rules 4 and 5)…
by src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator <- src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts:52 in audioPlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts:52 in blockCommentField call
by src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator <- src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts:42 in blockMathField call
by src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:266 in calloutField call
by src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator <- src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts:108 in codeBlockField call
by src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator <- src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts:47 in collectionBlockField call
by src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator <- src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts:45 in mermaidField call
by src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts:45 in metaBindButtonField call
more by 3 not shown: src/lib/core/markdown-editor(3): q importers src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:blockDecorator
## calls
call src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:72 in blockDecorator -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:isPureScroll call
call src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:82 in blockDecorator -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction call
call src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:83 in blockDecorator -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileStart call
call src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:85 in blockDecorator -> src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:profileEnd call
