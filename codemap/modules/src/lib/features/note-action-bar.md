# module card src/lib/features/note-action-bar
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/note-action-bar ' codemap/modules
module src/lib/features/note-action-bar features files 4 in-modules 2 out-modules 12 pub 2/19 ipc 0/0 card ~1k
## neighbors
dep src/lib/app -> src/lib/features/note-action-bar 1
dep src/lib/plugins/one-on-one -> src/lib/features/note-action-bar 1
dep src/lib/features/note-action-bar -> src/lib/components 1
dep src/lib/features/note-action-bar -> src/lib/core/editor 3
dep src/lib/features/note-action-bar -> src/lib/core/filesystem 3
dep src/lib/features/note-action-bar -> src/lib/core/frontmatter 2
dep src/lib/features/note-action-bar -> src/lib/core/note-creator 1
dep src/lib/features/note-action-bar -> src/lib/core/settings 2
dep src/lib/features/note-action-bar -> src/lib/core/vault 1
dep src/lib/features/note-action-bar -> src/lib/features/deep-link 1
dep src/lib/features/note-action-bar -> src/lib/features/properties 2
dep src/lib/features/note-action-bar -> src/lib/features/rail-shell 1
dep src/lib/features/note-action-bar -> src/lib/features/type-definitions 1
dep src/lib/features/note-action-bar -> src/lib/utils 4
in2 src/lib/features/note-action-bar 1 modules: src/lib/plugins/mods(1)
out2 src/lib/features/note-action-bar 4 modules: src/lib/contracts(3) src/lib/core/markdown-editor(1) src/lib/core/trash(1) src/lib/types(1)
## entry files
entry src/lib/features/note-action-bar/NoteActionBar.svelte ext-in1 src/lib/app/EditorView.svelte
entry src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts ext-in1 src/lib/plugins/one-on-one/one-on-one.service.ts
## files
file src/lib/features/note-action-bar/NoteActionBar.svelte component L236 module src/lib/features/note-action-bar in1 t1
file src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts store L34 module src/lib/features/note-action-bar in2 t4 | Note-creating actions plugins register into the note action bar.
file src/lib/features/note-action-bar/note-action-bar.logic.ts logic L121 module src/lib/features/note-action-bar in2 t2
file src/lib/features/note-action-bar/note-action-bar.service.ts service L87 module src/lib/features/note-action-bar in1 t1
## public
sym src/lib/features/note-action-bar/NoteActionBar.svelte:1 component NoteActionBar props:path,onShowTableOfContents L236
sym src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:13 store noteActionBarActionsStore L22
## stores
store src/lib/features/note-action-bar/note-action-bar-actions.store.svelte.ts:13 noteActionBarActionsStore esc:0
## effects
fx-count tauri-opener.revealItemInDir 1
## debt
-
