# file card src/lib/features/command-palette/command-palette.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/command-palette/command-palette.logic.ts ' codemap/files
file src/lib/features/command-palette/command-palette.logic.ts logic L58 module src/lib/features/command-palette in1 t2
## imports
imp src/lib/features/command-palette/command-palette.logic.ts:1 -> src/lib/features/command-palette/command-palette.types.ts type:AppCommand
imp src/lib/features/command-palette/command-palette.logic.ts:2 -> src/lib/utils/fuzzy-match.ts fuzzyMatch
## imported-by
imp src/lib/features/command-palette/CommandPalette.svelte:6 -> src/lib/features/command-palette/command-palette.logic.ts filterAndRankCommands,splitRecentCommands
## reach
in2 src/lib/features/command-palette/command-palette.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/command-palette/command-palette.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/command-palette/command-palette.logic.test.ts imports src/lib/features/command-palette/command-palette.logic.ts mirror
test src/tests/lib/app/commands.test.ts imports src/lib/features/command-palette/command-palette.logic.ts
## symbols
sym src/lib/features/command-palette/command-palette.logic.ts:10 fn splitRecentCommands(commands: AppCommand[], recentIds: string[]): { recent: AppCommand[]; rest: AppCommand[] } L13 | The palette's empty-query groups.
by src/lib/features/command-palette/command-palette.logic.ts:splitRecentCommands <- src/lib/features/command-palette/CommandPalette.svelte:30 in recentGroups=$derived call
sym src/lib/features/command-palette/command-palette.logic.ts:24 fn filterAndRankCommands(query: string, commands: AppCommand[], recentIds: string[]): AppCommand[] L35
by src/lib/features/command-palette/command-palette.logic.ts:filterAndRankCommands <- src/lib/features/command-palette/CommandPalette.svelte:24 in filteredCommands=$derived call
## calls
call src/lib/features/command-palette/command-palette.logic.ts:30 in filterAndRankCommands -> src/lib/features/command-palette/command-palette.logic.ts:splitRecentCommands call
call src/lib/features/command-palette/command-palette.logic.ts:38 in filterAndRankCommands -> src/lib/utils/fuzzy-match.ts:fuzzyMatch call
