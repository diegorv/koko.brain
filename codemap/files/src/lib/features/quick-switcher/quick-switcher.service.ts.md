# file card src/lib/features/quick-switcher/quick-switcher.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/quick-switcher/quick-switcher.service.ts ' codemap/files
file src/lib/features/quick-switcher/quick-switcher.service.ts service L6 module src/lib/features/quick-switcher in1 t2
## imports
imp src/lib/features/quick-switcher/quick-switcher.service.ts:1 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:62 -> src/lib/features/quick-switcher/quick-switcher.service.ts resetQuickSwitcher
## reach
in2 src/lib/features/quick-switcher/quick-switcher.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/features/quick-switcher/quick-switcher.service.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/quick-switcher/quick-switcher.service.test.ts imports src/lib/features/quick-switcher/quick-switcher.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/quick-switcher/quick-switcher.service.ts
## symbols
sym src/lib/features/quick-switcher/quick-switcher.service.ts:4 fn resetQuickSwitcher(): void L3 | Resets the quick switcher store to its initial state.
by src/lib/features/quick-switcher/quick-switcher.service.ts:resetQuickSwitcher <- src/lib/app/lifecycle/app-lifecycle.service.ts:676 in teardownVault call
## calls
call src/lib/features/quick-switcher/quick-switcher.service.ts:5 in resetQuickSwitcher -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore.reset mcall
