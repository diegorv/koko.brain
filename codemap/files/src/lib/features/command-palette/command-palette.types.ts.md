# file card src/lib/features/command-palette/command-palette.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/command-palette/command-palette.types.ts ' codemap/files
file src/lib/features/command-palette/command-palette.types.ts types L17 module src/lib/features/command-palette in3 t0
## imported-by
imp src/lib/app/commands.ts:2 -> src/lib/features/command-palette/command-palette.types.ts type:AppCommand
imp src/lib/features/command-palette/CommandPalette.svelte:7 -> src/lib/features/command-palette/command-palette.types.ts type:AppCommand
imp src/lib/features/command-palette/command-palette.logic.ts:1 -> src/lib/features/command-palette/command-palette.types.ts type:AppCommand
## reach
in2 src/lib/features/command-palette/command-palette.types.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/command-palette/command-palette.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/command-palette/command-palette.logic.test.ts imports-type src/lib/features/command-palette/command-palette.types.ts
## symbols
sym src/lib/features/command-palette/command-palette.types.ts:1 interface AppCommand L7
by src/lib/features/command-palette/command-palette.types.ts:AppCommand <- src/lib/app/commands.ts:2 in (module) import
by src/lib/features/command-palette/command-palette.types.ts:AppCommand <- src/lib/features/command-palette/CommandPalette.svelte:7 in (script) import
by src/lib/features/command-palette/command-palette.types.ts:AppCommand <- src/lib/features/command-palette/command-palette.logic.ts:1 in (module) import
sym src/lib/features/command-palette/command-palette.types.ts:9 interface CommandShortcut L9
