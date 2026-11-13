# module card src/lib/core/note-creator
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/note-creator ' codemap/modules
module src/lib/core/note-creator core files 2 in-modules 12 out-modules 5 pub 4/6 ipc 2/0 card ~1.4k
## neighbors
dep src/lib/app -> src/lib/core/note-creator 4
dep src/lib/features/auto-organize -> src/lib/core/note-creator 1
dep src/lib/features/deep-link -> src/lib/core/note-creator 2
dep src/lib/features/note-action-bar -> src/lib/core/note-creator 1
dep src/lib/features/quick-switcher -> src/lib/core/note-creator 1
dep src/lib/features/rail-shell -> src/lib/core/note-creator 2
dep src/lib/features/type-definitions -> src/lib/core/note-creator 2
dep src/lib/plugins/mods -> src/lib/core/note-creator 1
dep src/lib/plugins/one-on-one -> src/lib/core/note-creator 2
dep src/lib/plugins/periodic-notes -> src/lib/core/note-creator 1
dep src/lib/plugins/quick-capture -> src/lib/core/note-creator 2
dep src/lib/plugins/templates -> src/lib/core/note-creator 2
dep src/lib/core/note-creator -> src/lib/contracts 1
dep src/lib/core/note-creator -> src/lib/core/editor 2
dep src/lib/core/note-creator -> src/lib/core/filesystem 3
dep src/lib/core/note-creator -> src/lib/core/vault 1
dep src/lib/core/note-creator -> src/lib/utils 3
in2 src/lib/core/note-creator 4 modules: src/lib/features/event-calendar(2) src/lib/features/note-list(1) src/lib/plugins/calendar(1) src/routes(1)
out2 src/lib/core/note-creator 3 modules: src/lib/core/settings(2) src/lib/core/markdown-editor(1) src/lib/core/trash(1)
## entry files
entry src/lib/core/note-creator/explicit-organization.logic.ts ext-in12 src/lib/app/commands.ts src/lib/app/deep-link-actions.ts src/lib/app/editor-host.ts src/lib/features/deep-link/deep-link.service.ts src/lib/features/note-action-bar/note-action-bar.service.ts more importers 7 not shown: src/lib/features/rail-shell(2) src/lib/features/quick-switcher(1) src/lib/features/type-definitions(1) +3 modules: q importers src/lib/core/note-creator/explicit-organization.logic.ts
entry src/lib/core/note-creator/note-creator.service.ts ext-in9 src/lib/app/editor-host.ts src/lib/features/auto-organize/auto-organize.service.ts src/lib/features/deep-link/deep-link.service.ts src/lib/features/type-definitions/type-definitions.service.ts src/lib/plugins/mods/mod-app.service.ts more importers 4 not shown: src/lib/plugins/one-on-one(1) src/lib/plugins/periodic-notes(1) src/lib/plugins/quick-capture(1) +1 modules: q importers src/lib/core/note-creator/note-creator.service.ts
## files
file src/lib/core/note-creator/explicit-organization.logic.ts logic L45 module src/lib/core/note-creator in12 t1
file src/lib/core/note-creator/note-creator.service.ts service L136 module src/lib/core/note-creator in9 t15
## public
sym src/lib/core/note-creator/explicit-organization.logic.ts:29 fn withUnorganizedFlag(content: string): string L9 | Returns `content` with `_organized: false` in its frontmatter, unless a top-level `_organized:` / `organized:` line is already there (whatever its value).
sym src/lib/core/note-creator/explicit-organization.logic.ts:43 fn applyExplicitOrganization(content: string, enabled: boolean): string L3 | The switch: withUnorganizedFlag of `content` when `enabled` (`settingsStore.explicitOrganization`), `content` unchanged otherwise.
sym src/lib/core/note-creator/note-creator.service.ts:49 fn loadNoteTemplate(options: NoteTemplateOptions): Promise<string> L16 | Loads a note's initial content: reads `templatePath` (falling back to `inlineTemplate` when the read fails), or uses `inlineTemplate` alone, then expands its `…
sym src/lib/core/note-creator/note-creator.service.ts:79 fn openOrCreateNote(options: NoteCreationOptions): Promise<void> L58 | Opens a note if it exists, or creates it from a template and opens it.
## effects
fx-count tauri-fs.exists 1
fx-count tauri-fs.readTextFile 1
ipc-count ipc:create_folder 1
ipc-count ipc:create_note 1
## debt
-
