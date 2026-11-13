# file card src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts ' codemap/files
file src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts other L111 module src/lib/core/markdown-editor in1 t16
## imports
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:3 -> src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts livePreviewClickHandler
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:4 -> src/lib/core/markdown-editor/extensions/live-preview/styles.ts livePreviewActiveLineTheme,livePreviewStyles
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:5 -> src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts mouseSelectingField,mouseSelectingHandlers
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:6 -> src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts bandDragHead,blockBandClick
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:7 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts frontmatterClick,frontmatterField,frontmatterGuard,frontmatterGutter
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:8 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts codeBlockField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:9 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts blockCommentField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts tableField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:11 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts calloutField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:12 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts collectionBlockField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:13 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts metaBindButtonField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:14 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts queryjsBlockField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:15 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts mermaidField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:16 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts blockMathField
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:17 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts imagePlugin
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:18 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts footnotePlugin
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:19 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts wikilinkEmbedPlugin
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:20 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts metaBindInputPlugin
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:21 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts audioPlugin
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:22 -> src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts videoPlugin
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:23 -> src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts scrollDebouncePlugin
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:24 -> src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts BLOCK_DECORATOR_NAMES,INLINE_PLUGIN_NAMES,type:BlockDecoratorName,type:DecoratorName,type:InlinePluginName
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:31 -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts inlineExtensions
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:32 -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts pasteHtmlLinkHandler
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:33 -> src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts pasteTsvHandler
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:35 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts forceDecorationRebuild
imp src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:36 -> src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts calloutFoldState
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/index.ts:1 -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts livePreview,livePreviewCompartment,livePreviewExtensions,forceDecorationRebuild
## reach
in2 src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts 2 files in 1 modules: src/lib/core/markdown-editor(2)
out2 src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts 55 files in 3 modules: src/lib/core/markdown-editor(49) src/lib/utils(4) src/lib/core/frontmatter(2)
## tests
test src/tests/lib/core/markdown-editor/editor-host.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/arrow-reveal.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/code-block-in-containers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/decorator-toggles.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/invariants-harness.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-input-redraw.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-click.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-keyboard.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/special-fences-in-containers.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/table-empty-cells.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/features/collection/collection-block-click.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
test src/tests/lib/features/collection/collection-block-row-rule.test.ts imports src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts
## symbols
sym src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:35 reexport forceDecorationRebuild = src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts:forceDecorationRebuild L1
sym src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:38 const livePreviewCompartment L1
by src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewCompartment <- src/lib/core/markdown-editor/setup/editor-extensions.ts:121 in editorModeEffects mcall
sym src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:79 fn livePreviewExtensions(disabledDecorators: Record<string, boolean>): Extension[] L29 | Returns the live-preview extension array.
by src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewExtensions <- src/lib/core/markdown-editor/setup/editor-extensions.ts:121 in editorModeEffects call
sym src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:109 fn livePreview(enabled: boolean, disabledDecorators: Record<string, boolean>): Extension L3
by src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreview <- src/lib/core/markdown-editor/setup/editor-extensions.ts:146 in createExtensions call
## calls
call src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:95 in livePreviewExtensions -> src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts:inlineExtensions call
call src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:110 in livePreview -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewExtensions call
