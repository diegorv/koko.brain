# file card src/lib/core/settings/theme.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme.service.ts ' codemap/files
file src/lib/core/settings/theme.service.ts service L87 module src/lib/core/settings in5 t7
## imports
imp src/lib/core/settings/theme.service.ts:1 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/theme.service.ts:3 -> src/lib/core/settings/theme.types.ts type:Theme
imp src/lib/core/settings/theme.service.ts:4 -> src/lib/core/settings/applied-theme.store.svelte.ts appliedThemeStore
imp src/lib/core/settings/theme.service.ts:5 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/theme.service.ts:6 -> src/lib/core/settings/theme.logic.ts findThemeByName,themeColorsToCssVars
## imported-by
imp src/lib/core/settings/sections/AppearanceSection.svelte:7 -> src/lib/core/settings/theme.service.ts applyActiveTheme
imp src/lib/core/settings/sections/ThemeEditor.svelte:4 -> src/lib/core/settings/theme.service.ts applyTheme
imp src/lib/core/settings/settings.service.ts:10 -> src/lib/core/settings/theme.service.ts applyActiveTheme
imp src/routes/(app)/+layout.svelte:5 -> src/lib/core/settings/theme.service.ts applyStoredTheme
imp src/routes/composer/+page.svelte:8 -> src/lib/core/settings/theme.service.ts applyStoredTheme,THEME_VARS_STORAGE_KEY
## reach
in2 src/lib/core/settings/theme.service.ts 4 files in 3 modules: src/lib/app(2) src/lib/core/markdown-editor(1) src/lib/core/settings(1)
out2 src/lib/core/settings/theme.service.ts 3 files in 1 modules: src/lib/core/settings(3)
## tests
test src/tests/lib/core/settings/theme.service.test.ts imports src/lib/core/settings/theme.service.ts mirror
test src/tests/lib/plugins/graph-view/GraphView.test.ts imports src/lib/core/settings/theme.service.ts
test src/tests/lib/plugins/mods/mod-theme.test.ts imports src/lib/core/settings/theme.service.ts
test src/tests/routes/composer-page.test.ts imports src/lib/core/settings/theme.service.ts
test src/tests/lib/core/settings/settings.service.test.ts mocks src/lib/core/settings/theme.service.ts
test src/tests/lib/features/tasks/TasksView.lists.test.ts mocks src/lib/core/settings/theme.service.ts
test src/tests/lib/features/tasks/tasks-view-settings.test.ts mocks src/lib/core/settings/theme.service.ts
## symbols
sym src/lib/core/settings/theme.service.ts:13 const THEME_VARS_STORAGE_KEY L1 | localStorage key holding the CSS variables of the theme last applied in the main window.
by src/lib/core/settings/theme.service.ts:THEME_VARS_STORAGE_KEY <- src/routes/composer/+page.svelte:161 in onStorage ref
sym src/lib/core/settings/theme.service.ts:44 fn applyTheme(theme: Theme): void L5 | Applies a theme by setting all its color tokens as CSS custom properties on the document root element.
by src/lib/core/settings/theme.service.ts:applyTheme <- src/lib/core/settings/sections/ThemeEditor.svelte:68 in applyDraft call
sym src/lib/core/settings/theme.service.ts:54 fn applyStoredTheme(): void L15 | Applies the theme the main window last mirrored to localStorage.
by src/lib/core/settings/theme.service.ts:applyStoredTheme <- src/routes/(app)/+layout.svelte:36 in (script) call
by src/lib/core/settings/theme.service.ts:applyStoredTheme <- src/routes/composer/+page.svelte:162 in onStorage call +2
sym src/lib/core/settings/theme.service.ts:76 fn applyActiveTheme(): void L12 | Reads the active theme from the settings store, applies it, and mirrors its CSS variables to localStorage for the secondary windows (see `THEME_VARS_STORAGE_KE…
by src/lib/core/settings/theme.service.ts:applyActiveTheme <- src/lib/core/settings/sections/AppearanceSection.svelte:77 in updateTheme call +5
by src/lib/core/settings/theme.service.ts:applyActiveTheme <- src/lib/core/settings/settings.service.ts:251 in applyLoadedSettings call
## locals
local src/lib/core/settings/theme.service.ts:16 fn setRootVars(vars: Record<string, string>): void L6
local src/lib/core/settings/theme.service.ts:30 fn applyMode(vars: Record<string, string>): void L8
## calls
call src/lib/core/settings/theme.service.ts:31 in applyMode -> src/lib/utils/color.ts:isDarkColor call
call src/lib/core/settings/theme.service.ts:35 in applyMode -> src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore.setDark mcall
call src/lib/core/settings/theme.service.ts:36 in applyMode -> src/lib/core/settings/applied-theme.store.svelte.ts:appliedThemeStore.bumpRevision mcall
call src/lib/core/settings/theme.service.ts:45 in applyTheme -> src/lib/core/settings/theme.logic.ts:themeColorsToCssVars call
call src/lib/core/settings/theme.service.ts:46 in applyTheme -> src/lib/core/settings/theme.service.ts:setRootVars call
call src/lib/core/settings/theme.service.ts:47 in applyTheme -> src/lib/core/settings/theme.service.ts:applyMode call
call src/lib/core/settings/theme.service.ts:66 in applyStoredTheme -> src/lib/core/settings/theme.service.ts:setRootVars call
call src/lib/core/settings/theme.service.ts:67 in applyStoredTheme -> src/lib/core/settings/theme.service.ts:applyMode call
call src/lib/core/settings/theme.service.ts:78 in applyActiveTheme -> src/lib/core/settings/theme.logic.ts:findThemeByName call
call src/lib/core/settings/theme.service.ts:78 in applyActiveTheme -> src/lib/core/settings/theme.logic.ts:themeColorsToCssVars call
call src/lib/core/settings/theme.service.ts:79 in applyActiveTheme -> src/lib/core/settings/theme.service.ts:setRootVars call
call src/lib/core/settings/theme.service.ts:80 in applyActiveTheme -> src/lib/core/settings/theme.service.ts:applyMode call
## effects
fx src/lib/core/settings/theme.service.ts:57 storage.getItem in applyStoredTheme
fx src/lib/core/settings/theme.service.ts:82 storage.setItem in applyActiveTheme
