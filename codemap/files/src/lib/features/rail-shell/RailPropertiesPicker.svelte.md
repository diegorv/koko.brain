# file card src/lib/features/rail-shell/RailPropertiesPicker.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/rail-shell/RailPropertiesPicker.svelte ' codemap/files
file src/lib/features/rail-shell/RailPropertiesPicker.svelte component L177 module src/lib/features/rail-shell in1 t1
## imports
imp src/lib/features/rail-shell/RailPropertiesPicker.svelte:5 -> src/lib/components/ui/popover/index.ts Popover,PopoverPortal,PopoverTrigger,PopoverContent
imp src/lib/features/rail-shell/RailPropertiesPicker.svelte:6 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/rail-shell/RailPropertiesPicker.svelte:7 -> src/lib/features/rail-shell/list-properties.logic.ts filterPropertyItems,moveListProperty,orderedPropertyItems,toggleListProperty
## imported-by
imp src/lib/features/rail-shell/RailNoteList.svelte:91 -> src/lib/features/rail-shell/RailPropertiesPicker.svelte default
## reach
in2 src/lib/features/rail-shell/RailPropertiesPicker.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/rail-shell/RailPropertiesPicker.svelte 4 files in 3 modules: src/lib/components(2) src/lib/core/filesystem(1) src/lib/features/rail-shell(1)
## tests
test src/tests/lib/features/rail-shell/RailPropertiesPicker.test.ts imports src/lib/features/rail-shell/RailPropertiesPicker.svelte mirror
## symbols
sym src/lib/features/rail-shell/RailPropertiesPicker.svelte:1 component RailPropertiesPicker props:available,selected,onChange L177
by src/lib/features/rail-shell/RailPropertiesPicker.svelte:default <- src/lib/features/rail-shell/RailNoteList.svelte:752 in (markup) mount
## locals
local src/lib/features/rail-shell/RailPropertiesPicker.svelte:49 fn moveBy(key: string, step: number) L7
local src/lib/features/rail-shell/RailPropertiesPicker.svelte:57 fn handleToggle(key: string) L4
local src/lib/features/rail-shell/RailPropertiesPicker.svelte:63 fn refocusRow(key: string) L5
local src/lib/features/rail-shell/RailPropertiesPicker.svelte:69 fn handleDragStart(event: DragEvent, key: string) L6
local src/lib/features/rail-shell/RailPropertiesPicker.svelte:76 fn handleDragOver(event: DragEvent, key: string, isSelected: boolean) L5
local src/lib/features/rail-shell/RailPropertiesPicker.svelte:82 fn handleDrop(event: DragEvent, key: string, isSelected: boolean) L8
local src/lib/features/rail-shell/RailPropertiesPicker.svelte:91 fn handleCheckboxKeydown(event: KeyboardEvent, key: string, isSelected: boolean) L10
## mounts
mount src/lib/features/rail-shell/RailPropertiesPicker.svelte:117 PopoverContent -> src/lib/components/ui/popover/popover-content.svelte
mount src/lib/features/rail-shell/RailPropertiesPicker.svelte:131 Input -> src/lib/components/ui/input/input.svelte
## mounted-at
mount src/lib/features/rail-shell/RailNoteList.svelte:752 RailPropertiesPicker -> src/lib/features/rail-shell/RailPropertiesPicker.svelte
## calls
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:39 in items=$derived -> src/lib/features/rail-shell/list-properties.logic.ts:filterPropertyItems call
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:39 in items=$derived -> src/lib/features/rail-shell/list-properties.logic.ts:orderedPropertyItems call
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:53 in moveBy -> src/lib/features/rail-shell/list-properties.logic.ts:moveListProperty call
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:54 in moveBy -> src/lib/features/rail-shell/RailPropertiesPicker.svelte:refocusRow call
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:58 in handleToggle -> src/lib/features/rail-shell/list-properties.logic.ts:toggleListProperty call
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:59 in handleToggle -> src/lib/features/rail-shell/RailPropertiesPicker.svelte:refocusRow call
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:87 in handleDrop -> src/lib/features/rail-shell/list-properties.logic.ts:moveListProperty call
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:95 in handleCheckboxKeydown -> src/lib/features/rail-shell/RailPropertiesPicker.svelte:moveBy call +1
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:144 in (markup) -> src/lib/features/rail-shell/RailPropertiesPicker.svelte:handleDragOver markup
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:145 in (markup) -> src/lib/features/rail-shell/RailPropertiesPicker.svelte:handleDrop markup
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:152 in (markup) -> src/lib/features/rail-shell/RailPropertiesPicker.svelte:handleToggle markup
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:153 in (markup) -> src/lib/features/rail-shell/RailPropertiesPicker.svelte:handleCheckboxKeydown markup
call src/lib/features/rail-shell/RailPropertiesPicker.svelte:164 in (markup) -> src/lib/features/rail-shell/RailPropertiesPicker.svelte:handleDragStart markup
## effects
fx src/lib/features/rail-shell/RailPropertiesPicker.svelte:31 svelte.$effect in (script)
