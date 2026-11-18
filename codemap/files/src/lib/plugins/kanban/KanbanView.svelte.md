# file card src/lib/plugins/kanban/KanbanView.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/kanban/KanbanView.svelte ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/plugins/kanban/KanbanView.svelte component L661 module src/lib/plugins/kanban in1 t4
## imports
imp src/lib/plugins/kanban/KanbanView.svelte:14 -> src/lib/components/ui/select/index.ts *
imp src/lib/plugins/kanban/KanbanView.svelte:15 -> src/lib/plugins/kanban/kanban.logic.ts parseKanbanBoard,serializeKanbanBoard,addItem,removeItem,updateItem,toggleItem,moveItem,addLane,removeLane,renameLane,moveLane,archiveItem,archiveCompletedItems,restoreItem,isLaneCollapsed,toggleLaneCollapsed,DEFAULT_LANE_WIDTH,getLaneMaxItems,isLaneAtLimit,isLaneAutoComplete,setLaneAutoComplete,setLaneMaxItems,setTagColor,removeTagColor,updateBoardSettings,sortItems,setSortMode,filterItems,setViewMode,canReorderItems,uniqueLaneTitle
imp src/lib/plugins/kanban/KanbanView.svelte:48 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanBoard,type:KanbanSortMode,type:KanbanViewMode
imp src/lib/plugins/kanban/KanbanView.svelte:49 -> src/lib/plugins/kanban/kanban.store.svelte.ts kanbanStore
imp src/lib/plugins/kanban/KanbanView.svelte:50 -> src/lib/plugins/kanban/KanbanLane.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:51 -> src/lib/plugins/kanban/KanbanListView.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:52 -> src/lib/plugins/kanban/KanbanTableView.svelte default
imp src/lib/plugins/kanban/KanbanView.svelte:183 -> src/lib/plugins/kanban/kanban.types.ts type:KanbanLane
## imported-by
imp src/lib/app/EditorView.svelte:20 -> src/lib/plugins/kanban/KanbanView.svelte default
## reach
in2 src/lib/plugins/kanban/KanbanView.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/kanban/KanbanView.svelte 18 files in 3 modules: src/lib/components(12) src/lib/plugins/kanban(3) src/lib/utils(3)
## tests
test src/tests/lib/plugins/kanban/KanbanView.test.ts harness src/lib/plugins/kanban/KanbanView.svelte mirror via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-multiline-card.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-unmodeled-content.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
test src/tests/lib/plugins/kanban/kanban-unmodeled-lines.test.ts harness src/lib/plugins/kanban/KanbanView.svelte via src/tests/fixtures/KanbanViewHarness.svelte
## symbols
sym src/lib/plugins/kanban/KanbanView.svelte:1 component KanbanView props:markdownContent,onContentChange,onOpenWikilink L661
by src/lib/plugins/kanban/KanbanView.svelte:default <- src/lib/app/EditorView.svelte:81 in (markup) mount
## locals
local src/lib/plugins/kanban/KanbanView.svelte:82 fn applyChange(newBoard: KanbanBoard) L12
local src/lib/plugins/kanban/KanbanView.svelte:97 fn handleAddItem(laneId: string, text: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:101 fn handleToggleItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:105 fn handleUpdateItem(laneId: string, itemId: string, text: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:109 fn handleDeleteItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:113 fn handleArchiveItem(laneId: string, itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:117 fn handleArchiveCompleted(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:123 fn handleRenameLane(laneId: string, title: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:127 fn handleDeleteLane(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:131 fn handleAddLane() L6
local src/lib/plugins/kanban/KanbanView.svelte:138 fn handleToggleCollapse(laneId: string) L5
local src/lib/plugins/kanban/KanbanView.svelte:144 fn handleToggleAutoComplete(laneId: string) L6
local src/lib/plugins/kanban/KanbanView.svelte:151 fn handleSetMaxItems(laneId: string, maxItems: number) L5
local src/lib/plugins/kanban/KanbanView.svelte:157 fn handleSetTagColor(tag: string, color: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:161 fn handleRemoveTagColor(tag: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:165 fn handleLaneWidthChange(width: number) L3
local src/lib/plugins/kanban/KanbanView.svelte:178 fn handleSetSortMode(mode: KanbanSortMode) L3
local src/lib/plugins/kanban/KanbanView.svelte:183 fn displayLane(lane: import('./kanban.types').KanbanLane) L6
local src/lib/plugins/kanban/KanbanView.svelte:209 fn handleSetViewMode(mode: KanbanViewMode) L3
local src/lib/plugins/kanban/KanbanView.svelte:221 fn handleStartEditItem(itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:225 fn handleStopEditItem() L3
local src/lib/plugins/kanban/KanbanView.svelte:229 fn handleStartEditLane(laneId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:233 fn handleStopEditLane() L3
local src/lib/plugins/kanban/KanbanView.svelte:239 fn handleWikilinkClick(target: string, _heading?: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:261 fn handleBoardKeydown(e: KeyboardEvent) L93
local src/lib/plugins/kanban/KanbanView.svelte:359 fn handleRestoreItem(itemId: string) L5
local src/lib/plugins/kanban/KanbanView.svelte:365 fn handleDeleteArchivedItem(itemId: string) L3
local src/lib/plugins/kanban/KanbanView.svelte:376 fn handleItemDragStart(e: DragEvent, laneId: string, itemId: string) L8
local src/lib/plugins/kanban/KanbanView.svelte:385 fn handleItemDragEnd(_e: DragEvent) L6
local src/lib/plugins/kanban/KanbanView.svelte:392 fn handleItemDragOver(e: DragEvent, laneId: string) L18
local src/lib/plugins/kanban/KanbanView.svelte:411 fn handleItemDrop(e: DragEvent, toLaneId: string) L27
local src/lib/plugins/kanban/KanbanView.svelte:443 fn handleLaneDragStart(e: DragEvent, laneId: string) L7
local src/lib/plugins/kanban/KanbanView.svelte:451 fn handleLaneDragEnd(_e: DragEvent) L3
local src/lib/plugins/kanban/KanbanView.svelte:455 fn handleLaneDragOver(e: DragEvent) L5
local src/lib/plugins/kanban/KanbanView.svelte:461 fn handleLaneDrop(e: DragEvent) L23
## mounts
mount src/lib/plugins/kanban/KanbanView.svelte:548 KanbanListView -> src/lib/plugins/kanban/KanbanListView.svelte
mount src/lib/plugins/kanban/KanbanView.svelte:550 KanbanTableView -> src/lib/plugins/kanban/KanbanTableView.svelte
mount src/lib/plugins/kanban/KanbanView.svelte:561 KanbanLane -> src/lib/plugins/kanban/KanbanLane.svelte
## mounted-at
mount src/lib/app/EditorView.svelte:81 KanbanView -> src/lib/plugins/kanban/KanbanView.svelte
## calls
call src/lib/plugins/kanban/KanbanView.svelte:78 in $effect@72 -> src/lib/plugins/kanban/kanban.logic.ts:parseKanbanBoard call
call src/lib/plugins/kanban/KanbanView.svelte:84 in applyChange -> src/lib/plugins/kanban/kanban.logic.ts:serializeKanbanBoard call
call src/lib/plugins/kanban/KanbanView.svelte:98 in handleAddItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:98 in handleAddItem -> src/lib/plugins/kanban/kanban.logic.ts:addItem call
call src/lib/plugins/kanban/KanbanView.svelte:102 in handleToggleItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:102 in handleToggleItem -> src/lib/plugins/kanban/kanban.logic.ts:toggleItem call
call src/lib/plugins/kanban/KanbanView.svelte:106 in handleUpdateItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:106 in handleUpdateItem -> src/lib/plugins/kanban/kanban.logic.ts:updateItem call
call src/lib/plugins/kanban/KanbanView.svelte:110 in handleDeleteItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:110 in handleDeleteItem -> src/lib/plugins/kanban/kanban.logic.ts:removeItem call
call src/lib/plugins/kanban/KanbanView.svelte:114 in handleArchiveItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:114 in handleArchiveItem -> src/lib/plugins/kanban/kanban.logic.ts:archiveItem call
call src/lib/plugins/kanban/KanbanView.svelte:118 in handleArchiveCompleted -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:118 in handleArchiveCompleted -> src/lib/plugins/kanban/kanban.logic.ts:archiveCompletedItems call
call src/lib/plugins/kanban/KanbanView.svelte:124 in handleRenameLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:124 in handleRenameLane -> src/lib/plugins/kanban/kanban.logic.ts:renameLane call
call src/lib/plugins/kanban/KanbanView.svelte:128 in handleDeleteLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:128 in handleDeleteLane -> src/lib/plugins/kanban/kanban.logic.ts:removeLane call
call src/lib/plugins/kanban/KanbanView.svelte:132 in handleAddLane -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:132 in handleAddLane -> src/lib/plugins/kanban/kanban.logic.ts:addLane call
call src/lib/plugins/kanban/KanbanView.svelte:132 in handleAddLane -> src/lib/plugins/kanban/kanban.logic.ts:uniqueLaneTitle call
call src/lib/plugins/kanban/KanbanView.svelte:135 in handleAddLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:141 in handleToggleCollapse -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:141 in handleToggleCollapse -> src/lib/plugins/kanban/kanban.logic.ts:toggleLaneCollapsed call
call src/lib/plugins/kanban/KanbanView.svelte:147 in handleToggleAutoComplete -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:148 in handleToggleAutoComplete -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:148 in handleToggleAutoComplete -> src/lib/plugins/kanban/kanban.logic.ts:setLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:154 in handleSetMaxItems -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:154 in handleSetMaxItems -> src/lib/plugins/kanban/kanban.logic.ts:setLaneMaxItems call
call src/lib/plugins/kanban/KanbanView.svelte:158 in handleSetTagColor -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:158 in handleSetTagColor -> src/lib/plugins/kanban/kanban.logic.ts:setTagColor call
call src/lib/plugins/kanban/KanbanView.svelte:162 in handleRemoveTagColor -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:162 in handleRemoveTagColor -> src/lib/plugins/kanban/kanban.logic.ts:removeTagColor call
call src/lib/plugins/kanban/KanbanView.svelte:166 in handleLaneWidthChange -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:166 in handleLaneWidthChange -> src/lib/plugins/kanban/kanban.logic.ts:updateBoardSettings call
call src/lib/plugins/kanban/KanbanView.svelte:176 in canReorder=$derived -> src/lib/plugins/kanban/kanban.logic.ts:canReorderItems call
call src/lib/plugins/kanban/KanbanView.svelte:179 in handleSetSortMode -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:179 in handleSetSortMode -> src/lib/plugins/kanban/kanban.logic.ts:setSortMode call
call src/lib/plugins/kanban/KanbanView.svelte:184 in displayLane -> src/lib/plugins/kanban/kanban.logic.ts:filterItems call
call src/lib/plugins/kanban/KanbanView.svelte:185 in displayLane -> src/lib/plugins/kanban/kanban.logic.ts:sortItems call
call src/lib/plugins/kanban/KanbanView.svelte:210 in handleSetViewMode -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:210 in handleSetViewMode -> src/lib/plugins/kanban/kanban.logic.ts:setViewMode call
call src/lib/plugins/kanban/KanbanView.svelte:216 in displayBoard=$derived -> src/lib/plugins/kanban/KanbanView.svelte:displayLane call
call src/lib/plugins/kanban/KanbanView.svelte:222 in handleStartEditItem -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:226 in handleStopEditItem -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:230 in handleStartEditLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:234 in handleStopEditLane -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingLaneId mcall
call src/lib/plugins/kanban/KanbanView.svelte:258 in $effect@254 -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall
call src/lib/plugins/kanban/KanbanView.svelte:269 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.logic.ts:isLaneCollapsed call
call src/lib/plugins/kanban/KanbanView.svelte:280 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFocus mcall +6
call src/lib/plugins/kanban/KanbanView.svelte:312 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setEditingItemId mcall
call src/lib/plugins/kanban/KanbanView.svelte:318 in handleBoardKeydown -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.clearFocus mcall +1
call src/lib/plugins/kanban/KanbanView.svelte:324 in handleBoardKeydown -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleItem call
call src/lib/plugins/kanban/KanbanView.svelte:333 in handleBoardKeydown -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteItem call
call src/lib/plugins/kanban/KanbanView.svelte:362 in handleRestoreItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:362 in handleRestoreItem -> src/lib/plugins/kanban/kanban.logic.ts:restoreItem call
call src/lib/plugins/kanban/KanbanView.svelte:366 in handleDeleteArchivedItem -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:430 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete call
call src/lib/plugins/kanban/KanbanView.svelte:432 in handleItemDrop -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:432 in handleItemDrop -> src/lib/plugins/kanban/kanban.logic.ts:moveItem call
call src/lib/plugins/kanban/KanbanView.svelte:480 in handleLaneDrop -> src/lib/plugins/kanban/KanbanView.svelte:applyChange call
call src/lib/plugins/kanban/KanbanView.svelte:480 in handleLaneDrop -> src/lib/plugins/kanban/kanban.logic.ts:moveLane call
call src/lib/plugins/kanban/KanbanView.svelte:487 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleBoardKeydown markup
call src/lib/plugins/kanban/KanbanView.svelte:493 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetViewMode markup +2
call src/lib/plugins/kanban/KanbanView.svelte:524 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetSortMode markup
call src/lib/plugins/kanban/KanbanView.svelte:542 in (markup) -> src/lib/plugins/kanban/kanban.store.svelte.ts:kanbanStore.setFilterQuery markup
call src/lib/plugins/kanban/KanbanView.svelte:548 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleItem markup +2
call src/lib/plugins/kanban/KanbanView.svelte:548 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleWikilinkClick markup +1
call src/lib/plugins/kanban/KanbanView.svelte:555 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragOver markup
call src/lib/plugins/kanban/KanbanView.svelte:556 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDrop markup
call src/lib/plugins/kanban/KanbanView.svelte:566 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneCollapsed markup
call src/lib/plugins/kanban/KanbanView.svelte:568 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:getLaneMaxItems markup
call src/lib/plugins/kanban/KanbanView.svelte:569 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAtLimit markup
call src/lib/plugins/kanban/KanbanView.svelte:570 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:isLaneAutoComplete markup
call src/lib/plugins/kanban/KanbanView.svelte:577 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleAddItem markup
call src/lib/plugins/kanban/KanbanView.svelte:579 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleUpdateItem markup
call src/lib/plugins/kanban/KanbanView.svelte:580 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteItem markup
call src/lib/plugins/kanban/KanbanView.svelte:581 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleArchiveItem markup
call src/lib/plugins/kanban/KanbanView.svelte:582 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleArchiveCompleted markup
call src/lib/plugins/kanban/KanbanView.svelte:583 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRenameLane markup
call src/lib/plugins/kanban/KanbanView.svelte:584 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteLane markup
call src/lib/plugins/kanban/KanbanView.svelte:585 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleCollapse markup
call src/lib/plugins/kanban/KanbanView.svelte:586 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleToggleAutoComplete markup
call src/lib/plugins/kanban/KanbanView.svelte:587 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetMaxItems markup
call src/lib/plugins/kanban/KanbanView.svelte:588 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleSetTagColor markup
call src/lib/plugins/kanban/KanbanView.svelte:589 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRemoveTagColor markup
call src/lib/plugins/kanban/KanbanView.svelte:590 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneWidthChange markup
call src/lib/plugins/kanban/KanbanView.svelte:591 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStartEditItem markup
call src/lib/plugins/kanban/KanbanView.svelte:592 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStopEditItem markup
call src/lib/plugins/kanban/KanbanView.svelte:593 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStartEditLane markup
call src/lib/plugins/kanban/KanbanView.svelte:594 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleStopEditLane markup
call src/lib/plugins/kanban/KanbanView.svelte:595 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragStart markup
call src/lib/plugins/kanban/KanbanView.svelte:596 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragEnd markup
call src/lib/plugins/kanban/KanbanView.svelte:597 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDragOver markup
call src/lib/plugins/kanban/KanbanView.svelte:598 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleItemDrop markup
call src/lib/plugins/kanban/KanbanView.svelte:599 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragStart markup
call src/lib/plugins/kanban/KanbanView.svelte:600 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleLaneDragEnd markup
call src/lib/plugins/kanban/KanbanView.svelte:608 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleAddLane markup
call src/lib/plugins/kanban/KanbanView.svelte:618 in (markup) -> src/lib/plugins/kanban/kanban.logic.ts:DEFAULT_LANE_WIDTH markup
call src/lib/plugins/kanban/KanbanView.svelte:639 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleRestoreItem markup
call src/lib/plugins/kanban/KanbanView.svelte:647 in (markup) -> src/lib/plugins/kanban/KanbanView.svelte:handleDeleteArchivedItem markup
## effects
fx src/lib/plugins/kanban/KanbanView.svelte:72 svelte.$effect in (script)
fx src/lib/plugins/kanban/KanbanView.svelte:254 svelte.$effect in (script)
