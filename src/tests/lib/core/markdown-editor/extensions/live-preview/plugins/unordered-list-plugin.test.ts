import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildUnorderedListDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/unordered-list-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildUnorderedListDecorations>) {
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

function buildULs(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildUnorderedListDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('unorderedListPlugin — buildUnorderedListDecorations', () => {
	it('replaces dash marker with bullet widget when cursor is outside', () => {
		const doc = '- first\ntext';
		const decos = buildULs(doc, 10);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
		expect(decos[0].from).toBe(0);
		expect(decos[0].to).toBe(2); // "- "
	});

	it('replaces asterisk marker with bullet widget when cursor is outside', () => {
		const doc = '* first\ntext';
		const decos = buildULs(doc, 10);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('replaces plus marker with bullet widget when cursor is outside', () => {
		const doc = '+ first\ntext';
		const decos = buildULs(doc, 10);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('shows source when cursor is on the list item line', () => {
		const doc = '- first';
		const decos = buildULs(doc, 3);
		expect(decos).toHaveLength(0);
	});

	it('handles multiple unordered list items', () => {
		const doc = '- first\n- second\ntext';
		const decos = buildULs(doc, 19);
		expect(decos).toHaveLength(2);
	});

	it('produces no decorations for ordered lists', () => {
		const doc = '1. item\ntext';
		const decos = buildULs(doc, 10);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n- not a list\n```';
		const decos = buildULs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('per-element: only shows source for item under cursor', () => {
		const doc = '- first\n- second\ntext';
		const decos = buildULs(doc, 3); // cursor on "first"
		// Only second item should have widget
		expect(decos).toHaveLength(1);
		const state = createMarkdownState(doc);
		const line2 = state.doc.line(2);
		expect(decos[0].from).toBe(line2.from);
	});
});
