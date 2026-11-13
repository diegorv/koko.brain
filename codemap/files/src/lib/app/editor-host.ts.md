# file card src/lib/app/editor-host.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/editor-host.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/app/editor-host.ts other L216 module src/lib/app in1 t8
## imports
imp src/lib/app/editor-host.ts:1 -> pkg:@tauri-apps/api/core convertFileSrc
imp src/lib/app/editor-host.ts:2 -> pkg:@tauri-apps/plugin-fs readTextFile
imp src/lib/app/editor-host.ts:3 -> pkg:@tauri-apps/plugin-opener openUrl
imp src/lib/app/editor-host.ts:4 -> src/lib/contracts/ipc.ts call
imp src/lib/app/editor-host.ts:5 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/app/editor-host.ts:6 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/editor-host.ts:7 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree,type:FileEntry
imp src/lib/app/editor-host.ts:8 -> src/lib/core/filesystem/fs.logic.ts findNodeByPath
imp src/lib/app/editor-host.ts:9 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/editor-host.ts:10 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/app/editor-host.ts:11 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,isLinkTargetFile,resolveWikilinkCached,type:WikilinkResolutionCache
imp src/lib/app/editor-host.ts:17 -> src/lib/core/markdown-editor/editor-host.ts type:BlockLinkActions,type:EditorHost,type:LinkAnchor,type:VaultTag
imp src/lib/app/editor-host.ts:18 -> src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts type:FencedBlockRenderer
imp src/lib/app/editor-host.ts:19 -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts followWikilink
imp src/lib/app/editor-host.ts:20 -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts findBlockIdPosition,findHeadingPosition
imp src/lib/app/editor-host.ts:21 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/app/editor-host.ts:22 -> src/lib/core/note-creator/explicit-organization.logic.ts withUnorganizedFlag
imp src/lib/app/editor-host.ts:23 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/editor-host.ts:24 -> src/lib/core/vault/vault-entries.service.ts getVaultEntries
imp src/lib/app/editor-host.ts:25 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/editor-host.ts:26 -> src/lib/utils/debug.ts error
imp src/lib/app/editor-host.ts:27 -> src/lib/utils/path.ts resolveFilePath
imp src/lib/app/editor-host.ts:28 -> src/lib/features/collection/collection-block-widget.ts collectionBlockRenderer
imp src/lib/app/editor-host.ts:29 -> src/lib/features/copy-block-link/copy-block-link.service.ts copyBlockEmbedToClipboard,copyBlockLinkToClipboard
imp src/lib/app/editor-host.ts:30 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/app/editor-host.ts:31 -> src/lib/features/type-definitions/type-sidebar.logic.ts getViewOpensInEditor
imp src/lib/app/editor-host.ts:32 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/editor-host.ts:33 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts detectPeriodicNoteType
imp src/lib/app/editor-host.ts:34 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreatePeriodicNoteForDate
imp src/lib/app/editor-host.ts:35 -> src/lib/plugins/queryjs/queryjs-block-widget.ts queryjsBlockRenderer
imp src/lib/app/editor-host.ts:36 -> src/lib/app/rail-navigation.ts openRailView
## imported-by
imp src/lib/app/EditorView.svelte:13 -> src/lib/app/editor-host.ts appBlockLinks,appEditorHost,appFencedBlockRenderers,openWikilinkTarget
## reach
in2 src/lib/app/editor-host.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/app/editor-host.ts 45 files in 16 modules: src/lib/features/collection(8) src/lib/utils(7) src/lib/core/markdown-editor(4) src/lib/core/settings(4) src/lib/plugins/queryjs(4) +11 modules
## tests
test src/tests/lib/app/editor-host.test.ts imports src/lib/app/editor-host.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/app/editor-host.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/app/editor-host.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/app/editor-host.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/app/editor-host.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/wikilink-image-embed-widget.test.ts imports src/lib/app/editor-host.ts
test src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts imports src/lib/app/editor-host.ts
test src/tests/lib/features/todoist-sync/note-writer.service.test.ts imports src/lib/app/editor-host.ts
## symbols
sym src/lib/app/editor-host.ts:123 const appEditorHost: EditorHost L76 | The editor host of the app, over the file tree, the vault entries, Tauri, the note creator, periodic notes, the rail's view navigation and Search.
by src/lib/app/editor-host.ts:appEditorHost <- src/lib/app/EditorView.svelte:93 in (markup) markup
sym src/lib/app/editor-host.ts:205 fn openWikilinkTarget(target: string): Promise<void> L3 | Opens a wikilink target the way a click in the editor does: the note it resolves to, else a new note (a periodic one when the name matches).
by src/lib/app/editor-host.ts:openWikilinkTarget <- src/lib/app/EditorView.svelte:73 in (markup) markup +1
sym src/lib/app/editor-host.ts:210 const appFencedBlockRenderers: readonly FencedBlockRenderer[] L1 | The fenced-block renderers the app's editor installs: each feature or plugin that owns a block kind registers here.
by src/lib/app/editor-host.ts:appFencedBlockRenderers <- src/lib/app/EditorView.svelte:93 in (markup) markup
sym src/lib/app/editor-host.ts:213 const appBlockLinks: BlockLinkActions L4 | The editor's copy-block-link actions, from the copy-block-link feature.
by src/lib/app/editor-host.ts:appBlockLinks <- src/lib/app/EditorView.svelte:93 in (markup) markup
## locals
local src/lib/app/editor-host.ts:39 fn scrollToAnchor(anchor: LinkAnchor | undefined): void L9
local src/lib/app/editor-host.ts:54 fn periodicTarget(target: string) L6
local src/lib/app/editor-host.ts:76 fn treeLinkIndex(): TreeLinkIndex L10
local src/lib/app/editor-host.ts:96 fn vaultTags(): Promise<readonly VaultTag[]> L16
local src/lib/app/editor-host.ts:114 fn markdownTarget(target: string): string L3
## calls
call src/lib/app/editor-host.ts:44 in scrollToAnchor -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findHeadingPosition call
call src/lib/app/editor-host.ts:45 in scrollToAnchor -> src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:findBlockIdPosition call
call src/lib/app/editor-host.ts:46 in scrollToAnchor -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setPendingScrollPosition mcall
call src/lib/app/editor-host.ts:56 in periodicTarget -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:detectPeriodicNoteType call +1
call src/lib/app/editor-host.ts:80 in treeLinkIndex -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/app/editor-host.ts:80 in treeLinkIndex -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/app/editor-host.ts:81 in treeLinkIndex -> src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache call
call src/lib/app/editor-host.ts:102 in vaultTags -> src/lib/contracts/ipc.ts:call call
call src/lib/app/editor-host.ts:125 in appEditorHost.resolveLink -> src/lib/app/editor-host.ts:treeLinkIndex call
call src/lib/app/editor-host.ts:125 in appEditorHost.resolveLink -> src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached call
call src/lib/app/editor-host.ts:129 in appEditorHost.listLinkCandidates -> src/lib/app/editor-host.ts:treeLinkIndex call
call src/lib/app/editor-host.ts:131 in appEditorHost.listLinkCandidates -> src/lib/core/filesystem/wikilink-resolution.logic.ts:isLinkTargetFile call
call src/lib/app/editor-host.ts:131 in appEditorHost.listLinkCandidates -> src/lib/core/vault/vault-entries.service.ts:getVaultEntries call
call src/lib/app/editor-host.ts:144 in appEditorHost.openLink -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/app/editor-host.ts:145 in appEditorHost.openLink -> src/lib/app/editor-host.ts:scrollToAnchor call
call src/lib/app/editor-host.ts:155 in appEditorHost.createNote -> src/lib/app/editor-host.ts:periodicTarget call
call src/lib/app/editor-host.ts:158 in appEditorHost.createNote -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreatePeriodicNoteForDate call
call src/lib/app/editor-host.ts:160 in appEditorHost.createNote -> src/lib/app/editor-host.ts:markdownTarget call
call src/lib/app/editor-host.ts:161 in appEditorHost.createNote -> src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote call
call src/lib/app/editor-host.ts:162 in appEditorHost.createNote -> src/lib/utils/path.ts:resolveFilePath call
call src/lib/app/editor-host.ts:164 in appEditorHost.createNote -> src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag ref
call src/lib/app/editor-host.ts:168 in appEditorHost.createNote -> src/lib/utils/debug.ts:error call
call src/lib/app/editor-host.ts:171 in appEditorHost.createNote -> src/lib/app/editor-host.ts:scrollToAnchor call
call src/lib/app/editor-host.ts:180 in appEditorHost.openView -> src/lib/utils/path.ts:resolveFilePath call
call src/lib/app/editor-host.ts:185 in appEditorHost.openView -> src/lib/core/filesystem/fs.logic.ts:findNodeByPath call
call src/lib/app/editor-host.ts:187 in appEditorHost.openView -> src/lib/app/rail-navigation.ts:openRailView call
call src/lib/app/editor-host.ts:187 in appEditorHost.openView -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.getEntryByPath mcall
call src/lib/app/editor-host.ts:187 in appEditorHost.openView -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewOpensInEditor call
call src/lib/app/editor-host.ts:192 in appEditorHost.openTagSearch -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/app/editor-host.ts:196 in appEditorHost.listTags -> src/lib/app/editor-host.ts:vaultTags call
call src/lib/app/editor-host.ts:206 in openWikilinkTarget -> src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:followWikilink call
call src/lib/app/editor-host.ts:214 in appBlockLinks -> src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockLinkToClipboard ref
call src/lib/app/editor-host.ts:215 in appBlockLinks -> src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockEmbedToClipboard ref
## effects
ipc-call src/lib/app/editor-host.ts:102 in vaultTags -> ipc:get_all_tags_v2 -> src-tauri/src/commands/vault.rs:638
fx src/lib/app/editor-host.ts:136 tauri-fs.readTextFile in appEditorHost.readNote
fx src/lib/app/editor-host.ts:140 tauri-api-core.convertFileSrc in appEditorHost.assetUrl
fx src/lib/app/editor-host.ts:149 tauri-opener.openUrl in appEditorHost.openExternal
