# file card src/lib/core/settings/sections/EditorSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/EditorSection.svelte ' codemap/files
file src/lib/core/settings/sections/EditorSection.svelte component L174 module src/lib/core/settings in1 t2
## imports
imp src/lib/core/settings/sections/EditorSection.svelte:3 -> src/lib/contracts/ipc.ts call
imp src/lib/core/settings/sections/EditorSection.svelte:4 -> src/lib/components/ui/button/index.ts buttonVariants
imp src/lib/core/settings/sections/EditorSection.svelte:5 -> src/lib/components/ui/input/index.ts Input
imp src/lib/core/settings/sections/EditorSection.svelte:6 -> src/lib/components/ui/popover/index.ts *
imp src/lib/core/settings/sections/EditorSection.svelte:7 -> src/lib/components/ui/command/index.ts *
imp src/lib/core/settings/sections/EditorSection.svelte:8 -> src/lib/utils/font-stacks.ts quoteFontFamily
imp src/lib/core/settings/sections/EditorSection.svelte:9 -> src/lib/core/settings/settings.store.svelte.ts settingsStore
imp src/lib/core/settings/sections/EditorSection.svelte:10 -> src/lib/core/settings/settings.logic.ts clampFontSize,clampLineHeight,clampContentWidth,clampParagraphSpacing
imp src/lib/core/settings/sections/EditorSection.svelte:11 -> src/lib/core/settings/sections/SettingItem.svelte default
imp src/lib/core/settings/sections/EditorSection.svelte:12 -> src/lib/core/settings/sections/HeadingTypographyEditor.svelte default
## imported-by
imp src/lib/app/SettingsPanel.svelte:3 -> src/lib/core/settings/sections/EditorSection.svelte default
## reach
in2 src/lib/core/settings/sections/EditorSection.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/core/settings/sections/EditorSection.svelte 21 files in 4 modules: src/lib/components(15) src/lib/core/settings(3) src/lib/contracts(2) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/EditorSection.test.ts imports src/lib/core/settings/sections/EditorSection.svelte
test src/tests/lib/core/settings/settings-copy.test.ts imports src/lib/core/settings/sections/EditorSection.svelte
## symbols
sym src/lib/core/settings/sections/EditorSection.svelte:1 component EditorSection L174
by src/lib/core/settings/sections/EditorSection.svelte:default <- src/lib/app/SettingsPanel.svelte:74 in sectionComponents ref
## locals
local src/lib/core/settings/sections/EditorSection.svelte:26 fn inputValue(e: Event): string L3
local src/lib/core/settings/sections/EditorSection.svelte:30 fn selectFont(font: string) L5
## mounts
mount src/lib/core/settings/sections/EditorSection.svelte:42 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:48 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:88 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:92 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:108 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:112 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:129 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:133 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:152 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:156 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:173 HeadingTypographyEditor -> src/lib/core/settings/sections/HeadingTypographyEditor.svelte
## calls
call src/lib/core/settings/sections/EditorSection.svelte:20 in (script) -> src/lib/contracts/ipc.ts:call call
call src/lib/core/settings/sections/EditorSection.svelte:31 in selectFont -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEditor mcall
call src/lib/core/settings/sections/EditorSection.svelte:51 in (markup) -> src/lib/core/settings/sections/EditorSection.svelte:inputValue markup +8
call src/lib/core/settings/sections/EditorSection.svelte:51 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEditor markup +8
call src/lib/core/settings/sections/EditorSection.svelte:56 in (markup) -> src/lib/components/ui/button/button.svelte:buttonVariants markup
call src/lib/core/settings/sections/EditorSection.svelte:73 in (markup) -> src/lib/core/settings/sections/EditorSection.svelte:selectFont markup
call src/lib/core/settings/sections/EditorSection.svelte:74 in (markup) -> src/lib/utils/font-stacks.ts:quoteFontFamily markup
call src/lib/core/settings/sections/EditorSection.svelte:102 in (markup) -> src/lib/core/settings/settings.logic.ts:clampFontSize markup
call src/lib/core/settings/sections/EditorSection.svelte:123 in (markup) -> src/lib/core/settings/settings.logic.ts:clampLineHeight markup
call src/lib/core/settings/sections/EditorSection.svelte:144 in (markup) -> src/lib/core/settings/settings.logic.ts:clampParagraphSpacing markup
call src/lib/core/settings/sections/EditorSection.svelte:167 in (markup) -> src/lib/core/settings/settings.logic.ts:clampContentWidth markup
## effects
ipc-call src/lib/core/settings/sections/EditorSection.svelte:20 in (script) -> ipc:list_system_fonts -> src-tauri/src/commands/fonts.rs:6
