# file card src/lib/features/rail-shell/list-empty.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-empty.logic.ts ' codemap/files
file src/lib/features/rail-shell/list-empty.logic.ts logic L145 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/list-empty.logic.ts:1 -> src/lib/features/type-definitions/type-sidebar.logic.ts type:ArchivedFilter
imp src/lib/features/rail-shell/list-empty.logic.ts:2 -> src/lib/features/rail-shell/lens.logic.ts ARCHIVE_LENS,FAVORITES_LENS,FOLDER_LENS_KIND,INBOX_LENS,NEIGHBOURHOOD_LENS_KIND,TYPES_LENS,UNTYPED_LENS,VIEW_LENS_KIND
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:93 -> src/lib/features/rail-shell/list-empty.logic.ts explainEmptyList,LIST_EMPTY_COPY,type:EmptyListAction,type:EmptyListIcon,type:EmptyListState
## reach
in2 src/lib/features/rail-shell/list-empty.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-empty.logic.ts 18 files in 8 modules: src/lib/features/collection(5) src/lib/core/filesystem(3) src/lib/features/type-definitions(3) src/lib/core/settings(2) src/lib/utils(2) +3 modules
## tests
test src/tests/lib/features/rail-shell/list-empty.logic.test.ts imports src/lib/features/rail-shell/list-empty.logic.ts mirror
## symbols
sym src/lib/features/rail-shell/list-empty.logic.ts:14 type EmptyListAction L1 | What an empty list's action does: every one changes local state only and writes no file.
by src/lib/features/rail-shell/list-empty.logic.ts:EmptyListAction <- src/lib/features/rail-shell/RailNoteList.svelte:96 in (script) import
sym src/lib/features/rail-shell/list-empty.logic.ts:17 type EmptyListState L1 | Which empty state the list shows; each has its own `data-note-list-*` hook.
by src/lib/features/rail-shell/list-empty.logic.ts:EmptyListState <- src/lib/features/rail-shell/RailNoteList.svelte:98 in (script) import
sym src/lib/features/rail-shell/list-empty.logic.ts:20 type EmptyListIcon L1 | An icon key, mapped to a component by the list (this file has no framework import).
by src/lib/features/rail-shell/list-empty.logic.ts:EmptyListIcon <- src/lib/features/rail-shell/RailNoteList.svelte:97 in (script) import
sym src/lib/features/rail-shell/list-empty.logic.ts:23 interface EmptyListExplanation L12 | Why a list is empty, as the list shows it.
sym src/lib/features/rail-shell/list-empty.logic.ts:37 interface EmptyListInput L18 | What `explainEmptyList` reads about an empty list.
sym src/lib/features/rail-shell/list-empty.logic.ts:65 const LIST_EMPTY_COPY L30 | Every string an empty rail list shows, in one table so a copy change touches one entry.
by src/lib/features/rail-shell/list-empty.logic.ts:LIST_EMPTY_COPY <- src/lib/features/rail-shell/RailNoteList.svelte:923 in (markup) markup +5
sym src/lib/features/rail-shell/list-empty.logic.ts:108 fn explainEmptyList(input: EmptyListInput): EmptyListExplanation L38 | Names why an empty rail list is empty, in this order: a search with no match (or still running), a lens with no list, a view's filters, the archived filter, th…
by src/lib/features/rail-shell/list-empty.logic.ts:explainEmptyList <- src/lib/features/rail-shell/RailNoteList.svelte:720 in emptyExplanation=$derived call
## locals
local src/lib/features/rail-shell/list-empty.logic.ts:57 fn plural(n: number, word: string): string L3
local src/lib/features/rail-shell/list-empty.logic.ts:97 fn empty(icon: EmptyListIcon, title: string, hint?: string, action?: EmptyListAction): EmptyListExplanation L3
## calls
call src/lib/features/rail-shell/list-empty.logic.ts:75 in LIST_EMPTY_COPY.viewFiltered -> src/lib/features/rail-shell/list-empty.logic.ts:plural call
call src/lib/features/rail-shell/list-empty.logic.ts:115 in explainEmptyList -> src/lib/features/rail-shell/list-empty.logic.ts:empty call +14
