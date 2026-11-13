# file card src/lib/core/editor/editor.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/editor/editor.service.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls, effects
file src/lib/core/editor/editor.service.ts service L527 module src/lib/core/editor in55 t97
## imports
imp src/lib/core/editor/editor.service.ts:1 -> pkg:@tauri-apps/plugin-fs readTextFile,writeTextFile
imp src/lib/core/editor/editor.service.ts:2 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/core/editor/editor.service.ts:4 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/editor/editor.service.ts:5 -> src/lib/core/editor/editor.logic.ts findTabIndex,getFileName,isTabDirty,isTabPinned,isVirtualTab
imp src/lib/core/editor/editor.service.ts:6 -> src/lib/core/filesystem/fs.logic.ts isViewFile,isCanvasFile,isKanbanFile,isBinaryFile
imp src/lib/core/editor/editor.service.ts:7 -> src/lib/core/editor/editor.hooks.ts notifyAfterSave
imp src/lib/core/editor/editor.service.ts:8 -> src/lib/core/editor/editor.types.ts type:EditorTab
imp src/lib/core/editor/editor.service.ts:9 -> src/lib/utils/debounce.ts debounce
imp src/lib/core/editor/editor.service.ts:10 -> src/lib/core/markdown-editor/tab-view-state.ts clearAllTabViewStates,deleteTabViewState
imp src/lib/core/editor/editor.service.ts:11 -> src/lib/utils/debug.ts debug,error,perfStart,perfEnd,perfBaseline
imp src/lib/core/editor/editor.service.ts:12 -> src/lib/utils/log.service.ts appendLog
## imported-by
imp src/lib/app/EditorView.svelte:10 -> src/lib/core/editor/editor.service.ts onContentChange,onContentChangeForPath
imp src/lib/app/commands.ts:3 -> src/lib/core/editor/editor.service.ts saveCurrentFile,closeActiveTab,switchToNextTab,switchToPreviousTab,togglePinActiveTab,openFileInEditor
imp src/lib/app/deep-link-actions.ts:4 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/app/editor-host.ts:5 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/app/global-keybindings.ts:2 -> src/lib/core/editor/editor.service.ts saveCurrentFile,closeActiveTab,switchToNextTab,switchToPreviousTab,toggleSourceMode
imp src/lib/app/lifecycle/app-lifecycle.service.ts:3 -> src/lib/core/editor/editor.service.ts resetEditor,saveAllDirtyTabs,reloadExternallyChangedTabs
imp src/lib/app/rail-navigation.ts:1 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/core/editor/open-note-at.service.ts:2 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/core/filesystem/link-updater.service.ts:4 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/core/filesystem/path-change.service.ts:7 -> src/lib/core/editor/editor.service.ts closeTabsForDeletedPath,saveFileByPath
imp src/lib/core/filesystem/task-write.service.ts:1 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/core/frontmatter/frontmatter-write.service.ts:4 -> src/lib/core/editor/editor.service.ts saveFileByPath,syncExternalContentToEditor
imp src/lib/core/markdown-editor/EditorTabs.svelte:11 -> src/lib/core/editor/editor.service.ts switchTab,closeTab,togglePinTab
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:28 -> src/lib/core/editor/editor.service.ts onContentChange
imp src/lib/core/note-creator/note-creator.service.ts:4 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/core/vault/exit.service.ts:2 -> src/lib/core/editor/editor.service.ts saveAllDirtyTabs
imp src/lib/core/vault/vault.service.ts:4 -> src/lib/core/editor/editor.service.ts saveAllDirtyTabs
imp src/lib/features/backlinks/BacklinksPanel.svelte:13 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/backlinks/LinkItem.svelte:3 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/canvas/CanvasInner.svelte:44 -> src/lib/core/editor/editor.service.ts openFileInEditor,registerPendingEditFlusher
imp src/lib/features/canvas/FileNode.svelte:9 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/collection/CollectionView.svelte:16 -> src/lib/core/editor/editor.service.ts openFileInEditor,reloadExternallyChangedTabs
imp src/lib/features/collection/collection-block-widget.ts:8 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/deep-link/deep-link.service.ts:8 -> src/lib/core/editor/editor.service.ts openFileInEditor,saveFileByPath,syncExternalContentToEditor
imp src/lib/features/event-calendar/EventCalendarNeedsAttention.svelte:2 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/event-calendar/EventCalendarSection.svelte:15 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/event-calendar/EventDialog.svelte:8 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/event-calendar/EventPopover.svelte:7 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/event-calendar/event-calendar.service.ts:18 -> src/lib/core/editor/editor.service.ts openFileInEditor,saveFileByPath
imp src/lib/features/file-history/file-history.service.ts:9 -> src/lib/core/editor/editor.service.ts saveCurrentFile
imp src/lib/features/note-action-bar/NoteActionBar.svelte:26 -> src/lib/core/editor/editor.service.ts toggleSourceMode
imp src/lib/features/note-action-bar/note-action-bar.service.ts:3 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/note-list/NoteRow.svelte:5 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/note-list/NoteRowMenu.svelte:14 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/outgoing-links/OutgoingLinksPanel.svelte:10 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/properties/PropertiesView.svelte:10 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/properties/properties.service.ts:2 -> src/lib/core/editor/editor.service.ts syncExternalContentToEditor
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:5 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/FilesNavigator.svelte:20 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/features/rail-shell/RailNoteList.svelte:18 -> src/lib/core/editor/editor.service.ts openFileInEditor
more imported-by 15 not shown: src/lib/features/rail-shell(2) src/lib/features/tasks(2) src/lib/features/todoist-sync(2) src/lib/plugins/mods(2) src/lib/plugins/queryjs(2) src/lib/features/search(1) src/lib/features/type-definitions(1) src/lib/plugins/graph-view(1) +2 modules: q importers src/lib/core/editor/editor.service.ts
## reach
in2 src/lib/core/editor/editor.service.ts 45 files in 24 modules: src/lib/features/event-calendar(6) src/lib/app(5) src/lib/features/rail-shell(4) src/lib/features/todoist-sync(3) src/lib/features/properties(2) +19 modules: q impact src/lib/core/editor/editor.service.ts --depth 2
out2 src/lib/core/editor/editor.service.ts 8 files in 4 modules: src/lib/contracts(2) src/lib/core/filesystem(2) src/lib/core/settings(2) src/lib/utils(2)
## tests
test src/tests/lib/core/editor/editor.service.autosave-max-wait.test.ts imports src/lib/core/editor/editor.service.ts mirror
test src/tests/lib/core/editor/editor.service.autosave-schedule.test.ts imports src/lib/core/editor/editor.service.ts mirror
test src/tests/lib/core/editor/editor.service.reset-timers.test.ts imports src/lib/core/editor/editor.service.ts mirror
test src/tests/lib/core/editor/editor.service.test.ts imports src/lib/core/editor/editor.service.ts mirror
test src/tests/lib/app/EditorView.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/app/boot.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/core/filesystem/delete-dirty-tab.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/core/markdown-editor/MarkdownEditor.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/core/vault/exit.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/core/vault/vault-switch-failed-save.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/canvas/canvas-tab-switch.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/collection/CollectionView.view-writes.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/deep-link/deep-link-dirty-buffer.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/file-icons/file-icons.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/properties/frontmatter-number-spelling.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/properties/lifecycle.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/properties/panel-meta-bind-lossy-rewrite.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/properties/properties-cross-note.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/properties/properties-refusal-toast.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/properties/properties.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/todoist-sync/note-writer.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/todoist-sync/sync-now.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/todoist-sync/sync-scheduler.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/features/type-definitions/rewrite-view-file.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/plugins/mods/mod-app.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/plugins/mods/mod-note-saved.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/core/editor/editor.service.ts
test src/tests/help/queryjs-contract.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/help/queryjs-features-scoping.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/lib/app/AppShell.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/lib/app/deep-link-capture-frontmatter.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/lib/app/editor-host.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/lib/app/rail-navigation.test.ts mocks src/lib/core/editor/editor.service.ts
test src/tests/lib/app/tauri-listeners.service.test.ts mocks src/lib/core/editor/editor.service.ts
more tests 57 not shown: src/tests/lib/features/rail-shell(11) src/tests/lib/features/event-calendar(9) src/tests/lib/features/collection(4) src/tests/lib/features/properties(4) src/tests/lib/features/note-list(3) src/tests/lib/plugins/calendar(3) src/tests/lib/plugins/queryjs(3) src/tests/lib/core/filesystem(2) +13 modules: q tests src/lib/core/editor/editor.service.ts
## symbols
sym src/lib/core/editor/editor.service.ts:28 fn registerTabCloseListener(name: string, closed: (path: string) => void): () => void L8 | Registers `closed` to run with the path of each tab `closeTab` or `closeTabsForDeletedPath` removes.
by src/lib/core/editor/editor.service.ts:registerTabCloseListener <- src/lib/plugins/queryjs/queryjs-ports.ts:16 in registerQueryjsBlockPorts call
sym src/lib/core/editor/editor.service.ts:62 fn registerPendingEditFlusher(path: string, flush: () => void): () => void L14 | Registers `flush` to run when `closeTab` closes the tab of `path`, before it saves, so an edit a view still holds in a debounce reaches the file.
by src/lib/core/editor/editor.service.ts:registerPendingEditFlusher <- src/lib/features/canvas/CanvasInner.svelte:246 in (script) call
sym src/lib/core/editor/editor.service.ts:82 fn flushPendingEdits(path: string): boolean L14 | Runs every flusher registered for `path`, logging any that throws.
sym src/lib/core/editor/editor.service.ts:120 fn syncExternalContentToEditor(path: string, content: string, markSaved: boolean, schedule: AutoSaveSchedule): void L22 | Single owner of "external content → CodeMirror" sync (Phase 5 of the perf refactor).
by src/lib/core/editor/editor.service.ts:syncExternalContentToEditor <- src/lib/app/deep-link-actions.ts:77 in executeDailyAction call
by src/lib/core/editor/editor.service.ts:syncExternalContentToEditor <- src/lib/core/filesystem/link-updater.service.ts:66 in updateLinksAfterRename call
by src/lib/core/editor/editor.service.ts:syncExternalContentToEditor <- src/lib/core/filesystem/task-write.service.ts:28 in settleTaskWrite call
by src/lib/core/editor/editor.service.ts:syncExternalContentToEditor <- src/lib/core/frontmatter/frontmatter-write.service.ts:132 in attempt call +2
by src/lib/core/editor/editor.service.ts:syncExternalContentToEditor <- src/lib/features/deep-link/deep-link.service.ts:276 in executeNewAction call +2
by src/lib/core/editor/editor.service.ts:syncExternalContentToEditor <- src/lib/features/properties/properties.service.ts:106 in commitChanges call
by src/lib/core/editor/editor.service.ts:syncExternalContentToEditor <- src/lib/features/todoist-sync/note-writer.service.ts:83 in writeToOpenTab call
by src/lib/core/editor/editor.service.ts:syncExternalContentToEditor <- src/lib/features/todoist-sync/sync-now.service.ts:900 in writeProjectId call
more by 3 not shown: src/lib/plugins/mods(2) src/lib/features/type-definitions(1): q importers src/lib/core/editor/editor.service.ts:syncExternalContentToEditor
sym src/lib/core/editor/editor.service.ts:148 fn openFileInEditor(filePath: string) L51 | Opens a file in the editor.
by src/lib/core/editor/editor.service.ts:openFileInEditor <- src/lib/app/commands.ts:156 in getBuiltInCommands call +2
by src/lib/core/editor/editor.service.ts:openFileInEditor <- src/lib/app/editor-host.ts:144 in appEditorHost.openLink call
by src/lib/core/editor/editor.service.ts:openFileInEditor <- src/lib/app/rail-navigation.ts:20 in selectRailItem call +1
by src/lib/core/editor/editor.service.ts:openFileInEditor <- src/lib/core/editor/open-note-at.service.ts:39 in openNoteAt call
by src/lib/core/editor/editor.service.ts:openFileInEditor <- src/lib/core/note-creator/note-creator.service.ts:127 in openOrCreateNote call
by src/lib/core/editor/editor.service.ts:openFileInEditor <- src/lib/features/backlinks/BacklinksPanel.svelte:93 in (markup) markup
by src/lib/core/editor/editor.service.ts:openFileInEditor <- src/lib/features/backlinks/LinkItem.svelte:10 in handleClick call
by src/lib/core/editor/editor.service.ts:openFileInEditor <- src/lib/features/canvas/CanvasInner.svelte:578 in handleDrop call
more by 27 not shown: src/lib/features/event-calendar(5) src/lib/features/rail-shell(4) src/lib/features/collection(2) src/lib/features/note-list(2) src/lib/plugins/mods(2) src/lib/features/canvas(1) src/lib/features/deep-link(1) src/lib/features/note-action-bar(1) +9 modules: q importers src/lib/core/editor/editor.service.ts:openFileInEditor
sym src/lib/core/editor/editor.service.ts:201 fn saveCurrentFile() L5 | Writes the active tab's content to disk if it has unsaved changes
by src/lib/core/editor/editor.service.ts:saveCurrentFile <- src/lib/app/commands.ts:125 in getBuiltInCommands call
by src/lib/core/editor/editor.service.ts:saveCurrentFile <- src/lib/app/global-keybindings.ts:78 in GLOBAL_KEYBINDINGS call
by src/lib/core/editor/editor.service.ts:saveCurrentFile <- src/lib/features/file-history/file-history.service.ts:99 in restoreSnapshot call
sym src/lib/core/editor/editor.service.ts:220 fn saveFileByPath(path: string): Promise<boolean> L9 | Writes a specific tab's content to disk if it has unsaved changes.
by src/lib/core/editor/editor.service.ts:saveFileByPath <- src/lib/core/filesystem/path-change.service.ts:70 in saveDirtyTabsUnder call
by src/lib/core/editor/editor.service.ts:saveFileByPath <- src/lib/core/frontmatter/frontmatter-write.service.ts:133 in attempt call
by src/lib/core/editor/editor.service.ts:saveFileByPath <- src/lib/features/deep-link/deep-link.service.ts:243 in saveOpenNoteBeforeWrite call
by src/lib/core/editor/editor.service.ts:saveFileByPath <- src/lib/features/event-calendar/event-calendar.service.ts:1044 in deleteNow call
by src/lib/core/editor/editor.service.ts:saveFileByPath <- src/lib/features/tasks/tasks.service.ts:346 in preflightTaskWrite call
by src/lib/core/editor/editor.service.ts:saveFileByPath <- src/lib/features/type-definitions/type-definitions.service.ts:414 in rewriteViewFileNow call
by src/lib/core/editor/editor.service.ts:saveFileByPath <- src/lib/plugins/mods/mod-app.service.ts:65 in MOD_APP ref
sym src/lib/core/editor/editor.service.ts:231 fn waitForTabSave(path: string): Promise<void> L3 | Resolves once the save pending on `path`, if any, has settled; it never rejects.
by src/lib/core/editor/editor.service.ts:waitForTabSave <- src/lib/features/type-definitions/type-definitions.service.ts:383 in rewriteViewFileNow call
sym src/lib/core/editor/editor.service.ts:285 type AutoSaveSchedule L1 | Which auto-save timer a content write arms: the 500 ms frontmatter timer, the 2000 ms body timer, or none at all (content already written to disk).
sym src/lib/core/editor/editor.service.ts:303 fn onContentChange(content: string, frontmatterChanged = false) L4 | Called on every editor keystroke — updates store content and schedules an auto-save
by src/lib/core/editor/editor.service.ts:onContentChange <- src/lib/app/EditorView.svelte:81 in (markup) markup +1
by src/lib/core/editor/editor.service.ts:onContentChange <- src/lib/core/markdown-editor/MarkdownEditor.svelte:128 in freshState call
sym src/lib/core/editor/editor.service.ts:314 fn onContentChangeForPath(path: string, content: string) L4 | Writes `content` into the tab at `path` and schedules a body auto-save.
by src/lib/core/editor/editor.service.ts:onContentChangeForPath <- src/lib/app/EditorView.svelte:85 in (markup) markup
sym src/lib/core/editor/editor.service.ts:324 fn saveAllDirtyTabs(): Promise<string[]> L14 | Saves all dirty tabs immediately, awaiting completion.
by src/lib/core/editor/editor.service.ts:saveAllDirtyTabs <- src/lib/app/lifecycle/app-lifecycle.service.ts:192 in initializeVault call
by src/lib/core/editor/editor.service.ts:saveAllDirtyTabs <- src/lib/core/vault/exit.service.ts:16 in prepareForExit call
by src/lib/core/editor/editor.service.ts:saveAllDirtyTabs <- src/lib/core/vault/vault.service.ts:23 in switchVault call
sym src/lib/core/editor/editor.service.ts:340 fn switchTab(index: number) L6 | Switches to a specific tab by index
by src/lib/core/editor/editor.service.ts:switchTab <- src/lib/core/markdown-editor/EditorTabs.svelte:60 in (markup) markup +1
sym src/lib/core/editor/editor.service.ts:362 fn closeTab(index: number) L33 | Closes a tab by index.
by src/lib/core/editor/editor.service.ts:closeTab <- src/lib/core/markdown-editor/EditorTabs.svelte:89 in (markup) markup +1
sym src/lib/core/editor/editor.service.ts:397 fn closeActiveTab() L5 | Convenience: closes whichever tab is currently focused
by src/lib/core/editor/editor.service.ts:closeActiveTab <- src/lib/app/commands.ts:132 in getBuiltInCommands call
by src/lib/core/editor/editor.service.ts:closeActiveTab <- src/lib/app/global-keybindings.ts:84 in GLOBAL_KEYBINDINGS call
sym src/lib/core/editor/editor.service.ts:404 fn switchToNextTab() L5 | Cycles to the next tab (wraps around)
by src/lib/core/editor/editor.service.ts:switchToNextTab <- src/lib/app/commands.ts:139 in getBuiltInCommands call
by src/lib/core/editor/editor.service.ts:switchToNextTab <- src/lib/app/global-keybindings.ts:98 in GLOBAL_KEYBINDINGS call
sym src/lib/core/editor/editor.service.ts:411 fn switchToPreviousTab() L5 | Cycles to the previous tab (wraps around)
by src/lib/core/editor/editor.service.ts:switchToPreviousTab <- src/lib/app/commands.ts:146 in getBuiltInCommands call
by src/lib/core/editor/editor.service.ts:switchToPreviousTab <- src/lib/app/global-keybindings.ts:91 in GLOBAL_KEYBINDINGS call
sym src/lib/core/editor/editor.service.ts:418 fn togglePinTab(index: number) L3 | Toggles the pinned state of the tab at the given index
by src/lib/core/editor/editor.service.ts:togglePinTab <- src/lib/core/markdown-editor/EditorTabs.svelte:99 in (markup) markup
sym src/lib/core/editor/editor.service.ts:423 fn togglePinActiveTab() L5 | Toggles the pinned state of the currently active tab
by src/lib/core/editor/editor.service.ts:togglePinActiveTab <- src/lib/app/commands.ts:349 in getBuiltInCommands call
sym src/lib/core/editor/editor.service.ts:437 fn toggleSourceMode() L3 | Toggles between live preview and source mode.
by src/lib/core/editor/editor.service.ts:toggleSourceMode <- src/lib/app/global-keybindings.ts:187 in GLOBAL_KEYBINDINGS call
by src/lib/core/editor/editor.service.ts:toggleSourceMode <- src/lib/features/note-action-bar/NoteActionBar.svelte:178 in (markup) markup
sym src/lib/core/editor/editor.service.ts:442 fn pinTabByPath(filePath: string) L6 | Pins a tab identified by file path (used for auto-pin features like daily notes)
by src/lib/core/editor/editor.service.ts:pinTabByPath <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:115 in autoOpenDailyNote call +1
sym src/lib/core/editor/editor.service.ts:450 fn unpinTabByPath(filePath: string) L6 | Unpins a tab identified by file path (used when rotating auto-pinned daily notes)
by src/lib/core/editor/editor.service.ts:unpinTabByPath <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:146 in refreshDailyNoteIfDateChanged call
sym src/lib/core/editor/editor.service.ts:463 fn closeTabsForDeletedPath(deletedPath: string): EditorTab[] L14 | Force-closes all tabs whose path matches or is a child of the given path.
by src/lib/core/editor/editor.service.ts:closeTabsForDeletedPath <- src/lib/core/filesystem/path-change.service.ts:171 in applyPathChange call
sym src/lib/core/editor/editor.service.ts:485 fn reloadExternallyChangedTabs(changedPaths: string[]): Promise<void> L30 | Reloads content from disk for open tabs whose files were externally modified.
by src/lib/core/editor/editor.service.ts:reloadExternallyChangedTabs <- src/lib/app/lifecycle/app-lifecycle.service.ts:511 in initializeVault call
by src/lib/core/editor/editor.service.ts:reloadExternallyChangedTabs <- src/lib/features/collection/CollectionView.svelte:335 in writeYaml call
sym src/lib/core/editor/editor.service.ts:522 fn resetEditor() L6 | Cancels any pending auto-saves and resets all editor state.
by src/lib/core/editor/editor.service.ts:resetEditor <- src/lib/app/lifecycle/app-lifecycle.service.ts:660 in teardownVault call
## locals
local src/lib/core/editor/editor.service.ts:38 fn notifyTabClosed(path: string): void L9
local src/lib/core/editor/editor.service.ts:236 fn writeTab(path: string): Promise<boolean> L18
local src/lib/core/editor/editor.service.ts:258 fn saveDirtyTabs() L12
local src/lib/core/editor/editor.service.ts:276 fn debouncedSave = debounce(…) L1
local src/lib/core/editor/editor.service.ts:279 fn debouncedSaveFrontmatter = debounce(…) L1
local src/lib/core/editor/editor.service.ts:292 fn scheduleAutoSave(schedule: AutoSaveSchedule): void L9
local src/lib/core/editor/editor.service.ts:348 fn isPathDirty(path: string): boolean L4
## calls
call src/lib/core/editor/editor.service.ts:43 in notifyTabClosed -> src/lib/utils/debug.ts:error call
call src/lib/core/editor/editor.service.ts:90 in flushPendingEdits -> src/lib/utils/debug.ts:error call
call src/lib/core/editor/editor.service.ts:129 in syncExternalContentToEditor -> src/lib/core/editor/editor.store.svelte.ts:editorStore.updateTabContentByPath mcall
call src/lib/core/editor/editor.service.ts:131 in syncExternalContentToEditor -> src/lib/core/editor/editor.store.svelte.ts:editorStore.updateTabContentOnly mcall
call src/lib/core/editor/editor.service.ts:138 in syncExternalContentToEditor -> src/lib/core/editor/editor.store.svelte.ts:editorStore.bumpExternalContentSignal mcall
call src/lib/core/editor/editor.service.ts:140 in syncExternalContentToEditor -> src/lib/core/editor/editor.service.ts:scheduleAutoSave call
call src/lib/core/editor/editor.service.ts:151 in openFileInEditor -> src/lib/utils/debug.ts:perfStart call
call src/lib/core/editor/editor.service.ts:152 in openFileInEditor -> src/lib/utils/log.service.ts:appendLog call +5
call src/lib/core/editor/editor.service.ts:158 in openFileInEditor -> src/lib/core/filesystem/fs.logic.ts:isBinaryFile call
call src/lib/core/editor/editor.service.ts:160 in openFileInEditor -> src/lib/core/editor/editor.logic.ts:getFileName call +1
call src/lib/core/editor/editor.service.ts:164 in openFileInEditor -> src/lib/core/editor/editor.logic.ts:findTabIndex call +1
call src/lib/core/editor/editor.service.ts:166 in openFileInEditor -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall +1
call src/lib/core/editor/editor.service.ts:168 in openFileInEditor -> src/lib/utils/debug.ts:perfBaseline call +2
call src/lib/core/editor/editor.service.ts:186 in openFileInEditor -> src/lib/core/filesystem/fs.logic.ts:isViewFile call
call src/lib/core/editor/editor.service.ts:187 in openFileInEditor -> src/lib/core/filesystem/fs.logic.ts:isCanvasFile call
call src/lib/core/editor/editor.service.ts:188 in openFileInEditor -> src/lib/core/filesystem/fs.logic.ts:isKanbanFile call
call src/lib/core/editor/editor.service.ts:190 in openFileInEditor -> src/lib/core/editor/editor.store.svelte.ts:editorStore.addTab mcall
call src/lib/core/editor/editor.service.ts:191 in openFileInEditor -> src/lib/utils/debug.ts:debug call
call src/lib/core/editor/editor.service.ts:195 in openFileInEditor -> src/lib/utils/debug.ts:error call
call src/lib/core/editor/editor.service.ts:204 in saveCurrentFile -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/core/editor/editor.service.ts:222 in saveFileByPath -> src/lib/core/editor/editor.service.ts:writeTab call +1
call src/lib/core/editor/editor.service.ts:238 in writeTab -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/core/editor/editor.service.ts:238 in writeTab -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/core/editor/editor.service.ts:244 in writeTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.markSavedByPath mcall
call src/lib/core/editor/editor.service.ts:245 in writeTab -> src/lib/core/editor/editor.hooks.ts:notifyAfterSave call
call src/lib/core/editor/editor.service.ts:246 in writeTab -> src/lib/utils/debug.ts:debug call
call src/lib/core/editor/editor.service.ts:249 in writeTab -> src/lib/utils/debug.ts:error call
call src/lib/core/editor/editor.service.ts:260 in saveDirtyTabs -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/core/editor/editor.service.ts:260 in saveDirtyTabs -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/core/editor/editor.service.ts:264 in saveDirtyTabs -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/core/editor/editor.service.ts:267 in saveDirtyTabs -> src/lib/core/editor/editor.service.ts:saveDirtyTabs ref
call src/lib/core/editor/editor.service.ts:276 in debouncedSave -> src/lib/core/editor/editor.service.ts:saveDirtyTabs ref
call src/lib/core/editor/editor.service.ts:276 in debouncedSave -> src/lib/utils/debounce.ts:debounce call
call src/lib/core/editor/editor.service.ts:279 in debouncedSaveFrontmatter -> src/lib/core/editor/editor.service.ts:saveDirtyTabs ref
call src/lib/core/editor/editor.service.ts:279 in debouncedSaveFrontmatter -> src/lib/utils/debounce.ts:debounce call
call src/lib/core/editor/editor.service.ts:294 in scheduleAutoSave -> src/lib/core/editor/editor.service.ts:debouncedSave mcall +1
call src/lib/core/editor/editor.service.ts:295 in scheduleAutoSave -> src/lib/core/editor/editor.service.ts:debouncedSaveFrontmatter call +1
call src/lib/core/editor/editor.service.ts:304 in onContentChange -> src/lib/core/editor/editor.store.svelte.ts:editorStore.updateContent mcall
call src/lib/core/editor/editor.service.ts:305 in onContentChange -> src/lib/core/editor/editor.service.ts:scheduleAutoSave call
call src/lib/core/editor/editor.service.ts:315 in onContentChangeForPath -> src/lib/core/editor/editor.store.svelte.ts:editorStore.updateTabContentOnly mcall
call src/lib/core/editor/editor.service.ts:316 in onContentChangeForPath -> src/lib/core/editor/editor.service.ts:scheduleAutoSave call
call src/lib/core/editor/editor.service.ts:325 in saveAllDirtyTabs -> src/lib/core/editor/editor.service.ts:debouncedSave mcall
call src/lib/core/editor/editor.service.ts:326 in saveAllDirtyTabs -> src/lib/core/editor/editor.service.ts:debouncedSaveFrontmatter mcall
call src/lib/core/editor/editor.service.ts:328 in saveAllDirtyTabs -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/core/editor/editor.service.ts:328 in saveAllDirtyTabs -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/core/editor/editor.service.ts:333 in saveAllDirtyTabs -> src/lib/core/editor/editor.service.ts:saveFileByPath call
call src/lib/core/editor/editor.service.ts:341 in switchTab -> src/lib/utils/debug.ts:perfStart call
call src/lib/core/editor/editor.service.ts:342 in switchTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/core/editor/editor.service.ts:343 in switchTab -> src/lib/utils/debug.ts:perfEnd call
call src/lib/core/editor/editor.service.ts:344 in switchTab -> src/lib/utils/debug.ts:perfBaseline call
call src/lib/core/editor/editor.service.ts:350 in isPathDirty -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/core/editor/editor.service.ts:365 in closeTab -> src/lib/core/editor/editor.logic.ts:isTabPinned call
call src/lib/core/editor/editor.service.ts:368 in closeTab -> src/lib/utils/debug.ts:perfStart call
call src/lib/core/editor/editor.service.ts:370 in closeTab -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/core/editor/editor.service.ts:371 in closeTab -> src/lib/core/editor/editor.service.ts:flushPendingEdits call
call src/lib/core/editor/editor.service.ts:372 in closeTab -> src/lib/core/editor/editor.service.ts:isPathDirty call +2
call src/lib/core/editor/editor.service.ts:373 in closeTab -> src/lib/core/editor/editor.service.ts:saveFileByPath call +1
call src/lib/core/editor/editor.service.ts:377 in closeTab -> src/lib/core/editor/editor.logic.ts:getFileName call
call src/lib/core/editor/editor.service.ts:387 in closeTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/core/editor/editor.service.ts:390 in closeTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/core/editor/editor.service.ts:391 in closeTab -> src/lib/core/markdown-editor/tab-view-state.ts:deleteTabViewState call
call src/lib/core/editor/editor.service.ts:392 in closeTab -> src/lib/core/editor/editor.service.ts:notifyTabClosed call
call src/lib/core/editor/editor.service.ts:393 in closeTab -> src/lib/utils/debug.ts:perfBaseline call
call src/lib/core/editor/editor.service.ts:399 in closeActiveTab -> src/lib/core/editor/editor.service.ts:closeTab call
call src/lib/core/editor/editor.service.ts:407 in switchToNextTab -> src/lib/core/editor/editor.service.ts:switchTab call
call src/lib/core/editor/editor.service.ts:414 in switchToPreviousTab -> src/lib/core/editor/editor.service.ts:switchTab call
call src/lib/core/editor/editor.service.ts:419 in togglePinTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.togglePin mcall
call src/lib/core/editor/editor.service.ts:425 in togglePinActiveTab -> src/lib/core/editor/editor.service.ts:togglePinTab call
call src/lib/core/editor/editor.service.ts:438 in toggleSourceMode -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setLivePreview mcall
call src/lib/core/editor/editor.service.ts:443 in pinTabByPath -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/core/editor/editor.service.ts:445 in pinTabByPath -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setPinned mcall
call src/lib/core/editor/editor.service.ts:451 in unpinTabByPath -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/core/editor/editor.service.ts:453 in unpinTabByPath -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setPinned mcall
call src/lib/core/editor/editor.service.ts:469 in closeTabsForDeletedPath -> src/lib/core/markdown-editor/tab-view-state.ts:deleteTabViewState call
call src/lib/core/editor/editor.service.ts:470 in closeTabsForDeletedPath -> src/lib/core/editor/editor.service.ts:notifyTabClosed call
call src/lib/core/editor/editor.service.ts:471 in closeTabsForDeletedPath -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/core/editor/editor.service.ts:490 in reloadExternallyChangedTabs -> src/lib/core/editor/editor.logic.ts:isTabDirty call
call src/lib/core/editor/editor.service.ts:490 in reloadExternallyChangedTabs -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/core/editor/editor.service.ts:502 in reloadExternallyChangedTabs -> src/lib/utils/debug.ts:debug call +1
call src/lib/core/editor/editor.service.ts:511 in reloadExternallyChangedTabs -> src/lib/core/editor/editor.service.ts:syncExternalContentToEditor call
call src/lib/core/editor/editor.service.ts:523 in resetEditor -> src/lib/core/editor/editor.service.ts:debouncedSave mcall
call src/lib/core/editor/editor.service.ts:524 in resetEditor -> src/lib/core/editor/editor.service.ts:debouncedSaveFrontmatter mcall
call src/lib/core/editor/editor.service.ts:525 in resetEditor -> src/lib/core/editor/editor.store.svelte.ts:editorStore.reset mcall
call src/lib/core/editor/editor.service.ts:526 in resetEditor -> src/lib/core/markdown-editor/tab-view-state.ts:clearAllTabViewStates call
## effects
fx src/lib/core/editor/editor.service.ts:174 tauri-fs.readTextFile in openFileInEditor
fx src/lib/core/editor/editor.service.ts:243 tauri-fs.writeTextFile in writeTab
fx src/lib/core/editor/editor.service.ts:267 timer.setTimeout delay=SAVE_RETRY_DELAY_MS in saveDirtyTabs
fx src/lib/core/editor/editor.service.ts:276 timer-wrap.debounce args=saveDirtyTabs, 2000, { maxWait: 10_000 } as debouncedSave in debouncedSave
fx src/lib/core/editor/editor.service.ts:279 timer-wrap.debounce args=saveDirtyTabs, 500 as debouncedSaveFrontmatter in debouncedSaveFrontmatter
fx src/lib/core/editor/editor.service.ts:376 tauri-dialog.ask in closeTab
fx src/lib/core/editor/editor.service.ts:496 tauri-fs.readTextFile in reloadExternallyChangedTabs
