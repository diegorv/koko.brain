# file card src/lib/features/file-icons/IconPicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/file-icons/IconPicker.svelte ' codemap/files
file src/lib/features/file-icons/IconPicker.svelte component L323 module src/lib/features/file-icons in5 t2
## imports
imp src/lib/features/file-icons/IconPicker.svelte:3 -> src/lib/features/file-icons/file-icons.types.ts type:IconPackId,type:NormalizedIcon
imp src/lib/features/file-icons/IconPicker.svelte:4 -> src/lib/features/file-icons/file-icons.icon-data.ts getAllIconPacks,getIconsForPack,getIconSync
imp src/lib/features/file-icons/IconPicker.svelte:5 -> src/lib/features/file-icons/file-icons.logic.ts filterIcons
imp src/lib/features/file-icons/IconPicker.svelte:6 -> src/lib/features/file-icons/file-icons.store.svelte.ts fileIconsStore
imp src/lib/features/file-icons/IconPicker.svelte:7 -> src/lib/features/file-icons/IconRenderer.svelte default
imp src/lib/features/file-icons/IconPicker.svelte:8 -> src/lib/components/ui/dialog/index.ts *
imp src/lib/features/file-icons/IconPicker.svelte:9 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/file-icons/IconPicker.svelte:10 -> src/lib/components/ui/scroll-area/index.ts ScrollArea
## imported-by
imp src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:8 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:12 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/note-list/NoteRowMenu.svelte:19 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/rail-shell/FilesNavigator.svelte:48 -> src/lib/features/file-icons/IconPicker.svelte default
imp src/lib/features/rail-shell/TypesNavigator.svelte:31 -> src/lib/features/file-icons/IconPicker.svelte default
## reach
in2 src/lib/features/file-icons/IconPicker.svelte 3 files in 3 modules: src/lib/app(1) src/lib/features/auto-organize(1) src/lib/features/rail-shell(1)
out2 src/lib/features/file-icons/IconPicker.svelte 17 files in 5 modules: src/lib/components(13) src/lib/core/frontmatter(1) src/lib/core/settings(1) src/lib/types(1) src/lib/utils(1)
## tests
test src/tests/lib/features/file-icons/IconPicker.colors.svelte.test.ts imports src/lib/features/file-icons/IconPicker.svelte mirror
test src/tests/lib/features/file-icons/IconPicker.test.ts imports src/lib/features/file-icons/IconPicker.svelte mirror
## symbols
sym src/lib/features/file-icons/IconPicker.svelte:1 component IconPicker props:open=$bindable,currentPack,currentName,currentColor,currentTextColor,onSelect,onColorsChange,onRemove,onClose L323
by src/lib/features/file-icons/IconPicker.svelte:default <- src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:367 in (markup) mount
by src/lib/features/file-icons/IconPicker.svelte:default <- src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:540 in (markup) mount
by src/lib/features/file-icons/IconPicker.svelte:default <- src/lib/features/note-list/NoteRowMenu.svelte:291 in (markup) mount
by src/lib/features/file-icons/IconPicker.svelte:default <- src/lib/features/rail-shell/FilesNavigator.svelte:416 in (markup) mount
by src/lib/features/file-icons/IconPicker.svelte:default <- src/lib/features/rail-shell/TypesNavigator.svelte:500 in (markup) mount
## locals
local src/lib/features/file-icons/IconPicker.svelte:84 fn loadIcons() L19
local src/lib/features/file-icons/IconPicker.svelte:134 fn handleSelect(icon: NormalizedIcon) L4
local src/lib/features/file-icons/IconPicker.svelte:143 fn applyColors() L7
local src/lib/features/file-icons/IconPicker.svelte:152 fn handleRemove() L4
local src/lib/features/file-icons/IconPicker.svelte:157 fn handleOpenChange(isOpen: boolean) L5
## mounts
mount src/lib/features/file-icons/IconPicker.svelte:174 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/file-icons/IconPicker.svelte:202 ScrollArea -> src/lib/components/ui/scroll-area/scroll-area.svelte
mount src/lib/features/file-icons/IconPicker.svelte:224 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
mount src/lib/features/file-icons/IconPicker.svelte:239 IconRenderer -> src/lib/features/file-icons/IconRenderer.svelte
## mounted-at
mount src/lib/features/auto-organize/AutoOrganizeRuleProperty.svelte:367 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
mount src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:540 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
mount src/lib/features/note-list/NoteRowMenu.svelte:291 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
mount src/lib/features/rail-shell/FilesNavigator.svelte:416 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
mount src/lib/features/rail-shell/TypesNavigator.svelte:500 IconPicker -> src/lib/features/file-icons/IconPicker.svelte
## calls
call src/lib/features/file-icons/IconPicker.svelte:50 in packs -> src/lib/features/file-icons/file-icons.icon-data.ts:getAllIconPacks call
call src/lib/features/file-icons/IconPicker.svelte:74 in recentNormalized=$derived -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/file-icons/IconPicker.svelte:90 in loadIcons -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconsForPack call +1
call src/lib/features/file-icons/IconPicker.svelte:104 in filteredIcons=$derived -> src/lib/features/file-icons/file-icons.logic.ts:filterIcons call
call src/lib/features/file-icons/IconPicker.svelte:110 in currentGridName=$derived -> src/lib/features/file-icons/file-icons.icon-data.ts:getIconSync call
call src/lib/features/file-icons/IconPicker.svelte:117 in $effect@114 -> src/lib/features/file-icons/IconPicker.svelte:loadIcons call
call src/lib/features/file-icons/IconPicker.svelte:164 in (markup) -> src/lib/features/file-icons/IconPicker.svelte:handleOpenChange markup
call src/lib/features/file-icons/IconPicker.svelte:222 in (markup) -> src/lib/features/file-icons/IconPicker.svelte:handleSelect markup +1
call src/lib/features/file-icons/IconPicker.svelte:264 in (markup) -> src/lib/features/file-icons/IconPicker.svelte:applyColors markup +3
call src/lib/features/file-icons/IconPicker.svelte:314 in (markup) -> src/lib/features/file-icons/IconPicker.svelte:handleRemove markup
## effects
fx src/lib/features/file-icons/IconPicker.svelte:114 svelte.$effect in (script)
fx src/lib/features/file-icons/IconPicker.svelte:122 svelte.$effect in (script)
