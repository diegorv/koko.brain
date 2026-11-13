# file card src/lib/core/settings/sections/HeadingTypographyEditor.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/HeadingTypographyEditor.svelte ' codemap/files
file src/lib/core/settings/sections/HeadingTypographyEditor.svelte component L118 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:3 -> src/lib/components/ui/select/index.ts *
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:5 -> src/lib/core/settings/settings.logic.ts clampHeadingFontSize,clampHeadingLineHeight,clampHeadingLetterSpacing
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:10 -> src/lib/core/settings/settings.types.ts type:HeadingTypography,type:HeadingFontWeight
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:11 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/core/settings/sections/EditorSection.svelte:12 -> src/lib/core/settings/sections/HeadingTypographyEditor.svelte default
## reach
in2 src/lib/core/settings/sections/HeadingTypographyEditor.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/HeadingTypographyEditor.svelte 15 files in 3 modules: src/lib/components(12) src/lib/core/settings(2) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/HeadingTypographyEditor.test.ts imports src/lib/core/settings/sections/HeadingTypographyEditor.svelte
## symbols
sym src/lib/core/settings/sections/HeadingTypographyEditor.svelte:1 component HeadingTypographyEditor L118
by src/lib/core/settings/sections/HeadingTypographyEditor.svelte:default <- src/lib/core/settings/sections/EditorSection.svelte:173 in (markup) mount
## locals
local src/lib/core/settings/sections/HeadingTypographyEditor.svelte:28 fn weightLabel(value: HeadingFontWeight): string L3
local src/lib/core/settings/sections/HeadingTypographyEditor.svelte:32 fn inputValue(e: Event): string L3
local src/lib/core/settings/sections/HeadingTypographyEditor.svelte:36 fn updateLevel(level: keyof HeadingTypography, prop: string, value: number | string) L9
## mounts
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:60 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:61 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:73 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:74 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:86 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:103 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/HeadingTypographyEditor.svelte:104 Input -> src/lib/components/ui/input/input.svelte
## mounted-at
mount src/lib/core/settings/sections/EditorSection.svelte:173 HeadingTypographyEditor -> src/lib/core/settings/sections/HeadingTypographyEditor.svelte
## calls
call src/lib/core/settings/sections/HeadingTypographyEditor.svelte:38 in updateLevel -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEditor mcall
call src/lib/core/settings/sections/HeadingTypographyEditor.svelte:68 in (markup) -> src/lib/core/settings/sections/HeadingTypographyEditor.svelte:inputValue markup +5
call src/lib/core/settings/sections/HeadingTypographyEditor.svelte:68 in (markup) -> src/lib/core/settings/sections/HeadingTypographyEditor.svelte:updateLevel markup +6
call src/lib/core/settings/sections/HeadingTypographyEditor.svelte:69 in (markup) -> src/lib/core/settings/settings.logic.ts:clampHeadingFontSize markup
call src/lib/core/settings/sections/HeadingTypographyEditor.svelte:82 in (markup) -> src/lib/core/settings/settings.logic.ts:clampHeadingLineHeight markup
call src/lib/core/settings/sections/HeadingTypographyEditor.svelte:93 in (markup) -> src/lib/core/settings/sections/HeadingTypographyEditor.svelte:weightLabel markup
call src/lib/core/settings/sections/HeadingTypographyEditor.svelte:112 in (markup) -> src/lib/core/settings/settings.logic.ts:clampHeadingLetterSpacing markup
