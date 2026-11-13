# file card src/lib/app/global-keybindings.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/global-keybindings.ts ' codemap/files
file src/lib/app/global-keybindings.ts other L229 module src/lib/app in2 t1
## imports
imp src/lib/app/global-keybindings.ts:1 -> src/lib/utils/keybindings.ts registerKeybinding,type:KeyBinding,type:KeyCombo
imp src/lib/app/global-keybindings.ts:2 -> src/lib/core/editor/editor.service.ts saveCurrentFile,closeActiveTab,switchToNextTab,switchToPreviousTab,toggleSourceMode
imp src/lib/app/global-keybindings.ts:9 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
imp src/lib/app/global-keybindings.ts:10 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/app/global-keybindings.ts:11 -> src/lib/features/event-calendar/event-calendar-keys.logic.ts isTypingTarget
imp src/lib/app/global-keybindings.ts:12 -> src/lib/plugins/graph-view/graph-view.service.ts toggleGraphTab
imp src/lib/app/global-keybindings.ts:13 -> src/lib/features/tasks/tasks.service.ts toggleTasksTab
imp src/lib/app/global-keybindings.ts:14 -> src/lib/features/event-calendar/event-calendar.service.ts toggleEventCalendarTab
imp src/lib/app/global-keybindings.ts:15 -> src/lib/features/command-palette/command-palette.store.svelte.ts commandPaletteStore
imp src/lib/app/global-keybindings.ts:16 -> src/lib/core/settings/settings-panel.store.svelte.ts settingsPanelStore
imp src/lib/app/global-keybindings.ts:17 -> src/lib/plugins/quick-capture/note-composer.service.ts createNoteComposer
imp src/lib/app/global-keybindings.ts:18 -> src/lib/plugins/one-on-one/one-on-one.service.ts openOneOnOnePicker
imp src/lib/app/global-keybindings.ts:19 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/app/global-keybindings.ts:20 -> src/lib/features/file-history/file-history.service.ts openFileHistory
imp src/lib/app/global-keybindings.ts:21 -> src/lib/core/layout/layout.service.ts hideRailPanels,showRailPanels,toggleLeftSidebar,toggleRightSidebar
imp src/lib/app/global-keybindings.ts:27 -> src/lib/core/zoom/zoom.service.ts zoomIn,zoomOut,resetZoom
imp src/lib/app/global-keybindings.ts:28 -> src/lib/features/properties/lifecycle.service.ts toggleActiveNoteFavorite,toggleActiveNoteOrganized
imp src/lib/app/global-keybindings.ts:29 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/app/commands.ts:53 -> src/lib/app/global-keybindings.ts shortcutFor
imp src/routes/(app)/+layout.svelte:9 -> src/lib/app/global-keybindings.ts registerGlobalKeybindings
## reach
in2 src/lib/app/global-keybindings.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/app/global-keybindings.ts 60 files in 23 modules: src/lib/features/event-calendar(9) src/lib/features/tasks(8) src/lib/core/filesystem(4) src/lib/core/editor(3) src/lib/core/frontmatter(3) +18 modules
## tests
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/app/global-keybindings.ts mirror
## symbols
sym src/lib/app/global-keybindings.ts:211 fn shortcutFor(command: string): KeyCombo L6 | Returns the key combo bound to a palette command, for its shortcut label.
by src/lib/app/global-keybindings.ts:shortcutFor <- src/lib/app/commands.ts:124 in getBuiltInCommands call +18
sym src/lib/app/global-keybindings.ts:222 fn registerGlobalKeybindings(): () => void L8 | Registers all app-wide keyboard shortcuts.
by src/lib/app/global-keybindings.ts:registerGlobalKeybindings <- src/routes/(app)/+layout.svelte:42 in $effect@41 call
## locals
local src/lib/app/global-keybindings.ts:40 fn registerSlashSearchKeybinding(): () => void L11
## calls
call src/lib/app/global-keybindings.ts:43 in registerSlashSearchKeybinding -> src/lib/features/event-calendar/event-calendar-keys.logic.ts:isTypingTarget call
call src/lib/app/global-keybindings.ts:46 in registerSlashSearchKeybinding -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/app/global-keybindings.ts:66 in GLOBAL_KEYBINDINGS -> src/lib/features/command-palette/command-palette.store.svelte.ts:commandPaletteStore.toggle mcall
call src/lib/app/global-keybindings.ts:72 in GLOBAL_KEYBINDINGS -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.toggle mcall
call src/lib/app/global-keybindings.ts:78 in GLOBAL_KEYBINDINGS -> src/lib/core/editor/editor.service.ts:saveCurrentFile call
call src/lib/app/global-keybindings.ts:84 in GLOBAL_KEYBINDINGS -> src/lib/core/editor/editor.service.ts:closeActiveTab call
call src/lib/app/global-keybindings.ts:91 in GLOBAL_KEYBINDINGS -> src/lib/core/editor/editor.service.ts:switchToPreviousTab call
call src/lib/app/global-keybindings.ts:98 in GLOBAL_KEYBINDINGS -> src/lib/core/editor/editor.service.ts:switchToNextTab call
call src/lib/app/global-keybindings.ts:105 in GLOBAL_KEYBINDINGS -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/app/global-keybindings.ts:112 in GLOBAL_KEYBINDINGS -> src/lib/plugins/graph-view/graph-view.service.ts:toggleGraphTab call
call src/lib/app/global-keybindings.ts:121 in GLOBAL_KEYBINDINGS -> src/lib/features/tasks/tasks.service.ts:toggleTasksTab call
call src/lib/app/global-keybindings.ts:130 in GLOBAL_KEYBINDINGS -> src/lib/features/event-calendar/event-calendar.service.ts:toggleEventCalendarTab call
call src/lib/app/global-keybindings.ts:138 in GLOBAL_KEYBINDINGS -> src/lib/core/layout/layout.service.ts:toggleLeftSidebar ref
call src/lib/app/global-keybindings.ts:140 in GLOBAL_KEYBINDINGS -> src/lib/core/layout/layout.service.ts:hideRailPanels ref
call src/lib/app/global-keybindings.ts:141 in GLOBAL_KEYBINDINGS -> src/lib/core/layout/layout.service.ts:showRailPanels ref
call src/lib/app/global-keybindings.ts:146 in GLOBAL_KEYBINDINGS -> src/lib/core/layout/layout.service.ts:toggleRightSidebar ref
call src/lib/app/global-keybindings.ts:152 in GLOBAL_KEYBINDINGS -> src/lib/plugins/quick-capture/note-composer.service.ts:createNoteComposer call
call src/lib/app/global-keybindings.ts:152 in GLOBAL_KEYBINDINGS -> src/lib/utils/debug.ts:error call +7
call src/lib/app/global-keybindings.ts:159 in GLOBAL_KEYBINDINGS -> src/lib/plugins/one-on-one/one-on-one.service.ts:openOneOnOnePicker call
call src/lib/app/global-keybindings.ts:165 in GLOBAL_KEYBINDINGS -> src/lib/core/settings/settings-panel.store.svelte.ts:settingsPanelStore.toggle mcall
call src/lib/app/global-keybindings.ts:174 in GLOBAL_KEYBINDINGS -> src/lib/features/file-history/file-history.service.ts:openFileHistory call
call src/lib/app/global-keybindings.ts:178 in GLOBAL_KEYBINDINGS -> src/lib/core/zoom/zoom.service.ts:zoomIn call +1
call src/lib/app/global-keybindings.ts:180 in GLOBAL_KEYBINDINGS -> src/lib/core/zoom/zoom.service.ts:zoomOut call
call src/lib/app/global-keybindings.ts:181 in GLOBAL_KEYBINDINGS -> src/lib/core/zoom/zoom.service.ts:resetZoom call
call src/lib/app/global-keybindings.ts:187 in GLOBAL_KEYBINDINGS -> src/lib/core/editor/editor.service.ts:toggleSourceMode call
call src/lib/app/global-keybindings.ts:195 in GLOBAL_KEYBINDINGS -> src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteFavorite call
call src/lib/app/global-keybindings.ts:201 in GLOBAL_KEYBINDINGS -> src/lib/features/properties/lifecycle.service.ts:toggleActiveNoteOrganized call
call src/lib/app/global-keybindings.ts:224 in registerGlobalKeybindings -> src/lib/utils/keybindings.ts:registerKeybinding call
call src/lib/app/global-keybindings.ts:225 in registerGlobalKeybindings -> src/lib/app/global-keybindings.ts:registerSlashSearchKeybinding call
## effects
fx src/lib/app/global-keybindings.ts:48 dom.keydown document in registerSlashSearchKeybinding
