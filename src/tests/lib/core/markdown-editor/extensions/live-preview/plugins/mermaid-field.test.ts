import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { computeMermaidBlocks } from '$lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field';

function createState(doc: string, cursor?: number): EditorState {
	return EditorState.create({
		doc,
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeMermaidBlocks(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

describe('mermaidField', () => {
	it('produces decorations for a mermaid block', () => {
		// ```mermaid\ngraph TD\n    A --> B\n```
		// Widget on opening fence (1 replace) + content lines (2 each × 2) + closing fence (2) = 1 + 4 + 2 = 7
		const doc = 'text\n```mermaid\ngraph TD\n    A --> B\n```';
		const state = createState(doc, 0); // cursor on "text", outside the block
		const decos = collectDecos(state);
		expect(decos).toHaveLength(7);
	});

	it('does not decorate when cursor is inside the block', () => {
		const doc = '```mermaid\ngraph TD\n```';
		const state = createState(doc, 15); // cursor on "graph TD"
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for a document without mermaid blocks', () => {
		const state = createState('# Just a heading\nSome text');
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('ignores non-mermaid code blocks', () => {
		const doc = '```javascript\nconst x = 1;\n```';
		const state = createState(doc, 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles multiple mermaid blocks', () => {
		// Each block: ```mermaid\ngraph XX\n``` = 1 widget + 2 hidden (content) + 2 hidden (fence) = 5
		const doc = 'start\n```mermaid\ngraph TD\n```\ntext\n```mermaid\ngraph LR\n```';
		const state = createState(doc, 0); // cursor on "start"
		const decos = collectDecos(state);
		expect(decos).toHaveLength(10);
	});

	it('handles empty mermaid block', () => {
		// ```mermaid\n``` — widget on opening fence + closing fence hidden = 1 + 2 = 3
		const doc = 'text\n```mermaid\n```';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(3);
	});

	it('updates when document changes', () => {
		const state = createState('plain text');
		expect(collectDecos(state)).toHaveLength(0);

		const tr = state.update({
			changes: { from: 0, to: state.doc.length, insert: 'text\n```mermaid\ngraph TD\n```' },
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});
});
