# file card src/lib/plugins/templates/templates.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/templates/templates.store.svelte.ts ' codemap/files
file src/lib/plugins/templates/templates.store.svelte.ts store L28 module src/lib/plugins/templates in2 t3
## imports
imp src/lib/plugins/templates/templates.store.svelte.ts:1 -> src/lib/plugins/templates/templates.logic.ts type:TemplateEntry
## imported-by
imp src/lib/plugins/templates/TemplatePicker.svelte:4 -> src/lib/plugins/templates/templates.store.svelte.ts templatesStore
imp src/lib/plugins/templates/templates.service.ts:7 -> src/lib/plugins/templates/templates.store.svelte.ts templatesStore
## reach
in2 src/lib/plugins/templates/templates.store.svelte.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/plugins/templates/templates.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/templates/templates.store.test.ts imports src/lib/plugins/templates/templates.store.svelte.ts mirror
test src/tests/lib/plugins/templates/TemplatePicker.test.ts imports src/lib/plugins/templates/templates.store.svelte.ts
test src/tests/lib/plugins/templates/templates.service.test.ts imports src/lib/plugins/templates/templates.store.svelte.ts
## symbols
sym src/lib/plugins/templates/templates.store.svelte.ts:9 store templatesStore L20 | Reactive store for the templates plugin
by src/lib/plugins/templates/templates.store.svelte.ts:templatesStore <- src/lib/plugins/templates/TemplatePicker.svelte:15 in filteredTemplates=$derived member +2
by src/lib/plugins/templates/templates.store.svelte.ts:templatesStore <- src/lib/plugins/templates/templates.service.ts:29 in loadTemplates mcall +4
## store
store src/lib/plugins/templates/templates.store.svelte.ts:9 templatesStore esc:0
mem src/lib/plugins/templates/templates.store.svelte.ts:10 get templatesStore.isOpen r:src/lib/plugins/templates/TemplatePicker.svelte:66 w-via:open,close,toggle,reset
mem src/lib/plugins/templates/templates.store.svelte.ts:11 get templatesStore.templates r:src/lib/plugins/templates/TemplatePicker.svelte:15 w-via:setTemplates,reset
mem src/lib/plugins/templates/templates.store.svelte.ts:14 do templatesStore.open w:src/lib/plugins/templates/templates.service.ts:130 | Opens the template picker dialog
mem src/lib/plugins/templates/templates.store.svelte.ts:16 do templatesStore.close w:src/lib/plugins/templates/TemplatePicker.svelte:58 | Closes the template picker dialog
mem src/lib/plugins/templates/templates.store.svelte.ts:18 do templatesStore.toggle w:- | Toggles the template picker dialog
mem src/lib/plugins/templates/templates.store.svelte.ts:21 do templatesStore.setTemplates w:src/lib/plugins/templates/templates.service.ts:29,src/lib/plugins/templates/templates.service.ts:43,src/lib/plugins/templates/templates.service.ts:46 | Replaces the full list of available templates
mem src/lib/plugins/templates/templates.store.svelte.ts:24 do templatesStore.reset w:src/lib/plugins/templates/templates.service.ts:135 | Resets all state (e.g. when switching vaults)
