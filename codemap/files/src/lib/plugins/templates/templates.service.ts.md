# file card src/lib/plugins/templates/templates.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/templates/templates.service.ts ' codemap/files
file src/lib/plugins/templates/templates.service.ts service L136 module src/lib/plugins/templates in3 t5
## imports
imp src/lib/plugins/templates/templates.service.ts:1 -> pkg:@tauri-apps/plugin-fs readDir,exists,writeTextFile
imp src/lib/plugins/templates/templates.service.ts:2 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/templates/templates.service.ts:3 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/templates/templates.service.ts:4 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/plugins/templates/templates.service.ts:5 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/templates/templates.service.ts:6 -> src/lib/core/note-creator/explicit-organization.logic.ts withUnorganizedFlag
imp src/lib/plugins/templates/templates.service.ts:7 -> src/lib/plugins/templates/templates.store.svelte.ts templatesStore
imp src/lib/plugins/templates/templates.service.ts:8 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/templates/templates.service.ts:9 -> src/lib/plugins/templates/templates.logic.ts buildTemplatesFolderPath,extractTitleFromPath,type:TemplateEntry
imp src/lib/plugins/templates/templates.service.ts:14 -> src/lib/utils/debug.ts error
## imported-by
imp src/lib/app/commands.ts:28 -> src/lib/plugins/templates/templates.service.ts openTemplatePicker
imp src/lib/app/lifecycle/app-lifecycle.service.ts:44 -> src/lib/plugins/templates/templates.service.ts resetTemplates,ensureTemplatesFolder
imp src/lib/plugins/templates/TemplatePicker.svelte:5 -> src/lib/plugins/templates/templates.service.ts createFileFromTemplate
## reach
in2 src/lib/plugins/templates/templates.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/plugins/templates/templates.service.ts 17 files in 7 modules: src/lib/core/filesystem(5) src/lib/core/settings(4) src/lib/contracts(2) src/lib/core/editor(2) src/lib/utils(2) +2 modules
## tests
test src/tests/lib/plugins/templates/templates.service.test.ts imports src/lib/plugins/templates/templates.service.ts mirror
test src/tests/lib/app/commands.test.ts mocks src/lib/plugins/templates/templates.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/plugins/templates/templates.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/plugins/templates/templates.service.ts
test src/tests/lib/plugins/templates/TemplatePicker.test.ts mocks src/lib/plugins/templates/templates.service.ts
## symbols
sym src/lib/plugins/templates/templates.service.ts:20 fn loadTemplates(): Promise<void> L29 | Scans the _templates/ folder in the vault and populates the templates store.
sym src/lib/plugins/templates/templates.service.ts:55 fn createFileFromTemplate(templatePath: string, fileName: string): Promise<void> L15 | Creates a new file from a template.
by src/lib/plugins/templates/templates.service.ts:createFileFromTemplate <- src/lib/plugins/templates/TemplatePicker.svelte:41 in confirmCreate call
sym src/lib/plugins/templates/templates.service.ts:75 fn ensureTemplatesFolder(): Promise<void> L51 | Ensures the _templates/ folder and default template files exist.
by src/lib/plugins/templates/templates.service.ts:ensureTemplatesFolder <- src/lib/app/lifecycle/app-lifecycle.service.ts:407 in initializeVault call
sym src/lib/plugins/templates/templates.service.ts:128 fn openTemplatePicker(): Promise<void> L4 | Opens the template picker dialog, loading templates first
by src/lib/plugins/templates/templates.service.ts:openTemplatePicker <- src/lib/app/commands.ts:375 in getBuiltInCommands call
sym src/lib/plugins/templates/templates.service.ts:134 fn resetTemplates(): void L3 | Resets template plugin state
by src/lib/plugins/templates/templates.service.ts:resetTemplates <- src/lib/app/lifecycle/app-lifecycle.service.ts:669 in teardownVault call
## calls
call src/lib/plugins/templates/templates.service.ts:24 in loadTemplates -> src/lib/plugins/templates/templates.logic.ts:buildTemplatesFolderPath call
call src/lib/plugins/templates/templates.service.ts:29 in loadTemplates -> src/lib/plugins/templates/templates.store.svelte.ts:templatesStore.setTemplates mcall +2
call src/lib/plugins/templates/templates.service.ts:45 in loadTemplates -> src/lib/utils/debug.ts:error call
call src/lib/plugins/templates/templates.service.ts:60 in createFileFromTemplate -> src/lib/plugins/templates/templates.logic.ts:extractTitleFromPath call
call src/lib/plugins/templates/templates.service.ts:63 in createFileFromTemplate -> src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote call
call src/lib/plugins/templates/templates.service.ts:67 in createFileFromTemplate -> src/lib/core/note-creator/explicit-organization.logic.ts:withUnorganizedFlag ref
call src/lib/plugins/templates/templates.service.ts:79 in ensureTemplatesFolder -> src/lib/plugins/templates/templates.logic.ts:buildTemplatesFolderPath call
call src/lib/plugins/templates/templates.service.ts:107 in ensureTemplatesFolder -> src/lib/contracts/ipc.ts:call call
call src/lib/plugins/templates/templates.service.ts:110 in ensureTemplatesFolder -> src/lib/core/filesystem/fs.service.ts:addToTree call +1
call src/lib/plugins/templates/templates.service.ts:123 in ensureTemplatesFolder -> src/lib/utils/debug.ts:error call
call src/lib/plugins/templates/templates.service.ts:129 in openTemplatePicker -> src/lib/plugins/templates/templates.service.ts:loadTemplates call
call src/lib/plugins/templates/templates.service.ts:130 in openTemplatePicker -> src/lib/plugins/templates/templates.store.svelte.ts:templatesStore.open mcall
call src/lib/plugins/templates/templates.service.ts:135 in resetTemplates -> src/lib/plugins/templates/templates.store.svelte.ts:templatesStore.reset mcall
## effects
fx src/lib/plugins/templates/templates.service.ts:27 tauri-fs.exists in loadTemplates
fx src/lib/plugins/templates/templates.service.ts:33 tauri-fs.readDir in loadTemplates
fx src/lib/plugins/templates/templates.service.ts:101 tauri-fs.exists in ensureTemplatesFolder
ipc-call src/lib/plugins/templates/templates.service.ts:107 in ensureTemplatesFolder -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
fx src/lib/plugins/templates/templates.service.ts:113 tauri-fs.exists in ensureTemplatesFolder
fx src/lib/plugins/templates/templates.service.ts:118 tauri-fs.writeTextFile in ensureTemplatesFolder
