import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildInlineCommentDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/inline-comment-plugin';
import { createMarkdownState } from '../../../test-helpers';

/** Collects decoration info from a DecorationSet */
function collectDecos(decoSet: ReturnType<typeof buildInlineCommentDecorations>) {
	const result: { from: number; to: number; class?: string }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		const spec = iter.value.spec as { class?: string };
		result.push({
			from: iter.from,
			to: iter.to,
			class: spec.class,
		});
		iter.next();
	}
	return result;
}

/** Creates state with cursor at given position and returns inline comment decorations */
function buildComments(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildInlineCommentDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('inlineCommentPlugin — buildInlineCommentDecorations', () => {
	it('hides inline comment when cursor is outside', () => {
		const doc = 'hello %%hidden%% world';
		const decos = buildComments(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].class).toBe('cm-lp-inline-comment cm-lp-inline-comment-hidden');
		expect(decos[0].from).toBe(6);
		expect(decos[0].to).toBe(16);
	});

	it('shows dimmed comment when cursor is inside', () => {
		const doc = 'hello %%hidden%% world';
		const decos = buildComments(doc, 10); // cursor inside "hidden"
		expect(decos).toHaveLength(1);
		expect(decos[0].class).toBe('cm-lp-inline-comment');
	});

	it('handles multiple inline comments on the same line', () => {
		const doc = '%%first%% and %%second%%\ntext';
		const decos = buildComments(doc, 27); // cursor on "text"
		expect(decos).toHaveLength(2);
		expect(decos[0].class).toContain('cm-lp-inline-comment-hidden');
		expect(decos[1].class).toContain('cm-lp-inline-comment-hidden');
	});

	it('per-element: only shows the comment under cursor', () => {
		const doc = '%%first%% and %%second%%';
		const decos = buildComments(doc, 4); // cursor on "first"
		expect(decos).toHaveLength(2);
		// First comment: shown (cursor inside)
		expect(decos[0].class).toBe('cm-lp-inline-comment');
		// Second comment: hidden
		expect(decos[1].class).toBe('cm-lp-inline-comment cm-lp-inline-comment-hidden');
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n%%not a comment%%\n```';
		const decos = buildComments(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for non-comment lines', () => {
		const doc = 'plain text';
		const decos = buildComments(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('does not match block comment fences (standalone %%)', () => {
		const doc = '%%\nblock content\n%%';
		const decos = buildComments(doc, 0);
		// Standalone %% lines should not match inline comment regex
		expect(decos).toHaveLength(0);
	});
});
