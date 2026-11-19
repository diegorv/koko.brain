# file card src/lib/plugins/templates/TemplatePicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/templates/TemplatePicker.svelte ' codemap/files
file src/lib/plugins/templates/TemplatePicker.svelte component L147 module src/lib/plugins/templates in1 t1
## imports
imp src/lib/plugins/templates/TemplatePicker.svelte:2 -> src/lib/components/ui/command/index.ts *
imp src/lib/plugins/templates/TemplatePicker.svelte:3 -> src/lib/core/filesystem/fs.store.svelte.ts fsStore
imp src/lib/plugins/templates/TemplatePicker.svelte:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/templates/TemplatePicker.svelte:6 -> src/lib/plugins/templates/templates.store.svelte.ts templatesStore
imp src/lib/plugins/templates/TemplatePicker.svelte:7 -> src/lib/plugins/templates/templates.service.ts createFileFromTemplate
imp src/lib/plugins/templates/TemplatePicker.svelte:8 -> src/lib/plugins/templates/templates.logic.ts filterTemplates,nameLeavesVault,noteExistsInTree,withMdExtension
## imported-by
imp src/lib/app/AppOverlays.svelte:8 -> src/lib/plugins/templates/TemplatePicker.svelte default
## reach
in2 src/lib/plugins/templates/TemplatePicker.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/plugins/templates/TemplatePicker.svelte 20 files in 7 modules: src/lib/components(11) src/lib/core/filesystem(2) src/lib/core/note-creator(2) src/lib/utils(2) src/lib/contracts(1) +2 modules
## tests
test src/tests/lib/plugins/templates/TemplatePicker.test.ts imports src/lib/plugins/templates/TemplatePicker.svelte mirror
## symbols
sym src/lib/plugins/templates/TemplatePicker.svelte:1 component TemplatePicker L147
by src/lib/plugins/templates/TemplatePicker.svelte:default <- src/lib/app/AppOverlays.svelte:38 in (markup) mount
## locals
local src/lib/plugins/templates/TemplatePicker.svelte:40 fn handleOpenChange(open: boolean) L5
local src/lib/plugins/templates/TemplatePicker.svelte:46 fn selectTemplate(path: string) L5
local src/lib/plugins/templates/TemplatePicker.svelte:52 fn confirmCreate() L14
local src/lib/plugins/templates/TemplatePicker.svelte:67 fn handleKeydown(e: KeyboardEvent) L13
local src/lib/plugins/templates/TemplatePicker.svelte:81 fn reset() L6
## mounted-at
mount src/lib/app/AppOverlays.svelte:38 TemplatePicker -> src/lib/plugins/templates/TemplatePicker.svelte
## calls
call src/lib/plugins/templates/TemplatePicker.svelte:17 in filteredTemplates=$derived -> src/lib/plugins/templates/templates.logic.ts:filterTemplates call
call src/lib/plugins/templates/TemplatePicker.svelte:29 in targetFileName=$derived -> src/lib/plugins/templates/templates.logic.ts:withMdExtension call
call src/lib/plugins/templates/TemplatePicker.svelte:32 in leavesVault=$derived -> src/lib/plugins/templates/templates.logic.ts:nameLeavesVault call
call src/lib/plugins/templates/TemplatePicker.svelte:37 in targetExists=$derived -> src/lib/plugins/templates/templates.logic.ts:noteExistsInTree call
call src/lib/plugins/templates/TemplatePicker.svelte:42 in handleOpenChange -> src/lib/plugins/templates/TemplatePicker.svelte:reset call
call src/lib/plugins/templates/TemplatePicker.svelte:58 in confirmCreate -> src/lib/plugins/templates/TemplatePicker.svelte:reset call
call src/lib/plugins/templates/TemplatePicker.svelte:60 in confirmCreate -> src/lib/plugins/templates/templates.service.ts:createFileFromTemplate call
call src/lib/plugins/templates/TemplatePicker.svelte:71 in handleKeydown -> src/lib/plugins/templates/TemplatePicker.svelte:confirmCreate call
call src/lib/plugins/templates/TemplatePicker.svelte:82 in reset -> src/lib/plugins/templates/templates.store.svelte.ts:templatesStore.close mcall
call src/lib/plugins/templates/TemplatePicker.svelte:91 in (markup) -> src/lib/plugins/templates/TemplatePicker.svelte:handleOpenChange markup
call src/lib/plugins/templates/TemplatePicker.svelte:107 in (markup) -> src/lib/plugins/templates/TemplatePicker.svelte:handleKeydown markup
call src/lib/plugins/templates/TemplatePicker.svelte:133 in (markup) -> src/lib/plugins/templates/TemplatePicker.svelte:selectTemplate markup
