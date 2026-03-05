<script lang="ts">
	import {
		SvelteFlow,
		Background,
		Controls,
		MiniMap,
		useSvelteFlow,
		type Node,
		type Edge,
		type OnConnectEnd,
		type Connection,
	} from '@xyflow/svelte';
	import { MarkerType } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import './canvas-markdown.css';
	import TextNode from './TextNode.svelte';
	import FileNode from './FileNode.svelte';
	import LinkNode from './LinkNode.svelte';
	import GroupNode from './GroupNode.svelte';
	import ImageNode from './ImageNode.svelte';
	import CanvasEdge from './CanvasEdge.svelte';
	import CanvasContextMenu from './CanvasContextMenu.svelte';
	import CanvasToolbar from './CanvasToolbar.svelte';
	import CanvasFilePicker from './CanvasFilePicker.svelte';
	import CanvasLinkInput from './CanvasLinkInput.svelte';
	import {
		parseCanvas,
		serializeCanvas,
		canvasToFlow,
		flowToCanvas,
		createTextNode,
		createFileNode,
		createLinkNode,
		createGroupNode,
		createImageNode,
		canvasNodeToFlowNode,
		duplicateNode,
		resolveColor,
		generateId,
	} from './canvas.logic';
	import { isImageFile } from './canvas-image.logic';
	import { createHistory, pushSnapshot, undo, redo, type CanvasHistory } from './canvas-history.logic';
	import { openFileInEditor } from '$lib/core/editor/editor.service';
	import type { CanvasData, CanvasNode, CanvasColor } from './canvas.types';

	interface Props {
		/** Raw JSON content of the .canvas file */
		jsonContent: string;
		/** Callback to persist changes */
		onJsonChange: (json: string) => void;
	}

	let { jsonContent, onJsonChange }: Props = $props();

	const { fitView, screenToFlowPosition, updateNodeData, getIntersectingNodes } = useSvelteFlow();

	const nodeTypes = {
		text: TextNode,
		file: FileNode,
		link: LinkNode,
		group: GroupNode,
		image: ImageNode,
	};

	const edgeTypes = {
		smoothstep: CanvasEdge,
	};

	/** The parsed canvas data (source of truth from disk) */
	let canvasData = $derived(parseCanvas(jsonContent));

	/** Svelte Flow nodes/edges — initialized from canvas data */
	let flowState = $derived(canvasToFlow(canvasData));
	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	/** Track the last parsed JSON to avoid re-syncing on our own writes */
	let lastSyncedJson = '';

	/** Flag to suppress persist when nodes change due to an external content sync */
	let syncing = false;

	/** Sync from external content changes (e.g. tab switch, source mode edit) */
	$effect(() => {
		const json = jsonContent;
		if (json !== lastSyncedJson) {
			syncing = true;
			const state = canvasToFlow(parseCanvas(json));
			nodes = state.nodes;
			edges = state.edges;
			lastSyncedJson = json;
			// Push initial state to history so first undo has a baseline
			history = pushSnapshot(history, { nodes: state.nodes, edges: state.edges });
			// Reset after current microtask so the debounce effect sees syncing=true
			queueMicrotask(() => { syncing = false; });
		}
	});

	/** Undo/redo history */
	let history = $state<CanvasHistory>(createHistory());

	/** Persist flow state without recording history (used by undo/redo) */
	function persistWithoutHistory(updatedNodes: Node[], updatedEdges: Edge[]) {
		const restored = flowToCanvas(updatedNodes, updatedEdges, canvasData);
		const json = serializeCanvas(restored);
		lastSyncedJson = json;
		onJsonChange(json);
	}

	/** Persist flow state changes back to the .canvas file and push to history */
	function persistChanges(updatedNodes: Node[], updatedEdges: Edge[]) {
		history = pushSnapshot(history, { nodes: updatedNodes, edges: updatedEdges });
		persistWithoutHistory(updatedNodes, updatedEdges);
	}

	/** Handle node position changes (drag end) — includes group reparenting */
	function handleNodeDragStop({ targetNode }: { targetNode: Node | null }) {
		if (targetNode && targetNode.type !== 'group') {
			const intersections = getIntersectingNodes(targetNode);
			const targetGroup = intersections.find(
				(n) => n.type === 'group' && n.id !== targetNode.id,
			);

			if (targetGroup && targetNode.parentId !== targetGroup.id) {
				// Reparent: make child of group
				nodes = nodes.map((n) => {
					if (n.id !== targetNode.id) return n;
					return {
						...n,
						parentId: targetGroup.id,
						extent: 'parent' as const,
						expandParent: true,
						position: {
							x: n.position.x - targetGroup.position.x,
							y: n.position.y - targetGroup.position.y,
						},
					};
				});
			} else if (!targetGroup && targetNode.parentId) {
				// Un-parent: release from group
				const parent = nodes.find((n) => n.id === targetNode.parentId);
				nodes = nodes.map((n) => {
					if (n.id !== targetNode.id) return n;
					return {
						...n,
						parentId: undefined,
						extent: undefined,
						expandParent: undefined,
						position: parent
							? { x: n.position.x + parent.position.x, y: n.position.y + parent.position.y }
							: n.position,
					};
				});
			}
		}
		persistChanges(nodes, edges);
	}

	/** Handle new edge connections */
	function handleConnect(connection: Connection) {
		const newEdge: Edge = {
			id: generateId(),
			source: connection.source,
			target: connection.target,
			sourceHandle: connection.sourceHandle,
			targetHandle: connection.targetHandle,
			type: 'smoothstep',
			markerEnd: { type: MarkerType.ArrowClosed },
		};
		edges = [...edges, newEdge];
		persistChanges(nodes, edges);
	}

	/** Handle edge reconnection — persist the updated edge */
	function handleReconnect() {
		persistChanges(nodes, edges);
	}

	/** Handle node and edge deletion — releases children when a group is deleted */
	function handleDelete({ nodes: deletedNodes, edges: deletedEdges }: { nodes: Node[]; edges: Edge[] }) {
		const nodeIds = new Set(deletedNodes.map((n) => n.id));
		const edgeIds = new Set(deletedEdges.map((e) => e.id));
		const deletedGroupIds = new Set(
			deletedNodes.filter((n) => n.type === 'group').map((n) => n.id),
		);
		// Release children of deleted groups to root level (convert to absolute position)
		if (deletedGroupIds.size > 0) {
			nodes = nodes.map((n) => {
				if (!n.parentId || !deletedGroupIds.has(n.parentId)) return n;
				const parent = nodes.find((p) => p.id === n.parentId);
				return {
					...n,
					parentId: undefined,
					extent: undefined,
					expandParent: undefined,
					position: parent
						? { x: n.position.x + parent.position.x, y: n.position.y + parent.position.y }
						: n.position,
				};
			});
		}
		nodes = nodes.filter((n) => !nodeIds.has(n.id));
		edges = edges.filter((e) => !edgeIds.has(e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target));
		persistChanges(nodes, edges);
	}

	/** Debounce-persist when node data changes (e.g. text editing via updateNodeData) */
	let nodesChangeTimer: ReturnType<typeof setTimeout>;
	let skipInitialWatch = true;
	$effect(() => {
		const _n = nodes;
		if (skipInitialWatch) {
			skipInitialWatch = false;
			return;
		}
		if (syncing) return;
		clearTimeout(nodesChangeTimer);
		nodesChangeTimer = setTimeout(() => persistChanges(nodes, edges), 300);
		return () => clearTimeout(nodesChangeTimer);
	});

	/** Handle keyboard shortcuts on the canvas */
	function handleKeydown(e: KeyboardEvent) {
		const mod = e.metaKey || e.ctrlKey;

		if (e.key === 'Escape') {
			nodes = nodes.map((n) => (n.selected ? { ...n, selected: false } : n));
			edges = edges.map((ed) => (ed.selected ? { ...ed, selected: false } : ed));
		}

		if (mod && e.key === 'a') {
			e.preventDefault();
			nodes = nodes.map((n) => (n.selected ? n : { ...n, selected: true }));
		}

		// Shift+1 → Zoom to fit all
		if (e.key === '!' || (e.shiftKey && e.code === 'Digit1')) {
			fitView({ duration: 300 });
		}

		// Shift+2 → Zoom to selection
		if (e.key === '@' || (e.shiftKey && e.code === 'Digit2')) {
			const selected = nodes.filter((n) => n.selected);
			if (selected.length > 0) fitView({ nodes: selected, duration: 300 });
		}

		// Cmd+Z → Undo
		if (mod && e.key === 'z' && !e.shiftKey) {
			e.preventDefault();
			const result = undo(history);
			if (result) {
				syncing = true;
				history = result.history;
				nodes = result.snapshot.nodes;
				edges = result.snapshot.edges;
				persistWithoutHistory(nodes, edges);
				queueMicrotask(() => { syncing = false; });
			}
		}

		// Cmd+Shift+Z → Redo
		if (mod && e.key === 'z' && e.shiftKey) {
			e.preventDefault();
			const result = redo(history);
			if (result) {
				syncing = true;
				history = result.history;
				nodes = result.snapshot.nodes;
				edges = result.snapshot.edges;
				persistWithoutHistory(nodes, edges);
				queueMicrotask(() => { syncing = false; });
			}
		}
	}

	// --- Context menu state ---
	type MenuState = {
		type: 'pane' | 'node' | 'edge';
		top?: number;
		left?: number;
		right?: number;
		bottom?: number;
		targetId?: string;
		nodeType?: string;
	} | null;

	let menu = $state<MenuState>(null);
	let containerEl: HTMLDivElement;
	let containerWidth = $state(0);
	let containerHeight = $state(0);

	/** Compute smart menu position relative to container (flip near edges) */
	function menuPosition(e: MouseEvent) {
		const rect = containerEl.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		return {
			top: y < containerHeight - 200 ? y : undefined,
			left: x < containerWidth - 200 ? x : undefined,
			right: x >= containerWidth - 200 ? containerWidth - x : undefined,
			bottom: y >= containerHeight - 200 ? containerHeight - y : undefined,
		};
	}

	function handlePaneContextMenu({ event }: { event: MouseEvent }) {
		event.preventDefault();
		menu = { type: 'pane', ...menuPosition(event) };
	}

	function handleNodeContextMenu({ event, node }: { event: MouseEvent; node: Node }) {
		event.preventDefault();
		menu = { type: 'node', targetId: node.id, nodeType: node.type, ...menuPosition(event) };
	}

	function handleEdgeContextMenu({ event, edge }: { event: MouseEvent; edge: Edge }) {
		event.preventDefault();
		menu = { type: 'edge', targetId: edge.id, ...menuPosition(event) };
	}

	function closeMenu() {
		menu = null;
	}

	/** Add a node at the position where the context menu was opened */
	function addNodeAtMenuPosition(canvasNode: CanvasNode) {
		const flowNode = canvasNodeToFlowNode(canvasNode);
		nodes = [...nodes, flowNode];
		persistChanges(nodes, edges);
	}

	/** Duplicate a node by its ID */
	function handleDuplicateNode(nodeId: string) {
		const node = nodes.find((n) => n.id === nodeId);
		if (!node) return;
		const canvasNode = node.data as unknown as CanvasNode;
		const cloned = duplicateNode(canvasNode);
		addNodeAtMenuPosition(cloned);
	}

	/** Delete a node by its ID — releases children if it's a group */
	function handleDeleteNode(nodeId: string) {
		const target = nodes.find((n) => n.id === nodeId);
		// Release children of deleted group to root (compute before filtering)
		let updatedNodes = nodes;
		if (target?.type === 'group') {
			updatedNodes = nodes.map((n) => {
				if (n.parentId !== nodeId) return n;
				return {
					...n,
					parentId: undefined,
					extent: undefined,
					expandParent: undefined,
					position: {
						x: n.position.x + target.position.x,
						y: n.position.y + target.position.y,
					},
				};
			});
		}
		const newNodes = updatedNodes.filter((n) => n.id !== nodeId);
		const newEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
		nodes = newNodes;
		edges = newEdges;
		persistChanges(newNodes, newEdges);
	}

	/** Delete an edge by its ID */
	function handleDeleteEdge(edgeId: string) {
		const newEdges = edges.filter((e) => e.id !== edgeId);
		edges = newEdges;
		persistChanges(nodes, newEdges);
	}

	/** Navigate viewport to center on a node */
	function goToNode(nodeId: string) {
		const node = nodes.find((n) => n.id === nodeId);
		if (node) fitView({ nodes: [node], duration: 300 });
	}

	/** Update the color of a node */
	function handleSetNodeColor(nodeId: string, color: CanvasColor | undefined) {
		const node = nodes.find((n) => n.id === nodeId);
		if (!node) return;
		updateNodeData(nodeId, { ...node.data, color });
		// Persist handled by debounced $effect when nodes state updates
	}

	/** Update the color of an edge */
	function handleSetEdgeColor(edgeId: string, color: CanvasColor | undefined) {
		const resolved = color ? resolveColor(color) : undefined;
		edges = edges.map((e) => {
			if (e.id !== edgeId) return e;
			return {
				...e,
				style: resolved ? `stroke: ${resolved};` : undefined,
				markerEnd: resolved
					? { type: MarkerType.ArrowClosed, color: resolved }
					: { type: MarkerType.ArrowClosed },
				data: { ...e.data, color },
			};
		});
		persistChanges(nodes, edges);
	}

	/** Get the current color of the context menu target */
	function getTargetColor(): CanvasColor | undefined {
		if (!menu?.targetId) return undefined;
		if (menu.type === 'node') {
			const node = nodes.find((n) => n.id === menu!.targetId);
			return node?.data?.color as CanvasColor | undefined;
		}
		if (menu.type === 'edge') {
			const edge = edges.find((e) => e.id === menu!.targetId);
			return edge?.data?.color as CanvasColor | undefined;
		}
		return undefined;
	}

	/** Get the canvas position where menu was opened */
	function getMenuCanvasPosition(): { x: number; y: number } {
		if (!menu) return { x: 0, y: 0 };
		const rect = containerEl.getBoundingClientRect();
		const clientX = (menu.left ?? (containerWidth - (menu.right ?? 0))) + rect.left;
		const clientY = (menu.top ?? (containerHeight - (menu.bottom ?? 0))) + rect.top;
		return screenToFlowPosition({ x: clientX, y: clientY });
	}

	/** Get the center of the current viewport in flow coordinates */
	function getViewportCenter(): { x: number; y: number } {
		return screenToFlowPosition({
			x: containerWidth / 2,
			y: containerHeight / 2,
		});
	}

	/** Add a new text card at the center of the viewport */
	function addTextCard() {
		const center = getViewportCenter();
		const newNode = createTextNode(center.x - 125, center.y - 30, '');
		const flowNode = canvasNodeToFlowNode(newNode);
		nodes = [...nodes, flowNode];
		persistChanges(nodes, edges);
	}

	// --- Toolbar dialogs ---
	let showFilePicker = $state(false);
	let showImagePicker = $state(false);
	let showLinkInput = $state(false);

	/** Create a file node for the selected file */
	function handleFileSelected(filePath: string) {
		const center = getViewportCenter();
		const newNode = createFileNode(center.x - 125, center.y - 30, filePath);
		const flowNode = canvasNodeToFlowNode(newNode);
		nodes = [...nodes, flowNode];
		persistChanges(nodes, edges);
	}

	/** Create an image node for the selected image file */
	function handleImageSelected(filePath: string) {
		const center = getViewportCenter();
		const newNode = createImageNode(center.x - 150, center.y - 100, filePath);
		const flowNode = canvasNodeToFlowNode(newNode);
		nodes = [...nodes, flowNode];
		persistChanges(nodes, edges);
	}

	/** Create a link node for the submitted URL */
	function handleLinkSubmitted(url: string, label?: string) {
		const center = getViewportCenter();
		const newNode = createLinkNode(center.x - 125, center.y - 30, url, label);
		const flowNode = canvasNodeToFlowNode(newNode);
		nodes = [...nodes, flowNode];
		persistChanges(nodes, edges);
	}

	/** Handle edge drop on empty canvas — create a new text node and connect it */
	const handleConnectEnd: OnConnectEnd = (event, connectionState) => {
		if (!connectionState || connectionState.isValid) return;
		const sourceId = connectionState.fromNode?.id;
		if (!sourceId) return;

		const { clientX, clientY } =
			'changedTouches' in event ? event.changedTouches[0] : event;
		const flowPos = screenToFlowPosition({ x: clientX, y: clientY });

		const newNode = createTextNode(flowPos.x - 125, flowPos.y - 30, '');
		const flowNode = canvasNodeToFlowNode(newNode);
		const newEdge: Edge = {
			id: generateId(),
			source: sourceId,
			target: newNode.id,
			type: 'smoothstep',
			markerEnd: { type: MarkerType.ArrowClosed },
		};

		nodes = [...nodes, flowNode];
		edges = [...edges, newEdge];
		persistChanges(nodes, edges);
	};

	/** Create a group at the viewport center */
	function addGroup() {
		const center = getViewportCenter();
		const newNode = createGroupNode(center.x - 150, center.y - 75, '');
		const flowNode = canvasNodeToFlowNode(newNode);
		nodes = [...nodes, flowNode];
		persistChanges(nodes, edges);
	}

	// --- Drag-and-drop from file explorer ---
	let isDragOver = $state(false);

	/** Accept drops of text/plain (file paths from FileTreeItem) */
	function handleDragOver(e: DragEvent) {
		if (e.dataTransfer?.types.includes('text/plain')) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
			isDragOver = true;
		}
	}

	function handleDragLeave() {
		isDragOver = false;
	}

	/** Handle file drops — .md creates file node, images create image node, .canvas opens as tab */
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragOver = false;
		const filePath = e.dataTransfer?.getData('text/plain');
		if (!filePath) return;

		if (filePath.endsWith('.canvas')) {
			openFileInEditor(filePath);
			return;
		}

		const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
		let newNode: CanvasNode;

		if (isImageFile(filePath)) {
			newNode = createImageNode(flowPos.x - 150, flowPos.y - 100, filePath);
		} else if (filePath.endsWith('.md')) {
			newNode = createFileNode(flowPos.x - 125, flowPos.y - 30, filePath);
		} else {
			return;
		}

		const flowNode = canvasNodeToFlowNode(newNode);
		nodes = [...nodes, flowNode];
		persistChanges(nodes, edges);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="canvas-container" class:drag-over={isDragOver} bind:this={containerEl} onkeydown={handleKeydown} ondragover={handleDragOver} ondragleave={handleDragLeave} ondrop={handleDrop} bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
	{#if nodes.length === 0 && edges.length === 0}
		<div class="empty-hint">
			<button class="add-card-btn" onclick={addTextCard}>
				+ Add card
			</button>
		</div>
	{/if}
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		{edgeTypes}
		fitView
		fitViewOptions={{ maxZoom: 1 }}
		onnodedragstop={handleNodeDragStop}
		onconnect={handleConnect}
		onconnectend={handleConnectEnd}
		onreconnect={handleReconnect}
		ondelete={handleDelete}
		onpanecontextmenu={handlePaneContextMenu}
		onnodecontextmenu={handleNodeContextMenu}
		onedgecontextmenu={handleEdgeContextMenu}
		onpaneclick={closeMenu}
		onpointerdown={closeMenu}
		deleteKey={['Backspace', 'Delete']}
		snapGrid={[20, 20]}
		defaultEdgeOptions={{ type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }}
	>
		<Background />
		<Controls position="bottom-left" />
		<MiniMap />
		{#if menu}
			<CanvasContextMenu
				type={menu.type}
				targetId={menu.targetId}
				nodeType={menu.nodeType}
				top={menu.top}
				left={menu.left}
				right={menu.right}
				bottom={menu.bottom}
				onclose={closeMenu}
				onaddtext={() => {
					const pos = getMenuCanvasPosition();
					addNodeAtMenuPosition(createTextNode(pos.x, pos.y, ''));
				}}
				onaddfile={() => (showFilePicker = true)}
				onaddlink={() => (showLinkInput = true)}
				onaddimage={() => (showImagePicker = true)}
				onaddgroup={() => {
					const pos = getMenuCanvasPosition();
					addNodeAtMenuPosition(createGroupNode(pos.x, pos.y, ''));
				}}
				onselectall={() => {
					nodes = nodes.map((n) => ({ ...n, selected: true }));
				}}
				onzoomtofit={() => fitView({ duration: 300 })}
				onedit={() => {
					if (menu?.targetId && (menu.nodeType === 'text' || menu.nodeType === 'link')) {
						updateNodeData(menu.targetId, { editing: true });
					}
				}}
				onduplicate={() => menu?.targetId && handleDuplicateNode(menu.targetId)}
				ondelete={() => {
					if (!menu?.targetId) return;
					if (menu.type === 'node') handleDeleteNode(menu.targetId);
					if (menu.type === 'edge') handleDeleteEdge(menu.targetId);
				}}
				ongotosource={() => {
					if (!menu?.targetId) return;
					const edge = edges.find((e) => e.id === menu!.targetId);
					if (edge) goToNode(edge.source);
				}}
				ongototarget={() => {
					if (!menu?.targetId) return;
					const edge = edges.find((e) => e.id === menu!.targetId);
					if (edge) goToNode(edge.target);
				}}
				currentColor={getTargetColor()}
				onsetcolor={(color) => {
					if (!menu?.targetId) return;
					if (menu.type === 'node') handleSetNodeColor(menu.targetId, color);
					if (menu.type === 'edge') handleSetEdgeColor(menu.targetId, color);
				}}
			/>
		{/if}
		<svelte:fragment>
			<CanvasToolbar
				oncreatetext={addTextCard}
				oncreatefile={() => (showFilePicker = true)}
				oncreatelink={() => (showLinkInput = true)}
				oncreateimage={() => (showImagePicker = true)}
				oncreategroup={addGroup}
			/>
		</svelte:fragment>
	</SvelteFlow>
	<CanvasFilePicker
		open={showFilePicker}
		onSelect={handleFileSelected}
		onClose={() => (showFilePicker = false)}
	/>
	<CanvasLinkInput
		open={showLinkInput}
		onSubmit={handleLinkSubmitted}
		onClose={() => (showLinkInput = false)}
	/>
	<CanvasFilePicker
		open={showImagePicker}
		onSelect={handleImageSelected}
		onClose={() => (showImagePicker = false)}
		extensions={['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp']}
	/>
</div>

<style>
	.canvas-container {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.canvas-container.drag-over {
		outline: 2px dashed var(--primary);
		outline-offset: -2px;
	}

	.empty-hint {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
	}

	.add-card-btn {
		padding: 8px 20px;
		border-radius: 8px;
		border: 1px dashed rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.05);
		color: var(--muted-foreground);
		font-size: 14px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.add-card-btn:hover {
		background: rgba(255, 255, 255, 0.1);
		border-color: rgba(255, 255, 255, 0.5);
		color: var(--foreground);
	}

	/* Override Svelte Flow theme for dark mode */
	.canvas-container :global(.svelte-flow) {
		--xy-background-color: var(--card);
		--xy-node-background-color: var(--card);
		--xy-node-border-color: rgba(255, 255, 255, 0.15);
		--xy-node-border-radius: 8px;
		--xy-node-color: var(--foreground);
		--xy-edge-stroke: rgba(255, 255, 255, 0.3);
		--xy-edge-stroke-selected: var(--primary);
		--xy-handle-background-color: var(--primary);
		--xy-handle-border-color: var(--background);
		--xy-minimap-background-color: var(--background);
		--xy-minimap-mask-background-color: rgba(0, 0, 0, 0.6);
		--xy-minimap-node-background-color: var(--muted);
		--xy-controls-button-background-color: var(--background);
		--xy-controls-button-color: var(--foreground);
		--xy-controls-button-border-color: rgba(255, 255, 255, 0.15);
		--xy-background-pattern-color: rgba(255, 255, 255, 0.05);
	}

	.canvas-container :global(.svelte-flow__node) {
		background: transparent !important;
		border: none !important;
		border-radius: 8px;
		padding: 0;
		backface-visibility: hidden;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	/* Make the custom node content fill the entire wrapper */
	.canvas-container :global(.svelte-flow__node > .canvas-node) {
		width: 100%;
		height: 100%;
		box-sizing: border-box;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.canvas-container :global(.svelte-flow__node.selected > .canvas-node) {
		box-shadow: 0 0 0 2px var(--primary), 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	.canvas-container :global(.svelte-flow__resize-control.handle) {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--primary);
		border: 2px solid var(--background);
	}

	.canvas-container :global(.svelte-flow__handle) {
		width: 8px;
		height: 8px;
		opacity: 0;
		transition: opacity 0.15s;
	}

	.canvas-container :global(.svelte-flow__node:hover .svelte-flow__handle) {
		opacity: 1;
	}
</style>
