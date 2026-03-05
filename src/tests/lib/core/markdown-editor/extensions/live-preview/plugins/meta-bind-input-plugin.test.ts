import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildMetaBindInputDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildMetaBindInputDecorations>) {
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

function buildInputs(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildMetaBindInputDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('metaBindInputPlugin — buildMetaBindInputDecorations', () => {
	it('replaces INPUT field with widget when cursor is outside', () => {
		const doc = 'text `INPUT[inlineSelect(option(1, one), option(2, two)):rating]` more';
		const decos = buildInputs(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('shows source when cursor is on the INPUT field', () => {
		const doc = 'text `INPUT[inlineSelect(option(1, one), option(2, two)):rating]` more';
		const decos = buildInputs(doc, 20); // cursor inside INPUT
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for plain text', () => {
		const doc = 'just normal text';
		const decos = buildInputs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n`INPUT[inlineSelect(option(1, one)):rating]`\n```';
		const decos = buildInputs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('reads frontmatter properties for current value', () => {
		const doc = '---\nrating: 2\n---\n`INPUT[inlineSelect(option(1, one), option(2, two)):rating]`';
		const decos = buildInputs(doc, 0);
		// The INPUT field is after frontmatter, but cursor is at 0 (in frontmatter)
		// The plugin should find the INPUT and create a widget
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('handles multiple INPUT fields on different lines', () => {
		const doc = '`INPUT[inlineSelect(option(a, A)):f1]`\n`INPUT[inlineSelect(option(b, B)):f2]`\ntext';
		const decos = buildInputs(doc, doc.length); // cursor on "text" line
		expect(decos).toHaveLength(2);
	});
});
