# file card src/lib/core/settings/settings-persistence.svelte.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/settings-persistence.svelte.ts ' codemap/files
file src/lib/core/settings/settings-persistence.svelte.ts other L122 module src/lib/core/settings in2 t9
## imports
imp src/lib/core/settings/settings-persistence.svelte.ts:1 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/settings-persistence.svelte.ts:2 -> src/lib/core/settings/settings.service.ts writeSettingsFile
imp src/lib/core/settings/settings-persistence.svelte.ts:3 -> src/lib/core/settings/settings.logic.ts normalizeSettings
imp src/lib/core/settings/settings-persistence.svelte.ts:4 -> src/lib/utils/debug.ts debug,error
imp src/lib/core/settings/settings-persistence.svelte.ts:5 -> src/lib/core/settings/settings.types.ts type:SettingsLoadOutcome
## imported-by
imp src/lib/app/lifecycle/app-lifecycle.service.ts:38 -> src/lib/core/settings/settings-persistence.svelte.ts startSettingsPersistence,stopSettingsPersistence
imp src/lib/core/vault/exit.service.ts:3 -> src/lib/core/settings/settings-persistence.svelte.ts flushSettingsPersistence
## reach
in2 src/lib/core/settings/settings-persistence.svelte.ts 4 files in 4 modules: src/lib/app(1) src/lib/core/settings(1) src/lib/core/vault(1) src/routes(1)
out2 src/lib/core/settings/settings-persistence.svelte.ts 11 files in 3 modules: src/lib/core/settings(6) src/lib/utils(3) src/lib/contracts(2)
## tests
test src/tests/lib/core/settings/settings-persistence.test.ts imports src/lib/core/settings/settings-persistence.svelte.ts mirror
test src/tests/lib/app/global-keybindings.test.ts imports src/lib/core/settings/settings-persistence.svelte.ts
test src/tests/lib/app/tauri-listeners.service.test.ts imports src/lib/core/settings/settings-persistence.svelte.ts
test src/tests/lib/core/layout/layout.service.test.ts imports src/lib/core/settings/settings-persistence.svelte.ts
test src/tests/lib/core/settings/update-check.service.test.ts imports src/lib/core/settings/settings-persistence.svelte.ts
test src/tests/lib/core/vault/exit.service.test.ts imports src/lib/core/settings/settings-persistence.svelte.ts
test src/tests/lib/features/tasks/TasksView.lists.test.ts imports src/lib/core/settings/settings-persistence.svelte.ts
test src/tests/lib/features/tasks/tasks-view-settings.test.ts imports src/lib/core/settings/settings-persistence.svelte.ts
test src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts mocks src/lib/core/settings/settings-persistence.svelte.ts
## symbols
sym src/lib/core/settings/settings-persistence.svelte.ts:55 fn startSettingsPersistence(vaultPath: string, outcome: SettingsLoadOutcome = 'loaded'): void L25 | Starts persisting every settings mutation to `vaultPath`.
by src/lib/core/settings/settings-persistence.svelte.ts:startSettingsPersistence <- src/lib/app/lifecycle/app-lifecycle.service.ts:225 in initializeVault call
sym src/lib/core/settings/settings-persistence.svelte.ts:86 fn flushSettingsPersistence(): Promise<void> L19 | Writes the pending settings change immediately instead of waiting out the debounce.
by src/lib/core/settings/settings-persistence.svelte.ts:flushSettingsPersistence <- src/lib/core/vault/exit.service.ts:21 in prepareForExit call
sym src/lib/core/settings/settings-persistence.svelte.ts:113 fn stopSettingsPersistence(): Promise<void> L10 | Flushes the pending write, then stops persisting.
by src/lib/core/settings/settings-persistence.svelte.ts:stopSettingsPersistence <- src/lib/app/lifecycle/app-lifecycle.service.ts:154 in initializeVault call +1
## locals
local src/lib/core/settings/settings-persistence.svelte.ts:34 fn serialize(): string L3
## calls
call src/lib/core/settings/settings-persistence.svelte.ts:35 in serialize -> src/lib/core/settings/settings.logic.ts:normalizeSettings call
call src/lib/core/settings/settings-persistence.svelte.ts:56 in startSettingsPersistence -> src/lib/core/settings/settings-persistence.svelte.ts:stopSettingsPersistence call
call src/lib/core/settings/settings-persistence.svelte.ts:59 in startSettingsPersistence -> src/lib/core/settings/settings-persistence.svelte.ts:serialize call
call src/lib/core/settings/settings-persistence.svelte.ts:70 in $effect@66 -> src/lib/core/settings/settings-persistence.svelte.ts:serialize call
call src/lib/core/settings/settings-persistence.svelte.ts:74 in $effect@66 -> src/lib/core/settings/settings-persistence.svelte.ts:flushSettingsPersistence call
call src/lib/core/settings/settings-persistence.svelte.ts:92 in flushSettingsPersistence -> src/lib/core/settings/settings-persistence.svelte.ts:serialize call
call src/lib/core/settings/settings-persistence.svelte.ts:95 in flushSettingsPersistence -> src/lib/utils/debug.ts:debug call
call src/lib/core/settings/settings-persistence.svelte.ts:99 in flushSettingsPersistence -> src/lib/core/settings/settings.service.ts:writeSettingsFile call
call src/lib/core/settings/settings-persistence.svelte.ts:102 in flushSettingsPersistence -> src/lib/utils/debug.ts:error call
call src/lib/core/settings/settings-persistence.svelte.ts:118 in stopSettingsPersistence -> src/lib/core/settings/settings-persistence.svelte.ts:flushSettingsPersistence call
## effects
fx src/lib/core/settings/settings-persistence.svelte.ts:65 svelte.$effect in startSettingsPersistence
fx src/lib/core/settings/settings-persistence.svelte.ts:66 svelte.$effect in $effect@65
fx src/lib/core/settings/settings-persistence.svelte.ts:72 timer.setTimeout delay=PERSIST_DEBOUNCE_MS in $effect@66
