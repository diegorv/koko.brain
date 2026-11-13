# file card src/lib/features/rail-shell/list-search.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/list-search.logic.ts ' codemap/files
file src/lib/features/rail-shell/list-search.logic.ts logic L62 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/list-search.logic.ts:1 -> src/lib/features/type-definitions/type-sidebar.logic.ts splitPropertyIntoPills
imp src/lib/features/rail-shell/list-search.logic.ts:2 -> src/lib/features/rail-shell/rail-shell.types.ts type:LensNote,type:ResolvedLens
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:83 -> src/lib/features/rail-shell/list-search.logic.ts filterResolvedLens,normalizeListQuery
## reach
in2 src/lib/features/rail-shell/list-search.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/list-search.logic.ts 9 files in 7 modules: src/lib/core/filesystem(2) src/lib/features/collection(2) src/lib/features/file-icons(1) src/lib/features/note-list(1) src/lib/features/type-definitions(1) +2 modules
## tests
test src/tests/lib/features/rail-shell/list-search.logic.test.ts imports src/lib/features/rail-shell/list-search.logic.ts mirror
## symbols
sym src/lib/features/rail-shell/list-search.logic.ts:8 fn normalizeListQuery(query: string): string L3 | Trims and lower-cases a search box value.
by src/lib/features/rail-shell/list-search.logic.ts:normalizeListQuery <- src/lib/features/rail-shell/RailNoteList.svelte:502 in searching=$derived call
sym src/lib/features/rail-shell/list-search.logic.ts:18 fn noteMatchesListQuery(note: LensNote, normalizedQuery: string, listProperties: readonly string[], fullTextPaths?: ReadonlySet<string>): bool… L15 | True when a note stays in the list for a normalized query.
sym src/lib/features/rail-shell/list-search.logic.ts:40 fn filterResolvedLens(resolved: ResolvedLens, query: string, listPropertiesFor: (note: LensNote) => readonly string[], fullTextPaths?: Reado… L23 | Narrows a resolved lens to the notes that match `query`.
by src/lib/features/rail-shell/list-search.logic.ts:filterResolvedLens <- src/lib/features/rail-shell/RailNoteList.svelte:553 in shownResolved=$derived call
## calls
call src/lib/features/rail-shell/list-search.logic.ts:28 in noteMatchesListQuery -> src/lib/features/type-definitions/type-sidebar.logic.ts:splitPropertyIntoPills call
call src/lib/features/rail-shell/list-search.logic.ts:46 in filterResolvedLens -> src/lib/features/rail-shell/list-search.logic.ts:normalizeListQuery call
call src/lib/features/rail-shell/list-search.logic.ts:49 in filterResolvedLens -> src/lib/features/rail-shell/list-search.logic.ts:noteMatchesListQuery call
