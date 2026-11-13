# file card src/lib/features/canvas/CanvasInner.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/canvas/CanvasInner.svelte ' codemap/files
sections: imports, imported-by, reach, symbols, locals, mounts, mounted-at, calls, effects
file src/lib/features/canvas/CanvasInner.svelte component L817 module src/lib/features/canvas in1 t0
## imports
imp src/lib/features/canvas/CanvasInner.svelte:17 -> src/lib/features/canvas/TextNode.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:18 -> src/lib/features/canvas/FileNode.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:19 -> src/lib/features/canvas/LinkNode.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:20 -> src/lib/features/canvas/GroupNode.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:21 -> src/lib/features/canvas/ImageNode.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:22 -> src/lib/features/canvas/CanvasEdge.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:23 -> src/lib/features/canvas/CanvasContextMenu.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:24 -> src/lib/features/canvas/CanvasToolbar.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:25 -> src/lib/features/canvas/CanvasFilePicker.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:26 -> src/lib/features/canvas/CanvasLinkInput.svelte default
imp src/lib/features/canvas/CanvasInner.svelte:27 -> src/lib/features/canvas/canvas.logic.ts parseCanvas,serializeCanvas,canvasToFlow,flowToCanvas,createTextNode,createFileNode,createLinkNode,createGroupNode,createImageNode,canvasNodeToFlowNode,duplicateNode,resolveColor,generateId,toVaultRelativePath
imp src/lib/features/canvas/CanvasInner.svelte:43 -> src/lib/features/canvas/canvas-image.service.ts isImageFile
imp src/lib/features/canvas/CanvasInner.svelte:44 -> src/lib/features/canvas/canvas-history.logic.ts createHistory,pushSnapshot,undo,redo,type:CanvasHistory
imp src/lib/features/canvas/CanvasInner.svelte:45 -> src/lib/core/editor/editor.service.ts openFileInEditor,registerPendingEditFlusher
imp src/lib/features/canvas/CanvasInner.svelte:46 -> src/lib/core/vault/vault.store.svelte.ts vaultStore
imp src/lib/features/canvas/CanvasInner.svelte:47 -> src/lib/features/canvas/canvas.types.ts type:CanvasData,type:CanvasNode,type:CanvasColor
## imported-by
imp src/lib/features/canvas/CanvasView.svelte:3 -> src/lib/features/canvas/CanvasInner.svelte default
## reach
in2 src/lib/features/canvas/CanvasInner.svelte 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/canvas/CanvasInner.svelte 15 files in 6 modules: src/lib/core/editor(4) src/lib/utils(4) src/lib/core/filesystem(3) src/lib/features/canvas(2) src/lib/core/markdown-editor(1) +1 modules
## symbols
sym src/lib/features/canvas/CanvasInner.svelte:1 component CanvasInner props:path,jsonContent,onJsonChange L817
by src/lib/features/canvas/CanvasInner.svelte:default <- src/lib/features/canvas/CanvasView.svelte:18 in (markup) mount
## locals
local src/lib/features/canvas/CanvasInner.svelte:120 fn persistWithoutHistory(updatedNodes: Node[], updatedEdges: Edge[]) L7
local src/lib/features/canvas/CanvasInner.svelte:129 fn persistChanges(updatedNodes: Node[], updatedEdges: Edge[]) L4
local src/lib/features/canvas/CanvasInner.svelte:135 fn handleNodeDragStop({ targetNode }: { targetNode: Node | null }) L41
local src/lib/features/canvas/CanvasInner.svelte:178 fn handleConnect(connection: Connection) L13
local src/lib/features/canvas/CanvasInner.svelte:193 fn handleReconnect() L3
local src/lib/features/canvas/CanvasInner.svelte:198 fn handleDelete({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[]; edges: Edge[] }) L26
local src/lib/features/canvas/CanvasInner.svelte:268 fn handleKeydown(e: KeyboardEvent) L52
local src/lib/features/canvas/CanvasInner.svelte:338 fn menuPosition(e: MouseEvent) L11
local src/lib/features/canvas/CanvasInner.svelte:350 fn handlePaneContextMenu({ event }: { event: MouseEvent }) L4
local src/lib/features/canvas/CanvasInner.svelte:355 fn handleNodeContextMenu({ event, node }: { event: MouseEvent; node: Node }) L4
local src/lib/features/canvas/CanvasInner.svelte:360 fn handleEdgeContextMenu({ event, edge }: { event: MouseEvent; edge: Edge }) L4
local src/lib/features/canvas/CanvasInner.svelte:365 fn closeMenu() L3
local src/lib/features/canvas/CanvasInner.svelte:370 fn addNodeAtMenuPosition(canvasNode: CanvasNode) L5
local src/lib/features/canvas/CanvasInner.svelte:377 fn handleDuplicateNode(nodeId: string) L7
local src/lib/features/canvas/CanvasInner.svelte:386 fn handleDeleteNode(nodeId: string) L25
local src/lib/features/canvas/CanvasInner.svelte:413 fn handleDeleteEdge(edgeId: string) L5
local src/lib/features/canvas/CanvasInner.svelte:420 fn goToNode(nodeId: string) L4
local src/lib/features/canvas/CanvasInner.svelte:426 fn handleSetNodeColor(nodeId: string, color: CanvasColor | undefined) L6
local src/lib/features/canvas/CanvasInner.svelte:434 fn handleSetEdgeColor(edgeId: string, color: CanvasColor | undefined) L15
local src/lib/features/canvas/CanvasInner.svelte:451 fn getTargetColor(): CanvasColor | undefined L12
local src/lib/features/canvas/CanvasInner.svelte:465 fn getMenuCanvasPosition(): { x: number; y: number } L7
local src/lib/features/canvas/CanvasInner.svelte:474 fn getViewportCenter(): { x: number; y: number } L6
local src/lib/features/canvas/CanvasInner.svelte:482 fn addTextCard() L7
local src/lib/features/canvas/CanvasInner.svelte:496 fn handleFileSelected(filePath: string) L7
local src/lib/features/canvas/CanvasInner.svelte:505 fn handleImageSelected(filePath: string) L7
local src/lib/features/canvas/CanvasInner.svelte:514 fn handleLinkSubmitted(url: string, label?: string) L7
local src/lib/features/canvas/CanvasInner.svelte:523 fn handleConnectEnd: OnConnectEnd L23
local src/lib/features/canvas/CanvasInner.svelte:548 fn addGroup() L7
local src/lib/features/canvas/CanvasInner.svelte:560 fn handleDragOver(e: DragEvent) L7
local src/lib/features/canvas/CanvasInner.svelte:568 fn handleDragLeave() L3
local src/lib/features/canvas/CanvasInner.svelte:573 fn handleDrop(e: DragEvent) L26
## mounts
mount src/lib/features/canvas/CanvasInner.svelte:635 CanvasContextMenu -> src/lib/features/canvas/CanvasContextMenu.svelte
mount src/lib/features/canvas/CanvasInner.svelte:689 CanvasToolbar -> src/lib/features/canvas/CanvasToolbar.svelte
mount src/lib/features/canvas/CanvasInner.svelte:698 CanvasFilePicker -> src/lib/features/canvas/CanvasFilePicker.svelte
mount src/lib/features/canvas/CanvasInner.svelte:703 CanvasLinkInput -> src/lib/features/canvas/CanvasLinkInput.svelte
mount src/lib/features/canvas/CanvasInner.svelte:708 CanvasFilePicker -> src/lib/features/canvas/CanvasFilePicker.svelte
## mounted-at
mount src/lib/features/canvas/CanvasView.svelte:18 CanvasInner -> src/lib/features/canvas/CanvasInner.svelte
## calls
call src/lib/features/canvas/CanvasInner.svelte:103 in $effect@99 -> src/lib/features/canvas/canvas.logic.ts:parseCanvas call
call src/lib/features/canvas/CanvasInner.svelte:104 in $effect@99 -> src/lib/features/canvas/canvas.logic.ts:canvasToFlow call
call src/lib/features/canvas/CanvasInner.svelte:110 in $effect@99 -> src/lib/features/canvas/canvas-history.logic.ts:pushSnapshot call
call src/lib/features/canvas/CanvasInner.svelte:117 in history -> src/lib/features/canvas/canvas-history.logic.ts:createHistory call
call src/lib/features/canvas/CanvasInner.svelte:121 in persistWithoutHistory -> src/lib/features/canvas/canvas.logic.ts:flowToCanvas call
call src/lib/features/canvas/CanvasInner.svelte:122 in persistWithoutHistory -> src/lib/features/canvas/canvas.logic.ts:serializeCanvas call
call src/lib/features/canvas/CanvasInner.svelte:130 in persistChanges -> src/lib/features/canvas/canvas-history.logic.ts:pushSnapshot call
call src/lib/features/canvas/CanvasInner.svelte:131 in persistChanges -> src/lib/features/canvas/CanvasInner.svelte:persistWithoutHistory call
call src/lib/features/canvas/CanvasInner.svelte:174 in handleNodeDragStop -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:180 in handleConnect -> src/lib/features/canvas/canvas.logic.ts:generateId call
call src/lib/features/canvas/CanvasInner.svelte:189 in handleConnect -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:194 in handleReconnect -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:222 in handleDelete -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:239 in $effect@229 -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:248 in (script) -> src/lib/core/editor/editor.service.ts:registerPendingEditFlusher call
call src/lib/features/canvas/CanvasInner.svelte:250 in (script) -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call +1
call src/lib/features/canvas/CanvasInner.svelte:295 in handleKeydown -> src/lib/features/canvas/canvas-history.logic.ts:undo call
call src/lib/features/canvas/CanvasInner.svelte:301 in handleKeydown -> src/lib/features/canvas/CanvasInner.svelte:persistWithoutHistory call +1
call src/lib/features/canvas/CanvasInner.svelte:309 in handleKeydown -> src/lib/features/canvas/canvas-history.logic.ts:redo call
call src/lib/features/canvas/CanvasInner.svelte:352 in handlePaneContextMenu -> src/lib/features/canvas/CanvasInner.svelte:menuPosition call
call src/lib/features/canvas/CanvasInner.svelte:357 in handleNodeContextMenu -> src/lib/features/canvas/CanvasInner.svelte:menuPosition call
call src/lib/features/canvas/CanvasInner.svelte:362 in handleEdgeContextMenu -> src/lib/features/canvas/CanvasInner.svelte:menuPosition call
call src/lib/features/canvas/CanvasInner.svelte:371 in addNodeAtMenuPosition -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/CanvasInner.svelte:373 in addNodeAtMenuPosition -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:381 in handleDuplicateNode -> src/lib/features/canvas/canvas.logic.ts:duplicateNode call
call src/lib/features/canvas/CanvasInner.svelte:382 in handleDuplicateNode -> src/lib/features/canvas/CanvasInner.svelte:addNodeAtMenuPosition call
call src/lib/features/canvas/CanvasInner.svelte:409 in handleDeleteNode -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:416 in handleDeleteEdge -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:435 in handleSetEdgeColor -> src/lib/features/canvas/canvas.logic.ts:resolveColor call
call src/lib/features/canvas/CanvasInner.svelte:447 in handleSetEdgeColor -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:483 in addTextCard -> src/lib/features/canvas/CanvasInner.svelte:getViewportCenter call
call src/lib/features/canvas/CanvasInner.svelte:484 in addTextCard -> src/lib/features/canvas/canvas.logic.ts:createTextNode call
call src/lib/features/canvas/CanvasInner.svelte:485 in addTextCard -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/CanvasInner.svelte:487 in addTextCard -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:497 in handleFileSelected -> src/lib/features/canvas/CanvasInner.svelte:getViewportCenter call
call src/lib/features/canvas/CanvasInner.svelte:498 in handleFileSelected -> src/lib/features/canvas/canvas.logic.ts:createFileNode call
call src/lib/features/canvas/CanvasInner.svelte:499 in handleFileSelected -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/CanvasInner.svelte:501 in handleFileSelected -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:506 in handleImageSelected -> src/lib/features/canvas/CanvasInner.svelte:getViewportCenter call
call src/lib/features/canvas/CanvasInner.svelte:507 in handleImageSelected -> src/lib/features/canvas/canvas.logic.ts:createImageNode call
call src/lib/features/canvas/CanvasInner.svelte:507 in handleImageSelected -> src/lib/features/canvas/canvas.logic.ts:toVaultRelativePath call
call src/lib/features/canvas/CanvasInner.svelte:508 in handleImageSelected -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/CanvasInner.svelte:510 in handleImageSelected -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:515 in handleLinkSubmitted -> src/lib/features/canvas/CanvasInner.svelte:getViewportCenter call
call src/lib/features/canvas/CanvasInner.svelte:516 in handleLinkSubmitted -> src/lib/features/canvas/canvas.logic.ts:createLinkNode call
call src/lib/features/canvas/CanvasInner.svelte:517 in handleLinkSubmitted -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/CanvasInner.svelte:519 in handleLinkSubmitted -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:532 in handleConnectEnd -> src/lib/features/canvas/canvas.logic.ts:createTextNode call
call src/lib/features/canvas/CanvasInner.svelte:533 in handleConnectEnd -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/CanvasInner.svelte:535 in handleConnectEnd -> src/lib/features/canvas/canvas.logic.ts:generateId call
call src/lib/features/canvas/CanvasInner.svelte:544 in handleConnectEnd -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:549 in addGroup -> src/lib/features/canvas/CanvasInner.svelte:getViewportCenter call
call src/lib/features/canvas/CanvasInner.svelte:550 in addGroup -> src/lib/features/canvas/canvas.logic.ts:createGroupNode call
call src/lib/features/canvas/CanvasInner.svelte:551 in addGroup -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/CanvasInner.svelte:553 in addGroup -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:580 in handleDrop -> src/lib/core/editor/editor.service.ts:openFileInEditor call
call src/lib/features/canvas/CanvasInner.svelte:587 in handleDrop -> src/lib/features/canvas/canvas-image.service.ts:isImageFile call
call src/lib/features/canvas/CanvasInner.svelte:588 in handleDrop -> src/lib/features/canvas/canvas.logic.ts:createImageNode call
call src/lib/features/canvas/CanvasInner.svelte:588 in handleDrop -> src/lib/features/canvas/canvas.logic.ts:toVaultRelativePath call
call src/lib/features/canvas/CanvasInner.svelte:590 in handleDrop -> src/lib/features/canvas/canvas.logic.ts:createFileNode call
call src/lib/features/canvas/CanvasInner.svelte:595 in handleDrop -> src/lib/features/canvas/canvas.logic.ts:canvasNodeToFlowNode call
call src/lib/features/canvas/CanvasInner.svelte:597 in handleDrop -> src/lib/features/canvas/CanvasInner.svelte:persistChanges call
call src/lib/features/canvas/CanvasInner.svelte:602 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleDragLeave markup
call src/lib/features/canvas/CanvasInner.svelte:602 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleDragOver markup
call src/lib/features/canvas/CanvasInner.svelte:602 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleDrop markup
call src/lib/features/canvas/CanvasInner.svelte:602 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleKeydown markup
call src/lib/features/canvas/CanvasInner.svelte:605 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:addTextCard markup +1
call src/lib/features/canvas/CanvasInner.svelte:617 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleNodeDragStop markup
call src/lib/features/canvas/CanvasInner.svelte:618 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleConnect markup
call src/lib/features/canvas/CanvasInner.svelte:619 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleConnectEnd markup
call src/lib/features/canvas/CanvasInner.svelte:620 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleReconnect markup
call src/lib/features/canvas/CanvasInner.svelte:621 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleDelete markup
call src/lib/features/canvas/CanvasInner.svelte:622 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handlePaneContextMenu markup
call src/lib/features/canvas/CanvasInner.svelte:623 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleNodeContextMenu markup
call src/lib/features/canvas/CanvasInner.svelte:624 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleEdgeContextMenu markup
call src/lib/features/canvas/CanvasInner.svelte:625 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:closeMenu markup +2
call src/lib/features/canvas/CanvasInner.svelte:645 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:getMenuCanvasPosition markup +1
call src/lib/features/canvas/CanvasInner.svelte:646 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:addNodeAtMenuPosition markup +1
call src/lib/features/canvas/CanvasInner.svelte:646 in (markup) -> src/lib/features/canvas/canvas.logic.ts:createTextNode markup
call src/lib/features/canvas/CanvasInner.svelte:653 in (markup) -> src/lib/features/canvas/canvas.logic.ts:createGroupNode markup
call src/lib/features/canvas/CanvasInner.svelte:664 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleDuplicateNode markup
call src/lib/features/canvas/CanvasInner.svelte:667 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleDeleteNode markup
call src/lib/features/canvas/CanvasInner.svelte:668 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleDeleteEdge markup
call src/lib/features/canvas/CanvasInner.svelte:673 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:goToNode markup +1
call src/lib/features/canvas/CanvasInner.svelte:680 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:getTargetColor markup
call src/lib/features/canvas/CanvasInner.svelte:683 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleSetNodeColor markup
call src/lib/features/canvas/CanvasInner.svelte:684 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleSetEdgeColor markup
call src/lib/features/canvas/CanvasInner.svelte:694 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:addGroup markup
call src/lib/features/canvas/CanvasInner.svelte:700 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleFileSelected markup
call src/lib/features/canvas/CanvasInner.svelte:705 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleLinkSubmitted markup
call src/lib/features/canvas/CanvasInner.svelte:710 in (markup) -> src/lib/features/canvas/CanvasInner.svelte:handleImageSelected markup
## effects
fx src/lib/features/canvas/CanvasInner.svelte:99 svelte.$effect in (script)
fx src/lib/features/canvas/CanvasInner.svelte:112 timer.queueMicrotask in $effect@99
fx src/lib/features/canvas/CanvasInner.svelte:229 svelte.$effect in (script)
fx src/lib/features/canvas/CanvasInner.svelte:238 timer.setTimeout delay=300 in $effect@229
reg src/lib/features/canvas/CanvasInner.svelte:248 src/lib/core/editor/editor.service.ts:registerPendingEditFlusher in (script) args=ownPath, () => { if (!pendingPersist) return; persistChanges(nodes, edges); cle…
fx src/lib/features/canvas/CanvasInner.svelte:302 timer.queueMicrotask in handleKeydown
fx src/lib/features/canvas/CanvasInner.svelte:316 timer.queueMicrotask in handleKeydown
