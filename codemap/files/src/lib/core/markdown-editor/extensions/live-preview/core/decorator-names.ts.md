# file card src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts other L108 module src/lib/core/markdown-editor in4 t2 | The live-preview decorator kill-switch vocabulary — every name the Troubleshooting section renders a switch for, split by what installs it.
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts type:BlockDecoratorName
imp src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:20 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts type:InlineHandlerName
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:24 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts BLOCK_DECORATOR_NAMES,INLINE_PLUGIN_NAMES,type:BlockDecoratorName,type:DecoratorName,type:InlinePluginName
imp src/lib/core/settings/sections/TroubleshootingSection.svelte:9 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts DECORATOR_LABELS,DECORATOR_NAMES
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts 13 files in 2 modules: src/lib/core/markdown-editor(12) src/lib/app(1)
out2 src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/markdown-editor/extensions/live-preview/decorator-toggles.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts
test src/tests/lib/core/settings/TroubleshootingSection.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:17 const BLOCK_DECORATOR_NAMES L14 | Block decorators, in the order `livePreviewExtensions()` installs them (extension order is precedence order — do not reorder casually).
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:BLOCK_DECORATOR_NAMES <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:90 in livePreviewExtensions ref
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:36 const INLINE_PLUGIN_NAMES L6 | Inline ViewPlugins installed after the unified inline pipeline.
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:INLINE_PLUGIN_NAMES <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:96 in livePreviewExtensions ref
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:49 const INLINE_HANDLER_NAMES L8 | Names owned by the inline pipeline's handler registry (`inline/inline-extensions.ts` -> `TOGGLEABLE_HANDLERS`).
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:63 const DECORATOR_NAMES L5 | Every kill-switch name, in Troubleshooting display order.
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:DECORATOR_NAMES <- src/lib/core/settings/sections/TroubleshootingSection.svelte:111 in (markup) markup
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:70 type BlockDecoratorName L1 | A block decorator's kill-switch name (`BlockDecoratorSpec.settingsKey`).
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:BlockDecoratorName <- src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts:10 in (module) import
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:BlockDecoratorName <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:27 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:73 type InlinePluginName L1 | An always-on inline ViewPlugin's kill-switch name.
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:InlinePluginName <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:29 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:76 type InlineHandlerName L1 | An inline-handler-group kill-switch name.
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:InlineHandlerName <- src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:20 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:79 type DecoratorName L1 | Any live-preview decorator kill-switch name.
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:DecoratorName <- src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:28 in (module) import
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:85 const DECORATOR_LABELS: Record<DecoratorName, string> L24 | What each kill-switch is called in Troubleshooting.
by src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:DECORATOR_LABELS <- src/lib/core/settings/sections/TroubleshootingSection.svelte:113 in (markup) markup +1
