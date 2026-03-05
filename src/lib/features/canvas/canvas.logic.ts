import type {
	CanvasData,
	CanvasNode,
	CanvasEdge,
	CanvasColor,
	CanvasSide,
	CanvasGroupNode,
	CanvasImageNode,
} from './canvas.types';
import { CANVAS_COLOR_MAP } from './canvas.types';
import type { Node, Edge } from '@xyflow/svelte';
import { Position, MarkerType } from '@xyflow/svelte';

/** Default node dimensions */
const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 60;
const DEFAULT_GROUP_WIDTH = 400;
const DEFAULT_GROUP_HEIGHT = 300;

/** Creates an empty canvas data structure */
export function createEmptyCanvas(): CanvasData {
	return { nodes: [], edges: [] };
}

/** Generates a random 16-character hex ID */
export function generateId(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Parses a JSON string into validated CanvasData.
 * Returns an empty canvas if the input is invalid.
 */
export function parseCanvas(json: string): CanvasData {
	try {
		const parsed = JSON.parse(json);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			return createEmptyCanvas();
		}
		return {
			nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
			edges: Array.isArray(parsed.edges) ? parsed.edges : [],
		};
	} catch {
		return createEmptyCanvas();
	}
}

/** Serializes canvas data to a formatted JSON string */
export function serializeCanvas(data: CanvasData): string {
	return JSON.stringify(data, null, '\t');
}

/** Resolves a canvas color (preset number or hex) to a hex string */
export function resolveColor(color?: CanvasColor): string | undefined {
	if (!color) return undefined;
	return CANVAS_COLOR_MAP[color] ?? color;
}

/** Maps a CanvasSide to a Svelte Flow Position */
function sideToPosition(side: CanvasSide): Position {
	switch (side) {
		case 'top':
			return Position.Top;
		case 'right':
			return Position.Right;
		case 'bottom':
			return Position.Bottom;
		case 'left':
			return Position.Left;
	}
}

/** Maps a Svelte Flow Position to a CanvasSide */
function positionToSide(position: Position): CanvasSide {
	switch (position) {
		case Position.Top:
			return 'top';
		case Position.Right:
			return 'right';
		case Position.Bottom:
			return 'bottom';
		case Position.Left:
			return 'left';
	}
}

/** Checks if a node is geometrically inside a group */
export function isNodeInsideGroup(node: CanvasNode, group: CanvasGroupNode): boolean {
	return (
		node.x >= group.x &&
		node.y >= group.y &&
		node.x + node.width <= group.x + group.width &&
		node.y + node.height <= group.y + group.height
	);
}

/** Computes parentId assignments based on geometric containment (smallest enclosing group wins) */
export function computeGroupContainment(nodes: CanvasNode[]): Map<string, string> {
	const groups = nodes.filter((n): n is CanvasGroupNode => n.type === 'group');
	const parentMap = new Map<string, string>();

	for (const node of nodes) {
		if (node.type === 'group') continue;
		let bestGroup: CanvasGroupNode | null = null;
		for (const group of groups) {
			if (isNodeInsideGroup(node, group)) {
				if (!bestGroup || group.width * group.height < bestGroup.width * bestGroup.height) {
					bestGroup = group;
				}
			}
		}
		if (bestGroup) parentMap.set(node.id, bestGroup.id);
	}

	return parentMap;
}

/** Converts a JSON Canvas node to a Svelte Flow node */
export function canvasNodeToFlowNode(node: CanvasNode, parentId?: string): Node {
	const base: Node = {
		id: node.id,
		type: node.type,
		position: { x: node.x, y: node.y },
		width: node.width,
		height: node.height,
		data: { ...node },
	};

	if (parentId) {
		base.parentId = parentId;
		base.extent = 'parent';
		base.expandParent = true;
	}

	if (node.type === 'group') {
		base.style = buildGroupStyle(node.color);
	}

	return base;
}

/** Builds inline style for group nodes */
function buildGroupStyle(color?: CanvasColor): string {
	const resolved = resolveColor(color);
	if (resolved) {
		return `background: ${resolved}20; border: 1px dashed ${resolved}80; border-radius: 8px;`;
	}
	return 'background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px;';
}

/** Converts a JSON Canvas edge to a Svelte Flow edge */
export function canvasEdgeToFlowEdge(edge: CanvasEdge): Edge {
	const flowEdge: Edge = {
		id: edge.id,
		source: edge.fromNode,
		target: edge.toNode,
		type: 'smoothstep',
	};

	if (edge.fromSide) flowEdge.sourceHandle = `${edge.fromSide}-source`;
	if (edge.toSide) flowEdge.targetHandle = `${edge.toSide}-target`;
	if (edge.label) flowEdge.label = edge.label;

	const color = resolveColor(edge.color);
	if (color) flowEdge.style = `stroke: ${color};`;

	// Default: arrow at target end (Obsidian behavior)
	if (edge.toEnd === 'none') {
		flowEdge.markerEnd = undefined;
	} else {
		flowEdge.markerEnd = color
			? { type: MarkerType.ArrowClosed, color }
			: { type: MarkerType.ArrowClosed };
	}

	// Arrow at source end if specified
	if (edge.fromEnd === 'arrow') {
		flowEdge.markerStart = color
			? { type: MarkerType.ArrowClosed, color, orient: 'auto-start-reverse' }
			: { type: MarkerType.ArrowClosed, orient: 'auto-start-reverse' };
	}

	return flowEdge;
}

/** Converts Svelte Flow nodes back to JSON Canvas nodes, merging editable data fields */
export function flowNodeToCanvasNode(
	flowNode: Node,
	originalNode: CanvasNode,
): CanvasNode {
	const base = {
		...originalNode,
		x: flowNode.position.x,
		y: flowNode.position.y,
		width: flowNode.measured?.width ?? flowNode.width ?? originalNode.width,
		height: flowNode.measured?.height ?? flowNode.height ?? originalNode.height,
	};

	// Merge editable fields from flow node data (updated via updateNodeData)
	const d = flowNode.data;
	if (d) {
		if ('text' in d && d.text !== undefined) (base as any).text = d.text;
		if ('file' in d && d.file !== undefined) (base as any).file = d.file;
		if ('url' in d && d.url !== undefined) (base as any).url = d.url;
		if ('label' in d && d.label !== undefined) (base as any).label = d.label;
		if ('color' in d && d.color !== undefined) (base as any).color = d.color;
	}

	return base;
}

/** Converts Svelte Flow edges back to JSON Canvas edges */
export function flowEdgeToCanvasEdge(
	flowEdge: Edge,
	originalEdge?: CanvasEdge,
): CanvasEdge {
	const edge: CanvasEdge = {
		id: flowEdge.id,
		fromNode: flowEdge.source,
		toNode: flowEdge.target,
	};

	if (flowEdge.sourceHandle) {
		const match = flowEdge.sourceHandle.match(/^(top|right|bottom|left)-/);
		if (match) edge.fromSide = match[1] as CanvasSide;
	}
	if (flowEdge.targetHandle) {
		const match = flowEdge.targetHandle.match(/^(top|right|bottom|left)-/);
		if (match) edge.toSide = match[1] as CanvasSide;
	}
	if (flowEdge.label) edge.label = flowEdge.label as string;

	// Preserve original properties that Svelte Flow doesn't track
	if (originalEdge) {
		if (originalEdge.color) edge.color = originalEdge.color;
		if (originalEdge.fromEnd) edge.fromEnd = originalEdge.fromEnd;
		if (originalEdge.toEnd) edge.toEnd = originalEdge.toEnd;
	}

	// Runtime data overrides (e.g., color changed via context menu)
	if (flowEdge.data && 'color' in flowEdge.data) {
		if (flowEdge.data.color) {
			edge.color = flowEdge.data.color as CanvasColor;
		} else {
			delete edge.color;
		}
	}

	return edge;
}

/** Converts full CanvasData to Svelte Flow format */
export function canvasToFlow(canvas: CanvasData): { nodes: Node[]; edges: Edge[] } {
	const parentMap = computeGroupContainment(canvas.nodes);
	const nodeMap = new Map(canvas.nodes.map((n) => [n.id, n]));

	// Sort: groups first so Svelte Flow sees parents before children
	const sorted = [...canvas.nodes].sort((a, b) => {
		if (a.type === 'group' && b.type !== 'group') return -1;
		if (a.type !== 'group' && b.type === 'group') return 1;
		return 0;
	});

	const flowNodes = sorted.map((node) => {
		const pid = parentMap.get(node.id);
		const flowNode = canvasNodeToFlowNode(node, pid);
		if (pid) {
			// Convert absolute position to relative (to parent)
			const parent = nodeMap.get(pid);
			if (parent) {
				flowNode.position = {
					x: node.x - parent.x,
					y: node.y - parent.y,
				};
			}
		}
		return flowNode;
	});

	return {
		nodes: flowNodes,
		edges: canvas.edges.map(canvasEdgeToFlowEdge),
	};
}

/** Converts Svelte Flow state back to CanvasData */
export function flowToCanvas(
	flowNodes: Node[],
	flowEdges: Edge[],
	originalCanvas: CanvasData,
): CanvasData {
	const originalNodeMap = new Map(originalCanvas.nodes.map((n) => [n.id, n]));
	const originalEdgeMap = new Map(originalCanvas.edges.map((e) => [e.id, e]));
	const flowNodeMap = new Map(flowNodes.map((n) => [n.id, n]));

	return {
		nodes: flowNodes.map((fn) => {
			const original = originalNodeMap.get(fn.id);
			let canvasNode: CanvasNode;
			if (original) {
				canvasNode = flowNodeToCanvasNode(fn, original);
			} else {
				// New node created in the flow — construct explicit CanvasNode
				// using flow node position/dimensions as source of truth
				const d = fn.data as Record<string, unknown>;
				canvasNode = {
					...d,
					id: fn.id,
					type: fn.type,
					x: fn.position.x,
					y: fn.position.y,
					width: fn.measured?.width ?? fn.width ?? (d.width as number) ?? DEFAULT_WIDTH,
					height: fn.measured?.height ?? fn.height ?? (d.height as number) ?? DEFAULT_HEIGHT,
				} as CanvasNode;
			}
			// Convert relative position back to absolute by walking up the parent chain
			if (fn.parentId) {
				let offsetX = 0;
				let offsetY = 0;
				let currentId: string | undefined = fn.parentId;
				const visited = new Set<string>();
				while (currentId && !visited.has(currentId)) {
					visited.add(currentId);
					const parent = flowNodeMap.get(currentId);
					if (!parent) break;
					offsetX += parent.position.x;
					offsetY += parent.position.y;
					currentId = parent.parentId;
				}
				canvasNode = {
					...canvasNode,
					x: fn.position.x + offsetX,
					y: fn.position.y + offsetY,
				};
			}
			return canvasNode;
		}),
		edges: flowEdges.map((fe) => flowEdgeToCanvasEdge(fe, originalEdgeMap.get(fe.id))),
	};
}

// --- CRUD operations (immutable) ---

/** Creates a new text node at the given position */
export function createTextNode(x: number, y: number, text = ''): CanvasNode {
	return { id: generateId(), type: 'text', x, y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, text };
}

/** Creates a new file node referencing a vault file */
export function createFileNode(x: number, y: number, file: string): CanvasNode {
	return { id: generateId(), type: 'file', x, y, width: DEFAULT_WIDTH, height: 300, file };
}

/** Creates a new link node with an external URL */
export function createLinkNode(x: number, y: number, url: string, label?: string): CanvasNode {
	const node: CanvasNode = { id: generateId(), type: 'link', x, y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, url };
	if (label) (node as any).label = label;
	return node;
}

/** Creates a new group node */
export function createGroupNode(x: number, y: number, label = ''): CanvasNode {
	return { id: generateId(), type: 'group', x, y, width: DEFAULT_GROUP_WIDTH, height: DEFAULT_GROUP_HEIGHT, label };
}

/** Creates a new image node referencing a file or URL */
export function createImageNode(x: number, y: number, file: string): CanvasNode {
	return { id: generateId(), type: 'image', x, y, width: 300, height: 200, file };
}

/** Adds a node to the canvas (immutable) */
export function addNode(canvas: CanvasData, node: CanvasNode): CanvasData {
	return { ...canvas, nodes: [...canvas.nodes, node] };
}

/** Removes a node and all its connected edges (immutable) */
export function removeNode(canvas: CanvasData, nodeId: string): CanvasData {
	return {
		nodes: canvas.nodes.filter((n) => n.id !== nodeId),
		edges: canvas.edges.filter((e) => e.fromNode !== nodeId && e.toNode !== nodeId),
	};
}

/** Updates a node's properties (immutable) */
export function updateNode(canvas: CanvasData, nodeId: string, updates: Partial<CanvasNode>): CanvasData {
	return {
		...canvas,
		nodes: canvas.nodes.map((n) => (n.id === nodeId ? ({ ...n, ...updates } as CanvasNode) : n)),
	};
}

/** Creates a new edge between two nodes */
export function createEdge(fromNode: string, toNode: string): CanvasEdge {
	return { id: generateId(), fromNode, toNode };
}

/** Adds an edge to the canvas (immutable) */
export function addEdge(canvas: CanvasData, edge: CanvasEdge): CanvasData {
	return { ...canvas, edges: [...canvas.edges, edge] };
}

/** Removes an edge by ID (immutable) */
export function removeEdge(canvas: CanvasData, edgeId: string): CanvasData {
	return { ...canvas, edges: canvas.edges.filter((e) => e.id !== edgeId) };
}

/** Duplicates a node with a new ID and offset position */
export function duplicateNode(node: CanvasNode, offsetX = 20, offsetY = 20): CanvasNode {
	return { ...node, id: generateId(), x: node.x + offsetX, y: node.y + offsetY };
}
