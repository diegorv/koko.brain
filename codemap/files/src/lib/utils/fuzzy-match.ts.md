# file card src/lib/utils/fuzzy-match.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/fuzzy-match.ts ' codemap/files
file src/lib/utils/fuzzy-match.ts other L41 module src/lib/utils in6 t2
## imported-by
imp src/lib/core/filesystem/file-entries.logic.ts:2 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
imp src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:1 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
imp src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:2 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
imp src/lib/core/markdown-editor/extensions/wikilink/completion.ts:3 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
imp src/lib/features/command-palette/command-palette.logic.ts:2 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
imp src/lib/plugins/mods/ModDialogHost.svelte:13 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
## reach
in2 src/lib/utils/fuzzy-match.ts 14 files in 9 modules: src/lib/core/markdown-editor(3) src/lib/app(2) src/lib/features/properties(2) src/lib/plugins/kanban(2) src/lib/core/filesystem(1) +4 modules: q impact src/lib/utils/fuzzy-match.ts --depth 2
out2 src/lib/utils/fuzzy-match.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/fuzzy-match.test.ts imports src/lib/utils/fuzzy-match.ts mirror
test src/tests/lib/lib-subpath-import.test.ts imports src/lib/utils/fuzzy-match.ts
## symbols
sym src/lib/utils/fuzzy-match.ts:2 interface FuzzyMatchResult L4 | Result of a fuzzy match operation — indicates whether the query matched and a quality score.
sym src/lib/utils/fuzzy-match.ts:8 fn fuzzyMatch(query: string, target: string): FuzzyMatchResult L34 | Performs a fuzzy match of query against target.
by src/lib/utils/fuzzy-match.ts:fuzzyMatch <- src/lib/core/filesystem/file-entries.logic.ts:53 in filterAndRank call
by src/lib/utils/fuzzy-match.ts:fuzzyMatch <- src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:98 in rankTags call
by src/lib/utils/fuzzy-match.ts:fuzzyMatch <- src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:81 in matchFilesForWikilink call
by src/lib/utils/fuzzy-match.ts:fuzzyMatch <- src/lib/core/markdown-editor/extensions/wikilink/completion.ts:92 in buildFileCompletions call +2
by src/lib/utils/fuzzy-match.ts:fuzzyMatch <- src/lib/features/command-palette/command-palette.logic.ts:24 in filterAndRankCommands call
by src/lib/utils/fuzzy-match.ts:fuzzyMatch <- src/lib/plugins/mods/ModDialogHost.svelte:37 in pickItems=$derived call
