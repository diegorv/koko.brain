# file card src/lib/core/settings/theme-builder.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme-builder.logic.ts ' codemap/files
file src/lib/core/settings/theme-builder.logic.ts logic L409 module src/lib/core/settings in5 t13
## imports
imp src/lib/core/settings/theme-builder.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors,type:UIColors
imp src/lib/core/settings/theme-builder.logic.ts:2 -> src/lib/utils/color.ts contrastRatio,ensureContrast,flatten,mixColors
## imported-by
imp src/lib/core/settings/sections/ThemeColorRow.svelte:4 -> src/lib/core/settings/theme-builder.logic.ts type:ReadabilityFailure
imp src/lib/core/settings/sections/ThemeEditor.svelte:6 -> src/lib/core/settings/theme-builder.logic.ts readabilityFailures
imp src/lib/core/settings/theme-package.logic.ts:2 -> src/lib/core/settings/theme-builder.logic.ts buildTheme,coreFromColors,type:CorePalette,type:ThemeOverrides
imp src/lib/core/settings/theme.logic.ts:12 -> src/lib/core/settings/theme-builder.logic.ts alpha,buildTheme,coreFromColors,withReadableContrast
imp src/lib/features/file-icons/file-icons.logic.ts:5 -> src/lib/core/settings/theme-builder.logic.ts TYPE_PALETTE_NAMES
## reach
in2 src/lib/core/settings/theme-builder.logic.ts 23 files in 11 modules: src/lib/core/settings(8) src/lib/features/file-icons(3) src/lib/features/rail-shell(3) src/lib/features/properties(2) src/lib/app(1) +6 modules: q impact src/lib/core/settings/theme-builder.logic.ts --depth 2
out2 src/lib/core/settings/theme-builder.logic.ts 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/core/settings/theme-builder.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts mirror
test src/tests/fixtures/hard-palette-themes.fixture.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/AppearanceSection.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/ThemeEditor.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-catalog.service.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-css-contract.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-editor.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-package.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-validation.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/tint-text-tokens.test.ts imports src/lib/core/settings/theme-builder.logic.ts
## symbols
sym src/lib/core/settings/theme-builder.logic.ts:8 const TYPE_PALETTE_NAMES L1 | Names of the categorical type palette.
by src/lib/core/settings/theme-builder.logic.ts:TYPE_PALETTE_NAMES <- src/lib/features/file-icons/file-icons.logic.ts:223 in iconColorCss ref
sym src/lib/core/settings/theme-builder.logic.ts:11 const TYPE_PALETTE_TOKENS L3 | UI token keys of the type palette, in `TYPE_PALETTE_NAMES` order.
sym src/lib/core/settings/theme-builder.logic.ts:19 interface CorePalette L60 | Core palette of a built-in theme; `buildTheme` derives every other token from it.
by src/lib/core/settings/theme-builder.logic.ts:CorePalette <- src/lib/core/settings/theme-package.logic.ts:2 in (module) import
sym src/lib/core/settings/theme-builder.logic.ts:89 fn alpha(color: string, a: string): string L7 | Applies a two-digit hex alpha to a color: appended to a 6-digit hex, and through `color-mix` for any other CSS color so the result stays valid.
by src/lib/core/settings/theme-builder.logic.ts:alpha <- src/lib/core/settings/theme.logic.ts:51 in elevationVars call +4
sym src/lib/core/settings/theme-builder.logic.ts:105 const READABILITY_PAIRS: ReadabilityPair[] L79 | Pairs every built-in theme must keep readable: 4.5:1 for text, 7:1 for body text, 3:1 for headings, markers and accent hues (large or non-text).
sym src/lib/core/settings/theme-builder.logic.ts:198 fn withReadableContrast(colors: ThemeColors): ThemeColors L17 | Moves each failing foreground of `READABILITY_PAIRS` to its minimum contrast and returns the result as a copy; backgrounds are never changed.
by src/lib/core/settings/theme-builder.logic.ts:withReadableContrast <- src/lib/core/settings/theme.logic.ts:85 in themeColorsToCssVars call
sym src/lib/core/settings/theme-builder.logic.ts:217 interface ReadabilityFailure L10 | A `READABILITY_PAIRS` pair that a theme's own foreground fails.
by src/lib/core/settings/theme-builder.logic.ts:ReadabilityFailure <- src/lib/core/settings/sections/ThemeColorRow.svelte:4 in (script) import
sym src/lib/core/settings/theme-builder.logic.ts:236 fn readabilityFailures(colors: ThemeColors): Map<string, ReadabilityFailure> L21 | The pairs a theme's own colors fail, keyed by foreground token (`ui.mutedForeground`); a token failing several surfaces keeps its worst one (lowest share of it…
by src/lib/core/settings/theme-builder.logic.ts:readabilityFailures <- src/lib/core/settings/sections/ThemeEditor.svelte:59 in failures=$derived call
sym src/lib/core/settings/theme-builder.logic.ts:301 type ThemeOverrides L1 | Per-token overrides applied on top of the derived theme.
by src/lib/core/settings/theme-builder.logic.ts:ThemeOverrides <- src/lib/core/settings/theme-package.logic.ts:2 in (module) import
sym src/lib/core/settings/theme-builder.logic.ts:309 fn buildTheme(name: string, core: CorePalette, overrides: ThemeOverrides = {}): Theme L84 | Expands a core palette into the full token set of a KokoBrain theme, applies `overrides` (tokens a theme sets differently from the derivation).
by src/lib/core/settings/theme-builder.logic.ts:buildTheme <- src/lib/core/settings/theme-package.logic.ts:193 in buildThemeFromPackage call +1
by src/lib/core/settings/theme-builder.logic.ts:buildTheme <- src/lib/core/settings/theme.logic.ts:114 in mergeThemeWithDefaults call +2
sym src/lib/core/settings/theme-builder.logic.ts:398 fn coreFromColors(c: ThemeColors): CorePalette L12 | Reads a core palette back out of a full theme, from the token each core field is derived into; inverse of `buildTheme` for themes built without overrides.
by src/lib/core/settings/theme-builder.logic.ts:coreFromColors <- src/lib/core/settings/theme-package.logic.ts:342 in packageFromColors call
by src/lib/core/settings/theme-builder.logic.ts:coreFromColors <- src/lib/core/settings/theme.logic.ts:114 in mergeThemeWithDefaults call
## locals
local src/lib/core/settings/theme-builder.logic.ts:186 fn copyGroups(colors: ThemeColors) L6
local src/lib/core/settings/theme-builder.logic.ts:265 fn readableCore(p: CorePalette, ui: Partial<UIColors> = {}): CorePalette L34
## calls
call src/lib/core/settings/theme-builder.logic.ts:199 in withReadableContrast -> src/lib/core/settings/theme-builder.logic.ts:copyGroups call
call src/lib/core/settings/theme-builder.logic.ts:205 in withReadableContrast -> src/lib/utils/color.ts:flatten call
call src/lib/core/settings/theme-builder.logic.ts:207 in withReadableContrast -> src/lib/utils/color.ts:ensureContrast call
call src/lib/core/settings/theme-builder.logic.ts:238 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:copyGroups call +1
call src/lib/core/settings/theme-builder.logic.ts:247 in readabilityFailures -> src/lib/utils/color.ts:flatten call
call src/lib/core/settings/theme-builder.logic.ts:248 in readabilityFailures -> src/lib/utils/color.ts:ensureContrast call
call src/lib/core/settings/theme-builder.logic.ts:249 in readabilityFailures -> src/lib/utils/color.ts:contrastRatio call
call src/lib/core/settings/theme-builder.logic.ts:268 in readableCore -> src/lib/utils/color.ts:ensureContrast call +2
call src/lib/core/settings/theme-builder.logic.ts:273 in readableCore -> src/lib/utils/color.ts:flatten call +1
call src/lib/core/settings/theme-builder.logic.ts:310 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:readableCore call
call src/lib/core/settings/theme-builder.logic.ts:315 in buildTheme -> src/lib/utils/color.ts:mixColors call
call src/lib/core/settings/theme-builder.logic.ts:334 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:alpha call +10
call src/lib/core/settings/theme-builder.logic.ts:384 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:withReadableContrast call
