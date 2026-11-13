# file card src/lib/core/settings/update-check.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/update-check.service.ts ' codemap/files
file src/lib/core/settings/update-check.service.ts service L37 module src/lib/core/settings in1 t2
## imports
imp src/lib/core/settings/update-check.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/core/settings/update-check.service.ts:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/update-check.service.ts:4 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:39 -> src/lib/core/settings/update-check.service.ts maybeAutoCheckForUpdates
## reach
in2 src/lib/core/settings/update-check.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/core/settings/update-check.service.ts 7 files in 3 modules: src/lib/core/settings(4) src/lib/contracts(2) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/update-check.service.test.ts imports src/lib/core/settings/update-check.service.ts mirror
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/settings/update-check.service.ts
## symbols
sym src/lib/core/settings/update-check.service.ts:19 fn maybeAutoCheckForUpdates(): Promise<void> L19 | Trigger a non-interactive update check on app launch if the user has `updates.autoCheck` enabled.
by src/lib/core/settings/update-check.service.ts:maybeAutoCheckForUpdates <- src/lib/app/lifecycle/app-lifecycle.service.ts:545 in initializeVault call
## calls
call src/lib/core/settings/update-check.service.ts:24 in maybeAutoCheckForUpdates -> src/lib/contracts/ipc.ts:call call
call src/lib/core/settings/update-check.service.ts:27 in maybeAutoCheckForUpdates -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateUpdates mcall
call src/lib/core/settings/update-check.service.ts:35 in maybeAutoCheckForUpdates -> src/lib/utils/debug.ts:error call
## effects
ipc-call src/lib/core/settings/update-check.service.ts:24 in maybeAutoCheckForUpdates -> ipc:check_for_update_on_channel -> src-tauri/src/commands/update_channel.rs:88
