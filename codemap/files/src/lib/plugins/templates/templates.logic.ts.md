# file card src/lib/plugins/templates/templates.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/templates/templates.logic.ts ' codemap/files
file src/lib/plugins/templates/templates.logic.ts logic L32 module src/lib/plugins/templates in3 t1
## imported-by
imp src/lib/plugins/templates/TemplatePicker.svelte:6 -> src/lib/plugins/templates/templates.logic.ts filterTemplates
imp src/lib/plugins/templates/templates.service.ts:9 -> src/lib/plugins/templates/templates.logic.ts buildTemplatesFolderPath,extractTitleFromPath,type:TemplateEntry
imp src/lib/plugins/templates/templates.store.svelte.ts:1 -> src/lib/plugins/templates/templates.logic.ts type:TemplateEntry
## reach
in2 src/lib/plugins/templates/templates.logic.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/plugins/templates/templates.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/templates/templates.logic.test.ts imports src/lib/plugins/templates/templates.logic.ts mirror
## symbols
sym src/lib/plugins/templates/templates.logic.ts:2 interface TemplateEntry L6 | A template file entry loaded from the _templates/ folder
by src/lib/plugins/templates/templates.logic.ts:TemplateEntry <- src/lib/plugins/templates/templates.service.ts:12 in (module) import
by src/lib/plugins/templates/templates.logic.ts:TemplateEntry <- src/lib/plugins/templates/templates.store.svelte.ts:1 in (module) import
sym src/lib/plugins/templates/templates.logic.ts:12 fn extractTitleFromPath(filePath: string): string L5 | Extracts the title (filename without extension) from an absolute file path.
by src/lib/plugins/templates/templates.logic.ts:extractTitleFromPath <- src/lib/plugins/templates/templates.service.ts:60 in createFileFromTemplate call
sym src/lib/plugins/templates/templates.logic.ts:21 fn buildTemplatesFolderPath(vaultPath: string, templatesFolder: string): string L3 | Builds the absolute path to the templates folder inside a vault.
by src/lib/plugins/templates/templates.logic.ts:buildTemplatesFolderPath <- src/lib/plugins/templates/templates.service.ts:24 in loadTemplates call +1
sym src/lib/plugins/templates/templates.logic.ts:28 fn filterTemplates(query: string, templates: TemplateEntry[]): TemplateEntry[] L5 | Filters template entries by a search query using case-insensitive substring matching.
by src/lib/plugins/templates/templates.logic.ts:filterTemplates <- src/lib/plugins/templates/TemplatePicker.svelte:15 in filteredTemplates=$derived call
