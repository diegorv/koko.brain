# file card src/lib/features/deep-link/deep-link.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/deep-link/deep-link.store.svelte.ts ' codemap/files
file src/lib/features/deep-link/deep-link.store.svelte.ts store L36 module src/lib/features/deep-link in1 t5
## imports
imp src/lib/features/deep-link/deep-link.store.svelte.ts:1 -> src/lib/features/deep-link/deep-link.types.ts type:DeepLinkAction
## imported-by
imp src/lib/features/deep-link/deep-link.service.ts:15 -> src/lib/features/deep-link/deep-link.store.svelte.ts deepLinkStore
## reach
in2 src/lib/features/deep-link/deep-link.store.svelte.ts 4 files in 3 modules: src/lib/app(2) src/lib/plugins/quick-capture(1) src/routes(1)
out2 src/lib/features/deep-link/deep-link.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/deep-link/deep-link.store.test.ts imports src/lib/features/deep-link/deep-link.store.svelte.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts imports src/lib/features/deep-link/deep-link.store.svelte.ts
test src/tests/lib/core/vault/vault.service.switch-save.test.ts imports src/lib/features/deep-link/deep-link.store.svelte.ts
test src/tests/lib/features/deep-link/deep-link.service.race-audit.test.ts imports src/lib/features/deep-link/deep-link.store.svelte.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts imports src/lib/features/deep-link/deep-link.store.svelte.ts
## symbols
sym src/lib/features/deep-link/deep-link.store.svelte.ts:11 store deepLinkStore L26 | Store for deep-link state.
by src/lib/features/deep-link/deep-link.store.svelte.ts:deepLinkStore <- src/lib/features/deep-link/deep-link.service.ts:168 in resolveAndDispatch mcall +3
## store
store src/lib/features/deep-link/deep-link.store.svelte.ts:11 deepLinkStore esc:0
mem src/lib/features/deep-link/deep-link.store.svelte.ts:13 get deepLinkStore.pendingAction r:- w-via:setPendingAction,consumePendingAction,reset | The pending deep-link action, or null if none
mem src/lib/features/deep-link/deep-link.store.svelte.ts:15 get deepLinkStore.hasPending r:- w-via:setPendingAction,consumePendingAction,reset | Whether there is a pending action waiting to be executed
mem src/lib/features/deep-link/deep-link.store.svelte.ts:18 do deepLinkStore.setPendingAction w:src/lib/features/deep-link/deep-link.service.ts:168 | Stores an action to be executed after vault initialization
mem src/lib/features/deep-link/deep-link.store.svelte.ts:26 do deepLinkStore.consumePendingAction w:src/lib/features/deep-link/deep-link.service.ts:172,src/lib/features/deep-link/deep-link.service.ts:354 | Returns and clears the pending action.
mem src/lib/features/deep-link/deep-link.store.svelte.ts:33 do deepLinkStore.reset w:src/lib/features/deep-link/deep-link.service.ts:369 | Clears all deep-link state
