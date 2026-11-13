# file card src/lib/core/settings/sections/QuickCaptureSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/QuickCaptureSection.svelte ' codemap/files
file src/lib/core/settings/sections/QuickCaptureSection.svelte component L79 module src/lib/core/settings in1 t2
## imports
imp src/lib/core/settings/sections/QuickCaptureSection.svelte:2 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/QuickCaptureSection.svelte:3 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/QuickCaptureSection.svelte:4 -> src/lib/core/settings/sections/SettingItem.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:5 -> src/lib/core/settings/sections/QuickCaptureSection.svelte default
## reach
in2 src/lib/core/settings/sections/QuickCaptureSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/QuickCaptureSection.svelte 4 files in 2 modules: src/lib/core/settings(3) src/lib/components(1)
## tests
test src/tests/lib/core/settings/QuickCaptureSection.test.ts imports src/lib/core/settings/sections/QuickCaptureSection.svelte
test src/tests/lib/core/settings/settings-copy.test.ts imports src/lib/core/settings/sections/QuickCaptureSection.svelte
## symbols
sym src/lib/core/settings/sections/QuickCaptureSection.svelte:1 component QuickCaptureSection L79
by src/lib/core/settings/sections/QuickCaptureSection.svelte:default <- src/lib/app/SettingsPanel.svelte:76 in sectionComponents ref
## locals
local src/lib/core/settings/sections/QuickCaptureSection.svelte:6 fn inputValue(e: Event): string L3
## mounts
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:38 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:42 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:50 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:54 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:68 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/QuickCaptureSection.svelte:69 Input -> src/lib/components/ui/input/input.svelte
## calls
call src/lib/core/settings/sections/QuickCaptureSection.svelte:45 in (markup) -> src/lib/core/settings/sections/QuickCaptureSection.svelte:inputValue markup +2
call src/lib/core/settings/sections/QuickCaptureSection.svelte:45 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateQuickCapture markup +2
