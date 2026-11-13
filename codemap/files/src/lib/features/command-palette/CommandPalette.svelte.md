# file card src/lib/features/command-palette/CommandPalette.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/command-palette/CommandPalette.svelte ' codemap/files
file src/lib/features/command-palette/CommandPalette.svelte component L72 module src/lib/features/command-palette in1 t1
## imports
imp src/lib/features/command-palette/CommandPalette.svelte:2 -> src/lib/components/ui/command/index.ts *
imp src/lib/features/command-palette/CommandPalette.svelte:4 -> src/lib/utils/keybindings.ts formatShortcut
imp src/lib/features/command-palette/CommandPalette.svelte:5 -> src/lib/features/command-palette/command-palette.store.svelte.ts commandPaletteStore
imp src/lib/features/command-palette/CommandPalette.svelte:6 -> src/lib/features/command-palette/command-palette.logic.ts filterAndRankCommands
imp src/lib/features/command-palette/CommandPalette.svelte:7 -> src/lib/features/command-palette/command-palette.types.ts type:AppCommand
## imported-by
imp src/lib/app/AppOverlays.svelte:6 -> src/lib/features/command-palette/CommandPalette.svelte default
## reach
in2 src/lib/features/command-palette/CommandPalette.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/command-palette/CommandPalette.svelte 12 files in 2 modules: src/lib/components(11) src/lib/utils(1)
## tests
test src/tests/lib/features/command-palette/CommandPalette.test.ts imports src/lib/features/command-palette/CommandPalette.svelte mirror
## symbols
sym src/lib/features/command-palette/CommandPalette.svelte:1 component CommandPalette props:commands L72
by src/lib/features/command-palette/CommandPalette.svelte:default <- src/lib/app/AppOverlays.svelte:19 in (markup) mount
## locals
local src/lib/features/command-palette/CommandPalette.svelte:20 fn handleOpenChange(open: boolean) L6
local src/lib/features/command-palette/CommandPalette.svelte:27 fn executeCommand(command: AppCommand) L11
## mounted-at
mount src/lib/app/AppOverlays.svelte:19 CommandPalette -> src/lib/features/command-palette/CommandPalette.svelte
## calls
call src/lib/features/command-palette/CommandPalette.svelte:17 in filteredCommands=$derived -> src/lib/features/command-palette/command-palette.logic.ts:filterAndRankCommands call
call src/lib/features/command-palette/CommandPalette.svelte:22 in handleOpenChange -> src/lib/features/command-palette/command-palette.store.svelte.ts:commandPaletteStore.close mcall
call src/lib/features/command-palette/CommandPalette.svelte:28 in executeCommand -> src/lib/features/command-palette/command-palette.store.svelte.ts:commandPaletteStore.addRecentCommand mcall
call src/lib/features/command-palette/CommandPalette.svelte:29 in executeCommand -> src/lib/features/command-palette/command-palette.store.svelte.ts:commandPaletteStore.close mcall
call src/lib/features/command-palette/CommandPalette.svelte:42 in (markup) -> src/lib/features/command-palette/CommandPalette.svelte:handleOpenChange markup
call src/lib/features/command-palette/CommandPalette.svelte:54 in (markup) -> src/lib/features/command-palette/CommandPalette.svelte:executeCommand markup
call src/lib/features/command-palette/CommandPalette.svelte:62 in (markup) -> src/lib/utils/keybindings.ts:formatShortcut markup
