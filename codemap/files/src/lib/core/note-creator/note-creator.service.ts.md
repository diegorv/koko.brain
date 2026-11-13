# file card src/lib/core/note-creator/note-creator.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/note-creator/note-creator.service.ts ' codemap/files
file src/lib/core/note-creator/note-creator.service.ts service L136 module src/lib/core/note-creator in9 t15
## imports
imp src/lib/core/note-creator/note-creator.service.ts:2 -> pkg:@tauri-apps/plugin-fs exists,readTextFile
imp src/lib/core/note-creator/note-creator.service.ts:3 -> src/lib/contracts/ipc.ts call
imp src/lib/core/note-creator/note-creator.service.ts:4 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/core/note-creator/note-creator.service.ts:5 -> src/lib/core/editor/editor.hooks.ts markRecentSave,notifyNoteCreated
imp src/lib/core/note-creator/note-creator.service.ts:6 -> src/lib/core/filesystem/fs.logic.ts isMarkdownFile
imp src/lib/core/note-creator/note-creator.service.ts:7 -> src/lib/core/filesystem/fs.service.ts addToTree
imp src/lib/core/note-creator/note-creator.service.ts:8 -> src/lib/core/filesystem/note-change.service.ts applyNoteChange
imp src/lib/core/note-creator/note-creator.service.ts:9 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/core/note-creator/note-creator.service.ts:10 -> src/lib/utils/template.ts processTemplate
imp src/lib/core/note-creator/note-creator.service.ts:11 -> src/lib/utils/debug.ts error
imp src/lib/core/note-creator/note-creator.service.ts:12 -> src/lib/utils/log.service.ts appendLog
## imported-by
imp src/lib/app/editor-host.ts:21 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/features/auto-organize/auto-organize.service.ts:7 -> src/lib/core/note-creator/note-creator.service.ts loadNoteTemplate
imp src/lib/features/deep-link/deep-link.service.ts:9 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/features/type-definitions/type-definitions.service.ts:10 -> src/lib/core/note-creator/note-creator.service.ts loadNoteTemplate,openOrCreateNote
imp src/lib/plugins/mods/mod-app.service.ts:5 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/one-on-one/one-on-one.service.ts:6 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/periodic-notes/periodic-notes.service.ts:5 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/quick-capture/note-composer.service.ts:4 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
imp src/lib/plugins/templates/templates.service.ts:5 -> src/lib/core/note-creator/note-creator.service.ts openOrCreateNote
## reach
in2 src/lib/core/note-creator/note-creator.service.ts 22 files in 13 modules: src/lib/app(6) src/lib/features/rail-shell(3) src/lib/features/event-calendar(2) src/lib/plugins/one-on-one(2) src/lib/features/auto-organize(1) +8 modules: q impact src/lib/core/note-creator/note-creator.service.ts --depth 2
out2 src/lib/core/note-creator/note-creator.service.ts 17 files in 8 modules: src/lib/utils(4) src/lib/core/editor(3) src/lib/core/filesystem(3) src/lib/contracts(2) src/lib/core/settings(2) +3 modules
## tests
test src/tests/lib/core/note-creator/note-creator.service.test.ts imports src/lib/core/note-creator/note-creator.service.ts mirror
test src/tests/lib/core/note-creator/note-creator.tree.test.ts imports src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/mods/mod-app.service.test.ts imports src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/mods/mod-note-created.test.ts imports src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/app/editor-host.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/features/deep-link/deep-link.service.race-audit.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/features/type-definitions/type-definitions.service.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/calendar/CalendarNavigator.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/calendar/calendar-rail.service.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/calendar/calendar.service.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/one-on-one/one-on-one.service.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/periodic-notes/periodic-notes.service.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/quick-capture/note-composer.service.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
test src/tests/lib/plugins/templates/templates.service.test.ts mocks src/lib/core/note-creator/note-creator.service.ts
## symbols
sym src/lib/core/note-creator/note-creator.service.ts:15 interface NoteCreationOptions L25 | Options for creating or opening a note from a template
sym src/lib/core/note-creator/note-creator.service.ts:42 type NoteTemplateOptions L1 | Template inputs of NoteCreationOptions, without the target path.
sym src/lib/core/note-creator/note-creator.service.ts:49 fn loadNoteTemplate(options: NoteTemplateOptions): Promise<string> L16 | Loads a note's initial content: reads `templatePath` (falling back to `inlineTemplate` when the read fails), or uses `inlineTemplate` alone, then expands its `…
by src/lib/core/note-creator/note-creator.service.ts:loadNoteTemplate <- src/lib/features/auto-organize/auto-organize.service.ts:598 in createRuleNote call
by src/lib/core/note-creator/note-creator.service.ts:loadNoteTemplate <- src/lib/features/type-definitions/type-definitions.service.ts:139 in createTypedNote call
sym src/lib/core/note-creator/note-creator.service.ts:79 fn openOrCreateNote(options: NoteCreationOptions): Promise<void> L58 | Opens a note if it exists, or creates it from a template and opens it.
by src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote <- src/lib/app/editor-host.ts:161 in appEditorHost.createNote call
by src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote <- src/lib/features/deep-link/deep-link.service.ts:340 in executeNewAction call
by src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote <- src/lib/features/type-definitions/type-definitions.service.ts:88 in createNoteOfType call
by src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote <- src/lib/plugins/mods/mod-app.service.ts:63 in MOD_APP ref
by src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote <- src/lib/plugins/one-on-one/one-on-one.service.ts:90 in createOneOnOneNote call
by src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote <- src/lib/plugins/periodic-notes/periodic-notes.service.ts:53 in openOrCreatePeriodicNoteForDate call
by src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote <- src/lib/plugins/quick-capture/note-composer.service.ts:47 in createNoteComposer call
by src/lib/core/note-creator/note-creator.service.ts:openOrCreateNote <- src/lib/plugins/templates/templates.service.ts:63 in createFileFromTemplate call
## calls
call src/lib/core/note-creator/note-creator.service.ts:63 in loadNoteTemplate -> src/lib/utils/template.ts:processTemplate call
call src/lib/core/note-creator/note-creator.service.ts:84 in openOrCreateNote -> src/lib/utils/log.service.ts:appendLog call +4
call src/lib/core/note-creator/note-creator.service.ts:99 in openOrCreateNote -> src/lib/contracts/ipc.ts:call call +1
call src/lib/core/note-creator/note-creator.service.ts:101 in openOrCreateNote -> src/lib/core/note-creator/note-creator.service.ts:loadNoteTemplate call
call src/lib/core/note-creator/note-creator.service.ts:108 in openOrCreateNote -> src/lib/core/editor/editor.hooks.ts:markRecentSave call
call src/lib/core/note-creator/note-creator.service.ts:118 in openOrCreateNote -> src/lib/core/filesystem/fs.logic.ts:isMarkdownFile call
call src/lib/core/note-creator/note-creator.service.ts:119 in openOrCreateNote -> src/lib/core/filesystem/note-change.service.ts:applyNoteChange call
call src/lib/core/note-creator/note-creator.service.ts:122 in openOrCreateNote -> src/lib/core/filesystem/fs.service.ts:addToTree call
call src/lib/core/note-creator/note-creator.service.ts:127 in openOrCreateNote -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/core/note-creator/note-creator.service.ts:130 in openOrCreateNote -> src/lib/core/editor/editor.hooks.ts:notifyNoteCreated call
call src/lib/core/note-creator/note-creator.service.ts:133 in openOrCreateNote -> src/lib/utils/debug.ts:error call
## effects
fx src/lib/core/note-creator/note-creator.service.ts:55 tauri-fs.readTextFile in loadNoteTemplate
fx src/lib/core/note-creator/note-creator.service.ts:87 tauri-fs.exists in openOrCreateNote
ipc-call src/lib/core/note-creator/note-creator.service.ts:99 in openOrCreateNote -> ipc:create_folder -> src-tauri/src/commands/vault.rs:1179
ipc-call src/lib/core/note-creator/note-creator.service.ts:104 in openOrCreateNote -> ipc:create_note -> src-tauri/src/commands/vault.rs:1145
