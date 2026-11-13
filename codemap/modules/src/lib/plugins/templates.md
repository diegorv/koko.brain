# module card src/lib/plugins/templates
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/templates ' codemap/modules
module src/lib/plugins/templates plugins files 4 in-modules 1 out-modules 7 pub 4/11 ipc 1/0 card ~0.8k
## neighbors
dep src/lib/app -> src/lib/plugins/templates 3
dep src/lib/plugins/templates -> src/lib/components 1
dep src/lib/plugins/templates -> src/lib/contracts 1
dep src/lib/plugins/templates -> src/lib/core/filesystem 1
dep src/lib/plugins/templates -> src/lib/core/note-creator 2
dep src/lib/plugins/templates -> src/lib/core/settings 1
dep src/lib/plugins/templates -> src/lib/core/vault 1
dep src/lib/plugins/templates -> src/lib/utils 1
in2 src/lib/plugins/templates 1 modules: src/routes(2)
out2 src/lib/plugins/templates 2 modules: src/lib/core/editor(3) src/lib/core/trash(1)
## entry files
entry src/lib/plugins/templates/templates.service.ts ext-in2 src/lib/app/commands.ts src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/plugins/templates/TemplatePicker.svelte ext-in1 src/lib/app/AppOverlays.svelte
## files
file src/lib/plugins/templates/TemplatePicker.svelte component L113 module src/lib/plugins/templates in1 t1
file src/lib/plugins/templates/templates.logic.ts logic L32 module src/lib/plugins/templates in3 t1
file src/lib/plugins/templates/templates.service.ts service L136 module src/lib/plugins/templates in3 t5
file src/lib/plugins/templates/templates.store.svelte.ts store L28 module src/lib/plugins/templates in2 t3
## public
sym src/lib/plugins/templates/TemplatePicker.svelte:1 component TemplatePicker L113
sym src/lib/plugins/templates/templates.service.ts:75 fn ensureTemplatesFolder(): Promise<void> L51 | Ensures the _templates/ folder and default template files exist.
sym src/lib/plugins/templates/templates.service.ts:128 fn openTemplatePicker(): Promise<void> L4 | Opens the template picker dialog, loading templates first
sym src/lib/plugins/templates/templates.service.ts:134 fn resetTemplates(): void L3 | Resets template plugin state
## stores
store src/lib/plugins/templates/templates.store.svelte.ts:9 templatesStore esc:0
## effects
fx-count tauri-fs.exists 3
fx-count tauri-fs.readDir 1
fx-count tauri-fs.writeTextFile 1
ipc-count ipc:create_folder 1
## debt
-
