# file card src/lib/features/properties/PropertyField.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/properties/PropertyField.svelte ' codemap/files
file src/lib/features/properties/PropertyField.svelte component L205 module src/lib/features/properties in1 t1
## imports
imp src/lib/features/properties/PropertyField.svelte:10 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/properties/PropertyField.svelte:11 -> src/lib/core/frontmatter/properties.types.ts type:Property,type:PropertyType
imp src/lib/features/properties/PropertyField.svelte:12 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/features/properties/PropertyField.svelte:13 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/features/properties/PropertyField.svelte:14 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,themeSurface
imp src/lib/features/properties/PropertyField.svelte:15 -> src/lib/utils/tag-colors.ts getTagColor
## imported-by
imp src/lib/features/properties/PropertiesView.svelte:40 -> src/lib/features/properties/PropertyField.svelte default
## reach
in2 src/lib/features/properties/PropertyField.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/properties/PropertyField.svelte 5 files in 3 modules: src/lib/core/settings(3) src/lib/components(1) src/lib/utils(1)
## tests
test src/tests/lib/features/properties/PropertyField.test.ts imports src/lib/features/properties/PropertyField.svelte mirror
## symbols
sym src/lib/features/properties/PropertyField.svelte:1 component PropertyField props:property,onUpdate,onRename,onRemove L205
by src/lib/features/properties/PropertyField.svelte:default <- src/lib/features/properties/PropertiesView.svelte:211 in (markup) mount
## locals
local src/lib/features/properties/PropertyField.svelte:54 fn handleKeyBlur(e: FocusEvent) L7
local src/lib/features/properties/PropertyField.svelte:62 fn commitValue(value: string | number | boolean) L3
local src/lib/features/properties/PropertyField.svelte:66 fn handleValueChange(e: Event) L19
local src/lib/features/properties/PropertyField.svelte:86 fn removeListItem(index: number) L5
local src/lib/features/properties/PropertyField.svelte:92 fn addListItem() L7
local src/lib/features/properties/PropertyField.svelte:100 fn handleListKeydown(e: KeyboardEvent) L6
## mounts
mount src/lib/features/properties/PropertyField.svelte:137 Input -> src/lib/components/ui/input/input.svelte
## mounted-at
mount src/lib/features/properties/PropertiesView.svelte:211 PropertyField -> src/lib/features/properties/PropertyField.svelte
## calls
call src/lib/features/properties/PropertyField.svelte:70 in handleValueChange -> src/lib/features/properties/PropertyField.svelte:commitValue call +2
call src/lib/features/properties/PropertyField.svelte:103 in handleListKeydown -> src/lib/features/properties/PropertyField.svelte:addListItem call
call src/lib/features/properties/PropertyField.svelte:119 in (markup) -> src/lib/features/properties/PropertyField.svelte:handleKeyBlur markup
call src/lib/features/properties/PropertyField.svelte:130 in (markup) -> src/lib/features/properties/PropertyField.svelte:handleValueChange markup +1
call src/lib/features/properties/PropertyField.svelte:174 in (markup) -> src/lib/core/settings/theme-surfaces.logic.ts:readableOn markup
call src/lib/features/properties/PropertyField.svelte:174 in (markup) -> src/lib/core/settings/theme-surfaces.logic.ts:themeSurface markup
call src/lib/features/properties/PropertyField.svelte:174 in (markup) -> src/lib/utils/tag-colors.ts:getTagColor markup
call src/lib/features/properties/PropertyField.svelte:180 in (markup) -> src/lib/features/properties/PropertyField.svelte:removeListItem markup
call src/lib/features/properties/PropertyField.svelte:196 in (markup) -> src/lib/features/properties/PropertyField.svelte:addListItem markup +1
## effects
fx src/lib/features/properties/PropertyField.svelte:39 svelte.$effect in (script)
