import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildWikilinkEmbedDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildWikilinkEmbedDecorations>) {
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

function buildEmbeds(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildWikilinkEmbedDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('wikilinkEmbedPlugin — buildWikilinkEmbedDecorations', () => {
	it('replaces image embed with widget when cursor is outside', () => {
		const doc = 'text\n![[photo.png]]\nmore';
		const decos = buildEmbeds(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('replaces note embed with widget when cursor is outside', () => {
		const doc = 'text\n![[some-note]]\nmore';
		const decos = buildEmbeds(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('replaces note embed with heading anchor', () => {
		const doc = 'text\n![[note#Heading]]\nmore';
		const decos = buildEmbeds(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('replaces note embed with block-id anchor', () => {
		const doc = 'text\n![[note#^abc123]]\nmore';
		const decos = buildEmbeds(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('shows source when cursor is on the embed', () => {
		const doc = 'text\n![[photo.png]]\nmore';
		const decos = buildEmbeds(doc, 8); // cursor inside embed
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for plain text', () => {
		const doc = 'no embeds here';
		const decos = buildEmbeds(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n![[photo.png]]\n```';
		const decos = buildEmbeds(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('handles image embed with size pipe', () => {
		const doc = 'text\n![[photo.png|300]]\nmore';
		const decos = buildEmbeds(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});
});
