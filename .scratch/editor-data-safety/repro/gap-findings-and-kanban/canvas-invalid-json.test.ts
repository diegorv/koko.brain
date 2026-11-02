import { describe, it, expect } from 'vitest';
import {
	parseCanvas,
	serializeCanvas,
	canvasToFlow,
	flowToCanvas,
	canvasNodeToFlowNode,
	createTextNode,
} from '#lib/features/canvas/canvas.logic.js';

/**
 * Replays the exact pipeline CanvasInner.svelte runs:
 *   canvasData = parseCanvas(jsonContent)            (line 71)
 *   nodes      = canvasToFlow(parseCanvas(json))      (line 89)
 *   double-click -> nodes = [...nodes, flowNode]       (lines 501-511)
 *   persist    -> serializeCanvas(flowToCanvas(nodes, edges, canvasData))
 *                 -> onJsonChange (tab content, then the 2 s autosave)
 */
function addNodeAndPersist(jsonContent: string): string {
	const canvasData = parseCanvas(jsonContent);
	const state = canvasToFlow(parseCanvas(jsonContent));
	const flowNode = canvasNodeToFlowNode(createTextNode(0, 0, ''));
	const nodes = [...state.nodes, flowNode];
	return serializeCanvas(flowToCanvas(nodes, state.edges, canvasData));
}

/** A canvas with two nodes and an edge, broken by one trailing comma (hand edit in source mode). */
const BROKEN = `{
	"nodes": [
		{ "id": "aaaa", "type": "text", "x": 0, "y": 0, "width": 260, "height": 60, "text": "my important idea" },
		{ "id": "bbbb", "type": "text", "x": 400, "y": 0, "width": 260, "height": 60, "text": "second idea" },
	],
	"edges": [{ "id": "e1", "fromNode": "aaaa", "toNode": "bbbb" }]
}`;

describe('G6: invalid canvas JSON is replaced on the first edit', () => {
	it('sanity: the file really is invalid JSON', () => {
		expect(() => JSON.parse(BROKEN)).toThrow();
	});

	it('adding a node to a canvas that failed to parse must not drop the original nodes', () => {
		const written = addNodeAndPersist(BROKEN);
		expect(written).toContain('my important idea');
		expect(written).toContain('second idea');
	});

	it('a persist from a valid canvas keeps unknown top-level keys', () => {
		const valid = JSON.stringify({ nodes: [], edges: [], metadata: { version: '1.0' } });
		const written = addNodeAndPersist(valid);
		expect(JSON.parse(written)).toHaveProperty('metadata');
	});
});
