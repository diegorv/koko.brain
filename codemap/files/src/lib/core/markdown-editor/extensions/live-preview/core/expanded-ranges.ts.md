# file card src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts other L16 module src/lib/core/markdown-editor in5 t1
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts expandedVisibleRanges
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts 13 files in 1 modules: src/lib/core/markdown-editor(13)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:7 fn expandedVisibleRanges(view: EditorView, buffer: number = 2000): readonly { from: number; to: number }[] L10 | Returns visible ranges expanded by a buffer (default 2000 chars) in each direction.
by src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:184 in makeInlineFormattingPlugin call +1
by src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:37 in footnotePlugin call +1
by src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges <- src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:58 in imagePlugin call +1
by src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:34 in metaBindInputPlugin call +1
by src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts:expandedVisibleRanges <- src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:39 in wikilinkEmbedPlugin call +1
