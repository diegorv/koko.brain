# file card src/lib/app/rail-navigation.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/app/rail-navigation.ts ' codemap/files
file src/lib/app/rail-navigation.ts other L59 module src/lib/app in3 t1
## imports
imp src/lib/app/rail-navigation.ts:1 -> src/lib/core/editor/editor.service.ts openFileInEditor
imp src/lib/app/rail-navigation.ts:2 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/app/rail-navigation.ts:3 -> src/lib/features/search/open-search.service.ts openSearch
imp src/lib/app/rail-navigation.ts:4 -> src/lib/features/rail-shell/lens.logic.ts SEARCH_RAIL_ITEM,TYPES_RAIL_ITEM,VIEW_LENS_KIND
imp src/lib/app/rail-navigation.ts:5 -> src/lib/features/rail-shell/rail-items.logic.ts GRAPH_TAB_RAIL_ITEM,TAGS_TAB_RAIL_ITEM,TASKS_TAB_RAIL_ITEM,type:RailItem
imp src/lib/app/rail-navigation.ts:11 -> src/lib/features/tags/tags.service.ts openTagsTab
imp src/lib/app/rail-navigation.ts:12 -> src/lib/features/tasks/tasks.service.ts openTasksTab
imp src/lib/app/rail-navigation.ts:13 -> src/lib/plugins/graph-view/graph-view.service.ts openGraphTab
## imported-by
imp src/lib/app/AppShell.svelte:41 -> src/lib/app/rail-navigation.ts selectRailItem
imp src/lib/app/commands.ts:55 -> src/lib/app/rail-navigation.ts openRailView,selectRailItem
imp src/lib/app/editor-host.ts:36 -> src/lib/app/rail-navigation.ts openRailView
## reach
in2 src/lib/app/rail-navigation.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/app/rail-navigation.ts 49 files in 15 modules: src/lib/features/tasks(8) src/lib/utils(8) src/lib/features/collection(5) src/lib/core/editor(4) src/lib/core/filesystem(4) +10 modules
## tests
test src/tests/lib/app/rail-navigation.test.ts imports src/lib/app/rail-navigation.ts mirror
## symbols
sym src/lib/app/rail-navigation.ts:25 fn selectRailItem(item: Pick<RailItem, 'key' | 'pin'>): void L21 | What a click on a rail item does, and the only place that decides it: the rail hands every click here (with the pin, for a pinned item), and so do the palette'…
by src/lib/app/rail-navigation.ts:selectRailItem <- src/lib/app/AppShell.svelte:205 in (markup) markup
by src/lib/app/rail-navigation.ts:selectRailItem <- src/lib/app/commands.ts:73 in railGoToCommands call
sym src/lib/app/rail-navigation.ts:53 fn openRailView(path: string, opensInEditor: boolean): void L7 | Does what a click on the view's Views row does, for the palette's Open view commands: a view with `_open_in_editor` opens in the editor and leaves the layout a…
by src/lib/app/rail-navigation.ts:openRailView <- src/lib/app/commands.ts:110 in openViewCommands call
by src/lib/app/rail-navigation.ts:openRailView <- src/lib/app/editor-host.ts:187 in appEditorHost.openView call
## calls
call src/lib/app/rail-navigation.ts:28 in selectRailItem -> src/lib/features/search/open-search.service.ts:openSearch call
call src/lib/app/rail-navigation.ts:31 in selectRailItem -> src/lib/features/tasks/tasks.service.ts:openTasksTab call
call src/lib/app/rail-navigation.ts:34 in selectRailItem -> src/lib/plugins/graph-view/graph-view.service.ts:openGraphTab call
call src/lib/app/rail-navigation.ts:37 in selectRailItem -> src/lib/features/tags/tags.service.ts:openTagsTab call
call src/lib/app/rail-navigation.ts:41 in selectRailItem -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/app/rail-navigation.ts:44 in selectRailItem -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/app/rail-navigation.ts:55 in openRailView -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/app/rail-navigation.ts:58 in openRailView -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
