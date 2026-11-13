# file card src/lib/core/settings/settings.service.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/settings.service.ts ' codemap/files
file src/lib/core/settings/settings.service.ts service L297 module src/lib/core/settings in3 t6
## imports
imp src/lib/core/settings/settings.service.ts:2 -> pkg:@tauri-apps/plugin-fs readTextFile,writeTextFile,mkdir,exists,copyFile
imp src/lib/core/settings/settings.service.ts:3 -> src/lib/core/settings/settings.types.ts type:AppSettings,type:SettingsLoadOutcome
imp src/lib/core/settings/settings.service.ts:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore,DEFAULT_SETTINGS
imp src/lib/core/settings/settings.service.ts:5 -> src/lib/core/settings/theme-package.logic.ts loadAppearance
imp src/lib/core/settings/settings.service.ts:6 -> src/lib/core/settings/settings.logic.ts mergeLayout,migrateTypeScale,normalizeSettings
imp src/lib/core/settings/settings.service.ts:7 -> src/lib/core/settings/heading-typography.logic.ts headingTypographyToCssVars
imp src/lib/core/settings/settings.service.ts:8 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/settings/settings.service.ts:9 -> src/lib/utils/app-channel.ts getBuildChannel
imp src/lib/core/settings/settings.service.ts:10 -> src/lib/core/settings/theme.service.ts applyActiveTheme
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:37 -> src/lib/core/settings/settings.service.ts loadSettings,resetSettings
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:26 -> src/lib/core/settings/settings.service.ts applyHeadingTypography
imp src/lib/core/settings/settings-persistence.svelte.ts:2 -> src/lib/core/settings/settings.service.ts writeSettingsFile
## reach
in2 src/lib/core/settings/settings.service.ts 3 files in 3 modules: src/lib/app(1) src/lib/core/vault(1) src/routes(1)
out2 src/lib/core/settings/settings.service.ts 11 files in 3 modules: src/lib/core/settings(6) src/lib/utils(3) src/lib/contracts(2)
## tests
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/core/settings/settings.service.ts mirror
test src/tests/lib/core/settings/settings-persistence.test.ts imports src/lib/core/settings/settings.service.ts
test src/tests/lib/features/tasks/TasksView.lists.test.ts imports src/lib/core/settings/settings.service.ts
test src/tests/lib/features/tasks/tasks-view-settings.test.ts imports src/lib/core/settings/settings.service.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/settings/settings.service.ts
test src/tests/lib/app/tauri-listeners.service.test.ts mocks src/lib/core/settings/settings.service.ts
## symbols
sym src/lib/core/settings/settings.service.ts:39 fn loadSettings(vaultPath: string): Promise<SettingsLoadOutcome> L42 | Reads settings from disk and merges them with defaults, then persists the result so new default keys are written to disk.
by src/lib/core/settings/settings.service.ts:loadSettings <- src/lib/app/lifecycle/app-lifecycle.service.ts:210 in initializeVault call
sym src/lib/core/settings/settings.service.ts:259 fn writeSettingsFile(vaultPath: string, content: string): Promise<void> L14 | Writes already-serialized settings JSON to the vault, creating the `.kokobrain` dir if needed.
by src/lib/core/settings/settings.service.ts:writeSettingsFile <- src/lib/core/settings/settings-persistence.svelte.ts:99 in flushSettingsPersistence call
sym src/lib/core/settings/settings.service.ts:278 fn saveSettings(vaultPath: string): Promise<void> L5 | Persists the current settings to disk, creating the `.kokobrain` dir if needed.
sym src/lib/core/settings/settings.service.ts:285 fn applyHeadingTypography(): void L8 | Applies heading typography CSS variables to the document root
by src/lib/core/settings/settings.service.ts:applyHeadingTypography <- src/lib/core/markdown-editor/MarkdownEditor.svelte:722 in $effect@718 call
sym src/lib/core/settings/settings.service.ts:295 fn resetSettings() L3 | Restores settings to their defaults (does not write to disk)
by src/lib/core/settings/settings.service.ts:resetSettings <- src/lib/app/lifecycle/app-lifecycle.service.ts:665 in teardownVault call
## locals
local src/lib/core/settings/settings.service.ts:17 fn getSettingsPath(vaultPath: string): string L3
local src/lib/core/settings/settings.service.ts:22 fn getDirPath(vaultPath: string): string L3
local src/lib/core/settings/settings.service.ts:86 fn parseSettings(content: string): AppSettings L119
local src/lib/core/settings/settings.service.ts:217 fn resetBrokenSettingsFile(vaultPath: string): Promise<boolean> L18
local src/lib/core/settings/settings.service.ts:237 fn formatBackupStamp(date: Date): string L4
local src/lib/core/settings/settings.service.ts:243 fn useDefaultSettings(): void L5
local src/lib/core/settings/settings.service.ts:250 fn applyLoadedSettings(): void L4
## calls
call src/lib/core/settings/settings.service.ts:40 in loadSettings -> src/lib/utils/debug.ts:debug call
call src/lib/core/settings/settings.service.ts:41 in loadSettings -> src/lib/core/settings/settings.service.ts:getSettingsPath call
call src/lib/core/settings/settings.service.ts:46 in loadSettings -> src/lib/utils/debug.ts:error call +3
call src/lib/core/settings/settings.service.ts:47 in loadSettings -> src/lib/core/settings/settings.service.ts:useDefaultSettings call +1
call src/lib/core/settings/settings.service.ts:49 in loadSettings -> src/lib/core/settings/settings.service.ts:applyLoadedSettings call +3
call src/lib/core/settings/settings.service.ts:55 in loadSettings -> src/lib/core/settings/settings.service.ts:saveSettings call +1
call src/lib/core/settings/settings.service.ts:64 in loadSettings -> src/lib/core/settings/settings.service.ts:parseSettings call
call src/lib/core/settings/settings.service.ts:67 in loadSettings -> src/lib/core/settings/settings.service.ts:resetBrokenSettingsFile call
call src/lib/core/settings/settings.service.ts:71 in loadSettings -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.setSettings mcall
call src/lib/core/settings/settings.service.ts:92 in parseSettings -> src/lib/core/settings/settings.logic.ts:migrateTypeScale call
call src/lib/core/settings/settings.service.ts:117 in parseSettings -> src/lib/core/settings/settings.logic.ts:mergeLayout call
call src/lib/core/settings/settings.service.ts:150 in parseSettings -> src/lib/core/settings/theme-package.logic.ts:loadAppearance call
call src/lib/core/settings/settings.service.ts:192 in parseSettings -> src/lib/utils/app-channel.ts:getBuildChannel call
call src/lib/core/settings/settings.service.ts:203 in parseSettings -> src/lib/core/settings/settings.logic.ts:normalizeSettings call
call src/lib/core/settings/settings.service.ts:218 in resetBrokenSettingsFile -> src/lib/core/settings/settings.service.ts:useDefaultSettings call
call src/lib/core/settings/settings.service.ts:219 in resetBrokenSettingsFile -> src/lib/core/settings/settings.service.ts:formatBackupStamp call
call src/lib/core/settings/settings.service.ts:221 in resetBrokenSettingsFile -> src/lib/core/settings/settings.service.ts:getDirPath call
call src/lib/core/settings/settings.service.ts:221 in resetBrokenSettingsFile -> src/lib/core/settings/settings.service.ts:getSettingsPath call
call src/lib/core/settings/settings.service.ts:223 in resetBrokenSettingsFile -> src/lib/utils/debug.ts:error call +1
call src/lib/core/settings/settings.service.ts:229 in resetBrokenSettingsFile -> src/lib/core/settings/settings.service.ts:saveSettings call
call src/lib/core/settings/settings.service.ts:245 in useDefaultSettings -> src/lib/utils/app-channel.ts:getBuildChannel call
call src/lib/core/settings/settings.service.ts:246 in useDefaultSettings -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.setSettings mcall
call src/lib/core/settings/settings.service.ts:251 in applyLoadedSettings -> src/lib/core/settings/theme.service.ts:applyActiveTheme call
call src/lib/core/settings/settings.service.ts:252 in applyLoadedSettings -> src/lib/core/settings/settings.service.ts:applyHeadingTypography call
call src/lib/core/settings/settings.service.ts:260 in writeSettingsFile -> src/lib/core/settings/settings.service.ts:getDirPath call
call src/lib/core/settings/settings.service.ts:261 in writeSettingsFile -> src/lib/core/settings/settings.service.ts:getSettingsPath call
call src/lib/core/settings/settings.service.ts:269 in writeSettingsFile -> src/lib/utils/debug.ts:error call
call src/lib/core/settings/settings.service.ts:279 in saveSettings -> src/lib/utils/debug.ts:debug call
call src/lib/core/settings/settings.service.ts:280 in saveSettings -> src/lib/core/settings/settings.logic.ts:normalizeSettings call
call src/lib/core/settings/settings.service.ts:281 in saveSettings -> src/lib/core/settings/settings.service.ts:writeSettingsFile call
call src/lib/core/settings/settings.service.ts:287 in applyHeadingTypography -> src/lib/core/settings/heading-typography.logic.ts:headingTypographyToCssVars call
call src/lib/core/settings/settings.service.ts:296 in resetSettings -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.reset mcall
## effects
fx src/lib/core/settings/settings.service.ts:44 tauri-fs.exists in loadSettings
fx src/lib/core/settings/settings.service.ts:44 tauri-fs.readTextFile in loadSettings
fx src/lib/core/settings/settings.service.ts:221 tauri-fs.copyFile in resetBrokenSettingsFile
fx src/lib/core/settings/settings.service.ts:263 tauri-fs.exists in writeSettingsFile
fx src/lib/core/settings/settings.service.ts:265 tauri-fs.mkdir in writeSettingsFile
fx src/lib/core/settings/settings.service.ts:267 tauri-fs.writeTextFile in writeSettingsFile
