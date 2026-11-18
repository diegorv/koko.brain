# file card src/lib/core/settings/sections/EditorSection.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/sections/EditorSection.svelte ' codemap/files
file src/lib/core/settings/sections/EditorSection.svelte component L182 module src/lib/core/settings in1 t2
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
sym src/lib/core/settings/sections/EditorSection.svelte:1 component EditorSection L182
by src/lib/core/settings/sections/EditorSection.svelte:default <- src/lib/app/SettingsPanel.svelte:74 in sectionComponents ref
## locals
local src/lib/core/settings/sections/EditorSection.svelte:26 fn inputValue(e: Event): string L3
local src/lib/core/settings/sections/EditorSection.svelte:31 fn typedNumber(e: Event): number | null L6
local src/lib/core/settings/sections/EditorSection.svelte:42 fn writeInRange(e: Event, clampFn: (n: number) => number, write: (n: number) => void) L4
local src/lib/core/settings/sections/EditorSection.svelte:52 fn commitClamped(e: Event, clampFn: (n: number) => number, write: (n: number) => void, stored: () => number) L5
local src/lib/core/settings/sections/EditorSection.svelte:58 fn selectFont(font: string) L5
## mounts
mount src/lib/core/settings/sections/EditorSection.svelte:70 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:76 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:116 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:120 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:131 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:135 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:147 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:151 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:165 SettingItem -> src/lib/core/settings/sections/SettingItem.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:169 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/core/settings/sections/EditorSection.svelte:181 HeadingTypographyEditor -> src/lib/core/settings/sections/HeadingTypographyEditor.svelte
## calls
call src/lib/core/settings/sections/EditorSection.svelte:20 in (script) -> src/lib/contracts/ipc.ts:call call
call src/lib/core/settings/sections/EditorSection.svelte:32 in typedNumber -> src/lib/core/settings/sections/EditorSection.svelte:inputValue call
call src/lib/core/settings/sections/EditorSection.svelte:43 in writeInRange -> src/lib/core/settings/sections/EditorSection.svelte:typedNumber call
call src/lib/core/settings/sections/EditorSection.svelte:53 in commitClamped -> src/lib/core/settings/sections/EditorSection.svelte:typedNumber call
call src/lib/core/settings/sections/EditorSection.svelte:59 in selectFont -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEditor mcall
call src/lib/core/settings/sections/EditorSection.svelte:79 in (markup) -> src/lib/core/settings/sections/EditorSection.svelte:inputValue markup
call src/lib/core/settings/sections/EditorSection.svelte:79 in (markup) -> src/lib/core/settings/settings.store.svelte.ts:settingsStore.updateEditor markup +8
call src/lib/core/settings/sections/EditorSection.svelte:84 in (markup) -> src/lib/components/ui/button/button.svelte:buttonVariants markup
call src/lib/core/settings/sections/EditorSection.svelte:101 in (markup) -> src/lib/core/settings/sections/EditorSection.svelte:selectFont markup
call src/lib/core/settings/sections/EditorSection.svelte:102 in (markup) -> src/lib/utils/font-stacks.ts:quoteFontFamily markup
call src/lib/core/settings/sections/EditorSection.svelte:126 in (markup) -> src/lib/core/settings/sections/EditorSection.svelte:writeInRange markup +3
call src/lib/core/settings/sections/EditorSection.svelte:126 in (markup) -> src/lib/core/settings/settings.logic.ts:clampFontSize markup +1
call src/lib/core/settings/sections/EditorSection.svelte:127 in (markup) -> src/lib/core/settings/sections/EditorSection.svelte:commitClamped markup +3
call src/lib/core/settings/sections/EditorSection.svelte:142 in (markup) -> src/lib/core/settings/settings.logic.ts:clampLineHeight markup +1
call src/lib/core/settings/sections/EditorSection.svelte:158 in (markup) -> src/lib/core/settings/settings.logic.ts:clampParagraphSpacing markup +1
call src/lib/core/settings/sections/EditorSection.svelte:176 in (markup) -> src/lib/core/settings/settings.logic.ts:clampContentWidth markup +1
## effects
ipc-call src/lib/core/settings/sections/EditorSection.svelte:20 in (script) -> ipc:list_system_fonts -> src-tauri/src/commands/fonts.rs:6
