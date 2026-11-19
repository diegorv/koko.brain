# file card src/lib/features/properties/note-actions.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/note-actions.logic.ts ' codemap/files
file src/lib/features/properties/note-actions.logic.ts logic L40 module src/lib/features/properties in2 t1
## imported-by
imp src/lib/features/note-action-bar/NoteActionBar.svelte:37 -> src/lib/features/properties/note-actions.logic.ts noteActions,type:NoteActionId
imp src/lib/features/note-list/NoteRowMenu.svelte:30 -> src/lib/features/properties/note-actions.logic.ts noteActions,type:NoteActionId
## reach
in2 src/lib/features/properties/note-actions.logic.ts 2 files in 2 modules: src/lib/app(1) src/lib/features/rail-shell(1)
out2 src/lib/features/properties/note-actions.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/properties/note-actions.logic.test.ts imports src/lib/features/properties/note-actions.logic.ts mirror
## symbols
sym src/lib/features/properties/note-actions.logic.ts:2 type NoteActionId L1 | A note action shared by the note-list row menu and the note's More menu.
by src/lib/features/properties/note-actions.logic.ts:NoteActionId <- src/lib/features/note-action-bar/NoteActionBar.svelte:37 in (script) import
by src/lib/features/properties/note-actions.logic.ts:NoteActionId <- src/lib/features/note-list/NoteRowMenu.svelte:30 in (script) import
sym src/lib/features/properties/note-actions.logic.ts:5 interface NoteAction L8 | One entry of the note-actions group; each menu maps `id` to its icon and handler.
sym src/lib/features/properties/note-actions.logic.ts:15 interface NoteActionsState L6 | The lifecycle flags the labels follow.
sym src/lib/features/properties/note-actions.logic.ts:32 fn noteActions(kind: string, state: NoteActionsState): NoteAction[] L9 | The note-actions group, in menu order: Archive or Restore, Mark organized or Mark not organized, History, then Move to Trash last.
by src/lib/features/properties/note-actions.logic.ts:noteActions <- src/lib/features/note-action-bar/NoteActionBar.svelte:228 in (markup) markup
by src/lib/features/properties/note-actions.logic.ts:noteActions <- src/lib/features/note-list/NoteRowMenu.svelte:298 in (markup) markup
