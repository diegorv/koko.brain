# file card src/lib/plugins/kanban/KanbanLane.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanLane.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanLane.svelte component L444 module src/lib/plugins/kanban in1 t0
## imports
imp src/lib/plugins/kanban/KanbanLane.svelte:12 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanLane,type:KanbanItem
imp src/lib/plugins/kanban/KanbanLane.svelte:13 -> src/lib/plugins/kanban/KanbanCard.svelte default
imp src/lib/plugins/kanban/KanbanLane.svelte:14 -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte default
imp src/lib/plugins/kanban/KanbanLane.svelte:15 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/plugins/kanban/KanbanLane.svelte:16 -> src/lib/utils/clamp.ts clamp
## imported-by
imp src/lib/plugins/kanban/KanbanView.svelte:54 -> src/lib/plugins/kanban/KanbanLane.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanLane.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/kanban/KanbanLane.svelte 26 files in 5 modules: src/lib/components(16) src/lib/plugins/kanban(4) src/lib/core/filesystem(3) src/lib/utils(2) src/lib/core/markdown-editor(1)
## symbols
sym src/lib/plugins/kanban/KanbanLane.svelte:1 component KanbanLane props:lane,editingItemId,editingLaneId,focusedItemId=,collapsed=,laneWidth=,maxItems=,atLimit=,totalCount,autoComplete=,tagColors=,disableDrag=,dragItemId=,isDragOver=,dropIndicatorIndex=,onWikilinkClick,onTagClick,onAddItem,onToggleItem,onUpdateItem,onDeleteItem,onArchiveItem,onArchiveCompleted,onRenameLane,onDeleteLane,onToggleCollapse,onToggleAutoComplete,onSetMaxItems,onSetTagColor,onRemoveTagColor,onLaneWidthChange,onStartEditItem,onStopEditItem,onStartEditLane,onStopEditLane,onItemDragStart,onItemDragEnd,onItemDragOver,onItemDrop,onLaneDragStart,onLaneDragEnd L444
by src/lib/plugins/kanban/KanbanLane.svelte:default <- src/lib/plugins/kanban/KanbanView.svelte:614 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanLane.svelte:117 fn handleAddItem() L7
local src/lib/plugins/kanban/KanbanLane.svelte:125 fn handleAddItemKeydown(e: KeyboardEvent) L7
local src/lib/plugins/kanban/KanbanLane.svelte:133 fn handleAddWikilinkSelect(filename: string, from: number, to: number) L8
local src/lib/plugins/kanban/KanbanLane.svelte:142 fn updateAddCursorPos() L3
local src/lib/plugins/kanban/KanbanLane.svelte:146 fn handleTitleKeydown(e: KeyboardEvent) L8
local src/lib/plugins/kanban/KanbanLane.svelte:156 fn startRename() L4
local src/lib/plugins/kanban/KanbanLane.svelte:161 fn commitTitleEdit() L7
local src/lib/plugins/kanban/KanbanLane.svelte:177 fn handleDragOver(e: DragEvent) L5
local src/lib/plugins/kanban/KanbanLane.svelte:183 fn handleDrop(e: DragEvent) L4
local src/lib/plugins/kanban/KanbanLane.svelte:221 fn handleResizeStart(e: PointerEvent) L7
local src/lib/plugins/kanban/KanbanLane.svelte:229 fn handleResizeMove(e: PointerEvent) L5
local src/lib/plugins/kanban/KanbanLane.svelte:235 fn handleResizeEnd(_e: PointerEvent) L5
## mounts
mount src/lib/plugins/kanban/KanbanLane.svelte:366 KanbanCard -> src/lib/plugins/kanban/KanbanCard.svelte
mount src/lib/plugins/kanban/KanbanLane.svelte:413 KanbanWikilinkSuggestions -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
## mounted-at
mount src/lib/plugins/kanban/KanbanView.svelte:614 KanbanLane -> src/lib/plugins/kanban/KanbanLane.svelte
## calls
call src/lib/plugins/kanban/KanbanLane.svelte:129 in handleAddItemKeydown -> src/lib/plugins/kanban/KanbanLane.svelte:handleAddItem call
call src/lib/plugins/kanban/KanbanLane.svelte:149 in handleTitleKeydown -> src/lib/plugins/kanban/KanbanLane.svelte:commitTitleEdit call
call src/lib/plugins/kanban/KanbanLane.svelte:232 in handleResizeMove -> src/lib/utils/clamp.ts:clamp call
call src/lib/plugins/kanban/KanbanLane.svelte:290 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleTitleKeydown markup
call src/lib/plugins/kanban/KanbanLane.svelte:291 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:commitTitleEdit markup
call src/lib/plugins/kanban/KanbanLane.svelte:301 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:startRename markup +1
call src/lib/plugins/kanban/KanbanLane.svelte:358 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleDragOver markup
call src/lib/plugins/kanban/KanbanLane.svelte:359 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleDrop markup
call src/lib/plugins/kanban/KanbanLane.svelte:400 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleAddItem markup
call src/lib/plugins/kanban/KanbanLane.svelte:407 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleAddItemKeydown markup
call src/lib/plugins/kanban/KanbanLane.svelte:408 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:updateAddCursorPos markup +1
call src/lib/plugins/kanban/KanbanLane.svelte:417 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleAddWikilinkSelect markup
call src/lib/plugins/kanban/KanbanLane.svelte:437 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleResizeStart markup
call src/lib/plugins/kanban/KanbanLane.svelte:438 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleResizeMove markup
call src/lib/plugins/kanban/KanbanLane.svelte:439 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleResizeEnd markup
## effects
fx src/lib/plugins/kanban/KanbanLane.svelte:137 timer.requestAnimationFrame in handleAddWikilinkSelect
fx src/lib/plugins/kanban/KanbanLane.svelte:169 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanLane.svelte:217 svelte.$effect in (script)
