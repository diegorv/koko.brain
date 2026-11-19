# file card src/lib/core/settings/theme-builder.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme-builder.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/core/settings/theme-builder.logic.ts logic L556 module src/lib/core/settings in5 t13
## imports
imp src/lib/core/settings/theme-builder.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors,type:UIColors
imp src/lib/core/settings/theme-builder.logic.ts:2 -> src/lib/utils/color.ts apcaContrast,contrastRatio,ensureContrast,ensureContrastOn,flatten,mixColors,shiftLightness,tint
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
sym src/lib/core/settings/theme-builder.logic.ts:107 const TEXT_LC L1 | APCA |Lc| floor for muted and small text, the second gate next to WCAG 2.
sym src/lib/core/settings/theme-builder.logic.ts:110 fn minLcOf(min: number): number L3 | APCA minimum of a pair: text pairs (4.5:1 or more) need `TEXT_LC`, large text and non-text none.
sym src/lib/core/settings/theme-builder.logic.ts:120 const READABILITY_PAIRS: ReadabilityPair[] L112 | Pairs every built-in theme must keep readable: 4.5:1 for text, 7:1 for body text, 3:1 for headings, markers and accent hues (large or non-text).
sym src/lib/core/settings/theme-builder.logic.ts:256 fn withReadableContrast(colors: ThemeColors): ThemeColors L20 | Moves each failing foreground of `READABILITY_PAIRS` to its minimum contrast (WCAG, and APCA for text) and returns the result as a copy; backgrounds are never …
by src/lib/core/settings/theme-builder.logic.ts:withReadableContrast <- src/lib/core/settings/theme.logic.ts:85 in themeColorsToCssVars call
sym src/lib/core/settings/theme-builder.logic.ts:289 interface ReadabilityFailure L14 | A `READABILITY_PAIRS` pair that a theme's own foreground fails.
by src/lib/core/settings/theme-builder.logic.ts:ReadabilityFailure <- src/lib/core/settings/sections/ThemeColorRow.svelte:4 in (script) import
sym src/lib/core/settings/theme-builder.logic.ts:318 fn readabilityFailures(colors: ThemeColors): Map<string, ReadabilityFailure> L35 | The pairs a theme's own colors fail, keyed by foreground token (`ui.mutedForeground`); a token failing several surfaces keeps its worst one (lowest share of th…
by src/lib/core/settings/theme-builder.logic.ts:readabilityFailures <- src/lib/core/settings/sections/ThemeEditor.svelte:59 in failures=$derived call
sym src/lib/core/settings/theme-builder.logic.ts:448 type ThemeOverrides L1 | Per-token overrides applied on top of the derived theme.
by src/lib/core/settings/theme-builder.logic.ts:ThemeOverrides <- src/lib/core/settings/theme-package.logic.ts:2 in (module) import
sym src/lib/core/settings/theme-builder.logic.ts:456 fn buildTheme(name: string, core: CorePalette, overrides: ThemeOverrides = {}): Theme L84 | Expands a core palette into the full token set of a KokoBrain theme, applies `overrides` (tokens a theme sets differently from the derivation).
by src/lib/core/settings/theme-builder.logic.ts:buildTheme <- src/lib/core/settings/theme-package.logic.ts:193 in buildThemeFromPackage call +1
by src/lib/core/settings/theme-builder.logic.ts:buildTheme <- src/lib/core/settings/theme.logic.ts:114 in mergeThemeWithDefaults call +2
sym src/lib/core/settings/theme-builder.logic.ts:545 fn coreFromColors(c: ThemeColors): CorePalette L12 | Reads a core palette back out of a full theme, from the token each core field is derived into; inverse of `buildTheme` for themes built without overrides.
by src/lib/core/settings/theme-builder.logic.ts:coreFromColors <- src/lib/core/settings/theme-package.logic.ts:342 in packageFromColors call
by src/lib/core/settings/theme-builder.logic.ts:coreFromColors <- src/lib/core/settings/theme.logic.ts:114 in mergeThemeWithDefaults call
## locals
local src/lib/core/settings/theme-builder.logic.ts:234 fn copyGroups(colors: ThemeColors) L6
local src/lib/core/settings/theme-builder.logic.ts:245 fn flattenedSurface(surface: string, ui: Record<string, string>, base: keyof UIColors = 'editorBg'): string L4
local src/lib/core/settings/theme-builder.logic.ts:282 fn buttonSurfaces(ui: Record<string, string>): string[] L5
local src/lib/core/settings/theme-builder.logic.ts:305 fn failureShare({ ratio, min, lc, minLc }: ReadabilityFailure): number L3
local src/lib/core/settings/theme-builder.logic.ts:361 fn labelOnFill(fill: string, surfaces: string[]): { fill: string; label: string } | null L6
local src/lib/core/settings/theme-builder.logic.ts:369 fn lcOf(label: string, bg: string): number L3
local src/lib/core/settings/theme-builder.logic.ts:374 fn readsAsLabel(label: string, bg: string): boolean L3
local src/lib/core/settings/theme-builder.logic.ts:383 fn fillUnderLabel(label: string, fill: string, surfaces: string[]): string L13
local src/lib/core/settings/theme-builder.logic.ts:404 fn readableCore(p: CorePalette, ui: Partial<UIColors> = {}): CorePalette L42
## calls
call src/lib/core/settings/theme-builder.logic.ts:247 in flattenedSurface -> src/lib/utils/color.ts:flatten call +1
call src/lib/core/settings/theme-builder.logic.ts:257 in withReadableContrast -> src/lib/core/settings/theme-builder.logic.ts:copyGroups call
call src/lib/core/settings/theme-builder.logic.ts:263 in withReadableContrast -> src/lib/core/settings/theme-builder.logic.ts:flattenedSurface call
call src/lib/core/settings/theme-builder.logic.ts:265 in withReadableContrast -> src/lib/core/settings/theme-builder.logic.ts:minLcOf call
call src/lib/core/settings/theme-builder.logic.ts:265 in withReadableContrast -> src/lib/utils/color.ts:ensureContrast call
call src/lib/core/settings/theme-builder.logic.ts:272 in withReadableContrast -> src/lib/core/settings/theme-builder.logic.ts:buttonSurfaces call
call src/lib/core/settings/theme-builder.logic.ts:272 in withReadableContrast -> src/lib/core/settings/theme-builder.logic.ts:fillUnderLabel call
call src/lib/core/settings/theme-builder.logic.ts:285 in buttonSurfaces -> src/lib/core/settings/theme-builder.logic.ts:flattenedSurface call
call src/lib/core/settings/theme-builder.logic.ts:320 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:copyGroups call +1
call src/lib/core/settings/theme-builder.logic.ts:321 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:withReadableContrast call
call src/lib/core/settings/theme-builder.logic.ts:324 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:failureShare call +1
call src/lib/core/settings/theme-builder.logic.ts:332 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:flattenedSurface call
call src/lib/core/settings/theme-builder.logic.ts:333 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:minLcOf call
call src/lib/core/settings/theme-builder.logic.ts:334 in readabilityFailures -> src/lib/utils/color.ts:contrastRatio call +1
call src/lib/core/settings/theme-builder.logic.ts:335 in readabilityFailures -> src/lib/utils/color.ts:apcaContrast call +1
call src/lib/core/settings/theme-builder.logic.ts:336 in readabilityFailures -> src/lib/utils/color.ts:ensureContrast call
call src/lib/core/settings/theme-builder.logic.ts:345 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:buttonSurfaces call
call src/lib/core/settings/theme-builder.logic.ts:345 in readabilityFailures -> src/lib/utils/color.ts:tint call
call src/lib/core/settings/theme-builder.logic.ts:346 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:readsAsLabel call
call src/lib/core/settings/theme-builder.logic.ts:348 in readabilityFailures -> src/lib/core/settings/theme-builder.logic.ts:lcOf call
call src/lib/core/settings/theme-builder.logic.ts:362 in labelOnFill -> src/lib/utils/color.ts:apcaContrast call
call src/lib/core/settings/theme-builder.logic.ts:363 in labelOnFill -> src/lib/core/settings/theme-builder.logic.ts:readsAsLabel call +1
call src/lib/core/settings/theme-builder.logic.ts:364 in labelOnFill -> src/lib/core/settings/theme-builder.logic.ts:lcOf call +1
call src/lib/core/settings/theme-builder.logic.ts:365 in labelOnFill -> src/lib/core/settings/theme-builder.logic.ts:fillUnderLabel call
call src/lib/core/settings/theme-builder.logic.ts:370 in lcOf -> src/lib/utils/color.ts:apcaContrast call
call src/lib/core/settings/theme-builder.logic.ts:375 in readsAsLabel -> src/lib/core/settings/theme-builder.logic.ts:lcOf call
call src/lib/core/settings/theme-builder.logic.ts:375 in readsAsLabel -> src/lib/utils/color.ts:contrastRatio call
call src/lib/core/settings/theme-builder.logic.ts:384 in fillUnderLabel -> src/lib/utils/color.ts:apcaContrast call
call src/lib/core/settings/theme-builder.logic.ts:390 in fillUnderLabel -> src/lib/utils/color.ts:tint call
call src/lib/core/settings/theme-builder.logic.ts:391 in fillUnderLabel -> src/lib/core/settings/theme-builder.logic.ts:readsAsLabel call
call src/lib/core/settings/theme-builder.logic.ts:392 in fillUnderLabel -> src/lib/utils/color.ts:shiftLightness call
call src/lib/core/settings/theme-builder.logic.ts:406 in readableCore -> src/lib/core/settings/theme-builder.logic.ts:minLcOf call
call src/lib/core/settings/theme-builder.logic.ts:406 in readableCore -> src/lib/utils/color.ts:ensureContrastOn call
call src/lib/core/settings/theme-builder.logic.ts:407 in readableCore -> src/lib/utils/color.ts:flatten call +2
call src/lib/core/settings/theme-builder.logic.ts:421 in readableCore -> src/lib/core/settings/theme-builder.logic.ts:labelOnFill call
call src/lib/core/settings/theme-builder.logic.ts:431 in readableCore -> src/lib/utils/color.ts:ensureContrast call +1
call src/lib/core/settings/theme-builder.logic.ts:457 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:readableCore call
call src/lib/core/settings/theme-builder.logic.ts:462 in buildTheme -> src/lib/utils/color.ts:mixColors call
call src/lib/core/settings/theme-builder.logic.ts:481 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:alpha call +10
call src/lib/core/settings/theme-builder.logic.ts:531 in buildTheme -> src/lib/core/settings/theme-builder.logic.ts:withReadableContrast call
