# file card src/lib/features/command-palette/command-palette.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/command-palette/command-palette.store.svelte.ts ' codemap/files
file src/lib/features/command-palette/command-palette.store.svelte.ts store L57 module src/lib/features/command-palette in3 t4
## imported-by
imp src/lib/app/global-keybindings.ts:15 -> src/lib/features/command-palette/command-palette.store.svelte.ts commandPaletteStore
imp src/lib/features/command-palette/CommandPalette.svelte:5 -> src/lib/features/command-palette/command-palette.store.svelte.ts commandPaletteStore
imp src/lib/features/command-palette/command-palette.service.ts:1 -> src/lib/features/command-palette/command-palette.store.svelte.ts commandPaletteStore
## reach
in2 src/lib/features/command-palette/command-palette.store.svelte.ts 4 files in 2 modules: src/lib/app(3) src/routes(1)
out2 src/lib/features/command-palette/command-palette.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/command-palette/command-palette.store.test.ts imports src/lib/features/command-palette/command-palette.store.svelte.ts mirror
test src/tests/lib/app/AppOverlays.test.ts imports src/lib/features/command-palette/command-palette.store.svelte.ts
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/features/command-palette/command-palette.store.svelte.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts imports src/lib/features/command-palette/command-palette.store.svelte.ts
## symbols
sym src/lib/features/command-palette/command-palette.store.svelte.ts:24 store commandPaletteStore L34
by src/lib/features/command-palette/command-palette.store.svelte.ts:commandPaletteStore <- src/lib/app/global-keybindings.ts:66 in GLOBAL_KEYBINDINGS mcall
by src/lib/features/command-palette/command-palette.store.svelte.ts:commandPaletteStore <- src/lib/features/command-palette/CommandPalette.svelte:17 in filteredCommands=$derived member +4
by src/lib/features/command-palette/command-palette.store.svelte.ts:commandPaletteStore <- src/lib/features/command-palette/command-palette.service.ts:5 in resetCommandPalette mcall
## store
store src/lib/features/command-palette/command-palette.store.svelte.ts:24 commandPaletteStore esc:0
mem src/lib/features/command-palette/command-palette.store.svelte.ts:25 get commandPaletteStore.isOpen r:src/lib/features/command-palette/CommandPalette.svelte:41 w-via:open,close,toggle,reset
mem src/lib/features/command-palette/command-palette.store.svelte.ts:28 get commandPaletteStore.recentCommandIds r:src/lib/features/command-palette/CommandPalette.svelte:17 w-via:addRecentCommand,reset
mem src/lib/features/command-palette/command-palette.store.svelte.ts:32 do commandPaletteStore.open w:-
mem src/lib/features/command-palette/command-palette.store.svelte.ts:35 do commandPaletteStore.close w:src/lib/features/command-palette/CommandPalette.svelte:22,src/lib/features/command-palette/CommandPalette.svelte:29
mem src/lib/features/command-palette/command-palette.store.svelte.ts:38 do commandPaletteStore.toggle w:src/lib/app/global-keybindings.ts:66
mem src/lib/features/command-palette/command-palette.store.svelte.ts:42 do commandPaletteStore.addRecentCommand w:src/lib/features/command-palette/CommandPalette.svelte:28
mem src/lib/features/command-palette/command-palette.store.svelte.ts:48 do commandPaletteStore.reset w:src/lib/features/command-palette/command-palette.service.ts:5
## locals
local src/lib/features/command-palette/command-palette.store.svelte.ts:7 fn loadRecentCommandIds(): string[] L8
local src/lib/features/command-palette/command-palette.store.svelte.ts:16 fn persistRecentCommandIds(ids: string[]) L7
## calls
call src/lib/features/command-palette/command-palette.store.svelte.ts:5 in recentCommandIds -> src/lib/features/command-palette/command-palette.store.svelte.ts:loadRecentCommandIds call
call src/lib/features/command-palette/command-palette.store.svelte.ts:45 in commandPaletteStore.addRecentCommand -> src/lib/features/command-palette/command-palette.store.svelte.ts:persistRecentCommandIds call
## effects
fx src/lib/features/command-palette/command-palette.store.svelte.ts:9 storage.getItem in loadRecentCommandIds
fx src/lib/features/command-palette/command-palette.store.svelte.ts:18 storage.setItem in persistRecentCommandIds
fx src/lib/features/command-palette/command-palette.store.svelte.ts:52 storage.removeItem in commandPaletteStore.reset
