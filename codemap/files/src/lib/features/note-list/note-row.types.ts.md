# file card src/lib/features/note-list/note-row.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-list/note-row.types.ts ' codemap/files
file src/lib/features/note-list/note-row.types.ts types L15 module src/lib/features/note-list in4 t0
## imports
imp src/lib/features/note-list/note-row.types.ts:1 -> src/lib/types/vault-v2.types.ts type:FrontmatterValue
## imported-by
imp src/lib/features/note-list/NoteRow.svelte:14 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
imp src/lib/features/note-list/NoteRowMenu.svelte:31 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
imp src/lib/features/note-list/note-row-menu.context.ts:2 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
imp src/lib/features/rail-shell/rail-shell.types.ts:5 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
## reach
in2 src/lib/features/note-list/note-row.types.ts 15 files in 2 modules: src/lib/features/rail-shell(13) src/lib/plugins/calendar(2)
out2 src/lib/features/note-list/note-row.types.ts 1 files in 1 modules: src/lib/contracts(1)
## tests
test src/tests/lib/features/note-list/NoteRowMenu.favorite.test.ts imports-type src/lib/features/note-list/note-row.types.ts
test src/tests/lib/features/note-list/NoteRowMenu.show-in-views.test.ts imports-type src/lib/features/note-list/note-row.types.ts
test src/tests/lib/features/note-list/NoteRowMenu.test.ts imports-type src/lib/features/note-list/note-row.types.ts
## symbols
sym src/lib/features/note-list/note-row.types.ts:4 interface NoteRowNote L12 | The fields a shared note row and its context menu read from a listed note.
by src/lib/features/note-list/note-row.types.ts:NoteRowNote <- src/lib/features/note-list/NoteRow.svelte:14 in (script) import
by src/lib/features/note-list/note-row.types.ts:NoteRowNote <- src/lib/features/note-list/NoteRowMenu.svelte:31 in (script) import
by src/lib/features/note-list/note-row.types.ts:NoteRowNote <- src/lib/features/note-list/note-row-menu.context.ts:2 in (module) import
by src/lib/features/note-list/note-row.types.ts:NoteRowNote <- src/lib/features/rail-shell/rail-shell.types.ts:5 in (module) import
