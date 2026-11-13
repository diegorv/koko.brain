# file card src/lib/core/settings/sections/AppearanceSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/AppearanceSection.svelte ' codemap/files
file src/lib/core/settings/sections/AppearanceSection.svelte component L306 module src/lib/core/settings in1 t1
## imports
imp src/lib/core/settings/sections/AppearanceSection.svelte:4 -> src/lib/components/ui/button/index.ts Button
imp src/lib/core/settings/sections/AppearanceSection.svelte:5 -> src/lib/utils/debug.ts debug
imp src/lib/core/settings/sections/AppearanceSection.svelte:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/AppearanceSection.svelte:7 -> src/lib/core/settings/theme.service.ts applyActiveTheme
imp src/lib/core/settings/sections/AppearanceSection.svelte:8 -> src/lib/core/settings/theme.logic.ts DEFAULT_THEME_NAME,KOKOBRAIN_DEFAULT_THEME,isBuiltinTheme
imp src/lib/core/settings/sections/AppearanceSection.svelte:9 -> src/lib/core/settings/theme-package.logic.ts buildThemeFromPackage,catalogEntryState,installThemePackage,isInstalledTheme,sortCatalogEntries,sortThemesForDisplay,uninstallTheme,updateThemePackage,type:CatalogEntry,type:ThemePackage
imp src/lib/core/settings/sections/AppearanceSection.svelte:21 -> src/lib/core/settings/theme-catalog.service.ts fetchThemeCatalog
imp src/lib/core/settings/sections/AppearanceSection.svelte:22 -> src/lib/core/settings/theme.types.ts type:Theme
imp src/lib/core/settings/sections/AppearanceSection.svelte:23 -> src/lib/core/settings/sections/ThemeEditor.svelte default
imp src/lib/core/settings/sections/AppearanceSection.svelte:24 -> src/lib/core/settings/sections/ThemePreview.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:2 -> src/lib/core/settings/sections/AppearanceSection.svelte default
## reach
in2 src/lib/core/settings/sections/AppearanceSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/AppearanceSection.svelte 13 files in 4 modules: src/lib/core/settings(7) src/lib/components(2) src/lib/contracts(2) src/lib/utils(2)
## tests
test src/tests/lib/core/settings/AppearanceSection.test.ts imports src/lib/core/settings/sections/AppearanceSection.svelte
## symbols
sym src/lib/core/settings/sections/AppearanceSection.svelte:1 component AppearanceSection L306
by src/lib/core/settings/sections/AppearanceSection.svelte:default <- src/lib/app/SettingsPanel.svelte:72 in sectionComponents ref
## locals
local src/lib/core/settings/sections/AppearanceSection.svelte:44 fn loadCatalog() L11
local src/lib/core/settings/sections/AppearanceSection.svelte:60 fn installTheme(pkg: ThemePackage) L9
local src/lib/core/settings/sections/AppearanceSection.svelte:70 fn updateTheme(pkg: ThemePackage) L10
local src/lib/core/settings/sections/AppearanceSection.svelte:81 fn handleUninstall(name: string, event: MouseEvent) L5
local src/lib/core/settings/sections/AppearanceSection.svelte:87 fn selectTheme(name: string) L4
local src/lib/core/settings/sections/AppearanceSection.svelte:92 fn deleteTheme(name: string, event: MouseEvent) L12
local src/lib/core/settings/sections/AppearanceSection.svelte:105 fn handleCreateNew() L5
local src/lib/core/settings/sections/AppearanceSection.svelte:111 fn handleEdit(theme: Theme, event: MouseEvent) L6
local src/lib/core/settings/sections/AppearanceSection.svelte:118 fn handleDuplicate(theme: Theme, event: MouseEvent) L7
local src/lib/core/settings/sections/AppearanceSection.svelte:126 fn handleEditorSave(savedTheme: Theme) L13
local src/lib/core/settings/sections/AppearanceSection.svelte:140 fn handleEditorCancel() L5
## mounts
mount src/lib/core/settings/sections/AppearanceSection.svelte:152 ThemeEditor -> src/lib/core/settings/sections/ThemeEditor.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:179 ThemePreview -> src/lib/core/settings/sections/ThemePreview.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:192 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:203 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:219 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:230 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:246 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:265 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:276 ThemePreview -> src/lib/core/settings/sections/ThemePreview.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:287 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/core/settings/sections/AppearanceSection.svelte:291 Button -> src/lib/components/ui/button/button.svelte
## calls
call src/lib/core/settings/sections/AppearanceSection.svelte:41 in catalogPreviews=$derived -> src/lib/core/settings/theme-package.logic.ts:buildThemeFromPackage call
call src/lib/core/settings/sections/AppearanceSection.svelte:47 in loadCatalog -> src/lib/core/settings/theme-catalog.service.ts:fetchThemeCatalog call
call src/lib/core/settings/sections/AppearanceSection.svelte:47 in loadCatalog -> src/lib/core/settings/theme-package.logic.ts:sortCatalogEntries call
call src/lib/core/settings/sections/AppearanceSection.svelte:50 in loadCatalog -> src/lib/utils/debug.ts:debug call
call src/lib/core/settings/sections/AppearanceSection.svelte:57 in (script) -> src/lib/core/settings/sections/AppearanceSection.svelte:loadCatalog call
call src/lib/core/settings/sections/AppearanceSection.svelte:61 in installTheme -> src/lib/core/settings/theme-package.logic.ts:installThemePackage call
call src/lib/core/settings/sections/AppearanceSection.svelte:66 in installTheme -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAppearance mcall
call src/lib/core/settings/sections/AppearanceSection.svelte:71 in updateTheme -> src/lib/core/settings/theme-package.logic.ts:updateThemePackage call
call src/lib/core/settings/sections/AppearanceSection.svelte:76 in updateTheme -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAppearance mcall
call src/lib/core/settings/sections/AppearanceSection.svelte:77 in updateTheme -> src/lib/core/settings/theme.service.ts:applyActiveTheme call
call src/lib/core/settings/sections/AppearanceSection.svelte:83 in handleUninstall -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAppearance mcall
call src/lib/core/settings/sections/AppearanceSection.svelte:83 in handleUninstall -> src/lib/core/settings/theme-package.logic.ts:uninstallTheme call
call src/lib/core/settings/sections/AppearanceSection.svelte:84 in handleUninstall -> src/lib/core/settings/theme.service.ts:applyActiveTheme call
call src/lib/core/settings/sections/AppearanceSection.svelte:88 in selectTheme -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAppearance mcall
call src/lib/core/settings/sections/AppearanceSection.svelte:89 in selectTheme -> src/lib/core/settings/theme.service.ts:applyActiveTheme call
call src/lib/core/settings/sections/AppearanceSection.svelte:94 in deleteTheme -> src/lib/core/settings/theme.logic.ts:isBuiltinTheme call
call src/lib/core/settings/sections/AppearanceSection.svelte:101 in deleteTheme -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAppearance mcall
call src/lib/core/settings/sections/AppearanceSection.svelte:102 in deleteTheme -> src/lib/core/settings/theme.service.ts:applyActiveTheme call
call src/lib/core/settings/sections/AppearanceSection.svelte:129 in handleEditorSave -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateAppearance mcall +2
call src/lib/core/settings/sections/AppearanceSection.svelte:135 in handleEditorSave -> src/lib/core/settings/theme.service.ts:applyActiveTheme call
call src/lib/core/settings/sections/AppearanceSection.svelte:141 in handleEditorCancel -> src/lib/core/settings/theme.service.ts:applyActiveTheme call
call src/lib/core/settings/sections/AppearanceSection.svelte:158 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:handleEditorSave markup
call src/lib/core/settings/sections/AppearanceSection.svelte:159 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:handleEditorCancel markup
call src/lib/core/settings/sections/AppearanceSection.svelte:167 in (markup) -> src/lib/core/settings/theme-package.logic.ts:sortThemesForDisplay markup
call src/lib/core/settings/sections/AppearanceSection.svelte:169 in (markup) -> src/lib/core/settings/theme.logic.ts:isBuiltinTheme markup
call src/lib/core/settings/sections/AppearanceSection.svelte:170 in (markup) -> src/lib/core/settings/theme-package.logic.ts:isInstalledTheme markup
call src/lib/core/settings/sections/AppearanceSection.svelte:174 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:selectTheme markup +1
call src/lib/core/settings/sections/AppearanceSection.svelte:196 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:handleEdit markup
call src/lib/core/settings/sections/AppearanceSection.svelte:207 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:handleDuplicate markup
call src/lib/core/settings/sections/AppearanceSection.svelte:223 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:handleUninstall markup
call src/lib/core/settings/sections/AppearanceSection.svelte:234 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:deleteTheme markup
call src/lib/core/settings/sections/AppearanceSection.svelte:246 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:handleCreateNew markup
call src/lib/core/settings/sections/AppearanceSection.svelte:265 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:loadCatalog markup
call src/lib/core/settings/sections/AppearanceSection.svelte:272 in (markup) -> src/lib/core/settings/theme-package.logic.ts:catalogEntryState markup
call src/lib/core/settings/sections/AppearanceSection.svelte:287 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:installTheme markup
call src/lib/core/settings/sections/AppearanceSection.svelte:291 in (markup) -> src/lib/core/settings/sections/AppearanceSection.svelte:updateTheme markup
