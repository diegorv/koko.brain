# file card src/lib/core/vault/exit.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/vault/exit.service.ts ' codemap/files
file src/lib/core/vault/exit.service.ts service L39 module src/lib/core/vault in3 t1
## imports
imp src/lib/core/vault/exit.service.ts:1 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/core/vault/exit.service.ts:2 -> src/lib/core/editor/editor.service.ts saveAllDirtyTabs
imp src/lib/core/vault/exit.service.ts:3 -> src/lib/core/settings/settings-persistence.svelte.ts flushSettingsPersistence
imp src/lib/core/vault/exit.service.ts:4 -> src/lib/core/vault/write-barrier.service.ts drainPendingWrites
## imported-by
imp src/lib/app/tauri-listeners.service.ts:9 -> src/lib/core/vault/exit.service.ts prepareForExit
imp src/lib/core/settings/sections/UpdateSection.svelte:11 -> src/lib/core/vault/exit.service.ts prepareForExit
imp src/lib/core/vault/vault.service.ts:6 -> src/lib/core/vault/exit.service.ts confirmDiscardFailedSaves
## reach
in2 src/lib/core/vault/exit.service.ts 4 files in 3 modules: src/routes(2) src/lib/app(1) src/lib/features/deep-link(1)
out2 src/lib/core/vault/exit.service.ts 13 files in 5 modules: src/lib/core/editor(4) src/lib/core/settings(4) src/lib/utils(3) src/lib/core/filesystem(1) src/lib/core/markdown-editor(1)
## tests
test src/tests/lib/core/vault/exit.service.test.ts imports src/lib/core/vault/exit.service.ts mirror
## symbols
sym src/lib/core/vault/exit.service.ts:15 fn prepareForExit(): Promise<boolean> L9 | Puts every pending write on disk before the app goes away: the window close, Quit (Cmd+Q, app menu) and Restart to update all run it first.
by src/lib/core/vault/exit.service.ts:prepareForExit <- src/lib/app/tauri-listeners.service.ts:53 in registerCloseHandler call +1
by src/lib/core/vault/exit.service.ts:prepareForExit <- src/lib/core/settings/sections/UpdateSection.svelte:221 in restartApp call
sym src/lib/core/vault/exit.service.ts:32 fn confirmDiscardFailedSaves(failedPaths: string[], verb: string): Promise<boolean> L8 | Asks whether to go on and lose the unsaved changes of tabs whose save failed.
by src/lib/core/vault/exit.service.ts:confirmDiscardFailedSaves <- src/lib/core/vault/vault.service.ts:23 in switchVault call
## calls
call src/lib/core/vault/exit.service.ts:16 in prepareForExit -> src/lib/core/editor/editor.service.ts:saveAllDirtyTabs call
call src/lib/core/vault/exit.service.ts:16 in prepareForExit -> src/lib/core/vault/exit.service.ts:confirmDiscardFailedSaves call
call src/lib/core/vault/exit.service.ts:17 in prepareForExit -> src/lib/core/vault/write-barrier.service.ts:drainPendingWrites call
call src/lib/core/vault/exit.service.ts:21 in prepareForExit -> src/lib/core/settings/settings-persistence.svelte.ts:flushSettingsPersistence call
## effects
fx src/lib/core/vault/exit.service.ts:35 tauri-dialog.ask in confirmDiscardFailedSaves
