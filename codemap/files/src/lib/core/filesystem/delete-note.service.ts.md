# file card src/lib/core/filesystem/delete-note.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/filesystem/delete-note.service.ts ' codemap/files
file src/lib/core/filesystem/delete-note.service.ts service L28 module src/lib/core/filesystem in2 t1
## imports
imp src/lib/core/filesystem/delete-note.service.ts:1 -> pkg:@tauri-apps/plugin-dialog ask
imp src/lib/core/filesystem/delete-note.service.ts:3 -> src/lib/core/filesystem/fs.service.ts deleteItem
imp src/lib/core/filesystem/delete-note.service.ts:4 -> src/lib/core/filesystem/fs.logic.ts fileOperationErrorMessage,PreDeleteSaveError
imp src/lib/core/filesystem/delete-note.service.ts:5 -> src/lib/utils/path.ts basename
## imported-by
imp src/lib/features/note-action-bar/NoteActionBar.svelte:28 -> src/lib/core/filesystem/delete-note.service.ts deleteNoteWithConfirm
imp src/lib/features/rail-shell/TypesNavigator.svelte:19 -> src/lib/core/filesystem/delete-note.service.ts deleteNoteWithConfirm
## reach
in2 src/lib/core/filesystem/delete-note.service.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/core/filesystem/delete-note.service.ts 9 files in 6 modules: src/lib/core/filesystem(4) src/lib/contracts(1) src/lib/core/editor(1) src/lib/core/trash(1) src/lib/core/vault(1) +1 modules
## tests
test src/tests/lib/core/filesystem/delete-note.service.test.ts imports src/lib/core/filesystem/delete-note.service.ts mirror
## symbols
sym src/lib/core/filesystem/delete-note.service.ts:12 fn deleteNoteWithConfirm(path: string): Promise<void> L17 | Asks the same "Move to Trash" confirmation as the file explorer, then moves the note to the trash.
by src/lib/core/filesystem/delete-note.service.ts:deleteNoteWithConfirm <- src/lib/features/note-action-bar/NoteActionBar.svelte:216 in (markup) markup
by src/lib/core/filesystem/delete-note.service.ts:deleteNoteWithConfirm <- src/lib/features/rail-shell/TypesNavigator.svelte:343 in (markup) markup
## calls
call src/lib/core/filesystem/delete-note.service.ts:13 in deleteNoteWithConfirm -> src/lib/utils/path.ts:basename call
call src/lib/core/filesystem/delete-note.service.ts:22 in deleteNoteWithConfirm -> src/lib/core/filesystem/fs.service.ts:deleteItem call
call src/lib/core/filesystem/delete-note.service.ts:26 in deleteNoteWithConfirm -> src/lib/core/filesystem/fs.logic.ts:fileOperationErrorMessage call
## effects
fx src/lib/core/filesystem/delete-note.service.ts:14 tauri-dialog.ask in deleteNoteWithConfirm
