# file card src/lib/features/command-palette/command-palette.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/command-palette/command-palette.logic.ts ' codemap/files
file src/lib/features/command-palette/command-palette.logic.ts logic L44 module src/lib/features/command-palette in1 t1
## imports
imp src/lib/features/command-palette/command-palette.logic.ts:1 -> src/lib/features/command-palette/command-palette.types.ts type:AppCommand
imp src/lib/features/command-palette/command-palette.logic.ts:2 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
## imported-by
imp src/lib/features/command-palette/CommandPalette.svelte:6 -> src/lib/features/command-palette/command-palette.logic.ts filterAndRankCommands
## reach
in2 src/lib/features/command-palette/command-palette.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/command-palette/command-palette.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/command-palette/command-palette.logic.test.ts imports src/lib/features/command-palette/command-palette.logic.ts mirror
## symbols
sym src/lib/features/command-palette/command-palette.logic.ts:4 fn filterAndRankCommands(query: string, commands: AppCommand[], recentIds: string[]): AppCommand[] L41
by src/lib/features/command-palette/command-palette.logic.ts:filterAndRankCommands <- src/lib/features/command-palette/CommandPalette.svelte:17 in filteredCommands=$derived call
## calls
call src/lib/features/command-palette/command-palette.logic.ts:24 in filterAndRankCommands -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
