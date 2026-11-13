# file card src/lib/features/rail-shell/Rail.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/Rail.svelte ' codemap/files
file src/lib/features/rail-shell/Rail.svelte component L380 module src/lib/features/rail-shell in1 t3
## imports
imp src/lib/features/rail-shell/Rail.svelte:14 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/features/rail-shell/Rail.svelte:15 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/rail-shell/Rail.svelte:16 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/Rail.svelte:17 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/rail-shell/Rail.svelte:18 -> src/lib/features/file-icons/file-icons.icon-data.ts getIconSync
imp src/lib/features/rail-shell/Rail.svelte:19 -> src/lib/features/file-icons/file-icons.logic.ts iconColorCss,parseIconValuePermissive
imp src/lib/features/rail-shell/Rail.svelte:20 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/rail-shell/Rail.svelte:21 -> src/lib/features/file-icons/icon-resolver.ts resolveIconForPath
imp src/lib/features/rail-shell/Rail.svelte:22 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/rail-shell/Rail.svelte:23 -> src/lib/features/type-definitions/type-definitions.store.svelte.ts typeDefinitionsStore
imp src/lib/features/rail-shell/Rail.svelte:24 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder
imp src/lib/features/rail-shell/Rail.svelte:25 -> src/lib/features/type-definitions/inbox-workflow.logic.ts getInboxCount
imp src/lib/features/rail-shell/Rail.svelte:26 -> src/lib/features/rail-shell/lens.logic.ts pinnedRailItems
imp src/lib/features/rail-shell/Rail.svelte:27 -> src/lib/features/rail-shell/rail-items.logic.ts parseRailCollapsed,parseRailHidden,parseRailInboxBadge,parseRailOrder,parseRailStyle,parseRailWidth,RAIL_PIN_COLOR,RAIL_WIDTH,railActionColor,railFormWidth,railItemColor,railItems,type:RailItem
imp src/lib/features/rail-shell/Rail.svelte:42 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
imp src/lib/features/rail-shell/Rail.svelte:43 -> src/lib/features/rail-shell/rail-shell.types.ts type:RailAction,type:RailPin
## imported-by
imp src/lib/app/AppShell.svelte:14 -> src/lib/features/rail-shell/Rail.svelte default
## reach
in2 src/lib/features/rail-shell/Rail.svelte 1 files in 1 modules: src/routes(1)
out2 src/lib/features/rail-shell/Rail.svelte 27 files in 11 modules: src/lib/core/settings(5) src/lib/features/collection(5) src/lib/utils(5) src/lib/core/filesystem(3) src/lib/core/editor(2) +6 modules
## tests
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/rail-shell/Rail.svelte mirror
test src/tests/lib/features/rail-shell/LayoutSection.test.ts imports src/lib/features/rail-shell/Rail.svelte
test src/tests/lib/plugins/mods/mod-rail-icon.test.ts imports src/lib/features/rail-shell/Rail.svelte
## symbols
sym src/lib/features/rail-shell/Rail.svelte:1 component Rail props:activeItem,onSelect L380
by src/lib/features/rail-shell/Rail.svelte:default <- src/lib/app/AppShell.svelte:201 in (markup) mount
## locals
local src/lib/features/rail-shell/Rail.svelte:151 fn itemRow(item: RailItem): Row L11
local src/lib/features/rail-shell/Rail.svelte:163 fn pinRow(pin: RailPin): Row L12
local src/lib/features/rail-shell/Rail.svelte:177 fn actionRow(action: RailAction): Row L11
local src/lib/features/rail-shell/Rail.svelte:199 fn actionIcon(ref: string) L5
local src/lib/features/rail-shell/Rail.svelte:216 fn startResize(event: PointerEvent & { currentTarget: HTMLButtonElement }) L6
local src/lib/features/rail-shell/Rail.svelte:223 fn moveResize(event: PointerEvent) L3
local src/lib/features/rail-shell/Rail.svelte:227 fn endResize() L5
local src/lib/features/rail-shell/Rail.svelte:237 fn blockDragWhileResizing(event: DragEvent) L3
## mounts
mount src/lib/features/rail-shell/Rail.svelte:341 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/rail-shell/Rail.svelte:348 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/app/AppShell.svelte:201 Rail -> src/lib/features/rail-shell/Rail.svelte
## calls
call src/lib/features/rail-shell/Rail.svelte:61 in inboxCount=$derived -> src/lib/features/type-definitions/inbox-workflow.logic.ts:getInboxCount call
call src/lib/features/rail-shell/Rail.svelte:62 in inboxCount=$derived -> src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder call
call src/lib/features/rail-shell/Rail.svelte:83 in items=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:railItems call
call src/lib/features/rail-shell/Rail.svelte:85 in items=$derived -> src/lib/features/rail-shell/lens.logic.ts:pinnedRailItems call
call src/lib/features/rail-shell/Rail.svelte:86 in items=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden call
call src/lib/features/rail-shell/Rail.svelte:87 in items=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailOrder call
call src/lib/features/rail-shell/Rail.svelte:90 in showsInboxBadge=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailInboxBadge call
call src/lib/features/rail-shell/Rail.svelte:132 in style=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailStyle call
call src/lib/features/rail-shell/Rail.svelte:133 in collapsed=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailCollapsed call
call src/lib/features/rail-shell/Rail.svelte:155 in itemRow -> src/lib/features/rail-shell/rail-items.logic.ts:railItemColor call
call src/lib/features/rail-shell/Rail.svelte:167 in pinRow -> src/lib/features/file-icons/file-icons.logic.ts:iconColorCss call
call src/lib/features/rail-shell/Rail.svelte:167 in pinRow -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath call
call src/lib/features/rail-shell/Rail.svelte:181 in actionRow -> src/lib/features/rail-shell/rail-items.logic.ts:railActionColor call
call src/lib/features/rail-shell/Rail.svelte:189 in topRows=$derived -> src/lib/features/rail-shell/Rail.svelte:itemRow ref
call src/lib/features/rail-shell/Rail.svelte:190 in navigatorRows=$derived -> src/lib/features/rail-shell/Rail.svelte:itemRow ref
call src/lib/features/rail-shell/Rail.svelte:191 in pinRows=$derived -> src/lib/features/rail-shell/Rail.svelte:pinRow ref
call src/lib/features/rail-shell/Rail.svelte:192 in actionRows=$derived -> src/lib/features/rail-shell/Rail.svelte:actionRow ref
call src/lib/features/rail-shell/Rail.svelte:193 in bottomRows=$derived -> src/lib/features/rail-shell/Rail.svelte:itemRow ref
call src/lib/features/rail-shell/Rail.svelte:201 in actionIcon -> src/lib/features/file-icons/file-icons.logic.ts:parseIconValuePermissive call
call src/lib/features/rail-shell/Rail.svelte:202 in actionIcon -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/rail-shell/Rail.svelte:213 in width=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailWidth call
call src/lib/features/rail-shell/Rail.svelte:214 in frameWidth=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:railFormWidth call
call src/lib/features/rail-shell/Rail.svelte:224 in moveResize -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailWidth call
call src/lib/features/rail-shell/Rail.svelte:228 in endResize -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/Rail.svelte:242 in (markup) -> src/lib/features/rail-shell/Rail.svelte:blockDragWhileResizing markup
call src/lib/features/rail-shell/Rail.svelte:254 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout markup +1
call src/lib/features/rail-shell/Rail.svelte:320 in (markup) -> src/lib/features/rail-shell/Rail.svelte:startResize markup
call src/lib/features/rail-shell/Rail.svelte:321 in (markup) -> src/lib/features/rail-shell/Rail.svelte:moveResize markup
call src/lib/features/rail-shell/Rail.svelte:322 in (markup) -> src/lib/features/rail-shell/Rail.svelte:endResize markup +1
call src/lib/features/rail-shell/Rail.svelte:336 in (markup) -> src/lib/features/file-icons/icon-resolver.ts:resolveIconForPath markup
call src/lib/features/rail-shell/Rail.svelte:338 in (markup) -> src/lib/features/rail-shell/Rail.svelte:actionIcon markup
## effects
fx src/lib/features/rail-shell/Rail.svelte:242 dom.dragstart svelte:window in (markup)
