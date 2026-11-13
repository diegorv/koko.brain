# file card src/lib/features/quick-switcher/quick-switcher.store.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts ' codemap/files
file src/lib/features/quick-switcher/quick-switcher.store.svelte.ts store L56 module src/lib/features/quick-switcher in5 t7
## imported-by
imp src/lib/app/boot.ts:12 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
imp src/lib/app/commands.ts:15 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
imp src/lib/app/global-keybindings.ts:9 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:14 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
imp src/lib/features/quick-switcher/quick-switcher.service.ts:1 -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts quickSwitcherStore
## reach
in2 src/lib/features/quick-switcher/quick-switcher.store.svelte.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/features/quick-switcher/quick-switcher.store.svelte.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/quick-switcher/quick-switcher.store.test.ts imports src/lib/features/quick-switcher/quick-switcher.store.svelte.ts mirror
test src/tests/lib/app/boot.test.ts imports src/lib/features/quick-switcher/quick-switcher.store.svelte.ts
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/features/quick-switcher/quick-switcher.store.svelte.ts
test src/tests/lib/core/filesystem/fs.service.test.ts imports src/lib/features/quick-switcher/quick-switcher.store.svelte.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/features/quick-switcher/quick-switcher.store.svelte.ts
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts imports src/lib/features/quick-switcher/quick-switcher.store.svelte.ts
test src/tests/lib/features/quick-switcher/quick-switcher.service.test.ts imports src/lib/features/quick-switcher/quick-switcher.store.svelte.ts
## symbols
sym src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:24 store quickSwitcherStore L33
by src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore <- src/lib/app/boot.ts:52 in registerAppPorts mcall
by src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore <- src/lib/app/commands.ts:198 in getBuiltInCommands mcall
by src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore <- src/lib/app/global-keybindings.ts:72 in GLOBAL_KEYBINDINGS mcall
by src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore <- src/lib/features/quick-switcher/QuickSwitcher.svelte:23 in filteredFiles=$derived member +6
by src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:quickSwitcherStore <- src/lib/features/quick-switcher/quick-switcher.service.ts:5 in resetQuickSwitcher mcall
## store
store src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:24 quickSwitcherStore esc:0
mem src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:25 get quickSwitcherStore.isOpen r:src/lib/features/quick-switcher/QuickSwitcher.svelte:64 w-via:open,close,toggle,reset
mem src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:26 get quickSwitcherStore.recentPaths r:src/lib/features/quick-switcher/QuickSwitcher.svelte:23 w-via:addRecentPath,removeRecentPath,reset
mem src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:28 do quickSwitcherStore.open w:-
mem src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:29 do quickSwitcherStore.close w:src/lib/features/quick-switcher/QuickSwitcher.svelte:29,src/lib/features/quick-switcher/QuickSwitcher.svelte:36,src/lib/features/quick-switcher/QuickSwitcher.svelte:58
mem src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:30 do quickSwitcherStore.toggle w:src/lib/app/commands.ts:198,src/lib/app/global-keybindings.ts:72
mem src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:32 do quickSwitcherStore.addRecentPath w:src/lib/features/quick-switcher/QuickSwitcher.svelte:35,src/lib/features/quick-switcher/QuickSwitcher.svelte:55
mem src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:39 do quickSwitcherStore.removeRecentPath w:src/lib/app/boot.ts:52 | Removes a path from the recent list (e.g. after file deletion)
mem src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:47 do quickSwitcherStore.reset w:src/lib/features/quick-switcher/quick-switcher.service.ts:5
## locals
local src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:7 fn loadRecentPaths(): string[] L8
local src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:16 fn persistRecentPaths(paths: string[]) L7
## calls
call src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:5 in recentPaths -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:loadRecentPaths call
call src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:35 in quickSwitcherStore.addRecentPath -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:persistRecentPaths call
call src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:43 in quickSwitcherStore.removeRecentPath -> src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:persistRecentPaths call
## effects
fx src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:9 storage.getItem in loadRecentPaths
fx src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:18 storage.setItem in persistRecentPaths
fx src/lib/features/quick-switcher/quick-switcher.store.svelte.ts:51 storage.removeItem in quickSwitcherStore.reset
