# file card src/lib/plugins/kanban/KanbanCard.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanCard.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanCard.svelte component L344 module src/lib/plugins/kanban in1 t0
## imports
imp src/lib/plugins/kanban/KanbanCard.svelte:10 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanItem
imp src/lib/plugins/kanban/KanbanCard.svelte:11 -> src/lib/plugins/kanban/kanban.logic.ts extractCardDate,setCardDate,removeCardDate,cardProximity,PROXIMITY_CLASSES,extractCardWikilinks,extractCardColor,setCardColor,removeCardColor,stripCardMetadata,extractCardTags
imp src/lib/plugins/kanban/KanbanCard.svelte:12 -> src/lib/plugins/kanban/kanban.service.ts loadLinkedFileContent
imp src/lib/plugins/kanban/KanbanCard.svelte:13 -> src/lib/utils/date.ts formatNow
imp src/lib/plugins/kanban/KanbanCard.svelte:14 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
imp src/lib/plugins/kanban/KanbanCard.svelte:15 -> src/lib/plugins/kanban/KanbanDatePicker.svelte default
imp src/lib/plugins/kanban/KanbanCard.svelte:16 -> src/lib/plugins/kanban/KanbanCardText.svelte default
imp src/lib/plugins/kanban/KanbanCard.svelte:17 -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte default
imp src/lib/plugins/kanban/KanbanCard.svelte:18 -> src/lib/components/ui/context-menu/index.ts *
## imported-by
imp src/lib/plugins/kanban/KanbanLane.svelte:13 -> src/lib/plugins/kanban/KanbanCard.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanCard.svelte 1 files in 1 modules: src/lib/plugins/kanban(1)
out2 src/lib/plugins/kanban/KanbanCard.svelte 27 files in 7 modules: src/lib/components(16) src/lib/core/filesystem(4) src/lib/core/markdown-editor(2) src/lib/utils(2) src/lib/core/vault(1) +2 modules
## symbols
sym src/lib/plugins/kanban/KanbanCard.svelte:1 component KanbanCard props:item,laneId,isEditing,tagColors=,onSetTagColor,onRemoveTagColor,onTagClick,onToggle,onUpdate,onDelete,onArchive,onWikilinkClick,isFocused=,isDragging=,disableDrag=,onStartEdit,onStopEdit,onDragStart,onDragEnd L344
by src/lib/plugins/kanban/KanbanCard.svelte:default <- src/lib/plugins/kanban/KanbanLane.svelte:331 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanCard.svelte:70 fn handleKeydown(e: KeyboardEvent) L18
local src/lib/plugins/kanban/KanbanCard.svelte:89 fn findBoardRoot(): HTMLElement | null L3
local src/lib/plugins/kanban/KanbanCard.svelte:98 fn focusAfterUnmount(boardRoot: HTMLElement | null) L4
local src/lib/plugins/kanban/KanbanCard.svelte:103 fn handleWikilinkSelect(filename: string, from: number, to: number) L8
local src/lib/plugins/kanban/KanbanCard.svelte:112 fn updateCursorPos() L3
local src/lib/plugins/kanban/KanbanCard.svelte:116 fn commitEdit() L10
local src/lib/plugins/kanban/KanbanCard.svelte:156 fn handleDateChange(newDate: string | null) L7
local src/lib/plugins/kanban/KanbanCard.svelte:164 fn handleColorChange(color: string) L3
local src/lib/plugins/kanban/KanbanCard.svelte:168 fn handleColorRemove() L3
## mounts
mount src/lib/plugins/kanban/KanbanCard.svelte:228 KanbanWikilinkSuggestions -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
mount src/lib/plugins/kanban/KanbanCard.svelte:243 KanbanCardText -> src/lib/plugins/kanban/KanbanCardText.svelte
mount src/lib/plugins/kanban/KanbanCard.svelte:248 KanbanDatePicker -> src/lib/plugins/kanban/KanbanDatePicker.svelte
mount src/lib/plugins/kanban/KanbanCard.svelte:254 KanbanDatePicker -> src/lib/plugins/kanban/KanbanDatePicker.svelte
## mounted-at
mount src/lib/plugins/kanban/KanbanLane.svelte:331 KanbanCard -> src/lib/plugins/kanban/KanbanCard.svelte
## calls
call src/lib/plugins/kanban/KanbanCard.svelte:77 in handleKeydown -> src/lib/plugins/kanban/KanbanCard.svelte:findBoardRoot call +1
call src/lib/plugins/kanban/KanbanCard.svelte:78 in handleKeydown -> src/lib/plugins/kanban/KanbanCard.svelte:commitEdit call
call src/lib/plugins/kanban/KanbanCard.svelte:79 in handleKeydown -> src/lib/plugins/kanban/KanbanCard.svelte:focusAfterUnmount call +1
call src/lib/plugins/kanban/KanbanCard.svelte:148 in cardDate=$derived -> src/lib/plugins/kanban/kanban.logic.ts:extractCardDate call
call src/lib/plugins/kanban/KanbanCard.svelte:149 in cardColor=$derived -> src/lib/plugins/kanban/kanban.logic.ts:extractCardColor call
call src/lib/plugins/kanban/KanbanCard.svelte:150 in displayText=$derived -> src/lib/plugins/kanban/kanban.logic.ts:stripCardMetadata call
call src/lib/plugins/kanban/KanbanCard.svelte:151 in cardTags=$derived -> src/lib/plugins/kanban/kanban.logic.ts:extractCardTags call
call src/lib/plugins/kanban/KanbanCard.svelte:152 in dateProximity=$derived -> src/lib/plugins/kanban/kanban.logic.ts:cardProximity call
call src/lib/plugins/kanban/KanbanCard.svelte:152 in dateProximity=$derived -> src/lib/utils/date.ts:formatNow call
call src/lib/plugins/kanban/KanbanCard.svelte:158 in handleDateChange -> src/lib/plugins/kanban/kanban.logic.ts:setCardDate call
call src/lib/plugins/kanban/KanbanCard.svelte:160 in handleDateChange -> src/lib/plugins/kanban/kanban.logic.ts:removeCardDate call
call src/lib/plugins/kanban/KanbanCard.svelte:165 in handleColorChange -> src/lib/plugins/kanban/kanban.logic.ts:setCardColor call
call src/lib/plugins/kanban/KanbanCard.svelte:169 in handleColorRemove -> src/lib/plugins/kanban/kanban.logic.ts:removeCardColor call
call src/lib/plugins/kanban/KanbanCard.svelte:174 in hasWikilink=$derived -> src/lib/plugins/kanban/kanban.logic.ts:extractCardWikilinks call
call src/lib/plugins/kanban/KanbanCard.svelte:182 in $effect@177 -> src/lib/plugins/kanban/kanban.service.ts:loadLinkedFileContent call
call src/lib/plugins/kanban/KanbanCard.svelte:221 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleKeydown markup
call src/lib/plugins/kanban/KanbanCard.svelte:222 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:updateCursorPos markup +1
call src/lib/plugins/kanban/KanbanCard.svelte:224 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:commitEdit markup
call src/lib/plugins/kanban/KanbanCard.svelte:232 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleWikilinkSelect markup
call src/lib/plugins/kanban/KanbanCard.svelte:248 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleDateChange markup +1
call src/lib/plugins/kanban/KanbanCard.svelte:293 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleColorChange markup
call src/lib/plugins/kanban/KanbanCard.svelte:301 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleColorRemove markup
## effects
fx src/lib/plugins/kanban/KanbanCard.svelte:107 timer.requestAnimationFrame in handleWikilinkSelect
fx src/lib/plugins/kanban/KanbanCard.svelte:127 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanCard.svelte:138 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanCard.svelte:177 svelte.$effect in (script)
