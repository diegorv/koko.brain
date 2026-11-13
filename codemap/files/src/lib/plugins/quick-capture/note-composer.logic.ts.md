# file card src/lib/plugins/quick-capture/note-composer.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/quick-capture/note-composer.logic.ts ' codemap/files
file src/lib/plugins/quick-capture/note-composer.logic.ts logic L133 module src/lib/plugins/quick-capture in2 t5
## imports
imp src/lib/plugins/quick-capture/note-composer.logic.ts:2 -> src/lib/core/frontmatter/properties.logic.ts yamlScalar
imp src/lib/plugins/quick-capture/note-composer.logic.ts:3 -> src/lib/core/settings/settings.types.ts type:PeriodicNotesSettings
imp src/lib/plugins/quick-capture/note-composer.logic.ts:4 -> src/lib/utils/capture-path.ts buildCaptureFolder
imp src/lib/plugins/quick-capture/note-composer.logic.ts:5 -> src/lib/utils/template.ts processTemplate
imp src/lib/plugins/quick-capture/note-composer.logic.ts:6 -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts buildWikilinkPath
## imported-by
imp src/lib/app/deep-link-actions.ts:25 -> src/lib/plugins/quick-capture/note-composer.logic.ts buildCapturePath,buildCaptureVariables,getCaptureTitle,processCaptureTemplate
imp src/lib/plugins/quick-capture/note-composer.service.ts:6 -> src/lib/plugins/quick-capture/note-composer.logic.ts buildCapturePath,getCaptureTitle,buildCaptureVariables
## reach
in2 src/lib/plugins/quick-capture/note-composer.logic.ts 3 files in 1 modules: src/lib/app(3)
out2 src/lib/plugins/quick-capture/note-composer.logic.ts 5 files in 3 modules: src/lib/core/settings(2) src/lib/utils(2) src/lib/core/frontmatter(1)
## tests
test src/tests/lib/plugins/quick-capture/note-composer.logic.test.ts imports src/lib/plugins/quick-capture/note-composer.logic.ts mirror
test src/tests/lib/features/rail-shell/lens.logic.test.ts imports src/lib/plugins/quick-capture/note-composer.logic.ts
test src/tests/lib/plugins/calendar/day-lens.logic.test.ts imports src/lib/plugins/quick-capture/note-composer.logic.ts
test src/tests/lib/plugins/quick-capture/note-composer.service.test.ts imports src/lib/plugins/quick-capture/note-composer.logic.ts
test src/tests/lib/utils/capture-path.test.ts imports src/lib/plugins/quick-capture/note-composer.logic.ts
## symbols
sym src/lib/plugins/quick-capture/note-composer.logic.ts:12 fn buildCapturePath(vaultPath: string, baseFolder: string, folderFormat: string, filenameFormat: string, date: dayjs.Dayjs): string L9 | Builds the full absolute path for a quick note.
by src/lib/plugins/quick-capture/note-composer.logic.ts:buildCapturePath <- src/lib/app/deep-link-actions.ts:150 in executeCaptureAction call
by src/lib/plugins/quick-capture/note-composer.logic.ts:buildCapturePath <- src/lib/plugins/quick-capture/note-composer.service.ts:28 in createNoteComposer call
sym src/lib/plugins/quick-capture/note-composer.logic.ts:25 fn getCaptureTitle(filenameFormat: string, date: dayjs.Dayjs): string L3 | Extracts the title for template processing (tp.file.title).
by src/lib/plugins/quick-capture/note-composer.logic.ts:getCaptureTitle <- src/lib/app/deep-link-actions.ts:172 in executeCaptureAction call
by src/lib/plugins/quick-capture/note-composer.logic.ts:getCaptureTitle <- src/lib/plugins/quick-capture/note-composer.service.ts:36 in createNoteComposer call
sym src/lib/plugins/quick-capture/note-composer.logic.ts:49 fn buildCaptureVariables(date: dayjs.Dayjs, periodicNotesSettings: PeriodicNotesSettings, title = '', kind = 'note'): Record<string, string> L37 | Builds custom template variables for a quick note.
by src/lib/plugins/quick-capture/note-composer.logic.ts:buildCaptureVariables <- src/lib/app/deep-link-actions.ts:173 in executeCaptureAction call
by src/lib/plugins/quick-capture/note-composer.logic.ts:buildCaptureVariables <- src/lib/plugins/quick-capture/note-composer.service.ts:42 in createNoteComposer call
sym src/lib/plugins/quick-capture/note-composer.logic.ts:122 fn processCaptureTemplate(template: string, fileTitle: string, vars: Record<string, string>): string L12 | `processTemplate` for a Quick Capture template, with the capture text variables made YAML-safe inside the template's frontmatter block: a placeholder that is t…
by src/lib/plugins/quick-capture/note-composer.logic.ts:processCaptureTemplate <- src/lib/app/deep-link-actions.ts:193 in executeCaptureAction call
## calls
call src/lib/plugins/quick-capture/note-composer.logic.ts:19 in buildCapturePath -> src/lib/utils/capture-path.ts:buildCaptureFolder call
call src/lib/plugins/quick-capture/note-composer.logic.ts:75 in buildCaptureVariables -> src/lib/plugins/periodic-notes/periodic-notes.logic.ts:buildWikilinkPath call
call src/lib/plugins/quick-capture/note-composer.logic.ts:124 in processCaptureTemplate -> src/lib/utils/template.ts:processTemplate call +1
call src/lib/plugins/quick-capture/note-composer.logic.ts:129 in processCaptureTemplate -> src/lib/core/frontmatter/properties.logic.ts:yamlScalar call
