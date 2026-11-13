# file card src/lib/features/rail-shell/files-navigator.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/files-navigator.service.ts ' codemap/files
file src/lib/features/rail-shell/files-navigator.service.ts service L20 module src/lib/features/rail-shell in1 t3
## imports
imp src/lib/features/rail-shell/files-navigator.service.ts:1 -> src/lib/core/filesystem/path-change.service.ts registerPathChangeConsumer
imp src/lib/features/rail-shell/files-navigator.service.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/files-navigator.service.ts:3 -> src/lib/features/rail-shell/lens.logic.ts followFolderPathChange
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:59 -> src/lib/features/rail-shell/files-navigator.service.ts registerFilesNavigatorPathChangeConsumer
## reach
in2 src/lib/features/rail-shell/files-navigator.service.ts 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/files-navigator.service.ts 32 files in 10 modules: src/lib/core/filesystem(7) src/lib/features/collection(5) src/lib/core/editor(4) src/lib/core/settings(4) src/lib/features/type-definitions(4) +5 modules
## tests
test src/tests/lib/features/rail-shell/files-navigator.service.test.ts imports src/lib/features/rail-shell/files-navigator.service.ts mirror
test src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts imports src/lib/features/rail-shell/files-navigator.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/features/rail-shell/files-navigator.service.ts
## symbols
sym src/lib/features/rail-shell/files-navigator.service.ts:11 fn registerFilesNavigatorPathChangeConsumer(): () => void L10 | Registers the Files navigator as a path-change consumer, so its saved pick and expanded folders follow a folder renamed, moved or deleted anywhere in the app.
by src/lib/features/rail-shell/files-navigator.service.ts:registerFilesNavigatorPathChangeConsumer <- src/lib/app/lifecycle/app-lifecycle.service.ts:266 in initializeVault call
## calls
call src/lib/features/rail-shell/files-navigator.service.ts:12 in registerFilesNavigatorPathChangeConsumer -> src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer call
call src/lib/features/rail-shell/files-navigator.service.ts:16 in registerFilesNavigatorPathChangeConsumer -> src/lib/features/rail-shell/lens.logic.ts:followFolderPathChange call
call src/lib/features/rail-shell/files-navigator.service.ts:17 in registerFilesNavigatorPathChangeConsumer -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
## effects
reg src/lib/features/rail-shell/files-navigator.service.ts:12 src/lib/core/filesystem/path-change.service.ts:registerPathChangeConsumer in registerFilesNavigatorPathChangeConsumer args={ name: 'files-navigator', pathChanged(from, to) { const { railFolder, railExpa…
