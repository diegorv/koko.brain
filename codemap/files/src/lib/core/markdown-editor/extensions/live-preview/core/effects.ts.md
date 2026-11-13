# file card src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts other L42 module src/lib/core/markdown-editor in6 t8
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:2 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:35 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:36 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts calloutFoldState
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts calloutFoldState,toggleCalloutFold
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts 7 files in 1 modules: src/lib/core/markdown-editor(7)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/block-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/keyboard-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:4 const forceDecorationRebuild = StateEffect.define(…) L1 | Dispatched after a tab switch to force a decoration rebuild once the viewport is stable
by src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild <- src/lib/core/markdown-editor/MarkdownEditor.svelte:577 in $effect@455 mcall +2
by src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild <- src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts:32 in checkUpdateAction ref +1
by src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild <- src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts:25 in scrollDebouncePlugin ref +1
by src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild <- src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:37 in frontmatterField ref
by src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild <- src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:73 in queryjsBlockField ref
sym src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:7 const toggleCalloutFold = StateEffect.define(…) L1 | Dispatched to toggle fold state of a callout at a given start line number
by src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:toggleCalloutFold <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:33 in CalloutFoldWidget.toDOM mcall +1
sym src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:13 const calloutFoldState = StateField.define(…) L30 | StateField that tracks which callouts are currently folded, by start line number.
by src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:calloutFoldState <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:86 in livePreviewExtensions ref
by src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:calloutFoldState <- src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts:154 in computeCallouts ref
