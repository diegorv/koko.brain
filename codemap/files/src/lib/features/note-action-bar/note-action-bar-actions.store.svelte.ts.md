# file card src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts ' codemap/files
file src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts store L34 module src/lib/features/note-action-bar in2 t4 | Note-creating actions plugins register into the note action bar.
## imports
imp src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:8 -> src/lib/features/note-action-bar/note-action-bar.logic.ts type:NoteHubAction
## imported-by
imp src/lib/features/note-action-bar/NoteActionBar.svelte:38 -> src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts noteActionBarActionsStore
imp src/lib/plugins/one-on-one/one-on-one.service.ts:9 -> src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts noteActionBarActionsStore
## reach
in2 src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts 7 files in 3 modules: src/lib/app(4) src/lib/plugins/one-on-one(2) src/lib/plugins/mods(1)
out2 src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts 3 files in 3 modules: src/lib/core/frontmatter(1) src/lib/features/properties(1) src/lib/utils(1)
## tests
test src/tests/lib/features/note-action-bar/note-action-bar-actions.store.test.ts imports src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts
test src/tests/lib/plugins/one-on-one/one-on-one.create.test.ts imports src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts
## symbols
sym src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:13 store noteActionBarActionsStore L22
by src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:noteActionBarActionsStore <- src/lib/features/note-action-bar/NoteActionBar.svelte:67 in hubButton=$derived member
by src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:noteActionBarActionsStore <- src/lib/plugins/one-on-one/one-on-one.service.ts:106 in registerOneOnOneActionBarAction mcall
## store
store src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:13 noteActionBarActionsStore esc:0
mem src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:15 get noteActionBarActionsStore.actions r:src/lib/features/note-action-bar/NoteActionBar.svelte:67 w-via:register,reset | The registered actions, in registration order.
mem src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:23 do noteActionBarActionsStore.register w:src/lib/plugins/one-on-one/one-on-one.service.ts:106 | Registers `action`.
mem src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:31 do noteActionBarActionsStore.reset w:- | Drops every registration.
