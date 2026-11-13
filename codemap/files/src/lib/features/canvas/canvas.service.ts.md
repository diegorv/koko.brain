# file card src/lib/features/canvas/canvas.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/canvas.service.ts ' codemap/files
file src/lib/features/canvas/canvas.service.ts service L10 module src/lib/features/canvas in2 t4
## imports
imp src/lib/features/canvas/canvas.service.ts:1 -> src/lib/core/filesystem/fs.service.ts createFile
imp src/lib/features/canvas/canvas.service.ts:2 -> src/lib/features/canvas/canvas.logic.ts serializeCanvas,createEmptyCanvas
## imported-by
imp src/lib/app/commands.ts:24 -> src/lib/features/canvas/canvas.service.ts createCanvasFile
imp src/lib/features/rail-shell/FilesNavigator.svelte:43 -> src/lib/features/canvas/canvas.service.ts createCanvasFile
## reach
in2 src/lib/features/canvas/canvas.service.ts 2 files in 1 modules: src/lib/app(2)
out2 src/lib/features/canvas/canvas.service.ts 11 files in 7 modules: src/lib/core/filesystem(5) src/lib/contracts(1) src/lib/core/editor(1) src/lib/core/trash(1) src/lib/core/vault(1) +2 modules
## tests
test src/tests/lib/features/canvas/canvas.service.test.ts imports src/lib/features/canvas/canvas.service.ts mirror
test src/tests/lib/app/commands.new-commands.test.ts mocks src/lib/features/canvas/canvas.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/features/canvas/canvas.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/features/canvas/canvas.service.ts
## symbols
sym src/lib/features/canvas/canvas.service.ts:8 fn createCanvasFile(parentPath: string): Promise<string> L3 | Creates a new .canvas file with an empty canvas structure.
by src/lib/features/canvas/canvas.service.ts:createCanvasFile <- src/lib/app/commands.ts:178 in getBuiltInCommands call
by src/lib/features/canvas/canvas.service.ts:createCanvasFile <- src/lib/features/rail-shell/FilesNavigator.svelte:88 in fileCreators=$derived ref
## calls
call src/lib/features/canvas/canvas.service.ts:9 in createCanvasFile -> src/lib/core/filesystem/fs.service.ts:createFile call
call src/lib/features/canvas/canvas.service.ts:9 in createCanvasFile -> src/lib/features/canvas/canvas.logic.ts:createEmptyCanvas call
call src/lib/features/canvas/canvas.service.ts:9 in createCanvasFile -> src/lib/features/canvas/canvas.logic.ts:serializeCanvas call
