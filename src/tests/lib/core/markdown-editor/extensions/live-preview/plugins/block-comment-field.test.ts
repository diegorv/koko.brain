import { describe, it, expect } from 'vitest';
import type { EditorState } from '@codemirror/state';
import { computeBlockComments } from '#lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.js';
import { createMarkdownState } from '../../../test-helpers';

function createState(doc: string, cursor?: number): EditorState {
	return createMarkdownState(doc, { cursor });
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeBlockComments(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

describe('blockCommentField', () => {
	it('hides a block comment when cursor is outside', () => {
		const doc = 'text\n%%\nhidden content\n%%';
		const state = createState(doc, 0); // cursor on "text"
		const decos = collectDecos(state);
		// 3 lines in the block (%%\nhidden content\n%%) → 3 hiddenLineDeco + 3 replace = 6
		expect(decos).toHaveLength(6);
	});

	it('does not decorate when cursor is inside the block', () => {
		const doc = '%%\nhidden content\n%%';
		const state = createState(doc, 4); // cursor on "hidden content"
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('produces no decorations without block comments', () => {
		const state = createState('plain text\nno comments');
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles multiple block comments', () => {
		const doc = 'text\n%%\na\n%%\nmiddle\n%%\nb\n%%';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// 2 blocks x 3 lines each = 6 lines × 2 decos (hiddenLineDeco + replace) = 12
		expect(decos).toHaveLength(12);
	});

	it('does not match inline comment as block comment', () => {
		const doc = 'text\n%%inline%%\nmore';
		const state = createState(doc, 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('updates when document changes', () => {
		const state = createState('plain text', 0);
		expect(collectDecos(state)).toHaveLength(0);

		const tr = state.update({
			changes: { from: 0, to: state.doc.length, insert: 'text\n%%\nhidden\n%%' },
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});

	it('shows %% lines inside a fenced code block as code', () => {
		// MATLAB cell markers: the code between them must stay visible.
		const doc = 'text\n```matlab\n%%\nx = 1;\n%%\n```';
		expect(collectDecos(createState(doc, 0))).toHaveLength(0);
	});

	it('does not close a comment on a %% line inside a fenced code block', () => {
		// The comment runs from line 2 to the last line; the fenced %% is content.
		const doc = 'text\n%%\n```\n%%\n```\nhidden\n%%';
		// 6 lines in the block (%% ``` %% ``` hidden %%) × 2 decos = 12
		expect(collectDecos(createState(doc, 0))).toHaveLength(12);
	});

	it('does not open a comment on a %% line inside a fenced code block', () => {
		// Without the fence check the fenced %% would pair with the first real %%.
		const doc = 'text\n```\n%%\n```\n%%\nhidden\n%%';
		// Only the real comment (%% hidden %%): 3 lines × 2 decos = 6
		const decos = collectDecos(createState(doc, 0));
		expect(decos).toHaveLength(6);
		expect(decos[0].from).toBe(doc.indexOf('%%\nhidden'));
	});
});
