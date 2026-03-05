import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildHorizontalRuleDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/horizontal-rule-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildHorizontalRuleDecorations>) {
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

function buildHRs(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildHorizontalRuleDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('horizontalRulePlugin — buildHorizontalRuleDecorations', () => {
	it('replaces --- with widget when cursor is outside', () => {
		// Blank line before --- is needed; otherwise Lezer parses it as setext heading
		const doc = 'text\n\n---\nmore';
		const decos = buildHRs(doc, 0);
		expect(decos).toHaveLength(1);
		expect(decos[0].hasWidget).toBe(true);
	});

	it('replaces *** with widget', () => {
		const doc = 'text\n\n***\nmore';
		const decos = buildHRs(doc, 0);
		expect(decos).toHaveLength(1);
	});

	it('shows source when cursor is on the HR line', () => {
		const doc = 'text\n\n---\nmore';
		const decos = buildHRs(doc, 7); // cursor on ---
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for non-HR lines', () => {
		const doc = 'plain text';
		const decos = buildHRs(doc, 0);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations inside fenced code blocks', () => {
		const doc = '```\n---\n```';
		const decos = buildHRs(doc, 0);
		expect(decos).toHaveLength(0);
	});
});
