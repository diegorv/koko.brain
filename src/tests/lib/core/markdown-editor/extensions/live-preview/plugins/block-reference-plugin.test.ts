import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildBlockReferenceDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/block-reference-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildBlockReferenceDecorations>) {
	const result: { from: number; to: number; class?: string }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			class: (iter.value.spec as { class?: string }).class,
		});
		iter.next();
	}
	return result;
}

function buildRefs(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildBlockReferenceDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('blockReferencePlugin — buildBlockReferenceDecorations', () => {
	it('hides block reference when cursor is outside', () => {
		const doc = 'Some text ^my-block\nother line';
		const decos = buildRefs(doc, 25); // cursor on "other line"
		expect(decos).toHaveLength(1);
		expect(decos[0].class).toContain('cm-lp-block-ref-hidden');
	});

	it('shows dimmed block reference when cursor is on the line', () => {
		const doc = 'Some text ^my-block';
		const decos = buildRefs(doc, 5); // cursor on same line
		expect(decos).toHaveLength(1);
		expect(decos[0].class).toBe('cm-lp-block-ref');
		expect(decos[0].class).not.toContain('hidden');
	});

	it('produces no decorations for text without block references', () => {
		const doc = 'plain text\nno refs here';
		const decos = buildRefs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('handles multiple lines with block references', () => {
		const doc = 'line one ^ref1\nline two ^ref2\nother';
		const decos = buildRefs(doc, 33); // cursor on "other"
		expect(decos).toHaveLength(2);
	});

	it('does not decorate inside fenced code blocks', () => {
		const doc = '```\ncode ^not-a-ref\n```';
		const decos = buildRefs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('per-line: only shows source for line under cursor', () => {
		const doc = 'line one ^ref1\nline two ^ref2\nother';
		const decos = buildRefs(doc, 5); // cursor on "line one"
		expect(decos).toHaveLength(2);
		// First ref: touched (dimmed), second: hidden
		expect(decos[0].class).toBe('cm-lp-block-ref');
		expect(decos[1].class).toContain('cm-lp-block-ref-hidden');
	});
});
