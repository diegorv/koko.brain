# file card src/lib/plugins/mods/ModActionPicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/ModActionPicker.svelte ' codemap/files
file src/lib/plugins/mods/ModActionPicker.svelte component L194 module src/lib/plugins/mods in1 t2
## imports
imp src/lib/plugins/mods/ModActionPicker.svelte:3 -> src/lib/components/ui/button/index.ts Button
imp src/lib/plugins/mods/ModActionPicker.svelte:4 -> src/lib/components/ui/command/index.ts *
imp src/lib/plugins/mods/ModActionPicker.svelte:5 -> src/lib/plugins/mods/mod-picker.store.svelte.ts modPickerStore,type:ModPickerAction
imp src/lib/plugins/mods/ModActionPicker.svelte:6 -> src/lib/plugins/mods/mods.logic.ts closesWhenDone
imp src/lib/plugins/mods/ModActionPicker.svelte:7 -> src/lib/plugins/mods/mods-runs.store.svelte.ts modsRunsStore,type:ModRunStatus
## imported-by
imp src/lib/app/AppOverlays.svelte:9 -> src/lib/plugins/mods/ModActionPicker.svelte default
## reach
in2 src/lib/plugins/mods/ModActionPicker.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/mods/ModActionPicker.svelte 13 files in 2 modules: src/lib/components(12) src/lib/plugins/mods(1)
## tests
test src/tests/lib/plugins/mods/ModActionPicker.test.ts imports src/lib/plugins/mods/ModActionPicker.svelte mirror
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports src/lib/plugins/mods/ModActionPicker.svelte
## symbols
sym src/lib/plugins/mods/ModActionPicker.svelte:1 component ModActionPicker L194
by src/lib/plugins/mods/ModActionPicker.svelte:default <- src/lib/app/AppOverlays.svelte:22 in (markup) mount
## locals
local src/lib/plugins/mods/ModActionPicker.svelte:54 fn handleLogScroll() L4
local src/lib/plugins/mods/ModActionPicker.svelte:64 fn handleRunKeydown(e: KeyboardEvent) L3
local src/lib/plugins/mods/ModActionPicker.svelte:68 fn handleOpenChange(open: boolean) L3
local src/lib/plugins/mods/ModActionPicker.svelte:73 fn pick(action: ModPickerAction) L7
local src/lib/plugins/mods/ModActionPicker.svelte:82 fn handleKeydown(e: KeyboardEvent) L7
local src/lib/plugins/mods/ModActionPicker.svelte:91 fn percent(done: number, total: number): number L3
## mounts
mount src/lib/plugins/mods/ModActionPicker.svelte:145 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/mods/ModActionPicker.svelte:147 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/app/AppOverlays.svelte:22 ModActionPicker -> src/lib/plugins/mods/ModActionPicker.svelte
## calls
call src/lib/plugins/mods/ModActionPicker.svelte:27 in run=$derived -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.runFor mcall
call src/lib/plugins/mods/ModActionPicker.svelte:51 in $effect@50 -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.close mcall
call src/lib/plugins/mods/ModActionPicker.svelte:51 in $effect@50 -> src/lib/plugins/mods/mods.logic.ts:closesWhenDone call
call src/lib/plugins/mods/ModActionPicker.svelte:69 in handleOpenChange -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.close mcall
call src/lib/plugins/mods/ModActionPicker.svelte:75 in pick -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.askInput mcall
call src/lib/plugins/mods/ModActionPicker.svelte:98 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:handleOpenChange markup
call src/lib/plugins/mods/ModActionPicker.svelte:104 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:handleRunKeydown markup
call src/lib/plugins/mods/ModActionPicker.svelte:118 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:percent markup
call src/lib/plugins/mods/ModActionPicker.svelte:124 in (markup) -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.isReloadPending markup
call src/lib/plugins/mods/ModActionPicker.svelte:128 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:handleLogScroll markup
call src/lib/plugins/mods/ModActionPicker.svelte:147 in (markup) -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.close markup
call src/lib/plugins/mods/ModActionPicker.svelte:157 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:handleKeydown markup
call src/lib/plugins/mods/ModActionPicker.svelte:175 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:pick markup
## effects
fx src/lib/plugins/mods/ModActionPicker.svelte:21 svelte.$effect in (script)
fx src/lib/plugins/mods/ModActionPicker.svelte:39 svelte.$effect in (script)
fx src/lib/plugins/mods/ModActionPicker.svelte:44 svelte.$effect in (script)
fx src/lib/plugins/mods/ModActionPicker.svelte:50 svelte.$effect in (script)
