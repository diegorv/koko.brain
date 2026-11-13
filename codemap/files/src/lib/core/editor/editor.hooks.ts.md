# file card src/lib/core/editor/editor.hooks.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/editor/editor.hooks.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, calls, effects
file src/lib/core/editor/editor.hooks.ts other L137 module src/lib/core/editor in23 t49
## imports
imp src/lib/core/editor/editor.hooks.ts:1 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange,notifyContentInvalidated
imp src/lib/core/editor/editor.hooks.ts:2 -> src/lib/utils/index-dedupe.ts clearAllIndexed
imp src/lib/core/editor/editor.hooks.ts:3 -> src/lib/utils/debug.ts debug,error
## imported-by
imp src/lib/app/commands.ts:11 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/app/deep-link-actions.ts:3 -> src/lib/core/editor/editor.hooks.ts markRecentSave,notifyAfterSave
imp src/lib/app/lifecycle/app-lifecycle.service.ts:4 -> src/lib/core/editor/editor.hooks.ts resetHooks
imp src/lib/app/lifecycle/watcher-handler.service.ts:5 -> src/lib/core/editor/editor.hooks.ts areAllRecentSaves
imp src/lib/core/editor/editor.service.ts:7 -> src/lib/core/editor/editor.hooks.ts notifyAfterSave
imp src/lib/core/filesystem/fs.service.ts:9 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/core/filesystem/task-write.service.ts:2 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/core/frontmatter/frontmatter-write.service.ts:5 -> src/lib/core/editor/editor.hooks.ts notifyAfterSave
imp src/lib/core/note-creator/note-creator.service.ts:5 -> src/lib/core/editor/editor.hooks.ts markRecentSave,notifyNoteCreated
imp src/lib/core/trash/trash.service.ts:17 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/features/auto-organize/auto-organize.service.ts:2 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/deep-link/deep-link.service.ts:14 -> src/lib/core/editor/editor.hooks.ts markRecentSave,notifyAfterSave
imp src/lib/features/file-history/file-history.service.ts:8 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:6 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/rail-shell/FilesNavigator.svelte:19 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/rail-shell/new-note.service.ts:2 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/features/search/SemanticIndexStatus.svelte:9 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/search/search.service.ts:7 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/todoist-sync/closed-note-writer.service.ts:3 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/features/todoist-sync/sync-scheduler.service.ts:3 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver
imp src/lib/features/type-definitions/type-definitions.service.ts:14 -> src/lib/core/editor/editor.hooks.ts markRecentSave
imp src/lib/plugins/mods/mod-vault.service.ts:4 -> src/lib/core/editor/editor.hooks.ts markRecentSave,notifyAfterSave
imp src/lib/plugins/mods/mods-host.service.ts:5 -> src/lib/core/editor/editor.hooks.ts addAfterSaveObserver,addNoteCreatedObserver
## reach
in2 src/lib/core/editor/editor.hooks.ts 68 files in 31 modules: src/lib/app(9) src/lib/features/event-calendar(5) src/lib/core/filesystem(4) src/lib/features/properties(4) src/lib/features/canvas(3) +26 modules: q impact src/lib/core/editor/editor.hooks.ts --depth 2
out2 src/lib/core/editor/editor.hooks.ts 6 files in 3 modules: src/lib/contracts(2) src/lib/core/settings(2) src/lib/utils(2)
## tests
test src/tests/lib/core/editor/editor.hooks.test.ts imports src/lib/core/editor/editor.hooks.ts mirror
test src/tests/fixtures/calendar-vault.fixture.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/app/boot.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/app/commands.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/core/editor/editor.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/core/filesystem/task-write.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/core/vault/vault-switch-failed-save.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/auto-organize/auto-organize.no-chain.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/file-icons/file-icons.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/file-icons/frontmatter-icon.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/properties/bookmark-migration.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/properties/lifecycle.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/rail-shell/list-prefs.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/rail-shell/new-note.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/tasks/tasks.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/todoist-sync/closed-note-writer.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/todoist-sync/note-writer.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/todoist-sync/sync-now.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/todoist-sync/sync-scheduler.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/type-definitions/edit-view.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/type-definitions/rewrite-view-file.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/features/type-definitions/update-view-toolbar-key.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/plugins/mods/mod-note-created.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/plugins/mods/mod-note-moved.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/plugins/mods/mod-note-saved.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/plugins/mods/mod-vault-paths.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/plugins/mods/mod-vault.service.test.ts imports src/lib/core/editor/editor.hooks.ts
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts mocks src/lib/core/editor/editor.hooks.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/editor/editor.hooks.ts
test src/tests/lib/app/lifecycle/watcher-handler.service.test.ts mocks src/lib/core/editor/editor.hooks.ts
more tests 9 not shown: src/tests/lib/core/note-creator(2) src/tests/lib/features/deep-link(2) src/tests/lib/plugins/one-on-one(2) src/tests/lib/features/auto-organize(1) src/tests/lib/features/file-history(1) src/tests/lib/features/search(1): q tests src/lib/core/editor/editor.hooks.ts
## symbols
sym src/lib/core/editor/editor.hooks.ts:10 type AfterSaveObserver L1 | Called after a file is successfully saved to disk.
sym src/lib/core/editor/editor.hooks.ts:37 fn markRecentSave(path: string): void L8 | Marks a file path as recently saved/created by the editor.
by src/lib/core/editor/editor.hooks.ts:markRecentSave <- src/lib/app/deep-link-actions.ts:74 in executeDailyAction call +1
by src/lib/core/editor/editor.hooks.ts:markRecentSave <- src/lib/core/filesystem/fs.service.ts:209 in createFile call
by src/lib/core/editor/editor.hooks.ts:markRecentSave <- src/lib/core/filesystem/task-write.service.ts:29 in settleTaskWrite call
by src/lib/core/editor/editor.hooks.ts:markRecentSave <- src/lib/core/note-creator/note-creator.service.ts:108 in openOrCreateNote call
by src/lib/core/editor/editor.hooks.ts:markRecentSave <- src/lib/core/trash/trash.service.ts:256 in indexRestoredNotes call
by src/lib/core/editor/editor.hooks.ts:markRecentSave <- src/lib/features/deep-link/deep-link.service.ts:273 in executeNewAction call +3
by src/lib/core/editor/editor.hooks.ts:markRecentSave <- src/lib/features/todoist-sync/closed-note-writer.service.ts:77 in createNoteFile call
by src/lib/core/editor/editor.hooks.ts:markRecentSave <- src/lib/features/type-definitions/type-definitions.service.ts:438 in rewriteViewFileNow call
more by 1 not shown: src/lib/plugins/mods(1): q importers src/lib/core/editor/editor.hooks.ts:markRecentSave
sym src/lib/core/editor/editor.hooks.ts:47 fn areAllRecentSaves(paths: string[]): boolean L3 | Returns true if ALL given paths were recently saved by the editor.
by src/lib/core/editor/editor.hooks.ts:areAllRecentSaves <- src/lib/app/lifecycle/watcher-handler.service.ts:50 in rebuildAllIndexes call
sym src/lib/core/editor/editor.hooks.ts:52 fn addAfterSaveObserver(observer: AfterSaveObserver): () => void L9 | Adds an after-save observer.
by src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver <- src/lib/features/auto-organize/auto-organize.service.ts:204 in registerAutoOrganizeHook call
by src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver <- src/lib/features/file-history/file-history.service.ts:192 in registerFileHistoryHook call
by src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver <- src/lib/features/search/SemanticIndexStatus.svelte:23 in (script) call
by src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver <- src/lib/features/search/search.service.ts:303 in registerSearchIndexHook call
by src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver <- src/lib/features/todoist-sync/sync-scheduler.service.ts:90 in startAutoSync call
by src/lib/core/editor/editor.hooks.ts:addAfterSaveObserver <- src/lib/plugins/mods/mods-host.service.ts:630 in createModContext call
sym src/lib/core/editor/editor.hooks.ts:67 fn notifyAfterSave(filePath: string, content: string): void L26 | Notifies all after-save observers.
by src/lib/core/editor/editor.hooks.ts:notifyAfterSave <- src/lib/app/deep-link-actions.ts:78 in executeDailyAction call +1
by src/lib/core/editor/editor.hooks.ts:notifyAfterSave <- src/lib/core/editor/editor.service.ts:245 in writeTab call
by src/lib/core/editor/editor.hooks.ts:notifyAfterSave <- src/lib/core/frontmatter/frontmatter-write.service.ts:161 in attempt call
by src/lib/core/editor/editor.hooks.ts:notifyAfterSave <- src/lib/features/deep-link/deep-link.service.ts:277 in executeNewAction call +3
by src/lib/core/editor/editor.hooks.ts:notifyAfterSave <- src/lib/plugins/mods/mod-vault.service.ts:171 in createModVault call
sym src/lib/core/editor/editor.hooks.ts:98 type NoteCreatedObserver L1 | Called with the absolute path of a note an app note creator made, once that creator is done, its tab-open step included.
sym src/lib/core/editor/editor.hooks.ts:104 fn addNoteCreatedObserver(observer: NoteCreatedObserver): () => void L7 | Adds a note-created observer.
by src/lib/core/editor/editor.hooks.ts:addNoteCreatedObserver <- src/lib/plugins/mods/mods-host.service.ts:681 in createModContext call
sym src/lib/core/editor/editor.hooks.ts:119 fn notifyNoteCreated(filePath: string): void L9 | Notifies the note-created observers.
by src/lib/core/editor/editor.hooks.ts:notifyNoteCreated <- src/lib/app/commands.ts:157 in getBuiltInCommands call
by src/lib/core/editor/editor.hooks.ts:notifyNoteCreated <- src/lib/core/note-creator/note-creator.service.ts:130 in openOrCreateNote call
by src/lib/core/editor/editor.hooks.ts:notifyNoteCreated <- src/lib/features/quick-switcher/QuickSwitcher.svelte:57 in createAndOpenNote call
by src/lib/core/editor/editor.hooks.ts:notifyNoteCreated <- src/lib/features/rail-shell/FilesNavigator.svelte:129 in handleNewFile call
by src/lib/core/editor/editor.hooks.ts:notifyNoteCreated <- src/lib/features/rail-shell/new-note.service.ts:41 in createNoteHere call
sym src/lib/core/editor/editor.hooks.ts:130 fn resetHooks(): void L8 | Removes all hooks and observers.
by src/lib/core/editor/editor.hooks.ts:resetHooks <- src/lib/app/lifecycle/app-lifecycle.service.ts:651 in teardownVault call
## calls
call src/lib/core/editor/editor.hooks.ts:54 in addAfterSaveObserver -> src/lib/utils/debug.ts:debug call +1
call src/lib/core/editor/editor.hooks.ts:68 in notifyAfterSave -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/core/editor/editor.hooks.ts:81 in notifyAfterSave -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/core/editor/editor.hooks.ts:83 in notifyAfterSave -> src/lib/core/filesystem/note-change.service.ts:notifyContentInvalidated call
call src/lib/core/editor/editor.hooks.ts:84 in notifyAfterSave -> src/lib/utils/debug.ts:debug call
call src/lib/core/editor/editor.hooks.ts:89 in notifyAfterSave -> src/lib/utils/debug.ts:error call
call src/lib/core/editor/editor.hooks.ts:124 in notifyNoteCreated -> src/lib/utils/debug.ts:error call
call src/lib/core/editor/editor.hooks.ts:131 in resetHooks -> src/lib/utils/debug.ts:debug call
call src/lib/core/editor/editor.hooks.ts:136 in resetHooks -> src/lib/utils/index-dedupe.ts:clearAllIndexed call
## effects
fx src/lib/core/editor/editor.hooks.ts:40 timer.setTimeout delay=RECENT_SAVE_TIMEOUT_MS in markRecentSave
