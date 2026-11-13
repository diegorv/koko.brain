# file card src/lib/core/settings/theme-builder.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme-builder.logic.ts ' codemap/files
file src/lib/core/settings/theme-builder.logic.ts logic L318 module src/lib/core/settings in3 t10
## imports
imp src/lib/core/settings/theme-builder.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors
imp src/lib/core/settings/theme-builder.logic.ts:2 -> src/lib/utils/color.ts ensureContrast,flatten,mixColors
## imported-by
imp src/lib/core/settings/theme-package.logic.ts:2 -> src/lib/core/settings/theme-builder.logic.ts buildTheme,coreFromColors,type:CorePalette,type:ThemeOverrides
imp src/lib/core/settings/theme.logic.ts:12 -> src/lib/core/settings/theme-builder.logic.ts alpha,buildTheme,coreFromColors
imp src/lib/features/file-icons/file-icons.logic.ts:5 -> src/lib/core/settings/theme-builder.logic.ts TYPE_PALETTE_NAMES
## reach
in2 src/lib/core/settings/theme-builder.logic.ts 23 files in 10 modules: src/lib/core/settings(9) src/lib/features/file-icons(3) src/lib/features/rail-shell(3) src/lib/features/properties(2) src/lib/app(1) +5 modules: q impact src/lib/core/settings/theme-builder.logic.ts --depth 2
out2 src/lib/core/settings/theme-builder.logic.ts 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/core/settings/theme-builder.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts mirror
test src/tests/lib/core/settings/AppearanceSection.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-catalog.service.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-css-contract.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-editor.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-package.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme-validation.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/core/settings/theme.logic.test.ts imports src/lib/core/settings/theme-builder.logic.ts
test src/tests/lib/features/rail-shell/RailNoteList.test.ts imports src/lib/core/settings/theme-builder.logic.ts
## symbols
sym src/lib/core/settings/theme-builder.logic.ts:8 const TYPE_PALETTE_NAMES L1 | Names of the categorical type palette.
by src/lib/core/settings/theme-builder.logic.ts:TYPE_PALETTE_NAMES <- src/lib/features/file-icons/file-icons.logic.ts:222 in iconColorCss ref
sym src/lib/core/settings/theme-builder.logic.ts:11 const TYPE_PALETTE_TOKENS L3 | UI token keys of the type palette, in `TYPE_PALETTE_NAMES` order.
sym src/lib/core/settings/theme-builder.logic.ts:19 interface CorePalette L60 | Core palette of a built-in theme; `buildTheme` derives every other token from it.
by src/lib/core/settings/theme-builder.logic.ts:CorePalette <- src/lib/core/settings/theme-package.logic.ts:2 in (module) import
sym src/lib/core/settings/theme-builder.logic.ts:89 fn alpha(color: string, a: string): string L7 | Applies a two-digit hex alpha to a color: appended to a 6-digit hex, and through `color-mix` for any other CSS color so the result stays valid.
by src/lib/core/settings/theme-builder.logic.ts:alpha <- src/lib/core/settings/theme.logic.ts:51 in elevationVars call +4
sym src/lib/core/settings/theme-builder.logic.ts:105 const READABILITY_PAIRS: ReadabilityPair[] L51 | Pairs every built-in theme must keep readable: 4.5:1 for text, 7:1 for body text, 3:1 for headings, markers and accent hues (large or non-text).
sym src/lib/core/settings/theme-builder.logic.ts:210 type ThemeOverrides L1 | Per-token overrides applied on top of the derived theme.
by src/lib/core/settings/theme-builder.logic.ts:ThemeOverrides <- src/lib/core/settings/theme-package.logic.ts:2 in (module) import
sym src/lib/core/settings/theme-builder.logic.ts:218 fn buildTheme(name: string, core: CorePalette, overrides: ThemeOverrides = {}): Theme L84 | Expands a core palette into the full token set of a KokoBrain theme, applies `overrides` (tokens a theme sets differently from the derivation).
by src/lib/core/settings/theme-builder.logic.ts:buildTheme <- src/lib/core/settings/theme-package.logic.ts:193 in buildThemeFromPackage call +1
by src/lib/core/settings/theme-builder.logic.ts:buildTheme <- src/lib/core/settings/theme.logic.ts:102 in mergeThemeWithDefaults call +2
sym src/lib/core/settings/theme-builder.logic.ts:307 fn coreFromColors(c: ThemeColors): CorePalette L12 | Reads a core palette back out of a full theme, from the token each core field is derived into; inverse of `buildTheme` for themes built without overrides.
by src/lib/core/settings/theme-builder.logic.ts:coreFromColors <- src/lib/core/settings/theme-package.logic.ts:342 in packageFromColors call
by src/lib/core/settings/theme-builder.logic.ts:coreFromColors <- src/lib/core/settings/theme.logic.ts:102 in mergeThemeWithDefaults call
## locals
local src/lib/core/settings/theme-builder.logic.ts:158 fn withReadableContrast(colors: ThemeColors): ThemeColors L18
local src/lib/core/settings/theme-builder.logic.ts:182 fn readableCore(p: CorePalette): CorePalette L26
## calls
call src/lib/core/settings/theme-builder.logic.ts:166 in withReadableContrast -> src/lib/utils/color.ts:flatten call
call src/lib/core/settings/theme-builder.logic.ts:168 in withReadableContrast -> src/lib/utils/color.ts:ensureContrast call
call src/lib/core/settings/theme-builder.logic.ts:185 in readableCore -> src/lib/utils/color.ts:ensureContrast call +2
call src/lib/core/settings/theme-builder.logic.ts:196 in readableCore -> src/lib/utils/color.ts:flatten call
call src/lib/core/settings/theme-builder.logic.ts:219 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:readableCore call
call src/lib/core/settings/theme-builder.logic.ts:224 in buildTheme -> src/lib/utils/color.ts:mixColors call
call src/lib/core/settings/theme-builder.logic.ts:243 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:alpha call +10
call src/lib/core/settings/theme-builder.logic.ts:293 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:withReadableContrast call
