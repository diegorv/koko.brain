# file card src/lib/core/filesystem/fs.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/fs.types.ts ' codemap/files
file src/lib/core/filesystem/fs.types.ts types L16 module src/lib/core/filesystem in11 t0
## imports
imp src/lib/core/filesystem/fs.types.ts:1 -> src/lib/contracts/index.ts type:FileNode
imp src/lib/core/filesystem/fs.types.ts:3 -> src/lib/contracts/index.ts type:FileReadResult
## imported-by
imp src/lib/app/editor-host.ts:10 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/core/filesystem/file-entries.logic.ts:1 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/core/filesystem/folder-notes.logic.ts:1 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/core/filesystem/fs.logic.ts:6 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode,type:FolderOrderMap
imp src/lib/core/filesystem/fs.service.ts:4 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode,type:FolderOrderMap
imp src/lib/core/filesystem/fs.store.svelte.ts:1 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode,type:FolderOrderMap
imp src/lib/core/filesystem/fs.watcher.ts:9 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/rail-shell/FilesNavigator.svelte:22 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/rail-shell/lens.logic.ts:4 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/rail-shell/rail-shell.types.ts:4 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
imp src/lib/features/type-definitions/type-sidebar.logic.ts:4 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
## reach
in2 src/lib/core/filesystem/fs.types.ts 81 files in 30 modules: src/lib/features/rail-shell(16) src/lib/app(9) src/lib/features/type-definitions(6) src/lib/core/markdown-editor(4) src/lib/features/collection(4) +25 modules: q impact src/lib/core/filesystem/fs.types.ts --depth 2
out2 src/lib/core/filesystem/fs.types.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/fixtures/tauri-api.fixture.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/help/type-definitions-views.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/app/AppShell.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/app/commands.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/app/editor-host.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/filesystem/file-entries.logic.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/filesystem/folder-notes.logic.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/filesystem/fs.logic.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/filesystem/fs.store.client.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/filesystem/fs.watcher.app-patch.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/filesystem/fs.watcher.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/wikilink-image-embed-widget.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/core/trash/trash.service.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/properties/RelationshipSearch.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/features/search/search.service.test.ts imports-type src/lib/core/filesystem/fs.types.ts
test src/tests/lib/plugins/kanban/KanbanWikilinkSuggestions.test.ts imports-type src/lib/core/filesystem/fs.types.ts
## symbols
sym src/lib/core/filesystem/fs.types.ts:3 reexport FileReadResult = dto:FileReadResult L1
sym src/lib/core/filesystem/fs.types.ts:6 type FileTreeNode L4 | A file or folder in the vault's file tree: the `scan_vault` wire shape.
by src/lib/core/filesystem/fs.types.ts:FileTreeNode <- src/lib/app/editor-host.ts:10 in (module) import
by src/lib/core/filesystem/fs.types.ts:FileTreeNode <- src/lib/core/filesystem/file-entries.logic.ts:1 in (module) import
by src/lib/core/filesystem/fs.types.ts:FileTreeNode <- src/lib/core/filesystem/folder-notes.logic.ts:1 in (module) import
by src/lib/core/filesystem/fs.types.ts:FileTreeNode <- src/lib/core/filesystem/fs.logic.ts:6 in (module) import
by src/lib/core/filesystem/fs.types.ts:FileTreeNode <- src/lib/core/filesystem/fs.service.ts:4 in (module) import
by src/lib/core/filesystem/fs.types.ts:FileTreeNode <- src/lib/core/filesystem/fs.store.svelte.ts:1 in (module) import
by src/lib/core/filesystem/fs.types.ts:FileTreeNode <- src/lib/core/filesystem/fs.watcher.ts:9 in (module) import
by src/lib/core/filesystem/fs.types.ts:FileTreeNode <- src/lib/features/rail-shell/FilesNavigator.svelte:22 in (script) import
more by 3 not shown: src/lib/features/rail-shell(2) src/lib/features/type-definitions(1): q importers src/lib/core/filesystem/fs.types.ts:FileTreeNode
sym src/lib/core/filesystem/fs.types.ts:16 type FolderOrderMap L1 | Maps relative directory paths to ordered arrays of folder names.
by src/lib/core/filesystem/fs.types.ts:FolderOrderMap <- src/lib/core/filesystem/fs.logic.ts:6 in (module) import
by src/lib/core/filesystem/fs.types.ts:FolderOrderMap <- src/lib/core/filesystem/fs.service.ts:4 in (module) import
by src/lib/core/filesystem/fs.types.ts:FolderOrderMap <- src/lib/core/filesystem/fs.store.svelte.ts:1 in (module) import
