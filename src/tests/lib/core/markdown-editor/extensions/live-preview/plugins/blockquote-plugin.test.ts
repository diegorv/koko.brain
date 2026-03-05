import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildBlockquoteDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/blockquote-plugin';
import { createMarkdownState } from '../../../test-helpers';

/** Collects decoration specs from a DecorationSet for assertions */
function collectDecos(decoSet: ReturnType<typeof buildBlockquoteDecorations>) {
	const result: { from: number; to: number; class: string }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			class: (iter.value.spec as { class: string }).class,
		});
		iter.next();
	}
	return result;
}

/** Creates state with cursor at given position and returns blockquote decorations for full doc */
function buildBlockquotes(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildBlockquoteDecorations(state, [{ from: 0, to: state.doc.length }]));
}

/** Filters only line decorations (from === to) */
function lineDecos(decos: ReturnType<typeof buildBlockquotes>) {
	return decos.filter((d) => d.from === d.to);
}

/** Filters only mark decorations (from < to) */
function markDecos(decos: ReturnType<typeof buildBlockquotes>) {
	return decos.filter((d) => d.from < d.to);
}

describe('blockquotePlugin — buildBlockquoteDecorations', () => {
	describe('blockquote detection and line styling', () => {
		it('applies cm-lp-blockquote line deco for depth 1', () => {
			const decos = buildBlockquotes('> quote\ntext', 10);
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			expect(lines[0].from).toBe(0);
			expect(lines[0].class).toBe('cm-lp-blockquote');
		});

		it('applies cm-lp-blockquote-2 for depth 2', () => {
			const decos = buildBlockquotes('> > nested\ntext', 13);
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			expect(lines[0].class).toBe('cm-lp-blockquote-2');
		});

		it('applies cm-lp-blockquote-3 for depth 3', () => {
			const decos = buildBlockquotes('> > > deep\ntext', 13);
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			expect(lines[0].class).toBe('cm-lp-blockquote-3');
		});

		it('produces no decorations for non-blockquote lines', () => {
			const decos = buildBlockquotes('plain text', 0);
			expect(decos).toHaveLength(0);
		});
	});

	describe('callout exclusion', () => {
		it('skips callout lines', () => {
			const decos = buildBlockquotes('> [!note]\ntext', 12);
			expect(decos).toHaveLength(0);
		});

		it('skips callout lines with title', () => {
			const decos = buildBlockquotes('> [!warning] Title\ntext', 21);
			expect(decos).toHaveLength(0);
		});
	});

	describe('mark visibility with CSS animation', () => {
		it('hides blockquote marks when cursor is outside', () => {
			const decos = buildBlockquotes('> quote\nsome text', 14);
			const marks = markDecos(decos);
			expect(marks).toHaveLength(1);
			expect(marks[0].class).toBe('cm-formatting-block');
		});

		it('shows blockquote marks when cursor is on the line', () => {
			const decos = buildBlockquotes('> quote', 4);
			const marks = markDecos(decos);
			expect(marks).toHaveLength(1);
			expect(marks[0].class).toBe('cm-formatting-block cm-formatting-block-visible');
		});

		it('mark range includes "> " for depth 1', () => {
			const decos = buildBlockquotes('> quote\ntext', 10);
			const marks = markDecos(decos);
			expect(marks[0].from).toBe(0);
			expect(marks[0].to).toBe(2); // "> "
		});

		it('mark range includes "> > " for depth 2', () => {
			const decos = buildBlockquotes('> > nested\ntext', 13);
			const marks = markDecos(decos);
			expect(marks[0].from).toBe(0);
			expect(marks[0].to).toBe(4); // "> > "
		});
	});

	describe('per-element cursor sensitivity', () => {
		it('only shows marks for the blockquote line under cursor', () => {
			const doc = '> first\n> second\ntext';
			const decos = buildBlockquotes(doc, 3); // cursor on "first"
			const marks = markDecos(decos);
			const firstMark = marks.find((d) => d.from === 0);
			const secondMark = marks.find((d) => d.from === 8);
			expect(firstMark?.class).toBe('cm-formatting-block cm-formatting-block-visible');
			expect(secondMark?.class).toBe('cm-formatting-block');
		});
	});

	describe('block context skip', () => {
		it('produces no decorations for blockquotes inside fenced code blocks', () => {
			const doc = '```\n> not a blockquote\n```';
			const decos = buildBlockquotes(doc, 0);
			expect(decos).toHaveLength(0);
		});

		it('decorates blockquotes outside code blocks but not inside', () => {
			const doc = '> real quote\n```\n> fake quote\n```\ntext';
			const decos = buildBlockquotes(doc, 35);
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			expect(lines[0].from).toBe(0);
			expect(lines[0].class).toBe('cm-lp-blockquote');
		});
	});

	describe('multi-line documents', () => {
		it('handles blockquote on non-first line', () => {
			const doc = 'first line\n> quote\nmore text';
			const decos = buildBlockquotes(doc, 24);
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			const state = createMarkdownState(doc);
			expect(lines[0].from).toBe(state.doc.line(2).from);
			expect(lines[0].class).toBe('cm-lp-blockquote');
		});

		it('handles consecutive blockquote lines', () => {
			const doc = '> line one\n> line two\ntext';
			const decos = buildBlockquotes(doc, 23);
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(2);
		});

		it('creates both line deco and mark deco per blockquote line', () => {
			const decos = buildBlockquotes('> quote\ntext', 10);
			expect(lineDecos(decos)).toHaveLength(1);
			expect(markDecos(decos)).toHaveLength(1);
		});
	});
});
