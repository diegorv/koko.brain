# file card src/lib/core/layout/layout.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/layout/layout.service.ts ' codemap/files
file src/lib/core/layout/layout.service.ts service L34 module src/lib/core/layout in3 t1
## imports
imp src/lib/core/layout/layout.service.ts:1 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/layout/layout.service.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/layout/layout.service.ts:3 -> src/lib/core/layout/layout.logic.ts hidesRightSidebar
## imported-by
imp src/lib/app/AppShell.svelte:55 -> src/lib/core/layout/layout.service.ts toggleRightSidebar
imp src/lib/app/commands.ts:51 -> src/lib/core/layout/layout.service.ts hideRailPanels,showRailPanels,toggleLeftSidebar,toggleRightSidebar
imp src/lib/app/global-keybindings.ts:21 -> src/lib/core/layout/layout.service.ts hideRailPanels,showRailPanels,toggleLeftSidebar,toggleRightSidebar
## reach
in2 src/lib/core/layout/layout.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/core/layout/layout.service.ts 6 files in 3 modules: src/lib/core/settings(3) src/lib/core/editor(2) src/lib/core/filesystem(1)
## tests
test src/tests/lib/core/layout/layout.service.test.ts imports src/lib/core/layout/layout.service.ts mirror
## symbols
sym src/lib/core/layout/layout.service.ts:10 fn toggleLeftSidebar(): void L3 | Toggles the panels between the rail and the editor (navigator, note list); the rail itself never hides.
by src/lib/core/layout/layout.service.ts:toggleLeftSidebar <- src/lib/app/commands.ts:299 in getBuiltInCommands ref
by src/lib/core/layout/layout.service.ts:toggleLeftSidebar <- src/lib/app/global-keybindings.ts:138 in GLOBAL_KEYBINDINGS ref
sym src/lib/core/layout/layout.service.ts:15 fn hideRailPanels(): void L3 | Hides the panels between the rail and the editor (Cmd+1, "Hide Rail Panels").
by src/lib/core/layout/layout.service.ts:hideRailPanels <- src/lib/app/commands.ts:306 in getBuiltInCommands ref
by src/lib/core/layout/layout.service.ts:hideRailPanels <- src/lib/app/global-keybindings.ts:140 in GLOBAL_KEYBINDINGS ref
sym src/lib/core/layout/layout.service.ts:20 fn showRailPanels(): void L3 | Shows the panels between the rail and the editor (Cmd+2, "Show Rail Panels").
by src/lib/core/layout/layout.service.ts:showRailPanels <- src/lib/app/commands.ts:313 in getBuiltInCommands ref
by src/lib/core/layout/layout.service.ts:showRailPanels <- src/lib/app/global-keybindings.ts:141 in GLOBAL_KEYBINDINGS ref
sym src/lib/core/layout/layout.service.ts:30 fn toggleRightSidebar(): void L5 | Toggles the right sidebar visibility.
by src/lib/core/layout/layout.service.ts:toggleRightSidebar <- src/lib/app/AppShell.svelte:192 in (markup) markup
by src/lib/core/layout/layout.service.ts:toggleRightSidebar <- src/lib/app/commands.ts:320 in getBuiltInCommands call
by src/lib/core/layout/layout.service.ts:toggleRightSidebar <- src/lib/app/global-keybindings.ts:146 in GLOBAL_KEYBINDINGS ref
## calls
call src/lib/core/layout/layout.service.ts:11 in toggleLeftSidebar -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/core/layout/layout.service.ts:16 in hideRailPanels -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/core/layout/layout.service.ts:21 in showRailPanels -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/core/layout/layout.service.ts:31 in toggleRightSidebar -> src/lib/core/layout/layout.logic.ts:hidesRightSidebar call
call src/lib/core/layout/layout.service.ts:33 in toggleRightSidebar -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
