# file card src/lib/features/type-definitions/type-definitions.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/type-definitions/type-definitions.store.svelte.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, store, locals, calls
file src/lib/features/type-definitions/type-definitions.store.svelte.ts store L125 module src/lib/features/type-definitions in20 t38
## imports
imp src/lib/features/type-definitions/type-definitions.store.svelte.ts:1 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/type-definitions/type-definitions.store.svelte.ts:2 -> src/lib/core/frontmatter/properties.logic.ts normalizeTypeCasing
imp src/lib/features/type-definitions/type-definitions.store.svelte.ts:3 -> src/lib/features/type-definitions/type-definitions.logic.ts type:TypeMetadata
imp src/lib/features/type-definitions/type-definitions.store.svelte.ts:4 -> src/lib/features/type-definitions/type-sidebar.logic.ts type:TypeSidebarSelection
## imported-by
imp src/lib/app/AppShell.svelte:8 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/boot.ts:14 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/commands.ts:20 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/editor-host.ts:32 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:74 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/app/tauri-listeners.service.ts:13 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/auto-organize/auto-organize.service.ts:44 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/event-calendar/EventCalendarSection.svelte:16 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/event-calendar/event-calendar.service.ts:32 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/note-action-bar/NoteActionBar.svelte:34 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/note-list/NoteRowMenu.svelte:26 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/properties/PropertiesView.svelte:24 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/FilesNavigator.svelte:54 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/Rail.svelte:23 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/RailNoteList.svelte:34 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/TypesNavigator.svelte:48 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/type-definitions/type-definitions.service.ts:21 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/plugins/calendar/CalendarNavigator.svelte:12 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/plugins/mods/mod-app.service.ts:12 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/plugins/one-on-one/MyPeopleSection.svelte:10 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
## reach
in2 src/lib/features/type-definitions/type-definitions.store.svelte.ts 18 files in 9 modules: src/lib/features/event-calendar(7) src/lib/app(4) src/lib/features/auto-organize(1) src/lib/features/rail-shell(1) src/lib/features/type-definitions(1) +4 modules: q impact src/lib/features/type-definitions/type-definitions.store.svelte.ts --depth 2
out2 src/lib/features/type-definitions/type-definitions.store.svelte.ts 8 files in 6 modules: src/lib/core/filesystem(2) src/lib/features/collection(2) src/lib/contracts(1) src/lib/core/frontmatter(1) src/lib/features/file-icons(1) +1 modules
## tests
test src/tests/lib/features/type-definitions/type-definitions.store.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts mirror
test src/tests/fixtures/calendar-vault.fixture.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/app/AppShell.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/app/EditorView.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/app/boot.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/app/commands.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/app/editor-host.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/app/meta-bind-open-view.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/collection/CollectionView.restored-view.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/collection/CollectionView.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/collection/collection-block-row-rule.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/event-calendar/EventCalendarSection.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/file-icons/icon-resolver.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/properties/PropertiesView.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/FilesNavigator.new-view.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/LayoutSection.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.properties.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.search.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.sort.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.toolbar.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/RailNoteList.view.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/rail-shell/new-note.service.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/type-definitions/create-view-folder.service.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/type-definitions/type-definitions.logic.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/type-definitions/type-definitions.reactivity.client.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/plugins/calendar/CalendarNavigator.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
test src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts imports src/lib/features/type-definitions/type-definitions.store.svelte.ts
## symbols
sym src/lib/features/type-definitions/type-definitions.store.svelte.ts:19 store typeDefinitionsStore L88
by src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore <- src/lib/app/AppShell.svelte:68 in $effect@66 member +9
by src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore <- src/lib/app/boot.ts:56 in registerAppPorts mcall +4
by src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore <- src/lib/app/commands.ts:63 in railGoToCommands member +3
by src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore <- src/lib/app/editor-host.ts:187 in appEditorHost.openView mcall
by src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:684 in teardownVault mcall
by src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore <- src/lib/app/tauri-listeners.service.ts:214 in registerVaultIndexUpdatedListener mcall +3
by src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore <- src/lib/features/auto-organize/auto-organize.service.ts:214 in registerAutoOrganizeHook member +1
by src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore <- src/lib/features/event-calendar/EventCalendarSection.svelte:49 in eventType=$derived member
more by 12 not shown: src/lib/features/rail-shell(4) src/lib/features/event-calendar(1) src/lib/features/note-action-bar(1) src/lib/features/note-list(1) src/lib/features/properties(1) src/lib/features/type-definitions(1) src/lib/plugins/calendar(1) src/lib/plugins/mods(1) +1 modules: q importers src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore
## store
store src/lib/features/type-definitions/type-definitions.store.svelte.ts:19 typeDefinitionsStore esc:4
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:20 get typeDefinitionsStore.typeMetadataMap r:15 w-via:setTypeMetadataMap,reset
more r 15 not shown: src/lib/features/rail-shell(5) src/lib/app(3) src/lib/features/auto-organize(2) src/lib/features/event-calendar(2) src/lib/features/type-definitions(2) src/lib/features/note-action-bar(1): q store src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.typeMetadataMap
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:21 get typeDefinitionsStore.entries r:12 w-via:setEntries,patchEntries,reset
more r 12 not shown: src/lib/app(6) src/lib/features/rail-shell(4) src/lib/plugins/calendar(1) src/lib/plugins/one-on-one(1): q store src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.entries
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:22 get typeDefinitionsStore.entriesVersion r:11 w-via:setEntries,patchEntries,reset
more r 11 not shown: src/lib/app(5) src/lib/features/rail-shell(5) src/lib/plugins/calendar(1): q store src/lib/features/type-definitions/type-definitions.store.svelte.ts:typeDefinitionsStore.entriesVersion
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:23 get typeDefinitionsStore.selectedTypeOrNav r:src/lib/features/type-definitions/type-definitions.service.ts:247 w-via:setSelection,reset
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:30 get typeDefinitionsStore.entriesByPath r:src/lib/app/AppShell.svelte:128,src/lib/app/commands.ts:99,src/lib/features/rail-shell/FilesNavigator.svelte:411,src/lib/features/rail-shell/TypesNavigator.svelte:191,src/lib/features/rail-shell/TypesNavigator.svelte:476,src/lib/features/rail-shell/TypesNavigator.svelte:482 w-via:setEntries,patchEntries,reset | O(1) path → entry index over the latest snapshot, for callers that need the whole map (a comparator resolving many paths) rather than a single lookup.
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:33 do typeDefinitionsStore.getTypeMetadata w:src/lib/features/rail-shell/RailNoteList.svelte:710 | Returns metadata for a type name, or undefined if not defined.
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:38 do typeDefinitionsStore.getEntryByPath w:src/lib/app/boot.ts:56,src/lib/app/boot.ts:80,src/lib/app/editor-host.ts:187,src/lib/features/note-list/NoteRowMenu.svelte:90,src/lib/features/rail-shell/RailNoteList.svelte:376,src/lib/features/rail-shell/RailNoteList.svelte:767 | O(1) lookup of an entry by absolute path in the latest snapshot.
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:43 do typeDefinitionsStore.getTypeDefinitionPath w:src/lib/app/boot.ts:57,src/lib/features/rail-shell/RailNoteList.svelte:373,src/lib/features/rail-shell/RailNoteList.svelte:655 | O(1) lookup of a type definition note's absolute path by type name (the `isA` its notes carry).
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:48 get typeDefinitionsStore.sortedTypes r:src/lib/features/properties/PropertiesView.svelte:94 w-via:setTypeMetadataMap,reset | Returns all type metadata entries sorted by order.
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:52 do typeDefinitionsStore.setTypeMetadataMap w:src/lib/features/type-definitions/type-definitions.service.ts:33
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:57 do typeDefinitionsStore.setEntries w:src/lib/app/tauri-listeners.service.ts:214,src/lib/app/tauri-listeners.service.ts:254 | Stores the latest vault entries snapshot for sidebar consumption.
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:76 do typeDefinitionsStore.patchEntries w:src/lib/app/tauri-listeners.service.ts:251 | Stores `value`, a snapshot that differs from the current one only at `touchedPaths` (`upserted` holds their new entries; a touched path not in it was removed),…
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:94 do typeDefinitionsStore.setSelection w:src/lib/features/type-definitions/type-definitions.service.ts:199,src/lib/features/type-definitions/type-definitions.service.ts:249,src/lib/features/type-definitions/type-definitions.service.ts:277 | Sets the current sidebar selection (type, nav item, or untyped).
mem src/lib/features/type-definitions/type-definitions.store.svelte.ts:98 do typeDefinitionsStore.reset w:src/lib/app/lifecycle/app-lifecycle.service.ts:684
## locals
local src/lib/features/type-definitions/type-definitions.store.svelte.ts:117 fn buildTypeDefinitionPaths(value: NoteEntryV2[]): Map<string, string> L9
## calls
call src/lib/features/type-definitions/type-definitions.store.svelte.ts:65 in typeDefinitionsStore.setEntries -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:buildTypeDefinitionPaths call
call src/lib/features/type-definitions/type-definitions.store.svelte.ts:89 in typeDefinitionsStore.patchEntries -> src/lib/features/type-definitions/type-definitions.store.svelte.ts:buildTypeDefinitionPaths call
call src/lib/features/type-definitions/type-definitions.store.svelte.ts:121 in buildTypeDefinitionPaths -> src/lib/core/frontmatter/properties.logic.ts:normalizeTypeCasing call
