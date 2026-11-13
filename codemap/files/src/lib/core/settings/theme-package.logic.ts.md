# file card src/lib/core/settings/theme-package.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme-package.logic.ts ' codemap/files
file src/lib/core/settings/theme-package.logic.ts logic L404 module src/lib/core/settings in4 t3
## imports
imp src/lib/core/settings/theme-package.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:AppearanceSettings,type:Theme,type:ThemeColors
imp src/lib/core/settings/theme-package.logic.ts:2 -> src/lib/core/settings/theme-builder.logic.ts buildTheme,coreFromColors,type:CorePalette,type:ThemeOverrides
imp src/lib/core/settings/theme-package.logic.ts:3 -> src/lib/core/settings/theme-validation.logic.ts findInvalidThemeToken,isThemeColorValue,withoutRetiredTokens
imp src/lib/core/settings/theme-package.logic.ts:4 -> src/lib/core/settings/theme.logic.ts BUILTIN_THEMES,DEFAULT_THEME_NAME,mergeThemeWithDefaults,normalizeAppearance
## imported-by
imp src/lib/core/settings/sections/AppearanceSection.svelte:9 -> src/lib/core/settings/theme-package.logic.ts buildThemeFromPackage,catalogEntryState,installThemePackage,isInstalledTheme,sortCatalogEntries,sortThemesForDisplay,uninstallTheme,updateThemePackage,type:CatalogEntry,type:ThemePackage
imp src/lib/core/settings/settings.service.ts:5 -> src/lib/core/settings/theme-package.logic.ts loadAppearance
imp src/lib/core/settings/theme-catalog.service.ts:3 -> src/lib/core/settings/theme-package.logic.ts parseThemeCatalog,type:CatalogEntry
imp src/lib/core/settings/theme.types.ts:1 -> src/lib/core/settings/theme-package.logic.ts type:ThemePackage
## reach
in2 src/lib/core/settings/theme-package.logic.ts 12 files in 3 modules: src/lib/core/settings(9) src/lib/app(2) src/lib/core/markdown-editor(1)
out2 src/lib/core/settings/theme-package.logic.ts 1 files in 1 modules: src/lib/utils(1)
## tests
test src/tests/lib/core/settings/theme-package.logic.test.ts imports src/lib/core/settings/theme-package.logic.ts mirror
test src/tests/lib/core/settings/AppearanceSection.test.ts imports src/lib/core/settings/theme-package.logic.ts
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/core/settings/theme-package.logic.ts
test src/tests/lib/core/settings/theme-catalog.service.test.ts imports-type src/lib/core/settings/theme-package.logic.ts
## symbols
sym src/lib/core/settings/theme-package.logic.ts:7 const THEME_PACKAGE_SCHEMA_VERSION L1 | Highest package `schemaVersion` this app can read.
sym src/lib/core/settings/theme-package.logic.ts:10 const MAX_CATALOG_LENGTH L1 | Longest accepted catalog index, in characters.
sym src/lib/core/settings/theme-package.logic.ts:17 interface ThemePackage L16 | A theme as published in the `diegorv/koko.brain-themes` catalog: the source `buildTheme` expands, not the expanded tokens, so a token the app adds later is der…
by src/lib/core/settings/theme-package.logic.ts:ThemePackage <- src/lib/core/settings/sections/AppearanceSection.svelte:19 in (script) import
by src/lib/core/settings/theme-package.logic.ts:ThemePackage <- src/lib/core/settings/theme.types.ts:1 in (module) import
sym src/lib/core/settings/theme-package.logic.ts:35 interface TooNewPackageInfo L12 | What the catalog shows for an entry whose `schemaVersion` this app cannot read.
sym src/lib/core/settings/theme-package.logic.ts:49 type CatalogEntry L1 | A catalog entry the app can show.
by src/lib/core/settings/theme-package.logic.ts:CatalogEntry <- src/lib/core/settings/sections/AppearanceSection.svelte:18 in (script) import
by src/lib/core/settings/theme-package.logic.ts:CatalogEntry <- src/lib/core/settings/theme-catalog.service.ts:3 in (module) import
sym src/lib/core/settings/theme-package.logic.ts:52 type PackageParseResult L1 | Result of reading one package.
sym src/lib/core/settings/theme-package.logic.ts:55 type CatalogParseResult L3 | Result of reading the catalog index; `skipped` holds one reason per refused entry.
sym src/lib/core/settings/theme-package.logic.ts:60 type CatalogEntryState L1 | How the catalog presents an entry.
sym src/lib/core/settings/theme-package.logic.ts:99 fn parseThemePackage(raw: unknown): PackageParseResult L33 | Reads one package from untrusted JSON.
sym src/lib/core/settings/theme-package.logic.ts:139 fn parseThemeCatalog(text: string): CatalogParseResult L31 | Reads the catalog `index.json` (`{ schemaVersion, themes: ThemePackage[] }`).
by src/lib/core/settings/theme-package.logic.ts:parseThemeCatalog <- src/lib/core/settings/theme-catalog.service.ts:41 in readCatalog call
sym src/lib/core/settings/theme-package.logic.ts:176 fn compareThemeVersions(a: string, b: string): number | null L9 | Compares two `MAJOR.MINOR.PATCH` versions part by part as numbers, so `1.0.10` is newer than `1.0.9`.
sym src/lib/core/settings/theme-package.logic.ts:192 fn buildThemeFromPackage(pkg: ThemePackage): Theme L3 | Expands a package into a theme with the theme builder.
by src/lib/core/settings/theme-package.logic.ts:buildThemeFromPackage <- src/lib/core/settings/sections/AppearanceSection.svelte:41 in catalogPreviews=$derived call
sym src/lib/core/settings/theme-package.logic.ts:197 fn isInstalledTheme(appearance: AppearanceSettings, name: string): boolean L3 | True when the theme named `name` comes from an installed package (cannot be edited in place).
by src/lib/core/settings/theme-package.logic.ts:isInstalledTheme <- src/lib/core/settings/sections/AppearanceSection.svelte:170 in (markup) markup
sym src/lib/core/settings/theme-package.logic.ts:206 fn installThemePackage(appearance: AppearanceSettings, pkg: ThemePackage): { ok: true; appearance: AppearanceSettings } | { ok: false; error:… L18 | Installs a package: its built theme joins the theme list and the package is stored as the source.
by src/lib/core/settings/theme-package.logic.ts:installThemePackage <- src/lib/core/settings/sections/AppearanceSection.svelte:61 in installTheme call
sym src/lib/core/settings/theme-package.logic.ts:232 fn updateThemePackage(appearance: AppearanceSettings, pkg: ThemePackage): { ok: true; appearance: AppearanceSettings } | { ok: false; error:… L27 | Replaces an installed package with a newer version of the same `id`.
by src/lib/core/settings/theme-package.logic.ts:updateThemePackage <- src/lib/core/settings/sections/AppearanceSection.svelte:71 in updateTheme call
sym src/lib/core/settings/theme-package.logic.ts:261 fn uninstallTheme(appearance: AppearanceSettings, name: string): AppearanceSettings L8 | Removes an installed theme and its package; the active theme falls back to the default.
by src/lib/core/settings/theme-package.logic.ts:uninstallTheme <- src/lib/core/settings/sections/AppearanceSection.svelte:83 in handleUninstall call
sym src/lib/core/settings/theme-package.logic.ts:280 fn sortThemesForDisplay(themes: Theme[]): Theme[] L7 | Display order of the theme list: the built-ins first, in `BUILTIN_THEMES` order, then every other theme by name.
by src/lib/core/settings/theme-package.logic.ts:sortThemesForDisplay <- src/lib/core/settings/sections/AppearanceSection.svelte:167 in (markup) markup
sym src/lib/core/settings/theme-package.logic.ts:289 fn sortCatalogEntries(entries: CatalogEntry[]): CatalogEntry[] L4 | Display order of the catalog: by name, so a renamed theme moves with its new name.
by src/lib/core/settings/theme-package.logic.ts:sortCatalogEntries <- src/lib/core/settings/sections/AppearanceSection.svelte:47 in loadCatalog call
sym src/lib/core/settings/theme-package.logic.ts:295 fn catalogEntryState(entry: CatalogEntry, appearance: AppearanceSettings): CatalogEntryState L10 | Decides what the catalog shows for an entry, given the current appearance settings.
by src/lib/core/settings/theme-package.logic.ts:catalogEntryState <- src/lib/core/settings/sections/AppearanceSection.svelte:272 in (markup) markup
sym src/lib/core/settings/theme-package.logic.ts:341 fn packageFromColors(id: string, name: string, colors: ThemeColors): ThemePackage L15 | Turns a full set of colors into a package whose built theme has exactly those colors: the palette is read back with `coreFromColors`, and every token the build…
sym src/lib/core/settings/theme-package.logic.ts:390 fn loadAppearance(saved: Partial<AppearanceSettings>): AppearanceSettings L15 | Normalizes saved appearance settings (`normalizeAppearance`) and rebuilds every installed theme from its package: the colors saved in `themes` under an install…
by src/lib/core/settings/theme-package.logic.ts:loadAppearance <- src/lib/core/settings/settings.service.ts:150 in parseSettings call
## locals
local src/lib/core/settings/theme-package.logic.ts:72 fn isPlainObject(value: unknown): value is Record<string, unknown> L3
local src/lib/core/settings/theme-package.logic.ts:77 fn paletteError(palette: unknown): string | null L15
local src/lib/core/settings/theme-package.logic.ts:187 fn isNewerVersion(candidate: string, current: string): boolean L3
local src/lib/core/settings/theme-package.logic.ts:271 fn compareNames(a: string, b: string): number L3
local src/lib/core/settings/theme-package.logic.ts:363 fn migrateExBuiltins(raw: Partial<AppearanceSettings>): Partial<AppearanceSettings> L18
## calls
call src/lib/core/settings/theme-package.logic.ts:78 in paletteError -> src/lib/core/settings/theme-package.logic.ts:isPlainObject call
call src/lib/core/settings/theme-package.logic.ts:85 in paletteError -> src/lib/core/settings/theme-validation.logic.ts:isThemeColorValue call +1
call src/lib/core/settings/theme-package.logic.ts:100 in parseThemePackage -> src/lib/core/settings/theme-package.logic.ts:isPlainObject call
call src/lib/core/settings/theme-package.logic.ts:121 in parseThemePackage -> src/lib/core/settings/theme-package.logic.ts:paletteError call
call src/lib/core/settings/theme-package.logic.ts:124 in parseThemePackage -> src/lib/core/settings/theme-validation.logic.ts:findInvalidThemeToken call
call src/lib/core/settings/theme-package.logic.ts:129 in parseThemePackage -> src/lib/core/settings/theme-validation.logic.ts:withoutRetiredTokens call
call src/lib/core/settings/theme-package.logic.ts:147 in parseThemeCatalog -> src/lib/core/settings/theme-package.logic.ts:isPlainObject call
call src/lib/core/settings/theme-package.logic.ts:155 in parseThemeCatalog -> src/lib/core/settings/theme-package.logic.ts:parseThemePackage call
call src/lib/core/settings/theme-package.logic.ts:188 in isNewerVersion -> src/lib/core/settings/theme-package.logic.ts:compareThemeVersions call
call src/lib/core/settings/theme-package.logic.ts:193 in buildThemeFromPackage -> src/lib/core/settings/theme-builder.logic.ts:buildTheme call
call src/lib/core/settings/theme-package.logic.ts:219 in installThemePackage -> src/lib/core/settings/theme-package.logic.ts:buildThemeFromPackage call
call src/lib/core/settings/theme-package.logic.ts:239 in updateThemePackage -> src/lib/core/settings/theme-package.logic.ts:isNewerVersion call
call src/lib/core/settings/theme-package.logic.ts:248 in updateThemePackage -> src/lib/core/settings/theme-package.logic.ts:buildThemeFromPackage call
call src/lib/core/settings/theme-package.logic.ts:282 in sortThemesForDisplay -> src/lib/core/settings/theme.logic.ts:BUILTIN_THEMES mcall
call src/lib/core/settings/theme-package.logic.ts:285 in sortThemesForDisplay -> src/lib/core/settings/theme-package.logic.ts:compareNames call
call src/lib/core/settings/theme-package.logic.ts:291 in sortCatalogEntries -> src/lib/core/settings/theme-package.logic.ts:compareNames call
call src/lib/core/settings/theme-package.logic.ts:299 in catalogEntryState -> src/lib/core/settings/theme-package.logic.ts:isNewerVersion call
call src/lib/core/settings/theme-package.logic.ts:342 in packageFromColors -> src/lib/core/settings/theme-builder.logic.ts:coreFromColors call
call src/lib/core/settings/theme-package.logic.ts:343 in packageFromColors -> src/lib/core/settings/theme-builder.logic.ts:buildTheme call
call src/lib/core/settings/theme-package.logic.ts:373 in migrateExBuiltins -> src/lib/core/settings/theme.logic.ts:mergeThemeWithDefaults call
call src/lib/core/settings/theme-package.logic.ts:374 in migrateExBuiltins -> src/lib/core/settings/theme-package.logic.ts:packageFromColors call
call src/lib/core/settings/theme-package.logic.ts:391 in loadAppearance -> src/lib/core/settings/theme-package.logic.ts:migrateExBuiltins call
call src/lib/core/settings/theme-package.logic.ts:394 in loadAppearance -> src/lib/core/settings/theme-package.logic.ts:parseThemePackage call
call src/lib/core/settings/theme-package.logic.ts:397 in loadAppearance -> src/lib/core/settings/theme.logic.ts:normalizeAppearance call
call src/lib/core/settings/theme-package.logic.ts:398 in loadAppearance -> src/lib/core/settings/theme-package.logic.ts:buildThemeFromPackage call
