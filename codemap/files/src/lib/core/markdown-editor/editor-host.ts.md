# file card src/lib/core/markdown-editor/editor-host.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/markdown-editor/editor-host.ts ' codemap/files
file src/lib/core/markdown-editor/editor-host.ts other L107 module src/lib/core/markdown-editor in11 t17
## imports
imp src/lib/core/markdown-editor/editor-host.ts:3 -> src/lib/core/filesystem/file-entries.logic.ts type:FileEntry
imp src/lib/core/markdown-editor/editor-host.ts:4 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
## imported-by
imp src/lib/app/editor-host.ts:17 -> src/lib/core/markdown-editor/editor-host.ts type:BlockLinkActions,type:EditorHost,type:LinkAnchor,type:VaultTag
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:34 -> src/lib/core/markdown-editor/editor-host.ts type:BlockLinkActions,type:EditorHost
imp src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:6 -> src/lib/core/markdown-editor/editor-host.ts editorHost
imp src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:22 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:4 -> src/lib/core/markdown-editor/editor-host.ts editorHost
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:4 -> src/lib/core/markdown-editor/editor-host.ts type:EditorHost,type:LinkAnchor
imp src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:5 -> src/lib/core/markdown-editor/editor-host.ts editorHost
imp src/lib/core/markdown-editor/extensions/tag/completion.ts:2 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:VaultTag
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:5 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
imp src/lib/core/markdown-editor/setup/editor-extensions.ts:27 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
imp src/lib/plugins/quick-capture/composer-editor-host.service.ts:4 -> src/lib/core/markdown-editor/editor-host.ts NOOP_HOST,type:EditorHost,type:LinkCandidates,type:VaultTag
imp src/lib/plugins/quick-capture/composer-editor.ts:5 -> src/lib/core/markdown-editor/editor-host.ts editorHost,type:EditorHost
## reach
in2 src/lib/core/markdown-editor/editor-host.ts 14 files in 3 modules: src/lib/core/markdown-editor(11) src/lib/app(2) src/routes(1)
out2 src/lib/core/markdown-editor/editor-host.ts 3 files in 3 modules: src/lib/contracts(1) src/lib/core/filesystem(1) src/lib/utils(1)
## tests
test src/tests/lib/core/markdown-editor/editor-host.test.ts imports src/lib/core/markdown-editor/editor-host.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/click-handler.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/inline/pipeline-dom.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/wikilink-image-embed-widget.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/extensions/tag/completion.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/features/todoist-sync/note-writer.service.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/plugins/quick-capture/composer-editor-host.service.test.ts imports src/lib/core/markdown-editor/editor-host.ts
test src/tests/lib/plugins/quick-capture/composer-editor.test.ts imports src/lib/core/markdown-editor/editor-host.ts
## symbols
sym src/lib/core/markdown-editor/editor-host.ts:7 interface LinkAnchor L4 | The `#heading` or `#^block-id` part of a wikilink; both null for a plain link.
by src/lib/core/markdown-editor/editor-host.ts:LinkAnchor <- src/lib/app/editor-host.ts:17 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:LinkAnchor <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:4 in (module) import
sym src/lib/core/markdown-editor/editor-host.ts:13 interface LinkCandidates L4 | What wikilink completion offers: the vault's files and, when asked for, its notes' frontmatter (aliases).
by src/lib/core/markdown-editor/editor-host.ts:LinkCandidates <- src/lib/plugins/quick-capture/composer-editor-host.service.ts:4 in (module) import
sym src/lib/core/markdown-editor/editor-host.ts:19 interface VaultTag L6 | A tag the vault uses, as tag completion offers it.
by src/lib/core/markdown-editor/editor-host.ts:VaultTag <- src/lib/app/editor-host.ts:17 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:VaultTag <- src/lib/core/markdown-editor/extensions/tag/completion.ts:2 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:VaultTag <- src/lib/plugins/quick-capture/composer-editor-host.service.ts:4 in (module) import
sym src/lib/core/markdown-editor/editor-host.ts:27 interface CreateNoteOptions L4 | Options of `EditorHost.createNote`.
sym src/lib/core/markdown-editor/editor-host.ts:44 interface EditorHost L33 | Everything the markdown editor needs from the app: link resolution, note reads, asset URLs, navigation, note creation, the vault's tags and the tag search.
by src/lib/core/markdown-editor/editor-host.ts:EditorHost <- src/lib/app/editor-host.ts:17 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:EditorHost <- src/lib/core/markdown-editor/MarkdownEditor.svelte:34 in (script) import
by src/lib/core/markdown-editor/editor-host.ts:EditorHost <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:22 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:EditorHost <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:4 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:EditorHost <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:5 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:EditorHost <- src/lib/core/markdown-editor/setup/editor-extensions.ts:27 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:EditorHost <- src/lib/plugins/quick-capture/composer-editor-host.service.ts:4 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:EditorHost <- src/lib/plugins/quick-capture/composer-editor.ts:5 in (module) import
sym src/lib/core/markdown-editor/editor-host.ts:79 interface BlockLinkActions L6 | Copy Block Link and Copy block embed for the block at the cursor; the app supplies them.
by src/lib/core/markdown-editor/editor-host.ts:BlockLinkActions <- src/lib/app/editor-host.ts:17 in (module) import
by src/lib/core/markdown-editor/editor-host.ts:BlockLinkActions <- src/lib/core/markdown-editor/MarkdownEditor.svelte:34 in (script) import
sym src/lib/core/markdown-editor/editor-host.ts:87 const NOOP_HOST: EditorHost L12 | The host of an editor nobody configured: resolves nothing and does nothing.
by src/lib/core/markdown-editor/editor-host.ts:NOOP_HOST <- src/lib/plugins/quick-capture/composer-editor-host.service.ts:60 in createComposerEditorHost ref
sym src/lib/core/markdown-editor/editor-host.ts:104 const editorHost = Facet.define(…) L4 | The editor's host.
by src/lib/core/markdown-editor/editor-host.ts:editorHost <- src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts:36 in handleLivePreviewLinkMousedown ref +1
by src/lib/core/markdown-editor/editor-host.ts:editorHost <- src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:162 in ImageWidget.toDOM ref +3
by src/lib/core/markdown-editor/editor-host.ts:editorHost <- src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:96 in executeButtonAction ref
by src/lib/core/markdown-editor/editor-host.ts:editorHost <- src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:62 in followWikilinkInfo ref
by src/lib/core/markdown-editor/editor-host.ts:editorHost <- src/lib/core/markdown-editor/extensions/tag/completion.ts:26 in tagCompletionSource ref
by src/lib/core/markdown-editor/editor-host.ts:editorHost <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:68 in buildFileCompletions ref +2
by src/lib/core/markdown-editor/editor-host.ts:editorHost <- src/lib/core/markdown-editor/setup/editor-extensions.ts:129 in createExtensions mcall
by src/lib/core/markdown-editor/editor-host.ts:editorHost <- src/lib/plugins/quick-capture/composer-editor.ts:108 in createComposerEditor mcall
