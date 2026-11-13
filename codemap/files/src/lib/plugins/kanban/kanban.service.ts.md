# file card src/lib/plugins/kanban/kanban.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/kanban.service.ts ' codemap/files
file src/lib/plugins/kanban/kanban.service.ts service L90 module src/lib/plugins/kanban in4 t7
## imports
imp src/lib/plugins/kanban/kanban.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile
imp src/lib/plugins/kanban/kanban.service.ts:3 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/plugins/kanban/kanban.service.ts:4 -> src/lib/plugins/kanban/kanban.logic.ts createEmptyKanbanBoard,serializeKanbanBoard,extractCardWikilinks
imp src/lib/plugins/kanban/kanban.service.ts:5 -> src/lib/plugins/kanban/kanban.store.svelte.ts kanbanStore
imp src/lib/plugins/kanban/kanban.service.ts:6 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/plugins/kanban/kanban.service.ts:7 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/kanban/kanban.service.ts:8 -> src/lib/core/filesystem/file-entries.logic.ts flattenFileTree
imp src/lib/plugins/kanban/kanban.service.ts:9 -> src/lib/core/filesystem/wikilink-resolution.logic.ts buildResolutionCache,resolveWikilinkCached
imp src/lib/plugins/kanban/kanban.service.ts:10 -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts stripFrontmatter
imp src/lib/plugins/kanban/kanban.service.ts:11 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/kanban/kanban.service.ts:12 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/app/boot.ts:17 -> src/lib/plugins/kanban/kanban.service.ts clearLinkedContentCache
imp src/lib/app/commands.ts:25 -> src/lib/plugins/kanban/kanban.service.ts createKanbanFile
imp src/lib/app/lifecycle/app-lifecycle.service.ts:65 -> src/lib/plugins/kanban/kanban.service.ts registerKanbanFolderCreator,resetKanban
imp src/lib/plugins/kanban/KanbanCard.svelte:11 -> src/lib/plugins/kanban/kanban.service.ts loadLinkedFileContent
## reach
in2 src/lib/plugins/kanban/kanban.service.ts 3 files in 3 modules: src/lib/app(1) src/lib/plugins/kanban(1) src/routes(1)
out2 src/lib/plugins/kanban/kanban.service.ts 17 files in 9 modules: src/lib/core/filesystem(4) src/lib/contracts(3) src/lib/utils(3) src/lib/core/settings(2) src/lib/core/editor(1) +4 modules
## tests
test src/tests/lib/plugins/kanban/kanban.service.test.ts imports src/lib/plugins/kanban/kanban.service.ts mirror
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/plugins/kanban/kanban.service.ts
test src/tests/lib/app/commands.new-commands.test.ts mocks src/lib/plugins/kanban/kanban.service.ts
test src/tests/lib/plugins/kanban/KanbanView.test.ts mocks src/lib/plugins/kanban/kanban.service.ts
test src/tests/lib/plugins/kanban/kanban-multiline-card.test.ts mocks src/lib/plugins/kanban/kanban.service.ts
test src/tests/lib/plugins/kanban/kanban-unmodeled-content.test.ts mocks src/lib/plugins/kanban/kanban.service.ts
test src/tests/lib/plugins/kanban/kanban-unmodeled-lines.test.ts mocks src/lib/plugins/kanban/kanban.service.ts
## symbols
sym src/lib/plugins/kanban/kanban.service.ts:18 fn createKanbanFile(parentPath: string): Promise<string> L3 | Creates a new `.kanban` file with an empty board (To Do, In Progress, Done).
by src/lib/plugins/kanban/kanban.service.ts:createKanbanFile <- src/lib/app/commands.ts:189 in getBuiltInCommands call
sym src/lib/plugins/kanban/kanban.service.ts:27 fn registerKanbanFolderCreator(): () => void L9 | Adds "New Kanban Board" to the Files navigator's folder menu: the rail shell may not import plugins (ADR 0003).
by src/lib/plugins/kanban/kanban.service.ts:registerKanbanFolderCreator <- src/lib/app/lifecycle/app-lifecycle.service.ts:275 in initializeVault call
sym src/lib/plugins/kanban/kanban.service.ts:38 fn resetKanban(): void L4 | Resets all kanban state (called during vault teardown)
by src/lib/plugins/kanban/kanban.service.ts:resetKanban <- src/lib/app/lifecycle/app-lifecycle.service.ts:668 in teardownVault call
sym src/lib/plugins/kanban/kanban.service.ts:49 fn clearLinkedContentCache(): void L3 | Clears the linked content cache so card previews re-read from disk.
by src/lib/plugins/kanban/kanban.service.ts:clearLinkedContentCache <- src/lib/app/boot.ts:41 in registerAppPorts ref
sym src/lib/plugins/kanban/kanban.service.ts:58 fn loadLinkedFileContent(cardText: string): Promise<string> L33 | Loads the markdown content (without frontmatter) from the first wikilinked file in a card.
by src/lib/plugins/kanban/kanban.service.ts:loadLinkedFileContent <- src/lib/plugins/kanban/KanbanCard.svelte:144 in $effect@139 call
## calls
call src/lib/plugins/kanban/kanban.service.ts:19 in createKanbanFile -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/plugins/kanban/kanban.service.ts:19 in createKanbanFile -> src/lib/plugins/kanban/kanban.logic.ts:createEmptyKanbanBoard call
call src/lib/plugins/kanban/kanban.service.ts:19 in createKanbanFile -> src/lib/plugins/kanban/kanban.logic.ts:serializeKanbanBoard call
call src/lib/plugins/kanban/kanban.service.ts:28 in registerKanbanFolderCreator -> src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerFolderCreator mcall
call src/lib/plugins/kanban/kanban.service.ts:33 in registerKanbanFolderCreator -> src/lib/plugins/kanban/kanban.service.ts:createKanbanFile ref
call src/lib/plugins/kanban/kanban.service.ts:39 in resetKanban -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.reset mcall
call src/lib/plugins/kanban/kanban.service.ts:63 in loadLinkedFileContent -> src/lib/plugins/kanban/kanban.logic.ts:extractCardWikilinks call
call src/lib/plugins/kanban/kanban.service.ts:72 in loadLinkedFileContent -> src/lib/core/filesystem/file-entries.logic.ts:flattenFileTree call
call src/lib/plugins/kanban/kanban.service.ts:73 in loadLinkedFileContent -> src/lib/core/filesystem/wikilink-resolution.logic.ts:buildResolutionCache call
call src/lib/plugins/kanban/kanban.service.ts:74 in loadLinkedFileContent -> src/lib/core/filesystem/wikilink-resolution.logic.ts:resolveWikilinkCached call
call src/lib/plugins/kanban/kanban.service.ts:82 in loadLinkedFileContent -> src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:stripFrontmatter call
call src/lib/plugins/kanban/kanban.service.ts:86 in loadLinkedFileContent -> src/lib/utils/debug.ts:error call
## effects
reg src/lib/plugins/kanban/kanban.service.ts:28 src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore.registerFolderCreator in registerKanbanFolderCreator args={ id: 'kanban', label: 'New Kanban Board', icon: Kanban, fileName: 'Untitled.ka…
fx src/lib/plugins/kanban/kanban.service.ts:81 tauri-fs.readTextFile in loadLinkedFileContent
