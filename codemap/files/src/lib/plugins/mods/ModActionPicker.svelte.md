# file card src/lib/plugins/mods/ModActionPicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/mods/ModActionPicker.svelte ' codemap/files
file src/lib/plugins/mods/ModActionPicker.svelte component L202 module src/lib/plugins/mods in1 t2
## imports
imp src/lib/plugins/mods/ModActionPicker.svelte:3 -> src/lib/components/ui/button/index.ts Button
imp src/lib/plugins/mods/ModActionPicker.svelte:4 -> src/lib/components/ui/command/index.ts *
imp src/lib/plugins/mods/ModActionPicker.svelte:5 -> src/lib/plugins/mods/mod-picker.store.svelte.ts modPickerStore,type:ModPickerAction
imp src/lib/plugins/mods/ModActionPicker.svelte:6 -> src/lib/plugins/mods/mods.logic.ts closesWhenDone
imp src/lib/plugins/mods/ModActionPicker.svelte:7 -> src/lib/plugins/mods/mods-runs.store.svelte.ts modsRunsStore,type:ModRunStatus
## imported-by
imp src/lib/app/AppOverlays.svelte:10 -> src/lib/plugins/mods/ModActionPicker.svelte default
## reach
in2 src/lib/plugins/mods/ModActionPicker.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/mods/ModActionPicker.svelte 13 files in 2 modules: src/lib/components(12) src/lib/plugins/mods(1)
## tests
test src/tests/lib/plugins/mods/ModActionPicker.test.ts imports src/lib/plugins/mods/ModActionPicker.svelte mirror
test src/tests/lib/plugins/mods/ModDialogHost.test.ts imports src/lib/plugins/mods/ModActionPicker.svelte
## symbols
sym src/lib/plugins/mods/ModActionPicker.svelte:1 component ModActionPicker L202
by src/lib/plugins/mods/ModActionPicker.svelte:default <- src/lib/app/AppOverlays.svelte:23 in (markup) mount
## locals
local src/lib/plugins/mods/ModActionPicker.svelte:61 fn handleLogScroll() L4
local src/lib/plugins/mods/ModActionPicker.svelte:71 fn handleRunKeydown(e: KeyboardEvent) L3
local src/lib/plugins/mods/ModActionPicker.svelte:75 fn handleOpenChange(open: boolean) L3
local src/lib/plugins/mods/ModActionPicker.svelte:80 fn pick(action: ModPickerAction) L7
local src/lib/plugins/mods/ModActionPicker.svelte:89 fn handleKeydown(e: KeyboardEvent) L7
local src/lib/plugins/mods/ModActionPicker.svelte:98 fn percent(done: number, total: number): number L3
## mounts
mount src/lib/plugins/mods/ModActionPicker.svelte:153 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/plugins/mods/ModActionPicker.svelte:155 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/app/AppOverlays.svelte:23 ModActionPicker -> src/lib/plugins/mods/ModActionPicker.svelte
## calls
call src/lib/plugins/mods/ModActionPicker.svelte:34 in run=$derived -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.runFor mcall
call src/lib/plugins/mods/ModActionPicker.svelte:58 in $effect@57 -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.close mcall
call src/lib/plugins/mods/ModActionPicker.svelte:58 in $effect@57 -> src/lib/plugins/mods/mods.logic.ts:closesWhenDone call
call src/lib/plugins/mods/ModActionPicker.svelte:76 in handleOpenChange -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.close mcall
call src/lib/plugins/mods/ModActionPicker.svelte:82 in pick -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.askInput mcall
call src/lib/plugins/mods/ModActionPicker.svelte:105 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:handleOpenChange markup
call src/lib/plugins/mods/ModActionPicker.svelte:112 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:handleRunKeydown markup
call src/lib/plugins/mods/ModActionPicker.svelte:126 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:percent markup
call src/lib/plugins/mods/ModActionPicker.svelte:132 in (markup) -> src/lib/plugins/mods/mods-runs.store.svelte.ts:modsRunsStore.isReloadPending markup
call src/lib/plugins/mods/ModActionPicker.svelte:136 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:handleLogScroll markup
call src/lib/plugins/mods/ModActionPicker.svelte:155 in (markup) -> src/lib/plugins/mods/mod-picker.store.svelte.ts:modPickerStore.close markup
call src/lib/plugins/mods/ModActionPicker.svelte:165 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:handleKeydown markup
call src/lib/plugins/mods/ModActionPicker.svelte:183 in (markup) -> src/lib/plugins/mods/ModActionPicker.svelte:pick markup
## effects
fx src/lib/plugins/mods/ModActionPicker.svelte:28 svelte.$effect in (script)
fx src/lib/plugins/mods/ModActionPicker.svelte:46 svelte.$effect in (script)
fx src/lib/plugins/mods/ModActionPicker.svelte:51 svelte.$effect in (script)
fx src/lib/plugins/mods/ModActionPicker.svelte:57 svelte.$effect in (script)
