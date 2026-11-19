# file card src/lib/app/commands.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/commands.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/app/commands.ts other L478 module src/lib/app in1 t5
## imports
imp src/lib/app/commands.ts:2 -> src/lib/features/command-palette/command-palette.types.ts type:AppCommand
imp src/lib/app/commands.ts:3 -> src/lib/core/editor/editor.service.ts saveCurrentFile,closeActiveTab,switchToNextTab,switchToPreviousTab,togglePinActiveTab,openFileInEditor
imp src/lib/app/commands.ts:11 -> src/lib/core/editor/editor.hooks.ts notifyNoteCreated
imp src/lib/app/commands.ts:12 -> src/lib/core/filesystem/fs.service.ts createFile,createFolder
imp src/lib/app/commands.ts:13 -> src/lib/core/note-creator/explicit-organization.logic.ts applyExplicitOrganization
imp src/lib/app/commands.ts:14 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/app/commands.ts:15 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
imp src/lib/app/commands.ts:16 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/app/commands.ts:17 -> src/lib/features/rail-shell/lens.logic.ts FILES_RAIL_ITEM,pinnedRailItems
imp src/lib/app/commands.ts:18 -> src/lib/features/rail-shell/rail-items.logic.ts parseRailHidden,parseRailOrder,railItems
imp src/lib/app/commands.ts:19 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/app/commands.ts:20 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/commands.ts:21 -> src/lib/features/type-definitions/type-sidebar.logic.ts collectViewFiles,getViewLabel,getViewOpensInEditor,getViewVisible
imp src/lib/app/commands.ts:22 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/app/commands.ts:23 -> src/lib/plugins/graph-view/graph-view.service.ts toggleGraphTab
imp src/lib/app/commands.ts:24 -> src/lib/features/canvas/canvas.service.ts createCanvasFile
imp src/lib/app/commands.ts:25 -> src/lib/plugins/kanban/kanban.service.ts createKanbanFile
imp src/lib/app/commands.ts:26 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/commands.ts:27 -> src/lib/plugins/periodic-notes/periodic-notes.service.ts openOrCreateDailyNote
imp src/lib/app/commands.ts:28 -> src/lib/plugins/templates/templates.service.ts openTemplatePicker
imp src/lib/app/commands.ts:29 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/commands.ts:30 -> src/lib/core/markdown-editor/setup/editor-extensions.ts COPY_BLOCK_LINK_SHORTCUT
imp src/lib/app/commands.ts:31 -> src/lib/features/copy-block-link/copy-block-link.service.ts copyBlockLinkToClipboard,copyBlockEmbedToClipboard
imp src/lib/app/commands.ts:32 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/app/commands.ts:33 -> src/lib/features/tasks/tasks.service.ts openTasksTab,toggleTasksTab
imp src/lib/app/commands.ts:34 -> src/lib/features/tasks/tasks.store.svelte.ts tasksStore
imp src/lib/app/commands.ts:35 -> src/lib/features/event-calendar/event-calendar.service.ts openEventCalendarTab,openNewEventDialog,redoEventChangeFromUi,toggleEventCalendarTab,undoEventChangeFromUi
imp src/lib/app/commands.ts:42 -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts eventCalendarViewStore
imp src/lib/app/commands.ts:43 -> src/lib/features/event-calendar/event-calendar.store.svelte.ts eventCalendarStore
imp src/lib/app/commands.ts:44 -> src/lib/features/tags/tags.service.ts toggleTagsTab
imp src/lib/app/commands.ts:45 -> src/lib/features/todoist-sync/sync-log.service.ts showSyncLog
imp src/lib/app/commands.ts:46 -> src/lib/features/todoist-sync/sync-scheduler.service.ts syncNowFromUi
imp src/lib/app/commands.ts:47 -> src/lib/features/todoist-sync/todoist-sync.service.ts checkSyncConnectionFromUi
imp src/lib/app/commands.ts:48 -> src/lib/plugins/quick-capture/note-composer.service.ts createNoteComposer
imp src/lib/app/commands.ts:49 -> src/lib/plugins/one-on-one/one-on-one.service.ts openOneOnOnePicker
imp src/lib/app/commands.ts:50 -> src/lib/plugins/mods/mod-commands.store.svelte.ts modCommandsStore
imp src/lib/app/commands.ts:51 -> src/lib/features/file-history/file-history.service.ts openFileHistory
imp src/lib/app/commands.ts:52 -> src/lib/core/layout/layout.service.ts hideRailPanels,showRailPanels,toggleLeftSidebar,toggleRightPanel,toggleRightSidebar
imp src/lib/app/commands.ts:53 -> src/lib/features/properties/lifecycle.service.ts toggleActiveNoteArchived,toggleActiveNoteFavorite,toggleActiveNoteOrganized
imp src/lib/app/commands.ts:54 -> src/lib/core/filesystem/delete-note.service.ts deleteNoteWithConfirm
imp src/lib/app/commands.ts:55 -> src/lib/core/editor/editor.logic.ts isVirtualTab
imp src/lib/app/commands.ts:56 -> src/lib/app/global-keybindings.ts shortcutFor
imp src/lib/app/commands.ts:57 -> src/lib/app/rail-navigation.ts openRailView,selectRailItem
## imported-by
imp src/lib/app/AppOverlays.svelte:14 -> src/lib/app/commands.ts getBuiltInCommands
## reach
in2 src/lib/app/commands.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/app/commands.ts 106 files in 33 modules: src/lib/core/markdown-editor(15) src/lib/utils(11) src/lib/features/event-calendar(10) src/lib/core/filesystem(7) src/lib/features/tasks(7) +28 modules
## tests
test src/tests/lib/app/commands.new-commands.test.ts imports src/lib/app/commands.ts mirror
test src/tests/lib/app/commands.test.ts imports src/lib/app/commands.ts mirror
test src/tests/lib/app/commands.todoist.test.ts imports src/lib/app/commands.ts mirror
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/app/commands.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts imports src/lib/app/commands.ts
## symbols
sym src/lib/app/commands.ts:123 fn getBuiltInCommands(): AppCommand[] L356 | The command palette's built-in commands.
by src/lib/app/commands.ts:getBuiltInCommands <- src/lib/app/AppOverlays.svelte:37 in (markup) markup
## locals
local src/lib/app/commands.ts:66 fn railGoToCommands(): AppCommand[] L12
local src/lib/app/commands.ts:84 fn tasksStatusFilterCommand(): AppCommand L13
local src/lib/app/commands.ts:103 fn openViewCommands(): AppCommand[] L13
## calls
call src/lib/app/commands.ts:68 in railGoToCommands -> src/lib/features/rail-shell/lens.logic.ts:pinnedRailItems call
call src/lib/app/commands.ts:70 in railGoToCommands -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden call
call src/lib/app/commands.ts:70 in railGoToCommands -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailOrder call
call src/lib/app/commands.ts:70 in railGoToCommands -> src/lib/features/rail-shell/rail-items.logic.ts:railItems call
call src/lib/app/commands.ts:75 in railGoToCommands -> src/lib/app/rail-navigation.ts:selectRailItem call
call src/lib/app/commands.ts:92 in tasksStatusFilterCommand -> src/lib/features/tasks/tasks.store.svelte.ts:tasksStore.setQuick mcall
call src/lib/app/commands.ts:93 in tasksStatusFilterCommand -> src/lib/features/tasks/tasks.service.ts:openTasksTab call
call src/lib/app/commands.ts:105 in openViewCommands -> src/lib/features/type-definitions/type-sidebar.logic.ts:collectViewFiles call
call src/lib/app/commands.ts:105 in openViewCommands -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewVisible call
call src/lib/app/commands.ts:107 in openViewCommands -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewOpensInEditor call
call src/lib/app/commands.ts:110 in openViewCommands -> src/lib/features/type-definitions/type-sidebar.logic.ts:getViewLabel call
call src/lib/app/commands.ts:112 in openViewCommands -> src/lib/app/rail-navigation.ts:openRailView call
call src/lib/app/commands.ts:129 in getBuiltInCommands -> src/lib/app/global-keybindings.ts:shortcutFor call +18
call src/lib/app/commands.ts:130 in getBuiltInCommands -> src/lib/core/editor/editor.service.ts:saveCurrentFile call
call src/lib/app/commands.ts:137 in getBuiltInCommands -> src/lib/core/editor/editor.service.ts:closeActiveTab call
call src/lib/app/commands.ts:144 in getBuiltInCommands -> src/lib/core/editor/editor.service.ts:switchToNextTab call
call src/lib/app/commands.ts:151 in getBuiltInCommands -> src/lib/core/editor/editor.service.ts:switchToPreviousTab call
call src/lib/app/commands.ts:160 in getBuiltInCommands -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/app/commands.ts:160 in getBuiltInCommands -> src/lib/core/note-creator/explicit-organization.logic.ts:applyExplicitOrganization call
call src/lib/app/commands.ts:161 in getBuiltInCommands -> src/lib/core/editor/editor.service.ts:openFileInEditor call +2
call src/lib/app/commands.ts:162 in getBuiltInCommands -> src/lib/core/editor/editor.hooks.ts:notifyNoteCreated call
call src/lib/app/commands.ts:172 in getBuiltInCommands -> src/lib/core/filesystem/fs.service.ts:createFolder call
call src/lib/app/commands.ts:173 in getBuiltInCommands -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/app/commands.ts:183 in getBuiltInCommands -> src/lib/features/canvas/canvas.service.ts:createCanvasFile call
call src/lib/app/commands.ts:194 in getBuiltInCommands -> src/lib/plugins/kanban/kanban.service.ts:createKanbanFile call
call src/lib/app/commands.ts:203 in getBuiltInCommands -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.toggle mcall
call src/lib/app/commands.ts:210 in getBuiltInCommands -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/app/commands.ts:218 in getBuiltInCommands -> src/lib/plugins/graph-view/graph-view.service.ts:toggleGraphTab call
call src/lib/app/commands.ts:227 in getBuiltInCommands -> src/lib/features/tasks/tasks.service.ts:toggleTasksTab call
call src/lib/app/commands.ts:230 in getBuiltInCommands -> src/lib/app/commands.ts:tasksStatusFilterCommand call
call src/lib/app/commands.ts:237 in getBuiltInCommands -> src/lib/features/event-calendar/event-calendar.service.ts:toggleEventCalendarTab call
call src/lib/app/commands.ts:245 in getBuiltInCommands -> src/lib/features/event-calendar/event-calendar.service.ts:openNewEventDialog call
call src/lib/app/commands.ts:253 in getBuiltInCommands -> src/lib/features/event-calendar/event-calendar.service.ts:openEventCalendarTab call
call src/lib/app/commands.ts:254 in getBuiltInCommands -> src/lib/features/event-calendar/event-calendar-view.store.svelte.ts:eventCalendarViewStore.goToToday mcall
call src/lib/app/commands.ts:266 in getBuiltInCommands -> src/lib/features/event-calendar/event-calendar.service.ts:undoEventChangeFromUi call
call src/lib/app/commands.ts:276 in getBuiltInCommands -> src/lib/features/event-calendar/event-calendar.service.ts:redoEventChangeFromUi call
call src/lib/app/commands.ts:284 in getBuiltInCommands -> src/lib/features/todoist-sync/todoist-sync.service.ts:checkSyncConnectionFromUi call
call src/lib/app/commands.ts:290 in getBuiltInCommands -> src/lib/features/todoist-sync/sync-scheduler.service.ts:syncNowFromUi call
call src/lib/app/commands.ts:296 in getBuiltInCommands -> src/lib/features/todoist-sync/sync-log.service.ts:showSyncLog call
call src/lib/app/commands.ts:303 in getBuiltInCommands -> src/lib/features/tags/tags.service.ts:toggleTagsTab call
call src/lib/app/commands.ts:311 in getBuiltInCommands -> src/lib/core/layout/layout.service.ts:toggleLeftSidebar ref
call src/lib/app/commands.ts:318 in getBuiltInCommands -> src/lib/core/layout/layout.service.ts:hideRailPanels ref
call src/lib/app/commands.ts:325 in getBuiltInCommands -> src/lib/core/layout/layout.service.ts:showRailPanels ref
call src/lib/app/commands.ts:332 in getBuiltInCommands -> src/lib/core/layout/layout.service.ts:toggleRightSidebar call
call src/lib/app/commands.ts:338 in getBuiltInCommands -> src/lib/core/layout/layout.service.ts:toggleRightPanel call +3
call src/lib/app/commands.ts:363 in getBuiltInCommands -> src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteFavorite call
call src/lib/app/commands.ts:370 in getBuiltInCommands -> src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteOrganized call
call src/lib/app/commands.ts:376 in getBuiltInCommands -> src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteArchived call
call src/lib/app/commands.ts:384 in getBuiltInCommands -> src/lib/core/editor/editor.logic.ts:isVirtualTab call
call src/lib/app/commands.ts:385 in getBuiltInCommands -> src/lib/core/filesystem/delete-note.service.ts:deleteNoteWithConfirm call
call src/lib/app/commands.ts:392 in getBuiltInCommands -> src/lib/core/editor/editor.service.ts:togglePinActiveTab call
call src/lib/app/commands.ts:398 in getBuiltInCommands -> src/lib/plugins/periodic-notes/periodic-notes.service.ts:openOrCreateDailyNote call
call src/lib/app/commands.ts:405 in getBuiltInCommands -> src/lib/plugins/quick-capture/note-composer.service.ts:createNoteComposer call
call src/lib/app/commands.ts:412 in getBuiltInCommands -> src/lib/plugins/one-on-one/one-on-one.service.ts:openOneOnOnePicker call
call src/lib/app/commands.ts:418 in getBuiltInCommands -> src/lib/plugins/templates/templates.service.ts:openTemplatePicker call
call src/lib/app/commands.ts:428 in getBuiltInCommands -> src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockLinkToClipboard call
call src/lib/app/commands.ts:438 in getBuiltInCommands -> src/lib/features/copy-block-link/copy-block-link.service.ts:copyBlockEmbedToClipboard call
call src/lib/app/commands.ts:446 in getBuiltInCommands -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.toggle mcall
call src/lib/app/commands.ts:455 in getBuiltInCommands -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.open mcall
call src/lib/app/commands.ts:466 in getBuiltInCommands -> src/lib/features/file-history/file-history.service.ts:openFileHistory call
call src/lib/app/commands.ts:469 in getBuiltInCommands -> src/lib/app/commands.ts:railGoToCommands call
call src/lib/app/commands.ts:470 in getBuiltInCommands -> src/lib/app/commands.ts:openViewCommands call
