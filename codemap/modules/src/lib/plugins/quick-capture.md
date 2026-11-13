# module card src/lib/plugins/quick-capture
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/quick-capture ' codemap/modules
module src/lib/plugins/quick-capture plugins files 5 in-modules 2 out-modules 10 pub 10/15 ipc 3/0 card ~1.6k
## neighbors
dep src/lib/app -> src/lib/plugins/quick-capture 3
dep src/routes -> src/lib/plugins/quick-capture 3
dep src/lib/plugins/quick-capture -> src/lib/contracts 3
dep src/lib/plugins/quick-capture -> src/lib/core/filesystem 2
dep src/lib/plugins/quick-capture -> src/lib/core/frontmatter 1
dep src/lib/plugins/quick-capture -> src/lib/core/markdown-editor 5
dep src/lib/plugins/quick-capture -> src/lib/core/note-creator 2
dep src/lib/plugins/quick-capture -> src/lib/core/settings 2
dep src/lib/plugins/quick-capture -> src/lib/core/vault 2
dep src/lib/plugins/quick-capture -> src/lib/features/deep-link 2
dep src/lib/plugins/quick-capture -> src/lib/plugins/periodic-notes 1
dep src/lib/plugins/quick-capture -> src/lib/utils 3
in2 src/lib/plugins/quick-capture 0 modules: -
out2 src/lib/plugins/quick-capture 3 modules: src/lib/core/editor(4) src/lib/types(2) src/lib/features/search(1)
## entry files
entry src/lib/plugins/quick-capture/note-composer.service.ts ext-in2 src/lib/app/commands.ts src/lib/app/global-keybindings.ts
entry src/lib/plugins/quick-capture/composer-editor-host.service.ts ext-in1 src/routes/composer/+page.svelte
entry src/lib/plugins/quick-capture/composer-editor.ts ext-in1 src/routes/composer/+page.svelte
entry src/lib/plugins/quick-capture/note-composer.logic.ts ext-in1 src/lib/app/deep-link-actions.ts
entry src/lib/plugins/quick-capture/quick-capture.service.ts ext-in1 src/routes/(app)/+layout.svelte
## files
file src/lib/plugins/quick-capture/composer-editor-host.service.ts service L71 module src/lib/plugins/quick-capture in1 t1
file src/lib/plugins/quick-capture/composer-editor.ts other L158 module src/lib/plugins/quick-capture in1 t1
file src/lib/plugins/quick-capture/note-composer.logic.ts logic L133 module src/lib/plugins/quick-capture in2 t5
file src/lib/plugins/quick-capture/note-composer.service.ts service L54 module src/lib/plugins/quick-capture in2 t5
file src/lib/plugins/quick-capture/quick-capture.service.ts service L173 module src/lib/plugins/quick-capture in1 t1
## public
sym src/lib/plugins/quick-capture/composer-editor-host.service.ts:24 fn createComposerEditorHost(): ComposerEditorHost L48 | The editor host of the composer popover.
sym src/lib/plugins/quick-capture/composer-editor.ts:88 fn createComposerEditor(opts: ComposerEditorOptions): EditorView L47 | The text field of the Quick Capture composer: plain text, with the editor's `[[wikilink]]` and `#tag` completion.
sym src/lib/plugins/quick-capture/composer-editor.ts:143 fn setComposerText(view: EditorView, text: string): void L10 | Replaces the whole text, with the cursor at the end, when it differs.
sym src/lib/plugins/quick-capture/composer-editor.ts:155 fn setComposerDark(view: EditorView, dark: boolean): void L4 | Switches the editor theme between its light and dark base.
sym src/lib/plugins/quick-capture/note-composer.logic.ts:12 fn buildCapturePath(vaultPath: string, baseFolder: string, folderFormat: string, filenameFormat: string, date: dayjs.Dayjs): string L9 | Builds the full absolute path for a quick note.
sym src/lib/plugins/quick-capture/note-composer.logic.ts:25 fn getCaptureTitle(filenameFormat: string, date: dayjs.Dayjs): string L3 | Extracts the title for template processing (tp.file.title).
sym src/lib/plugins/quick-capture/note-composer.logic.ts:49 fn buildCaptureVariables(date: dayjs.Dayjs, periodicNotesSettings: PeriodicNotesSettings, title = '', kind = 'note'): Record<string, string> L37 | Builds custom template variables for a quick note.
sym src/lib/plugins/quick-capture/note-composer.logic.ts:122 fn processCaptureTemplate(template: string, fileTitle: string, vars: Record<string, string>): string L12 | `processTemplate` for a Quick Capture template, with the capture text variables made YAML-safe inside the template's frontmatter block: a placeholder that is t…
sym src/lib/plugins/quick-capture/note-composer.service.ts:20 fn createNoteComposer(): Promise<void> L35 | Creates and opens a new capture note instantly via the in-editor note-composer surface (Cmd+N).
sym src/lib/plugins/quick-capture/quick-capture.service.ts:51 fn registerQuickCaptureListener(): () => void L32 | Registers the Tauri event listener that routes a Rust-detected clipboard capture into kokobrain's `executeAction` pipeline.
## effects
ipc-count ipc:get_all_tags_v2 1
ipc-count ipc:get_all_vault_entries_v2 1
ipc-count ipc:report_composer_capture_result 1
## debt
-
