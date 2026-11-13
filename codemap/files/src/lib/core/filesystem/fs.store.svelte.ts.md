# file card src/lib/core/filesystem/fs.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/fs.store.svelte.ts ' codemap/files
file src/lib/core/filesystem/fs.store.svelte.ts store L48 module src/lib/core/filesystem in22 t56
## imports
imp src/lib/core/filesystem/fs.store.svelte.ts:1 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode,type:FolderOrderMap
## imported-by
imp src/lib/app/AppShell.svelte:7 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/commands.ts:22 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/editor-host.ts:9 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:80 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/tauri-listeners.service.ts:14 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/filesystem/fs.service.ts:5 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/filesystem/fs.watcher.ts:6 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/filesystem/link-updater.service.ts:9 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/filesystem/path-change.service.ts:2 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/core/trash/trash.service.ts:15 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/canvas/CanvasFilePicker.svelte:2 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:13 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/note-list/NoteRow.svelte:6 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:16 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/properties/PropertiesView.svelte:12 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/properties/RelationshipSearch.svelte:5 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:3 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:21 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/RailNoteList.svelte:20 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:23 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:5 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/plugins/kanban/kanban.service.ts:6 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
## reach
in2 src/lib/core/filesystem/fs.store.svelte.ts 29 files in 18 modules: src/lib/app(5) src/lib/features/rail-shell(4) src/lib/features/canvas(2) src/lib/features/todoist-sync(2) src/lib/plugins/kanban(2) +13 modules: q impact src/lib/core/filesystem/fs.store.svelte.ts --depth 2
out2 src/lib/core/filesystem/fs.store.svelte.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/core/filesystem/fs.store.client.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts mirror
test src/tests/lib/core/filesystem/fs.store.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts mirror
test src/tests/fixtures/file-tree-derived-probe.svelte.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/app/AppShell.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/app/boot.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/app/commands.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/editor/editor.service.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/filesystem/delete-dirty-tab.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/filesystem/f165-delete-dirty-tab.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/filesystem/fs.service.race-audit.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/filesystem/fs.watcher.app-patch.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/filesystem/fs.watcher.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/filesystem/link-updater.service.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/wikilink-image-embed-widget.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/note-creator/note-creator.tree.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/collection/collection-view-index-path-change.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/event-calendar/EventCalendarSection.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/properties/PropertiesView.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/properties/RelationshipSearch.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/core/filesystem/fs.store.svelte.ts
more tests 16 not shown: src/tests/lib/features/rail-shell(4) src/tests/lib/plugins/mods(4) src/tests/lib/features/todoist-sync(3) src/tests/lib/plugins/kanban(2) src/tests/lib/features/type-definitions(1) src/tests/lib/plugins/calendar(1) src/tests/lib/plugins/templates(1): q tests src/lib/core/filesystem/fs.store.svelte.ts
## symbols
sym src/lib/core/filesystem/fs.store.svelte.ts:25 store fsStore L24 | Central store for the file system / file explorer state.
by src/lib/core/filesystem/fs.store.svelte.ts:fsStore <- src/lib/app/AppShell.svelte:123 in viewFilesKey=$derived member +3
by src/lib/core/filesystem/fs.store.svelte.ts:fsStore <- src/lib/app/commands.ts:100 in openViewCommands member
by src/lib/core/filesystem/fs.store.svelte.ts:fsStore <- src/lib/app/editor-host.ts:77 in treeLinkIndex member +1
by src/lib/core/filesystem/fs.store.svelte.ts:fsStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:387 in initializeVault mcall +4
by src/lib/core/filesystem/fs.store.svelte.ts:fsStore <- src/lib/app/tauri-listeners.service.ts:198 in registerVaultIndexUpdatedListener member +2
by src/lib/core/filesystem/fs.store.svelte.ts:fsStore <- src/lib/core/filesystem/fs.service.ts:49 in loadFolderOrder mcall +12
by src/lib/core/filesystem/fs.store.svelte.ts:fsStore <- src/lib/core/filesystem/fs.watcher.ts:184 in handleChangedPaths member +5
by src/lib/core/filesystem/fs.store.svelte.ts:fsStore <- src/lib/core/filesystem/link-updater.service.ts:41 in updateLinksAfterRename member
more by 14 not shown: src/lib/features/rail-shell(3) src/lib/features/note-list(2) src/lib/features/properties(2) src/lib/plugins/kanban(2) src/lib/core/filesystem(1) src/lib/core/trash(1) src/lib/features/canvas(1) src/lib/features/event-calendar(1) +1 modules: q importers src/lib/core/filesystem/fs.store.svelte.ts:fsStore
## store
store src/lib/core/filesystem/fs.store.svelte.ts:25 fsStore esc:0
mem src/lib/core/filesystem/fs.store.svelte.ts:26 get fsStore.fileTree r:36 w-via:setFileTree,reset
more r 36 not shown: src/lib/app(9) src/lib/core/filesystem(9) src/lib/features/rail-shell(9) src/lib/core/trash(2) src/lib/features/properties(2) src/lib/plugins/kanban(2) src/lib/features/canvas(1) src/lib/features/event-calendar(1) +1 modules: q store src/lib/core/filesystem/fs.store.svelte.ts:fsStore.fileTree
mem src/lib/core/filesystem/fs.store.svelte.ts:27 get fsStore.isLoading r:- w-via:startLoading,stopLoading,reset
mem src/lib/core/filesystem/fs.store.svelte.ts:28 get fsStore.renamingPath r:src/lib/features/note-list/NoteRow.svelte:47,src/lib/features/note-list/NoteRowMenu.svelte:110,src/lib/features/note-list/NoteRowMenu.svelte:132 w-via:setRenamingPath,reset
mem src/lib/core/filesystem/fs.store.svelte.ts:29 get fsStore.folderOrder r:src/lib/app/lifecycle/app-lifecycle.service.ts:389,src/lib/core/filesystem/fs.service.ts:139,src/lib/core/filesystem/fs.watcher.ts:218 w-via:setFolderOrder,reset
mem src/lib/core/filesystem/fs.store.svelte.ts:30 get fsStore.contentOrder r:src/lib/app/tauri-listeners.service.ts:198,src/lib/app/tauri-listeners.service.ts:252,src/lib/core/filesystem/fs.service.ts:110,src/lib/core/filesystem/fs.service.ts:138,src/lib/core/filesystem/fs.watcher.ts:229 w-via:setContentOrder,reset
mem src/lib/core/filesystem/fs.store.svelte.ts:32 do fsStore.setFileTree w:src/lib/app/lifecycle/app-lifecycle.service.ts:390,src/lib/core/filesystem/fs.service.ts:116,src/lib/core/filesystem/fs.service.ts:165,src/lib/core/filesystem/fs.watcher.ts:250,src/lib/core/filesystem/path-change.service.ts:184,src/lib/core/filesystem/path-change.service.ts:211
mem src/lib/core/filesystem/fs.store.svelte.ts:33 do fsStore.setFolderOrder w:src/lib/core/filesystem/fs.service.ts:49,src/lib/core/filesystem/fs.service.ts:55,src/lib/core/filesystem/fs.service.ts:64,src/lib/core/filesystem/fs.service.ts:68
mem src/lib/core/filesystem/fs.store.svelte.ts:34 do fsStore.setContentOrder w:src/lib/app/lifecycle/app-lifecycle.service.ts:387,src/lib/app/tauri-listeners.service.ts:201
mem src/lib/core/filesystem/fs.store.svelte.ts:36 do fsStore.startLoading w:src/lib/core/filesystem/fs.service.ts:91 | Increments or decrements the loading counter. isLoading is true while counter > 0.
mem src/lib/core/filesystem/fs.store.svelte.ts:37 do fsStore.stopLoading w:src/lib/core/filesystem/fs.service.ts:124
mem src/lib/core/filesystem/fs.store.svelte.ts:38 do fsStore.setRenamingPath w:src/lib/features/note-list/NoteRowMenu.svelte:105,src/lib/features/note-list/NoteRowMenu.svelte:134,src/lib/features/note-list/NoteRowMenu.svelte:148
mem src/lib/core/filesystem/fs.store.svelte.ts:41 do fsStore.reset w:src/lib/core/filesystem/fs.service.ts:378 | Resets all state to initial values (e.g. when switching vaults)
