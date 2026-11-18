# file card src/lib/plugins/kanban/KanbanCard.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanCard.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanCard.svelte component L364 module src/lib/plugins/kanban in1 t0
## imports
imp src/lib/plugins/kanban/KanbanCard.svelte:11 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanItem
imp src/lib/plugins/kanban/KanbanCard.svelte:12 -> src/lib/plugins/kanban/kanban.logic.ts extractCardDate,setCardDate,removeCardDate,cardProximity,PROXIMITY_CLASSES,extractCardWikilinks,extractCardColor,setCardColor,removeCardColor,stripCardMetadata,extractCardTags
imp src/lib/plugins/kanban/KanbanCard.svelte:13 -> src/lib/plugins/kanban/kanban.service.ts loadLinkedFileContent
imp src/lib/plugins/kanban/KanbanCard.svelte:14 -> src/lib/utils/date.ts formatNow
imp src/lib/plugins/kanban/KanbanCard.svelte:15 -> src/lib/utils/color-presets.ts COLOR_PRESET_BG,COLOR_PRESET_TEXT
imp src/lib/plugins/kanban/KanbanCard.svelte:16 -> src/lib/plugins/kanban/KanbanDatePicker.svelte default
imp src/lib/plugins/kanban/KanbanCard.svelte:17 -> src/lib/plugins/kanban/KanbanCardText.svelte default
imp src/lib/plugins/kanban/KanbanCard.svelte:18 -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte default
imp src/lib/plugins/kanban/KanbanCard.svelte:19 -> src/lib/components/ui/context-menu/index.ts *
## imported-by
imp src/lib/plugins/kanban/KanbanLane.svelte:13 -> src/lib/plugins/kanban/KanbanCard.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanCard.svelte 1 files in 1 modules: src/lib/plugins/kanban(1)
out2 src/lib/plugins/kanban/KanbanCard.svelte 27 files in 7 modules: src/lib/components(16) src/lib/core/filesystem(4) src/lib/core/markdown-editor(2) src/lib/utils(2) src/lib/core/vault(1) +2 modules
## symbols
sym src/lib/plugins/kanban/KanbanCard.svelte:1 component KanbanCard props:item,laneId,isEditing,tagColors=,onSetTagColor,onRemoveTagColor,onTagClick,onToggle,onUpdate,onDelete,onArchive,moveTargets=,onMove,onWikilinkClick,isFocused=,isDragging=,disableDrag=,onStartEdit,onStopEdit,onDragStart,onDragEnd L364
by src/lib/plugins/kanban/KanbanCard.svelte:default <- src/lib/plugins/kanban/KanbanLane.svelte:371 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanCard.svelte:77 fn handleKeydown(e: KeyboardEvent) L18
local src/lib/plugins/kanban/KanbanCard.svelte:96 fn findBoardRoot(): HTMLElement | null L3
local src/lib/plugins/kanban/KanbanCard.svelte:105 fn focusAfterUnmount(boardRoot: HTMLElement | null) L4
local src/lib/plugins/kanban/KanbanCard.svelte:110 fn handleWikilinkSelect(filename: string, from: number, to: number) L8
local src/lib/plugins/kanban/KanbanCard.svelte:119 fn updateCursorPos() L3
local src/lib/plugins/kanban/KanbanCard.svelte:123 fn commitEdit() L10
local src/lib/plugins/kanban/KanbanCard.svelte:163 fn handleDateChange(newDate: string | null) L7
local src/lib/plugins/kanban/KanbanCard.svelte:171 fn handleColorChange(color: string) L3
local src/lib/plugins/kanban/KanbanCard.svelte:175 fn handleColorRemove() L3
## mounts
mount src/lib/plugins/kanban/KanbanCard.svelte:235 KanbanWikilinkSuggestions -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
mount src/lib/plugins/kanban/KanbanCard.svelte:250 KanbanCardText -> src/lib/plugins/kanban/KanbanCardText.svelte
mount src/lib/plugins/kanban/KanbanCard.svelte:255 KanbanDatePicker -> src/lib/plugins/kanban/KanbanDatePicker.svelte
mount src/lib/plugins/kanban/KanbanCard.svelte:261 KanbanDatePicker -> src/lib/plugins/kanban/KanbanDatePicker.svelte
## mounted-at
mount src/lib/plugins/kanban/KanbanLane.svelte:371 KanbanCard -> src/lib/plugins/kanban/KanbanCard.svelte
## calls
call src/lib/plugins/kanban/KanbanCard.svelte:84 in handleKeydown -> src/lib/plugins/kanban/KanbanCard.svelte:findBoardRoot call +1
call src/lib/plugins/kanban/KanbanCard.svelte:85 in handleKeydown -> src/lib/plugins/kanban/KanbanCard.svelte:commitEdit call
call src/lib/plugins/kanban/KanbanCard.svelte:86 in handleKeydown -> src/lib/plugins/kanban/KanbanCard.svelte:focusAfterUnmount call +1
call src/lib/plugins/kanban/KanbanCard.svelte:155 in cardDate=$derived -> src/lib/plugins/kanban/kanban.logic.ts:extractCardDate call
call src/lib/plugins/kanban/KanbanCard.svelte:156 in cardColor=$derived -> src/lib/plugins/kanban/kanban.logic.ts:extractCardColor call
call src/lib/plugins/kanban/KanbanCard.svelte:157 in displayText=$derived -> src/lib/plugins/kanban/kanban.logic.ts:stripCardMetadata call
call src/lib/plugins/kanban/KanbanCard.svelte:158 in cardTags=$derived -> src/lib/plugins/kanban/kanban.logic.ts:extractCardTags call
call src/lib/plugins/kanban/KanbanCard.svelte:159 in dateProximity=$derived -> src/lib/plugins/kanban/kanban.logic.ts:cardProximity call
call src/lib/plugins/kanban/KanbanCard.svelte:159 in dateProximity=$derived -> src/lib/utils/date.ts:formatNow call
call src/lib/plugins/kanban/KanbanCard.svelte:165 in handleDateChange -> src/lib/plugins/kanban/kanban.logic.ts:setCardDate call
call src/lib/plugins/kanban/KanbanCard.svelte:167 in handleDateChange -> src/lib/plugins/kanban/kanban.logic.ts:removeCardDate call
call src/lib/plugins/kanban/KanbanCard.svelte:172 in handleColorChange -> src/lib/plugins/kanban/kanban.logic.ts:setCardColor call
call src/lib/plugins/kanban/KanbanCard.svelte:176 in handleColorRemove -> src/lib/plugins/kanban/kanban.logic.ts:removeCardColor call
call src/lib/plugins/kanban/KanbanCard.svelte:181 in hasWikilink=$derived -> src/lib/plugins/kanban/kanban.logic.ts:extractCardWikilinks call
call src/lib/plugins/kanban/KanbanCard.svelte:189 in $effect@184 -> src/lib/plugins/kanban/kanban.service.ts:loadLinkedFileContent call
call src/lib/plugins/kanban/KanbanCard.svelte:228 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleKeydown markup
call src/lib/plugins/kanban/KanbanCard.svelte:229 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:updateCursorPos markup +1
call src/lib/plugins/kanban/KanbanCard.svelte:231 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:commitEdit markup
call src/lib/plugins/kanban/KanbanCard.svelte:239 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleWikilinkSelect markup
call src/lib/plugins/kanban/KanbanCard.svelte:255 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleDateChange markup +1
call src/lib/plugins/kanban/KanbanCard.svelte:313 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleColorChange markup
call src/lib/plugins/kanban/KanbanCard.svelte:321 in (markup) -> src/lib/plugins/kanban/KanbanCard.svelte:handleColorRemove markup
## effects
fx src/lib/plugins/kanban/KanbanCard.svelte:114 timer.requestAnimationFrame in handleWikilinkSelect
fx src/lib/plugins/kanban/KanbanCard.svelte:134 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanCard.svelte:145 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanCard.svelte:184 svelte.$effect in (script)
