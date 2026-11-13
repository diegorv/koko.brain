# file card src/lib/features/note-list/note-row-menu.context.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/note-list/note-row-menu.context.ts ' codemap/files
file src/lib/features/note-list/note-row-menu.context.ts other L39 module src/lib/features/note-list in2 t0
## imports
imp src/lib/features/note-list/note-row-menu.context.ts:2 -> src/lib/features/note-list/note-row.types.ts type:NoteRowNote
## imported-by
imp src/lib/features/note-list/NoteRow.svelte:13 -> src/lib/features/note-list/note-row-menu.context.ts RENAME_SHORTCUT,useNoteRowMenuContext
imp src/lib/features/note-list/NoteRowMenu.svelte:30 -> src/lib/features/note-list/note-row-menu.context.ts RENAME_SHORTCUT,setNoteRowMenuContext,type:NoteRowRenameState
## reach
in2 src/lib/features/note-list/note-row-menu.context.ts 1 files in 1 modules: src/lib/features/rail-shell(1)
out2 src/lib/features/note-list/note-row-menu.context.ts 1 files in 1 modules: src/lib/types(1)
## symbols
sym src/lib/features/note-list/note-row-menu.context.ts:5 const RENAME_SHORTCUT L1 | The key that renames the focused row; the menu's Rename item shows it as its hint.
by src/lib/features/note-list/note-row-menu.context.ts:RENAME_SHORTCUT <- src/lib/features/note-list/NoteRow.svelte:73 in (markup) markup
by src/lib/features/note-list/note-row-menu.context.ts:RENAME_SHORTCUT <- src/lib/features/note-list/NoteRowMenu.svelte:280 in (markup) markup
sym src/lib/features/note-list/note-row-menu.context.ts:8 interface NoteRowRenameState L6 | Inline rename input state, owned by the menu so it survives a row remount while scrolling.
by src/lib/features/note-list/note-row-menu.context.ts:NoteRowRenameState <- src/lib/features/note-list/NoteRowMenu.svelte:30 in (script) import
sym src/lib/features/note-list/note-row-menu.context.ts:16 interface NoteRowMenuContext L12 | Actions NoteRowMenu exposes to the NoteRow components rendered inside it.
sym src/lib/features/note-list/note-row-menu.context.ts:32 fn setNoteRowMenuContext(ctx: NoteRowMenuContext): void L3 | Called once by NoteRowMenu to expose its actions to the rows it wraps.
by src/lib/features/note-list/note-row-menu.context.ts:setNoteRowMenuContext <- src/lib/features/note-list/NoteRowMenu.svelte:58 in (script) call
sym src/lib/features/note-list/note-row-menu.context.ts:37 fn useNoteRowMenuContext(): NoteRowMenuContext L3 | Called by NoteRow to reach the enclosing NoteRowMenu.
by src/lib/features/note-list/note-row-menu.context.ts:useNoteRowMenuContext <- src/lib/features/note-list/NoteRow.svelte:44 in menu call
