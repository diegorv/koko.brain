# file card src/lib/plugins/kanban/KanbanView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanView.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/plugins/kanban/KanbanView.svelte component L747 module src/lib/plugins/kanban in1 t4
## imports
imp src/lib/plugins/kanban/KanbanView.svelte:16 -> src/lib/components/ui/select/index.ts *
imp src/lib/plugins/kanban/KanbanView.svelte:17 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/kanban/KanbanView.svelte:18 -> src/lib/plugins/kanban/kanban.logic.ts parseKanbanBoard,serializeKanbanBoard,addItem,removeItem,updateItem,toggleItem,moveItem,dropSlotToIndex,addLane,removeLane,renameLane,moveLane,archiveItem,archiveCompletedItems,restoreItem,isLaneCollapsed,toggleLaneCollapsed,DEFAULT_LANE_WIDTH,getLaneMaxItems,isLaneAtLimit,isLaneAutoComplete,setLaneAutoComplete,setLaneMaxItems,setTagColor,removeTagColor,updateBoardSettings,sortItems,setSortMode,filterItems,setViewMode,canReorderItems,uniqueLaneTitle,stripCardMetadata
imp src/lib/plugins/kanban/KanbanView.svelte:53 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanSortMode,type:KanbanViewMode
imp src/lib/plugins/kanban/KanbanView.svelte:54 -> src/lib/plugins/kanban/kanban.store.svelte.ts kanbanStore
imp src/lib/plugins/kanban/KanbanView.svelte:55 -> src/lib/plugins/kanban/KanbanLane.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:56 -> src/lib/plugins/kanban/KanbanListView.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:57 -> src/lib/plugins/kanban/KanbanTableView.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:200 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanLane
## imported-by
imp src/lib/app/EditorView.svelte:20 -> src/lib/plugins/kanban/KanbanView.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/kanban/KanbanView.svelte 20 files in 4 modules: src/lib/components(12) src/lib/plugins/kanban(3) src/lib/utils(3) src/lib/core/editor(2)
## tests
test src/tests/lib/plugins/kanban/KanbanView.test.ts harness src/lib/plugins/kanban/KanbanView.svelte mirror via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-multiline-card.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-unmodeled-content.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-unmodeled-lines.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
## symbols
sym src/lib/plugins/kanban/KanbanView.svelte:1 component KanbanView props:markdownContent,onContentChange,onOpenWikilink L747
by src/lib/plugins/kanban/KanbanView.svelte:default <- src/lib/app/EditorView.svelte:81 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanView.svelte:87 fn applyChange(newBoard: KanbanBoard) L12
local src/lib/plugins/kanban/KanbanView.svelte:102 fn handleAddItem(laneId: string, text: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:106 fn handleToggleItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:110 fn handleUpdateItem(laneId: string, itemId: string, text: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:114 fn handleDeleteItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:118 fn handleArchiveItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:128 fn handleMoveItem(fromLaneId: string, itemId: string, toLaneId: string) L5
local src/lib/plugins/kanban/KanbanView.svelte:134 fn handleArchiveCompleted(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:140 fn handleRenameLane(laneId: string, title: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:144 fn handleDeleteLane(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:148 fn handleAddLane() L6
local src/lib/plugins/kanban/KanbanView.svelte:155 fn handleToggleCollapse(laneId: string) L5
local src/lib/plugins/kanban/KanbanView.svelte:161 fn handleToggleAutoComplete(laneId: string) L6
local src/lib/plugins/kanban/KanbanView.svelte:168 fn handleSetMaxItems(laneId: string, maxItems: number) L5
local src/lib/plugins/kanban/KanbanView.svelte:174 fn handleSetTagColor(tag: string, color: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:178 fn handleRemoveTagColor(tag: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:182 fn handleLaneWidthChange(width: number) L3
local src/lib/plugins/kanban/KanbanView.svelte:195 fn handleSetSortMode(mode: KanbanSortMode) L3
local src/lib/plugins/kanban/KanbanView.svelte:200 fn displayLane(lane: import('./kanban.types').KanbanLane) L6
local src/lib/plugins/kanban/KanbanView.svelte:226 fn handleSetViewMode(mode: KanbanViewMode) L3
local src/lib/plugins/kanban/KanbanView.svelte:238 fn handleStartEditItem(itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:242 fn handleStopEditItem() L3
local src/lib/plugins/kanban/KanbanView.svelte:246 fn handleStartEditLane(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:250 fn handleStopEditLane() L3
local src/lib/plugins/kanban/KanbanView.svelte:256 fn handleWikilinkClick(target: string, _heading?: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:296 fn handleClearFilter() L4
local src/lib/plugins/kanban/KanbanView.svelte:301 fn handleFilterKeydown(e: KeyboardEvent) L3
local src/lib/plugins/kanban/KanbanView.svelte:305 fn handleTagClick(tag: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:309 fn handleBoardKeydown(e: KeyboardEvent) L93
local src/lib/plugins/kanban/KanbanView.svelte:407 fn handleRestoreItem(itemId: string) L6
local src/lib/plugins/kanban/KanbanView.svelte:414 fn handleDeleteArchivedItem(itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:425 fn handleItemDragStart(e: DragEvent, laneId: string, itemId: string) L8
local src/lib/plugins/kanban/KanbanView.svelte:434 fn handleItemDragEnd(_e: DragEvent) L6
local src/lib/plugins/kanban/KanbanView.svelte:441 fn handleItemDragOver(e: DragEvent, laneId: string) L18
local src/lib/plugins/kanban/KanbanView.svelte:460 fn handleItemDrop(e: DragEvent, toLaneId: string) L32
local src/lib/plugins/kanban/KanbanView.svelte:497 fn handleLaneDragStart(e: DragEvent, laneId: string) L7
local src/lib/plugins/kanban/KanbanView.svelte:505 fn handleLaneDragEnd(_e: DragEvent) L3
local src/lib/plugins/kanban/KanbanView.svelte:509 fn handleLaneDragOver(e: DragEvent) L5
local src/lib/plugins/kanban/KanbanView.svelte:515 fn handleLaneDrop(e: DragEvent) L25
## mounts
mount src/lib/plugins/kanban/KanbanView.svelte:630 KanbanListView -> src/lib/plugins/kanban/KanbanListView.svelte
mount src/lib/plugins/kanban/KanbanView.svelte:632 KanbanTableView -> src/lib/plugins/kanban/KanbanTableView.svelte
mount src/lib/plugins/kanban/KanbanView.svelte:643 KanbanLane -> src/lib/plugins/kanban/KanbanLane.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:81 KanbanView -> src/lib/plugins/kanban/KanbanView.svelte
## calls
call src/lib/plugins/kanban/KanbanView.svelte:83 in $effect@77 -> src/lib/plugins/kanban/kanban.logic.ts:parseKanbanBoard call
call src/lib/plugins/kanban/KanbanView.svelte:89 in applyChange -> src/lib/plugins/kanban/kanban.logic.ts:serializeKanbanBoard call
call src/lib/plugins/kanban/KanbanView.svelte:103 in handleAddItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:103 in handleAddItem -> src/lib/plugins/kanban/kanban.logic.ts:addItem call
call src/lib/plugins/kanban/KanbanView.svelte:107 in handleToggleItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:107 in handleToggleItem -> src/lib/plugins/kanban/kanban.logic.ts:toggleItem call
call src/lib/plugins/kanban/KanbanView.svelte:111 in handleUpdateItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:111 in handleUpdateItem -> src/lib/plugins/kanban/kanban.logic.ts:updateItem call
call src/lib/plugins/kanban/KanbanView.svelte:115 in handleDeleteItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:115 in handleDeleteItem -> src/lib/plugins/kanban/kanban.logic.ts:removeItem call
call src/lib/plugins/kanban/KanbanView.svelte:119 in handleArchiveItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:119 in handleArchiveItem -> src/lib/plugins/kanban/kanban.logic.ts:archiveItem call
call src/lib/plugins/kanban/KanbanView.svelte:131 in handleMoveItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:131 in handleMoveItem -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:131 in handleMoveItem -> src/lib/plugins/kanban/kanban.logic.ts:moveItem call
call src/lib/plugins/kanban/KanbanView.svelte:135 in handleArchiveCompleted -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:135 in handleArchiveCompleted -> src/lib/plugins/kanban/kanban.logic.ts:archiveCompletedItems call
call src/lib/plugins/kanban/KanbanView.svelte:141 in handleRenameLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:141 in handleRenameLane -> src/lib/plugins/kanban/kanban.logic.ts:renameLane call
call src/lib/plugins/kanban/KanbanView.svelte:145 in handleDeleteLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:145 in handleDeleteLane -> src/lib/plugins/kanban/kanban.logic.ts:removeLane call
call src/lib/plugins/kanban/KanbanView.svelte:149 in handleAddLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:149 in handleAddLane -> src/lib/plugins/kanban/kanban.logic.ts:addLane call
call src/lib/plugins/kanban/KanbanView.svelte:149 in handleAddLane -> src/lib/plugins/kanban/kanban.logic.ts:uniqueLaneTitle call
call src/lib/plugins/kanban/KanbanView.svelte:152 in handleAddLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:158 in handleToggleCollapse -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:158 in handleToggleCollapse -> src/lib/plugins/kanban/kanban.logic.ts:toggleLaneCollapsed call
call src/lib/plugins/kanban/KanbanView.svelte:164 in handleToggleAutoComplete -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:165 in handleToggleAutoComplete -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:165 in handleToggleAutoComplete -> src/lib/plugins/kanban/kanban.logic.ts:setLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:171 in handleSetMaxItems -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:171 in handleSetMaxItems -> src/lib/plugins/kanban/kanban.logic.ts:setLaneMaxItems call
call src/lib/plugins/kanban/KanbanView.svelte:175 in handleSetTagColor -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:175 in handleSetTagColor -> src/lib/plugins/kanban/kanban.logic.ts:setTagColor call
call src/lib/plugins/kanban/KanbanView.svelte:179 in handleRemoveTagColor -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:179 in handleRemoveTagColor -> src/lib/plugins/kanban/kanban.logic.ts:removeTagColor call
call src/lib/plugins/kanban/KanbanView.svelte:183 in handleLaneWidthChange -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:183 in handleLaneWidthChange -> src/lib/plugins/kanban/kanban.logic.ts:updateBoardSettings call
call src/lib/plugins/kanban/KanbanView.svelte:193 in canReorder=$derived -> src/lib/plugins/kanban/kanban.logic.ts:canReorderItems call
call src/lib/plugins/kanban/KanbanView.svelte:196 in handleSetSortMode -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:196 in handleSetSortMode -> src/lib/plugins/kanban/kanban.logic.ts:setSortMode call
call src/lib/plugins/kanban/KanbanView.svelte:201 in displayLane -> src/lib/plugins/kanban/kanban.logic.ts:filterItems call
call src/lib/plugins/kanban/KanbanView.svelte:202 in displayLane -> src/lib/plugins/kanban/kanban.logic.ts:sortItems call
call src/lib/plugins/kanban/KanbanView.svelte:227 in handleSetViewMode -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:227 in handleSetViewMode -> src/lib/plugins/kanban/kanban.logic.ts:setViewMode call
call src/lib/plugins/kanban/KanbanView.svelte:233 in displayBoard=$derived -> src/lib/plugins/kanban/KanbanView.svelte:displayLane call
call src/lib/plugins/kanban/KanbanView.svelte:239 in handleStartEditItem -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:243 in handleStopEditItem -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:247 in handleStartEditLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:251 in handleStopEditLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:275 in $effect@271 -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall
call src/lib/plugins/kanban/KanbanView.svelte:291 in $effect@288 -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery mcall
call src/lib/plugins/kanban/KanbanView.svelte:292 in $effect@288 -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall
call src/lib/plugins/kanban/KanbanView.svelte:297 in handleClearFilter -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery mcall
call src/lib/plugins/kanban/KanbanView.svelte:302 in handleFilterKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery mcall
call src/lib/plugins/kanban/KanbanView.svelte:306 in handleTagClick -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery mcall
call src/lib/plugins/kanban/KanbanView.svelte:317 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.logic.ts:isLaneCollapsed call
call src/lib/plugins/kanban/KanbanView.svelte:328 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFocus mcall +6
call src/lib/plugins/kanban/KanbanView.svelte:360 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:366 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall +1
call src/lib/plugins/kanban/KanbanView.svelte:372 in handleBoardKeydown -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleItem call
call src/lib/plugins/kanban/KanbanView.svelte:381 in handleBoardKeydown -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteItem call
call src/lib/plugins/kanban/KanbanView.svelte:410 in handleRestoreItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:410 in handleRestoreItem -> src/lib/plugins/kanban/kanban.logic.ts:restoreItem call
call src/lib/plugins/kanban/KanbanView.svelte:415 in handleDeleteArchivedItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:480 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:dropSlotToIndex call
call src/lib/plugins/kanban/KanbanView.svelte:484 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:486 in handleItemDrop -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:486 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:moveItem call
call src/lib/plugins/kanban/KanbanView.svelte:533 in handleLaneDrop -> src/lib/plugins/kanban/kanban.logic.ts:dropSlotToIndex call
call src/lib/plugins/kanban/KanbanView.svelte:536 in handleLaneDrop -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:536 in handleLaneDrop -> src/lib/plugins/kanban/kanban.logic.ts:moveLane call
call src/lib/plugins/kanban/KanbanView.svelte:544 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleBoardKeydown markup
call src/lib/plugins/kanban/KanbanView.svelte:550 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetViewMode markup +2
call src/lib/plugins/kanban/KanbanView.svelte:581 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetSortMode markup
call src/lib/plugins/kanban/KanbanView.svelte:610 in (markup) -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery markup
call src/lib/plugins/kanban/KanbanView.svelte:611 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleFilterKeydown markup
call src/lib/plugins/kanban/KanbanView.svelte:620 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleClearFilter markup
call src/lib/plugins/kanban/KanbanView.svelte:630 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleItem markup +2
call src/lib/plugins/kanban/KanbanView.svelte:630 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleWikilinkClick markup +2
call src/lib/plugins/kanban/KanbanView.svelte:637 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragOver markup
call src/lib/plugins/kanban/KanbanView.svelte:638 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDrop markup
call src/lib/plugins/kanban/KanbanView.svelte:648 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneCollapsed markup
call src/lib/plugins/kanban/KanbanView.svelte:650 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:getLaneMaxItems markup
call src/lib/plugins/kanban/KanbanView.svelte:651 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAtLimit markup
call src/lib/plugins/kanban/KanbanView.svelte:653 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete markup
call src/lib/plugins/kanban/KanbanView.svelte:660 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleTagClick markup
call src/lib/plugins/kanban/KanbanView.svelte:661 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleAddItem markup
call src/lib/plugins/kanban/KanbanView.svelte:663 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleUpdateItem markup
call src/lib/plugins/kanban/KanbanView.svelte:664 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteItem markup
call src/lib/plugins/kanban/KanbanView.svelte:665 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleArchiveItem markup
call src/lib/plugins/kanban/KanbanView.svelte:667 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleMoveItem markup
call src/lib/plugins/kanban/KanbanView.svelte:668 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleArchiveCompleted markup
call src/lib/plugins/kanban/KanbanView.svelte:669 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRenameLane markup
call src/lib/plugins/kanban/KanbanView.svelte:670 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteLane markup
call src/lib/plugins/kanban/KanbanView.svelte:671 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleCollapse markup
call src/lib/plugins/kanban/KanbanView.svelte:672 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleAutoComplete markup
call src/lib/plugins/kanban/KanbanView.svelte:673 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetMaxItems markup
call src/lib/plugins/kanban/KanbanView.svelte:674 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetTagColor markup
call src/lib/plugins/kanban/KanbanView.svelte:675 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRemoveTagColor markup
call src/lib/plugins/kanban/KanbanView.svelte:676 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneWidthChange markup
call src/lib/plugins/kanban/KanbanView.svelte:677 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStartEditItem markup
call src/lib/plugins/kanban/KanbanView.svelte:678 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStopEditItem markup
call src/lib/plugins/kanban/KanbanView.svelte:679 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStartEditLane markup
call src/lib/plugins/kanban/KanbanView.svelte:680 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStopEditLane markup
call src/lib/plugins/kanban/KanbanView.svelte:681 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragStart markup
call src/lib/plugins/kanban/KanbanView.svelte:682 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragEnd markup
call src/lib/plugins/kanban/KanbanView.svelte:683 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragOver markup
call src/lib/plugins/kanban/KanbanView.svelte:684 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDrop markup
call src/lib/plugins/kanban/KanbanView.svelte:685 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragStart markup
call src/lib/plugins/kanban/KanbanView.svelte:686 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragEnd markup
call src/lib/plugins/kanban/KanbanView.svelte:694 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleAddLane markup
call src/lib/plugins/kanban/KanbanView.svelte:704 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:DEFAULT_LANE_WIDTH markup
call src/lib/plugins/kanban/KanbanView.svelte:722 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:stripCardMetadata markup
call src/lib/plugins/kanban/KanbanView.svelte:725 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRestoreItem markup
call src/lib/plugins/kanban/KanbanView.svelte:733 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteArchivedItem markup
## effects
fx src/lib/plugins/kanban/KanbanView.svelte:77 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanView.svelte:271 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanView.svelte:288 svelte.$effect in (script)
