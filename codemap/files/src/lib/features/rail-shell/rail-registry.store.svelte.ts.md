# file card src/lib/features/rail-shell/rail-registry.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/rail-registry.store.svelte.ts ' codemap/files
file src/lib/features/rail-shell/rail-registry.store.svelte.ts store L111 module src/lib/features/rail-shell in11 t26
## imports
imp src/lib/features/rail-shell/rail-registry.store.svelte.ts:1 -> src/lib/features/rail-shell/rail-shell.types.ts type:RailAction,type:RailFolderCreator,type:RailLensProvider,type:RailMenuItem,type:RailNavigator,type:RailTodaySection
## imported-by
imp src/lib/app/AppShell.svelte:18 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/app/commands.ts:19 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:56 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/LayoutSection.svelte:21 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/Rail.svelte:42 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/RailNoteList.svelte:93 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/calendar/calendar-rail.service.ts:5 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/kanban/kanban.service.ts:11 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/mods/mod-app.service.ts:10 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/mods/mods-host.service.ts:14 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/plugins/one-on-one/one-on-one-today.service.ts:1 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
## reach
in2 src/lib/features/rail-shell/rail-registry.store.svelte.ts 8 files in 4 modules: src/lib/app(5) src/lib/plugins/kanban(1) src/lib/plugins/mods(1) src/routes(1)
out2 src/lib/features/rail-shell/rail-registry.store.svelte.ts 5 files in 5 modules: src/lib/core/filesystem(1) src/lib/features/note-list(1) src/lib/features/type-definitions(1) src/lib/types(1) src/lib/utils(1)
## tests
test src/tests/lib/features/rail-shell/rail-registry.store.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts mirror
test src/tests/lib/app/commands.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/LayoutSection.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/calendar/calendar-rail.service.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/kanban/kanban.service.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/ModActionPicker.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/mod-api-contract.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/mod-app.service.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/mod-rail-icon.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host-trace.service.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
test src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts imports src/lib/features/rail-shell/rail-registry.store.svelte.ts
## symbols
sym src/lib/features/rail-shell/rail-registry.store.svelte.ts:27 store railRegistryStore L85
by src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore <- src/lib/app/AppShell.svelte:108 in railItem=$derived member +1
by src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore <- src/lib/app/commands.ts:66 in railGoToCommands member
by src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore <- src/lib/features/rail-shell/FilesNavigator.svelte:90 in fileCreators=$derived member +1
by src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore <- src/lib/features/rail-shell/LayoutSection.svelte:39 in items=$derived member
by src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore <- src/lib/features/rail-shell/Rail.svelte:84 in items=$derived member +1
by src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore <- src/lib/features/rail-shell/RailNoteList.svelte:191 in resolved=$derived member +4
by src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore <- src/lib/plugins/calendar/calendar-rail.service.ts:26 in registerCalendarRail mcall +1
by src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore <- src/lib/plugins/kanban/kanban.service.ts:28 in registerKanbanFolderCreator mcall
more by 3 not shown: src/lib/plugins/mods(2) src/lib/plugins/one-on-one(1): q importers src/lib/features/rail-shell/rail-registry.store.svelte.ts:railRegistryStore
## store
store src/lib/features/rail-shell/rail-registry.store.svelte.ts:27 railRegistryStore esc:1
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:29 get railRegistryStore.menuItems r:src/lib/features/rail-shell/FilesNavigator.svelte:363,src/lib/features/rail-shell/RailNoteList.svelte:832 w-via:registerMenuItem,reset | Registered note-row and folder menu actions
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:34 do railRegistryStore.registerMenuItem w:src/lib/plugins/mods/mods-host.service.ts:221 | Adds a menu item, replacing one with the same id.
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:42 get railRegistryStore.navigators r:src/lib/app/AppShell.svelte:108,src/lib/app/AppShell.svelte:116,src/lib/app/commands.ts:66,src/lib/features/rail-shell/LayoutSection.svelte:39,src/lib/features/rail-shell/Rail.svelte:84 w-via:registerNavigator,reset | Registered navigators
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:46 get railRegistryStore.lensProviders r:src/lib/features/rail-shell/RailNoteList.svelte:191,src/lib/features/rail-shell/RailNoteList.svelte:591,src/lib/features/rail-shell/RailNoteList.svelte:637 w-via:registerLensProvider,reset | Registered lens providers
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:50 get railRegistryStore.todaySections r:src/lib/features/rail-shell/RailNoteList.svelte:689 w-via:registerTodaySection,reset | Registered Today sections
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:54 get railRegistryStore.folderCreators r:src/lib/features/rail-shell/FilesNavigator.svelte:90 w-via:registerFolderCreator,reset | Registered folder menu creators
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:58 get railRegistryStore.actions r:src/lib/features/rail-shell/Rail.svelte:192 w-via:registerAction,reset | Registered action buttons
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:63 do railRegistryStore.registerNavigator w:src/lib/plugins/calendar/calendar-rail.service.ts:26 | Adds a navigator, replacing one with the same id.
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:71 do railRegistryStore.registerLensProvider w:src/lib/plugins/calendar/calendar-rail.service.ts:33 | Adds a lens provider, replacing one for the same kind.
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:79 do railRegistryStore.registerTodaySection w:src/lib/plugins/one-on-one/one-on-one-today.service.ts:13 | Adds a Today section, replacing one with the same id.
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:87 do railRegistryStore.registerFolderCreator w:src/lib/plugins/kanban/kanban.service.ts:28 | Adds a folder menu creator, replacing one with the same id.
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:95 do railRegistryStore.registerAction w:src/lib/plugins/mods/mods-host.service.ts:600 | Adds an action button, replacing one with the same key.
mem src/lib/features/rail-shell/rail-registry.store.svelte.ts:103 do railRegistryStore.reset w:- | Drops every registration
