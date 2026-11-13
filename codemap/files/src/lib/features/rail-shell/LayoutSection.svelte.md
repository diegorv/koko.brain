# file card src/lib/features/rail-shell/LayoutSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/LayoutSection.svelte ' codemap/files
file src/lib/features/rail-shell/LayoutSection.svelte component L201 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/LayoutSection.svelte:4 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/rail-shell/LayoutSection.svelte:5 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/rail-shell/LayoutSection.svelte:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/rail-shell/LayoutSection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/features/rail-shell/LayoutSection.svelte:8 -> src/lib/features/rail-shell/lens.logic.ts SEARCH_RAIL_ITEM,TODAY_RAIL_ITEM
imp src/lib/features/rail-shell/LayoutSection.svelte:9 -> src/lib/features/rail-shell/rail-items.logic.ts moveRailItem,parseRailCollapsed,parseRailHidden,parseRailInboxBadge,parseRailOrder,parseRailStyle,RAIL_STYLES,railItems,type:RailItem,type:RailItemGroup
imp src/lib/features/rail-shell/LayoutSection.svelte:21 -> src/lib/features/rail-shell/rail-registry.store.svelte.ts railRegistryStore
## imported-by
imp src/lib/app/SettingsPanel.svelte:9 -> src/lib/features/rail-shell/LayoutSection.svelte default
## reach
in2 src/lib/features/rail-shell/LayoutSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/LayoutSection.svelte 23 files in 8 modules: src/lib/features/collection(5) src/lib/core/settings(4) src/lib/features/type-definitions(4) src/lib/core/filesystem(3) src/lib/utils(3) +3 modules
## tests
test src/tests/lib/features/rail-shell/LayoutSection.test.ts imports src/lib/features/rail-shell/LayoutSection.svelte mirror
## symbols
sym src/lib/features/rail-shell/LayoutSection.svelte:1 component LayoutSection L201
by src/lib/features/rail-shell/LayoutSection.svelte:default <- src/lib/app/SettingsPanel.svelte:73 in sectionComponents ref
## locals
local src/lib/features/rail-shell/LayoutSection.svelte:41 fn setVisible(key: string, visible: boolean) L3
local src/lib/features/rail-shell/LayoutSection.svelte:45 fn move(key: string, delta: -1 | 1) L4
## mounts
mount src/lib/features/rail-shell/LayoutSection.svelte:54 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:57 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:69 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:73 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:89 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:93 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:100 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:104 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:115 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:119 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:127 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:128 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:136 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:137 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:145 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:146 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:154 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:155 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:166 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:169 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:179 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/rail-shell/LayoutSection.svelte:191 Switch -> src/lib/components/ui/switch/switch.svelte
## calls
call src/lib/features/rail-shell/LayoutSection.svelte:36 in railStyle=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailStyle call
call src/lib/features/rail-shell/LayoutSection.svelte:37 in hidden=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailHidden call
call src/lib/features/rail-shell/LayoutSection.svelte:39 in items=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailOrder call
call src/lib/features/rail-shell/LayoutSection.svelte:39 in items=$derived -> src/lib/features/rail-shell/rail-items.logic.ts:railItems call
call src/lib/features/rail-shell/LayoutSection.svelte:42 in setVisible -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/LayoutSection.svelte:46 in move -> src/lib/features/rail-shell/rail-items.logic.ts:moveRailItem call
call src/lib/features/rail-shell/LayoutSection.svelte:47 in move -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout mcall
call src/lib/features/rail-shell/LayoutSection.svelte:61 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateLayout markup +7
call src/lib/features/rail-shell/LayoutSection.svelte:75 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailCollapsed markup
call src/lib/features/rail-shell/LayoutSection.svelte:95 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:parseRailInboxBadge markup
call src/lib/features/rail-shell/LayoutSection.svelte:108 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.setSettings markup
call src/lib/features/rail-shell/LayoutSection.svelte:174 in (markup) -> src/lib/features/rail-shell/rail-items.logic.ts:moveRailItem markup +1
call src/lib/features/rail-shell/LayoutSection.svelte:175 in (markup) -> src/lib/features/rail-shell/LayoutSection.svelte:move markup +1
call src/lib/features/rail-shell/LayoutSection.svelte:195 in (markup) -> src/lib/features/rail-shell/LayoutSection.svelte:setVisible markup
