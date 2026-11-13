# file card src/lib/core/settings/sections/SentrySection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/SentrySection.svelte ' codemap/files
file src/lib/core/settings/sections/SentrySection.svelte component L95 module src/lib/core/settings in1 t0
## imports
imp src/lib/core/settings/sections/SentrySection.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/core/settings/sections/SentrySection.svelte:3 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/SentrySection.svelte:4 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/core/settings/sections/SentrySection.svelte:5 -> src/lib/core/settings/sentry.service.ts configureSentry,sendSentryTestEvent
imp src/lib/core/settings/sections/SentrySection.svelte:6 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/SentrySection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:15 -> src/lib/core/settings/sections/SentrySection.svelte default
## reach
in2 src/lib/core/settings/sections/SentrySection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/SentrySection.svelte 8 files in 3 modules: src/lib/core/settings(4) src/lib/components(3) src/lib/contracts(1)
## symbols
sym src/lib/core/settings/sections/SentrySection.svelte:1 component SentrySection L95
by src/lib/core/settings/sections/SentrySection.svelte:default <- src/lib/app/SettingsPanel.svelte:84 in sectionComponents ref
## locals
local src/lib/core/settings/sections/SentrySection.svelte:13 fn updateSentry(value: Partial<typeof settingsStore.sentry>): Promise<void> L12
local src/lib/core/settings/sections/SentrySection.svelte:26 fn sendTestEvent(): Promise<void> L17
## mounts
mount src/lib/core/settings/sections/SentrySection.svelte:48 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/SentrySection.svelte:52 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/core/settings/sections/SentrySection.svelte:59 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/SentrySection.svelte:64 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/SentrySection.svelte:78 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/SentrySection.svelte:82 Button -> src/lib/components/ui/button/button.svelte
## calls
call src/lib/core/settings/sections/SentrySection.svelte:14 in updateSentry -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateSentry mcall
call src/lib/core/settings/sections/SentrySection.svelte:16 in updateSentry -> src/lib/core/settings/sentry.service.ts:configureSentry call
call src/lib/core/settings/sections/SentrySection.svelte:30 in sendTestEvent -> src/lib/core/settings/sentry.service.ts:sendSentryTestEvent call
call src/lib/core/settings/sections/SentrySection.svelte:54 in (markup) -> src/lib/core/settings/sections/SentrySection.svelte:updateSentry markup +1
call src/lib/core/settings/sections/SentrySection.svelte:82 in (markup) -> src/lib/core/settings/sections/SentrySection.svelte:sendTestEvent markup
