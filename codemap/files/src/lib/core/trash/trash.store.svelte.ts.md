# file card src/lib/core/trash/trash.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/trash/trash.store.svelte.ts ' codemap/files
file src/lib/core/trash/trash.store.svelte.ts store L34 module src/lib/core/trash in3 t13
## imports
imp src/lib/core/trash/trash.store.svelte.ts:1 -> src/lib/core/trash/trash.types.ts type:TrashItem
## imported-by
imp src/lib/core/settings/sections/TrashSection.svelte:5 -> src/lib/core/trash/trash.store.svelte.ts trashStore
imp src/lib/core/trash/trash.service.ts:3 -> src/lib/core/trash/trash.store.svelte.ts trashStore
imp src/lib/features/event-calendar/event-calendar.service.ts:25 -> src/lib/core/trash/trash.store.svelte.ts trashStore
## reach
in2 src/lib/core/trash/trash.store.svelte.ts 15 files in 5 modules: src/lib/features/event-calendar(7) src/lib/app(5) src/lib/core/filesystem(1) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1)
out2 src/lib/core/trash/trash.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/trash/trash.store.test.ts imports src/lib/core/trash/trash.store.svelte.ts mirror
test src/tests/fixtures/calendar-vault.fixture.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/app/boot.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/core/filesystem/delete-dirty-tab.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/core/settings/TrashSection.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/core/trash/trash.restore-tree.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/core/trash/trash.service.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/features/event-calendar/EventDialog.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/plugins/mods/mod-note-moved.test.ts imports src/lib/core/trash/trash.store.svelte.ts
test src/tests/lib/plugins/mods/mod-vault-paths.test.ts imports src/lib/core/trash/trash.store.svelte.ts
## symbols
sym src/lib/core/trash/trash.store.svelte.ts:14 store trashStore L21 | Central store for the trash system state.
by src/lib/core/trash/trash.store.svelte.ts:trashStore <- src/lib/core/settings/sections/TrashSection.svelte:50 in handleEmptyTrash member +7
by src/lib/core/trash/trash.store.svelte.ts:trashStore <- src/lib/core/trash/trash.service.ts:25 in loadTrash mcall +12
by src/lib/core/trash/trash.store.svelte.ts:trashStore <- src/lib/features/event-calendar/event-calendar.service.ts:1059 in deleteNow member +2
## store
store src/lib/core/trash/trash.store.svelte.ts:14 trashStore esc:0
mem src/lib/core/trash/trash.store.svelte.ts:16 get trashStore.items r:7 w-via:setItems,addItem,removeItem,clear | All trashed items
more r 7 not shown: src/lib/core/trash(3) src/lib/features/event-calendar(3) src/lib/core/settings(1): q store src/lib/core/trash/trash.store.svelte.ts:trashStore.items
mem src/lib/core/trash/trash.store.svelte.ts:18 get trashStore.loading r:src/lib/core/settings/sections/TrashSection.svelte:80 w-via:setLoading,clear | Whether a trash operation is in progress
mem src/lib/core/trash/trash.store.svelte.ts:20 get trashStore.count r:src/lib/core/settings/sections/TrashSection.svelte:50,src/lib/core/settings/sections/TrashSection.svelte:67,src/lib/core/settings/sections/TrashSection.svelte:69 w-via:setItems,addItem,removeItem,clear | Number of items currently in the trash
mem src/lib/core/trash/trash.store.svelte.ts:22 get trashStore.isEmpty r:src/lib/core/settings/sections/TrashSection.svelte:73,src/lib/core/settings/sections/TrashSection.svelte:82 w-via:setItems,addItem,removeItem,clear | Whether the trash is empty
mem src/lib/core/trash/trash.store.svelte.ts:25 do trashStore.setItems w:src/lib/core/trash/trash.service.ts:30,src/lib/core/trash/trash.service.ts:35,src/lib/core/trash/trash.service.ts:39 | Replaces the entire items list (used on load)
mem src/lib/core/trash/trash.store.svelte.ts:27 do trashStore.setLoading w:src/lib/core/trash/trash.service.ts:25,src/lib/core/trash/trash.service.ts:41 | Updates the loading flag
mem src/lib/core/trash/trash.store.svelte.ts:29 do trashStore.addItem w:src/lib/core/trash/trash.service.ts:83 | Prepends a single item to the list (newest first)
mem src/lib/core/trash/trash.store.svelte.ts:31 do trashStore.removeItem w:src/lib/core/trash/trash.service.ts:143,src/lib/core/trash/trash.service.ts:194 | Removes an item by ID
mem src/lib/core/trash/trash.store.svelte.ts:33 do trashStore.clear w:src/lib/core/trash/trash.service.ts:216,src/lib/core/trash/trash.service.ts:231 | Clears all items from the store
