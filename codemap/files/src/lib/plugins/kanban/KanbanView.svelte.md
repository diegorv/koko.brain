# file card src/lib/plugins/kanban/KanbanView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanView.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/plugins/kanban/KanbanView.svelte component L713 module src/lib/plugins/kanban in1 t4
## imports
imp src/lib/plugins/kanban/KanbanView.svelte:15 -> src/lib/components/ui/select/index.ts *
imp src/lib/plugins/kanban/KanbanView.svelte:16 -> src/lib/core/editor/editor.store.svelte.ts editorStore
imp src/lib/plugins/kanban/KanbanView.svelte:17 -> src/lib/plugins/kanban/kanban.logic.ts parseKanbanBoard,serializeKanbanBoard,addItem,removeItem,updateItem,toggleItem,moveItem,addLane,removeLane,renameLane,moveLane,archiveItem,archiveCompletedItems,restoreItem,isLaneCollapsed,toggleLaneCollapsed,DEFAULT_LANE_WIDTH,getLaneMaxItems,isLaneAtLimit,isLaneAutoComplete,setLaneAutoComplete,setLaneMaxItems,setTagColor,removeTagColor,updateBoardSettings,sortItems,setSortMode,filterItems,setViewMode,canReorderItems,uniqueLaneTitle
imp src/lib/plugins/kanban/KanbanView.svelte:50 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanSortMode,type:KanbanViewMode
imp src/lib/plugins/kanban/KanbanView.svelte:51 -> src/lib/plugins/kanban/kanban.store.svelte.ts kanbanStore
imp src/lib/plugins/kanban/KanbanView.svelte:52 -> src/lib/plugins/kanban/KanbanLane.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:53 -> src/lib/plugins/kanban/KanbanListView.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:54 -> src/lib/plugins/kanban/KanbanTableView.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:185 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanLane
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
sym src/lib/plugins/kanban/KanbanView.svelte:1 component KanbanView props:markdownContent,onContentChange,onOpenWikilink L713
by src/lib/plugins/kanban/KanbanView.svelte:default <- src/lib/app/EditorView.svelte:81 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanView.svelte:84 fn applyChange(newBoard: KanbanBoard) L12
local src/lib/plugins/kanban/KanbanView.svelte:99 fn handleAddItem(laneId: string, text: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:103 fn handleToggleItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:107 fn handleUpdateItem(laneId: string, itemId: string, text: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:111 fn handleDeleteItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:115 fn handleArchiveItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:119 fn handleArchiveCompleted(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:125 fn handleRenameLane(laneId: string, title: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:129 fn handleDeleteLane(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:133 fn handleAddLane() L6
local src/lib/plugins/kanban/KanbanView.svelte:140 fn handleToggleCollapse(laneId: string) L5
local src/lib/plugins/kanban/KanbanView.svelte:146 fn handleToggleAutoComplete(laneId: string) L6
local src/lib/plugins/kanban/KanbanView.svelte:153 fn handleSetMaxItems(laneId: string, maxItems: number) L5
local src/lib/plugins/kanban/KanbanView.svelte:159 fn handleSetTagColor(tag: string, color: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:163 fn handleRemoveTagColor(tag: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:167 fn handleLaneWidthChange(width: number) L3
local src/lib/plugins/kanban/KanbanView.svelte:180 fn handleSetSortMode(mode: KanbanSortMode) L3
local src/lib/plugins/kanban/KanbanView.svelte:185 fn displayLane(lane: import('./kanban.types').KanbanLane) L6
local src/lib/plugins/kanban/KanbanView.svelte:211 fn handleSetViewMode(mode: KanbanViewMode) L3
local src/lib/plugins/kanban/KanbanView.svelte:223 fn handleStartEditItem(itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:227 fn handleStopEditItem() L3
local src/lib/plugins/kanban/KanbanView.svelte:231 fn handleStartEditLane(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:235 fn handleStopEditLane() L3
local src/lib/plugins/kanban/KanbanView.svelte:241 fn handleWikilinkClick(target: string, _heading?: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:281 fn handleClearFilter() L4
local src/lib/plugins/kanban/KanbanView.svelte:286 fn handleFilterKeydown(e: KeyboardEvent) L3
local src/lib/plugins/kanban/KanbanView.svelte:290 fn handleTagClick(tag: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:294 fn handleBoardKeydown(e: KeyboardEvent) L93
local src/lib/plugins/kanban/KanbanView.svelte:392 fn handleRestoreItem(itemId: string) L5
local src/lib/plugins/kanban/KanbanView.svelte:398 fn handleDeleteArchivedItem(itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:409 fn handleItemDragStart(e: DragEvent, laneId: string, itemId: string) L8
local src/lib/plugins/kanban/KanbanView.svelte:418 fn handleItemDragEnd(_e: DragEvent) L6
local src/lib/plugins/kanban/KanbanView.svelte:425 fn handleItemDragOver(e: DragEvent, laneId: string) L18
local src/lib/plugins/kanban/KanbanView.svelte:444 fn handleItemDrop(e: DragEvent, toLaneId: string) L27
local src/lib/plugins/kanban/KanbanView.svelte:476 fn handleLaneDragStart(e: DragEvent, laneId: string) L7
local src/lib/plugins/kanban/KanbanView.svelte:484 fn handleLaneDragEnd(_e: DragEvent) L3
local src/lib/plugins/kanban/KanbanView.svelte:488 fn handleLaneDragOver(e: DragEvent) L5
local src/lib/plugins/kanban/KanbanView.svelte:494 fn handleLaneDrop(e: DragEvent) L23
## mounts
mount src/lib/plugins/kanban/KanbanView.svelte:598 KanbanListView -> src/lib/plugins/kanban/KanbanListView.svelte
mount src/lib/plugins/kanban/KanbanView.svelte:600 KanbanTableView -> src/lib/plugins/kanban/KanbanTableView.svelte
mount src/lib/plugins/kanban/KanbanView.svelte:611 KanbanLane -> src/lib/plugins/kanban/KanbanLane.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:81 KanbanView -> src/lib/plugins/kanban/KanbanView.svelte
## calls
call src/lib/plugins/kanban/KanbanView.svelte:80 in $effect@74 -> src/lib/plugins/kanban/kanban.logic.ts:parseKanbanBoard call
call src/lib/plugins/kanban/KanbanView.svelte:86 in applyChange -> src/lib/plugins/kanban/kanban.logic.ts:serializeKanbanBoard call
call src/lib/plugins/kanban/KanbanView.svelte:100 in handleAddItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:100 in handleAddItem -> src/lib/plugins/kanban/kanban.logic.ts:addItem call
call src/lib/plugins/kanban/KanbanView.svelte:104 in handleToggleItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:104 in handleToggleItem -> src/lib/plugins/kanban/kanban.logic.ts:toggleItem call
call src/lib/plugins/kanban/KanbanView.svelte:108 in handleUpdateItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:108 in handleUpdateItem -> src/lib/plugins/kanban/kanban.logic.ts:updateItem call
call src/lib/plugins/kanban/KanbanView.svelte:112 in handleDeleteItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:112 in handleDeleteItem -> src/lib/plugins/kanban/kanban.logic.ts:removeItem call
call src/lib/plugins/kanban/KanbanView.svelte:116 in handleArchiveItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:116 in handleArchiveItem -> src/lib/plugins/kanban/kanban.logic.ts:archiveItem call
call src/lib/plugins/kanban/KanbanView.svelte:120 in handleArchiveCompleted -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:120 in handleArchiveCompleted -> src/lib/plugins/kanban/kanban.logic.ts:archiveCompletedItems call
call src/lib/plugins/kanban/KanbanView.svelte:126 in handleRenameLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:126 in handleRenameLane -> src/lib/plugins/kanban/kanban.logic.ts:renameLane call
call src/lib/plugins/kanban/KanbanView.svelte:130 in handleDeleteLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:130 in handleDeleteLane -> src/lib/plugins/kanban/kanban.logic.ts:removeLane call
call src/lib/plugins/kanban/KanbanView.svelte:134 in handleAddLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:134 in handleAddLane -> src/lib/plugins/kanban/kanban.logic.ts:addLane call
call src/lib/plugins/kanban/KanbanView.svelte:134 in handleAddLane -> src/lib/plugins/kanban/kanban.logic.ts:uniqueLaneTitle call
call src/lib/plugins/kanban/KanbanView.svelte:137 in handleAddLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:143 in handleToggleCollapse -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:143 in handleToggleCollapse -> src/lib/plugins/kanban/kanban.logic.ts:toggleLaneCollapsed call
call src/lib/plugins/kanban/KanbanView.svelte:149 in handleToggleAutoComplete -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:150 in handleToggleAutoComplete -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:150 in handleToggleAutoComplete -> src/lib/plugins/kanban/kanban.logic.ts:setLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:156 in handleSetMaxItems -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:156 in handleSetMaxItems -> src/lib/plugins/kanban/kanban.logic.ts:setLaneMaxItems call
call src/lib/plugins/kanban/KanbanView.svelte:160 in handleSetTagColor -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:160 in handleSetTagColor -> src/lib/plugins/kanban/kanban.logic.ts:setTagColor call
call src/lib/plugins/kanban/KanbanView.svelte:164 in handleRemoveTagColor -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:164 in handleRemoveTagColor -> src/lib/plugins/kanban/kanban.logic.ts:removeTagColor call
call src/lib/plugins/kanban/KanbanView.svelte:168 in handleLaneWidthChange -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:168 in handleLaneWidthChange -> src/lib/plugins/kanban/kanban.logic.ts:updateBoardSettings call
call src/lib/plugins/kanban/KanbanView.svelte:178 in canReorder=$derived -> src/lib/plugins/kanban/kanban.logic.ts:canReorderItems call
call src/lib/plugins/kanban/KanbanView.svelte:181 in handleSetSortMode -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:181 in handleSetSortMode -> src/lib/plugins/kanban/kanban.logic.ts:setSortMode call
call src/lib/plugins/kanban/KanbanView.svelte:186 in displayLane -> src/lib/plugins/kanban/kanban.logic.ts:filterItems call
call src/lib/plugins/kanban/KanbanView.svelte:187 in displayLane -> src/lib/plugins/kanban/kanban.logic.ts:sortItems call
call src/lib/plugins/kanban/KanbanView.svelte:212 in handleSetViewMode -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:212 in handleSetViewMode -> src/lib/plugins/kanban/kanban.logic.ts:setViewMode call
call src/lib/plugins/kanban/KanbanView.svelte:218 in displayBoard=$derived -> src/lib/plugins/kanban/KanbanView.svelte:displayLane call
call src/lib/plugins/kanban/KanbanView.svelte:224 in handleStartEditItem -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:228 in handleStopEditItem -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:232 in handleStartEditLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:236 in handleStopEditLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:260 in $effect@256 -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall
call src/lib/plugins/kanban/KanbanView.svelte:276 in $effect@273 -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery mcall
call src/lib/plugins/kanban/KanbanView.svelte:277 in $effect@273 -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall
call src/lib/plugins/kanban/KanbanView.svelte:282 in handleClearFilter -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery mcall
call src/lib/plugins/kanban/KanbanView.svelte:287 in handleFilterKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery mcall
call src/lib/plugins/kanban/KanbanView.svelte:291 in handleTagClick -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery mcall
call src/lib/plugins/kanban/KanbanView.svelte:302 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.logic.ts:isLaneCollapsed call
call src/lib/plugins/kanban/KanbanView.svelte:313 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFocus mcall +6
call src/lib/plugins/kanban/KanbanView.svelte:345 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:351 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall +1
call src/lib/plugins/kanban/KanbanView.svelte:357 in handleBoardKeydown -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleItem call
call src/lib/plugins/kanban/KanbanView.svelte:366 in handleBoardKeydown -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteItem call
call src/lib/plugins/kanban/KanbanView.svelte:395 in handleRestoreItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:395 in handleRestoreItem -> src/lib/plugins/kanban/kanban.logic.ts:restoreItem call
call src/lib/plugins/kanban/KanbanView.svelte:399 in handleDeleteArchivedItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:463 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:465 in handleItemDrop -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:465 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:moveItem call
call src/lib/plugins/kanban/KanbanView.svelte:513 in handleLaneDrop -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:513 in handleLaneDrop -> src/lib/plugins/kanban/kanban.logic.ts:moveLane call
call src/lib/plugins/kanban/KanbanView.svelte:521 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleBoardKeydown markup
call src/lib/plugins/kanban/KanbanView.svelte:527 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetViewMode markup +2
call src/lib/plugins/kanban/KanbanView.svelte:558 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetSortMode markup
call src/lib/plugins/kanban/KanbanView.svelte:578 in (markup) -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery markup
call src/lib/plugins/kanban/KanbanView.svelte:579 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleFilterKeydown markup
call src/lib/plugins/kanban/KanbanView.svelte:588 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleClearFilter markup
call src/lib/plugins/kanban/KanbanView.svelte:598 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleItem markup +2
call src/lib/plugins/kanban/KanbanView.svelte:598 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleWikilinkClick markup +1
call src/lib/plugins/kanban/KanbanView.svelte:605 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragOver markup
call src/lib/plugins/kanban/KanbanView.svelte:606 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDrop markup
call src/lib/plugins/kanban/KanbanView.svelte:616 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneCollapsed markup
call src/lib/plugins/kanban/KanbanView.svelte:618 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:getLaneMaxItems markup
call src/lib/plugins/kanban/KanbanView.svelte:619 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAtLimit markup
call src/lib/plugins/kanban/KanbanView.svelte:621 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete markup
call src/lib/plugins/kanban/KanbanView.svelte:628 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleTagClick markup
call src/lib/plugins/kanban/KanbanView.svelte:629 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleAddItem markup
call src/lib/plugins/kanban/KanbanView.svelte:631 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleUpdateItem markup
call src/lib/plugins/kanban/KanbanView.svelte:632 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteItem markup
call src/lib/plugins/kanban/KanbanView.svelte:633 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleArchiveItem markup
call src/lib/plugins/kanban/KanbanView.svelte:634 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleArchiveCompleted markup
call src/lib/plugins/kanban/KanbanView.svelte:635 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRenameLane markup
call src/lib/plugins/kanban/KanbanView.svelte:636 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteLane markup
call src/lib/plugins/kanban/KanbanView.svelte:637 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleCollapse markup
call src/lib/plugins/kanban/KanbanView.svelte:638 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleAutoComplete markup
call src/lib/plugins/kanban/KanbanView.svelte:639 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetMaxItems markup
call src/lib/plugins/kanban/KanbanView.svelte:640 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetTagColor markup
call src/lib/plugins/kanban/KanbanView.svelte:641 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRemoveTagColor markup
call src/lib/plugins/kanban/KanbanView.svelte:642 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneWidthChange markup
call src/lib/plugins/kanban/KanbanView.svelte:643 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStartEditItem markup
call src/lib/plugins/kanban/KanbanView.svelte:644 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStopEditItem markup
call src/lib/plugins/kanban/KanbanView.svelte:645 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStartEditLane markup
call src/lib/plugins/kanban/KanbanView.svelte:646 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStopEditLane markup
call src/lib/plugins/kanban/KanbanView.svelte:647 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragStart markup
call src/lib/plugins/kanban/KanbanView.svelte:648 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragEnd markup
call src/lib/plugins/kanban/KanbanView.svelte:649 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragOver markup
call src/lib/plugins/kanban/KanbanView.svelte:650 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDrop markup
call src/lib/plugins/kanban/KanbanView.svelte:651 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragStart markup
call src/lib/plugins/kanban/KanbanView.svelte:652 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragEnd markup
call src/lib/plugins/kanban/KanbanView.svelte:660 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleAddLane markup
call src/lib/plugins/kanban/KanbanView.svelte:670 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:DEFAULT_LANE_WIDTH markup
call src/lib/plugins/kanban/KanbanView.svelte:691 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRestoreItem markup
call src/lib/plugins/kanban/KanbanView.svelte:699 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteArchivedItem markup
## effects
fx src/lib/plugins/kanban/KanbanView.svelte:74 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanView.svelte:256 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanView.svelte:273 svelte.$effect in (script)
