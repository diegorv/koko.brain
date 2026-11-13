# file card src/lib/features/rail-shell/list-sort-compare.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-sort-compare.logic.ts ' codemap/files
file src/lib/features/rail-shell/list-sort-compare.logic.ts logic L121 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/list-sort-compare.logic.ts:1 -> src/lib/core/filesystem/fs.logic.ts naturalCompare
imp src/lib/features/rail-shell/list-sort-compare.logic.ts:2 -> src/lib/features/rail-shell/list-toolbar.types.ts type:ListSortConfig,type:ListSortOption
imp src/lib/features/rail-shell/list-sort-compare.logic.ts:3 -> src/lib/features/rail-shell/rail-shell.types.ts type:LensGroup,type:LensNote,type:ResolvedLens
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:84 -> src/lib/features/rail-shell/list-sort-compare.logic.ts applyListSort
## reach
in2 src/lib/features/rail-shell/list-sort-compare.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-sort-compare.logic.ts 6 files in 5 modules: src/lib/utils(2) src/lib/core/filesystem(1) src/lib/features/note-list(1) src/lib/features/type-definitions(1) src/lib/types(1)
## tests
test src/tests/lib/features/rail-shell/list-sort-compare.logic.test.ts imports src/lib/features/rail-shell/list-sort-compare.logic.ts mirror
## symbols
sym src/lib/features/rail-shell/list-sort-compare.logic.ts:95 fn sortLensNotes(notes: readonly LensNote[], config: ListSortConfig): LensNote[] L3 | Returns a new array of `notes` in the given order; the input is not changed.
sym src/lib/features/rail-shell/list-sort-compare.logic.ts:104 fn applyListSort(resolved: ResolvedLens, config: ListSortConfig): ResolvedLens L18 | Applies a sort to a resolved lens.
by src/lib/features/rail-shell/list-sort-compare.logic.ts:applyListSort <- src/lib/features/rail-shell/RailNoteList.svelte:552 in sortedResolved=$derived call
## locals
local src/lib/features/rail-shell/list-sort-compare.logic.ts:8 fn rawValue(note: LensNote, option: ListSortOption): unknown L14
local src/lib/features/rail-shell/list-sort-compare.logic.ts:24 fn sortValue(note: LensNote, option: ListSortOption): unknown L4
local src/lib/features/rail-shell/list-sort-compare.logic.ts:34 fn isMissing(note: LensNote, option: ListSortOption): boolean L5
local src/lib/features/rail-shell/list-sort-compare.logic.ts:41 fn dateTime(value: string): number | null L7
local src/lib/features/rail-shell/list-sort-compare.logic.ts:53 fn comparable(value: unknown): { rank: number; number: number; text: string } L7
local src/lib/features/rail-shell/list-sort-compare.logic.ts:67 fn compareValues(a: unknown, b: unknown): number L6
local src/lib/features/rail-shell/list-sort-compare.logic.ts:79 fn compareNotes(a: LensNote, b: LensNote, config: ListSortConfig): number L14
## calls
call src/lib/features/rail-shell/list-sort-compare.logic.ts:25 in sortValue -> src/lib/features/rail-shell/list-sort-compare.logic.ts:rawValue call
call src/lib/features/rail-shell/list-sort-compare.logic.ts:35 in isMissing -> src/lib/features/rail-shell/list-sort-compare.logic.ts:rawValue call
call src/lib/features/rail-shell/list-sort-compare.logic.ts:57 in comparable -> src/lib/features/rail-shell/list-sort-compare.logic.ts:dateTime call
call src/lib/features/rail-shell/list-sort-compare.logic.ts:68 in compareValues -> src/lib/features/rail-shell/list-sort-compare.logic.ts:comparable call +1
call src/lib/features/rail-shell/list-sort-compare.logic.ts:80 in compareNotes -> src/lib/features/rail-shell/list-sort-compare.logic.ts:isMissing call +1
call src/lib/features/rail-shell/list-sort-compare.logic.ts:88 in compareNotes -> src/lib/features/rail-shell/list-sort-compare.logic.ts:compareValues call
call src/lib/features/rail-shell/list-sort-compare.logic.ts:88 in compareNotes -> src/lib/features/rail-shell/list-sort-compare.logic.ts:sortValue call +1
call src/lib/features/rail-shell/list-sort-compare.logic.ts:91 in compareNotes -> src/lib/core/filesystem/fs.logic.ts:naturalCompare call +1
call src/lib/features/rail-shell/list-sort-compare.logic.ts:96 in sortLensNotes -> src/lib/features/rail-shell/list-sort-compare.logic.ts:compareNotes call
call src/lib/features/rail-shell/list-sort-compare.logic.ts:106 in applyListSort -> src/lib/features/rail-shell/list-sort-compare.logic.ts:sortLensNotes call +1
