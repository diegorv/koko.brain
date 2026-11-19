# file card src/lib/core/settings/sections/ThemeEditor.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/ThemeEditor.svelte ' codemap/files
file src/lib/core/settings/sections/ThemeEditor.svelte component L207 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/ThemeEditor.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/core/settings/sections/ThemeEditor.svelte:3 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/ThemeEditor.svelte:4 -> src/lib/core/settings/theme.service.ts applyTheme
imp src/lib/core/settings/sections/ThemeEditor.svelte:5 -> src/lib/core/settings/theme.logic.ts mergeThemeWithDefaults
imp src/lib/core/settings/sections/ThemeEditor.svelte:6 -> src/lib/core/settings/theme-builder.logic.ts readabilityFailures
imp src/lib/core/settings/sections/ThemeEditor.svelte:7 -> src/lib/core/settings/theme-editor.logic.ts camelCaseToLabel,validateThemeName,serializeThemeForExport,parseThemeFromImport,COLOR_GROUP_ORDER,COLOR_GROUP_LABELS,UI_COLOR_GROUPS,SYNTAX_COLOR_GROUPS,PREVIEW_COLOR_GROUPS,WIKILINK_COLOR_GROUPS,CALLOUT_COLOR_GROUPS,type:ColorGroupKey,type:ColorSubGroup
imp src/lib/core/settings/sections/ThemeEditor.svelte:22 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors
imp src/lib/core/settings/sections/ThemeEditor.svelte:23 -> src/lib/core/settings/theme.logic.ts KOKOBRAIN_DEFAULT_THEME
imp src/lib/core/settings/sections/ThemeEditor.svelte:24 -> src/lib/core/settings/sections/ThemeColorRow.svelte default
## imported-by
imp src/lib/core/settings/sections/AppearanceSection.svelte:23 -> src/lib/core/settings/sections/ThemeEditor.svelte default
## reach
in2 src/lib/core/settings/sections/ThemeEditor.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/ThemeEditor.svelte 7 files in 3 modules: src/lib/core/settings(4) src/lib/components(2) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/ThemeEditor.test.ts imports src/lib/core/settings/sections/ThemeEditor.svelte
## symbols
sym src/lib/core/settings/sections/ThemeEditor.svelte:1 component ThemeEditor props:theme,isNew,existingNames,onSave,onCancel L207
by src/lib/core/settings/sections/ThemeEditor.svelte:default <- src/lib/core/settings/sections/AppearanceSection.svelte:152 in (markup) mount
## locals
local src/lib/core/settings/sections/ThemeEditor.svelte:71 fn applyDraft() L3
local src/lib/core/settings/sections/ThemeEditor.svelte:76 fn updateColor(group: ColorGroupKey, key: string, value: string) L7
local src/lib/core/settings/sections/ThemeEditor.svelte:84 fn handleSave() L5
local src/lib/core/settings/sections/ThemeEditor.svelte:90 fn handleExport() L10
local src/lib/core/settings/sections/ThemeEditor.svelte:101 fn handleImportClick() L3
local src/lib/core/settings/sections/ThemeEditor.svelte:105 fn handleFileImport(e: Event) L27
## mounts
mount src/lib/core/settings/sections/ThemeEditor.svelte:137 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/ThemeEditor.svelte:141 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/ThemeEditor.svelte:153 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/ThemeEditor.svelte:154 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/ThemeEditor.svelte:160 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/ThemeEditor.svelte:164 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/ThemeEditor.svelte:198 ThemeColorRow -> src/lib/core/settings/sections/ThemeColorRow.svelte
## mounted-at
mount src/lib/core/settings/sections/AppearanceSection.svelte:152 ThemeEditor -> src/lib/core/settings/sections/ThemeEditor.svelte
## calls
call src/lib/core/settings/sections/ThemeEditor.svelte:59 in failures=$derived -> src/lib/core/settings/theme-builder.logic.ts:readabilityFailures call
call src/lib/core/settings/sections/ThemeEditor.svelte:72 in applyDraft -> src/lib/core/settings/theme.service.ts:applyTheme call
call src/lib/core/settings/sections/ThemeEditor.svelte:81 in updateColor -> src/lib/core/settings/sections/ThemeEditor.svelte:applyDraft call
call src/lib/core/settings/sections/ThemeEditor.svelte:85 in handleSave -> src/lib/core/settings/theme-editor.logic.ts:validateThemeName call
call src/lib/core/settings/sections/ThemeEditor.svelte:91 in handleExport -> src/lib/core/settings/theme-editor.logic.ts:serializeThemeForExport call
call src/lib/core/settings/sections/ThemeEditor.svelte:111 in handleFileImport -> src/lib/core/settings/theme-editor.logic.ts:parseThemeFromImport call
call src/lib/core/settings/sections/ThemeEditor.svelte:117 in handleFileImport -> src/lib/core/settings/theme.logic.ts:mergeThemeWithDefaults call
call src/lib/core/settings/sections/ThemeEditor.svelte:125 in handleFileImport -> src/lib/core/settings/sections/ThemeEditor.svelte:applyDraft call
call src/lib/core/settings/sections/ThemeEditor.svelte:154 in (markup) -> src/lib/core/settings/sections/ThemeEditor.svelte:handleSave markup
call src/lib/core/settings/sections/ThemeEditor.svelte:160 in (markup) -> src/lib/core/settings/sections/ThemeEditor.svelte:handleExport markup
call src/lib/core/settings/sections/ThemeEditor.svelte:164 in (markup) -> src/lib/core/settings/sections/ThemeEditor.svelte:handleImportClick markup
call src/lib/core/settings/sections/ThemeEditor.svelte:172 in (markup) -> src/lib/core/settings/sections/ThemeEditor.svelte:handleFileImport markup
call src/lib/core/settings/sections/ThemeEditor.svelte:199 in (markup) -> src/lib/core/settings/theme-editor.logic.ts:camelCaseToLabel markup
call src/lib/core/settings/sections/ThemeEditor.svelte:201 in (markup) -> src/lib/core/settings/sections/ThemeEditor.svelte:updateColor markup
## effects
fx src/lib/core/settings/sections/ThemeEditor.svelte:51 svelte.$effect in (script)
