# file card src/lib/core/settings/theme-validation.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme-validation.logic.ts ' codemap/files
file src/lib/core/settings/theme-validation.logic.ts logic L76 module src/lib/core/settings in2 t1
## imports
imp src/lib/core/settings/theme-validation.logic.ts:1 -> src/lib/core/settings/theme.logic.ts KOKOBRAIN_DEFAULT_THEME
## imported-by
imp src/lib/core/settings/theme-editor.logic.ts:11 -> src/lib/core/settings/theme-validation.logic.ts findInvalidThemeToken,withoutRetiredTokens
imp src/lib/core/settings/theme-package.logic.ts:3 -> src/lib/core/settings/theme-validation.logic.ts findInvalidThemeToken,isThemeColorValue,withoutRetiredTokens
## reach
in2 src/lib/core/settings/theme-validation.logic.ts 7 files in 2 modules: src/lib/core/settings(6) src/lib/features/tags(1)
out2 src/lib/core/settings/theme-validation.logic.ts 3 files in 2 modules: src/lib/core/settings(2) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/theme-validation.logic.test.ts imports src/lib/core/settings/theme-validation.logic.ts mirror
## symbols
sym src/lib/core/settings/theme-validation.logic.ts:4 const MAX_COLOR_VALUE_LENGTH L1 | Longest accepted color value, in characters.
sym src/lib/core/settings/theme-validation.logic.ts:26 fn isThemeColorValue(value: unknown): boolean L6 | True when `value` is a color a theme token may hold.
by src/lib/core/settings/theme-validation.logic.ts:isThemeColorValue <- src/lib/core/settings/theme-package.logic.ts:85 in paletteError call +1
sym src/lib/core/settings/theme-validation.logic.ts:53 fn findInvalidThemeToken(colors: unknown): string | null L12 | Checks a full or partial theme token map (`{ group: { key: color } }`).
by src/lib/core/settings/theme-validation.logic.ts:findInvalidThemeToken <- src/lib/core/settings/theme-editor.logic.ts:298 in parseThemeFromImport call
by src/lib/core/settings/theme-validation.logic.ts:findInvalidThemeToken <- src/lib/core/settings/theme-package.logic.ts:124 in parseThemePackage call
sym src/lib/core/settings/theme-validation.logic.ts:70 fn withoutRetiredTokens<T extends object>(colors: T): T L7 | Returns a copy of a token map that `findInvalidThemeToken` accepted, without the retired tokens.
by src/lib/core/settings/theme-validation.logic.ts:withoutRetiredTokens <- src/lib/core/settings/theme-editor.logic.ts:302 in parseThemeFromImport call
by src/lib/core/settings/theme-validation.logic.ts:withoutRetiredTokens <- src/lib/core/settings/theme-package.logic.ts:129 in parseThemePackage call
## locals
local src/lib/core/settings/theme-validation.logic.ts:13 fn isBaseColor(value: string): boolean L3
local src/lib/core/settings/theme-validation.logic.ts:33 fn isPlainObject(value: unknown): value is Record<string, unknown> L3
## calls
call src/lib/core/settings/theme-validation.logic.ts:28 in isThemeColorValue -> src/lib/core/settings/theme-validation.logic.ts:isBaseColor call +1
call src/lib/core/settings/theme-validation.logic.ts:54 in findInvalidThemeToken -> src/lib/core/settings/theme-validation.logic.ts:isPlainObject call +1
call src/lib/core/settings/theme-validation.logic.ts:60 in findInvalidThemeToken -> src/lib/core/settings/theme-validation.logic.ts:isThemeColorValue call
