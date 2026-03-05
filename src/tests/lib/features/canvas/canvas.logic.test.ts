import { describe, it, expect } from 'vitest';
import {
	parseCanvas,
	serializeCanvas,
	createEmptyCanvas,
	generateId,
	resolveColor,
	createTextNode,
	createFileNode,
	createLinkNode,
	createGroupNode,
	createImageNode,
	addNode,
	removeNode,
	updateNode,
	createEdge,
	addEdge,
	removeEdge,
	duplicateNode,
	canvasNodeToFlowNode,
	canvasEdgeToFlowEdge,
	flowEdgeToCanvasEdge,
	flowNodeToCanvasNode,
	canvasToFlow,
	flowToCanvas,
	isNodeInsideGroup,
	computeGroupContainment,
} from '$lib/features/canvas/canvas.logic';
import type { CanvasData, CanvasTextNode, CanvasGroupNode, CanvasImageNode } from '$lib/features/canvas/canvas.types';

describe('createEmptyCanvas', () => {
	it('returns an object with empty nodes and edges arrays', () => {
		const canvas = createEmptyCanvas();
		expect(canvas).toEqual({ nodes: [], edges: [] });
	});
});

describe('generateId', () => {
	it('returns a 16-character hex string', () => {
		const id = generateId();
		expect(id).toMatch(/^[0-9a-f]{16}$/);
	});

	it('generates unique IDs', () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId()));
		expect(ids.size).toBe(100);
	});
});

describe('parseCanvas', () => {
	it('parses valid JSON canvas data', () => {
		const json = JSON.stringify({
			nodes: [{ id: '1', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'hello' }],
			edges: [{ id: 'e1', fromNode: '1', toNode: '2' }],
		});
		const result = parseCanvas(json);
		expect(result.nodes).toHaveLength(1);
		expect(result.edges).toHaveLength(1);
		expect(result.nodes[0].id).toBe('1');
	});

	it('returns empty canvas for invalid JSON', () => {
		expect(parseCanvas('not json')).toEqual({ nodes: [], edges: [] });
	});

	it('returns empty canvas for null', () => {
		expect(parseCanvas('null')).toEqual({ nodes: [], edges: [] });
	});

	it('returns empty canvas for array', () => {
		expect(parseCanvas('[]')).toEqual({ nodes: [], edges: [] });
	});

	it('returns empty arrays when nodes/edges are missing', () => {
		expect(parseCanvas('{}')).toEqual({ nodes: [], edges: [] });
	});

	it('ignores non-array nodes/edges', () => {
		const result = parseCanvas('{"nodes": "invalid", "edges": 42}');
		expect(result).toEqual({ nodes: [], edges: [] });
	});

	it('returns empty canvas for empty string', () => {
		expect(parseCanvas('')).toEqual({ nodes: [], edges: [] });
	});
});

describe('serializeCanvas', () => {
	it('serializes canvas data to formatted JSON', () => {
		const canvas: CanvasData = {
			nodes: [{ id: '1', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'hi' }],
			edges: [],
		};
		const json = serializeCanvas(canvas);
		expect(JSON.parse(json)).toEqual(canvas);
		expect(json).toContain('\t'); // tabbed formatting
	});

	it('round-trips with parseCanvas', () => {
		const original: CanvasData = {
			nodes: [
				{ id: '1', type: 'text', x: 10, y: 20, width: 200, height: 100, text: 'hello' },
				{ id: '2', type: 'file', x: 300, y: 0, width: 250, height: 150, file: 'notes/test.md' },
			],
			edges: [{ id: 'e1', fromNode: '1', toNode: '2', fromSide: 'right', toSide: 'left' }],
		};
		const result = parseCanvas(serializeCanvas(original));
		expect(result).toEqual(original);
	});
});

describe('resolveColor', () => {
	it('returns undefined for undefined input', () => {
		expect(resolveColor(undefined)).toBeUndefined();
	});

	it('maps preset 1 to red hex', () => {
		expect(resolveColor('1')).toBe('#fb464c');
	});

	it('maps preset 6 to purple hex', () => {
		expect(resolveColor('6')).toBe('#a882ff');
	});

	it('passes through hex colors unchanged', () => {
		expect(resolveColor('#FF5500')).toBe('#FF5500');
	});

	it('returns unknown strings as-is', () => {
		expect(resolveColor('red')).toBe('red');
	});
});

describe('createTextNode', () => {
	it('creates a text node with default dimensions', () => {
		const node = createTextNode(100, 200, 'hello');
		expect(node.type).toBe('text');
		expect(node.x).toBe(100);
		expect(node.y).toBe(200);
		expect(node.width).toBe(260);
		expect(node.height).toBe(60);
		expect((node as CanvasTextNode).text).toBe('hello');
		expect(node.id).toMatch(/^[0-9a-f]{16}$/);
	});

	it('defaults to empty text', () => {
		const node = createTextNode(0, 0);
		expect((node as CanvasTextNode).text).toBe('');
	});
});

describe('createFileNode', () => {
	it('creates a file node referencing a vault path', () => {
		const node = createFileNode(50, 50, 'notes/test.md');
		expect(node.type).toBe('file');
		expect((node as any).file).toBe('notes/test.md');
	});
});

describe('createLinkNode', () => {
	it('creates a link node with a URL', () => {
		const node = createLinkNode(0, 0, 'https://example.com');
		expect(node.type).toBe('link');
		expect((node as any).url).toBe('https://example.com');
	});
});

describe('createGroupNode', () => {
	it('creates a group node with larger default dimensions', () => {
		const node = createGroupNode(0, 0, 'My Group');
		expect(node.type).toBe('group');
		expect(node.width).toBe(400);
		expect(node.height).toBe(300);
		expect((node as any).label).toBe('My Group');
	});
});

describe('addNode', () => {
	it('adds a node to the canvas immutably', () => {
		const canvas = createEmptyCanvas();
		const node = createTextNode(0, 0, 'test');
		const updated = addNode(canvas, node);
		expect(updated.nodes).toHaveLength(1);
		expect(canvas.nodes).toHaveLength(0); // original unchanged
	});
});

describe('removeNode', () => {
	it('removes a node by ID', () => {
		const node = createTextNode(0, 0, 'test');
		const canvas: CanvasData = { nodes: [node], edges: [] };
		const updated = removeNode(canvas, node.id);
		expect(updated.nodes).toHaveLength(0);
	});

	it('also removes connected edges', () => {
		const n1 = createTextNode(0, 0, 'a');
		const n2 = createTextNode(100, 0, 'b');
		const n3 = createTextNode(200, 0, 'c');
		const e1 = createEdge(n1.id, n2.id);
		const e2 = createEdge(n2.id, n3.id);
		const e3 = createEdge(n1.id, n3.id);
		const canvas: CanvasData = { nodes: [n1, n2, n3], edges: [e1, e2, e3] };

		const updated = removeNode(canvas, n2.id);
		expect(updated.nodes).toHaveLength(2);
		expect(updated.edges).toHaveLength(1);
		expect(updated.edges[0].id).toBe(e3.id);
	});

	it('does not modify original canvas', () => {
		const node = createTextNode(0, 0, 'test');
		const canvas: CanvasData = { nodes: [node], edges: [] };
		removeNode(canvas, node.id);
		expect(canvas.nodes).toHaveLength(1);
	});
});

describe('updateNode', () => {
	it('updates specific properties of a node', () => {
		const node = createTextNode(0, 0, 'test');
		const canvas: CanvasData = { nodes: [node], edges: [] };
		const updated = updateNode(canvas, node.id, { x: 50, y: 100 });
		expect(updated.nodes[0].x).toBe(50);
		expect(updated.nodes[0].y).toBe(100);
		expect((updated.nodes[0] as CanvasTextNode).text).toBe('test'); // preserved
	});
});

describe('addEdge', () => {
	it('adds an edge immutably', () => {
		const canvas = createEmptyCanvas();
		const edge = createEdge('n1', 'n2');
		const updated = addEdge(canvas, edge);
		expect(updated.edges).toHaveLength(1);
		expect(canvas.edges).toHaveLength(0);
	});
});

describe('removeEdge', () => {
	it('removes an edge by ID', () => {
		const edge = createEdge('n1', 'n2');
		const canvas: CanvasData = { nodes: [], edges: [edge] };
		const updated = removeEdge(canvas, edge.id);
		expect(updated.edges).toHaveLength(0);
	});
});

describe('duplicateNode', () => {
	it('creates a copy with a new ID and offset position', () => {
		const node = createTextNode(100, 200, 'hello');
		const copy = duplicateNode(node);
		expect(copy.id).not.toBe(node.id);
		expect(copy.id).toMatch(/^[0-9a-f]{16}$/);
		expect(copy.x).toBe(120);
		expect(copy.y).toBe(220);
		expect((copy as CanvasTextNode).text).toBe('hello');
	});

	it('preserves node type and data for file nodes', () => {
		const node = createFileNode(50, 50, 'notes/test.md');
		const copy = duplicateNode(node, 30, 30);
		expect(copy.type).toBe('file');
		expect((copy as any).file).toBe('notes/test.md');
		expect(copy.x).toBe(80);
		expect(copy.y).toBe(80);
	});

	it('preserves group label', () => {
		const node = createGroupNode(0, 0, 'My Group');
		const copy = duplicateNode(node);
		expect(copy.type).toBe('group');
		expect((copy as any).label).toBe('My Group');
	});
});

describe('canvasNodeToFlowNode', () => {
	it('converts a text node to Svelte Flow format', () => {
		const node: CanvasTextNode = { id: 'n1', type: 'text', x: 10, y: 20, width: 200, height: 100, text: 'hi' };
		const flow = canvasNodeToFlowNode(node);
		expect(flow.id).toBe('n1');
		expect(flow.type).toBe('text');
		expect(flow.position).toEqual({ x: 10, y: 20 });
		expect(flow.width).toBe(200);
		expect(flow.height).toBe(100);
		expect(flow.data.text).toBe('hi');
	});

	it('adds style for group nodes', () => {
		const node = createGroupNode(0, 0, 'G');
		const flow = canvasNodeToFlowNode(node);
		expect(flow.style).toContain('border');
	});
});

describe('canvasEdgeToFlowEdge', () => {
	it('converts a basic edge', () => {
		const edge = { id: 'e1', fromNode: 'a', toNode: 'b' };
		const flow = canvasEdgeToFlowEdge(edge);
		expect(flow.id).toBe('e1');
		expect(flow.source).toBe('a');
		expect(flow.target).toBe('b');
		expect(flow.type).toBe('smoothstep');
	});

	it('maps edge sides to handle IDs', () => {
		const edge = { id: 'e1', fromNode: 'a', toNode: 'b', fromSide: 'right' as const, toSide: 'left' as const };
		const flow = canvasEdgeToFlowEdge(edge);
		expect(flow.sourceHandle).toBe('right-source');
		expect(flow.targetHandle).toBe('left-target');
	});

	it('applies edge color as style', () => {
		const edge = { id: 'e1', fromNode: 'a', toNode: 'b', color: '1' as const };
		const flow = canvasEdgeToFlowEdge(edge);
		expect(flow.style).toContain('#fb464c');
	});

	it('sets default arrow marker at target end', () => {
		const edge = { id: 'e1', fromNode: 'a', toNode: 'b' };
		const flow = canvasEdgeToFlowEdge(edge);
		expect(flow.markerEnd).toEqual({ type: 'arrowclosed' });
	});

	it('removes marker when toEnd is none', () => {
		const edge = { id: 'e1', fromNode: 'a', toNode: 'b', toEnd: 'none' as const };
		const flow = canvasEdgeToFlowEdge(edge);
		expect(flow.markerEnd).toBeUndefined();
	});

	it('adds start marker when fromEnd is arrow', () => {
		const edge = { id: 'e1', fromNode: 'a', toNode: 'b', fromEnd: 'arrow' as const };
		const flow = canvasEdgeToFlowEdge(edge);
		expect(flow.markerStart).toBeDefined();
		expect((flow.markerStart as any).type).toBe('arrowclosed');
	});

	it('includes color in marker when edge has color', () => {
		const edge = { id: 'e1', fromNode: 'a', toNode: 'b', color: '1' as const };
		const flow = canvasEdgeToFlowEdge(edge);
		expect((flow.markerEnd as any).color).toBe('#fb464c');
	});

	it('passes through label', () => {
		const edge = { id: 'e1', fromNode: 'a', toNode: 'b', label: 'my label' };
		const flow = canvasEdgeToFlowEdge(edge);
		expect(flow.label).toBe('my label');
	});
});

describe('flowEdgeToCanvasEdge', () => {
	it('converts a basic flow edge back to canvas format', () => {
		const flowEdge = { id: 'e1', source: 'a', target: 'b' } as any;
		const result = flowEdgeToCanvasEdge(flowEdge);
		expect(result.id).toBe('e1');
		expect(result.fromNode).toBe('a');
		expect(result.toNode).toBe('b');
	});

	it('preserves color from originalEdge', () => {
		const flowEdge = { id: 'e1', source: 'a', target: 'b' } as any;
		const original = { id: 'e1', fromNode: 'a', toNode: 'b', color: '2' as const };
		const result = flowEdgeToCanvasEdge(flowEdge, original);
		expect(result.color).toBe('2');
	});

	it('uses color from flowEdge.data when set (runtime override)', () => {
		const flowEdge = { id: 'e1', source: 'a', target: 'b', data: { color: '5' } } as any;
		const original = { id: 'e1', fromNode: 'a', toNode: 'b', color: '2' as const };
		const result = flowEdgeToCanvasEdge(flowEdge, original);
		expect(result.color).toBe('5');
	});

	it('uses color from flowEdge.data when no originalEdge exists', () => {
		const flowEdge = { id: 'e1', source: 'a', target: 'b', data: { color: '3' } } as any;
		const result = flowEdgeToCanvasEdge(flowEdge);
		expect(result.color).toBe('3');
	});

	it('clears color when flowEdge.data.color is explicitly undefined', () => {
		const flowEdge = { id: 'e1', source: 'a', target: 'b', data: { color: undefined } } as any;
		const original = { id: 'e1', fromNode: 'a', toNode: 'b', color: '2' as const };
		const result = flowEdgeToCanvasEdge(flowEdge, original);
		expect(result.color).toBeUndefined();
	});

	it('extracts fromSide from sourceHandle', () => {
		const flowEdge = { id: 'e1', source: 'a', target: 'b', sourceHandle: 'right-source' } as any;
		const result = flowEdgeToCanvasEdge(flowEdge);
		expect(result.fromSide).toBe('right');
	});

	it('extracts toSide from targetHandle', () => {
		const flowEdge = { id: 'e1', source: 'a', target: 'b', targetHandle: 'left-target' } as any;
		const result = flowEdgeToCanvasEdge(flowEdge);
		expect(result.toSide).toBe('left');
	});

	it('preserves fromEnd and toEnd from originalEdge', () => {
		const flowEdge = { id: 'e1', source: 'a', target: 'b' } as any;
		const original = { id: 'e1', fromNode: 'a', toNode: 'b', fromEnd: 'arrow' as const, toEnd: 'none' as const };
		const result = flowEdgeToCanvasEdge(flowEdge, original);
		expect(result.fromEnd).toBe('arrow');
		expect(result.toEnd).toBe('none');
	});
});

describe('flowNodeToCanvasNode', () => {
	it('preserves original node properties while updating position', () => {
		const original: CanvasTextNode = { id: 'n1', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'hello' };
		const flowNode = { id: 'n1', type: 'text', position: { x: 50, y: 75 }, data: {}, measured: { width: 210, height: 110 } };
		const result = flowNodeToCanvasNode(flowNode as any, original);
		expect(result.x).toBe(50);
		expect(result.y).toBe(75);
		expect(result.width).toBe(210);
		expect(result.height).toBe(110);
		expect((result as CanvasTextNode).text).toBe('hello');
	});
});

describe('flowNodeToCanvasNode — resized dimensions', () => {
	it('picks up explicit width/height from flow node (post-resize)', () => {
		const original: CanvasTextNode = { id: 'n1', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'hello' };
		const flowNode = { id: 'n1', type: 'text', position: { x: 0, y: 0 }, data: {}, width: 350, height: 250 };
		const result = flowNodeToCanvasNode(flowNode as any, original);
		expect(result.width).toBe(350);
		expect(result.height).toBe(250);
	});

	it('prefers measured over explicit width/height', () => {
		const original: CanvasTextNode = { id: 'n1', type: 'text', x: 0, y: 0, width: 200, height: 100, text: 'hello' };
		const flowNode = { id: 'n1', type: 'text', position: { x: 0, y: 0 }, data: {}, width: 300, height: 200, measured: { width: 400, height: 350 } };
		const result = flowNodeToCanvasNode(flowNode as any, original);
		expect(result.width).toBe(400);
		expect(result.height).toBe(350);
	});

	it('falls back to original dimensions when flow node has no size info', () => {
		const original: CanvasTextNode = { id: 'n1', type: 'text', x: 0, y: 0, width: 260, height: 60, text: 'hello' };
		const flowNode = { id: 'n1', type: 'text', position: { x: 10, y: 20 }, data: {} };
		const result = flowNodeToCanvasNode(flowNode as any, original);
		expect(result.width).toBe(260);
		expect(result.height).toBe(60);
	});
});

describe('canvasToFlow / flowToCanvas round-trip', () => {
	it('preserves data through conversion', () => {
		const original: CanvasData = {
			nodes: [
				{ id: 'n1', type: 'text', x: 10, y: 20, width: 200, height: 100, text: 'hello' },
				{ id: 'n2', type: 'file', x: 300, y: 0, width: 250, height: 150, file: 'test.md' },
			],
			edges: [{ id: 'e1', fromNode: 'n1', toNode: 'n2', color: '3' }],
		};

		const { nodes, edges } = canvasToFlow(original);
		expect(nodes).toHaveLength(2);
		expect(edges).toHaveLength(1);

		const restored = flowToCanvas(nodes, edges, original);
		expect(restored.nodes).toHaveLength(2);
		expect(restored.edges).toHaveLength(1);
		expect((restored.nodes[0] as CanvasTextNode).text).toBe('hello');
		expect(restored.edges[0].color).toBe('3'); // preserved
	});
});

describe('flowToCanvas — new node construction', () => {
	it('uses flow node position/dimensions for new nodes not in original', () => {
		const originalCanvas: CanvasData = { nodes: [], edges: [] };
		const flowNodes = [
			{
				id: 'new1',
				type: 'text',
				position: { x: 100, y: 200 },
				width: 300,
				height: 150,
				data: { id: 'new1', type: 'text', x: 0, y: 0, width: 260, height: 60, text: 'hello' },
			},
		] as any[];

		const result = flowToCanvas(flowNodes, [], originalCanvas);
		const node = result.nodes[0];
		// Position from flow node, not from data
		expect(node.x).toBe(100);
		expect(node.y).toBe(200);
		// Dimensions from flow node width/height (no measured)
		expect(node.width).toBe(300);
		expect(node.height).toBe(150);
		// Text preserved from data
		expect((node as CanvasTextNode).text).toBe('hello');
	});

	it('prefers measured dimensions for new nodes', () => {
		const originalCanvas: CanvasData = { nodes: [], edges: [] };
		const flowNodes = [
			{
				id: 'new1',
				type: 'text',
				position: { x: 50, y: 75 },
				width: 200,
				height: 100,
				measured: { width: 400, height: 250 },
				data: { id: 'new1', type: 'text', x: 0, y: 0, width: 260, height: 60, text: '' },
			},
		] as any[];

		const result = flowToCanvas(flowNodes, [], originalCanvas);
		expect(result.nodes[0].width).toBe(400);
		expect(result.nodes[0].height).toBe(250);
	});

	it('falls back to data dimensions when flow node has no size', () => {
		const originalCanvas: CanvasData = { nodes: [], edges: [] };
		const flowNodes = [
			{
				id: 'new1',
				type: 'text',
				position: { x: 10, y: 20 },
				data: { id: 'new1', type: 'text', x: 0, y: 0, width: 260, height: 60, text: '' },
			},
		] as any[];

		const result = flowToCanvas(flowNodes, [], originalCanvas);
		expect(result.nodes[0].width).toBe(260);
		expect(result.nodes[0].height).toBe(60);
	});
});

describe('isNodeInsideGroup', () => {
	const group: CanvasGroupNode = { id: 'g1', type: 'group', x: 0, y: 0, width: 400, height: 300 };

	it('returns true when node is fully inside the group', () => {
		const node = { id: 'n1', type: 'text' as const, x: 10, y: 10, width: 100, height: 60, text: '' };
		expect(isNodeInsideGroup(node, group)).toBe(true);
	});

	it('returns true when node exactly fills the group', () => {
		const node = { id: 'n1', type: 'text' as const, x: 0, y: 0, width: 400, height: 300, text: '' };
		expect(isNodeInsideGroup(node, group)).toBe(true);
	});

	it('returns false when node partially overlaps (right edge)', () => {
		const node = { id: 'n1', type: 'text' as const, x: 350, y: 10, width: 100, height: 60, text: '' };
		expect(isNodeInsideGroup(node, group)).toBe(false);
	});

	it('returns false when node partially overlaps (bottom edge)', () => {
		const node = { id: 'n1', type: 'text' as const, x: 10, y: 260, width: 100, height: 60, text: '' };
		expect(isNodeInsideGroup(node, group)).toBe(false);
	});

	it('returns false when node is completely outside', () => {
		const node = { id: 'n1', type: 'text' as const, x: 500, y: 500, width: 100, height: 60, text: '' };
		expect(isNodeInsideGroup(node, group)).toBe(false);
	});

	it('returns false when node is to the left of group', () => {
		const node = { id: 'n1', type: 'text' as const, x: -200, y: 10, width: 100, height: 60, text: '' };
		expect(isNodeInsideGroup(node, group)).toBe(false);
	});
});

describe('computeGroupContainment', () => {
	it('maps child nodes to their containing group', () => {
		const nodes = [
			{ id: 'g1', type: 'group' as const, x: 0, y: 0, width: 400, height: 300 },
			{ id: 'n1', type: 'text' as const, x: 10, y: 10, width: 100, height: 60, text: '' },
			{ id: 'n2', type: 'text' as const, x: 500, y: 500, width: 100, height: 60, text: '' },
		];
		const map = computeGroupContainment(nodes);
		expect(map.get('n1')).toBe('g1');
		expect(map.has('n2')).toBe(false);
	});

	it('assigns to the smallest enclosing group when nested', () => {
		const nodes = [
			{ id: 'g-large', type: 'group' as const, x: 0, y: 0, width: 800, height: 600 },
			{ id: 'g-small', type: 'group' as const, x: 50, y: 50, width: 200, height: 150 },
			{ id: 'n1', type: 'text' as const, x: 60, y: 60, width: 100, height: 60, text: '' },
		];
		const map = computeGroupContainment(nodes);
		expect(map.get('n1')).toBe('g-small');
	});

	it('does not assign groups to groups', () => {
		const nodes = [
			{ id: 'g-large', type: 'group' as const, x: 0, y: 0, width: 800, height: 600 },
			{ id: 'g-small', type: 'group' as const, x: 50, y: 50, width: 200, height: 150 },
		];
		const map = computeGroupContainment(nodes);
		expect(map.has('g-small')).toBe(false);
		expect(map.has('g-large')).toBe(false);
	});

	it('returns empty map when no groups exist', () => {
		const nodes = [
			{ id: 'n1', type: 'text' as const, x: 10, y: 10, width: 100, height: 60, text: '' },
		];
		const map = computeGroupContainment(nodes);
		expect(map.size).toBe(0);
	});
});

describe('canvasToFlow with group containment', () => {
	it('sets parentId and converts to relative position for children', () => {
		const canvas: CanvasData = {
			nodes: [
				{ id: 'g1', type: 'group', x: 100, y: 100, width: 400, height: 300 },
				{ id: 'n1', type: 'text', x: 150, y: 150, width: 200, height: 60, text: 'child' },
			],
			edges: [],
		};
		const { nodes } = canvasToFlow(canvas);
		const group = nodes.find((n) => n.id === 'g1')!;
		const child = nodes.find((n) => n.id === 'n1')!;

		expect(group.parentId).toBeUndefined();
		expect(child.parentId).toBe('g1');
		expect(child.extent).toBe('parent');
		expect(child.expandParent).toBe(true);
		// Position should be relative to parent
		expect(child.position).toEqual({ x: 50, y: 50 });
	});

	it('sorts groups before children', () => {
		const canvas: CanvasData = {
			nodes: [
				{ id: 'n1', type: 'text', x: 110, y: 110, width: 100, height: 60, text: '' },
				{ id: 'g1', type: 'group', x: 100, y: 100, width: 400, height: 300 },
			],
			edges: [],
		};
		const { nodes } = canvasToFlow(canvas);
		expect(nodes[0].id).toBe('g1');
		expect(nodes[1].id).toBe('n1');
	});
});

describe('flowToCanvas with parentId (relative → absolute)', () => {
	it('converts relative child positions back to absolute', () => {
		const canvas: CanvasData = {
			nodes: [
				{ id: 'g1', type: 'group', x: 100, y: 100, width: 400, height: 300 },
				{ id: 'n1', type: 'text', x: 150, y: 150, width: 200, height: 60, text: 'child' },
			],
			edges: [],
		};

		// Simulate flow state with relative positions
		const { nodes, edges } = canvasToFlow(canvas);
		const restored = flowToCanvas(nodes, edges, canvas);

		const child = restored.nodes.find((n) => n.id === 'n1')!;
		// Should be back to absolute position
		expect(child.x).toBe(150);
		expect(child.y).toBe(150);
	});

	it('round-trips positions correctly after group containment', () => {
		const canvas: CanvasData = {
			nodes: [
				{ id: 'g1', type: 'group', x: 200, y: 200, width: 400, height: 300 },
				{ id: 'n1', type: 'text', x: 250, y: 250, width: 200, height: 60, text: 'a' },
				{ id: 'n2', type: 'text', x: 300, y: 350, width: 200, height: 60, text: 'b' },
				{ id: 'n3', type: 'text', x: 800, y: 800, width: 200, height: 60, text: 'outside' },
			],
			edges: [],
		};

		const { nodes, edges } = canvasToFlow(canvas);
		const restored = flowToCanvas(nodes, edges, canvas);

		expect(restored.nodes.find((n) => n.id === 'n1')!.x).toBe(250);
		expect(restored.nodes.find((n) => n.id === 'n1')!.y).toBe(250);
		expect(restored.nodes.find((n) => n.id === 'n2')!.x).toBe(300);
		expect(restored.nodes.find((n) => n.id === 'n2')!.y).toBe(350);
		expect(restored.nodes.find((n) => n.id === 'n3')!.x).toBe(800);
		expect(restored.nodes.find((n) => n.id === 'n3')!.y).toBe(800);
	});
});

describe('flowToCanvas with nested group parents', () => {
	it('accumulates offsets through the full parent chain', () => {
		// Manually construct a flow state with nested parentage:
		// g-outer (at 100,100) → g-inner (at 50,50 relative) → n1 (at 20,20 relative)
		// n1 absolute = 100+50+20 = 170, 100+50+20 = 170
		const canvas: CanvasData = {
			nodes: [
				{ id: 'g-outer', type: 'group', x: 100, y: 100, width: 600, height: 500 },
				{ id: 'g-inner', type: 'group', x: 150, y: 150, width: 300, height: 200 },
				{ id: 'n1', type: 'text', x: 170, y: 170, width: 100, height: 60, text: 'nested' },
			],
			edges: [],
		};

		// Build flow nodes manually with nested parents
		const flowNodes = [
			{ id: 'g-outer', type: 'group', position: { x: 100, y: 100 }, width: 600, height: 500, data: canvas.nodes[0] },
			{ id: 'g-inner', type: 'group', position: { x: 50, y: 50 }, width: 300, height: 200, data: canvas.nodes[1], parentId: 'g-outer', extent: 'parent', expandParent: true },
			{ id: 'n1', type: 'text', position: { x: 20, y: 20 }, width: 100, height: 60, data: canvas.nodes[2], parentId: 'g-inner', extent: 'parent', expandParent: true },
		] as any[];

		const restored = flowToCanvas(flowNodes, [], canvas);
		const outer = restored.nodes.find((n) => n.id === 'g-outer')!;
		const inner = restored.nodes.find((n) => n.id === 'g-inner')!;
		const child = restored.nodes.find((n) => n.id === 'n1')!;

		// g-outer: no parent, position stays as-is
		expect(outer.x).toBe(100);
		expect(outer.y).toBe(100);
		// g-inner: parent is g-outer → 50+100=150, 50+100=150
		expect(inner.x).toBe(150);
		expect(inner.y).toBe(150);
		// n1: parent chain g-inner→g-outer → 20+50+100=170, 20+50+100=170
		expect(child.x).toBe(170);
		expect(child.y).toBe(170);
	});

	it('handles circular parentage defensively (does not loop infinitely)', () => {
		const canvas: CanvasData = { nodes: [], edges: [] };
		// Create a cycle: a → b → a (should not happen, but defensive guard)
		const flowNodes = [
			{ id: 'a', type: 'text', position: { x: 10, y: 10 }, data: { id: 'a', type: 'text', x: 0, y: 0, width: 100, height: 60, text: '' }, parentId: 'b' },
			{ id: 'b', type: 'text', position: { x: 20, y: 20 }, data: { id: 'b', type: 'text', x: 0, y: 0, width: 100, height: 60, text: '' }, parentId: 'a' },
		] as any[];

		// Should terminate without infinite loop
		const restored = flowToCanvas(flowNodes, [], canvas);
		expect(restored.nodes).toHaveLength(2);
	});
});

describe('createImageNode', () => {
	it('creates an image node with correct type and dimensions', () => {
		const node = createImageNode(100, 200, 'assets/photo.png');
		expect(node.type).toBe('image');
		expect(node.x).toBe(100);
		expect(node.y).toBe(200);
		expect(node.width).toBe(300);
		expect(node.height).toBe(200);
		expect((node as CanvasImageNode).file).toBe('assets/photo.png');
		expect(node.id).toMatch(/^[0-9a-f]{16}$/);
	});
});

describe('canvasNodeToFlowNode with image type', () => {
	it('converts an image node to Svelte Flow format', () => {
		const node: CanvasImageNode = {
			id: 'img1', type: 'image', x: 50, y: 75, width: 300, height: 200, file: 'photo.png',
		};
		const flow = canvasNodeToFlowNode(node);
		expect(flow.id).toBe('img1');
		expect(flow.type).toBe('image');
		expect(flow.position).toEqual({ x: 50, y: 75 });
		expect(flow.data.file).toBe('photo.png');
	});
});

describe('image node round-trip', () => {
	it('preserves image node data through canvasToFlow/flowToCanvas', () => {
		const canvas: CanvasData = {
			nodes: [
				{ id: 'img1', type: 'image', x: 100, y: 200, width: 300, height: 200, file: 'photo.png' },
			],
			edges: [],
		};
		const { nodes, edges } = canvasToFlow(canvas);
		const restored = flowToCanvas(nodes, edges, canvas);
		const img = restored.nodes[0] as CanvasImageNode;
		expect(img.type).toBe('image');
		expect(img.file).toBe('photo.png');
		expect(img.x).toBe(100);
		expect(img.y).toBe(200);
	});
});
