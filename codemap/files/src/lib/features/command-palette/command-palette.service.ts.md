# file card src/lib/features/command-palette/command-palette.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/command-palette/command-palette.service.ts ' codemap/files
file src/lib/features/command-palette/command-palette.service.ts service L6 module src/lib/features/command-palette in1 t1
## imports
imp src/lib/features/command-palette/command-palette.service.ts:1 -> src/lib/features/command-palette/command-palette.store.svelte.ts commandPaletteStore
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:63 -> src/lib/features/command-palette/command-palette.service.ts resetCommandPalette
## reach
in2 src/lib/features/command-palette/command-palette.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/features/command-palette/command-palette.service.ts 0 files in 0 modules: -
## tests
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/command-palette/command-palette.service.ts
## symbols
sym src/lib/features/command-palette/command-palette.service.ts:4 fn resetCommandPalette(): void L3 | Resets the command palette store to its initial state.
by src/lib/features/command-palette/command-palette.service.ts:resetCommandPalette <- src/lib/app/lifecycle/app-lifecycle.service.ts:677 in teardownVault call
## calls
call src/lib/features/command-palette/command-palette.service.ts:5 in resetCommandPalette -> src/lib/features/command-palette/command-palette.store.svelte.ts:commandPaletteStore.reset mcall
