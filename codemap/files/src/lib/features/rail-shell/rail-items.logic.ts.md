# file card src/lib/features/rail-shell/rail-items.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/rail-items.logic.ts ' codemap/files
file src/lib/features/rail-shell/rail-items.logic.ts logic L230 module src/lib/features/rail-shell in5 t5
## imports
imp src/lib/features/rail-shell/rail-items.logic.ts:1 -> src/lib/utils/clamp.ts clamp
imp src/lib/features/rail-shell/rail-items.logic.ts:2 -> src/lib/utils/color.ts contrastRatio
imp src/lib/features/rail-shell/rail-items.logic.ts:3 -> src/lib/core/editor/editor.logic.ts GRAPH_VIRTUAL_PATH,TAGS_VIRTUAL_PATH,TASKS_VIRTUAL_PATH
imp src/lib/features/rail-shell/rail-items.logic.ts:4 -> src/lib/features/rail-shell/lens.logic.ts FILES_RAIL_ITEM,SEARCH_RAIL_ITEM,TODAY_RAIL_ITEM,TYPES_RAIL_ITEM
imp src/lib/features/rail-shell/rail-items.logic.ts:5 -> src/lib/features/rail-shell/rail-shell.types.ts type:RailAction,type:RailNavigator,type:RailPin
## imported-by
imp src/lib/app/AppShell.svelte:39 -> src/lib/features/rail-shell/rail-items.logic.ts parseRailCollapsed,parseRailHidden,parseRailStyle,parseRailWidth,railFormWidth,railHeaderPad
imp src/lib/app/commands.ts:18 -> src/lib/features/rail-shell/rail-items.logic.ts parseRailHidden,parseRailOrder,railItems
imp src/lib/app/rail-navigation.ts:5 -> src/lib/features/rail-shell/rail-items.logic.ts GRAPH_TAB_RAIL_ITEM,TAGS_TAB_RAIL_ITEM,TASKS_TAB_RAIL_ITEM,type:RailItem
imp src/lib/features/rail-shell/LayoutSection.svelte:9 -> src/lib/features/rail-shell/rail-items.logic.ts moveRailItem,parseRailCollapsed,parseRailHidden,parseRailInboxBadge,parseRailOrder,parseRailStyle,RAIL_STYLES,railItems,type:RailItem,type:RailItemGroup
imp src/lib/features/rail-shell/Rail.svelte:30 -> src/lib/features/rail-shell/rail-items.logic.ts parseRailCollapsed,parseRailHidden,parseRailInboxBadge,parseRailOrder,parseRailStyle,parseRailWidth,GRAPH_TAB_RAIL_ITEM,RAIL_PIN_COLOR,RAIL_WIDTH,railActionColor,railBadgeTextColor,railFormWidth,railItemColor,railItems,TAGS_TAB_RAIL_ITEM,TASKS_TAB_RAIL_ITEM,type:RailItem
## reach
in2 src/lib/features/rail-shell/rail-items.logic.ts 4 files in 2 modules: src/lib/app(3) src/routes(1)
out2 src/lib/features/rail-shell/rail-items.logic.ts 21 files in 8 modules: src/lib/features/collection(5) src/lib/features/type-definitions(4) src/lib/utils(4) src/lib/core/filesystem(3) src/lib/core/settings(2) +3 modules
## tests
test src/tests/lib/features/rail-shell/rail-items.logic.test.ts imports src/lib/features/rail-shell/rail-items.logic.ts mirror
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/features/rail-shell/rail-items.logic.ts
test src/tests/lib/core/settings/settings.store.test.ts imports src/lib/features/rail-shell/rail-items.logic.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/features/rail-shell/rail-items.logic.ts
test src/tests/lib/plugins/calendar/calendar-rail.service.test.ts imports src/lib/features/rail-shell/rail-items.logic.ts
## symbols
sym src/lib/features/rail-shell/rail-items.logic.ts:8 type RailItemGroup L1 | Where a rail item sits: above the divider, among the navigators, among the tab openers, among the pins, or at the bottom.
by src/lib/features/rail-shell/rail-items.logic.ts:RailItemGroup <- src/lib/features/rail-shell/LayoutSection.svelte:19 in (script) import
sym src/lib/features/rail-shell/rail-items.logic.ts:14 const TASKS_TAB_RAIL_ITEM L1 | Key of the Tabs item that opens the Tasks tab
by src/lib/features/rail-shell/rail-items.logic.ts:TASKS_TAB_RAIL_ITEM <- src/lib/app/rail-navigation.ts:30 in selectRailItem ref
by src/lib/features/rail-shell/rail-items.logic.ts:TASKS_TAB_RAIL_ITEM <- src/lib/features/rail-shell/Rail.svelte:82 in BUILT_IN_ICONS ref
sym src/lib/features/rail-shell/rail-items.logic.ts:16 const GRAPH_TAB_RAIL_ITEM L1 | Key of the Tabs item that opens the Graph View tab
by src/lib/features/rail-shell/rail-items.logic.ts:GRAPH_TAB_RAIL_ITEM <- src/lib/app/rail-navigation.ts:33 in selectRailItem ref
by src/lib/features/rail-shell/rail-items.logic.ts:GRAPH_TAB_RAIL_ITEM <- src/lib/features/rail-shell/Rail.svelte:83 in BUILT_IN_ICONS ref
sym src/lib/features/rail-shell/rail-items.logic.ts:18 const TAGS_TAB_RAIL_ITEM L1 | Key of the Tabs item that opens the Tags tab
by src/lib/features/rail-shell/rail-items.logic.ts:TAGS_TAB_RAIL_ITEM <- src/lib/app/rail-navigation.ts:36 in selectRailItem ref
by src/lib/features/rail-shell/rail-items.logic.ts:TAGS_TAB_RAIL_ITEM <- src/lib/features/rail-shell/Rail.svelte:84 in BUILT_IN_ICONS ref
sym src/lib/features/rail-shell/rail-items.logic.ts:21 interface RailItem L14 | A rail button: what it saves as `layout.railItem` and what it is called.
by src/lib/features/rail-shell/rail-items.logic.ts:RailItem <- src/lib/app/rail-navigation.ts:9 in (module) import
by src/lib/features/rail-shell/rail-items.logic.ts:RailItem <- src/lib/features/rail-shell/LayoutSection.svelte:18 in (script) import
by src/lib/features/rail-shell/rail-items.logic.ts:RailItem <- src/lib/features/rail-shell/Rail.svelte:47 in (script) import
sym src/lib/features/rail-shell/rail-items.logic.ts:46 fn railItems(navigators: readonly RailNavigator[], pins: readonly RailPin[], hidden: readonly string[] = [], order: readonly string… L37 | Every rail button in rail order: Search, Inbox, Today, Favorites; Types, the registered navigators (Days), Files; Tasks, Graph, Tags (the Tabs items); the pins…
by src/lib/features/rail-shell/rail-items.logic.ts:railItems <- src/lib/app/commands.ts:70 in railGoToCommands call
by src/lib/features/rail-shell/rail-items.logic.ts:railItems <- src/lib/features/rail-shell/LayoutSection.svelte:40 in items=$derived call
by src/lib/features/rail-shell/rail-items.logic.ts:railItems <- src/lib/features/rail-shell/Rail.svelte:93 in items=$derived call
sym src/lib/features/rail-shell/rail-items.logic.ts:92 fn arrangeRailGroups(groups: readonly (readonly string[])[], hidden: readonly string[], order: readonly string[]): string[][] L12 | The rail's groups of keys as the rail draws them, from the groups in default order: a hidden key is dropped, except Search and Today (the way into search and t…
sym src/lib/features/rail-shell/rail-items.logic.ts:111 fn moveRailItem(items: readonly RailItem[], key: string, delta: -1 | 1): string[] | null L11 | The new `layout.railOrder` after moving `key` one place up (`-1`) or down (`1`) within its group: the keys of every listed item (every item but the pins), in r…
by src/lib/features/rail-shell/rail-items.logic.ts:moveRailItem <- src/lib/features/rail-shell/LayoutSection.svelte:47 in move call +2
sym src/lib/features/rail-shell/rail-items.logic.ts:129 fn parseRailHidden(saved: unknown): string[] L3 | The hidden rail items saved in `layout.railHidden`; a hand-edited non-array reads as none, non-strings are dropped.
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden <- src/lib/app/AppShell.svelte:110 in railItem=$derived call
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden <- src/lib/app/commands.ts:70 in railGoToCommands call
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden <- src/lib/features/rail-shell/LayoutSection.svelte:38 in hidden=$derived call
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden <- src/lib/features/rail-shell/Rail.svelte:96 in items=$derived call
sym src/lib/features/rail-shell/rail-items.logic.ts:134 fn parseRailOrder(saved: unknown): string[] L3 | The rail order saved in `layout.railOrder`; a hand-edited non-array reads as the default order, non-strings are dropped.
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailOrder <- src/lib/app/commands.ts:70 in railGoToCommands call
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailOrder <- src/lib/features/rail-shell/LayoutSection.svelte:40 in items=$derived call
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailOrder <- src/lib/features/rail-shell/Rail.svelte:97 in items=$derived call
sym src/lib/features/rail-shell/rail-items.logic.ts:139 fn parseRailInboxBadge(saved: unknown): boolean L3 | Whether the rail's Inbox badge is on, from `layout.railInboxBadge`: off only for the boolean `false`.
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailInboxBadge <- src/lib/features/rail-shell/LayoutSection.svelte:96 in (markup) markup
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailInboxBadge <- src/lib/features/rail-shell/Rail.svelte:100 in showsInboxBadge=$derived call
sym src/lib/features/rail-shell/rail-items.logic.ts:162 const RAIL_PIN_COLOR L1 | The color of a pin whose resolved icon has none.
by src/lib/features/rail-shell/rail-items.logic.ts:RAIL_PIN_COLOR <- src/lib/features/rail-shell/Rail.svelte:180 in pinRow ref
sym src/lib/features/rail-shell/rail-items.logic.ts:165 const RAIL_ACTION_COLOR L1 | The color of a mod's rail button that declares none.
sym src/lib/features/rail-shell/rail-items.logic.ts:168 fn railActionColor(color: RailAction['color'], isDark: boolean): string L4 | A rail action's icon color: its declared value for the applied theme's mode, else `RAIL_ACTION_COLOR`.
by src/lib/features/rail-shell/rail-items.logic.ts:railActionColor <- src/lib/features/rail-shell/Rail.svelte:194 in actionRow call
sym src/lib/features/rail-shell/rail-items.logic.ts:174 const RAIL_WIDTH L1 | The labeled rail's width in px: where it starts, and how far it drags.
by src/lib/features/rail-shell/rail-items.logic.ts:RAIL_WIDTH <- src/lib/features/rail-shell/Rail.svelte:347 in (markup) markup
sym src/lib/features/rail-shell/rail-items.logic.ts:177 fn parseRailWidth(saved: unknown): number L4 | The labeled rail's width from `layout.railWidth`: a finite number is rounded and clamped, anything else reads as the default.
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailWidth <- src/lib/app/AppShell.svelte:187 in (markup) markup
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailWidth <- src/lib/features/rail-shell/Rail.svelte:227 in width=$derived call +1
sym src/lib/features/rail-shell/rail-items.logic.ts:183 const RAIL_STYLES L4 | The styles Settings > Layout offers.
by src/lib/features/rail-shell/rail-items.logic.ts:RAIL_STYLES <- src/lib/features/rail-shell/LayoutSection.svelte:55 in (markup) markup +1
sym src/lib/features/rail-shell/rail-items.logic.ts:189 type RailStyle L1 | A key of `RAIL_STYLES`.
sym src/lib/features/rail-shell/rail-items.logic.ts:192 fn parseRailStyle(saved: unknown): RailStyle L3 | The rail's style from `layout.railStyle`: only `'captioned'` gives captioned, anything else reads as labeled.
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailStyle <- src/lib/app/AppShell.svelte:187 in (markup) markup
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailStyle <- src/lib/features/rail-shell/LayoutSection.svelte:37 in railStyle=$derived call
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailStyle <- src/lib/features/rail-shell/Rail.svelte:144 in style=$derived call
sym src/lib/features/rail-shell/rail-items.logic.ts:197 fn parseRailCollapsed(saved: unknown): boolean L3 | Whether the rail is collapsed, from `layout.railCollapsed`: only the boolean `true` collapses.
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailCollapsed <- src/lib/app/AppShell.svelte:187 in (markup) markup
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailCollapsed <- src/lib/features/rail-shell/LayoutSection.svelte:76 in (markup) markup
by src/lib/features/rail-shell/rail-items.logic.ts:parseRailCollapsed <- src/lib/features/rail-shell/Rail.svelte:145 in collapsed=$derived call
sym src/lib/features/rail-shell/rail-items.logic.ts:202 fn railFormWidth(style: RailStyle, collapsed: boolean, labeledWidth: number): number L4 | The rail's width in px from its parsed style, collapsed state and labeled width.
by src/lib/features/rail-shell/rail-items.logic.ts:railFormWidth <- src/lib/app/AppShell.svelte:187 in (markup) markup
by src/lib/features/rail-shell/rail-items.logic.ts:railFormWidth <- src/lib/features/rail-shell/Rail.svelte:228 in frameWidth=$derived call
sym src/lib/features/rail-shell/rail-items.logic.ts:208 fn railItemColor(key: string): string L3 | A rail item's color: a built-in key gives its own, any other key the fallback.
by src/lib/features/rail-shell/rail-items.logic.ts:railItemColor <- src/lib/features/rail-shell/Rail.svelte:167 in itemRow call
sym src/lib/features/rail-shell/rail-items.logic.ts:216 fn railBadgeTextColor(color: string): string L6 | Text color for a count badge filled with a rail item's `color`: black or white, whichever contrasts more; `var(--primary-foreground)` for a color it cannot par…
by src/lib/features/rail-shell/rail-items.logic.ts:railBadgeTextColor <- src/lib/features/rail-shell/Rail.svelte:397 in (markup) markup
sym src/lib/features/rail-shell/rail-items.logic.ts:228 fn railHeaderPad(railWidth: number): number L3 | The left padding, in px, of the header strip beside a rail this wide: the macOS traffic lights and the rail toggle reach 120 px from the window's edge, and pas…
by src/lib/features/rail-shell/rail-items.logic.ts:railHeaderPad <- src/lib/app/AppShell.svelte:187 in (markup) markup
## locals
local src/lib/features/rail-shell/rail-items.logic.ts:124 fn parseKeyList(saved: unknown): string[] L3
## calls
call src/lib/features/rail-shell/rail-items.logic.ts:70 in railItems -> src/lib/features/rail-shell/rail-items.logic.ts:arrangeRailGroups call
call src/lib/features/rail-shell/rail-items.logic.ts:130 in parseRailHidden -> src/lib/features/rail-shell/rail-items.logic.ts:parseKeyList call
call src/lib/features/rail-shell/rail-items.logic.ts:135 in parseRailOrder -> src/lib/features/rail-shell/rail-items.logic.ts:parseKeyList call
call src/lib/features/rail-shell/rail-items.logic.ts:179 in parseRailWidth -> src/lib/utils/clamp.ts:clamp call
call src/lib/features/rail-shell/rail-items.logic.ts:217 in railBadgeTextColor -> src/lib/utils/color.ts:contrastRatio call +1
