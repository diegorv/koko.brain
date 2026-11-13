# file card src/lib/core/settings/theme-catalog.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme-catalog.service.ts ' codemap/files
file src/lib/core/settings/theme-catalog.service.ts service L45 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/theme-catalog.service.ts:1 -> pkg:@tauri-apps/plugin-http fetch
imp src/lib/core/settings/theme-catalog.service.ts:2 -> src/lib/utils/debug.ts debug
imp src/lib/core/settings/theme-catalog.service.ts:3 -> src/lib/core/settings/theme-package.logic.ts parseThemeCatalog,type:CatalogEntry
## imported-by
imp src/lib/core/settings/sections/AppearanceSection.svelte:21 -> src/lib/core/settings/theme-catalog.service.ts fetchThemeCatalog
## reach
in2 src/lib/core/settings/theme-catalog.service.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/theme-catalog.service.ts 9 files in 3 modules: src/lib/core/settings(6) src/lib/contracts(2) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/theme-catalog.service.test.ts imports src/lib/core/settings/theme-catalog.service.ts mirror
## symbols
sym src/lib/core/settings/theme-catalog.service.ts:9 const THEME_CATALOG_URL L1 | The catalog index: every published theme package in one file.
sym src/lib/core/settings/theme-catalog.service.ts:12 const THEME_CATALOG_TIMEOUT_MS L1 | How long the whole catalog request, body included, may take before it is aborted.
sym src/lib/core/settings/theme-catalog.service.ts:20 fn fetchThemeCatalog(): Promise<CatalogEntry[]> L17 | Fetches and validates the online theme catalog through the Tauri HTTP plugin (the webview CSP does not allow the request).
by src/lib/core/settings/theme-catalog.service.ts:fetchThemeCatalog <- src/lib/core/settings/sections/AppearanceSection.svelte:47 in loadCatalog call
## locals
local src/lib/core/settings/theme-catalog.service.ts:38 fn readCatalog(signal: AbortSignal): Promise<CatalogEntry[]> L8
## calls
call src/lib/core/settings/theme-catalog.service.ts:32 in fetchThemeCatalog -> src/lib/core/settings/theme-catalog.service.ts:readCatalog call
call src/lib/core/settings/theme-catalog.service.ts:41 in readCatalog -> src/lib/core/settings/theme-package.logic.ts:parseThemeCatalog call
call src/lib/core/settings/theme-catalog.service.ts:43 in readCatalog -> src/lib/utils/debug.ts:debug call
## effects
fx src/lib/core/settings/theme-catalog.service.ts:26 timer.setTimeout delay=THEME_CATALOG_TIMEOUT_MS in fetchThemeCatalog
fx src/lib/core/settings/theme-catalog.service.ts:39 tauri-http.fetch in readCatalog
