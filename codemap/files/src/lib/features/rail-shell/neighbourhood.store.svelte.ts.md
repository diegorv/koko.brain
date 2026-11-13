# file card src/lib/features/rail-shell/neighbourhood.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/neighbourhood.store.svelte.ts ' codemap/files
file src/lib/features/rail-shell/neighbourhood.store.svelte.ts store L25 module src/lib/features/rail-shell in3 t4 | The note the rail shell's Neighbourhood lens shows.
## imported-by
imp src/lib/app/AppShell.svelte:19 -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts neighbourhoodStore
imp src/lib/app/lifecycle/app-lifecycle.service.ts:36 -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts neighbourhoodStore
imp src/lib/features/rail-shell/neighbourhood.service.ts:4 -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts neighbourhoodStore
## reach
in2 src/lib/features/rail-shell/neighbourhood.store.svelte.ts 2 files in 2 modules: src/lib/features/note-action-bar(1) src/routes(1)
out2 src/lib/features/rail-shell/neighbourhood.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/rail-shell/neighbourhood.store.test.ts imports src/lib/features/rail-shell/neighbourhood.store.svelte.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/rail-shell/neighbourhood.store.svelte.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/features/rail-shell/neighbourhood.store.svelte.ts
test src/tests/lib/features/rail-shell/neighbourhood.service.test.ts imports src/lib/features/rail-shell/neighbourhood.store.svelte.ts
## symbols
sym src/lib/features/rail-shell/neighbourhood.store.svelte.ts:10 store neighbourhoodStore L16
by src/lib/features/rail-shell/neighbourhood.store.svelte.ts:neighbourhoodStore <- src/lib/app/AppShell.svelte:109 in railItem=$derived member
by src/lib/features/rail-shell/neighbourhood.store.svelte.ts:neighbourhoodStore <- src/lib/app/lifecycle/app-lifecycle.service.ts:685 in teardownVault mcall
by src/lib/features/rail-shell/neighbourhood.store.svelte.ts:neighbourhoodStore <- src/lib/features/rail-shell/neighbourhood.service.ts:11 in openNeighbourhood mcall +3
## store
store src/lib/features/rail-shell/neighbourhood.store.svelte.ts:10 neighbourhoodStore esc:0
mem src/lib/features/rail-shell/neighbourhood.store.svelte.ts:12 get neighbourhoodStore.notePath r:src/lib/app/AppShell.svelte:109,src/lib/features/rail-shell/neighbourhood.service.ts:26 w-via:setNotePath,reset | Absolute path of the note whose neighbourhood the note list shows, or null
mem src/lib/features/rail-shell/neighbourhood.store.svelte.ts:17 do neighbourhoodStore.setNotePath w:src/lib/features/rail-shell/neighbourhood.service.ts:11,src/lib/features/rail-shell/neighbourhood.service.ts:29 | Sets the note whose neighbourhood the note list shows.
mem src/lib/features/rail-shell/neighbourhood.store.svelte.ts:22 do neighbourhoodStore.reset w:src/lib/app/lifecycle/app-lifecycle.service.ts:685,src/lib/features/rail-shell/neighbourhood.service.ts:32 | Clears the note.
