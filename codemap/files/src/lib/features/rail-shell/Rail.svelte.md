# file card src/lib/features/rail-shell/Rail.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/Rail.svelte ' codemap/files
file src/lib/features/rail-shell/Rail.svelte component L430 module src/lib/features/rail-shell in1 t3
## imports
imp src/lib/features/rail-shell/Rail.svelte:17 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/rail-shell/Rail.svelte:18 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/Rail.svelte:19 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/Rail.svelte:20 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/rail-shell/Rail.svelte:21 -> src/lib/core/settings/theme-surfaces.logic.ts resolveThemeColor,themeSurface
imp src/lib/features/rail-shell/Rail.svelte:22 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/rail-shell/Rail.svelte:23 -> src/lib/features/file-icons/file-icons.logic.ts iconColorCss,parseIconValuePermissive
imp src/lib/features/rail-shell/Rail.svelte:24 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/Rail.svelte:25 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/Rail.svelte:26 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/Rail.svelte:27 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/Rail.svelte:28 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder
imp src/lib/features/rail-shell/Rail.svelte:29 -> src/lib/features/type-definitions/inbox-workflow.logic.ts getInboxCount
imp src/lib/features/rail-shell/Rail.svelte:30 -> src/lib/features/rail-shell/lens.logic.ts pinnedRailItems
imp src/lib/features/rail-shell/Rail.svelte:31 -> src/lib/features/rail-shell/rail-items.logic.ts parseRailCollapsed,parseRailHidden,parseRailInboxBadge,parseRailOrder,parseRailStyle,parseRailWidth,GRAPH_TAB_RAIL_ITEM,RAIL_ACTIVE_TINT,RAIL_PIN_COLOR,RAIL_WIDTH,railActionColor,railBadgeColors,railFormWidth,railIconColor,railItemColor,railItems,TAGS_TAB_RAIL_ITEM,TASKS_TAB_RAIL_ITEM,type:RailItem
imp src/lib/features/rail-shell/Rail.svelte:52 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/Rail.svelte:53 -> src/lib/features/rail-shell/rail-shell.types.ts type:RailAction,type:RailPin
## imported-by
imp src/lib/app/AppShell.svelte:14 -> src/lib/features/rail-shell/Rail.svelte default
## reach
in2 src/lib/features/rail-shell/Rail.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/Rail.svelte 28 files in 11 modules: src/lib/utils(6) src/lib/core/settings(5) src/lib/features/collection(5) src/lib/core/filesystem(3) src/lib/core/editor(2) +6 modules
## tests
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/rail-shell/Rail.svelte mirror
test src/tests/lib/features/rail-shell/LayoutSection.test.ts imports src/lib/features/rail-shell/Rail.svelte
test src/tests/lib/plugins/mods/mod-rail-icon.test.ts imports src/lib/features/rail-shell/Rail.svelte
## symbols
sym src/lib/features/rail-shell/Rail.svelte:1 component Rail props:activeItem,onSelect L430
by src/lib/features/rail-shell/Rail.svelte:default <- src/lib/app/AppShell.svelte:203 in (markup) mount
## locals
local src/lib/features/rail-shell/Rail.svelte:172 fn onRail(hue: string): string L4
local src/lib/features/rail-shell/Rail.svelte:177 fn itemRow(item: RailItem): Row L14
local src/lib/features/rail-shell/Rail.svelte:192 fn pinRow(pin: RailPin): Row L14
local src/lib/features/rail-shell/Rail.svelte:208 fn actionRow(action: RailAction): Row L14
local src/lib/features/rail-shell/Rail.svelte:234 fn actionIcon(ref: string) L5
local src/lib/features/rail-shell/Rail.svelte:251 fn startResize(event: PointerEvent & { currentTarget: HTMLButtonElement }) L6
local src/lib/features/rail-shell/Rail.svelte:258 fn moveResize(event: PointerEvent) L3
local src/lib/features/rail-shell/Rail.svelte:262 fn endResize() L5
local src/lib/features/rail-shell/Rail.svelte:272 fn blockDragWhileResizing(event: DragEvent) L3
## mounts
mount src/lib/features/rail-shell/Rail.svelte:385 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/Rail.svelte:393 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:203 Rail -> src/lib/features/rail-shell/Rail.svelte
## calls
call src/lib/features/rail-shell/Rail.svelte:71 in inboxCount=$derived -> src/lib/features/type-definitions/inbox-workflow.logic.ts:getInboxCount call
call src/lib/features/rail-shell/Rail.svelte:72 in inboxCount=$derived -> src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder call
call src/lib/features/rail-shell/Rail.svelte:96 in items=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:railItems call
call src/lib/features/rail-shell/Rail.svelte:98 in items=$derived -> src/lib/features/rail-shell/lens.logic.ts:pinnedRailItems call
call src/lib/features/rail-shell/Rail.svelte:99 in items=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden call
call src/lib/features/rail-shell/Rail.svelte:100 in items=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailOrder call
call src/lib/features/rail-shell/Rail.svelte:103 in showsInboxBadge=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailInboxBadge call
call src/lib/features/rail-shell/Rail.svelte:147 in style=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailStyle call
call src/lib/features/rail-shell/Rail.svelte:148 in collapsed=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailCollapsed call
call src/lib/features/rail-shell/Rail.svelte:169 in railBg=$derived -> src/lib/core/settings/theme-surfaces.logic.ts:themeSurface call
call src/lib/features/rail-shell/Rail.svelte:173 in onRail -> src/lib/core/settings/theme-surfaces.logic.ts:resolveThemeColor call
call src/lib/features/rail-shell/Rail.svelte:174 in onRail -> src/lib/features/rail-shell/rail-items.logic.ts:railIconColor call
call src/lib/features/rail-shell/Rail.svelte:178 in itemRow -> src/lib/features/rail-shell/rail-items.logic.ts:railItemColor call
call src/lib/features/rail-shell/Rail.svelte:182 in itemRow -> src/lib/features/rail-shell/Rail.svelte:onRail call
call src/lib/features/rail-shell/Rail.svelte:193 in pinRow -> src/lib/features/file-icons/file-icons.logic.ts:iconColorCss call
call src/lib/features/rail-shell/Rail.svelte:193 in pinRow -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath call
call src/lib/features/rail-shell/Rail.svelte:197 in pinRow -> src/lib/features/rail-shell/Rail.svelte:onRail call
call src/lib/features/rail-shell/Rail.svelte:209 in actionRow -> src/lib/features/rail-shell/rail-items.logic.ts:railActionColor call
call src/lib/features/rail-shell/Rail.svelte:214 in actionRow -> src/lib/features/rail-shell/Rail.svelte:onRail call
call src/lib/features/rail-shell/Rail.svelte:223 in topRows=$derived -> src/lib/features/rail-shell/Rail.svelte:itemRow ref
call src/lib/features/rail-shell/Rail.svelte:224 in navigatorRows=$derived -> src/lib/features/rail-shell/Rail.svelte:itemRow ref
call src/lib/features/rail-shell/Rail.svelte:225 in tabRows=$derived -> src/lib/features/rail-shell/Rail.svelte:itemRow ref
call src/lib/features/rail-shell/Rail.svelte:226 in pinRows=$derived -> src/lib/features/rail-shell/Rail.svelte:pinRow ref
call src/lib/features/rail-shell/Rail.svelte:227 in actionRows=$derived -> src/lib/features/rail-shell/Rail.svelte:actionRow ref
call src/lib/features/rail-shell/Rail.svelte:228 in bottomRows=$derived -> src/lib/features/rail-shell/Rail.svelte:itemRow ref
call src/lib/features/rail-shell/Rail.svelte:236 in actionIcon -> src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive call
call src/lib/features/rail-shell/Rail.svelte:237 in actionIcon -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/rail-shell/Rail.svelte:248 in width=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailWidth call
call src/lib/features/rail-shell/Rail.svelte:249 in frameWidth=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:railFormWidth call
call src/lib/features/rail-shell/Rail.svelte:259 in moveResize -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailWidth call
call src/lib/features/rail-shell/Rail.svelte:263 in endResize -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/Rail.svelte:277 in (markup) -> src/lib/features/rail-shell/Rail.svelte:blockDragWhileResizing markup
call src/lib/features/rail-shell/Rail.svelte:289 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout markup +1
call src/lib/features/rail-shell/Rail.svelte:364 in (markup) -> src/lib/features/rail-shell/Rail.svelte:startResize markup
call src/lib/features/rail-shell/Rail.svelte:365 in (markup) -> src/lib/features/rail-shell/Rail.svelte:moveResize markup
call src/lib/features/rail-shell/Rail.svelte:366 in (markup) -> src/lib/features/rail-shell/Rail.svelte:endResize markup +1
call src/lib/features/rail-shell/Rail.svelte:380 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/rail-shell/Rail.svelte:382 in (markup) -> src/lib/features/rail-shell/Rail.svelte:actionIcon markup
call src/lib/features/rail-shell/Rail.svelte:423 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:railBadgeColors markup
## effects
fx src/lib/features/rail-shell/Rail.svelte:277 dom.dragstart svelte:window in (markup)
