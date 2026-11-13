# file card src/lib/plugins/mods/mod-dialogs.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/mod-dialogs.store.svelte.ts ' codemap/files
file src/lib/plugins/mods/mod-dialogs.store.svelte.ts store L146 module src/lib/plugins/mods in2 t6
## imported-by
imp src/lib/plugins/mods/ModDialogHost.svelte:15 -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts modDialogsStore,type:ModAlertKind
imp src/lib/plugins/mods/mods-host.service.ts:23 -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts modDialogsStore,type:ModDialogSpec
## reach
in2 src/lib/plugins/mods/mod-dialogs.store.svelte.ts 4 files in 2 modules: src/lib/app(3) src/lib/plugins/mods(1)
out2 src/lib/plugins/mods/mod-dialogs.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/mods/mod-dialogs.store.test.ts imports src/lib/plugins/mods/mod-dialogs.store.svelte.ts mirror
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/plugins/mods/mod-dialogs.store.svelte.ts
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts imports src/lib/plugins/mods/mod-dialogs.store.svelte.ts
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports src/lib/plugins/mods/mod-dialogs.store.svelte.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/plugins/mods/mod-dialogs.store.svelte.ts
test src/tests/lib/plugins/mods/mods-host.service.test.ts imports src/lib/plugins/mods/mod-dialogs.store.svelte.ts
## symbols
sym src/lib/plugins/mods/mod-dialogs.store.svelte.ts:2 type ModAlertKind L1 | Style of a mod's `alert` dialog
by src/lib/plugins/mods/mod-dialogs.store.svelte.ts:ModAlertKind <- src/lib/plugins/mods/ModDialogHost.svelte:15 in (script) import
sym src/lib/plugins/mods/mod-dialogs.store.svelte.ts:5 type ModDialogSpec L6 | What a mod's dialog shows, per kind, with the host's defaults filled in
by src/lib/plugins/mods/mod-dialogs.store.svelte.ts:ModDialogSpec <- src/lib/plugins/mods/mods-host.service.ts:23 in (module) import
sym src/lib/plugins/mods/mod-dialogs.store.svelte.ts:13 interface ModDialogResults L8 | What each kind settles with: a loading dialog settles with whether it was cancelled
sym src/lib/plugins/mods/mod-dialogs.store.svelte.ts:23 type ModDialog L10 | A dialog in the queue
sym src/lib/plugins/mods/mod-dialogs.store.svelte.ts:40 interface ModDialogTransition L10 | Content-free state transition delivered synchronously to the owning host.
sym src/lib/plugins/mods/mod-dialogs.store.svelte.ts:73 store modDialogsStore L74 | Reactive queue of the dialogs mods open with `ctx.ui` and `run.ui`; one shows at a time
by src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore <- src/lib/plugins/mods/ModDialogHost.svelte:26 in dialog=$derived member +13
by src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore <- src/lib/plugins/mods/mods-host.service.ts:267 in createModContext mcall +3
## store
store src/lib/plugins/mods/mod-dialogs.store.svelte.ts:73 modDialogsStore esc:0
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:75 get modDialogsStore.current r:src/lib/plugins/mods/ModDialogHost.svelte:26 w-via:open,answer,dismiss,closeForMod,closeForRun,+1 | The dialog shown, or null when none is open
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:79 get modDialogsStore.dialogs r:- w-via:open,answer,dismiss,closeForMod,closeForRun,+1 | Every dialog, the shown one first, then the queued ones in call order
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:88 do modDialogsStore.open w:src/lib/plugins/mods/mods-host.service.ts:267 | Adds a dialog to the queue; it shows once the dialogs before it settle.
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:106 do modDialogsStore.markOpened w:src/lib/plugins/mods/ModDialogHost.svelte:57 | Records the host component opening the current dialog, once per dialog.
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:115 do modDialogsStore.answer w:7 | Settles a dialog with the user's answer and removes it; does nothing for an unknown id
more w 7 not shown: src/lib/plugins/mods(7): q store src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.answer
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:121 do modDialogsStore.dismiss w:src/lib/plugins/mods/ModDialogHost.svelte:53,src/lib/plugins/mods/ModDialogHost.svelte:65,src/lib/plugins/mods/ModDialogHost.svelte:131,src/lib/plugins/mods/ModDialogHost.svelte:170,src/lib/plugins/mods/ModDialogHost.svelte:199,src/lib/plugins/mods/ModDialogHost.svelte:204 | Settles a dialog as cancelled and removes it; does nothing for an unknown id
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:127 do modDialogsStore.closeForMod w:src/lib/plugins/mods/mods-host.service.ts:737 | Settles every open and queued dialog of `modId` as cancelled (the mod unloaded)
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:135 do modDialogsStore.closeForRun w:src/lib/plugins/mods/mods-host.service.ts:427 | Rejects every open and queued dialog of the run `runId` with a `DOMException` named `AbortError` (the run was stopped or its mod unloaded)
mem src/lib/plugins/mods/mod-dialogs.store.svelte.ts:142 do modDialogsStore.reset w:- | Settles every dialog as cancelled and empties the queue (tests)
## locals
local src/lib/plugins/mods/mod-dialogs.store.svelte.ts:61 fn settle(id: number, outcome: { value: unknown } | { error: unknown }, reason: string): void L10
## calls
call src/lib/plugins/mods/mod-dialogs.store.svelte.ts:117 in modDialogsStore.answer -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:settle call
call src/lib/plugins/mods/mod-dialogs.store.svelte.ts:123 in modDialogsStore.dismiss -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:settle call
call src/lib/plugins/mods/mod-dialogs.store.svelte.ts:128 in modDialogsStore.closeForMod -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:settle call
call src/lib/plugins/mods/mod-dialogs.store.svelte.ts:137 in modDialogsStore.closeForRun -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:settle call
call src/lib/plugins/mods/mod-dialogs.store.svelte.ts:143 in modDialogsStore.reset -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:settle call
