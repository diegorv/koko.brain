import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildOrderedListDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/ordered-list-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildOrderedListDecorations>) {
	const result: { from: number; to: number; hasWidget: boolean }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			hasWidget: !!(iter.value.spec as { widget?: unknown }).widget,
		});
		iter.next();
	}
	return result;
}

function buildOLs(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildOrderedListDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('orderedListPlugin — buildOrderedListDecorations', () => {
	it('replaces ordered list marker with widget when cursor is outside', () => {
		const doc = '1. first\ntext';
		const decos = buildOLs(doc, 11);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
		expect(decos[0].from).toBe(0);
		expect(decos[0].to).toBe(3); // "1. "
	});

	it('shows source when cursor is on the list item line', () => {
		const doc = '1. first';
		const decos = buildOLs(doc, 5);
		expect(decos).toHaveLength(0);
	});

	it('handles multiple ordered list items', () => {
		const doc = '1. first\n2. second\ntext';
		const decos = buildOLs(doc, 20);
		expect(decos).toHaveLength(2);
	});

	it('produces no decorations for unordered lists', () => {
		const doc = '- item\ntext';
		const decos = buildOLs(doc, 9);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n1. not a list\n```';
		const decos = buildOLs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('per-element: only shows source for item under cursor', () => {
		const doc = '1. first\n2. second\ntext';
		const decos = buildOLs(doc, 5); // cursor on "first"
		// Only second item should have widget
		expect(decos).toHaveLength(1);
		const state = createMarkdownState(doc);
		const line2 = state.doc.line(2);
		expect(decos[0].from).toBe(line2.from);
	});
});
