# file card src/lib/plugins/mods/ModDialogHost.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/ModDialogHost.svelte ' codemap/files
file src/lib/plugins/mods/ModDialogHost.svelte component L210 module src/lib/plugins/mods in1 t2
## imports
imp src/lib/plugins/mods/ModDialogHost.svelte:9 -> src/lib/components/ui/button/index.ts Button
imp src/lib/plugins/mods/ModDialogHost.svelte:10 -> src/lib/components/ui/command/index.ts *
imp src/lib/plugins/mods/ModDialogHost.svelte:11 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/plugins/mods/ModDialogHost.svelte:12 -> src/lib/components/ui/input/index.ts Input
imp src/lib/plugins/mods/ModDialogHost.svelte:13 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
imp src/lib/plugins/mods/ModDialogHost.svelte:15 -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts modDialogsStore,type:ModAlertKind
## imported-by
imp src/lib/app/AppOverlays.svelte:10 -> src/lib/plugins/mods/ModDialogHost.svelte default
## reach
in2 src/lib/plugins/mods/ModDialogHost.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/mods/ModDialogHost.svelte 23 files in 1 modules: src/lib/components(23)
## tests
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports src/lib/plugins/mods/ModDialogHost.svelte mirror
test src/tests/lib/plugins/mods/ModDialogDiagnostics.test.ts imports src/lib/plugins/mods/ModDialogHost.svelte
## symbols
sym src/lib/plugins/mods/ModDialogHost.svelte:1 component ModDialogHost L210
by src/lib/plugins/mods/ModDialogHost.svelte:default <- src/lib/app/AppOverlays.svelte:23 in (markup) mount
## locals
local src/lib/plugins/mods/ModDialogHost.svelte:52 fn handleOpenChange(open: boolean) L3
local src/lib/plugins/mods/ModDialogHost.svelte:56 fn focusInitial(e: Event) L6
local src/lib/plugins/mods/ModDialogHost.svelte:63 fn handleEscape(e: KeyboardEvent) L4
local src/lib/plugins/mods/ModDialogHost.svelte:69 fn keepOpen(e: Event) L3
local src/lib/plugins/mods/ModDialogHost.svelte:74 fn handleConfirmKeydown(e: KeyboardEvent) L6
local src/lib/plugins/mods/ModDialogHost.svelte:82 fn handlePromptKeydown(e: KeyboardEvent, multiline: boolean) L6
## mounts
mount src/lib/plugins/mods/ModDialogHost.svelte:126 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/mods/ModDialogHost.svelte:131 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/mods/ModDialogHost.svelte:132 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/mods/ModDialogHost.svelte:159 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/plugins/mods/ModDialogHost.svelte:170 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/mods/ModDialogHost.svelte:171 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/mods/ModDialogHost.svelte:199 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/mods/ModDialogHost.svelte:204 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/app/AppOverlays.svelte:23 ModDialogHost -> src/lib/plugins/mods/ModDialogHost.svelte
## calls
call src/lib/plugins/mods/ModDialogHost.svelte:37 in pickItems=$derived -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
call src/lib/plugins/mods/ModDialogHost.svelte:53 in handleOpenChange -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.dismiss mcall
call src/lib/plugins/mods/ModDialogHost.svelte:57 in focusInitial -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.markOpened mcall
call src/lib/plugins/mods/ModDialogHost.svelte:65 in handleEscape -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.dismiss mcall
call src/lib/plugins/mods/ModDialogHost.svelte:78 in handleConfirmKeydown -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.answer mcall
call src/lib/plugins/mods/ModDialogHost.svelte:86 in handlePromptKeydown -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.answer mcall
call src/lib/plugins/mods/ModDialogHost.svelte:92 in (markup) -> src/lib/plugins/mods/ModDialogHost.svelte:handleOpenChange markup
call src/lib/plugins/mods/ModDialogHost.svelte:96 in (markup) -> src/lib/plugins/mods/ModDialogHost.svelte:focusInitial markup
call src/lib/plugins/mods/ModDialogHost.svelte:97 in (markup) -> src/lib/plugins/mods/ModDialogHost.svelte:handleEscape markup
call src/lib/plugins/mods/ModDialogHost.svelte:97 in (markup) -> src/lib/plugins/mods/ModDialogHost.svelte:keepOpen markup +1
call src/lib/plugins/mods/ModDialogHost.svelte:99 in (markup) -> src/lib/plugins/mods/ModDialogHost.svelte:handleConfirmKeydown markup
call src/lib/plugins/mods/ModDialogHost.svelte:126 in (markup) -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.answer markup +3
call src/lib/plugins/mods/ModDialogHost.svelte:131 in (markup) -> src/lib/plugins/mods/mod-dialogs.store.svelte.ts:modDialogsStore.dismiss markup +3
call src/lib/plugins/mods/ModDialogHost.svelte:155 in (markup) -> src/lib/plugins/mods/ModDialogHost.svelte:handlePromptKeydown markup +1
## effects
fx src/lib/plugins/mods/ModDialogHost.svelte:46 svelte.$effect in (script)
