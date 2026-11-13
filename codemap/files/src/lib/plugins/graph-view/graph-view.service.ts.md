# file card src/lib/plugins/graph-view/graph-view.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/graph-view/graph-view.service.ts ' codemap/files
file src/lib/plugins/graph-view/graph-view.service.ts service L76 module src/lib/plugins/graph-view in5 t6
## imports
imp src/lib/plugins/graph-view/graph-view.service.ts:1 -> src/lib/contracts/ipc.ts call
imp src/lib/plugins/graph-view/graph-view.service.ts:2 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/graph-view/graph-view.service.ts:3 -> src/lib/core/editor/editor.logic.ts findTabIndex,GRAPH_VIRTUAL_PATH,isMarkdownNoteTab
imp src/lib/plugins/graph-view/graph-view.service.ts:4 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/plugins/graph-view/graph-view.service.ts:5 -> src/lib/plugins/graph-view/graph-view.logic.ts buildGraphData
imp src/lib/plugins/graph-view/graph-view.service.ts:6 -> src/lib/plugins/graph-view/graph-view.store.svelte.ts graphViewStore
imp src/lib/plugins/graph-view/graph-view.service.ts:7 -> src/lib/plugins/graph-view/graph-view.types.ts type:GraphData
## imported-by
imp src/lib/app/commands.ts:23 -> src/lib/plugins/graph-view/graph-view.service.ts toggleGraphTab
imp src/lib/app/global-keybindings.ts:12 -> src/lib/plugins/graph-view/graph-view.service.ts toggleGraphTab
imp src/lib/app/lifecycle/app-lifecycle.service.ts:43 -> src/lib/plugins/graph-view/graph-view.service.ts resetGraphView
imp src/lib/plugins/graph-view/GraphControls.svelte:8 -> src/lib/plugins/graph-view/graph-view.service.ts closeGraphTab
imp src/lib/plugins/graph-view/GraphView.svelte:18 -> src/lib/plugins/graph-view/graph-view.service.ts buildGraph
## reach
in2 src/lib/plugins/graph-view/graph-view.service.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/plugins/graph-view/graph-view.service.ts 9 files in 6 modules: src/lib/contracts(2) src/lib/core/filesystem(2) src/lib/utils(2) src/lib/core/editor(1) src/lib/core/vault(1) +1 modules
## tests
test src/tests/lib/plugins/graph-view/graph-view.service.test.ts imports src/lib/plugins/graph-view/graph-view.service.ts mirror
test src/tests/lib/plugins/graph-view/GraphView.test.ts imports src/lib/plugins/graph-view/graph-view.service.ts
test src/tests/lib/app/commands.test.ts mocks src/lib/plugins/graph-view/graph-view.service.ts
test src/tests/lib/app/global-keybindings.test.ts mocks src/lib/plugins/graph-view/graph-view.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/plugins/graph-view/graph-view.service.ts
test src/tests/lib/features/command-palette/CommandPalette.test.ts mocks src/lib/plugins/graph-view/graph-view.service.ts
## symbols
sym src/lib/plugins/graph-view/graph-view.service.ts:14 fn buildGraph(): Promise<GraphData> L4 | Fetches the full vault index snapshot from Rust and builds the graph representation.
by src/lib/plugins/graph-view/graph-view.service.ts:buildGraph <- src/lib/plugins/graph-view/GraphView.svelte:83 in loadAndRebuild call
sym src/lib/plugins/graph-view/graph-view.service.ts:34 fn openGraphTab(): void L16 | Opens or focuses the Graph View tab.
sym src/lib/plugins/graph-view/graph-view.service.ts:52 fn closeGraphTab(): void L6 | Closes the Graph View tab if it exists.
by src/lib/plugins/graph-view/graph-view.service.ts:closeGraphTab <- src/lib/plugins/graph-view/GraphControls.svelte:69 in (markup) markup
sym src/lib/plugins/graph-view/graph-view.service.ts:60 fn toggleGraphTab(): void L11 | Toggles the Graph View tab: opens if closed, closes if active, focuses if open but not active.
by src/lib/plugins/graph-view/graph-view.service.ts:toggleGraphTab <- src/lib/app/commands.ts:213 in getBuiltInCommands call
by src/lib/plugins/graph-view/graph-view.service.ts:toggleGraphTab <- src/lib/app/global-keybindings.ts:112 in GLOBAL_KEYBINDINGS call
sym src/lib/plugins/graph-view/graph-view.service.ts:73 fn resetGraphView() L4 | Resets all graph view state
by src/lib/plugins/graph-view/graph-view.service.ts:resetGraphView <- src/lib/app/lifecycle/app-lifecycle.service.ts:667 in teardownVault call
## locals
local src/lib/plugins/graph-view/graph-view.service.ts:24 fn captureCenterPath(): void L4
## calls
call src/lib/plugins/graph-view/graph-view.service.ts:15 in buildGraph -> src/lib/contracts/ipc.ts:call call
call src/lib/plugins/graph-view/graph-view.service.ts:16 in buildGraph -> src/lib/plugins/graph-view/graph-view.logic.ts:buildGraphData call
call src/lib/plugins/graph-view/graph-view.service.ts:26 in captureCenterPath -> src/lib/core/editor/editor.logic.ts:isMarkdownNoteTab call
call src/lib/plugins/graph-view/graph-view.service.ts:26 in captureCenterPath -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.setCenterPath mcall
call src/lib/plugins/graph-view/graph-view.service.ts:36 in openGraphTab -> src/lib/plugins/graph-view/graph-view.service.ts:captureCenterPath call
call src/lib/plugins/graph-view/graph-view.service.ts:37 in openGraphTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/plugins/graph-view/graph-view.service.ts:39 in openGraphTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/plugins/graph-view/graph-view.service.ts:42 in openGraphTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.addTab mcall
call src/lib/plugins/graph-view/graph-view.service.ts:53 in closeGraphTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/plugins/graph-view/graph-view.service.ts:55 in closeGraphTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/plugins/graph-view/graph-view.service.ts:61 in toggleGraphTab -> src/lib/core/editor/editor.logic.ts:findTabIndex call
call src/lib/plugins/graph-view/graph-view.service.ts:63 in toggleGraphTab -> src/lib/plugins/graph-view/graph-view.service.ts:openGraphTab call
call src/lib/plugins/graph-view/graph-view.service.ts:65 in toggleGraphTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.removeTab mcall
call src/lib/plugins/graph-view/graph-view.service.ts:67 in toggleGraphTab -> src/lib/plugins/graph-view/graph-view.service.ts:captureCenterPath call
call src/lib/plugins/graph-view/graph-view.service.ts:68 in toggleGraphTab -> src/lib/core/editor/editor.store.svelte.ts:editorStore.setActiveIndex mcall
call src/lib/plugins/graph-view/graph-view.service.ts:74 in resetGraphView -> src/lib/plugins/graph-view/graph-view.store.svelte.ts:graphViewStore.reset mcall
call src/lib/plugins/graph-view/graph-view.service.ts:75 in resetGraphView -> src/lib/plugins/graph-view/graph-view.service.ts:closeGraphTab call
## effects
ipc-call src/lib/plugins/graph-view/graph-view.service.ts:15 in buildGraph -> ipc:get_all_vault_entries_v2 -> src-tauri/src/commands/vault.rs:563
