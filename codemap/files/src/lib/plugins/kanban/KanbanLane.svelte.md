# file card src/lib/plugins/kanban/KanbanLane.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanLane.svelte ' codemap/files
file src/lib/plugins/kanban/KanbanLane.svelte component L399 module src/lib/plugins/kanban in1 t0
## imports
imp src/lib/plugins/kanban/KanbanLane.svelte:12 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanLane,type:KanbanItem
imp src/lib/plugins/kanban/KanbanLane.svelte:13 -> src/lib/plugins/kanban/KanbanCard.svelte default
imp src/lib/plugins/kanban/KanbanLane.svelte:14 -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte default
imp src/lib/plugins/kanban/KanbanLane.svelte:15 -> src/lib/components/ui/context-menu/index.ts *
imp src/lib/plugins/kanban/KanbanLane.svelte:16 -> src/lib/utils/clamp.ts clamp
## imported-by
imp src/lib/plugins/kanban/KanbanView.svelte:47 -> src/lib/plugins/kanban/KanbanLane.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanLane.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/kanban/KanbanLane.svelte 26 files in 5 modules: src/lib/components(16) src/lib/plugins/kanban(4) src/lib/core/filesystem(3) src/lib/utils(2) src/lib/core/markdown-editor(1)
## symbols
sym src/lib/plugins/kanban/KanbanLane.svelte:1 component KanbanLane props:lane,editingItemId,editingLaneId,focusedItemId=,collapsed=,laneWidth=,maxItems=,atLimit=,autoComplete=,tagColors=,disableDrag=,dragItemId=,isDragOver=,dropIndicatorIndex=,onWikilinkClick,onAddItem,onToggleItem,onUpdateItem,onDeleteItem,onArchiveItem,onArchiveCompleted,onRenameLane,onDeleteLane,onToggleCollapse,onToggleAutoComplete,onSetMaxItems,onSetTagColor,onRemoveTagColor,onLaneWidthChange,onStartEditItem,onStopEditItem,onStartEditLane,onStopEditLane,onItemDragStart,onItemDragEnd,onItemDragOver,onItemDrop,onLaneDragStart,onLaneDragEnd L399
by src/lib/plugins/kanban/KanbanLane.svelte:default <- src/lib/plugins/kanban/KanbanView.svelte:523 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanLane.svelte:111 fn handleAddItem() L7
local src/lib/plugins/kanban/KanbanLane.svelte:119 fn handleAddItemKeydown(e: KeyboardEvent) L7
local src/lib/plugins/kanban/KanbanLane.svelte:127 fn handleAddWikilinkSelect(filename: string, from: number, to: number) L8
local src/lib/plugins/kanban/KanbanLane.svelte:136 fn updateAddCursorPos() L3
local src/lib/plugins/kanban/KanbanLane.svelte:140 fn handleTitleKeydown(e: KeyboardEvent) L8
local src/lib/plugins/kanban/KanbanLane.svelte:149 fn commitTitleEdit() L7
local src/lib/plugins/kanban/KanbanLane.svelte:165 fn handleDragOver(e: DragEvent) L5
local src/lib/plugins/kanban/KanbanLane.svelte:171 fn handleDrop(e: DragEvent) L4
local src/lib/plugins/kanban/KanbanLane.svelte:193 fn handleResizeStart(e: PointerEvent) L7
local src/lib/plugins/kanban/KanbanLane.svelte:201 fn handleResizeMove(e: PointerEvent) L5
local src/lib/plugins/kanban/KanbanLane.svelte:207 fn handleResizeEnd(_e: PointerEvent) L5
## mounts
mount src/lib/plugins/kanban/KanbanLane.svelte:328 KanbanCard -> src/lib/plugins/kanban/KanbanCard.svelte
mount src/lib/plugins/kanban/KanbanLane.svelte:368 KanbanWikilinkSuggestions -> src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
## mounted-at
mount src/lib/plugins/kanban/KanbanView.svelte:523 KanbanLane -> src/lib/plugins/kanban/KanbanLane.svelte
## calls
call src/lib/plugins/kanban/KanbanLane.svelte:123 in handleAddItemKeydown -> src/lib/plugins/kanban/KanbanLane.svelte:handleAddItem call
call src/lib/plugins/kanban/KanbanLane.svelte:143 in handleTitleKeydown -> src/lib/plugins/kanban/KanbanLane.svelte:commitTitleEdit call
call src/lib/plugins/kanban/KanbanLane.svelte:204 in handleResizeMove -> src/lib/utils/clamp.ts:clamp call
call src/lib/plugins/kanban/KanbanLane.svelte:252 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleTitleKeydown markup
call src/lib/plugins/kanban/KanbanLane.svelte:253 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:commitTitleEdit markup
call src/lib/plugins/kanban/KanbanLane.svelte:320 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleDragOver markup
call src/lib/plugins/kanban/KanbanLane.svelte:321 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleDrop markup
call src/lib/plugins/kanban/KanbanLane.svelte:355 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleAddItem markup
call src/lib/plugins/kanban/KanbanLane.svelte:362 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleAddItemKeydown markup
call src/lib/plugins/kanban/KanbanLane.svelte:363 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:updateAddCursorPos markup +1
call src/lib/plugins/kanban/KanbanLane.svelte:372 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleAddWikilinkSelect markup
call src/lib/plugins/kanban/KanbanLane.svelte:392 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleResizeStart markup
call src/lib/plugins/kanban/KanbanLane.svelte:393 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleResizeMove markup
call src/lib/plugins/kanban/KanbanLane.svelte:394 in (markup) -> src/lib/plugins/kanban/KanbanLane.svelte:handleResizeEnd markup
## effects
fx src/lib/plugins/kanban/KanbanLane.svelte:131 timer.requestAnimationFrame in handleAddWikilinkSelect
fx src/lib/plugins/kanban/KanbanLane.svelte:157 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanLane.svelte:189 svelte.$effect in (script)
