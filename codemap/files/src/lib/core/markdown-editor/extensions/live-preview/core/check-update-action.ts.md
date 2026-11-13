# file card src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts other L68 module src/lib/core/markdown-editor in6 t2
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mouseSelectingField
imp src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts sameTouchedLines
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction,isPureScroll
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction,isPureScroll
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts checkUpdateAction
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts 24 files in 1 modules: src/lib/core/markdown-editor(24)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts mirror
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:20 fn checkUpdateAction(update: ViewUpdate): 'rebuild' | 'skip' | 'none' L31 | Determines what action a ViewPlugin should take in response to a ViewUpdate. - `'rebuild'`: decorations should be recomputed (doc changed, reconfigured, drag e…
by src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction <- src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:83 in blockDecorator call
by src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:194 in makeInlineFormattingPlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction <- src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts:41 in footnotePlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction <- src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:62 in imagePlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction <- src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts:38 in metaBindInputPlugin call
by src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:checkUpdateAction <- src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts:43 in wikilinkEmbedPlugin call
sym src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:59 fn isPureScroll(update: ViewUpdate): boolean L10 | True for a viewport change that should not rebuild a full-document decorator (CLAUDE.md live-preview perf rule 4): no doc change, no selection move, no reconfi…
by src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:isPureScroll <- src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:73 in blockDecorator call
by src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:isPureScroll <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts:192 in makeInlineFormattingPlugin call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:41 in checkUpdateAction -> src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts:sameTouchedLines call
