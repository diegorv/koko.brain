# file card src/lib/core/markdown-editor/setup/editor-extensions.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/setup/editor-extensions.ts ' codemap/files
file src/lib/core/markdown-editor/setup/editor-extensions.ts other L199 module src/lib/core/markdown-editor in3 t3
## imports
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:19 -> src/lib/core/markdown-editor/extensions/wikilink/index.ts wikilinkCompletionSource,wikilinkDecoration
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:20 -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts dateShortcutCompletionSource
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:21 -> src/lib/core/markdown-editor/extensions/tag/completion.ts tagCompletionSource
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:22 -> src/lib/core/markdown-editor/extensions/callout/index.ts calloutDecoration
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:23 -> src/lib/core/markdown-editor/extensions/source-frontmatter/index.ts sourceFrontmatter
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:24 -> src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts compositionAwareBracketMatching
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:25 -> src/lib/core/markdown-editor/extensions/live-preview/index.ts livePreview,livePreviewCompartment,livePreviewExtensions
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:26 -> src/lib/core/markdown-editor/highlight-styles.ts markdownHighlight,markdownLanguage,sourceHeadingSize
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:27 -> src/lib/utils/keybindings.ts toCodeMirrorKey
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:28 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:29 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts fencedBlockRenderers,type:FencedBlockRenderer
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:30 -> src/lib/core/markdown-editor/setup/editor-theme.ts buildEditorTheme
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:31 -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts FRONTMATTER_FENCE_RE
## imported-by
imp src/lib/app/commands.ts:30 -> src/lib/core/markdown-editor/setup/editor-extensions.ts COPY_BLOCK_LINK_SHORTCUT
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:47 -> src/lib/core/markdown-editor/setup/editor-extensions.ts COPY_BLOCK_LINK_SHORTCUT
imp src/lib/core/markdown-editor/setup/index.ts:2 -> src/lib/core/markdown-editor/setup/editor-extensions.ts createExtensions,editorModeEffects,type:CreateExtensionsOptions
## reach
in2 src/lib/core/markdown-editor/setup/editor-extensions.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/core/markdown-editor/setup/editor-extensions.ts 16 files in 4 modules: src/lib/core/markdown-editor(12) src/lib/core/filesystem(2) src/lib/types(1) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts imports src/lib/core/markdown-editor/setup/editor-extensions.ts mirror
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/core/markdown-editor/setup/editor-extensions.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/markdown-editor/setup/editor-extensions.ts
## symbols
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:38 const COPY_BLOCK_LINK_SHORTCUT L1 | Copy Block Link (Cmd+Shift+L).
by src/lib/core/markdown-editor/setup/editor-extensions.ts:COPY_BLOCK_LINK_SHORTCUT <- src/lib/app/commands.ts:406 in getBuiltInCommands ref
by src/lib/core/markdown-editor/setup/editor-extensions.ts:COPY_BLOCK_LINK_SHORTCUT <- src/lib/core/markdown-editor/MarkdownEditor.svelte:755 in (markup) markup
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:41 interface CreateExtensionsOptions L50 | Options for building the CodeMirror extension array
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:102 fn sourceModeExtensions(): Extension[] L10 | Extensions installed only in source mode.
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:119 fn editorModeEffects(isLivePreview: boolean, sourceModeCompartment: Compartment, disabledDecorators: Record<string, boolean>): StateEffect<… L10 | Effects that switch a mounted editor between live preview and source mode.
by src/lib/core/markdown-editor/setup/editor-extensions.ts:editorModeEffects <- src/lib/core/markdown-editor/MarkdownEditor.svelte:244 in showTabState call +1
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:131 fn createExtensions(opts: CreateExtensionsOptions): Extension[] L69 | Builds the full CodeMirror extension array for the markdown editor
by src/lib/core/markdown-editor/setup/editor-extensions.ts:createExtensions <- src/lib/core/markdown-editor/MarkdownEditor.svelte:112 in freshState call
## calls
call src/lib/core/markdown-editor/setup/editor-extensions.ts:106 in sourceModeExtensions -> src/lib/core/markdown-editor/extensions/wikilink/decoration.ts:wikilinkDecoration call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:107 in sourceModeExtensions -> src/lib/core/markdown-editor/extensions/callout/callout.ts:calloutDecoration call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:108 in sourceModeExtensions -> src/lib/core/markdown-editor/extensions/source-frontmatter/source-frontmatter.ts:sourceFrontmatter call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:125 in editorModeEffects -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewCompartment mcall
call src/lib/core/markdown-editor/setup/editor-extensions.ts:125 in editorModeEffects -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreviewExtensions call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:126 in editorModeEffects -> src/lib/core/markdown-editor/setup/editor-extensions.ts:sourceModeExtensions call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:133 in createExtensions -> src/lib/core/markdown-editor/editor-host.ts:editorHost mcall
call src/lib/core/markdown-editor/setup/editor-extensions.ts:134 in createExtensions -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:fencedBlockRenderers mcall
call src/lib/core/markdown-editor/setup/editor-extensions.ts:135 in createExtensions -> src/lib/core/markdown-editor/setup/editor-extensions.ts:sourceModeExtensions call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:141 in createExtensions -> src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:compositionAwareBracketMatching call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:147 in createExtensions -> src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts:dateShortcutCompletionSource ref
call src/lib/core/markdown-editor/setup/editor-extensions.ts:147 in createExtensions -> src/lib/core/markdown-editor/extensions/tag/completion.ts:tagCompletionSource ref
call src/lib/core/markdown-editor/setup/editor-extensions.ts:147 in createExtensions -> src/lib/core/markdown-editor/extensions/wikilink/completion.ts:wikilinkCompletionSource ref
call src/lib/core/markdown-editor/setup/editor-extensions.ts:150 in createExtensions -> src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:livePreview call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:156 in createExtensions -> src/lib/utils/keybindings.ts:toCodeMirrorKey call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:171 in createExtensions -> src/lib/core/markdown-editor/highlight-styles.ts:markdownLanguage call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:173 in createExtensions -> src/lib/core/markdown-editor/setup/editor-theme.ts:buildEditorTheme call
call src/lib/core/markdown-editor/setup/editor-extensions.ts:181 in createExtensions -> src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:FRONTMATTER_FENCE_RE mcall +1
## effects
reg src/lib/core/markdown-editor/setup/editor-extensions.ts:133 src/lib/core/markdown-editor/editor-host.ts:editorHost in createExtensions args=opts.host
reg src/lib/core/markdown-editor/setup/editor-extensions.ts:134 src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:fencedBlockRenderers in createExtensions args=renderer
