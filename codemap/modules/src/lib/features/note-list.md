# module card src/lib/features/note-list
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/features/note-list ' codemap/modules
module src/lib/features/note-list features files 4 in-modules 1 out-modules 9 pub 3/8 ipc 0/0 card ~0.9k
## neighbors
dep src/lib/features/rail-shell -> src/lib/features/note-list 3
dep src/lib/features/note-list -> src/lib/components 1
dep src/lib/features/note-list -> src/lib/core/editor 2
dep src/lib/features/note-list -> src/lib/core/filesystem 5
dep src/lib/features/note-list -> src/lib/core/vault 2
dep src/lib/features/note-list -> src/lib/features/file-icons 7
dep src/lib/features/note-list -> src/lib/features/properties 1
dep src/lib/features/note-list -> src/lib/features/type-definitions 5
dep src/lib/features/note-list -> src/lib/types 1
dep src/lib/features/note-list -> src/lib/utils 2
in2 src/lib/features/note-list 2 modules: src/lib/plugins/calendar(2) src/lib/app(1)
out2 src/lib/features/note-list 7 modules: src/lib/features/collection(9) src/lib/contracts(5) src/lib/core/frontmatter(5) src/lib/core/settings(3) src/lib/core/note-creator(2) +2 modules
## entry files
entry src/lib/features/note-list/NoteRow.svelte ext-in1 src/lib/features/rail-shell/RailNoteList.svelte
entry src/lib/features/note-list/NoteRowMenu.svelte ext-in1 src/lib/features/rail-shell/RailNoteList.svelte
entry src/lib/features/note-list/note-row.types.ts ext-in1 src/lib/features/rail-shell/rail-shell.types.ts
## files
file src/lib/features/note-list/NoteRow.svelte component L133 module src/lib/features/note-list in1 t3
file src/lib/features/note-list/NoteRowMenu.svelte component L302 module src/lib/features/note-list in1 t3
file src/lib/features/note-list/note-row-menu.context.ts other L39 module src/lib/features/note-list in2 t0
file src/lib/features/note-list/note-row.types.ts types L15 module src/lib/features/note-list in4 t0
## public
sym src/lib/features/note-list/NoteRow.svelte:1 component NoteRow props:note,icon,isActive,listProperties,allPaths,typeName=,subtitle,italic=,archived=,fallbackIcon=,draggable= L133
sym src/lib/features/note-list/NoteRowMenu.svelte:1 component NoteRowMenu props:notes,extraItems=,class=,children L302
sym src/lib/features/note-list/note-row.types.ts:4 interface NoteRowNote L12 | The fields a shared note row and its context menu read from a listed note.
## effects
fx-count svelte.$effect 1
fx-count tauri-dialog.ask 1
fx-count timer.requestAnimationFrame 1
## debt
-
