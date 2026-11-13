# file card src/lib/features/rail-shell/view-lens-seed.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/view-lens-seed.logic.ts ' codemap/files
file src/lib/features/rail-shell/view-lens-seed.logic.ts logic L56 module src/lib/features/rail-shell in1 t1
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:78 -> src/lib/features/rail-shell/view-lens-seed.logic.ts INITIAL_VIEW_SEED,stepViewSeed,type:ViewSeedEvent,type:ViewSeedState
## reach
in2 src/lib/features/rail-shell/view-lens-seed.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/view-lens-seed.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/rail-shell/view-lens-seed.logic.test.ts imports src/lib/features/rail-shell/view-lens-seed.logic.ts mirror
## symbols
sym src/lib/features/rail-shell/view-lens-seed.logic.ts:7 interface ViewSeedState L12 | When the view lens's Sort and Filter toolbar state is (re-)seeded from the `.view` YAML.
by src/lib/features/rail-shell/view-lens-seed.logic.ts:ViewSeedState <- src/lib/features/rail-shell/RailNoteList.svelte:78 in (script) import
sym src/lib/features/rail-shell/view-lens-seed.logic.ts:21 type ViewSeedEvent L11 | What happened to the view lens
by src/lib/features/rail-shell/view-lens-seed.logic.ts:ViewSeedEvent <- src/lib/features/rail-shell/RailNoteList.svelte:78 in (script) import
sym src/lib/features/rail-shell/view-lens-seed.logic.ts:34 const INITIAL_VIEW_SEED: ViewSeedState L1 | No seed and no save in flight
by src/lib/features/rail-shell/view-lens-seed.logic.ts:INITIAL_VIEW_SEED <- src/lib/features/rail-shell/RailNoteList.svelte:163 in viewSeed ref
sym src/lib/features/rail-shell/view-lens-seed.logic.ts:40 fn stepViewSeed(prev: ViewSeedState, event: ViewSeedEvent): { next: ViewSeedState; reseed: boolean } L17 | Advances the seed state by one event and says whether the toolbar state must be re-seeded from the parsed `.view` now (only ever true on `loaded`).
by src/lib/features/rail-shell/view-lens-seed.logic.ts:stepViewSeed <- src/lib/features/rail-shell/RailNoteList.svelte:228 in stepSeed call
