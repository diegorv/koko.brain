# file card src/lib/plugins/templates/templates.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/templates/templates.logic.ts ' codemap/files
file src/lib/plugins/templates/templates.logic.ts logic L70 module src/lib/plugins/templates in3 t1
## imports
imp src/lib/plugins/templates/templates.logic.ts:1 -> src/lib/core/filesystem/fs.types.ts type:FileTreeNode
## imported-by
imp src/lib/plugins/templates/TemplatePicker.svelte:8 -> src/lib/plugins/templates/templates.logic.ts filterTemplates,noteExistsInTree,withMdExtension
imp src/lib/plugins/templates/templates.service.ts:9 -> src/lib/plugins/templates/templates.logic.ts buildTemplatesFolderPath,extractTitleFromPath,type:TemplateEntry
imp src/lib/plugins/templates/templates.store.svelte.ts:1 -> src/lib/plugins/templates/templates.logic.ts type:TemplateEntry
## reach
in2 src/lib/plugins/templates/templates.logic.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/plugins/templates/templates.logic.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/plugins/templates/templates.logic.test.ts imports src/lib/plugins/templates/templates.logic.ts mirror
## symbols
sym src/lib/plugins/templates/templates.logic.ts:4 interface TemplateEntry L6 | A template file entry loaded from the _templates/ folder
by src/lib/plugins/templates/templates.logic.ts:TemplateEntry <- src/lib/plugins/templates/templates.service.ts:12 in (module) import
by src/lib/plugins/templates/templates.logic.ts:TemplateEntry <- src/lib/plugins/templates/templates.store.svelte.ts:1 in (module) import
sym src/lib/plugins/templates/templates.logic.ts:14 fn extractTitleFromPath(filePath: string): string L5 | Extracts the title (filename without extension) from an absolute file path.
by src/lib/plugins/templates/templates.logic.ts:extractTitleFromPath <- src/lib/plugins/templates/templates.service.ts:60 in createFileFromTemplate call
sym src/lib/plugins/templates/templates.logic.ts:23 fn buildTemplatesFolderPath(vaultPath: string, templatesFolder: string): string L3 | Builds the absolute path to the templates folder inside a vault.
by src/lib/plugins/templates/templates.logic.ts:buildTemplatesFolderPath <- src/lib/plugins/templates/templates.service.ts:24 in loadTemplates call +1
sym src/lib/plugins/templates/templates.logic.ts:30 fn filterTemplates(query: string, templates: TemplateEntry[]): TemplateEntry[] L5 | Filters template entries by a search query using case-insensitive substring matching.
by src/lib/plugins/templates/templates.logic.ts:filterTemplates <- src/lib/plugins/templates/TemplatePicker.svelte:17 in filteredTemplates=$derived call
sym src/lib/plugins/templates/templates.logic.ts:40 fn withMdExtension(name: string): string L3 | The file name `createFileFromTemplate` writes for a typed name: `.md` is appended unless the name already ends with it (case-sensitive, like the service).
by src/lib/plugins/templates/templates.logic.ts:withMdExtension <- src/lib/plugins/templates/TemplatePicker.svelte:29 in targetFileName=$derived call
sym src/lib/plugins/templates/templates.logic.ts:51 fn noteExistsInTree(tree: FileTreeNode[], vaultPath: string, name: string): boolean L15 | Whether the note a typed name resolves to (`<vaultPath>/<name>.md`) is a file in the tree.
by src/lib/plugins/templates/templates.logic.ts:noteExistsInTree <- src/lib/plugins/templates/TemplatePicker.svelte:34 in targetExists=$derived call
## locals
local src/lib/plugins/templates/templates.logic.ts:68 fn foldPath(path: string): string L3
## calls
call src/lib/plugins/templates/templates.logic.ts:52 in noteExistsInTree -> src/lib/plugins/templates/templates.logic.ts:withMdExtension call
call src/lib/plugins/templates/templates.logic.ts:57 in noteExistsInTree -> src/lib/plugins/templates/templates.logic.ts:foldPath call +1
