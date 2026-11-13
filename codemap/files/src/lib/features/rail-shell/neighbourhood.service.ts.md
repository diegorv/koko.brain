# file card src/lib/features/rail-shell/neighbourhood.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/neighbourhood.service.ts ' codemap/files
file src/lib/features/rail-shell/neighbourhood.service.ts service L36 module src/lib/features/rail-shell in2 t2
## imports
imp src/lib/features/rail-shell/neighbourhood.service.ts:1 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/features/rail-shell/neighbourhood.service.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/neighbourhood.service.ts:3 -> src/lib/features/rail-shell/lens.logic.ts NEIGHBOURHOOD_RAIL_ITEM,TODAY_RAIL_ITEM
imp src/lib/features/rail-shell/neighbourhood.service.ts:4 -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts neighbourhoodStore
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:61 -> src/lib/features/rail-shell/neighbourhood.service.ts registerNeighbourhoodPathChangeConsumer
imp src/lib/features/note-action-bar/NoteActionBar.svelte:35 -> src/lib/features/rail-shell/neighbourhood.service.ts openNeighbourhood
## reach
in2 src/lib/features/rail-shell/neighbourhood.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/features/rail-shell/neighbourhood.service.ts 32 files in 10 modules: src/lib/core/filesystem(7) src/lib/features/collection(5) src/lib/core/editor(4) src/lib/core/settings(4) src/lib/features/type-definitions(4) +5 modules
## tests
test src/tests/lib/features/rail-shell/neighbourhood.service.test.ts imports src/lib/features/rail-shell/neighbourhood.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/rail-shell/neighbourhood.service.ts
## symbols
sym src/lib/features/rail-shell/neighbourhood.service.ts:10 fn openNeighbourhood(path: string): void L4 | Fills the note list with the neighbourhood of the note at `path`, showing the panels Cmd+1 may have hidden.
by src/lib/features/rail-shell/neighbourhood.service.ts:openNeighbourhood <- src/lib/features/note-action-bar/NoteActionBar.svelte:90 in foldable=$derived call
sym src/lib/features/rail-shell/neighbourhood.service.ts:22 fn registerNeighbourhoodPathChangeConsumer(): () => void L15 | Registers the Neighbourhood lens as a path-change consumer, so the open neighbourhood follows its note (or a folder above it) when renamed or moved.
by src/lib/features/rail-shell/neighbourhood.service.ts:registerNeighbourhoodPathChangeConsumer <- src/lib/app/lifecycle/app-lifecycle.service.ts:269 in initializeVault call
## calls
call src/lib/features/rail-shell/neighbourhood.service.ts:11 in openNeighbourhood -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts:neighbourhoodStore.setNotePath mcall
call src/lib/features/rail-shell/neighbourhood.service.ts:12 in openNeighbourhood -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/neighbourhood.service.ts:23 in registerNeighbourhoodPathChangeConsumer -> src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer call
call src/lib/features/rail-shell/neighbourhood.service.ts:29 in registerNeighbourhoodPathChangeConsumer -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts:neighbourhoodStore.setNotePath mcall
call src/lib/features/rail-shell/neighbourhood.service.ts:32 in registerNeighbourhoodPathChangeConsumer -> src/lib/features/rail-shell/neighbourhood.store.svelte.ts:neighbourhoodStore.reset mcall
call src/lib/features/rail-shell/neighbourhood.service.ts:33 in registerNeighbourhoodPathChangeConsumer -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
## effects
reg src/lib/features/rail-shell/neighbourhood.service.ts:23 src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer in registerNeighbourhoodPathChangeConsumer args={ name: 'neighbourhood', pathChanged(from, to) { const path = neighbourhoodStor…
