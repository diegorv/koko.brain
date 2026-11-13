# file card src/lib/core/settings/theme.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme.logic.ts ' codemap/files
file src/lib/core/settings/theme.logic.ts logic L409 module src/lib/core/settings in7 t16
## imports
imp src/lib/core/settings/theme.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors,type:UIColors,type:SyntaxColors,type:PreviewColors,type:WikilinkColors,type:CalloutColors,type:AppearanceSettings
imp src/lib/core/settings/theme.logic.ts:11 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/theme.logic.ts:12 -> src/lib/core/settings/theme-builder.logic.ts alpha,buildTheme,coreFromColors
## imported-by
imp src/lib/core/settings/sections/AppearanceSection.svelte:8 -> src/lib/core/settings/theme.logic.ts DEFAULT_THEME_NAME,KOKOBRAIN_DEFAULT_THEME,isBuiltinTheme
imp src/lib/core/settings/sections/ThemeEditor.svelte:5 -> src/lib/core/settings/theme.logic.ts mergeThemeWithDefaults
imp src/lib/core/settings/sections/ThemeEditor.svelte:22 -> src/lib/core/settings/theme.logic.ts KOKOBRAIN_DEFAULT_THEME
imp src/lib/core/settings/settings.store.svelte.ts:3 -> src/lib/core/settings/theme.logic.ts DEFAULT_APPEARANCE
imp src/lib/core/settings/theme-editor.logic.ts:10 -> src/lib/core/settings/theme.logic.ts DEFAULT_THEME_NAME
imp src/lib/core/settings/theme-package.logic.ts:4 -> src/lib/core/settings/theme.logic.ts BUILTIN_THEMES,DEFAULT_THEME_NAME,mergeThemeWithDefaults,normalizeAppearance
imp src/lib/core/settings/theme-validation.logic.ts:1 -> src/lib/core/settings/theme.logic.ts KOKOBRAIN_DEFAULT_THEME
imp src/lib/core/settings/theme.service.ts:6 -> src/lib/core/settings/theme.logic.ts findThemeByName,themeColorsToCssVars
## reach
in2 src/lib/core/settings/theme.logic.ts 88 files in 27 modules: src/lib/core/settings(17) src/lib/features/event-calendar(10) src/lib/app(9) src/lib/features/rail-shell(9) src/lib/features/todoist-sync(5) +22 modules: q impact src/lib/core/settings/theme.logic.ts --depth 2
out2 src/lib/core/settings/theme.logic.ts 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/core/settings/theme.logic.test.ts imports src/lib/core/settings/theme.logic.ts mirror
test src/tests/lib/core/settings/AppearanceSection.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/ThemeEditor.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/ThemePreview.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/theme-builder.logic.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/theme-catalog.service.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/theme-css-contract.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/theme-editor.logic.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/theme-package.logic.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/theme-snapshot.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/theme-validation.logic.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/core/settings/theme.service.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/plugins/graph-view/GraphView.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/plugins/graph-view/graph-view.logic.test.ts imports src/lib/core/settings/theme.logic.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/core/settings/theme.logic.ts
## symbols
sym src/lib/core/settings/theme.logic.ts:15 fn camelToKebab(s: string): string L3 | Converts a camelCase string to kebab-case
sym src/lib/core/settings/theme.logic.ts:60 fn themeColorsToCssVars(colors: ThemeColors): Record<string, string> L16 | Converts a ThemeColors object into a flat map of CSS variable name → value, plus the derived `--elev-*` variables
by src/lib/core/settings/theme.logic.ts:themeColorsToCssVars <- src/lib/core/settings/theme.service.ts:45 in applyTheme call +1
sym src/lib/core/settings/theme.logic.ts:90 fn mergeThemeWithDefaults(partial: Partial<ThemeColors>): ThemeColors L22 | Completes a saved or imported theme to the current token set: keys that are no longer tokens are dropped, and a missing token is derived (`buildTheme`) from th…
by src/lib/core/settings/theme.logic.ts:mergeThemeWithDefaults <- src/lib/core/settings/sections/ThemeEditor.svelte:113 in handleFileImport call
by src/lib/core/settings/theme.logic.ts:mergeThemeWithDefaults <- src/lib/core/settings/theme-package.logic.ts:373 in migrateExBuiltins call
sym src/lib/core/settings/theme.logic.ts:114 const DEFAULT_THEME_NAME L1 | Built-in default theme name
by src/lib/core/settings/theme.logic.ts:DEFAULT_THEME_NAME <- src/lib/core/settings/sections/AppearanceSection.svelte:98 in deleteTheme ref
by src/lib/core/settings/theme.logic.ts:DEFAULT_THEME_NAME <- src/lib/core/settings/theme-editor.logic.ts:251 in validateThemeName ref +1
by src/lib/core/settings/theme.logic.ts:DEFAULT_THEME_NAME <- src/lib/core/settings/theme-package.logic.ts:266 in uninstallTheme ref +1
sym src/lib/core/settings/theme.logic.ts:117 const KOKOBRAIN_DEFAULT_THEME: Theme L114 | The built-in theme with all current color values
by src/lib/core/settings/theme.logic.ts:KOKOBRAIN_DEFAULT_THEME <- src/lib/core/settings/sections/AppearanceSection.svelte:106 in handleCreateNew member
by src/lib/core/settings/theme.logic.ts:KOKOBRAIN_DEFAULT_THEME <- src/lib/core/settings/sections/ThemeEditor.svelte:43 in draftColors member
by src/lib/core/settings/theme.logic.ts:KOKOBRAIN_DEFAULT_THEME <- src/lib/core/settings/theme-validation.logic.ts:55 in findInvalidThemeToken member
sym src/lib/core/settings/theme.logic.ts:232 const LAVENDER_HAZE_THEME: Theme L91
sym src/lib/core/settings/theme.logic.ts:325 const BUILTIN_THEMES: Theme[] L1 | The themes that ship with the app; every other theme comes from the catalog (ADR-0035).
by src/lib/core/settings/theme.logic.ts:BUILTIN_THEMES <- src/lib/core/settings/theme-package.logic.ts:282 in sortThemesForDisplay mcall +1
sym src/lib/core/settings/theme.logic.ts:333 const DEFAULT_APPEARANCE: AppearanceSettings L6 | Default appearance settings with built-in themes.
by src/lib/core/settings/theme.logic.ts:DEFAULT_APPEARANCE <- src/lib/core/settings/settings.store.svelte.ts:101 in DEFAULT_SETTINGS ref
sym src/lib/core/settings/theme.logic.ts:363 fn normalizeAppearance(raw: Partial<AppearanceSettings>): AppearanceSettings L37 | Serves every built-in theme from code, keeps user themes (merged with defaults) in their saved order, and appends built-ins missing from the save.
by src/lib/core/settings/theme.logic.ts:normalizeAppearance <- src/lib/core/settings/theme-package.logic.ts:397 in loadAppearance call
sym src/lib/core/settings/theme.logic.ts:402 fn isBuiltinTheme(name: string): boolean L3 | True when `name` belongs to a built-in theme, which is served from code and cannot be edited in place.
by src/lib/core/settings/theme.logic.ts:isBuiltinTheme <- src/lib/core/settings/sections/AppearanceSection.svelte:94 in deleteTheme call +1
sym src/lib/core/settings/theme.logic.ts:407 fn findThemeByName(themes: Theme[], name: string): Theme L3 | Finds a theme by name from an array, falling back to the built-in default
by src/lib/core/settings/theme.logic.ts:findThemeByName <- src/lib/core/settings/theme.service.ts:78 in applyActiveTheme call
## locals
local src/lib/core/settings/theme.logic.ts:40 fn elevationVars(ui: UIColors): Record<string, string> L18
local src/lib/core/settings/theme.logic.ts:78 fn pickTokens<T extends object>(template: T, source: Partial<T> | undefined, fallback: T): T L5
local src/lib/core/settings/theme.logic.ts:341 fn sameColors(a: ThemeColors, b: ThemeColors): boolean L6
local src/lib/core/settings/theme.logic.ts:349 fn freeName(base: string, taken: Set<string>): string L6
## calls
call src/lib/core/settings/theme.logic.ts:41 in elevationVars -> src/lib/utils/color.ts:isDarkColor call
call src/lib/core/settings/theme.logic.ts:51 in elevationVars -> src/lib/core/settings/theme-builder.logic.ts:alpha call +4
call src/lib/core/settings/theme.logic.ts:66 in themeColorsToCssVars -> src/lib/core/settings/theme.logic.ts:camelToKebab call
call src/lib/core/settings/theme.logic.ts:74 in themeColorsToCssVars -> src/lib/core/settings/theme.logic.ts:elevationVars call
call src/lib/core/settings/theme.logic.ts:96 in mergeThemeWithDefaults -> src/lib/core/settings/theme.logic.ts:pickTokens call +9
call src/lib/core/settings/theme.logic.ts:102 in mergeThemeWithDefaults -> src/lib/core/settings/theme-builder.logic.ts:buildTheme call
call src/lib/core/settings/theme.logic.ts:102 in mergeThemeWithDefaults -> src/lib/core/settings/theme-builder.logic.ts:coreFromColors call
call src/lib/core/settings/theme.logic.ts:117 in KOKOBRAIN_DEFAULT_THEME -> src/lib/core/settings/theme-builder.logic.ts:buildTheme call
call src/lib/core/settings/theme.logic.ts:232 in LAVENDER_HAZE_THEME -> src/lib/core/settings/theme-builder.logic.ts:buildTheme call
call src/lib/core/settings/theme.logic.ts:373 in normalizeAppearance -> src/lib/core/settings/theme.logic.ts:mergeThemeWithDefaults call
call src/lib/core/settings/theme.logic.ts:380 in normalizeAppearance -> src/lib/core/settings/theme.logic.ts:pickTokens call +4
call src/lib/core/settings/theme.logic.ts:386 in normalizeAppearance -> src/lib/core/settings/theme.logic.ts:sameColors call
call src/lib/core/settings/theme.logic.ts:387 in normalizeAppearance -> src/lib/core/settings/theme.logic.ts:freeName call
