# file card src/lib/plugins/kanban/KanbanView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanView.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/plugins/kanban/KanbanView.svelte component L624 module src/lib/plugins/kanban in1 t4
## imports
imp src/lib/plugins/kanban/KanbanView.svelte:13 -> src/lib/plugins/kanban/kanban.logic.ts parseKanbanBoard,serializeKanbanBoard,addItem,removeItem,updateItem,toggleItem,moveItem,addLane,removeLane,renameLane,moveLane,archiveItem,archiveCompletedItems,restoreItem,isLaneCollapsed,toggleLaneCollapsed,DEFAULT_LANE_WIDTH,getLaneMaxItems,isLaneAtLimit,isLaneAutoComplete,setLaneAutoComplete,setLaneMaxItems,setTagColor,removeTagColor,updateBoardSettings,sortItems,setSortMode,filterItems,setViewMode,canReorderItems,uniqueLaneTitle
imp src/lib/plugins/kanban/KanbanView.svelte:46 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanSortMode,type:KanbanViewMode
imp src/lib/plugins/kanban/KanbanView.svelte:47 -> src/lib/plugins/kanban/kanban.store.svelte.ts kanbanStore
imp src/lib/plugins/kanban/KanbanView.svelte:48 -> src/lib/plugins/kanban/KanbanLane.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:49 -> src/lib/plugins/kanban/KanbanListView.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:50 -> src/lib/plugins/kanban/KanbanTableView.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:181 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanLane
## imported-by
imp src/lib/app/EditorView.svelte:20 -> src/lib/plugins/kanban/KanbanView.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/kanban/KanbanView.svelte 7 files in 3 modules: src/lib/plugins/kanban(3) src/lib/utils(3) src/lib/components(1)
## tests
test src/tests/lib/plugins/kanban/KanbanView.test.ts harness src/lib/plugins/kanban/KanbanView.svelte mirror via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-multiline-card.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-unmodeled-content.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-unmodeled-lines.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
## symbols
sym src/lib/plugins/kanban/KanbanView.svelte:1 component KanbanView props:markdownContent,onContentChange,onOpenWikilink L624
by src/lib/plugins/kanban/KanbanView.svelte:default <- src/lib/app/EditorView.svelte:81 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanView.svelte:80 fn applyChange(newBoard: KanbanBoard) L12
local src/lib/plugins/kanban/KanbanView.svelte:95 fn handleAddItem(laneId: string, text: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:99 fn handleToggleItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:103 fn handleUpdateItem(laneId: string, itemId: string, text: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:107 fn handleDeleteItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:111 fn handleArchiveItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:115 fn handleArchiveCompleted(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:121 fn handleRenameLane(laneId: string, title: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:125 fn handleDeleteLane(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:129 fn handleAddLane() L6
local src/lib/plugins/kanban/KanbanView.svelte:136 fn handleToggleCollapse(laneId: string) L5
local src/lib/plugins/kanban/KanbanView.svelte:142 fn handleToggleAutoComplete(laneId: string) L6
local src/lib/plugins/kanban/KanbanView.svelte:149 fn handleSetMaxItems(laneId: string, maxItems: number) L5
local src/lib/plugins/kanban/KanbanView.svelte:155 fn handleSetTagColor(tag: string, color: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:159 fn handleRemoveTagColor(tag: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:163 fn handleLaneWidthChange(width: number) L3
local src/lib/plugins/kanban/KanbanView.svelte:176 fn handleSetSortMode(mode: KanbanSortMode) L3
local src/lib/plugins/kanban/KanbanView.svelte:181 fn displayLane(lane: import('./kanban.types').KanbanLane) L6
local src/lib/plugins/kanban/KanbanView.svelte:201 fn handleSetViewMode(mode: KanbanViewMode) L3
local src/lib/plugins/kanban/KanbanView.svelte:213 fn handleStartEditItem(itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:217 fn handleStopEditItem() L3
local src/lib/plugins/kanban/KanbanView.svelte:221 fn handleStartEditLane(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:225 fn handleStopEditLane() L3
local src/lib/plugins/kanban/KanbanView.svelte:231 fn handleWikilinkClick(target: string, _heading?: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:237 fn handleBoardKeydown(e: KeyboardEvent) L91
local src/lib/plugins/kanban/KanbanView.svelte:333 fn handleRestoreItem(itemId: string) L5
local src/lib/plugins/kanban/KanbanView.svelte:339 fn handleDeleteArchivedItem(itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:350 fn handleItemDragStart(e: DragEvent, laneId: string, itemId: string) L8
local src/lib/plugins/kanban/KanbanView.svelte:359 fn handleItemDragEnd(_e: DragEvent) L6
local src/lib/plugins/kanban/KanbanView.svelte:366 fn handleItemDragOver(e: DragEvent, laneId: string) L18
local src/lib/plugins/kanban/KanbanView.svelte:385 fn handleItemDrop(e: DragEvent, toLaneId: string) L27
local src/lib/plugins/kanban/KanbanView.svelte:417 fn handleLaneDragStart(e: DragEvent, laneId: string) L7
local src/lib/plugins/kanban/KanbanView.svelte:425 fn handleLaneDragEnd(_e: DragEvent) L3
local src/lib/plugins/kanban/KanbanView.svelte:429 fn handleLaneDragOver(e: DragEvent) L5
local src/lib/plugins/kanban/KanbanView.svelte:435 fn handleLaneDrop(e: DragEvent) L23
## mounts
mount src/lib/plugins/kanban/KanbanView.svelte:511 KanbanListView -> src/lib/plugins/kanban/KanbanListView.svelte
mount src/lib/plugins/kanban/KanbanView.svelte:513 KanbanTableView -> src/lib/plugins/kanban/KanbanTableView.svelte
mount src/lib/plugins/kanban/KanbanView.svelte:524 KanbanLane -> src/lib/plugins/kanban/KanbanLane.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:81 KanbanView -> src/lib/plugins/kanban/KanbanView.svelte
## calls
call src/lib/plugins/kanban/KanbanView.svelte:76 in $effect@70 -> src/lib/plugins/kanban/kanban.logic.ts:parseKanbanBoard call
call src/lib/plugins/kanban/KanbanView.svelte:82 in applyChange -> src/lib/plugins/kanban/kanban.logic.ts:serializeKanbanBoard call
call src/lib/plugins/kanban/KanbanView.svelte:96 in handleAddItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:96 in handleAddItem -> src/lib/plugins/kanban/kanban.logic.ts:addItem call
call src/lib/plugins/kanban/KanbanView.svelte:100 in handleToggleItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:100 in handleToggleItem -> src/lib/plugins/kanban/kanban.logic.ts:toggleItem call
call src/lib/plugins/kanban/KanbanView.svelte:104 in handleUpdateItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:104 in handleUpdateItem -> src/lib/plugins/kanban/kanban.logic.ts:updateItem call
call src/lib/plugins/kanban/KanbanView.svelte:108 in handleDeleteItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:108 in handleDeleteItem -> src/lib/plugins/kanban/kanban.logic.ts:removeItem call
call src/lib/plugins/kanban/KanbanView.svelte:112 in handleArchiveItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:112 in handleArchiveItem -> src/lib/plugins/kanban/kanban.logic.ts:archiveItem call
call src/lib/plugins/kanban/KanbanView.svelte:116 in handleArchiveCompleted -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:116 in handleArchiveCompleted -> src/lib/plugins/kanban/kanban.logic.ts:archiveCompletedItems call
call src/lib/plugins/kanban/KanbanView.svelte:122 in handleRenameLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:122 in handleRenameLane -> src/lib/plugins/kanban/kanban.logic.ts:renameLane call
call src/lib/plugins/kanban/KanbanView.svelte:126 in handleDeleteLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:126 in handleDeleteLane -> src/lib/plugins/kanban/kanban.logic.ts:removeLane call
call src/lib/plugins/kanban/KanbanView.svelte:130 in handleAddLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:130 in handleAddLane -> src/lib/plugins/kanban/kanban.logic.ts:addLane call
call src/lib/plugins/kanban/KanbanView.svelte:130 in handleAddLane -> src/lib/plugins/kanban/kanban.logic.ts:uniqueLaneTitle call
call src/lib/plugins/kanban/KanbanView.svelte:133 in handleAddLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:139 in handleToggleCollapse -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:139 in handleToggleCollapse -> src/lib/plugins/kanban/kanban.logic.ts:toggleLaneCollapsed call
call src/lib/plugins/kanban/KanbanView.svelte:145 in handleToggleAutoComplete -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:146 in handleToggleAutoComplete -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:146 in handleToggleAutoComplete -> src/lib/plugins/kanban/kanban.logic.ts:setLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:152 in handleSetMaxItems -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:152 in handleSetMaxItems -> src/lib/plugins/kanban/kanban.logic.ts:setLaneMaxItems call
call src/lib/plugins/kanban/KanbanView.svelte:156 in handleSetTagColor -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:156 in handleSetTagColor -> src/lib/plugins/kanban/kanban.logic.ts:setTagColor call
call src/lib/plugins/kanban/KanbanView.svelte:160 in handleRemoveTagColor -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:160 in handleRemoveTagColor -> src/lib/plugins/kanban/kanban.logic.ts:removeTagColor call
call src/lib/plugins/kanban/KanbanView.svelte:164 in handleLaneWidthChange -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:164 in handleLaneWidthChange -> src/lib/plugins/kanban/kanban.logic.ts:updateBoardSettings call
call src/lib/plugins/kanban/KanbanView.svelte:174 in canReorder=$derived -> src/lib/plugins/kanban/kanban.logic.ts:canReorderItems call
call src/lib/plugins/kanban/KanbanView.svelte:177 in handleSetSortMode -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:177 in handleSetSortMode -> src/lib/plugins/kanban/kanban.logic.ts:setSortMode call
call src/lib/plugins/kanban/KanbanView.svelte:182 in displayLane -> src/lib/plugins/kanban/kanban.logic.ts:filterItems call
call src/lib/plugins/kanban/KanbanView.svelte:183 in displayLane -> src/lib/plugins/kanban/kanban.logic.ts:sortItems call
call src/lib/plugins/kanban/KanbanView.svelte:202 in handleSetViewMode -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:202 in handleSetViewMode -> src/lib/plugins/kanban/kanban.logic.ts:setViewMode call
call src/lib/plugins/kanban/KanbanView.svelte:208 in displayBoard=$derived -> src/lib/plugins/kanban/KanbanView.svelte:displayLane call
call src/lib/plugins/kanban/KanbanView.svelte:214 in handleStartEditItem -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:218 in handleStopEditItem -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:222 in handleStartEditLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:226 in handleStopEditLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:254 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFocus mcall +6
call src/lib/plugins/kanban/KanbanView.svelte:286 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:292 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall +1
call src/lib/plugins/kanban/KanbanView.svelte:298 in handleBoardKeydown -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleItem call
call src/lib/plugins/kanban/KanbanView.svelte:307 in handleBoardKeydown -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteItem call
call src/lib/plugins/kanban/KanbanView.svelte:336 in handleRestoreItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:336 in handleRestoreItem -> src/lib/plugins/kanban/kanban.logic.ts:restoreItem call
call src/lib/plugins/kanban/KanbanView.svelte:340 in handleDeleteArchivedItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:404 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:406 in handleItemDrop -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:406 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:moveItem call
call src/lib/plugins/kanban/KanbanView.svelte:454 in handleLaneDrop -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:454 in handleLaneDrop -> src/lib/plugins/kanban/kanban.logic.ts:moveLane call
call src/lib/plugins/kanban/KanbanView.svelte:461 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleBoardKeydown markup
call src/lib/plugins/kanban/KanbanView.svelte:467 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetViewMode markup +2
call src/lib/plugins/kanban/KanbanView.svelte:492 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetSortMode markup
call src/lib/plugins/kanban/KanbanView.svelte:505 in (markup) -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery markup
call src/lib/plugins/kanban/KanbanView.svelte:511 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleItem markup +2
call src/lib/plugins/kanban/KanbanView.svelte:511 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleWikilinkClick markup +1
call src/lib/plugins/kanban/KanbanView.svelte:518 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragOver markup
call src/lib/plugins/kanban/KanbanView.svelte:519 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDrop markup
call src/lib/plugins/kanban/KanbanView.svelte:525 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:displayLane markup
call src/lib/plugins/kanban/KanbanView.svelte:529 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneCollapsed markup
call src/lib/plugins/kanban/KanbanView.svelte:531 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:getLaneMaxItems markup
call src/lib/plugins/kanban/KanbanView.svelte:532 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAtLimit markup
call src/lib/plugins/kanban/KanbanView.svelte:533 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete markup
call src/lib/plugins/kanban/KanbanView.svelte:540 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleAddItem markup
call src/lib/plugins/kanban/KanbanView.svelte:542 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleUpdateItem markup
call src/lib/plugins/kanban/KanbanView.svelte:543 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteItem markup
call src/lib/plugins/kanban/KanbanView.svelte:544 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleArchiveItem markup
call src/lib/plugins/kanban/KanbanView.svelte:545 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleArchiveCompleted markup
call src/lib/plugins/kanban/KanbanView.svelte:546 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRenameLane markup
call src/lib/plugins/kanban/KanbanView.svelte:547 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteLane markup
call src/lib/plugins/kanban/KanbanView.svelte:548 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleCollapse markup
call src/lib/plugins/kanban/KanbanView.svelte:549 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleAutoComplete markup
call src/lib/plugins/kanban/KanbanView.svelte:550 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetMaxItems markup
call src/lib/plugins/kanban/KanbanView.svelte:551 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetTagColor markup
call src/lib/plugins/kanban/KanbanView.svelte:552 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRemoveTagColor markup
call src/lib/plugins/kanban/KanbanView.svelte:553 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneWidthChange markup
call src/lib/plugins/kanban/KanbanView.svelte:554 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStartEditItem markup
call src/lib/plugins/kanban/KanbanView.svelte:555 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStopEditItem markup
call src/lib/plugins/kanban/KanbanView.svelte:556 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStartEditLane markup
call src/lib/plugins/kanban/KanbanView.svelte:557 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStopEditLane markup
call src/lib/plugins/kanban/KanbanView.svelte:558 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragStart markup
call src/lib/plugins/kanban/KanbanView.svelte:559 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragEnd markup
call src/lib/plugins/kanban/KanbanView.svelte:560 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragOver markup
call src/lib/plugins/kanban/KanbanView.svelte:561 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDrop markup
call src/lib/plugins/kanban/KanbanView.svelte:562 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragStart markup
call src/lib/plugins/kanban/KanbanView.svelte:563 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragEnd markup
call src/lib/plugins/kanban/KanbanView.svelte:571 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleAddLane markup
call src/lib/plugins/kanban/KanbanView.svelte:581 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:DEFAULT_LANE_WIDTH markup
call src/lib/plugins/kanban/KanbanView.svelte:602 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRestoreItem markup
call src/lib/plugins/kanban/KanbanView.svelte:610 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteArchivedItem markup
## effects
fx src/lib/plugins/kanban/KanbanView.svelte:70 svelte.$effect in (script)
