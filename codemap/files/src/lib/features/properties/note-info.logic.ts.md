# file card src/lib/features/properties/note-info.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/note-info.logic.ts ' codemap/files
file src/lib/features/properties/note-info.logic.ts logic L35 module src/lib/features/properties in1 t1
## imports
imp src/lib/features/properties/note-info.logic.ts:1 -> src/lib/features/file-history/file-history.logic.ts formatFileSize
imp src/lib/features/properties/note-info.logic.ts:2 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
## imported-by
imp src/lib/features/properties/NoteInfo.svelte:9 -> src/lib/features/properties/note-info.logic.ts buildNoteInfoRows
## reach
in2 src/lib/features/properties/note-info.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/properties/note-info.logic.ts 3 files in 3 modules: src/lib/contracts(1) src/lib/features/file-history(1) src/lib/utils(1)
## tests
test src/tests/lib/features/properties/note-info.logic.test.ts imports src/lib/features/properties/note-info.logic.ts mirror
## symbols
sym src/lib/features/properties/note-info.logic.ts:7 interface NoteInfoRow L6 | One read-only label and value of the panel's Info section.
sym src/lib/features/properties/note-info.logic.ts:28 fn buildNoteInfoRows(entry: NoteEntryV2 | null): NoteInfoRow[] L8 | Builds the Info section rows from a note's index entry.
by src/lib/features/properties/note-info.logic.ts:buildNoteInfoRows <- src/lib/features/properties/NoteInfo.svelte:12 in rows=$derived call
## locals
local src/lib/features/properties/note-info.logic.ts:15 fn formatTimestamp(seconds: number): string L8
## calls
call src/lib/features/properties/note-info.logic.ts:30 in buildNoteInfoRows -> src/lib/features/properties/note-info.logic.ts:formatTimestamp call +1
call src/lib/features/properties/note-info.logic.ts:33 in buildNoteInfoRows -> src/lib/features/file-history/file-history.logic.ts:formatFileSize call
