# file card src/lib/plugins/queryjs/QueryjsSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/queryjs/QueryjsSection.svelte ' codemap/files
file src/lib/plugins/queryjs/QueryjsSection.svelte component L80 module src/lib/plugins/queryjs in1 t1
## imports
imp src/lib/plugins/queryjs/QueryjsSection.svelte:2 -> src/lib/components/ui/button/index.ts Button
imp src/lib/plugins/queryjs/QueryjsSection.svelte:3 -> src/lib/components/ui/select/index.ts *
imp src/lib/plugins/queryjs/QueryjsSection.svelte:4 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/plugins/queryjs/QueryjsSection.svelte:5 -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts queryjsSessionStore
imp src/lib/plugins/queryjs/QueryjsSection.svelte:6 -> src/lib/core/settings/settings.types.ts type:AutoRunQueriesPolicy
imp src/lib/plugins/queryjs/QueryjsSection.svelte:7 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:18 -> src/lib/plugins/queryjs/QueryjsSection.svelte default
## reach
in2 src/lib/plugins/queryjs/QueryjsSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/queryjs/QueryjsSection.svelte 16 files in 3 modules: src/lib/components(12) src/lib/core/settings(3) src/lib/plugins/queryjs(1)
## tests
test src/tests/lib/core/settings/settings-copy.test.ts imports src/lib/plugins/queryjs/QueryjsSection.svelte
## symbols
sym src/lib/plugins/queryjs/QueryjsSection.svelte:1 component QueryjsSection L80
by src/lib/plugins/queryjs/QueryjsSection.svelte:default <- src/lib/app/SettingsPanel.svelte:87 in sectionComponents ref
## locals
local src/lib/plugins/queryjs/QueryjsSection.svelte:27 fn policyLabel(value: AutoRunQueriesPolicy): string L3
local src/lib/plugins/queryjs/QueryjsSection.svelte:31 fn policyDescription(value: AutoRunQueriesPolicy): string L3
local src/lib/plugins/queryjs/QueryjsSection.svelte:35 fn handlePolicyChange(value: string) L3
local src/lib/plugins/queryjs/QueryjsSection.svelte:39 fn clearCache() L3
## mounts
mount src/lib/plugins/queryjs/QueryjsSection.svelte:52 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/plugins/queryjs/QueryjsSection.svelte:72 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/plugins/queryjs/QueryjsSection.svelte:76 Button -> src/lib/components/ui/button/button.svelte
## calls
call src/lib/plugins/queryjs/QueryjsSection.svelte:36 in handlePolicyChange -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateQueryjs mcall
call src/lib/plugins/queryjs/QueryjsSection.svelte:40 in clearCache -> src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:queryjsSessionStore.reset mcall
call src/lib/plugins/queryjs/QueryjsSection.svelte:54 in (markup) -> src/lib/plugins/queryjs/QueryjsSection.svelte:policyDescription markup
call src/lib/plugins/queryjs/QueryjsSection.svelte:59 in (markup) -> src/lib/plugins/queryjs/QueryjsSection.svelte:handlePolicyChange markup
call src/lib/plugins/queryjs/QueryjsSection.svelte:62 in (markup) -> src/lib/plugins/queryjs/QueryjsSection.svelte:policyLabel markup
call src/lib/plugins/queryjs/QueryjsSection.svelte:76 in (markup) -> src/lib/plugins/queryjs/QueryjsSection.svelte:clearCache markup
