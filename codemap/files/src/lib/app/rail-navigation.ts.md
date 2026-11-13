# file card src/lib/app/rail-navigation.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/rail-navigation.ts ' codemap/files
file src/lib/app/rail-navigation.ts other L38 module src/lib/app in3 t1
## imports
imp src/lib/app/rail-navigation.ts:1 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/app/rail-navigation.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/rail-navigation.ts:3 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/app/rail-navigation.ts:4 -> src/lib/features/rail-shell/lens.logic.ts SEARCH_RAIL_ITEM,TYPES_RAIL_ITEM,VIEW_LENS_KIND
imp src/lib/app/rail-navigation.ts:5 -> src/lib/features/rail-shell/rail-items.logic.ts type:RailItem
## imported-by
imp src/lib/app/AppShell.svelte:41 -> src/lib/app/rail-navigation.ts selectRailItem
imp src/lib/app/commands.ts:54 -> src/lib/app/rail-navigation.ts openRailView,selectRailItem
imp src/lib/app/editor-host.ts:36 -> src/lib/app/rail-navigation.ts openRailView
## reach
in2 src/lib/app/rail-navigation.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/app/rail-navigation.ts 30 files in 10 modules: src/lib/utils(6) src/lib/features/collection(5) src/lib/core/editor(4) src/lib/core/settings(4) src/lib/features/type-definitions(4) +5 modules
## tests
test src/tests/lib/app/rail-navigation.test.ts imports src/lib/app/rail-navigation.ts mirror
## symbols
sym src/lib/app/rail-navigation.ts:14 fn selectRailItem(item: Pick<RailItem, 'key' | 'pin'>): void L11 | What a click on a rail item does, and the only place that decides it: the rail hands every click here (with the pin, for a pinned item), and so do the palette'…
by src/lib/app/rail-navigation.ts:selectRailItem <- src/lib/app/AppShell.svelte:203 in (markup) markup
by src/lib/app/rail-navigation.ts:selectRailItem <- src/lib/app/commands.ts:70 in railGoToCommands call
sym src/lib/app/rail-navigation.ts:32 fn openRailView(path: string, opensInEditor: boolean): void L7 | Does what a click on the view's Views row does, for the palette's Open view commands: a view with `_open_in_editor` opens in the editor and leaves the layout a…
by src/lib/app/rail-navigation.ts:openRailView <- src/lib/app/commands.ts:107 in openViewCommands call
by src/lib/app/rail-navigation.ts:openRailView <- src/lib/app/editor-host.ts:187 in appEditorHost.openView call
## calls
call src/lib/app/rail-navigation.ts:16 in selectRailItem -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/app/rail-navigation.ts:20 in selectRailItem -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/app/rail-navigation.ts:23 in selectRailItem -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/app/rail-navigation.ts:34 in openRailView -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/app/rail-navigation.ts:37 in openRailView -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
