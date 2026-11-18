# file card src/lib/core/layout/layout.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/layout/layout.service.ts ' codemap/files
file src/lib/core/layout/layout.service.ts service L62 module src/lib/core/layout in3 t1
## imports
imp src/lib/core/layout/layout.service.ts:1 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/core/layout/layout.service.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/layout/layout.service.ts:3 -> src/lib/core/settings/settings.types.ts type:LayoutSettings
imp src/lib/core/layout/layout.service.ts:4 -> src/lib/core/layout/layout.logic.ts hidesRightSidebar
## imported-by
imp src/lib/app/AppShell.svelte:55 -> src/lib/core/layout/layout.service.ts toggleRightSidebar
imp src/lib/app/commands.ts:52 -> src/lib/core/layout/layout.service.ts hideRailPanels,showRailPanels,toggleLeftSidebar,toggleRightPanel,toggleRightSidebar
imp src/lib/app/global-keybindings.ts:21 -> src/lib/core/layout/layout.service.ts hideRailPanels,showRailPanels,toggleLeftSidebar,toggleRightSidebar
## reach
in2 src/lib/core/layout/layout.service.ts 2 files in 2 modules: src/lib/app(1) src/routes(1)
out2 src/lib/core/layout/layout.service.ts 6 files in 3 modules: src/lib/core/settings(3) src/lib/core/editor(2) src/lib/core/filesystem(1)
## tests
test src/tests/lib/core/layout/layout.service.test.ts imports src/lib/core/layout/layout.service.ts mirror
## symbols
sym src/lib/core/layout/layout.service.ts:11 fn toggleLeftSidebar(): void L3 | Toggles the panels between the rail and the editor (navigator, note list); the rail itself never hides.
by src/lib/core/layout/layout.service.ts:toggleLeftSidebar <- src/lib/app/commands.ts:309 in getBuiltInCommands ref
by src/lib/core/layout/layout.service.ts:toggleLeftSidebar <- src/lib/app/global-keybindings.ts:138 in GLOBAL_KEYBINDINGS ref
sym src/lib/core/layout/layout.service.ts:16 fn hideRailPanels(): void L3 | Hides the panels between the rail and the editor (Cmd+1, "Hide Rail Panels").
by src/lib/core/layout/layout.service.ts:hideRailPanels <- src/lib/app/commands.ts:316 in getBuiltInCommands ref
by src/lib/core/layout/layout.service.ts:hideRailPanels <- src/lib/app/global-keybindings.ts:140 in GLOBAL_KEYBINDINGS ref
sym src/lib/core/layout/layout.service.ts:21 fn showRailPanels(): void L3 | Shows the panels between the rail and the editor (Cmd+2, "Show Rail Panels").
by src/lib/core/layout/layout.service.ts:showRailPanels <- src/lib/app/commands.ts:323 in getBuiltInCommands ref
by src/lib/core/layout/layout.service.ts:showRailPanels <- src/lib/app/global-keybindings.ts:141 in GLOBAL_KEYBINDINGS ref
sym src/lib/core/layout/layout.service.ts:31 fn toggleRightSidebar(): void L5 | Toggles the right sidebar visibility.
by src/lib/core/layout/layout.service.ts:toggleRightSidebar <- src/lib/app/AppShell.svelte:192 in (markup) markup
by src/lib/core/layout/layout.service.ts:toggleRightSidebar <- src/lib/app/commands.ts:330 in getBuiltInCommands call
by src/lib/core/layout/layout.service.ts:toggleRightSidebar <- src/lib/app/global-keybindings.ts:146 in GLOBAL_KEYBINDINGS ref
sym src/lib/core/layout/layout.service.ts:38 type RightPanel L1 | A right sidebar panel with its own `<panel>Visible` layout flag.
sym src/lib/core/layout/layout.service.ts:48 fn setRightPanelVisible(panel: RightPanel, visible: boolean): void L6 | Shows or hides one right sidebar panel.
sym src/lib/core/layout/layout.service.ts:60 fn toggleRightPanel(panel: RightPanel): void L3 | Flips one right sidebar panel through `setRightPanelVisible`.
by src/lib/core/layout/layout.service.ts:toggleRightPanel <- src/lib/app/commands.ts:336 in getBuiltInCommands call +3
## calls
call src/lib/core/layout/layout.service.ts:12 in toggleLeftSidebar -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/core/layout/layout.service.ts:17 in hideRailPanels -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/core/layout/layout.service.ts:22 in showRailPanels -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/core/layout/layout.service.ts:32 in toggleRightSidebar -> src/lib/core/layout/layout.logic.ts:hidesRightSidebar call
call src/lib/core/layout/layout.service.ts:34 in toggleRightSidebar -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/core/layout/layout.service.ts:51 in setRightPanelVisible -> src/lib/core/layout/layout.logic.ts:hidesRightSidebar call
call src/lib/core/layout/layout.service.ts:52 in setRightPanelVisible -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/core/layout/layout.service.ts:61 in toggleRightPanel -> src/lib/core/layout/layout.service.ts:setRightPanelVisible call
