# file card src/lib/core/markdown-editor/setup/editor-extensions.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/setup/editor-extensions.ts ' codemap/files
file src/lib/core/markdown-editor/setup/editor-extensions.ts other L195 module src/lib/core/markdown-editor in3 t3
## imports
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:19 -> src/lib/core/markdown-editor/extensions/wikilink/index.ts wikilinkCompletionSource,wikilinkDecoration
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:20 -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts dateShortcutCompletionSource
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:21 -> src/lib/core/markdown-editor/extensions/tag/completion.ts tagCompletionSource
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:22 -> src/lib/core/markdown-editor/extensions/callout/index.ts calloutDecoration
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:23 -> src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts compositionAwareBracketMatching
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:24 -> src/lib/core/markdown-editor/extensions/live-preview/index.ts livePreview,livePreviewCompartment,livePreviewExtensions
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:25 -> src/lib/core/markdown-editor/highlight-styles.ts markdownHighlight,markdownLanguage,sourceHeadingSize
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:26 -> src/lib/utils/keybindings.ts toCodeMirrorKey
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:27 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:28 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts fencedBlockRenderers,type:FencedBlockRenderer
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:29 -> src/lib/core/markdown-editor/setup/editor-theme.ts buildEditorTheme
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:30 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts FRONTMATTER_FENCE_RE
## imported-by
imp src/lib/app/commands.ts:30 -> src/lib/core/markdown-editor/setup/editor-extensions.ts COPY_BLOCK_LINK_SHORTCUT
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:47 -> src/lib/core/markdown-editor/setup/editor-extensions.ts COPY_BLOCK_LINK_SHORTCUT
imp src/lib/core/markdown-editor/setup/index.ts:2 -> src/lib/core/markdown-editor/setup/editor-extensions.ts createExtensions,editorModeEffects,type:CreateExtensionsOptions
## reach
in2 src/lib/core/markdown-editor/setup/editor-extensions.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/core/markdown-editor/setup/editor-extensions.ts 15 files in 4 modules: src/lib/core/markdown-editor(11) src/lib/core/filesystem(2) src/lib/types(1) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts imports src/lib/core/markdown-editor/setup/editor-extensions.ts mirror
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/core/markdown-editor/setup/editor-extensions.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/markdown-editor/setup/editor-extensions.ts
## symbols
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:37 const COPY_BLOCK_LINK_SHORTCUT L1 | Copy Block Link (Cmd+Shift+L).
by src/lib/core/markdown-editor/setup/editor-extensions.ts:COPY_BLOCK_LINK_SHORTCUT <- src/lib/app/commands.ts:381 in getBuiltInCommands ref
by src/lib/core/markdown-editor/setup/editor-extensions.ts:COPY_BLOCK_LINK_SHORTCUT <- src/lib/core/markdown-editor/MarkdownEditor.svelte:755 in (markup) markup
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:40 interface CreateExtensionsOptions L50 | Options for building the CodeMirror extension array
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:99 fn sourceModeExtensions(): Extension[] L9 | Extensions installed only in source mode.
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:115 fn editorModeEffects(isLivePreview: boolean, sourceModeCompartment: Compartment, disabledDecorators: Record<string, boolean>): StateEffect<… L10 | Effects that switch a mounted editor between live preview and source mode.
by src/lib/core/markdown-editor/setup/editor-extensions.ts:editorModeEffects <- src/lib/core/markdown-editor/MarkdownEditor.svelte:244 in showTabState call +1
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:127 fn createExtensions(opts: CreateExtensionsOptions): Extension[] L69 | Builds the full CodeMirror extension array for the markdown editor
by src/lib/core/markdown-editor/setup/editor-extensions.ts:createExtensions <- src/lib/core/markdown-editor/MarkdownEditor.svelte:112 in freshState call
## calls
call src/lib/core/markdown-editor/setup/editor-extensions.ts:103 in sourceModeExtensions -> src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:wikilinkDecoration call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:104 in sourceModeExtensions -> src/lib/core/markdown-editor/extensions/callout/callout.ts:calloutDecoration call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:121 in editorModeEffects -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewCompartment mcall
call src/lib/core/markdown-editor/setup/editor-extensions.ts:121 in editorModeEffects -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewExtensions call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:122 in editorModeEffects -> src/lib/core/markdown-editor/setup/editor-extensions.ts:sourceModeExtensions call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:129 in createExtensions -> src/lib/core/markdown-editor/editor-host.ts:editorHost mcall
call src/lib/core/markdown-editor/setup/editor-extensions.ts:130 in createExtensions -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:fencedBlockRenderers mcall
call src/lib/core/markdown-editor/setup/editor-extensions.ts:131 in createExtensions -> src/lib/core/markdown-editor/setup/editor-extensions.ts:sourceModeExtensions call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:137 in createExtensions -> src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:compositionAwareBracketMatching call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:143 in createExtensions -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:dateShortcutCompletionSource ref
call src/lib/core/markdown-editor/setup/editor-extensions.ts:143 in createExtensions -> src/lib/core/markdown-editor/extensions/tag/completion.ts:tagCompletionSource ref
call src/lib/core/markdown-editor/setup/editor-extensions.ts:143 in createExtensions -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:wikilinkCompletionSource ref
call src/lib/core/markdown-editor/setup/editor-extensions.ts:146 in createExtensions -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreview call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:152 in createExtensions -> src/lib/utils/keybindings.ts:toCodeMirrorKey call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:167 in createExtensions -> src/lib/core/markdown-editor/highlight-styles.ts:markdownLanguage call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:169 in createExtensions -> src/lib/core/markdown-editor/setup/editor-theme.ts:buildEditorTheme call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:177 in createExtensions -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:FRONTMATTER_FENCE_RE mcall +1
## effects
reg src/lib/core/markdown-editor/setup/editor-extensions.ts:129 src/lib/core/markdown-editor/editor-host.ts:editorHost in createExtensions args=opts.host
reg src/lib/core/markdown-editor/setup/editor-extensions.ts:130 src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:fencedBlockRenderers in createExtensions args=renderer
