import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { computeCodeBlocks } from '$lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field';

function createState(doc: string, cursor?: number): EditorState {
	const state = EditorState.create({
		doc,
		extensions: [markdown()],
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
	ensureSyntaxTree(state, state.doc.length, 5000);
	return state;
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeCodeBlocks(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

describe('codeBlockField', () => {
	it('produces decorations for a fenced code block', () => {
		// ```\nconst x = 1;\n```
		// Widget on opening fence (1 replace) + content line (hiddenLine + replace = 2) + closing fence (hiddenLine + replace = 2) = 5
		const doc = 'text\n```\nconst x = 1;\n```';
		const state = createState(doc, 0); // cursor on "text", outside the block
		const decos = collectDecos(state);
		expect(decos).toHaveLength(5);
	});

	it('does not decorate when cursor is inside the block', () => {
		const doc = '```\nconst x = 1;\n```';
		const state = createState(doc, 5); // cursor on content line
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for a document without code blocks', () => {
		const state = createState('# Just a heading\nSome text');
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles multiple code blocks', () => {
		// Each block: ```\na\n``` = 1 widget + 2 hidden (content) + 2 hidden (fence) = 5
		const doc = 'start\n```\na\n```\ntext\n```\nb\n```';
		const state = createState(doc, 0); // cursor on "start", outside both blocks
		const decos = collectDecos(state);
		expect(decos).toHaveLength(10);
	});

	it('skips collection blocks', () => {
		const doc = '```collection\nsome content\n```';
		const state = createState(doc);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('skips meta-bind-button blocks', () => {
		const doc = '```meta-bind-button\nsome content\n```';
		const state = createState(doc);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('skips mermaid blocks', () => {
		const doc = '```mermaid\ngraph TD\n    A --> B\n```';
		const state = createState(doc);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('handles code block with language specifier', () => {
		// ```typescript\nconst x: number = 1;\n```
		// 1 widget + 2 hidden (content) + 2 hidden (fence) = 5
		const doc = 'text\n```typescript\nconst x: number = 1;\n```';
		const state = createState(doc, 0); // cursor on "text"
		const decos = collectDecos(state);
		expect(decos).toHaveLength(5);
	});

	it('updates when document changes', () => {
		const state = createState('plain text');
		expect(collectDecos(state)).toHaveLength(0);

		const tr = state.update({
			changes: { from: 0, to: state.doc.length, insert: 'text\n```\ncode\n```' },
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});

	it('handles empty code block', () => {
		// ```\n``` — opening fence widget + closing fence hidden = 1 + 2 = 3
		const doc = 'text\n```\n```';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(3);
	});

	it('handles code block with multiple content lines', () => {
		// ```\nline1\nline2\nline3\n```
		// 1 widget + 3 content lines (2 each) + 1 fence (2) = 1 + 6 + 2 = 9
		const doc = 'text\n```\nline1\nline2\nline3\n```';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(9);
	});
});
