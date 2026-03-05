import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { MathExtension } from '$lib/core/markdown-editor/extensions/lezer/math-extension';
import { computeBlockMath } from '$lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field';

function createState(doc: string, cursor?: number): EditorState {
	const state = EditorState.create({
		doc,
		extensions: [markdown({ extensions: [GFM, MathExtension] })],
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
	ensureSyntaxTree(state, state.doc.length, 5000);
	return state;
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeBlockMath(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

describe('blockMathField', () => {
	it('produces decorations for a block math expression', () => {
		// $$\nx^2\n$$ → widget on opening $$ (1) + content line (2) + closing $$ (2) = 5
		const doc = 'text\n\n$$\nx^2\n$$';
		const state = createState(doc, 0); // cursor on "text"
		const decos = collectDecos(state);
		expect(decos).toHaveLength(5);
	});

	it('does not decorate when cursor is inside the block', () => {
		const doc = '$$\nx^2\n$$';
		const state = createState(doc, 4); // cursor on "x^2"
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for a document without block math', () => {
		const state = createState('# Just a heading\nSome text');
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles multiple block math expressions', () => {
		// Each block: $$\nformula\n$$ = 1 widget + 2 hidden (content) + 2 hidden (close) = 5
		const doc = 'start\n\n$$\na\n$$\n\ntext\n\n$$\nb\n$$';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(10);
	});

	it('handles empty block math', () => {
		// $$\n$$ → widget on opening $$ (1) + closing $$ hidden (2) = 3
		const doc = 'text\n\n$$\n$$';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(3);
	});

	it('handles multi-line formula', () => {
		// $$\nline1\nline2\nline3\n$$
		// 1 widget + 3 content lines (2 each) + 1 closing (2) = 1 + 6 + 2 = 9
		const doc = 'text\n\n$$\nline1\nline2\nline3\n$$';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(9);
	});

	it('updates when document changes', () => {
		const state = createState('plain text');
		expect(collectDecos(state)).toHaveLength(0);

		const tr = state.update({
			changes: { from: 0, to: state.doc.length, insert: 'text\n\n$$\nx^2\n$$' },
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});
});
